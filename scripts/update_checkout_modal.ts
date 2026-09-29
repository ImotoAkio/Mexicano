import fs from 'fs';

const path = "src/components/pecas/MaintenanceCheckoutModal.tsx";
let code = fs.readFileSync(path, 'utf8');

// We need to inject the fetch block into handleSave
const helperStr = `
      await maintenanceDB.update(item.id, {
        status: 'concluido',
        horasMotorAtual,
        gerarFinanceiro,
        valorRepassado: valor
      });
      
      const token = localStorage.getItem('admin_token');
      const generatedCodigoOS = item.codigoOS || \`OS-\${Date.now()}\`;
      const itemData = {
        ...item,
        status: 'concluido',
        horasMotorAtual,
        gerarFinanceiro,
        orcamento: valor // Map valor to budget logic since valorRepassado overrides it here contextually
      };

      // 1. Gera Despesa se houver Custo Interno pago a terceiro
      if (itemData.custo && itemData.custo > 0 && itemData.mecanico) {
        const transacaoDespesa = {
          id: \`fin_\${Date.now()}_\${Math.random().toString(36).substring(7)}\`,
          tipo: 'despesa',
          categoria: 'Mão de Obra / Serviços Terceirizados',
          valor: itemData.custo,
          descricao: \`Serviço Terceirizado: \${itemData.tipoManutencaoNome || itemData.tituloChamado || 'Manutenção'} - \${generatedCodigoOS}\`,
          fornecedorId: itemData.mecanico,
          status: 'lancado',
          dataVencimento: new Date().toISOString().split('T')[0],
          empresa: 'Mexicano',
          embarcacaoId: itemData.embarcacaoId,
          createdAt: new Date().toISOString()
        };
        await fetch('/api/financeiro/transacoes/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': \`Bearer \${token}\` } : {}) },
          body: JSON.stringify({ action: 'upsert', data: transacaoDespesa })
        }).catch(e => console.error('Erro na geração de despesa:', e));
      }

      // 2. Gera Receita se estiver assinalado gerarFinanceiro
      if (itemData.gerarFinanceiro && itemData.orcamento && itemData.orcamento > 0) {
        const transacaoReceita = {
          id: \`fin_\${Date.now()}_\${Math.random().toString(36).substring(7)}\`,
          tipo: 'receita',
          categoria: 'Manutenção',
          valor: itemData.orcamento,
          descricao: \`OS Concluída: \${itemData.tipoManutencaoNome || itemData.tituloChamado || 'Manutenção'} - \${generatedCodigoOS}\`,
          status: 'lancado',
          dataVencimento: new Date().toISOString().split('T')[0],
          empresa: 'Mexicano',
          embarcacaoId: itemData.embarcacaoId,
          createdAt: new Date().toISOString()
        };
        await fetch('/api/financeiro/transacoes/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': \`Bearer \${token}\` } : {}) },
          body: JSON.stringify({ action: 'upsert', data: transacaoReceita })
        }).catch(e => console.error('Erro na geração de receita:', e));
      }
`;

code = code.replace(
  /await maintenanceDB\.update\(item\.id, \{\s*status: 'concluido',\s*horasMotorAtual,\s*gerarFinanceiro,\s*valorRepassado: valor\s*\}\);/,
  helperStr
);

fs.writeFileSync(path, code);
