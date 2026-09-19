const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/AdminFuelPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/baixaTransaction\.litrosAbastecidos/g, "baixaTransaction.reservationRef?.abastecimentoLitros");
content = content.replace(/all, cobrado, pendente/g, "all, pago, pendente");

fs.writeFileSync(filePath, content, 'utf8');
