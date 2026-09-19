const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MarinaOperadorDashboard.tsx');
let code = fs.readFileSync(filePath, 'utf8');

const oldHandle = `  const handleFuelConfirm = async (fuelData: any) => {
    const price = getFuelPrice(fuelData.paymentType);`;

const newHandle = `  const handleFuelConfirm = async (fuelData: any) => {
    const isAvulso = fuelTargetMode === 'avulso';
    const isPendente = fuelData.statusCobranca === 'pendente';
    const usingAdmin = (fuelData.paymentType === 'admin' || isPendente) && !isAvulso;
    
    // Regra inteligente (Financeiro): se a embarcação não paga na hora (pendente), 
    // vai para a administradora e o preço do litro é R$ 13.00.
    const price = usingAdmin ? 13.0 : getFuelPrice(fuelData.paymentType);
    
    // Se for 'usingAdmin', o status real vira faturado pra admin
    const finalPaymentType = usingAdmin ? 'admin' : fuelData.paymentType;
    const finalStatusCobranca = usingAdmin ? 'cobrado' : fuelData.statusCobranca;
`;

code = code.replace(oldHandle, newHandle);

// Replace the updatedReserva logic
const oldReserva = `          abastecimentoFormaPagamento: fuelData.statusCobranca === 'pendente' ? null : fuelData.paymentType,
          abastecimentoStatusCobranca: fuelData.statusCobranca,
          abastecimentoValorTotal: (fuelData.liters * price).toString(),`;

const newReserva = `          abastecimentoFormaPagamento: finalPaymentType || null,
          abastecimentoStatusCobranca: finalStatusCobranca,
          abastecimentoValorTotal: (fuelData.liters * price).toString(),`;

code = code.replace(oldReserva, newReserva);

// Replace transacao fuel_data.statusCobranca === 'pendente' ? null : fuelData.paymentType
const oldTransacao1 = `              metodoPagamento: fuelData.statusCobranca === 'pendente' ? null : fuelData.paymentType,`;
const newTransacao1 = `              metodoPagamento: finalPaymentType || null,`;
code = code.replace(oldTransacao1, newTransacao1);

const oldTransacao1b = `        if (fuelData.liters > 0 && fuelData.statusCobranca === 'cobrado') {`;
const newTransacao1b = `        if (fuelData.liters > 0 && finalStatusCobranca === 'cobrado') {`;
code = code.replace(oldTransacao1b, newTransacao1b);

// Replace standalone fuelData.statusCobranca === 'cobrado'
const oldTransStandalone1 = `        const isPaid = fuelData.statusCobranca === 'cobrado';`;
const newTransStandalone1 = `        const isPaid = finalStatusCobranca === 'cobrado';`;
code = code.replace(oldTransStandalone1, newTransStandalone1);

// Transacao standalone statuses
const oldTransStandalone2 = `              status: fuelData.statusCobranca === 'pendente' ? 'pendente' : 'pago',
              metodoPagamento: fuelData.statusCobranca === 'pendente' ? null : fuelData.paymentType,`;
const newTransStandalone2 = `              status: finalStatusCobranca === 'pendente' ? 'pendente' : 'pago',
              metodoPagamento: finalPaymentType || null,`;
code = code.replace(oldTransStandalone2, newTransStandalone2);

fs.writeFileSync(filePath, code);
console.log('Fixed MarinaOperadorDashboard.tsx');
