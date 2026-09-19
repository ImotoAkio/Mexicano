const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'server-routes', 'financeiro.routes.ts');
let code = fs.readFileSync(file, 'utf8');

const newRoute = `
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
      \`SELECT * FROM TransacoesFinanceiras WHERE clienteId = ? AND id IN (\${listPlaceholders}) AND tipo = 'receita' AND status NOT IN ('pago', 'cancelado')\`,
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

    const asaasCustomerId = await getOrRegisterAsaasCustomer(client);
    // Para 1 transacao usa single, para multiplas usa bulk
    let charge;
    if (txs.length === 1) {
       charge = await createAsaasCharge(txs[0], asaasCustomerId, billingType || "PIX");
    } else {
       charge = await createAsaasBulkCharge(txs, asaasCustomerId, billingType || "PIX");
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
`;

if (!code.includes('/transacoes/gerar-asaas-lote')) {
  code = code.replace('export default router;', newRoute + '\nexport default router;');
  fs.writeFileSync(file, code);
  console.log('Route added');
} else {
  console.log('Route already exists');
}
