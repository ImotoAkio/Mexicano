const fs = require('fs');
const filepath = 'src/components/ClientDashboardPage.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const regex = /<span className="text-sm font-medium text-white truncate pr-2">\{t\.descricao \|\| t\.categoria\}<\/span>/g;
const replacement = `{(() => {
                        let desc = t.descricao || t.categoria || '';
                        
                        // Transform "Ref: 09/2026 (1/4)" or "Mensalidade | Ref: 09/2026 (1/4)" into something friendly
                        if (desc.toLowerCase().includes('ref:')) {
                           desc = desc
                             .replace(/\|?\s*Ref:\s*/i, ' - ')
                             .replace(/\((\d+)\/(\d+)\)/, ' (Parcela $1/$2)');
                             
                           const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                           desc = desc.replace(/(\d{2})\/(\d{4})/g, (match, m, y) => {
                             const monthName = months[parseInt(m) - 1];
                             return monthName ? \`\${monthName}/\${y}\` : match;
                           });
                        }
                        
                        return (
                          <span className="text-sm font-medium text-white truncate pr-2" title={desc}>{desc}</span>
                        );
                      })()}`;

if (!content.match(regex)) {
   console.log("Could not find string to replace");
} else {
   content = content.replace(regex, replacement);
   fs.writeFileSync(filepath, content);
   console.log("Patched successfully");
}
