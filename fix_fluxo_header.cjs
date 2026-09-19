const fs = require('fs');
const file = 'src/components/finance/FinanceFluxoCaixa.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace flex container
content = content.replace(
  '<div className="flex justify-between items-end">',
  '<div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">'
);

// We need to also check if the other layout looks proper.
// Add whitespace-nowrap to the company buttons
content = content.replace(
  /className=\{`relative z-10 px-5 py-2 text-\[14px\] font-medium rounded-full transition-colors \$\{/g,
  'className={`relative z-10 px-5 py-2 text-[14px] font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${'
);

// We also must wrap the right-side section so it wraps properly if still needed
content = content.replace(
  '<div className="flex items-center gap-4">',
  '<div className="flex flex-wrap items-center gap-4">'
);

fs.writeFileSync(file, content);
console.log('Fixed header layout in FinanceFluxoCaixa.tsx');
