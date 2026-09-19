const fs = require('fs');
const glob = require('glob'); // Note: we'll just code it manually so cross platform node script works

const files = [
  'src/components/finance/FinanceDashboardPage.tsx',
  'src/components/finance/FinanceLancamentos.tsx',
  'src/components/finance/FinanceParcelasFixas.tsx',
  'src/components/finance/FinanceRelatorios.tsx',
  'src/components/finance/ImportXMLModal.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // First, fix arrays ['Todos', 'Marina', 'Vale Administradora', 'Mexicano']
  content = content.replace(/'Marina'/g, "'Marina Velho Chico'");
  content = content.replace(/"Marina"/g, '"Marina Velho Chico"');
  content = content.replace(/>Marina</g, '>Marina Velho Chico<');
  fs.writeFileSync(file, content);
}
console.log('Fixed Marina to Marina Velho Chico');
