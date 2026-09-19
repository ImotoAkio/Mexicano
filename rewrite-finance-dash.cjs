const fs = require('fs');
const file = 'src/components/finance/FinanceDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace standard colors
content = content.replace(/text-white/g, 'text-slate-800');
content = content.replace(/text-gray-400/g, 'text-slate-500');
content = content.replace(/bg-\[\#2A2D35\]/g, 'bg-white');
content = content.replace(/border-white\/5/g, 'border-slate-200 shadow-sm');
content = content.replace(/bg-\[\#1A1C23\]/g, 'bg-slate-50');

// Replace Recharts styles
content = content.replace(/{ backgroundColor: '#1A1C23', borderColor: '#374151', color: '#fff' }/g, "{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a' }");
content = content.replace(/stroke="#374151"/g, 'stroke="#e2e8f0"');
content = content.replace(/stroke="#9CA3AF"/g, 'stroke="#64748B"');

// Fix explicit buttons that should keep white text
content = content.replace('bg-indigo-600 hover:bg-indigo-700 text-slate-800', 'bg-indigo-600 hover:bg-indigo-700 text-white');

fs.writeFileSync(file, content);
