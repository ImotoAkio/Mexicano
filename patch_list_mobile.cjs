const fs = require('fs');
const content = fs.readFileSync('src/components/pecas/MaintenanceListView.tsx', 'utf8');

const searchMobileRender = `                  <p className="text-sm font-extrabold text-slate-800 leading-tight">
                    {m.tituloChamado || m.descricaoServico || 'Ordem de Serviço s/ Título'}
                  </p>
                  <span className="text-[10px] bg-[#186b77]/10 text-[#186b77] font-semibold px-2 py-0.5 rounded uppercase mt-1 inline-block">
                    {catMap[m.categoria || 'preventiva']}
                  </span>`;

const replaceMobileRender = `                  <p className="text-sm font-extrabold text-slate-800 leading-tight">
                    {m.tituloChamado || m.descricaoServico || 'Ordem de Serviço s/ Título'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-[10px] bg-[#186b77]/10 text-[#186b77] font-semibold px-2 py-0.5 rounded uppercase inline-block">
                      {catMap[m.categoria || 'preventiva']}
                    </span>
                    {/* Badge Faturamento */}
                    {m.status === 'concluido' && (
                      <span className={\`text-[10px] font-semibold px-2 py-0.5 rounded uppercase inline-block flex items-center gap-1 w-fit \${
                        m.gerarFinanceiro && (m.valorRepassado || m.custo || m.orcamento) 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-500'}\`}
                      >
                        {m.gerarFinanceiro && (m.valorRepassado || m.custo || m.orcamento) ? (
                          <><DollarSign className="w-3 h-3" /> Faturado</>
                        ) : (
                          <><CheckCircle className="w-3 h-3" /> Cortesia</>
                        )}
                      </span>
                    )}
                  </div>`;

const newContent = content.replace(searchMobileRender, replaceMobileRender);
fs.writeFileSync('src/components/pecas/MaintenanceListView.tsx', newContent);
