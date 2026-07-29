import { getDbPool, getConfigValue } from "./server-db";

// Helper for Asaas API fetch
async function asaasFetch(endpoint: string, options: any = {}) {
  const apiKey = process.env.ASAAS_API_KEY || await getConfigValue("asaas_api_key");
  const baseUrl = process.env.ASAAS_API_URL || await getConfigValue("asaas_api_url") || "https://api-sandbox.asaas.com/v3";
  const url = `${baseUrl}${endpoint}`;

  if (!apiKey) {
    throw new Error("A API Key do Asaas não está configurada.");
  }

  const headers = {
    "Content-Type": "application/json",
    "access_token": apiKey,
    "User-Agent": "GestaoNauticaMexicano",
    ...options.headers
  };

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const errMsg = errBody.errors?.[0]?.description || `Erro HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  return res.json();
}

/**
 * Ensures a local client is registered on Asaas.
 * First searches by CPF/CNPJ. If found, reuse it; otherwise creates a new customer.
 */
export async function getOrRegisterAsaasCustomer(client: any): Promise<string> {
  if (client.asaasCustomerId) {
    return client.asaasCustomerId;
  }

  const cpfCnpj = client.cpf ? client.cpf.replace(/\D/g, "") : "";
  
  if (cpfCnpj) {
    try {
      const searchResult = await asaasFetch(`/customers?cpfCnpj=${cpfCnpj}`);
      if (searchResult.data && searchResult.data.length > 0) {
        const asaasId = searchResult.data[0].id;
        
        // Save locally
        const currentPool = getDbPool();
        if (currentPool) {
          await currentPool.query("UPDATE Clientes SET asaasCustomerId = ? WHERE id = ?", [asaasId, client.id]);
        }
        return asaasId;
      }
    } catch (err) {
      console.warn("Falha ao buscar cliente por CPF/CNPJ no Asaas:", err);
    }
  }

  // Register new customer
  const payload: any = {
    name: client.nome,
    externalReference: client.id
  };
  
  if (cpfCnpj) payload.cpfCnpj = cpfCnpj;
  if (client.email) payload.email = client.email;
  
  if (client.telefone) {
    const phoneClean = client.telefone.replace(/\D/g, "");
    if (phoneClean.length >= 10) {
      payload.mobilePhone = phoneClean;
    }
  }

  const newCustomer = await asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const asaasId = newCustomer.id;
  
  // Save locally
  const currentPool = getDbPool();
  if (currentPool) {
    await currentPool.query("UPDATE Clientes SET asaasCustomerId = ? WHERE id = ?", [asaasId, client.id]);
  }
  
  return asaasId;
}

/**
 * Creates a billing charge on Asaas for a transaction.
 */
export async function createAsaasCharge(t: any, customerId: string, billingType: "PIX" | "BOLETO" | "CREDIT_CARD") {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let finalValue = Number(t.valor);
  let finalDueDate = t.dataVencimento;
  let descriptionNote = "";

  if (t.dataVencimento && t.dataVencimento < todayStr) {
    // Vencido/Atrasado! Ajustar vencimento para hoje
    finalDueDate = todayStr;

    // Calcular dias de atraso
    const due = new Date(t.dataVencimento + 'T12:00:00');
    const todayRef = new Date(todayStr + 'T12:00:00');
    const diffTime = todayRef.getTime() - due.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    if (diffDays > 0) {
      const fine = finalValue * 0.02; // Multa de 2%
      const interest = finalValue * 0.01 * (diffDays / 30); // Juros de 1% ao mês proporcional
      const totalFees = fine + interest;
      finalValue = Number((finalValue + totalFees).toFixed(2));
      descriptionNote = ` (Original: R$ ${Number(t.valor).toFixed(2)} + R$ ${totalFees.toFixed(2)} multa/juros)`;
    }
  }

  const payload = {
    customer: customerId,
    billingType,
    value: finalValue,
    dueDate: finalDueDate,
    description: (t.descricao || `Fatura Ref #${t.id}`) + descriptionNote,
    externalReference: t.id
  };

  const result = await asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return {
    asaasPaymentId: result.id,
    asaasPaymentUrl: result.invoiceUrl
  };
}

/**
 * Retrieves Pix QR Code details for a payment.
 */
export async function getPixQrCode(paymentId: string) {
  const result = await asaasFetch(`/payments/${paymentId}/pixQrCode`);
  return {
    encodedImage: result.encodedImage, // Base64
    payload: result.payload, // copia e cola
    expirationDate: result.expirationDate
  };
}

/**
 * Creates a single billing charge on Asaas for multiple transactions (Bulk/Consolidated Invoice).
 */
export async function createAsaasBulkCharge(transactions: any[], customerId: string, billingType: "PIX" | "BOLETO" | "CREDIT_CARD") {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let totalFinalValue = 0;
  
  for (const t of transactions) {
    let finalValue = Number(t.valor);
    if (t.dataVencimento && t.dataVencimento < todayStr) {
      const due = new Date(t.dataVencimento + 'T12:00:00');
      const todayRef = new Date(todayStr + 'T12:00:00');
      const diffTime = todayRef.getTime() - due.getTime();
      const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

      if (diffDays > 0) {
        const fine = finalValue * 0.02; // Multa de 2%
        const interest = finalValue * 0.01 * (diffDays / 30); // Juros de 1% ao mês proporcional
        const totalFees = fine + interest;
        finalValue = Number((finalValue + totalFees).toFixed(2));
      }
    }
    totalFinalValue += finalValue;
  }
  
  totalFinalValue = Number(totalFinalValue.toFixed(2));

  // Generate a bulk reference identifier
  const bulkRef = `BULK-${transactions.map(t => t.id).join('-')}`;

  const payload = {
    customer: customerId,
    billingType,
    value: totalFinalValue,
    dueDate: todayStr,
    description: `Fatura Consolidada (${transactions.length} itens) - Vila Nautica`,
    externalReference: bulkRef
  };

  const result = await asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return {
    asaasPaymentId: result.id,
    asaasPaymentUrl: result.invoiceUrl,
    bulkRef
  };
}