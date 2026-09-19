const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

const listMatcher = /{activeSubTab === 'centros' && \(\s*<div className="min-w-\[800px\]">([\s\S]*?)<\/div>\s*\)}/g;

code = code.replace(
listMatcher,
`{activeSubTab === 'centros' && (
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-12 gap-4 px-8 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider border-b border-[#d2d2d7]/30 sticky top-0 bg-[#f5f5f7]/95 backdrop-blur-md z-10">
                      <div className="col-span-2">Código</div>
                      <div className="col-span-4">Descrição</div>
                      <div className="col-span-2 text-center">Tipo</div>
                      <div className="col-span-2 text-center">Empresa</div>
                      <div className="col-span-1 text-center">Status</div>
                      <div className="col-span-1 text-center">Ações</div>
                    </div>
                    {centrosCusto.map(centro => (
                      <div key={centro.id} className="grid grid-cols-12 gap-4 px-8 py-4 items-center border-b border-[#d2d2d7]/30 hover:bg-[#f5f5f7] transition-colors group">
                        <div className="col-span-2 text-[14px] font-medium text-[#1d1d1f] truncate">
                          {centro.codigo}
                        </div>
                        <div className="col-span-4 text-[14px] text-[#1d1d1f] font-medium flex items-center gap-2 truncate">
                          <Layers className="w-4 h-4 text-[#86868b] shrink-0" />
                          <span className="truncate">{centro.descricao}</span>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <span className={\`px-2.5 py-1 rounded-full text-[12px] font-medium \${centro.tipo === 'receita' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}\`}>
                            {centro.tipo === 'receita' ? 'Receita' : 'Despesa'}
                          </span>
                        </div>
                        <div className="col-span-2 text-[14px] text-[#1d1d1f] text-center truncate">
                          {centro.empresa}
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <span className={\`w-2 h-2 rounded-full \${centro.status === 'ativo' ? 'bg-[#34c759]' : 'bg-[#ff3b30]'}\`} title={centro.status} />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <RowActions
                            onEdit={() => { setEditingCentro(centro); setCentroForm(centro); setIsDrawerOpen(true); }}
                            onDelete={() => handleDelete('centros-custo', centro.id)}
                          />
                        </div>
                      </div>
                    ))}
                    {centrosCusto.length === 0 && (
                      <div className="py-20 text-center text-[#86868b]">Nenhum centro de custo cadastrado.</div>
                    )}
                  </div>
                )}`
);

let formStr = `{activeSubTab === 'centros' && (
                  <form id="drawer-form" onSubmit={(e) => handleSave(e, 'centros-custo', { ...(editingCentro?.id ? {id: editingCentro.id} : {}), ...centroForm })} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 uppercase tracking-wider">Código *</label>
                        <input type="text" required placeholder="1.01" value={centroForm.codigo||''} onChange={e => setCentroForm({...centroForm, codigo: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f7] border-none rounded-xl text-[15px] focus:ring-2 focus:ring-[#0071e3]/30 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 uppercase tracking-wider">Tipo *</label>
                        <select value={centroForm.tipo||'despesa'} onChange={e => setCentroForm({...centroForm, tipo: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f7] border-none rounded-xl text-[15px] focus:ring-2 focus:ring-[#0071e3]/30 outline-none">
                          <option value="despesa">Despesa</option><option value="receita">Receita</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 uppercase tracking-wider">Descrição *</label>
                      <input type="text" required placeholder="Ex: Manutenção de Barcos" value={centroForm.descricao||''} onChange={e => setCentroForm({...centroForm, descricao: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f7] border-none rounded-xl text-[15px] focus:ring-2 focus:ring-[#0071e3]/30 outline-none" />
                    </div>

                    {/* Parent selection */}
                    <div>
                      <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 uppercase tracking-wider">Centro de Custo Pai</label>
                      <select value={centroForm.parentId||''} onChange={e => setCentroForm({...centroForm, parentId: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f7] border-none rounded-xl text-[15px] focus:ring-2 focus:ring-[#0071e3]/30 outline-none">
                        <option value="">Nenhum (Raiz)</option>
                        {centrosCusto
                          .filter(c => c.id !== editingCentro?.id && c.tipo === (centroForm.tipo || 'despesa') && (c.empresa === centroForm.empresa || c.empresa === 'Todos' || centroForm.empresa === 'Todos'))
                          .map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.descricao}</option>)
                        }
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {isFinanceiro ? (
                        <div className="opacity-50 pointer-events-none">
                          <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 uppercase tracking-wider">Empresa</label>
                          <input type="text" value={empresa} disabled className="w-full px-4 py-3 bg-[#f5f5f7] border-none rounded-xl text-[15px]" />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 uppercase tracking-wider">Empresa</label>
                          <select value={centroForm.empresa||'Todos'} onChange={e => setCentroForm({...centroForm, empresa: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f7] border-none rounded-xl text-[15px] focus:ring-2 focus:ring-[#0071e3]/30 outline-none">
                            <option value="Todos">Todas as Empresas</option>
                            <option value="Marina">Marina</option>
                            <option value="Vale Administradora">Vale Administradora</option>
                            <option value="Mexicano">Mexicano</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 uppercase tracking-wider">Status</label>
                        <select value={centroForm.status||'ativo'} onChange={e => setCentroForm({...centroForm, status: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f7] border-none rounded-xl text-[15px] focus:ring-2 focus:ring-[#0071e3]/30 outline-none">
                          <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
                        </select>
                      </div>
                    </div>
                  </form>
                )}`;

const formMatcher = /{activeSubTab === 'centros' && \([\s\S]*?<form id="drawer-form" onSubmit={\(e\) => handleSave\(e, 'centros-custo', { \.\.\.\(editingCentro\?\.id \? {id: editingCentro\.id} : {}\), \.\.\.centroForm }\)} className="space-y-5">[\s\S]*?<\/form>\s*\)}/;
code = code.replace(formMatcher, formStr);

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
