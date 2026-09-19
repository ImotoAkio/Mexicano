const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MarinaOperador/FuelRegistrationModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
/getFuelPrice\(paymentType\)\.toFixed\(2\)/g,
`getFuelPrice(paymentType || 'pix').toFixed(2)`
);

fs.writeFileSync(filePath, content, 'utf8');
