const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', 'utf8');

code = code.replace(
/options={centrosCusto[\s\S]*?\.map\(c => \(\{ value: c\.id, label: c\.nome \}\)\)}/,
`options={centrosCusto
                           .filter(c => c.tipo === tipo && (c.empresa === 'Todos' || c.empresa === empresa))
                           .map(c => ({ value: c.id, label: c.codigo ? \`\${c.codigo} - \${c.descricao}\` : c.descricao }))}`
);

code = code.replace(
/label: centrosCusto\.find\(c => c\.id === centroCustoId\)\?\.nome/g,
`label: (() => { const found = centrosCusto.find(c => c.id === centroCustoId); return found ? (found.codigo ? \`\${found.codigo} - \${found.descricao}\` : found.descricao) : ''; })()`
);

fs.writeFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', code);
