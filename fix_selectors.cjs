const fs = require('fs');

let content = fs.readFileSync('src/components/finance/FinanceFluxoCaixa.tsx', 'utf8');

// Fix the height of the segmented control. py-2 is maybe slightly tall. Apple standard is Usually smaller height
content = content.replace(
  /className="flex bg-\[#e5e5ea\]\/50 p-1 rounded-full backdrop-blur-xl border border-white\/50 shadow-sm relative overflow-x-auto custom-scrollbar max-w-full"/,
  'className="flex bg-[#e5e5ea]/50 p-1 rounded-3xl backdrop-blur-xl border border-white/50 shadow-sm relative overflow-x-auto custom-scrollbar max-w-full"'
);

// We need to change the button rounded-full to rounded-full but tighter padding
content = content.replace(
  /className={`relative px-5 py-2 rounded-full font-semibold text-\[14px\] transition-all whitespace-nowrap \${/g,
  'className={`relative px-5 py-1.5 rounded-full font-semibold text-[14px] transition-all whitespace-nowrap ${'
);


fs.writeFileSync('src/components/finance/FinanceFluxoCaixa.tsx', content, 'utf8');
