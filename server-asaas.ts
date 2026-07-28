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
  const payload = {
    customer: customerId,
    billingType,
    value: Number(t.valor),
    dueDate: t.dataVencimento,
    description: t.descricao || `Fatura Ref #${t.id}`,
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
