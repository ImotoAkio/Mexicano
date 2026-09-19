const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', 'utf8');

const regex = /value=\{centrosCusto\.find\(c => c\.id === centroCustoId\) \? \{[\s\S]*?\} : null\}/;
const replacement = `value={centrosCusto.find(c => c.id === centroCustoId) ? {
                            value: centroCustoId,
                            label: centrosCusto.find(c => c.id === centroCustoId)?.nome || ''
                         } : null}`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', code);
console.log('FinanceLancamentoDrawer value fixed');