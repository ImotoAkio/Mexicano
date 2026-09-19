const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/AdminFuelPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Unify the specific "cobrado" references
content = content.replace(/statusFilter === 'cobrado'/g, "statusFilter === 'pago'");
content = content.replace(/<option value="cobrado">✓ Cobrados \/ Pagos<\/option>/g, '<option value="pago">✓ Pagos</option>');
content = content.replace(/t\.status === 'pago' \|\| t\.status === 'cobrado'/g, "t.status === 'pago'");
content = content.replace(/cobradoRevenue/g, 'pagoRevenue');
content = content.replace(/cobradoRev /g, 'pagoRev ');
content = content.replace(/cobradoRev;/g, 'pagoRev;');
content = content.replace(/cobradoRev \+= /g, 'pagoRev += ');
content = content.replace(/let cobradoRev = 0;/g, 'let pagoRev = 0;');
content = content.replace(/const isCobrado /g, 'const isPago ');
content = content.replace(/!isCobrado/g, '!isPago');

// Refactor "litrosAbastecidos" -> logic checking for it should just look at abastecimentoLitros
content = content.replace(/r\.abastecimentoLitros \|\| r\.litrosAbastecidos/g, "r.abastecimentoLitros");
content = content.replace(/t\.litrosAbastecidos \|\| t\.reservationRef\?\.abastecimentoLitros/g, "t.reservationRef?.abastecimentoLitros");
content = content.replace(/t\.reservationRef\?\.litrosAbastecidos/g, "t.reservationRef?.abastecimentoLitros"); // Ensure no residual fallback
content = content.replace(/litrosAbastecidos: litros,/g, "abastecimentoLitros: litros,");
content = content.replace(/Number\(t\.litrosAbastecidos\)/g, "Number(t.reservationRef?.abastecimentoLitros || 0)");
content = content.replace(/t\.litrosAbastecidos \?/g, "t.reservationRef?.abastecimentoLitros ?");
content = content.replace(/t\.litrosAbastecidos/g, "t.reservationRef?.abastecimentoLitros");
content = content.replace(/baixaTransaction\.reservationRef\?\.abastecimentoLitros/g, "baixaTransaction.reservationRef?.abastecimentoLitros"); // fixing potential replacement overlap: it was replacing t.litros => t.reservationRef => baixaTransaction...

fs.writeFileSync(filePath, content, 'utf8');
