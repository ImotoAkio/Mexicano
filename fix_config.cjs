const fs = require('fs');
const file = 'src/components/finance/FinanceCadastroConfigs.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  /const companies \= \['Todos', 'Marina', 'Vale Administradora', 'Mexicano'\];/g,
  "const companies = ['Todos', 'Marina Velho Chico', 'Vale Administradora', 'Mexicano'];"
);
fs.writeFileSync(file, code);
