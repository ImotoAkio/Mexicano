const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MarinaOperadorDashboard.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/status: isPaid \? 'pago' : 'lancado',/g, "status: isPaid ? 'pago' : (finalStatusCobranca === 'pendente' ? 'pendente' : 'lancado'),");
code = code.replace(/metodoPagamento: fuelData\.paymentType,/g, "metodoPagamento: finalPaymentType || null,");
code = code.replace(/categoria: 'Abastecimento Marina',/g, "categoria: 'Combustível',");

fs.writeFileSync(filePath, code);
