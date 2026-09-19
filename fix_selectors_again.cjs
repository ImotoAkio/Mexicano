const fs = require('fs');

let content = fs.readFileSync('src/components/finance/FinanceFluxoCaixa.tsx', 'utf8');

content = content.replace(
  /className={`relative z-10 px-5 py-2 text-\[14px\] font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer \${/g,
  'className={`relative z-10 px-4 py-1.5 text-[14px] font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${'
);

content = content.replace(
  /className="flex bg-\[#e5e5ea\]\/50 p-1 rounded-3xl backdrop-blur-xl border border-white\/50 shadow-sm relative overflow-x-auto custom-scrollbar max-w-full"/,
  'className="flex items-center h-9 bg-[#e5e5ea]/50 p-1 rounded-full backdrop-blur-xl border border-white/50 shadow-sm relative overflow-x-auto custom-scrollbar max-w-full"'
);

fs.writeFileSync('src/components/finance/FinanceFluxoCaixa.tsx', content, 'utf8');
