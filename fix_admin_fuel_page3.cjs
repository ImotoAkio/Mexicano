const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/AdminFuelPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/cobradoRev/g, "pagoRev");
content = content.replace(/status cobrado/g, "status pago");

fs.writeFileSync(filePath, content, 'utf8');
