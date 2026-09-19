const fs = require('fs');

let content = fs.readFileSync('src/components/SimuladoPage.tsx', 'utf8');

// Container & Global Text
content = content.replace('bg-[#111111] text-white', 'bg-gray-50 text-gray-900');

// Tela Lead
content = content.replace('bg-white/[0.03] border border-white/[0.06]', 'bg-white border border-gray-200');
content = content.replace('text-white leading-tight', 'text-gray-900 leading-tight');
content = content.replace('text-white/50 max-w-sm', 'text-gray-500 max-w-sm');

// Form Inputs
content = content.replace(/bg-\[#1C1C1E\] border border-white\/\[0\.05\]/g, 'bg-gray-50 border border-gray-200');
content = content.replace(/text-white placeholder-white\/30 focus:border-\[#FFCE33\]/g, 'text-gray-900 placeholder-gray-400 focus:border-[#FFCE33]');

// Header
content = content.replace(/text-white hover:opacity-75/g, 'text-gray-600 hover:text-gray-900');

// Borders of menu
content = content.replace(/border-white/g, 'border-gray-600');

// Options title
content = content.replace('text-white mb-3', 'text-gray-900 mb-3');

// Selected/unselected styles logic
content = content.replace(`let baseStyle = 'bg-transparent border-[#444] text-white/80 hover:bg-white/[0.03]';`, `let baseStyle = 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm';`);
content = content.replace(`baseStyle = 'bg-[#FFCE33] border-[#FFCE33] text-black font-bold';`, `baseStyle = 'bg-[#FFCE33] border-[#FFCE33] text-black font-bold shadow-sm';`);
content = content.replace(`baseStyle = 'bg-[#22c55e] border-[#22c55e] text-black font-bold';`, `baseStyle = 'bg-[#22c55e] border-[#22c55e] text-white font-bold shadow-sm';`);
content = content.replace(`baseStyle = 'bg-red-500 border-red-500 text-white font-bold opacity-80';`, `baseStyle = 'bg-red-500 border-red-500 text-white font-bold shadow-sm';`);
content = content.replace(`baseStyle = 'bg-transparent border-[#333] text-white/40 opacity-40';`, `baseStyle = 'bg-gray-50 border-gray-200 text-gray-400 opacity-60';`);

// Explanation Box
content = content.replace('bg-[#2C2C2E] rounded-xl border border-white/10 shadow-xl', 'bg-white rounded-xl border border-gray-200 shadow-lg');
content = content.replace('text-white/90 text-sm', 'text-gray-800 text-sm');

// Bottom sticky bar
content = content.replace('bg-[#111111] z-50 flex', 'bg-gray-50 z-50 flex border-t border-gray-200');
content = content.replace(/text-white\/60 hover:text-white/g, 'text-gray-400 hover:text-gray-900');
content = content.replace('bg-[#333] p-[2px]', 'bg-gray-200 p-[2px] shadow-sm');
content = content.replace(/border-current/g, 'border-current');

// Tela final
content = content.replace('bg-[#1C1C1E] border border-white/[0.06]', 'bg-white border border-gray-200');
content = content.replace('text-white mb-2 leading-tight', 'text-gray-900 mb-2 leading-tight');
content = content.replace('text-white/50 mb-8', 'text-gray-500 mb-8');
content = content.replace('text-white/20 ml-1', 'text-gray-300 ml-1');

// Logo invert removal
content = content.replace(/brightness-0 invert/g, '');

fs.writeFileSync('src/components/SimuladoPage.tsx', content);
