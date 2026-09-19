const fs = require('fs');
const file = 'src/components/finance/FinanceDashboardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('text-white', 'text-slate-800');
content = content.replace('text-gray-400', 'text-slate-500');
content = content.replace('bg-[#2A2D35]', 'bg-white');
content = content.replace('border-white/5', 'border-slate-200 shadow-sm');
content = content.replace("? 'bg-[#E3A833] text-black font-semibold shadow-sm'", "? 'bg-slate-100/80 text-slate-900 font-semibold shadow-sm border border-slate-200/50'");
content = content.replace("'text-gray-400 hover:text-white'", "'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'");

fs.writeFileSync(file, content);
