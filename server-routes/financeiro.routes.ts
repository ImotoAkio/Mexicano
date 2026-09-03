import { Router } from "express";
import { requireAdminAuth, requireAnyAuth, requireClientAuth, sensitiveLimiter } from "./middlewares";
import {
  getAllTransacoes,
  deleteTransacao,
  deleteAllTransacoes,
  deleteTransacoesByClientIds,
  upsertTransacao,
  invalidateDbCache,
  getAllAtividades,
  deleteAtividade,
  upsertAtividade,
  getConfigValue,
  syncMultipleClientsFinancialStatus,
  syncClientFinancialStatus
} from "../server-db";

import {
  getOrRegisterAsaasCustomer,
  createAsaasCharge,
  getPixQrCode,
  createAsaasBulkCharge
} from "../server-asaas";
import { getDbPool } from "../server-db";

const router = Router();

router.get("/transacoes", requireAdminAuth, async (req, res) => {
  try {
    const transacoes = await getAllTransacoes();
    if (req.query.clienteId) {
      return res.json(transacoes.filter((t: any) => t.clienteId === req.query.clienteId));
    }
    res.json(transacoes);
  } catch (err: any) {
    console.error("Error fetching transacoes:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to fetch transacoes" });
  }
});

router.post("/transacoes/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteTransacao(data.id || data);
    } else if (action === 'delete_all') {
      await deleteAllTransacoes();
    } else if (action === 'delete_by_clients') {
      await deleteTransacoesByClientIds(data.clientIds || data);
    } else if (action === 'upsert') {
      if (Array.isArray(data)) {
        for (const item of data) {
          await upsertTransacao(item);
        }
      } else {
        await upsertTransacao(data);
      }
    } else {
      return res.status(400).json({ error: true, message: `Unsupported action: ${action}` });
    }
    invalidateDbCache();
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Transacao Save Error]", err);
    res.status(500).json({ error: true, message: err.message || "Failed to save transacao" });
  }
});

router.post("/transacoes/:id/gerar-asaas", requireAnyAuth, sensitiveLimiter, async (req, res) => {
  const { id } = req.params;
  const { billingType } = req.body;

  if (!["PIX", "BOLETO", "CREDIT_CARD"].includes(billingType)) {
    return res.status(400).json({ error: true, message: "Tipo de cobrança inválido" });
  }

  const currentPool = getDbPool();
  if (!currentPool) {
    return res.status(500).json({ error: true, message: "Banco de dados offline" });
  }

  try {
    const [txRows] = await currentPool.query("SELECT * FROM TransacoesFinanceiras WHERE id = ?", [id]);
    const tx = (txRows as any[])[0];

    if (!tx) {
      return res.status(404).json({ error: true, message: "Transação não encontrada" });
    }

    const user = (req as any).user;
    if (user.role === "client" && tx.clienteId !== user.id) {
      return res.status(403).json({ error: true, message: "Acesso negado: esta transação pertence a outro cliente." });
    }
    if (tx.tipo !== "receita") {
      return res.status(400).json({ error: true, message: "Apenas receitas podem ter cobranças Asaas" });
    }
    if (tx.status === "pago") {
      return res.status(400).json({ error: true, message: "Esta transação já está paga" });
    }
    if (!tx.clienteId) {
      return res.status(400).json({ error: true, message: "Transação não possui cliente vinculado" });
    }

    const [clientRows] = await currentPool.query("SELECT * FROM Clientes WHERE id = ?", [tx.clienteId]);
    const client = (clientRows as any[])[0];
    if (!client) {
      return res.status(404).json({ error: true, message: "Cliente vinculado não encontrado" });
    }

    const asaasCustomerId = await getOrRegisterAsaasCustomer(client);
    const charge = await createAsaasCharge(tx, asaasCustomerId, billingType);

    await currentPool.query(
      "UPDATE TransacoesFinanceiras SET asaasPaymentId = ?, asaasPaymentUrl = ? WHERE id = ?",
      [charge.asaasPaymentId, charge.asaasPaymentUrl, tx.id]
    );

    let qrCode = null;
    if (billingType === "PIX") {
      try {
        qrCode = await getPixQrCode(charge.asaasPaymentId);
      } catch (qrErr: any) {
        console.error("Failed to fetch Pix QR Code from Asaas:", qrErr);
      }
    }

    res.json({
      success: true,
      asaasPaymentId: charge.asaasPaymentId,
      asaasPaymentUrl: charge.asaasPaymentUrl,
      qrCode
    });
  } catch (err: any) {
    console.error("Error generating Asaas charge:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to generate Asaas charge" });
  }
});

router.post("/fatura/gerar-asaas", requireClientAuth, sensitiveLimiter, async (req, res) => {
  const { billingType } = req.body;

  if (billingType !== "PIX") {
    return res.status(400).json({ error: true, message: "Tipo de cobrança inválido para fatura completa. Use PIX." });
  }

  const currentPool = getDbPool();
  if (!currentPool) {
    return res.status(500).json({ error: true, message: "Banco de dados offline" });
  }

  try {
    const user = (req as any).user;

    const [txRows] = await currentPool.query("SELECT * FROM TransacoesFinanceiras WHERE clienteId = ? AND tipo = 'receita' AND status NOT IN ('pago', 'cancelado')", [user.id]);
    const txs = (txRows as any[]);

    if (txs.length === 0) {
      return res.status(400).json({ error: true, message: "Não há faturas pendentes para gerar cobrança." });
    }

    const [clientRows] = await currentPool.query("SELECT * FROM Clientes WHERE id = ?", [user.id]);
    const client = (clientRows as any[])[0];
    if (!client) {
      return res.status(404).json({ error: true, message: "Cliente não encontrado" });
    }

    const asaasCustomerId = await getOrRegisterAsaasCustomer(client);
    const charge = await createAsaasBulkCharge(txs, asaasCustomerId, billingType);

    for (const tx of txs) {
      await currentPool.query(
        "UPDATE TransacoesFinanceiras SET asaasPaymentId = ?, asaasPaymentUrl = ? WHERE id = ?",
        [charge.asaasPaymentId, charge.asaasPaymentUrl, tx.id]
      );
    }

    let qrCode = null;
    if (billingType === "PIX") {
      try {
        qrCode = await getPixQrCode(charge.asaasPaymentId);
      } catch (qrErr: any) {
        console.error("Failed to fetch Pix QR Code from Asaas:", qrErr);
      }
    }

    res.json({
      success: true,
      asaasPaymentId: charge.asaasPaymentId,
      asaasPaymentUrl: charge.asaasPaymentUrl,
      qrCode
    });
  } catch (err: any) {
    console.error("Error generating Asaas bulk charge:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to generate Asaas charge" });
  }
});


export default router;
