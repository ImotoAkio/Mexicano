const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MarinaFuelView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/ \|\| t\.status === 'cobrado'/g, "");
content = content.replace(/ \|\| t\.reservationRef\?\.litrosAbastecidos/g, "");
content = content.replace(/t\.litrosAbastecidos \|\| /g, "");

content = content.replace(/abastecimentoStatusCobranca: 'cobrado'/g, "abastecimentoStatusCobranca: 'pago'");

fs.writeFileSync(filePath, content, 'utf8');
