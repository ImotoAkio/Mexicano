const fs = require('fs');

const path = 'server-routes/marina-caixa.routes.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. In handleUpsert respect dataVencimento
code = code.replace(
  "const vencimento = item.data || new Date().toISOString().split('T')[0];",
  "const vencimento = item.dataVencimento || item.data || new Date().toISOString().split('T')[0];"
);

// 2. In abastecimentos-baixar, change upsertCaixaMarinaTransacao to handleUpsert 
// and remove the faturado block. But we need to add the next month vencimento if faturado!

code = code.replace(/await upsertCaixaMarinaTransacao\(caixaTransacao\);[\s\S]*?(?=const io)/, `
    if (finalFormaPagamento === 'faturado') {
      const dbData = await (currentPool as any).query("SELECT nome FROM Embarcacoes WHERE id = ?", [reserva.embarcacaoId]);
      const boatName = (dbData[0] as any[])[0]?.nome || 'Embarcação Local';
      caixaTransacao.descricao = \`Abastecimento faturado de \${litros}L (Reserva \${reservaId} - \${boatName})\`;
      caixaTransacao.dataVencimento = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 10).toISOString().split('T')[0];
    }
    
    await handleUpsert(caixaTransacao);
    
    `);

fs.writeFileSync(path, code);
console.log('Fixed abast');
