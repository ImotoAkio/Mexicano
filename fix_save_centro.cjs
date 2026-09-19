const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

const handleCode = `
  const handleSaveCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingCentro?.id ? { id: editingCentro.id } : {}),
        ...centroForm
      };
      const res = await fetch('/api/financeiro/centros_custo/save', {
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
        alert('Erro ao salvar registro');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao comunicar com o servidor');
    }
  };
`;

if (!code.includes('const handleSaveCentro =')) {
  code = code.replace('  const fetchData = async () => {', handleCode + '\n  const fetchData = async () => {');
  fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
  console.log('Inserted handleSaveCentro');
} else {
  console.log('Already exists');
}
