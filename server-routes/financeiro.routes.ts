// @ts-nocheck
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
  syncClientFinancialStatus,
  getAllContasBancarias,
  upsertContaBancaria,
  deleteContaBancaria,
  getAllPlanosDeContas,
  upsertPlanoDeConta,
  deletePlanoDeConta,
  getAllFornecedores,
  getAllCentrosDeCusto,
  upsertCentroDeCusto,
  deleteCentroDeCusto,
  upsertFornecedor,
  deleteFornecedor
} from "../server-db";

import {
  getOrRegisterAsaasCustomer,
  createAsaasCharge,
  getPixQrCode,
  createAsaasBulkCharge
} from "../server-asaas";
import { getDbPool, getConfigValue, setConfigValue } from "../server-db";

function getGlobalEmpresaFromRole(role: string): string | null {
  const r = role.toLowerCase().trim();
  if (['admin', 'financeiro'].includes(r)) return null; // global
  if (['pecas_servicos'].includes(r)) return 'Vale Administradora';
  if (['comercial'].includes(r)) return 'Mexicano';
  return 'Marina Velho Chico'; // fallback for all others (marina_gerente, marinheiro operador, etc)
}

const router = Router();

const FINANCEIRO_WHATSAPP_MSG = "Pagamentos online estão temporariamente desativados. Entre em contato com o financeiro pelo WhatsApp +55 87 9122-9333.";
async function isPagamentoOnlineHabilitado(): Promise<boolean> {
  return (await getConfigValue("pagamentos_online_habilitado")) === "1";
}

router.get("/transacoes", requireAdminAuth, async (req, res) => {
  try {
    let transacoes = await getAllTransacoes();
    const allowedEmpresa = getGlobalEmpresaFromRole((req as any).user?.role || '');
    if (allowedEmpresa) {
      transacoes = transacoes.filter((t: any) => t.empresa === allowedEmpresa);
    } else if (req.query.empresa) {
      transacoes = transacoes.filter((t: any) => t.empresa === req.query.empresa);
    }
    if (req.query.clienteId) {
      transacoes = transacoes.filter((t: any) => t.clienteId === req.query.clienteId);
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
    const allowedEmpresa = getGlobalEmpresaFromRole((req as any).user?.role || '');
    if (action === 'delete') {
      await deleteTransacao(data.id || data);
    } else if (action === 'delete_all') {
      await deleteAllTransacoes();
    } else if (action === 'delete_by_clients') {
      await deleteTransacoesByClientIds(data.clientIds || data);
    } else if (action === 'upsert') {
      if (Array.isArray(data)) {
        for (const item of data) {
          if (allowedEmpresa && !item.empresa) item.empresa = allowedEmpresa;
          await upsertTransacao(item);
        }
      } else {
        if (allowedEmpresa && !data.empresa) data.empresa = allowedEmpresa;
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

// ----------------------------------------------------------------------
// CONTAS BANCARIAS
// ----------------------------------------------------------------------
router.get("/contas-bancarias", requireAdminAuth, async (req, res) => {
  try {
    let contas = await getAllContasBancarias();
    const allowedEmpresa = getGlobalEmpresaFromRole((req as any).user?.role || '');
    if (allowedEmpresa) {
      contas = contas.filter((c: any) => c.empresa === allowedEmpresa);
    } else if (req.query.empresa) {
      contas = contas.filter((c: any) => c.empresa === req.query.empresa);
    }
    res.json(contas);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch contas bancarias" });
  }
});

router.post("/contas-bancarias/save", requireAdminAuth, async (req, res) => {
  const { action, data } = req.body;
  try {
    const allowedEmpresa = getGlobalEmpresaFromRole((req as any).user?.role || '');
    if (action === 'delete') {
      await deleteContaBancaria(data.id || data);
    } else if (action === 'upsert') {
      if (Array.isArray(data)) {
        for (const item of data) {
          if (allowedEmpresa) item.empresa = allowedEmpresa;
          await upsertContaBancaria(item);
        }
      } else {
        if (allowedEmpresa) data.empresa = allowedEmpresa;
        await upsertContaBancaria(data);
      }
    } else {
      return res.status(400).json({ error: true, message: `Unsupported action: ${action}` });
    }
    invalidateDbCache();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save conta bancaria" });
  }
});

// ----------------------------------------------------------------------
// PLANOS DE CONTAS
// ----------------------------------------------------------------------
router.get("/planos-contas", requireAdminAuth, async (req, res) => {
  try {
    let contas = await getAllPlanosDeContas();
    const allowedEmpresa = getGlobalEmpresaFromRole((req as any).user?.role || '');
    if (allowedEmpresa) {
      contas = contas.filter((c: any) => c.empresa === allowedEmpresa || c.empresa === 'Todos');
    } else if (req.query.empresa) {
      contas = contas.filter((c: any) => c.empresa === req.query.empresa || c.empresa === 'Todos');
    }
    res.json(contas);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch planos de contas" });
  }
});

router.post("/planos-contas/save", requireAdminAuth, async (req, res) => {
  const { action, data } = req.body;
  try {
    const allowedEmpresa = getGlobalEmpresaFromRole((req as any).user?.role || '');
    if (action === 'delete') {
      await deletePlanoDeConta(data.id || data);
    } else if (action === 'upsert') {
      if (Array.isArray(data)) {
        for (const item of data) {
          if (allowedEmpresa && item.empresa !== 'Todos') item.empresa = allowedEmpresa;
          await upsertPlanoDeConta(item);
        }
      } else {
        if (allowedEmpresa && data.empresa !== 'Todos') data.empresa = allowedEmpresa;
        await upsertPlanoDeConta(data);
      }
    } else {
      return res.status(400).json({ error: true, message: `Unsupported action: ${action}` });
    }
    invalidateDbCache();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save plano de conta" });
  }
});

// ----------------------------------------------------------------------
// FORNECEDORES
// ----------------------------------------------------------------------
router.get("/fornecedores", requireAdminAuth, async (req, res) => {
  try {
    let fornecedores = await getAllFornecedores();
    const allowedEmpresa = getGlobalEmpresaFromRole((req as any).user?.role || '');
    if (allowedEmpresa) {
      fornecedores = fornecedores.filter((f: any) => f.empresa === allowedEmpresa);
    } else if (req.query.empresa) {
      fornecedores = fornecedores.filter((f: any) => f.empresa === req.query.empresa);
    }
    res.json(fornecedores);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch fornecedores" });
  }
});

router.post("/fornecedores/save", requireAdminAuth, async (req, res) => {
  const { action, data } = req.body;
  try {
    const allowedEmpresa = getGlobalEmpresaFromRole((req as any).user?.role || '');
    if (action === 'delete') {
      await deleteFornecedor(data.id || data);
    } else if (action === 'upsert') {
      if (Array.isArray(data)) {
        for (const item of data) {
          if (allowedEmpresa) item.empresa = allowedEmpresa;
          await upsertFornecedor(item);
        }
      } else {
        if (allowedEmpresa) data.empresa = allowedEmpresa;
        await upsertFornecedor(data);
      }
    } else {
      return res.status(400).json({ error: true, message: `Unsupported action: ${action}` });
    }
    invalidateDbCache();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save fornecedor" });
  }
});

router.post("/transacoes/:id/gerar-asaas", requireAnyAuth, sensitiveLimiter, async (req, res) => {
  const { id } = req.params;
  const { billingType } = req.body;

  if (!["PIX", "BOLETO", "CREDIT_CARD"].includes(billingType)) {
    return res.status(400).json({ error: true, message: "Tipo de cobrança inválido" });
  }

  if ((req as any).user?.role === "client" && !(await isPagamentoOnlineHabilitado())) {
    return res.status(403).json({ error: true, code: "PAYMENTS_DISABLED", message: FINANCEIRO_WHATSAPP_MSG });
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

    let asaasCustomerId = await getOrRegisterAsaasCustomer(client);
    let charge;
    try {
      charge = await createAsaasCharge(tx, asaasCustomerId, billingType);
    } catch (chargeErr: any) {
      if (chargeErr.message && (chargeErr.message.toLowerCase().includes("customer") || chargeErr.message.toLowerCase().includes("cliente"))) {
        console.warn("[Asaas] Customer ID rejected by Asaas API. Clearing cached ID and retrying...");
        await currentPool.query("UPDATE Clientes SET asaasCustomerId = NULL WHERE id = ?", [client.id]);
        client.asaasCustomerId = null;
        asaasCustomerId = await getOrRegisterAsaasCustomer(client);
        charge = await createAsaasCharge(tx, asaasCustomerId, billingType);
      } else {
        throw chargeErr;
      }
    }

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

  if (!(await isPagamentoOnlineHabilitado())) {
    return res.status(403).json({ error: true, code: "PAYMENTS_DISABLED", message: FINANCEIRO_WHATSAPP_MSG });
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

    let asaasCustomerId = await getOrRegisterAsaasCustomer(client);
    let charge;
    try {
      charge = await createAsaasBulkCharge(txs, asaasCustomerId, billingType);
    } catch (chargeErr: any) {
      if (chargeErr.message && (chargeErr.message.toLowerCase().includes("customer") || chargeErr.message.toLowerCase().includes("cliente"))) {
        console.warn("[Asaas] Customer ID rejected by Asaas API for bulk charge. Clearing cached ID and retrying...");
        await currentPool.query("UPDATE Clientes SET asaasCustomerId = NULL WHERE id = ?", [client.id]);
        client.asaasCustomerId = null;
        asaasCustomerId = await getOrRegisterAsaasCustomer(client);
        charge = await createAsaasBulkCharge(txs, asaasCustomerId, billingType);
      } else {
        throw chargeErr;
      }
    }

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



router.post("/transacoes/gerar-asaas-lote", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { clienteId, transacoesIds, billingType } = req.body;

  if (!clienteId || !transacoesIds || !Array.isArray(transacoesIds) || transacoesIds.length === 0) {
    return res.status(400).json({ error: true, message: "Parâmetros inválidos" });
  }

  const currentPool = getDbPool();
  if (!currentPool) {
    return res.status(500).json({ error: true, message: "Banco de dados offline" });
  }

  try {
    const listPlaceholders = transacoesIds.map(() => '?').join(',');
    const [txRows] = await currentPool.query(
      `SELECT * FROM TransacoesFinanceiras WHERE clienteId = ? AND id IN (${listPlaceholders}) AND tipo = 'receita' AND status NOT IN ('pago', 'cancelado')`,
      [clienteId, ...transacoesIds]
    );
    const txs = (txRows as any[]);

    if (txs.length === 0) {
      return res.status(400).json({ error: true, message: "Nenhuma transação elegível encontrada." });
    }

    const [clientRows] = await currentPool.query("SELECT * FROM Clientes WHERE id = ?", [clienteId]);
    const client = (clientRows as any[])[0];
    if (!client) {
      return res.status(404).json({ error: true, message: "Cliente não encontrado" });
    }

    let asaasCustomerId = await getOrRegisterAsaasCustomer(client);
    // Para 1 transacao usa single, para multiplas usa bulk
    let charge;
    const makeCharge = async (customerId: string) => {
      if (txs.length === 1) {
         return await createAsaasCharge(txs[0], customerId, billingType || "PIX");
      } else {
         return await createAsaasBulkCharge(txs, customerId, billingType || "PIX");
      }
    };

    try {
      charge = await makeCharge(asaasCustomerId);
    } catch (chargeErr: any) {
      if (chargeErr.message && (chargeErr.message.toLowerCase().includes("customer") || chargeErr.message.toLowerCase().includes("cliente"))) {
        console.warn("[Asaas] Customer ID rejected by Asaas API. Clearing cached ID and retrying...");
        await currentPool.query("UPDATE Clientes SET asaasCustomerId = NULL WHERE id = ?", [client.id]);
        client.asaasCustomerId = null;
        asaasCustomerId = await getOrRegisterAsaasCustomer(client);
        charge = await makeCharge(asaasCustomerId);
      } else {
        throw chargeErr;
      }
    }

    // Associa o ID e a URL a todas as transações incluídas
    for (const tx of txs) {
      await currentPool.query(
        "UPDATE TransacoesFinanceiras SET asaasPaymentId = ?, asaasPaymentUrl = ? WHERE id = ?",
        [charge.asaasPaymentId, charge.asaasPaymentUrl, tx.id]
      );
    }

    let qrCode = null;
    if (billingType === "PIX" || charge.billingType === "PIX" || !billingType) {
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
      qrCode,
      transacoes: txs
    });
  } catch (err: any) {
    console.error("Error generating Asaas batch charge:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to generate Asaas batch charge" });
  }
});


// ----------------------------------------------------------------------
// CENTROS DE CUSTO
// ----------------------------------------------------------------------
router.get("/centros-custo", requireAdminAuth, async (req, res) => {
  try {
    let centros = await getAllCentrosDeCusto();
    const allowedEmpresa = getGlobalEmpresaFromRole((req as any).user?.role || '');
    if (allowedEmpresa) {
      centros = centros.filter((c: any) => c.empresa === allowedEmpresa || c.empresa === 'Todos');
    } else if (req.query.empresa) {
      centros = centros.filter((c: any) => c.empresa === req.query.empresa || c.empresa === 'Todos');
    }
    res.json(centros);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch centros de custo" });
  }
});

router.post("/centros-custo/save", requireAdminAuth, async (req, res) => {
  const { action, data } = req.body;
  try {
    const allowedEmpresa = getGlobalEmpresaFromRole((req as any).user?.role || '');
    if (action === 'delete') {
      await deleteCentroDeCusto(data.id || data);
      res.json({ success: true, message: "Centro de Custo deleted" });
    } else {
      if (allowedEmpresa && data.empresa !== allowedEmpresa) {
        data.empresa = allowedEmpresa;
      }
      await upsertCentroDeCusto(data);
      res.json({ success: true, message: "Centro de Custo saved successfully" });
    }
  } catch (err: any) {
    console.error("Error saving Centro de Custo:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to save Centro de Custo" });
  }
});

// ----------------------------------------------------------------------
// CONFIGURAÇÕES GLOBAIS (TAXA DE JUROS)
// ----------------------------------------------------------------------
router.get("/configuracoes", requireAdminAuth, async (req, res) => {
  try {
    const taxaJurosMensal = await getConfigValue('fin_taxa_juros_mensal') || '2.2';
    const taxaMultaAtraso = await getConfigValue('fin_taxa_multa_atraso') || '2.0';
    const asaasContaBancariaId = await getConfigValue('fin_asaas_conta_bancaria_id') || '';
    const fin_asaas_split_enabled = await getConfigValue('fin_asaas_split_enabled') === '1';
    res.json({ success: true, configuracoes: { taxaJurosMensal, taxaMultaAtraso, asaasContaBancariaId, fin_asaas_split_enabled } });
  } catch (err: any) {
    console.error("[Configuracoes Error]", err);
    res.status(500).json({ error: true, message: err.message || "Failed to fetch configuracoes" });
  }
});

router.post("/configuracoes", requireAdminAuth, async (req, res) => {
  try {
    const { taxaJurosMensal, taxaMultaAtraso, asaasContaBancariaId, fin_asaas_split_enabled } = req.body;
    if (taxaJurosMensal !== undefined) {
      await setConfigValue('fin_taxa_juros_mensal', String(taxaJurosMensal));
    }
    if (taxaMultaAtraso !== undefined) {
      await setConfigValue('fin_taxa_multa_atraso', String(taxaMultaAtraso));
    }
    if (asaasContaBancariaId !== undefined) {
      await setConfigValue('fin_asaas_conta_bancaria_id', String(asaasContaBancariaId));
    }
    if (fin_asaas_split_enabled !== undefined) {
      await setConfigValue('fin_asaas_split_enabled', fin_asaas_split_enabled === '1' || fin_asaas_split_enabled === true ? '1' : '0');
    }
    const io = (req.app as any).locals.io;
    if (io) io.emit('finance_config_update', { taxaJurosMensal, taxaMultaAtraso, asaasContaBancariaId, fin_asaas_split_enabled });

    res.json({ success: true });
  } catch (err: any) {
    console.error("[Post Configuracoes Error]", err);
    res.status(500).json({ error: true, message: err.message || "Failed to save configuracoes" });
  }
});

export default router;
