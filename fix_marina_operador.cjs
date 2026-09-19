const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MarinaOperadorDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace handleFuelConfirm math
content = content.replace(
/const usingAdmin = .*;[\s\S]*?const finalStatusCobranca = .*;/,
`const finalStatusCobranca = fuelData.statusCobranca === 'pago' ? 'pago' : 'pendente';
    const isPendente = finalStatusCobranca === 'pendente';
    
    const finalPaymentType = (!isAvulso && isPendente) ? 'faturado' : (fuelData.paymentType || 'pix');
    const price = getFuelPrice(finalPaymentType);`
);

content = content.replace(
/if \(fuelData.liters > 0 && finalStatusCobranca === 'cobrado'\) \{/g,
`if (fuelData.liters > 0 && finalStatusCobranca === 'pago') {`
);

content = content.replace(
/categoria: 'Combustível',/g,
`categoria: 'combustivel',`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed MarinaOperadorDashboard.tsx');
