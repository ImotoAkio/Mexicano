const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server-db.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/reserva\.abastecimentoLitros \|\| reserva\.litrosAbastecidos \|\| null/g, "reserva.abastecimentoLitros || null");

fs.writeFileSync(filePath, content, 'utf8');
