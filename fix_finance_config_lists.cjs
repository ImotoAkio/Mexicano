const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

const listRegex = /\{activeSubTab === 'planos_contas' && \([\s\S]*?Nenhum plano de contas cadastrado[\s\S]*?<\/table>\s*<\/div>\s*\)\}/;

const centroList = `{activeSubTab === 'centros_custo' && (
              <div className="overflow-x-auto">
                {centrosCusto.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    Nenhum centro de custo cadastrado.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="py-4 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Código</th>
                        <th className="py-4 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Descrição</th>
                        <th className="py-4 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Centro Pai</th>
                        <th className="py-4 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Tipo</th>
                        <th className="py-4 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Empresa</th>
                        <th className="py-4 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                        <th className="py-4 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {centrosCusto.map(centro => {
                        const parent = centrosCusto.find(c => c.id === centro.parentId);
                        return (
                          <tr key={centro.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-3.5 px-5">
                              <span className="font-semibold text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded-md">{centro.codigo}</span>
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-slate-400" />
                                <span className="font-semibold text-xs text-slate-700">{centro.descricao}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-5">
                              {parent ? (
                                <span className="text-xs text-slate-500 font-medium">{parent.codigo} - {parent.descricao}</span>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              <span className={\`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider \${
                                centro.tipo === 'receita'
                                  ? 'bg-emerald-100/50 text-emerald-600'
                                  : 'bg-rose-100/50 text-rose-600'
                              }\`}>
                                {centro.tipo === 'receita' ? 'Receita' : 'Despesa'}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-center font-medium text-xs text-slate-600">
                              {centro.empresa}
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="flex justify-center">
                                <span className={\`w-2 h-2 rounded-full \${centro.status === 'ativo' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}\`} title={centro.status} />
                              </div>
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCentro(centro)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete('centros-custo', centro.id!)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}`;

code = code.replace(listRegex, (match) => match + '\n\n' + centroList);


const formRegex = /\{activeSubTab === 'planos_contas' && \([\s\S]*?<form id="form-plano"[\s\S]*?<\/form>\s*\)\}/;
const centroFormUi = `{activeSubTab === 'centros_custo' && (
                <form id="form-centro" onSubmit={handleSaveCentro} className="space-y-4 text-xs font-semibold text-slate-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5">Código *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 1.01"
                        value={centroForm.codigo || ''}
                        onChange={e => setCentroForm({...centroForm, codigo: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5">Tipo *</label>
                      <select
                        required
                        value={centroForm.tipo || 'despesa'}
                        onChange={e => setCentroForm({...centroForm, tipo: e.target.value as any})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                      >
                        <option value="despesa">Despesa</option>
                        <option value="receita">Receita</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1.5">Descrição *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Manutenção de Barcos"
                      value={centroForm.descricao || ''}
                      onChange={e => setCentroForm({...centroForm, descricao: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5">Centro de Custo Pai</label>
                    <select
                      value={centroForm.parentId || ''}
                      onChange={e => setCentroForm({...centroForm, parentId: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                    >
                      <option value="">Nenhum (Raiz)</option>
                      {centrosCusto
                        .filter(c => c.id !== editingCentro?.id && c.tipo === (centroForm.tipo || 'despesa') && (c.empresa === centroForm.empresa || c.empresa === 'Todos' || centroForm.empresa === 'Todos'))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.codigo} - {c.descricao}</option>
                        ))
                      }
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {isFinanceiro ? (
                      <div className="opacity-50 pointer-events-none">
                        <label className="block mb-1.5">Empresa</label>
                        <input
                          type="text"
                          value={empresa}
                          disabled
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block mb-1.5">Empresa *</label>
                        <select
                          required
                          value={centroForm.empresa || 'Todos'}
                          onChange={e => setCentroForm({...centroForm, empresa: e.target.value})}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                        >
                          <option value="Todos">Todas as Empresas</option>
                          <option value="Marina">Marina</option>
                          <option value="Vale Administradora">Vale Administradora</option>
                          <option value="Mexicano">Mexicano</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block mb-1.5">Status *</label>
                      <select
                        required
                        value={centroForm.status || 'ativo'}
                        onChange={e => setCentroForm({...centroForm, status: e.target.value as any})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>
                  </div>
                </form>
              )}`;

code = code.replace(formRegex, (match) => match + '\n\n' + centroFormUi);
code = code.replace('const handleOpenEditPlano', 'const handleOpenEditCentro = (centro: CentroDeCusto) => {\n    setEditingCentro(centro);\n    setCentroForm({ ...centro });\n    setIsModalOpen(true);\n  };\n\n  const handleOpenEditPlano');

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('Lists and UI added');
