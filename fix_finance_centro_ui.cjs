const fs = require('fs');

let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

// 1. Fixing the Interface
code = code.replace(/interface CentroDeCusto \{[\s\S]*?\}/, `interface CentroDeCusto {
  id?: string;
  nome: string;
  empresa: string;
  status: 'ativo' | 'inativo';
}`);

// 2. Fixing the Initial State
code = code.replace(/const \[centroForm, setCentroForm\] = useState<Partial<CentroDeCusto>>\(\{[\s\S]*?\}\);/, `const [centroForm, setCentroForm] = useState<Partial<CentroDeCusto>>({
    nome: '',
    empresa: empresa && empresa !== 'Todos' ? empresa : 'Todos',
    status: 'ativo'
  });`);

// 3. Fixing the HandleOpenCreateModal state resetting
code = code.replace(/setCentroForm\(\{[\s\S]*?parentId: ''\s*\}\);/, `setCentroForm({
        nome: '',
        empresa: empresa && empresa !== 'Todos' ? empresa : 'Todos',
        status: 'ativo'
      });`);


// 4. Replacing the whole SubTab form/table logic
// Because the table may or may not exist, let's remove whatever exists for activeSubTab === 'centros_custo' and insert new clean UI.
// First, strip old one:
code = code.replace(/\{activeSubTab === 'centros_custo' && \([\s\S]*?\}\)\}\s*\{activeSubTab === 'fornecedores' && \(/, `{activeSubTab === 'fornecedores' && (`);

// Now, insert the new one right before activeSubTab === 'fornecedores'
const centrosJSX = `{activeSubTab === 'centros_custo' && (
              <div className="space-y-6">
                <form id="form-centro" onSubmit={handleSaveCentro} className="space-y-4 text-xs font-semibold text-slate-700 bg-white p-5 rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5">Nome do Centro de Custo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Lancha NX 290"
                        value={centroForm.nome || ''}
                        onChange={e => setCentroForm({...centroForm, nome: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex justify-end mt-4">
                     <button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition">
                       <Save className="w-4 h-4" /> Salvar Centro de Custo
                     </button>
                  </div>
                </form>

                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
                  {centrosCusto.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                      Nenhum centro de custo cadastrado.
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
                            <td className="px-6 py-4 font-bold text-slate-800">
                              {centro.nome}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {centro.empresa}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={\`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold \${
                                  centro.status === 'ativo'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }\`}
                              >
                                <div
                                  className={\`w-1.5 h-1.5 rounded-full \${
                                    centro.status === 'ativo' ? 'bg-emerald-500' : 'bg-slate-400'
                                  }\`}
                                />
                                {centro.status === 'ativo' ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditCentro(centro)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete('centros-custo', centro.id!)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB 3: FORNECEDORES */}
            {activeSubTab === 'fornecedores' && (`;

code = code.replace(/\{\/\* SUBTAB 3: FORNECEDORES \*\/\}\n\s*\{activeSubTab === 'fornecedores' && \(/, centrosJSX);
fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('FinanceConfig UI updated');