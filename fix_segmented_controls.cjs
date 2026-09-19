const fs = require('fs');

const files = [
  'src/components/finance/FinanceFluxoCaixa.tsx',
  'src/components/finance/FinanceDashboardPage.tsx',
  'src/components/finance/FinanceCadastroConfigs.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the container to allow scrolling on constrained screens
  content = content.replace(
    /className="flex bg-\[#e5e5ea\]\/50 p-1 rounded-full backdrop-blur-xl border border-white\/50 shadow-sm relative"/g,
    'className="flex bg-[#e5e5ea]/50 p-1 rounded-full backdrop-blur-xl border border-white/50 shadow-sm relative overflow-x-auto custom-scrollbar max-w-full"'
  );
  
  // Make sure whitespace-nowrap and cursor-pointer are present on all segment buttons
  // FinanceDashboardPage and Configs might have different spacings (px-6 instead of px-5)
  content = content.replace(
    /className=\{`relative z-10 (px-\d+) py-2 text-\[14px\] font-medium rounded-full transition-colors\s*(?:cursor-pointer\s*)?\$\{/g,
    'className={`relative z-10 $1 py-2 text-[14px] font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${'
  );
  
  fs.writeFileSync(file, content);
  console.log('Fixed segmented control in ' + file);
}
