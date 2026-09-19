const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

const editHandler = `
  const handleOpenEditFornecedor = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setFornecedorForm({ ...fornecedor });
    setIsModalOpen(true);
  };

  const handleOpenEditCentro = (centro: CentroDeCusto) => {
    setEditingCentro(centro);
    setCentroForm({ ...centro });
    setIsModalOpen(true);
  };
`;

code = code.replace(/  const handleOpenEditFornecedor = \(fornecedor: Fornecedor\) => \{\n    setEditingFornecedor\(fornecedor\);\n    setFornecedorForm\(\{ \.\.\.fornecedor \}\);\n    setIsModalOpen\(true\);\n  \};\n/g, editHandler);

const saveHandler = `
  const handleSaveFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingFornecedor?.id ? { id: editingFornecedor.id } : {}),
        ...fornecedorForm
      };
      const res = await fetch('/api/financeiro/fornecedores/save', {
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

code = code.replace(/  const handleSaveFornecedor = [\s\S]*?alert\('Erro ao comunicar com o servidor'\);\n    \}\n  \};\n/g, saveHandler);

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('Handlers added');
