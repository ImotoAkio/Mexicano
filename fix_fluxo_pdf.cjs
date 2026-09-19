const fs = require('fs');

const path = 'src/components/finance/FinanceFluxoCaixa.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add import
if (!code.includes('generateFinanceReportPDF')) {
  code = code.replace(
    "import FinanceLancamentoDrawer from './FinanceLancamentoDrawer';",
    "import FinanceLancamentoDrawer from './FinanceLancamentoDrawer';\nimport { generateFinanceReportPDF } from '../../utils/pdfGenerator';"
  );
}

// Add the button next to "Novo Lançamento"
const newBtn = `
             <button
               onClick={() => generateFinanceReportPDF({
                 empresa: empresaFiltro,
                 tab: activeTab,
                 dataInicio,
                 dataFim,
                 transacoes: filteredTransacoes
               })}
               className="px-5 py-2.5 bg-white border border-black/[0.08] hover:bg-[#f5f5f7] text-[#1d1d1f] flex items-center gap-2 rounded-full font-semibold text-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98]"
             >
               <FileText className="w-4 h-4" /> Relatório
             </button>
`;

code = code.replace(
  /<button[\s\S]*?onClick=\{\(\) => setIsLancamentoDrawerOpen\(true\)\}[\s\S]*?Novo Lançamento\s*<\/button>/,
  match => newBtn + "\n" + match
);

fs.writeFileSync(path, code);
console.log('Added Report Button');
