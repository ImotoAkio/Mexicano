const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MarinaOperadorDashboard.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. the handle definition
code = code.replace(
  /const handleFuelConfirm = async \(fuelData: any\) => \{[\s\n]*const price = getFuelPrice\(fuelData\.paymentType\);/g,
  `const handleFuelConfirm = async (fuelData: any) => {
    const isAvulso = fuelTargetMode === 'avulso';
    const isPendente = fuelData.statusCobranca === 'pendente';
    const usingAdmin = (fuelData.paymentType === 'admin' || isPendente) && !isAvulso;
    
    // Regra inteligente (Financeiro): se a embarcação não paga na hora (pendente), vai para a administradora (13/L).
    const price = usingAdmin ? 13.0 : getFuelPrice(fuelData.paymentType);
    const finalPaymentType = usingAdmin ? 'admin' : fuelData.paymentType;
    const finalStatusCobranca = usingAdmin ? 'cobrado' : fuelData.statusCobranca;`
);

// 2. updatedReserva block
code = code.replace(
  /abastecimentoFormaPagamento: fuelData\.statusCobranca === 'pendente' \? null : fuelData\.paymentType,/g,
  `abastecimentoFormaPagamento: finalPaymentType || null,`
);

code = code.replace(
  /abastecimentoStatusCobranca: fuelData\.statusCobranca,/g,
  `abastecimentoStatusCobranca: finalStatusCobranca,`
);

// 3. transacao fuel_data.statusCobranca === 'cobrado' (inside if fuelData.liters > 0)
code = code.replace(
  /if \(fuelData\.liters > 0 && fuelData\.statusCobranca === 'cobrado'\)/g,
  `if (fuelData.liters > 0 && finalStatusCobranca === 'cobrado')`
);

code = code.replace(
  /metodoPagamento: fuelData\.statusCobranca === 'pendente' \? null : fuelData\.paymentType,/gi,
  `metodoPagamento: finalPaymentType || null,`
);

// 4. Standalone transacao
code = code.replace(
  /const isPaid = fuelData\.statusCobranca === 'cobrado';/g,
  `const isPaid = finalStatusCobranca === 'cobrado';`
);

// 5. final standalone status update
code = code.replace(
  /status: fuelData\.statusCobranca === 'pendente' \? 'pendente' : 'pago',/g,
  `status: finalStatusCobranca === 'pendente' ? 'pendente' : 'pago',`
);

fs.writeFileSync(filePath, code);
console.log('Fixed properly');
