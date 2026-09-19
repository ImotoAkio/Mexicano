const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MarinaOperadorDashboard.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Fix category to 'Combustível'
code = code.replace(/categoria: 'Abastecimento Marina'/g, "categoria: 'Combustível'");

// Fix standalone transacao blocks
const oldBlock = `          const transacao = {
              id: existingId || \`trans_standalone_fuel_$\{Date.now()}\`,
              tipo: 'receita',
              categoria: 'Combustível',
              valor: fuelData.liters * price,
              dataVencimento: new Date().toISOString().split('T')[0],
              dataPagamento: isPaid ? new Date().toISOString().split('T')[0] : null,
              status: isPaid ? 'pago' : 'lancado',
              metodoPagamento: fuelData.paymentType,
              descricao: \`Abastecimento Standalone: \${fuelData.liters}L a R$\${price.toFixed(2)}/L - \${targetName}\`,
              clienteId: client ? client.id : (boat ? boat.clienteId : 'cliente_avulso'),
              embarcacaoId: boat ? boat.id : 'embarcacao_avulsa',
              operador: currentUser.nome,
              comprovanteUrl: fuelData.comprovanteUrl || null,
              createdAt: new Date().toISOString(),
              metadata: { litros: fuelData.liters }
          };`;

const newBlock = `          const transacao = {
              id: existingId || \`trans_standalone_fuel_$\{Date.now()}\`,
              tipo: 'receita',
              categoria: 'Combustível',
              valor: fuelData.liters * price,
              dataVencimento: new Date().toISOString().split('T')[0],
              dataPagamento: isPaid ? new Date().toISOString().split('T')[0] : null,
              status: isPaid ? 'pago' : (finalStatusCobranca === 'pendente' ? 'pendente' : 'lancado'),
              metodoPagamento: finalPaymentType || null,
              descricao: \`Abastecimento Standalone: \${fuelData.liters}L a R$\${price.toFixed(2)}/L - \${targetName}\`,
              clienteId: client ? client.id : (boat ? boat.clienteId : 'cliente_avulso'),
              embarcacaoId: boat ? boat.id : 'embarcacao_avulsa',
              operador: currentUser.nome,
              comprovanteUrl: fuelData.comprovanteUrl || null,
              createdAt: new Date().toISOString(),
              metadata: { litros: fuelData.liters }
          };`;

code = code.replace(oldBlock, newBlock);

fs.writeFileSync(filePath, code);
console.log('Fixed operador again');
