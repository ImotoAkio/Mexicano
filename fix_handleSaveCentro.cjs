const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

// Remove the wrongly injected handleSaveCentro
const wronglyInjected = /const handleSaveCentro = async \(e: React\.FormEvent\) => \{[\s\S]*?alert\('Erro ao salvar dados'\);\n    \}\n  \};/;
code = code.replace(wronglyInjected, '');

const handleSaveFornecedorIndex = code.indexOf('const handleSaveFornecedor = async');
const correctSaveCentro = `const handleSaveCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingCentro?.id ? { id: editingCentro.id } : {}),
        ...centroForm
      };
      const res = await fetch('/api/financeiro/centros-custo/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          action: 'upsert',
          data: payload
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        alert('Erro ao salvar centro de custo');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar dados');
    }
  };

  `;

code = code.substring(0, handleSaveFornecedorIndex) + correctSaveCentro + code.substring(handleSaveFornecedorIndex);

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('Fixed handleSaveCentro position');
