const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/finance/FinanceFluxoCaixa.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// The react-select styles we want to reuse
const reactSelectStyles = `styles={{
                    control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 9999 }),
                    option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 })
                  }}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  classNamePrefix="react-select"`;

// Fix Cliente Select
code = code.replace(
  `styles={{
                    control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 9999 }),
                    option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' })
                  }}`,
  reactSelectStyles
);

// Fix Embarcacao Select
code = code.replace(
  `styles={{
                    control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 9999 }),
                    option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' })
                  }}`,
  reactSelectStyles
);

// Replace Plano de Contas Native Select
const planoNativeSelect = `<select value={planoContasFilter} onChange={e=>setPlanoContasFilter(e.target.value)} className="w-full bg-white border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-all appearance-none">
                      <option value="todos">Todos Planos de Contas</option>
                      {planosList && planosList.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.descricao}</option>
                      ))}
                    </select>`;

const planoReactSelect = `<Select
                  options={[
                    { value: 'todos', label: 'Todos Planos de Contas' },
                    ...(planosList || []).map((p: any) => ({ value: p.id, label: p.descricao }))
                  ]}
                  value={{ value: planoContasFilter, label: planoContasFilter === 'todos' ? 'Todos Planos de Contas' : (planosList || []).find((p: any) => p.id === planoContasFilter)?.descricao || 'Desconhecido' }}
                  onChange={(opt: any) => setPlanoContasFilter(opt?.value || 'todos')}
                  placeholder="Selecione..."
                  isClearable={false}
                  ${reactSelectStyles}
                />`;

code = code.replace(planoNativeSelect, planoReactSelect);

// Replace Centro de Custo Native Select
const centroNativeSelect = `<select value={centroCustoFilter} onChange={e=>setCentroCustoFilter(e.target.value)} className="w-full bg-white border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-all appearance-none">
                      <option value="todos">Todos Centros de Custo</option>
                      {centrosList && centrosList.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>`;

const centroReactSelect = `<Select
                  options={[
                    { value: 'todos', label: 'Todos Centros de Custo' },
                    ...(centrosList || []).map((c: any) => ({ value: c.id, label: c.nome }))
                  ]}
                  value={{ value: centroCustoFilter, label: centroCustoFilter === 'todos' ? 'Todos Centros de Custo' : (centrosList || []).find((c: any) => c.id === centroCustoFilter)?.nome || 'Desconhecido' }}
                  onChange={(opt: any) => setCentroCustoFilter(opt?.value || 'todos')}
                  placeholder="Selecione..."
                  isClearable={false}
                  ${reactSelectStyles}
                />`;

code = code.replace(centroNativeSelect, centroReactSelect);

// Also add a little bit of spacing for labels in those new ones so it matches the other components
const classLabelChanges = `<div>
                    <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-3 uppercase tracking-wide">Classificação</label>
                    <div className="space-y-4">`;

code = code.replace(
  `<div>
                    <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-2 uppercase tracking-wide">Classificação</label>
                    <div className="space-y-3">`,
  classLabelChanges
);

fs.writeFileSync(filePath, code, 'utf8');
console.log("React Selects correctly implemented with menuPortalTarget!");
