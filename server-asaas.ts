import { getDbPool, getConfigValue } from "./server-db";

// Helper for Asaas API fetch
export async function asaasFetch(endpoint: string, options: any = {}) {
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

const silencedCustomersCache = new Set<string>();

/**
 * Disables every notification rule (SMS, Email, WhatsApp, Voice Call, Provider & Customer)
 * for a given Asaas customer via GET /customers/{id}/notifications and PUT /notifications/batch.
 */
export async function silenceAsaasCustomerNotifications(customerId: string): Promise<void> {
  if (!customerId || silencedCustomersCache.has(customerId)) return;
  try {
    const notifList = await asaasFetch(`/customers/${customerId}/notifications`);
    const items: any[] = Array.isArray(notifList?.data) ? notifList.data : [];
    const activeItems = items.filter(
      (n) =>
        n.enabled ||
        n.emailEnabledForCustomer ||
        n.smsEnabledForCustomer ||
        n.whatsappEnabledForCustomer ||
        n.phoneCallEnabledForCustomer ||
        n.emailEnabledForProvider ||
        n.smsEnabledForProvider
    );

    if (activeItems.length > 0) {
      await asaasFetch(`/notifications/batch`, {
        method: "PUT",
        body: JSON.stringify({
          customer: customerId,
          notifications: activeItems.map((n) => ({
            id: n.id,
            enabled: false,
            emailEnabledForProvider: false,
            smsEnabledForProvider: false,
            emailEnabledForCustomer: false,
            smsEnabledForCustomer: false,
            phoneCallEnabledForCustomer: false,
            whatsappEnabledForCustomer: false
          }))
        })
      });
    }
    silencedCustomersCache.add(customerId);
  } catch (err) {
    console.warn(`[Asaas] Falha ao desativar lote de notificações do cliente ${customerId}:`, err);
  }
}

/**
 * Ensures a local client is registered on Asaas, has a valid CPF/CNPJ,
 * and has ALL Asaas notifications (SMS, Email, WhatsApp, Voice) completely disabled.
 */
export async function getOrRegisterAsaasCustomer(client: any): Promise<string> {
  const cpfCnpj = client.cpf ? String(client.cpf).replace(/\D/g, "") : "";
  if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)) {
    throw new Error(
      `O cliente "${client.nome || client.id}" não possui um CPF ou CNPJ válido cadastrado (obrigatório pelo Asaas para emitir cobranças). Atualize o cadastro do cliente primeiro.`
    );
  }

  const currentPool = getDbPool();

  if (client.asaasCustomerId) {
    try {
      const existing = await asaasFetch(`/customers/${client.asaasCustomerId}`);
      if (existing && !existing.deleted) {
        const existingDoc = existing.cpfCnpj ? String(existing.cpfCnpj).replace(/\D/g, "") : "";
        if (existingDoc !== cpfCnpj || existing.notificationDisabled !== true) {
          await asaasFetch(`/customers/${client.asaasCustomerId}`, {
            method: "PUT",
            body: JSON.stringify({
              name: client.nome,
              cpfCnpj,
              notificationDisabled: true
            })
          });
        }
        await silenceAsaasCustomerNotifications(client.asaasCustomerId);
        return client.asaasCustomerId;
      }
    } catch (err) {
      console.warn("Cliente Asaas anterior não encontrado ou inválido, buscando/recriando:", err);
    }
  }

  try {
    const searchResult = await asaasFetch(`/customers?cpfCnpj=${cpfCnpj}`);
    if (searchResult.data && searchResult.data.length > 0) {
      const found = searchResult.data[0];
      const asaasId = found.id;
      if (found.notificationDisabled !== true) {
        await asaasFetch(`/customers/${asaasId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: client.nome,
            cpfCnpj,
            notificationDisabled: true
          })
        });
      }
      await silenceAsaasCustomerNotifications(asaasId);
      if (currentPool) {
        await currentPool.query("UPDATE Clientes SET asaasCustomerId = ? WHERE id = ?", [asaasId, client.id]);
      }
      return asaasId;
    }
  } catch (err) {
    console.warn("Falha ao buscar cliente por CPF/CNPJ no Asaas:", err);
  }

  // Register new customer with notificationDisabled: true and without sharing phone/email with Asaas
  const payload: any = {
    name: client.nome,
    cpfCnpj,
    externalReference: client.id,
    notificationDisabled: true
  };

  const newCustomer = await asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const asaasId = newCustomer.id;
  await silenceAsaasCustomerNotifications(asaasId);

  if (currentPool) {
    await currentPool.query("UPDATE Clientes SET asaasCustomerId = ? WHERE id = ?", [asaasId, client.id]);
  }

  return asaasId;
}

/**
 * Calculates the updated value of a transaction considering configured fine and monthly interest.
 */
export async function calculateTransactionAsaasValue(
  t: any,
  preloadedRates?: { taxaJuros: number; taxaMulta: number; todayStr?: string }
) {
  const now = new Date();
  const todayStr =
    preloadedRates?.todayStr ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const taxaJuros =
    preloadedRates?.taxaJuros !== undefined
      ? preloadedRates.taxaJuros
      : Number((await getConfigValue("fin_taxa_juros_mensal")) ?? "2.2");
  const taxaMulta =
    preloadedRates?.taxaMulta !== undefined
      ? preloadedRates.taxaMulta
      : Number((await getConfigValue("fin_taxa_multa_atraso")) ?? "2.0");

  const originalValue = Number(t.valor || 0);
  let finalValue = originalValue;
  let finalDueDate = t.dataVencimento || todayStr;
  let descriptionNote = "";
  let isOverdue = false;
  let fineAmount = 0;
  let interestAmount = 0;

  if (t.dataVencimento && t.dataVencimento < todayStr && t.status !== "pago") {
    isOverdue = true;
    finalDueDate = todayStr;

    const due = new Date(t.dataVencimento + "T12:00:00");
    const todayRef = new Date(todayStr + "T12:00:00");
    const diffTime = todayRef.getTime() - due.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    if (diffDays > 0) {
      const fineRate = Math.max(0, taxaMulta) / 100;
      const interestRate = Math.max(0, taxaJuros) / 100;

      fineAmount = originalValue * fineRate;
      interestAmount = originalValue * interestRate * (diffDays / 30);
      const totalFees = fineAmount + interestAmount;
      finalValue = Number((originalValue + totalFees).toFixed(2));
      if (totalFees > 0) {
        descriptionNote = ` (Original: R$ ${originalValue.toFixed(2)} + R$ ${totalFees.toFixed(2)} multa/juros)`;
      }
    }
  }

  return {
    originalValue,
    finalValue,
    finalDueDate,
    isOverdue,
    fineAmount: Number(fineAmount.toFixed(2)),
    interestAmount: Number(interestAmount.toFixed(2)),
    taxaJuros,
    taxaMulta,
    descriptionNote,
    todayStr
  };
}

/**
 * Dynamically builds the Asaas `split` array based on system and bank account settings.
 * Respects:
 * - Global toggle `fin_asaas_split_enabled`
 * - Default fallback account `fin_conta_bancaria_asaas`
 * - Per-account `asaasWalletId`, `asaasSplitAtivo`, `asaasSplitTipo` ('PERCENTAGE' | 'FIXED'), `asaasSplitValor`, and `isContaPrincipalAsaas`
 */
async function buildAsaasSplitPayload(
  items: Array<{ tx: any; finalValue: number }>,
  totalChargeValue: number
): Promise<any[] | undefined> {
  const splitEnabled = (await getConfigValue("fin_asaas_split_enabled")) === "1";
  if (!splitEnabled || totalChargeValue <= 0) return undefined;

  const currentPool = getDbPool();
  if (!currentPool) return undefined;

  const defaultContaId =
    (await getConfigValue("fin_asaas_conta_bancaria_id")) ||
    (await getConfigValue("fin_conta_bancaria_asaas")) ||
    "";
  const [contasRows] = await currentPool.query("SELECT * FROM ContasBancarias WHERE status != 'inativo'");
  const contasMap = new Map<string, any>();
  for (const c of contasRows as any[]) {
    contasMap.set(c.id, c);
  }

  // Single transaction charge
  if (items.length === 1) {
    const { tx, finalValue } = items[0];
    const contaId = tx.contaBancariaId || defaultContaId;
    if (!contaId) return undefined;

    const conta = contasMap.get(contaId);
    if (!conta) return undefined;

    const walletId = conta.asaasWalletId ? String(conta.asaasWalletId).trim() : "";
    const isPrincipal = Boolean(Number(conta.isContaPrincipalAsaas || 0));
    const isSplitAtivo =
      conta.asaasSplitAtivo !== undefined && conta.asaasSplitAtivo !== null
        ? Boolean(Number(conta.asaasSplitAtivo))
        : Boolean(walletId);

    // Master/issuer Asaas account receives net funds automatically and cannot be in split[]
    if (!walletId || isPrincipal || !isSplitAtivo) {
      return undefined;
    }

    const splitTipo = conta.asaasSplitTipo === "FIXED" ? "FIXED" : "PERCENTAGE";
    const splitValor =
      conta.asaasSplitValor !== undefined && conta.asaasSplitValor !== null && !isNaN(Number(conta.asaasSplitValor))
        ? Number(conta.asaasSplitValor)
        : 100;

    if (splitValor <= 0) return undefined;

    if (splitTipo === "FIXED") {
      return [
        {
          walletId,
          fixedValue: Number(Math.min(finalValue, splitValor).toFixed(2))
        }
      ];
    }

    return [
      {
        walletId,
        percentualValue: Number(Math.min(100, splitValor).toFixed(2))
      }
    ];
  }

  // Bulk charge across multiple transactions
  const walletFixedMap = new Map<string, number>();
  const walletPercentReaisMap = new Map<string, number>();

  for (const { tx, finalValue } of items) {
    const contaId = tx.contaBancariaId || defaultContaId;
    if (!contaId) continue;

    const conta = contasMap.get(contaId);
    if (!conta) continue;

    const walletId = conta.asaasWalletId ? String(conta.asaasWalletId).trim() : "";
    const isPrincipal = Boolean(Number(conta.isContaPrincipalAsaas || 0));
    const isSplitAtivo =
      conta.asaasSplitAtivo !== undefined && conta.asaasSplitAtivo !== null
        ? Boolean(Number(conta.asaasSplitAtivo))
        : Boolean(walletId);

    if (!walletId || isPrincipal || !isSplitAtivo) continue;

    const splitTipo = conta.asaasSplitTipo === "FIXED" ? "FIXED" : "PERCENTAGE";
    const splitValor =
      conta.asaasSplitValor !== undefined && conta.asaasSplitValor !== null && !isNaN(Number(conta.asaasSplitValor))
        ? Number(conta.asaasSplitValor)
        : 100;

    if (splitValor <= 0) continue;

    if (splitTipo === "FIXED") {
      const val = Math.min(finalValue, splitValor);
      walletFixedMap.set(walletId, (walletFixedMap.get(walletId) || 0) + val);
    } else {
      const pct = Math.min(100, splitValor);
      const valReais = finalValue * (pct / 100);
      walletPercentReaisMap.set(walletId, (walletPercentReaisMap.get(walletId) || 0) + valReais);
    }
  }

  const splitArray: any[] = [];
  for (const [walletId, valReais] of walletPercentReaisMap.entries()) {
    const effectivePct = Number(Math.min(100, (valReais / totalChargeValue) * 100).toFixed(2));
    if (effectivePct > 0) {
      splitArray.push({
        walletId,
        percentualValue: effectivePct
      });
    }
  }

  for (const [walletId, fixedVal] of walletFixedMap.entries()) {
    const rounded = Number(Math.min(totalChargeValue, fixedVal).toFixed(2));
    if (rounded > 0) {
      splitArray.push({
        walletId,
        fixedValue: rounded
      });
    }
  }

  return splitArray.length > 0 ? splitArray : undefined;
}

/**
 * Checks if an existing Asaas payment is still valid and open, so we can reuse it
 * instead of creating duplicate charges on every click.
 */
export async function getOrReuseAsaasCharge(
  paymentId: string,
  expectedValue: number,
  requestedBillingType?: string
): Promise<{ asaasPaymentId: string; asaasPaymentUrl: string; billingType: string; value: number } | null> {
  if (!paymentId) return null;
  try {
    const existing = await asaasFetch(`/payments/${paymentId}`);
    if (!existing || existing.deleted) return null;

    const openStatuses = ["PENDING", "OVERDUE"];
    if (!openStatuses.includes(existing.status)) return null;

    if (
      requestedBillingType &&
      requestedBillingType !== "UNDEFINED" &&
      existing.billingType !== requestedBillingType
    ) {
      return null;
    }

    const diff = Math.abs(Number(existing.value || 0) - Number(expectedValue || 0));
    if (diff > 0.05) {
      return null;
    }

    return {
      asaasPaymentId: existing.id,
      asaasPaymentUrl: existing.invoiceUrl,
      billingType: existing.billingType,
      value: Number(existing.value)
    };
  } catch (err) {
    return null;
  }
}

/**
 * Safely cancels/deletes a pending/overdue charge on Asaas when it is replaced by a new charge.
 */
export async function cancelAsaasChargeIfOpen(paymentId: string): Promise<void> {
  if (!paymentId) return;
  try {
    const existing = await asaasFetch(`/payments/${paymentId}`);
    if (existing && !existing.deleted && (existing.status === "PENDING" || existing.status === "OVERDUE")) {
      await asaasFetch(`/payments/${paymentId}`, { method: "DELETE" });
    }
  } catch (err) {
    // Non-blocking cleanup
  }
}

/**
 * Creates (or reuses) a billing charge on Asaas for a single transaction.
 */
export async function createAsaasCharge(
  t: any,
  customerId: string,
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED",
  options?: { forceNew?: boolean }
) {
  const calc = await calculateTransactionAsaasValue(t);

  if (t.asaasPaymentId && !options?.forceNew) {
    const reused = await getOrReuseAsaasCharge(t.asaasPaymentId, calc.finalValue, billingType);
    if (reused) {
      return {
        asaasPaymentId: reused.asaasPaymentId,
        asaasPaymentUrl: reused.asaasPaymentUrl,
        finalValue: reused.value,
        reused: true
      };
    }
  }

  // If replacing an old open charge on a single transaction (and it's not shared by a bulk batch), clean it up
  if (t.asaasPaymentId && !t.asaasBatchId) {
    await cancelAsaasChargeIfOpen(t.asaasPaymentId);
  }

  const payload: any = {
    customer: customerId,
    billingType: billingType || "PIX",
    value: calc.finalValue,
    dueDate: calc.finalDueDate,
    description: ((t.descricao || t.categoria || `Fatura Ref #${t.id}`) + calc.descriptionNote).slice(0, 500),
    externalReference: String(t.id).slice(0, 100),
    postalService: false,
    notificationDisabled: true
  };

  // For charges that are NOT yet overdue, configure native Asaas fine & interest so if the client pays late, Asaas charges it automatically
  if (!calc.isOverdue) {
    if (calc.taxaMulta > 0) {
      payload.fine = {
        value: Number(calc.taxaMulta.toFixed(2)),
        type: "PERCENTAGE"
      };
    }
    if (calc.taxaJuros > 0) {
      payload.interest = {
        value: Number(calc.taxaJuros.toFixed(2)),
        type: "PERCENTAGE"
      };
    }
  }

  const splitPayload = await buildAsaasSplitPayload([{ tx: t, finalValue: calc.finalValue }], calc.finalValue);
  if (splitPayload) {
    payload.split = splitPayload;
  }

  const result = await asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return {
    asaasPaymentId: result.id,
    asaasPaymentUrl: result.invoiceUrl,
    finalValue: calc.finalValue,
    reused: false
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
 * Creates (or reuses) a single billing charge on Asaas for multiple transactions (Bulk/Consolidated Invoice).
 */
export async function createAsaasBulkCharge(
  transactions: any[],
  customerId: string,
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED",
  options?: { forceNew?: boolean }
) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const taxaJuros = Number((await getConfigValue("fin_taxa_juros_mensal")) ?? "2.2");
  const taxaMulta = Number((await getConfigValue("fin_taxa_multa_atraso")) ?? "2.0");

  let totalFinalValue = 0;
  const itemsWithValues: Array<{ tx: any; finalValue: number }> = [];

  for (const t of transactions) {
    const calc = await calculateTransactionAsaasValue(t, { taxaJuros, taxaMulta, todayStr });
    totalFinalValue += calc.finalValue;
    itemsWithValues.push({ tx: t, finalValue: calc.finalValue });
  }

  totalFinalValue = Number(totalFinalValue.toFixed(2));

  // Check if all transactions already share the exact same open asaasPaymentId and can be reused
  const sharedPaymentIds = Array.from(new Set(transactions.map((t) => t.asaasPaymentId).filter(Boolean)));
  if (
    !options?.forceNew &&
    sharedPaymentIds.length === 1 &&
    transactions.every((t) => t.asaasPaymentId === sharedPaymentIds[0])
  ) {
    const reused = await getOrReuseAsaasCharge(sharedPaymentIds[0], totalFinalValue, billingType);
    if (reused) {
      return {
        asaasPaymentId: reused.asaasPaymentId,
        asaasPaymentUrl: reused.asaasPaymentUrl,
        bulkRef: transactions[0]?.asaasBatchId || `BULK_${sharedPaymentIds[0]}`,
        totalFinalValue: reused.value,
        reused: true
      };
    }
  }

  // Generate a compact bulk reference (< 45 chars, strictly under Asaas 100-char limit)
  const clientSuffix = String(transactions[0]?.clienteId || customerId || "cli")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8);
  const bulkRef = `BULK_${Date.now()}_${clientSuffix}`;

  const payload: any = {
    customer: customerId,
    billingType: billingType || "PIX",
    value: totalFinalValue,
    dueDate: todayStr,
    description: `Fatura Consolidada (${transactions.length} itens) - Vila Náutica`,
    externalReference: bulkRef,
    postalService: false,
    notificationDisabled: true
  };

  const splitPayload = await buildAsaasSplitPayload(itemsWithValues, totalFinalValue);
  if (splitPayload) {
    payload.split = splitPayload;
  }

  const result = await asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return {
    asaasPaymentId: result.id,
    asaasPaymentUrl: result.invoiceUrl,
    bulkRef,
    totalFinalValue,
    reused: false
  };
}