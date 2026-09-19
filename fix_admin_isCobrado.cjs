const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/AdminFuelPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\bisCobrado\b/g, "isPago");

fs.writeFileSync(filePath, content, 'utf8');
