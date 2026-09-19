const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceFluxoCaixa.tsx', 'utf8');

// Adjust table styling to have table-fixed so it never overflows
code = code.replace(
  '<table className="w-full text-left border-collapse">',
  '<table className="w-full text-left border-collapse table-fixed">'
);

// Define column widths explicitly so table-fixed works nicely
code = code.replace(
  '<th className="px-3 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] w-32 border-b border-black/[0.04]">Data/Venc.</th>',
  '<th className="px-3 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] w-[15%] border-b border-black/[0.04]">Data/Venc.</th>'
);

code = code.replace(
  '<th className="px-3 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] border-b border-black/[0.04]">Descrição</th>',
  '<th className="px-3 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] w-[25%] border-b border-black/[0.04]">Descrição</th>'
);

code = code.replace(
  '<th className="px-3 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] border-b border-black/[0.04]">Cliente/Fornec.</th>',
  '<th className="px-3 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] w-[15%] border-b border-black/[0.04]">Cliente/Fornec.</th>'
);

code = code.replace(
  '<th className="px-3 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] border-b border-black/[0.04]">Categoria</th>',
  '<th className="px-3 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] w-[15%] border-b border-black/[0.04]">Categoria</th>'
);

code = code.replace(
  '<th className="px-3 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] border-b border-black/[0.04]">Valor</th>',
  '<th className="px-3 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] w-[12%] border-b border-black/[0.04]">Valor</th>'
);

code = code.replace(
  '<th className="px-3 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] border-b border-black/[0.04] text-center">Status</th>',
  '<th className="px-3 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] w-[13%] border-b border-black/[0.04] text-center">Status</th>'
);

code = code.replace(
  '<th className="px-3 py-3 border-b border-black/[0.04] w-16"></th>',
  '<th className="px-3 py-3 border-b border-black/[0.04] w-[5%]"></th>'
);

// Truncate logic fix on td to not break table-fixed
code = code.replace(
  'truncate max-w-[250px]', 'truncate'
);
code = code.replace(
  'truncate max-w-[150px]', 'truncate'
);

fs.writeFileSync('src/components/finance/FinanceFluxoCaixa.tsx', code, 'utf8');
