const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

const tableRenderStr = `
            {activeSubTab === 'centros_custo' && (
              <div className="overflow-x-auto">
                {centrosCusto.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    Nenhum Centro de Custo cadastrado.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">Empresa</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {centrosCusto.map((centro) => (
                        <tr key={centro.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{centro.nome}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {centro.empresaId}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={\`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold \${
                              centro.status === 'ativo' ? 'bg-emerald-100/50 text-emerald-700' : 'bg-rose-100/50 text-rose-700'
                            }\`}>
                              {centro.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditCentro(centro)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete('centros_custo', centro.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
`;

code = code.replace(
  "{activeSubTab === 'fornecedores' && (",
  tableRenderStr + "\n            {activeSubTab === 'fornecedores' && ("
);

code = code.replace(
  "{activeSubTab === 'fornecedores' && (editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor')}",
  "{activeSubTab === 'centros_custo' && (editingCentro ? 'Editar Centro de Custo' : 'Novo Centro de Custo')}\n                {activeSubTab === 'fornecedores' && (editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor')}"
);

const formRenderStr = `
              {activeSubTab === 'centros_custo' && (
                <form id="form-centro" onSubmit={handleSaveCentro} className="space-y-4 text-xs font-semibold text-slate-700">
                  <div>
                    <label className="block mb-1.5">Nome do Centro de Custo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Comercial, Manutenção, Combustível, etc."
                      value={centroForm.nome || ''}
                      onChange={(e) => setCentroForm({ ...centroForm, nome: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5">Empresa *</label>
                      <select
                        required
                        value={centroForm.empresaId || 'Marina'}
                        onChange={(e) => setCentroForm({ ...centroForm, empresaId: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      >
                        <option value="Marina">Marina</option>
                        <option value="Pousada">Pousada</option>
                        <option value="Restaurante">Restaurante</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1.5">Status *</label>
                      <select
                        required
                        value={centroForm.status || 'ativo'}
                        onChange={(e) => setCentroForm({ ...centroForm, status: e.target.value as 'ativo'|'inativo' })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>
                  </div>
                </form>
              )}
`;

code = code.replace(
  "{activeSubTab === 'fornecedores' && (\n                <form id=\"form-fornecedor\"",
  formRenderStr + "\n              {activeSubTab === 'fornecedores' && (\n                <form id=\"form-fornecedor\""
);

// One more place: the form submit button in footer!
code = code.replace(
  /activeSubTab === 'contas_bancarias'[ \r\n]+(?:\s*\?\s*'form-conta'[ \r\n]+)?\s*:\s*activeSubTab === 'planos_contas'[ \r\n]+(?:\s*\?\s*'form-plano'[ \r\n]+)?/,
  "activeSubTab === 'contas_bancarias' ? 'form-conta' : activeSubTab === 'planos_contas' ? 'form-plano' : activeSubTab === 'centros_custo' ? 'form-centro' : "
);

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('UI blocks inserted');
