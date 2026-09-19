const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MarinaOperador/ChecklistsTab.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/reserva\.abastecimentoLitros \|\| reserva\.litrosAbastecidos/g, "reserva.abastecimentoLitros");

fs.writeFileSync(filePath, content, 'utf8');
