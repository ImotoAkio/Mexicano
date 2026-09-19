const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

code = code.replace(
  `} else {
      setEditingFornecedor(null);`,
  `} else if (activeSubTab === 'centros_custo') {
      setEditingCentro(null);
      setCentroForm({
        nome: '',
        empresaId: empresa && empresa !== 'Todos' ? empresa : 'Marina',
        status: 'ativo'
      });
    } else {
      setEditingFornecedor(null);`
);

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
