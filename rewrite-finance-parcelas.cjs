const fs = require('fs');
const file = 'src/components/finance/FinanceParcelasFixas.tsx';
let content = fs.readFileSync(file, 'utf8');

// Container colors
content = content.replace(/bg-\[\#1A1C23\]/g, 'bg-slate-50');
content = content.replace(/bg-\[\#2A2D35\]/g, 'bg-white');
content = content.replace(/bg-\[\#1e2029\]/g, 'bg-slate-50/50'); // the grid background

// Text colors
content = content.replace(/text-white/g, 'text-slate-800');
content = content.replace(/text-gray-400/g, 'text-slate-500');
content = content.replace(/placeholder-gray-400/g, 'placeholder-slate-400');
content = content.replace(/text-gray-500/g, 'text-slate-400');
content = content.replace(/text-gray-300/g, 'text-slate-500');

// Border colors
content = content.replace(/border-white\/5/g, 'border-slate-200 shadow-sm');
content = content.replace(/border-white\/10/g, 'border-slate-200');
content = content.replace(/border-red-500\/30/g, 'border-rose-300 bg-rose-50');
content = content.replace(/border-emerald-500\/30/g, 'border-emerald-300 bg-emerald-50');

// Hover states
content = content.replace(/hover:text-white/g, 'hover:text-slate-700');
content = content.replace(/hover:bg-white\/5/g, 'hover:bg-slate-100');

// Button specific fix
content = content.replace("? 'bg-indigo-600 text-slate-800'", "? 'bg-indigo-600 text-white'");
content = content.replace("className=\"flex h-screen items-center justify-center text-slate-800", "className=\"flex h-screen items-center justify-center text-slate-500");

fs.writeFileSync(file, content);
