const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', 'utf8');

const replacement1 = `options={planosContas
                           .filter(p => !p.parentId && p.tipo === tipo)
                           .map(parent => {
                             const children = planosContas.filter(child => child.parentId === parent.id);
                             const label = parent.codigoContabil ? \`\${parent.codigoContabil} - \${parent.descricao}\` : parent.descricao;
                             if (children.length > 0) {
                               return {
                                 label,
                                 options: children.map(child => ({
                                   value: child.id,
                                   label: child.codigoContabil ? \`\${child.codigoContabil} - \${child.descricao}\` : child.descricao
                                 }))
                               };
                             }
                             return { value: parent.id, label };
                           })}`;

const target1Regex = /options=\{planosContas\s*\.filter\(p => !p\.parentId && p\.tipo === tipo\)\s*\.map\(parent => \(\{[\s\S]*?\}\)\)\s*\.filter\([\s\S]*?\)\}/;
code = code.replace(target1Regex, replacement1);

const replacement2 = `options={centrosCusto
                           .filter(c => !c.parentId && c.tipo === tipo && (c.empresa === 'Todos' || c.empresa === empresa))
                           .map(parent => {
                             const children = centrosCusto.filter(child => child.parentId === parent.id);
                             const label = parent.codigo ? \`\${parent.codigo} - \${parent.descricao}\` : parent.descricao;
                             if (children.length > 0) {
                               return {
                                 label,
                                 options: children.map(child => ({
                                   value: child.id,
                                   label: child.codigo ? \`\${child.codigo} - \${child.descricao}\` : child.descricao
                                 }))
                               };
                             }
                             return { value: parent.id, label };
                           })}`;

const target2Regex = /options=\{centrosCusto\s*\.filter\(c => !c\.parentId && c\.tipo === tipo && \(c\.empresa === 'Todos' \|\| c\.empresa === empresa\)\)\s*\.map\(parent => \(\{[\s\S]*?\}\)\)\s*\.filter\([\s\S]*?\)\}/;
code = code.replace(target2Regex, replacement2);

fs.writeFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', code);
