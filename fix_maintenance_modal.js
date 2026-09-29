const fs = require('fs');

const path = 'C:/Users/Akio/Documents/mexicano/src/components/pecas/MaintenanceModal.tsx';
let data = fs.readFileSync(path, 'utf8');

// 1. Fix chamadoDB.findById -> chamadoDB.getById
data = data.replace('const chamado = chamadoDB.findById(formData.chamadoId);', 'const chamado = chamadoDB.getById(formData.chamadoId);');

// 2. Add automatic transaction generation
const replacementCode = `// ------------------ START AUTO-GENERATE FINANCE TRANSACTION (CONTAS A PAGAR) ------------------
        if (formData.custo && formData.custo > 0 && formData.mecanico) {
          const mechanic = mecanicos.find(m => m.id === formData.mecanico);
          const isInternal = mechanic?.tipo === 'interno';
          
          if (!isInternal) {
            const token = localStorage.getItem('admin_token');
            const generatedCodigoOS = created.codigoOS || \`OS-\${Date.now()}\`; // fallback
            
            const transacaoDespesa = {
              id: \`fin_\${Date.now()}_\${Math.random().toString(36).substring(7)}\`,
              tipo: 'despesa',
              categoria: 'Mão de Obra / Serviços Terceirizados',
              valor: formData.custo,
              descricao: \`Serviço Terceirizado: \${formData.tipoManutencaoNome || formData.tituloChamado || 'Manutenção'} - \${generatedCodigoOS}\`,
              fornecedorId: formData.mecanico,
              status: 'lancado',
              dataVencimento: formData.dataChamado || new Date().toISOString().split('T')[0],
              empresa: 'Mexicano',
              embarcacaoId: formData.embarcacaoId,
              createdAt: new Date().toISOString()
            };

            fetch('/api/financeiro/transacoes/save', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
              },
              body: JSON.stringify({ action: 'upsert', data: transacaoDespesa })
            }).catch(e => console.error('Error auto-generating despesa:', e));
          }
        }
        // ------------------ END AUTO-GENERATE FINANCE TRANSACTION (CONTAS A PAGAR) ------------------

        if (formData.chamadoId) {`;

data = data.replace('        if (formData.chamadoId) {', replacementCode);

fs.writeFileSync(path, data);
console.log('Fixed MaintenanceModal.tsx');
