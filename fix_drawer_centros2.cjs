const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', 'utf8');

const target = `options={centrosCusto
                           .filter(c => c.tipo === tipo && (c.empresa === 'Todos' || c.empresa === empresa))
                           .map(c => ({ value: c.id, label: c.codigo ? \`\${c.codigo} - \${c.descricao}\` : c.descricao }))}`;
                           
const replacement = `options={centrosCusto
                           .filter(c => !c.parentId && c.tipo === tipo && (c.empresa === 'Todos' || c.empresa === empresa))
                           .map(parent => ({
                             label: parent.codigo ? \`\${parent.codigo} - \${parent.descricao}\` : parent.descricao,
                             options: centrosCusto
                               .filter(child => child.parentId === parent.id)
                               .map(child => ({
                                 value: child.id,
                                 label: child.codigo ? \`\${child.codigo} - \${child.descricao}\` : child.descricao
                               }))
                           }))
                           .filter(group => group.options.length > 0 || centrosCusto.some(c => !c.parentId && c.tipo === tipo && (c.empresa === 'Todos' || c.empresa === empresa)))}`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', code);
