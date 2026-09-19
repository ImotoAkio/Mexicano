const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MarinaFuelView.tsx');
let code = fs.readFileSync(filePath, 'utf8');

const regexStatus = /status: statusCobranca === 'pendente' \? 'pendente' : 'pago',/;
const replaceStatus = `status: statusCobranca === 'pendente' ? 'pendente' : 'pago',`;

const regexPayment = /metodoPagamento: statusCobranca === 'pendente' \? null : paymentType,/;
const replacePayment = `metodoPagamento: usingAdmin ? 'admin' : (statusCobranca === 'pendente' ? null : paymentType),`;

code = code.replace(regexPayment, replacePayment);

fs.writeFileSync(filePath, code);
