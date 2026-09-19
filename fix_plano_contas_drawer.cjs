const fs = require('fs');

let code = fs.readFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', 'utf8');

// The plano de contas tree block:
const planoContasSelectRegex = /<label className="block text-\[13px\] font-medium text-\[#86868b\] mt-4 mb-1\.5 ml-1">Plano de Contas<\/label>[\s\S]*?classNamePrefix="react-select"\s*\/>/;

const newSelect = `<label className="block text-[13px] font-medium text-[#86868b] mt-4 mb-1.5 ml-1">Plano de Contas</label>
            <Select
              placeholder="Selecione o plano de contas..."
              isClearable
              noOptionsMessage={() => "Nenhum plano"}
              options={planosContas
                .filter(p => p.status === 'ativo' && (p.tipo === tipo || p.tipo === 'ambos') && (p.empresa === 'Todos' || p.empresa === empresa))
                .map(p => ({ value: p.id, label: \`\${p.codigoContabil} - \${p.descricao}\` }))}
              value={planosContas.find(p => p.id === formData.planoContasId) ? {
                 value: formData.planoContasId,
                 label: \`\${planosContas.find(p => p.id === formData.planoContasId)?.codigoContabil} - \${planosContas.find(p => p.id === formData.planoContasId)?.descricao}\`
              } : null}
              onChange={(opt: any) => setFormData(prev => ({...prev, planoContasId: opt?.value || ""}))}
              styles={{
                control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 9999 }),
                option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' }),
                menuPortal: (base) => ({ ...base, zIndex: 9999 })
              }}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              classNamePrefix="react-select"
            />`;

code = code.replace(planoContasSelectRegex, newSelect);

fs.writeFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', code);
console.log('FinanceLancamentoDrawer.tsx updated plano select');

