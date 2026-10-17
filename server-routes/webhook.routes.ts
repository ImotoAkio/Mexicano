import { Router } from "express";
import {
  getConfigValue,
  syncMultipleClientsFinancialStatus,
  syncClientFinancialStatus,
  upsertTransacao,
  invalidateDbCache,
  getDbPool
} from "../server-db";

const router = Router();

export async function reconcileAsaasPaidPayment(payment: any, event: string = "PAYMENT_RECEIVED", io?: any) {
  const currentPool = getDbPool();
  if (!currentPool || !payment || !payment.id) return { matched: 0 };

  const paymentId = String(payment.id);
  const externalRef = payment.externalReference ? String(payment.externalReference) : "";
  const todayStr = new Date().toISOString().split("T")[0];
  const fallbackContaId = (await getConfigValue("fin_asaas_conta_bancaria_id")) || "";
  const registrarTaxaRaw = await getConfigValue("fin_asaas_registrar_taxa_gateway");
  const shouldRegisterFee =
    registrarTaxaRaw === null || registrarTaxaRaw === undefined ? true : registrarTaxaRaw === "1";

  const asaasFee =
    payment.value !== undefined && payment.netValue !== undefined
      ? Math.max(0, Number((Number(payment.value) - Number(payment.netValue)).toFixed(2)))
      : 0;

  // Match all revenue transactions linked to this Asaas payment or batch reference
  const [matchedRows] = await currentPool.query(
    `SELECT * FROM TransacoesFinanceiras
     WHERE tipo = 'receita'
       AND (
         asaasPaymentId = ?
         OR (? != '' AND asaasBatchId = ?)
         OR (? != '' AND id = ?)
       )`,
    [paymentId, externalRef, externalRef, externalRef, externalRef]
  );

  const allTxs = matchedRows as any[];
  if (allTxs.length === 0) {
    console.warn(`[Asaas Webhook] No matching transaction found for payment ${paymentId} (ref: ${externalRef})`);
    return { matched: 0 };
  }

  const unpaidTxs = allTxs.filter((t) => t.status !== "pago");
  const isBulk = allTxs.length > 1 || externalRef.startsWith("BULK");

  if (unpaidTxs.length > 0) {
    if (!isBulk && allTxs.length === 1) {
      const tx = allTxs[0];
      const finalContaId = tx.contaBancariaId || fallbackContaId || null;
      const paidValue = Number(payment.value || tx.valor);

      await currentPool.query(
        `UPDATE TransacoesFinanceiras
         SET status = 'pago',
             dataPagamento = ?,
             valor = ?,
             contaBancariaId = ?,
             metodoPagamento = COALESCE(metodoPagamento, ?),
             asaasPaymentId = ?
         WHERE id = ?`,
        [todayStr, paidValue, finalContaId, payment.billingType || "PIX", paymentId, tx.id]
      );
      console.log(`[Asaas Webhook] Marked single transaction ${tx.id} as paid (R$ ${paidValue}).`);
    } else {
      // Bulk / Multiple transactions linked to the same Asaas charge
      const sumOriginal = allTxs.reduce((acc, t) => acc + Number(t.valor || 0), 0);
      const paidTotal = Number(payment.value || sumOriginal);
      const extraFees = Math.max(0, Number((paidTotal - sumOriginal).toFixed(2)));

      for (let i = 0; i < unpaidTxs.length; i++) {
        const tx = unpaidTxs[i];
        const finalContaId = tx.contaBancariaId || fallbackContaId || null;
        const adjustedVal =
          i === 0 && extraFees > 0 ? Number((Number(tx.valor || 0) + extraFees).toFixed(2)) : Number(tx.valor || 0);

        await currentPool.query(
          `UPDATE TransacoesFinanceiras
           SET status = 'pago',
               dataPagamento = ?,
               valor = ?,
               contaBancariaId = ?,
               metodoPagamento = COALESCE(metodoPagamento, ?),
               asaasPaymentId = ?
           WHERE id = ?`,
          [todayStr, adjustedVal, finalContaId, payment.billingType || "PIX", paymentId, tx.id]
        );
      }
      console.log(`[Asaas Webhook] Marked ${unpaidTxs.length} bulk transactions for payment ${paymentId} as paid.`);
    }
  }

  // Idempotent Gateway Fee Registration
  if (shouldRegisterFee && asaasFee > 0) {
    const feePaymentKey = `FEE_${paymentId}`;
    const [existingFeeRows] = await currentPool.query(
      `SELECT id FROM TransacoesFinanceiras
       WHERE tipo = 'despesa'
         AND (asaasPaymentId = ? OR descricao LIKE ?)
       LIMIT 1`,
      [feePaymentKey, `%${paymentId}%`]
    );

    if ((existingFeeRows as any[]).length === 0) {
      const primaryTx = allTxs[0];
      const feeContaId = primaryTx.contaBancariaId || fallbackContaId || null;
      const feeDesc = isBulk
        ? `Taxa Asaas - Fatura Consolidada [Ref: ${paymentId}]`
        : `Taxa Asaas - Ref #${primaryTx.id} [Ref: ${paymentId}]`;

      await upsertTransacao({
        id: `tx_fee_${paymentId.replace(/[^a-zA-Z0-9]/g, "")}`,
        tipo: "despesa",
        categoria: "Taxas Asaas",
        valor: asaasFee,
        dataVencimento: todayStr,
        dataPagamento: todayStr,
        status: "pago",
        descricao: feeDesc,
        empresa: primaryTx.empresa || "Marina",
        clienteId: primaryTx.clienteId || null,
        contaBancariaId: feeContaId,
        metodoPagamento: payment.billingType || null,
        asaasPaymentId: feePaymentKey,
        metadata: JSON.stringify({ webhookEvent: event, asaasPaymentId: paymentId })
      });
    }
  }

  // Sync client financial status
  const clientIds = Array.from(new Set(allTxs.map((r) => r.clienteId).filter(Boolean)));
  if (clientIds.length === 1) {
    await syncClientFinancialStatus(clientIds[0]);
  } else if (clientIds.length > 1) {
    await syncMultipleClientsFinancialStatus(clientIds);
  }

  invalidateDbCache();
  if (io) {
    io.emit("asaas_payment_updated", {
      event,
      paymentId,
      externalReference: externalRef,
      transactionIds: allTxs.map((r) => r.id),
      clientIds,
      status: "pago"
    });
  }

  return { matched: allTxs.length, updated: unpaidTxs.length };
}

router.post("/asaas", async (req, res) => {
  const token = req.headers["asaas-access-token"];
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN || (await getConfigValue("asaas_webhook_token"));
  if (expectedToken && token !== expectedToken) {
    console.warn("[Asaas Webhook] Invalid webhook token received.");
    return res.status(401).json({ error: true, message: "Unauthorized token" });
  }

  const { event, payment } = req.body || {};
  if (!event || !payment || !payment.id) {
    return res.status(400).json({ error: true, message: "Invalid payload" });
  }

  const paymentId = String(payment.id);
  const externalRef = payment.externalReference ? String(payment.externalReference) : "";

  console.log(`[Asaas Webhook] Event received: ${event} for payment: ${paymentId} (ref: ${externalRef})`);

  const currentPool = getDbPool();
  if (!currentPool) {
    return res.status(500).json({ error: true, message: "Database offline" });
  }

  try {
    // 1. Handle PAYMENT_RECEIVED / PAYMENT_CONFIRMED
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      const io = (req.app as any)?.locals?.io;
      const result = await reconcileAsaasPaidPayment(payment, event, io);
      if (result.matched === 0) {
        return res.status(200).json({ received: true, matched: 0 });
      }
    }

    // 2. Handle PAYMENT_DELETED (clean up orphaned payment references on unpaid transactions)
    else if (event === "PAYMENT_DELETED") {
      await currentPool.query(
        `UPDATE TransacoesFinanceiras
         SET asaasPaymentId = NULL, asaasPaymentUrl = NULL, asaasBatchId = NULL
         WHERE asaasPaymentId = ? AND status != 'pago'`,
        [paymentId]
      );
      invalidateDbCache();
      console.log(`[Asaas Webhook] Cleared deleted payment reference ${paymentId} from unpaid transactions.`);
    }

    // 3. Handle PAYMENT_REFUNDED (revert paid status and remove gateway fee)
    else if (event === "PAYMENT_REFUNDED" || event === "PAYMENT_CHARGEBACK_REQUESTED") {
      const [affectedRows] = await currentPool.query(
        "SELECT id, clienteId, dataVencimento FROM TransacoesFinanceiras WHERE asaasPaymentId = ? AND tipo = 'receita'",
        [paymentId]
      );
      const txs = affectedRows as any[];
      const todayStr = new Date().toISOString().split("T")[0];

      for (const tx of txs) {
        const newStatus = tx.dataVencimento && tx.dataVencimento < todayStr ? "vencido" : "lancado";
        await currentPool.query(
          "UPDATE TransacoesFinanceiras SET status = ?, dataPagamento = NULL WHERE id = ?",
          [newStatus, tx.id]
        );
      }

      // Remove associated gateway fee if it was registered
      await currentPool.query(
        "DELETE FROM TransacoesFinanceiras WHERE tipo = 'despesa' AND (asaasPaymentId = ? OR descricao LIKE ?)",
        [`FEE_${paymentId}`, `%${paymentId}%`]
      );

      const clientIds = Array.from(new Set(txs.map((r) => r.clienteId).filter(Boolean)));
      if (clientIds.length > 0) {
        await syncMultipleClientsFinancialStatus(clientIds);
      }

      invalidateDbCache();
      const io = (req.app as any)?.locals?.io;
      if (io) {
        io.emit("asaas_payment_updated", { event, paymentId, status: "estornado" });
      }
      console.log(`[Asaas Webhook] Reverted ${txs.length} transactions for refunded payment ${paymentId}.`);
    }
  } catch (err: any) {
    console.error("[Asaas Webhook] Error processing webhook database update:", err);
  }

  return res.status(200).json({ received: true });
});

export default router;

