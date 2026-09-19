const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

const theadMatch = /<th className="px-6 py-4">Descrição<\/th>/;
code = code.replace(theadMatch, '<th className="px-6 py-4">Descrição</th>\n                        <th className="px-6 py-4">Centro Pai</th>');

const tbodyMatch = /<td className="px-6 py-4 text-slate-700 font-semibold">\{plano\.descricao\}<\/td>/;
code = code.replace(tbodyMatch, `<td className="px-6 py-4 text-slate-700 font-semibold">{plano.descricao}</td>
                          <td className="px-6 py-4">
                            {(() => {
                              const parent = planosContas.find(c => c.id === plano.parentId);
                              if (parent) return <span className="text-xs text-slate-500 font-medium">{parent.codigoContabil} - {parent.descricao}</span>;
                              return <span className="text-xs text-slate-400 font-medium">-</span>;
                            })()}
                          </td>`);

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('Plano list UI parent updated');
