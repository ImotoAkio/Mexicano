const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    if(!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for(const {regex, replacement} of replacements) {
        content = content.replace(regex, replacement);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
}

replaceInFile(path.join(__dirname, 'src/components/MarinaOperador/FuelRegistrationModal.tsx'), [
    {
        regex: /paymentType: 'debit' \| 'credit' \| 'pix' \| 'dinheiro';/g,
        replacement: `paymentType: 'cartao_debito' | 'cartao_credito' | 'faturado' | 'pix' | 'dinheiro';`
    },
    {
        regex: /const price = getFuelPrice\(paymentType\);/g,
        replacement: `const finalPaymentType = (!isAvulso && statusCobranca === 'pendente') ? 'faturado' : (paymentType || 'pix');
    const price = getFuelPrice(finalPaymentType);` // Will fix up the other if it exists
    },
    {
        regex: /<option value="debit">Débito \(R\$ 10,00\)/g,
        replacement: `<option value="cartao_debito">Débito (R$ 10,00)`
    },
    {
        regex: /<option value="credit">Crédito \(R\$ 10,00\)/g,
        replacement: `<option value="cartao_credito">Crédito (R$ 10,00)`
    }
]);

replaceInFile(path.join(__dirname, 'src/components/MarinaOperador/FuelRecordsTab.tsx'), [
    {
        regex: /abastecimentoStatusCobranca === 'cobrado'/g,
        replacement: `abastecimentoStatusCobranca === 'pago'`
    },
    {
        regex: /abastecimentoStatusCobranca === 'pendente'/g,
        replacement: `abastecimentoStatusCobranca === 'pendente'`
    }
]);
