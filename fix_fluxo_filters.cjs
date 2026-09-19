const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceFluxoCaixa.tsx', 'utf8');

// 1. Add state for mappings
code = code.replace(
  "  const [loading, setLoading] = useState(true);",
  `  const [loading, setLoading] = useState(true);

  // Dictionaries for relations
  const [mapPlanos, setMapPlanos] = useState<Record<string, string>>({});
  const [mapCentros, setMapCentros] = useState<Record<string, string>>({});
  const [planosList, setPlanosList] = useState<any[]>([]);
  const [centrosList, setCentrosList] = useState<any[]>([]);`
);

// 2. Parse relations in fetch
code = code.replace(
  "if(Array.isArray(dbData.transacoes)) {",
  `if (dbData.planosContas) {
          const map = dbData.planosContas.reduce((acc: any, p: any) => { acc[p.id] = p.descricao; return acc; }, {});
          setMapPlanos(map);
          setPlanosList(dbData.planosContas);
        }
        if (dbData.centrosCusto) {
          const map = dbData.centrosCusto.reduce((acc: any, c: any) => { acc[c.id] = c.nome; return acc; }, {});
          setMapCentros(map);
          setCentrosList(dbData.centrosCusto);
        }

        if(Array.isArray(dbData.transacoes)) {`
);

// 3. Add Centro de Custo Filter state next to Plano Contas
code = code.replace(
  "const [planoContasFilter, setPlanoContasFilter] = useState('todos');",
  "const [planoContasFilter, setPlanoContasFilter] = useState('todos');\n  const [centroCustoFilter, setCentroCustoFilter] = useState('todos');"
);

// 4. Update Filter logic
code = code.replace(
  "if (planoContasFilter !== 'todos' && t.categoria !== planoContasFilter) return false;",
  "if (planoContasFilter !== 'todos' && t.planoContasId !== planoContasFilter) return false;\n    if (centroCustoFilter !== 'todos' && t.centroCustoId !== centroCustoFilter) return false;"
);

// 5. Update Search text logic (remove categoria from search, add descriptive fields if missing)
code = code.replace(
  /if \(!t\.descricao\?\.toLowerCase\(\)\.includes\(search\) &&[\s\S]*?!t\.categoria\?\.toLowerCase\(\)\.includes\(search\)\) return false;/,
  "if (!t.descricao?.toLowerCase().includes(search)) return false;"
);

// 6. Fix FilterDrawer props
code = code.replace(
  "planoContasFilter, setPlanoContasFilter,",
  "planoContasFilter, setPlanoContasFilter,\n  centroCustoFilter, setCentroCustoFilter,\n  planosList, centrosList,"
);

// Match the caller props passing
code = code.replace(
  /setPlanoContasFilter=\{setPlanoContasFilter\}/,
  "setPlanoContasFilter={setPlanoContasFilter}\n          centroCustoFilter={centroCustoFilter}\n          setCentroCustoFilter={setCentroCustoFilter}\n          planosList={planosList}\n          centrosList={centrosList}"
);

// 7. Fix FilterDrawer HTML for the dropdowns
const newFilterHtml = `
                    <select value={planoContasFilter} onChange={e=>setPlanoContasFilter(e.target.value)} className="w-full bg-white border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-all appearance-none">
                      <option value="todos">Todos Planos de Contas</option>
                      {planosList && planosList.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.descricao}</option>
                      ))}
                    </select>

                    <select value={centroCustoFilter} onChange={e=>setCentroCustoFilter(e.target.value)} className="w-full bg-white border border-transparent rounded-xl px-4 py-3 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-all appearance-none">
                      <option value="todos">Todos Centros de Custo</option>
                      {centrosList && centrosList.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
`;

code = code.replace(
  /<select value=\{planoContasFilter\}[\s\S]*?<\/select>/,
  newFilterHtml
);


fs.writeFileSync('src/components/finance/FinanceFluxoCaixa.tsx', code);
console.log('Filters replaced!');
