const fs = require('fs');
const p = 'src/components/finance/FinanceFluxoCaixa.tsx';
let code = fs.readFileSync(p, 'utf8');

// 1. Remove the misplaced block from RowActions menu
const misplaced = `             <button
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
             </button>`;

if (code.includes(misplaced)) {
  code = code.replace(misplaced, '');
  console.log("Removed misplaced button from RowActions.");
} else {
  console.log("Misplaced button not found. Maybe already removed or exact spacing differs.");
}

// 2. Add the button next to "Novo Lançamento"
const newBtn = `             <button
               onClick={() => generateFinanceReportPDF({
                 empresa: empresaFiltro,
                 tab: activeTab,
                 dataInicio,
                 dataFim,
                 transacoes: filteredTransacoes
               })}
               className="px-6 py-2.5 bg-white border border-black/[0.08] hover:bg-[#f5f5f7] text-[#1d1d1f] flex items-center gap-2 rounded-full font-semibold text-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98]"
             >
               <FileText className="w-5 h-5" /> Relatório
             </button>
             <button
               onClick={() => setIsLancamentoDrawerOpen(true)}`;

if (!code.includes('<FileText className="w-5 h-5" /> Relatório')) {
  code = code.replace(
    '<button\n               onClick={() => setIsLancamentoDrawerOpen(true)}',
    newBtn
  );
  console.log("Added button next to Novo Lançamento.");
} else {
  console.log("Button next to Novo Lançamento already exists.");
}

fs.writeFileSync(p, code);
