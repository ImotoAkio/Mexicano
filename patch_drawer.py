import re

with open('src/components/finance/FinanceLancamentoDrawer.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# Add Select import
if 'import Select from "react-select"' not in content:
    content = content.replace("import { formatCurrency } from", 'import Select from "react-select";\nimport { formatCurrency } from')

# Add missing state
if 'const [planoContasId, setPlanoContasId] = useState("");' not in content:
    content = content.replace('const [categoria, setCategoria] = useState(\'\');', 'const [categoria, setCategoria] = useState(\'\');\n  const [planoContasId, setPlanoContasId] = useState("");\n  const [centroCustoId, setCentroCustoId] = useState("");')

# Add missing resets
if 'setPlanoContasId("");' not in content:
    content = content.replace("setCategoria('');", "setCategoria('');\n      setPlanoContasId('');\n      setCentroCustoId('');")

# Change handleSave validate
content = content.replace("!categoria", "!planoContasId")
content = content.replace("Categoria, Descrição", "Plano de Contas, Descrição")

# Replace <select value={categoria}> block
start_tag = '                       <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Categoria (Plano de Contas)*</label>'
end_tag = '                       </select>'
if start_tag in content and end_tag in content:
    start_idx = content.find(start_tag)
    end_idx = content.find(end_tag, start_idx) + len(end_tag)
    
    new_select = """                       <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Plano de Contas*</label>
                       <Select
                         placeholder="Selecione o plano..."
                         noOptionsMessage={() => "Nenhum plano encontrado"}
                         options={planosContas
                           .filter(p => !p.parentId && p.tipo === tipo)
                           .map(parent => ({
                             label: parent.codigoContabil ? `${parent.codigoContabil} - ${parent.descricao}` : parent.descricao,
                             options: planosContas
                               .filter(child => child.parentId === parent.id)
                               .map(child => ({
                                 value: child.id,
                                 label: child.codigoContabil ? `${child.codigoContabil} - ${child.descricao}` : child.descricao
                               }))
                           }))
                           .filter(group => group.options.length > 0)}
                         value={planosContas.find(p => p.id === planoContasId) ? {
                            value: planoContasId,
                            label: planosContas.find(p => p.id === planoContasId)?.descricao
                         } : null}
                         onChange={(opt: any) => setPlanoContasId(opt?.value || "")}
                         styles={{
                           control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                           menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
                           option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' })
                         }}
                         classNamePrefix="react-select"
                       />
                       
                       <label className="block text-[13px] font-medium text-[#86868b] mt-4 mb-1.5 ml-1">Centro de Custo</label>
                       <Select
                         placeholder="Selecione o centro de custo..."
                         isClearable
                         noOptionsMessage={() => "Nenhum centro de custo"}
                         options={centrosCusto
                           .filter(c => c.empresa === 'Todos' || c.empresa === empresa)
                           .map(c => ({ value: c.id, label: c.nome }))}
                         value={centrosCusto.find(c => c.id === centroCustoId) ? {
                            value: centroCustoId,
                            label: centrosCusto.find(c => c.id === centroCustoId)?.nome
                         } : null}
                         onChange={(opt: any) => setCentroCustoId(opt?.value || "")}
                         styles={{
                           control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                           menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
                           option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' })
                         }}
                         classNamePrefix="react-select"
                       />"""
    content = content[:start_idx] + new_select + content[end_idx:]

with open('src/components/finance/FinanceLancamentoDrawer.tsx', 'w', encoding='utf8') as f:
    f.write(content)

