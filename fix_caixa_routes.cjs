const fs = require('fs');
const file = 'server-routes/marina-caixa.routes.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/async function handleUpsert[\s\S]*?const router = /m, `async function handleUpsert(item: any) {
  await upsertCaixaMarinaTransacao(item);

  const currentPool = getDbPool();
  if (!currentPool) return;

  const tfId = \`tf_cx_\${item.id}\`;
  const tfStatus = item.formaPagamento === 'faturado' ? 'lancado' : 'realizado';
  const tfDataPagamento = item.formaPagamento === 'faturado' ? null : (item.data || new Date().toISOString().split('T')[0]);
  const tfTipo = item.tipo === 'entrada' ? 'receita' : 'despesa';
  
  let desc = item.descricao || 'Operação de Caixa Marina';
  if (item.formaPagamento === 'faturado') {
      desc += ' (Pendurado)';
  } else {
      desc += \` (\${item.formaPagamento})\`;
  }

  const categoriaStr = item.categoria || 'Caixa Marina';
  const vencimento = item.data || new Date().toISOString().split('T')[0];
  const createdAt = new Date().toISOString();

  await (currentPool as any).query(
    \`INSERT INTO TransacoesFinanceiras (
      id, tipo, categoria, descricao, valor, dataVencimento, dataPagamento, status, clienteId, embarcacaoId, empresa, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Marina', ?)
    ON DUPLICATE KEY UPDATE
      descricao = VALUES(descricao),
      valor = VALUES(valor),
      clienteId = VALUES(clienteId),
      embarcacaoId = VALUES(embarcacaoId),
      dataPagamento = VALUES(dataPagamento),
      status = VALUES(status),
      tipo = VALUES(tipo)\`,
    [
      tfId, tfTipo, categoriaStr, desc, item.valor, 
      vencimento, tfDataPagamento, tfStatus, 
      item.clienteId || null, 
      item.embarcacaoId || null, 
      createdAt
    ]
  );
}

const router = `);

code = code.replace(/await deleteCaixaMarinaTransacao\(data\.id \|\| data\);/g, `const idToDelete = data.id || data;
      await deleteCaixaMarinaTransacao(idToDelete);
      const currentPool = getDbPool();
      if (currentPool) {
         await (currentPool as any).query("DELETE FROM TransacoesFinanceiras WHERE id = ?", [\`tf_cx_\${idToDelete}\`]);
      }`);

fs.writeFileSync(file, code);
