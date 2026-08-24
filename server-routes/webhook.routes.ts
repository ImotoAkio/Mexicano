import { Router } from "express";
import { getConfigValue, syncMultipleClientsFinancialStatus, syncClientFinancialStatus } from "../server-db";
import { getDbPool } from "../server-db";

const router = Router();

router.post("/asaas", async (req, res) => {
  const token = req.headers["asaas-access-token"];
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN || await getConfigValue("asaas_webhook_token");
  if (expectedToken && token !== expectedToken) {
    console.warn("[Asaas Webhook] Invalid webhook token received.");
    return res.status(401).json({ error: true, message: "Unauthorized token" });
  }

  const { event, payment } = req.body;
  if (!event || !payment) {
    return res.status(400).json({ error: true, message: "Invalid payload" });
  }

  console.log(`[Asaas Webhook] Event received: ${event} for payment: ${payment.id}`);

  if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
    const paymentId = payment.id;
    const externalRef = payment.externalReference;

    const currentPool = getDbPool();
    if (currentPool) {
      try {
        if (externalRef && externalRef.startsWith("BULK-")) {
          const [rows] = await currentPool.query("SELECT DISTINCT clienteId FROM TransacoesFinanceiras WHERE asaasPaymentId = ?", [paymentId]);
          const todayStr = new Date().toISOString().split("T")[0];
          await currentPool.query(
            "UPDATE TransacoesFinanceiras SET status = 'pago', dataPagamento = ? WHERE asaasPaymentId = ? AND status != 'pago'",
            [todayStr, paymentId]
          );
          console.log(`[Asaas Webhook] Marked BULK transactions for payment ${paymentId} as paid.`);
          if ((rows as any[]).length > 0) {
            const clientIds = (rows as any[]).map(r => r.clienteId).filter(Boolean);
            if (clientIds.length > 0) {
              await syncMultipleClientsFinancialStatus(clientIds);
            }
          }
        } else {
          let tx = null;
          if (externalRef) {
            const [rows] = await currentPool.query("SELECT * FROM TransacoesFinanceiras WHERE id = ?", [externalRef]);
            if ((rows as any[]).length > 0) tx = (rows as any[])[0];
          }
          if (!tx && paymentId) {
            const [rows] = await currentPool.query("SELECT * FROM TransacoesFinanceiras WHERE asaasPaymentId = ?", [paymentId]);
            if ((rows as any[]).length > 0) tx = (rows as any[])[0];
          }

          if (tx) {
            if (tx.status !== "pago") {
              const todayStr = new Date().toISOString().split("T")[0];
              await currentPool.query(
                "UPDATE TransacoesFinanceiras SET status = 'pago', dataPagamento = ?, valor = ? WHERE id = ?",
                [todayStr, payment.value || tx.valor, tx.id]
              );
              console.log(`[Asaas Webhook] Marked transaction ${tx.id} as paid.`);

              if (tx.clienteId) {
                await syncClientFinancialStatus(tx.clienteId);
              }
            }
          } else {
            console.warn(`[Asaas Webhook] No matching transaction found for Asaas payment ID ${paymentId} or externalRef ${externalRef}`);
          }
        }
      } catch (err: any) {
        console.error("[Asaas Webhook] Error processing webhook database update:", err);
      }
    }
  }

  return res.status(200).json({ received: true });
});

export default router;
