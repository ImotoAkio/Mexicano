const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/finance/FinanceFluxoCaixa.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add Select import
if (!code.includes("import Select from 'react-select';")) {
  code = code.replace(
    "import { generateFinanceReportPDF } from '../../utils/pdfGenerator';",
    "import { generateFinanceReportPDF } from '../../utils/pdfGenerator';\nimport Select from 'react-select';"
  );
}

// 2. Add states for lists and embarcacao filter
if (!code.includes("const [clientesList, setClientesList]")) {
  code = code.replace(
    "const [centrosList, setCentrosList] = useState<any[]>([]);",
    "const [centrosList, setCentrosList] = useState<any[]>([]);\n  const [clientesList, setClientesList] = useState<any[]>([]);\n  const [embarcacoesList, setEmbarcacoesList] = useState<any[]>([]);"
  );
}
if (!code.includes("const [embarcacaoFilter, setEmbarcacaoFilter]")) {
  code = code.replace(
    "const [clienteFilter, setClienteFilter] = useState('');",
    "const [clienteFilter, setClienteFilter] = useState('');\n  const [embarcacaoFilter, setEmbarcacaoFilter] = useState('');"
  );
}

// 3. Update fetchTransacoes to set lists
code = code.replace(
  "if (dbData.centrosCusto) {",
  `if (dbData.clientes) {
          setClientesList(dbData.clientes);
        }
        if (dbData.embarcacoes) {
          setEmbarcacoesList(dbData.embarcacoes);
        }
        if (dbData.centrosCusto) {`
);

// 4. Update the logic for extended filters
code = code.replace(
  "if (clienteFilter && t.clienteId !== clienteFilter) return false; // Mocking exact match for demo",
  `if (clienteFilter && t.clienteId !== clienteFilter) return false;
    if (embarcacaoFilter && t.embarcacaoId !== embarcacaoFilter) return false;`
);

// 5. Update FilterDrawer component props
const oldFilterDrawerProps = `function FilterDrawer({
  open, onClose,
  clienteFilter, setClienteFilter,
  planoContasFilter, setPlanoContasFilter,
  centroCustoFilter, setCentroCustoFilter,
  planosList, centrosList,
  dataInicio, setDataInicio,
  dataFim, setDataFim
}: any) {`;

const newFilterDrawerProps = `function FilterDrawer({
  open, onClose,
  clienteFilter, setClienteFilter,
  embarcacaoFilter, setEmbarcacaoFilter,
  planoContasFilter, setPlanoContasFilter,
  centroCustoFilter, setCentroCustoFilter,
  planosList, centrosList,
  clientesList, embarcacoesList,
  dataInicio, setDataInicio,
  dataFim, setDataFim
}: any) {`;

code = code.replace(oldFilterDrawerProps, newFilterDrawerProps);

// 6. Update the FilterDrawer component body completely for the form inputs
// We need to find the <div className="p-4 space-y-4"> block in FilterDrawer
const filterDrawerOldBodyHtml = `            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5 uppercase tracking-wider">Cliente / Fornecedor</label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Nome do cliente ou fornecedor..." 
                    value={clienteFilter} 
                    onChange={e=>setClienteFilter(e.target.value)} 
                    className="w-full bg-[#f5f5f7] border border-transparent rounded-xl pl-10 pr-4 py-2.5 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/10 transition-all placeholder:text-[#86868b] placeholder:font-normal" 
                  />
                </div>
              </div>`;

const filterDrawerNewBodyHtml = `            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5 uppercase tracking-wider">Cliente / Fornecedor</label>
                <Select
                  options={[
                    { value: '', label: 'Todos' },
                    ...(clientesList || []).map((c: any) => ({ value: c.id, label: c.nome }))
                  ]}
                  value={clienteFilter ? { value: clienteFilter, label: (clientesList || []).find((c: any) => c.id === clienteFilter)?.nome || 'Desconhecido' } : { value: '', label: 'Todos' }}
                  onChange={(opt: any) => setClienteFilter(opt?.value || '')}
                  placeholder="Selecione..."
                  isClearable
                  styles={{
                    control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 9999 }),
                    option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' })
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5 uppercase tracking-wider">Embarcação</label>
                <Select
                  options={[
                    { value: '', label: 'Todas' },
                    ...(embarcacoesList || []).map((e: any) => ({ value: e.id, label: e.nome }))
                  ]}
                  value={embarcacaoFilter ? { value: embarcacaoFilter, label: (embarcacoesList || []).find((e: any) => e.id === embarcacaoFilter)?.nome || 'Desconhecida' } : { value: '', label: 'Todas' }}
                  onChange={(opt: any) => setEmbarcacaoFilter(opt?.value || '')}
                  placeholder="Selecione..."
                  isClearable
                  styles={{
                    control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 9999 }),
                    option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' })
                  }}
                />
              </div>`;

code = code.replace(filterDrawerOldBodyHtml, filterDrawerNewBodyHtml);

// 7. Update where FilterDrawer is invoked at bottom
code = code.replace(
  "        clienteFilter={clienteFilter}\n        setClienteFilter={setClienteFilter}",
  "        clienteFilter={clienteFilter}\n        setClienteFilter={setClienteFilter}\n        embarcacaoFilter={embarcacaoFilter}\n        setEmbarcacaoFilter={setEmbarcacaoFilter}"
);
code = code.replace(
  "          planosList={planosList}\n          centrosList={centrosList}",
  "          planosList={planosList}\n          centrosList={centrosList}\n          clientesList={clientesList}\n          embarcacoesList={embarcacoesList}"
);

fs.writeFileSync(filePath, code, 'utf8');
console.log("FinanceFluxoCaixa successfully updated!");
