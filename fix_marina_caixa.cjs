const fs = require('fs');
const file = 'server-routes/marina-caixa.routes.ts';
let code = fs.readFileSync(file, 'utf8');

const targetFunctionStr = `
async function handleUpsert(item: any) {
  await upsertCaixaMarinaTransacao(item);
  
  if (item.tipo === 'entrada' && item.formaPagamento === 'faturado' && item.clienteId) {
    const currentPool = getDbPool();
    const tfId = \`tf_cx_\${item.id}\`;
    const tf = {
      id: tfId,
      tipo: 'receita',
      categoria: item.categoria || 'Vendas da Marina',
      descricao: item.descricao,
      valor: item.valor,
      dataVencimento: new Date().toISOString().split('T')[0],
      status: 'lancado',
      clienteId: item.clienteId,
      embarcacaoId: item.embarcacaoId || null,
      historicoTransacao: 'Origem: Operação de Caixa Marina (Pendurado)'
    };
    
    await (currentPool as any).query(
      \`INSERT INTO TransacoesFinanceiras (
        id, tipo, categoria, descricao, valor, dataVencimento, status, clienteId, embarcacaoId, historicoTransacao, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        descricao = VALUES(descricao),
        valor = VALUES(valor),
        clienteId = VALUES(clienteId),
        embarcacaoId = VALUES(embarcacaoId),
        updatedAt = VALUES(updatedAt)\`,
      [
        tf.id, tf.tipo, tf.categoria, tf.descricao, tf.valor, tf.dataVencimento,
        tf.status, tf.clienteId, tf.embarcacaoId, tf.historicoTransacao, new Date().toISOString(), new Date().toISOString()
      ]
    );
  }
}
`;

code = code.replace("import { getDbPool } from \"../server-db\";", "import { getDbPool } from \"../server-db\";\n" + targetFunctionStr);

code = code.replace(/await upsertCaixaMarinaTransacao\(item\);/g, "await handleUpsert(item);");
code = code.replace(/await upsertCaixaMarinaTransacao\(data\);/g, "await handleUpsert(data);");

fs.writeFileSync(file, code);
