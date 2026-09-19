const fs = require('fs');
const file = 'src/components/finance/FinanceFluxoCaixa.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /\.\.\.\(clientesList \|\| \[\]\), \.\.\.\(\(clientesList \|\| \[\]\)\.filter\(\(c: any\) => c\.razaoSocial \|\| c\.cnpjCpf\)\)\.map\(\(c: any\) => \(\{ value: c\.id, label: c\.nome \}\)\)/g,
  "...(clientesList || []).map((c: any) => ({ value: c.id, label: c.nome })), ...(fornecedoresList || []).map((c: any) => ({ value: c.id, label: c.nomeFantasia || c.razaoSocial || c.nome }))"
);

fs.writeFileSync(file, code);
