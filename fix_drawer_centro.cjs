const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', 'utf8');

const regex = /options=\{centrosCusto[\s\S]*?\}\)/;
const replacement = `options={centrosCusto
                           .filter(c => c.status === 'ativo' && (c.empresa === 'Todos' || c.empresa === empresa))
                           .map(c => ({ value: c.id, label: c.nome }))
                         }`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', code);
console.log('FinanceLancamentoDrawer updated');