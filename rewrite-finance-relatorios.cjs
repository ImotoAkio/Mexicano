const fs = require('fs');
const file = 'src/components/finance/FinanceRelatorios.tsx';
let content = fs.readFileSync(file, 'utf8');

// Container colors
content = content.replace(/bg-\[\#1A1C23\]/g, 'bg-slate-50');
content = content.replace(/bg-\[\#2A2D35\]/g, 'bg-white');

// Text colors
content = content.replace(/text-white/g, 'text-slate-800');
content = content.replace(/text-gray-400/g, 'text-slate-500');
content = content.replace(/text-gray-300/g, 'text-slate-600');
content = content.replace(/text-gray-500/g, 'text-slate-400');

// Border colors
content = content.replace(/border-white\/5/g, 'border-slate-200 shadow-sm');
content = content.replace(/border-white\/10/g, 'border-slate-200');
content = content.replace(/bg-white\/10/g, 'bg-slate-100 border border-slate-200 text-slate-600'); 

// Dropdown input colors
content = content.replace(/content = content.replace\(\/bg-\[#2A2D35\]\/g, 'bg-white'\);/g, ""); // Just to be safe not matching my own script
// Already matched above with bg-[#2A2D35]

// PDF export background
content = content.replace(/"#1A1C23"/g, "'#ffffff'");
content = content.replace(/'#1A1C23'/g, "'#ffffff'");

// Specific button text
content = content.replace('bg-indigo-600 hover:bg-indigo-700 text-slate-800', 'bg-indigo-600 hover:bg-indigo-700 text-white');

// Fix border classes that were white/10 but replaced
content = content.replace('border border-slate-200 cursor-pointer', 'border border-slate-200 cursor-pointer');

fs.writeFileSync(file, content);
