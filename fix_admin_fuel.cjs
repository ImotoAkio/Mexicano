const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/AdminFuelPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace manual pricing in handleConfirmBaixa
content = content.replace(
/let pricePerLiter = 9;[\s\n]*if \(baixaPaymentType === 'cartao_credito'\) pricePerLiter = 10;[\s\n]*if \(baixaPaymentType === 'faturado'\) pricePerLiter = 13;/g,
`const pricePerLiter = getFuelPrice(baixaPaymentType);`
);

// Replace manual pricing in handleSaveFuelTransaction
content = content.replace(
/let pricePerLiter = 9;[\s\n]*if \(paymentType === 'cartao_credito'\) pricePerLiter = 10;[\s\n]*if \(paymentType === 'faturado'\) pricePerLiter = 13;/g,
`const pricePerLiter = getFuelPrice(paymentType);`
);

// Replace payment option IDs
content = content.replace(
/\{ id: 'credit', label: 'Crédito', price: 'R\$ 10,00\/L', icon: CreditCard \},[\s\n]*\{ id: 'debit', label: 'Débito', price: 'R\$ 9,00\/L', icon: CreditCard \},[\s\n]*\{ id: 'dinheiro', label: 'Dinheiro', price: 'R\$ 9,00\/L', icon: Banknote \},[\s\n]*\{ id: 'admin', label: 'Administradora', price: 'R\$ 13,00\/L', icon: Building2 \},/g,
`{ id: 'cartao_credito', label: 'Crédito', price: \`R$ \${getFuelPrice('cartao_credito').toFixed(2)}/L\`, icon: CreditCard },
                    { id: 'cartao_debito', label: 'Débito', price: \`R$ \${getFuelPrice('cartao_debito').toFixed(2)}/L\`, icon: CreditCard },
                    { id: 'dinheiro', label: 'Dinheiro', price: \`R$ \${getFuelPrice('dinheiro').toFixed(2)}/L\`, icon: Banknote },
                    { id: 'faturado', label: 'Administradora', price: \`R$ \${getFuelPrice('faturado').toFixed(2)}/L\`, icon: Building2 },`
);

content = content.replace(
/\{ id: 'pix', label: 'PIX', price: 'R\$ 9,00\/L', icon: QrCode \},/g,
`{ id: 'pix', label: 'PIX', price: \`R$ \${getFuelPrice('pix').toFixed(2)}/L\`, icon: QrCode },`
);

// Replace UI calculation
content = content.replace(
/\{(\(\(Number\(baixaTransaction\.litrosAbastecidos \|\| 0\) \|\| 1\) \* \(baixaPaymentType === 'cartao_credito' \? 10 : baixaPaymentType === 'faturado' \? 13 : 9\)\)\.toFixed\(2\)\.replace\('\.', ','\))\}/g,
`{((Number(baixaTransaction.litrosAbastecidos || 0) || 1) * getFuelPrice(baixaPaymentType)).toFixed(2).replace('.', ',')}`
);

// Update handleSendToAdmin
content = content.replace(
/metodoPagamento: 'admin',/g,
`metodoPagamento: 'faturado',`
);

content = content.replace(
/abastecimentoStatusCobranca: 'cobrado'/g,
`abastecimentoStatusCobranca: 'pago'`
);

content = content.replace(
/abastecimentoFormaPagamento: 'admin'/g,
`abastecimentoFormaPagamento: 'faturado'`
);

content = content.replace(
/const pricePerLiter = 13\.0;/g,
`const pricePerLiter = getFuelPrice('faturado');`
);

// Fix paymentFilter label replacement
content = content.replace(
/paymentFilter === 'admin'/g,
`paymentFilter === 'faturado'`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed AdminFuelPage.tsx');
