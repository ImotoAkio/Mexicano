const fs = require('fs');
const p = 'src/components/finance/FinanceFluxoCaixa.tsx';
let txt = fs.readFileSync(p, 'utf8');

if (!txt.includes('import { clientDB, boatDB }')) {
  txt = txt.replace('import { clientDB }', 'import { clientDB, boatDB }');
}

// Ensure embarcacaoFilter state exists
if (!txt.includes('const [embarcacaoFilter, setEmbarcacaoFilter]')) {
  txt = txt.replace(
    `const [clienteFilter, setClienteFilter] = useState('');`,
    `const [clienteFilter, setClienteFilter] = useState('');\n  const [embarcacaoFilter, setEmbarcacaoFilter] = useState('');`
  );
}

// Add state clearing for filters
txt = txt.replace(
    `<button onClick={onClose} className="w-full py-3 bg-[#0071e3] hover:bg-[#0077ED] text-white font-semibold rounded-xl text-[15px] transition-colors shadow-sm">
                 Aplicar Filtros
               </button>`,
    `<div className="flex gap-3">
                 <button onClick={() => { setClienteFilter(''); setEmbarcacaoFilter(''); setPlanoContasFilter('todos'); setDataInicio(''); setDataFim(''); }} className="w-1/3 py-3 bg-white border border-black/[0.08] hover:bg-[#f5f5f7] text-[#1d1d1f] font-semibold rounded-xl text-[14px] transition-colors shadow-sm">
                   Limpar
                 </button>
                 <button onClick={onClose} className="w-2/3 py-3 bg-[#0071e3] hover:bg-[#0077ED] text-white font-semibold rounded-xl text-[15px] transition-colors shadow-sm">
                   Aplicar Filtros
                 </button>
               </div>`
);


// Replace the old text input with selects
const oldInputs = `<input type="text" placeholder="Cliente ou Fornecedor" value={clienteFilter} onChange={e=>setClienteFilter(e.target.value)} className="w-full bg-white border border-transparent rounded-xl px-3 py-3 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-all" />

                    <select value={planoContasFilter} onChange={e=>setPlanoContasFilter(e.target.value)} className="w-full bg-white border border-transparent rounded-xl px-3 py-3 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-all appearance-none">`;

const newInputs = `<select value={clienteFilter} onChange={e=>setClienteFilter(e.target.value)} className="w-full bg-white border border-transparent rounded-xl px-3 py-3 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-all">
                      <option value="">Todos os Clientes / Fornecedores</option>
                      {clientDB.getAll().map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>

                    <select value={embarcacaoFilter} onChange={e=>setEmbarcacaoFilter(e.target.value)} className="w-full bg-white border border-transparent rounded-xl px-3 py-3 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-all">
                      <option value="">Todas as Embarcações</option>
                      {boatDB.getAll().map(b => {
                         const dono = b.clienteId ? clientDB.getById(b.clienteId)?.nome : 'M';
                         return <option key={b.id} value={b.id}>{b.nome} ({dono})</option>
                      })}
                    </select>

                    <select value={planoContasFilter} onChange={e=>setPlanoContasFilter(e.target.value)} className="w-full bg-white border border-transparent rounded-xl px-3 py-3 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-all">`;

txt = txt.replace(oldInputs, newInputs);


// Modify the filtering logic to use exact ID for clienteFilter (since it's a select returning ID now)
const oldFilterLogic = `// 4. Extended Filters
    if (clienteFilter) {
       const filterText = clienteFilter.toLowerCase();
       const filterDigits = filterText.replace(/\D/g, '');
       const matchCpf = filterDigits.length > 2 && clientCpf.includes(filterDigits);
       
       if (!clientName.includes(filterText) &&
           !fornecedorName.includes(filterText) &&
           !matchCpf) {
          return false;
       }
    }

    if (planoContasFilter !== 'todos' && t.categoria !== planoContasFilter) return false;`;

const newFilterLogic = `// 4. Extended Filters
    // clienteFilter is now an exact ID coming from a <select>
    if (clienteFilter && t.clienteId !== clienteFilter && t.fornecedorId !== clienteFilter) return false;
    
    // embarcacaoFilter is an exact ID from a <select>
    if (embarcacaoFilter && t.embarcacaoId !== embarcacaoFilter) return false;

    if (planoContasFilter !== 'todos' && t.categoria !== planoContasFilter) return false;`;

txt = txt.replace(oldFilterLogic, newFilterLogic);

fs.writeFileSync(p, txt, 'utf8');
