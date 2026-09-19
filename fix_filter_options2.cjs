const fs = require('fs');
const file = 'src/components/finance/FinanceFluxoCaixa.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /label: \!clienteFilter \|\| clienteFilter === 'todos' \? 'Todos Clientes\/Fornecedores' : \(clientesList \|\| \[\]\).find\(\(c: any\) => c\.id === clienteFilter\)\?\.nome \|\| 'Desconhecido'/g,
  "label: !clienteFilter || clienteFilter === 'todos' ? 'Todos Clientes/Fornecedores' : ((clientesList || []).find((c: any) => c.id === clienteFilter)?.nome || (fornecedoresList || []).find((c: any) => c.id === clienteFilter)?.nomeFantasia || 'Desconhecido')"
);

fs.writeFileSync(file, code);
