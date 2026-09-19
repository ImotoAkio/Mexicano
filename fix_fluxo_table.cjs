const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceFluxoCaixa.tsx', 'utf8');

// Header
code = code.replace(
  />Categoria<\/th>/,
  ">Classificação</th>"
);

// Cell
const oldCell = `                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 bg-[#f5f5f7] rounded-lg text-[12px] font-medium text-[#86868b]">
                            {t.categoria || 'Sem categoria'}
                          </span>
                        </td>`;

const newCell = `                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {t.planoContasId && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-[#f5f5f7] rounded text-[11px] font-medium text-[#86868b] w-fit">
                                P: {mapPlanos[t.planoContasId] || 'Desconhecido'}
                              </span>
                            )}
                            {t.centroCustoId && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-[#f5f5f7] rounded text-[11px] font-medium text-[#86868b] w-fit">
                                C: {mapCentros[t.centroCustoId] || 'Desconhecido'}
                              </span>
                            )}
                            {(!t.planoContasId && !t.centroCustoId && t.categoria) && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-[#f5f5f7] rounded text-[11px] font-medium text-[#86868b] w-fit">
                                {t.categoria}
                              </span>
                            )}
                            {(!t.planoContasId && !t.centroCustoId && !t.categoria) && (
                              <span className="text-[11px] text-[#d2d2d7] italic">Não classificado</span>
                            )}
                          </div>
                        </td>`;

code = code.replace(oldCell, newCell);

fs.writeFileSync('src/components/finance/FinanceFluxoCaixa.tsx', code);
console.log('Classificacao cell updated');
