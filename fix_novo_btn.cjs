const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

code = code.replace(
  "{activeSubTab === 'planos_contas' && 'Novo Plano de Contas'}",
  "{activeSubTab === 'planos_contas' && 'Novo Plano de Contas'}\n            {activeSubTab === 'centros_custo' && 'Novo Centro de Custo'}"
);
fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
