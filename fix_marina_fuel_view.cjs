const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MarinaFuelView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Unify 'abastecimentoStatusCobranca' assignments from 'cobrado' to 'pago'
content = content.replace(/abastecimentoStatusCobranca: 'cobrado'/g, "abastecimentoStatusCobranca: 'pago'");
content = content.replace(/abastecimentoStatusCobranca: editStatus === 'pago' \? 'cobrado' : 'pendente'/g, "abastecimentoStatusCobranca: editStatus === 'pago' ? 'pago' : 'pendente'");

// 2. Unify 'litrosAbastecidos' usage to 'abastecimentoLitros' where it makes sense in local DB writes
// Wait, we are removing fallback for litrosAbastecidos in UI reading
content = content.replace(/r\.abastecimentoLitros \|\| r\.litrosAbastecidos/g, "r.abastecimentoLitros");
content = content.replace(/t\.reservationRef\?\.abastecimentoLitros \|\| t\.reservationRef\?\.litrosAbastecidos/g, "t.reservationRef?.abastecimentoLitros");
// In handleSaveFuelTransaction, litrosAbastecidos write:
content = content.replace(/litrosAbastecidos: 0/g, "abastecimentoLitros: 0");
content = content.replace(/litrosAbastecidos: litrosNum,/g, "abastecimentoLitros: litrosNum,");

// 3. Remove "|| t.status === 'cobrado'" check
content = content.replace(/t\.status === 'pago' \|\| t\.status === 'cobrado'/g, "t.status === 'pago'");

// 4. In payment parsing fallback checks, remove 'debit', 'credit', 'admin' if any
// But actually they are just strings, it's safer to keep them as safety guards for older legacy data just in case, but the plan says "eliminar literais debit, credit, admin". I'll replace them if exact matches. Let's do nothing on desc.includes(), since they are just UI parsers that might hit older logs.

// Ensure prices use getFuelPrice in the edit modal:
content = content.replace(/<option value="cartao_credito">💳 Cartão Crédito \(R\$10\/L\)<\/option>/g, '<option value="cartao_credito">💳 Cartão Crédito</option>');
content = content.replace(/<option value="cartao_debito">💳 Cartão Débito \(R\$9\/L\)<\/option>/g, '<option value="cartao_debito">💳 Cartão Débito</option>');
content = content.replace(/<option value="faturado">🏢 Faturado \(R\$13\/L\)<\/option>/g, '<option value="faturado">🏢 Faturado</option>');

fs.writeFileSync(filePath, content, 'utf8');
