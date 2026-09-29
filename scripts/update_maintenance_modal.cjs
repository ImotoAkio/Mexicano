const fs = require('fs');

const path = "src/components/pecas/MaintenanceModal.tsx";
let code = fs.readFileSync(path, 'utf8');

// Replace statusOptions
code = code.replace(
  /const statusOptions = \[[\s\S]*?\];/,
  `const statusOptions = [
    { value: 'aguardando_orcamento', label: '1. Aguardando Orçamento' },
    { value: 'aguardando_aprovacao', label: '2. Aguardando Aprovação Cliente' },
    { value: 'em_execucao', label: '3. Execução da OS' },
    { value: 'concluido', label: '4. Concluído & Liberado' },
    { value: 'reprovado', label: 'Cancelado / Reprovado' }
  ];`
);

// Remove the inline auto-generation block
code = code.replace(
  /\/\/ --- AUTO-GENERATE CONTAS A PAGAR ---[\s\S]*?\/\/ --- END AUTO-GENERATE CONTAS A PAGAR ---/,
  ''
);

// Validate changes in logic strings in Validation matching Kanban standards
code = code.replace(
  /formData\.status === 'orcamento_pendente'/g,
  "formData.status === 'aguardando_aprovacao'"
);
code = code.replace(
  /formData\.status === 'em_andamento'/g,
  "formData.status === 'em_execucao'"
);
code = code.replace(
  /status: 'fila_espera'/g,
  "status: 'aguardando_orcamento'"
);

// Add logic to MaintenanceModal.tsx to handle the "Concluído" save inside handleSave:
code = code.replace(
  /if \(isEditing && editingItem\?\.id\) \{[\s\S]*?await maintenanceDB\.update\(editingItem\.id, formData\);[\s\S]*?\} else \{/,
  `if (isEditing && editingItem?.id) {
        await maintenanceDB.update(editingItem.id, formData);

        if (formData.status === 'concluido' && editingItem.status !== 'concluido') {
           // Lazy finance generation is handled directly here if changed in modal
           await generateLazyFinance(formData.id, formData);
        }
      } else {`
);

// Inject the create one too
code = code.replace(
  /const created = await maintenanceDB\.create\(formData as any\);/,
  `const created = await maintenanceDB.create(formData as any);
        if (created.status === 'concluido') {
           await generateLazyFinance(created.id, created);
        }`
);

// Inject function definition just before handleSave
const helperFunction = `  const generateLazyFinance = async (osId: string, itemData: any) => {
    const token = localStorage.getItem('admin_token');
    const generatedCodigoOS = itemData.codigoOS || \`OS-\${Date.now()}\`;

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
  };

  const handleSave = async (e?: React.FormEvent) => {`;

code = code.replace(/  const handleSave = async \(.*?\) => \{/, helperFunction);

fs.writeFileSync(path, code);