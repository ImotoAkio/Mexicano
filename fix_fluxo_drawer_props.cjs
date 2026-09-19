const fs = require('fs');
const file = 'src/components/finance/FinanceFluxoCaixa.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /clientes=\{clientesList\.filter\(\(c: any\) => !c\.razaoSocial\)\}/g,
  'clientes={clientesList}'
);
code = code.replace(
  /fornecedores=\{clientesList\.filter\(\(c: any\) => c\.razaoSocial \|\| c\.cnpjCpf\)\}/g,
  'fornecedores={fornecedoresList}'
);

fs.writeFileSync(file, code);
