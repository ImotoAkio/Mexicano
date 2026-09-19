const fs = require('fs');
const p = 'src/components/finance/FinanceFluxoCaixa.tsx';
let txt = fs.readFileSync(p, 'utf8');

// 1. Fix the Drawer declaration
const drawerDefOld = `function FilterDrawer({
  open, onClose,
  clienteFilter, setClienteFilter,
  planoContasFilter, setPlanoContasFilter,
  dataInicio, setDataInicio,
  dataFim, setDataFim
}: any) {`;

const drawerDefNew = `function FilterDrawer({
  open, onClose,
  clienteFilter, setClienteFilter,
  embarcacaoFilter, setEmbarcacaoFilter,
  planoContasFilter, setPlanoContasFilter,
  dataInicio, setDataInicio,
  dataFim, setDataFim
}: any) {`;

txt = txt.replace(drawerDefOld, drawerDefNew);

// 2. Fix the Drawer usage
const drawerUseOld = `<FilterDrawer
        open={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        clienteFilter={clienteFilter}
        setClienteFilter={setClienteFilter}
        planoContasFilter={planoContasFilter}
        setPlanoContasFilter={setPlanoContasFilter}
        dataInicio={dataInicio}
        setDataInicio={setDataInicio}
        dataFim={dataFim}
        setDataFim={setDataFim}
      />`;

const drawerUseNew = `<FilterDrawer
        open={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        clienteFilter={clienteFilter}
        setClienteFilter={setClienteFilter}
        embarcacaoFilter={embarcacaoFilter}
        setEmbarcacaoFilter={setEmbarcacaoFilter}
        planoContasFilter={planoContasFilter}
        setPlanoContasFilter={setPlanoContasFilter}
        dataInicio={dataInicio}
        setDataInicio={setDataInicio}
        dataFim={dataFim}
        setDataFim={setDataFim}
      />`;

txt = txt.replace(drawerUseOld, drawerUseNew);


// 3. Fix the active state boolean check for the filter icon highlight
const checkOld = `(clienteFilter || dataInicio || dataFim || planoContasFilter !== 'todos')`;
const checkNew = `(clienteFilter || embarcacaoFilter || dataInicio || dataFim || planoContasFilter !== 'todos')`;
txt = txt.replace(checkOld, checkNew);

fs.writeFileSync(p, txt, 'utf8');
