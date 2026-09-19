import fs from 'fs';

const filePath = 'src/components/ComercialDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update main layout wrapper
content = content.replace(
    'className="min-h-screen w-full flex bg-[#f4f5f7] font-sans text-slate-800"',
    'className="min-h-screen w-full flex bg-slate-50/80 font-sans text-slate-800 selection:bg-indigo-100"'
);

// 2. Update Sidebar
content = content.replace(
    'className={`bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 transition-all duration-300 overflow-hidden ${isSidebarOpen ? \'w-64\' : \'w-[4.5rem]\'}`}',
    'className={`bg-white/70 backdrop-blur-xl border-r border-slate-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col h-screen sticky top-0 transition-all duration-300 ease-out overflow-hidden z-20 ${isSidebarOpen ? \'w-64\' : \'w-[4.5rem]\'}`}'
);

// 3. Update Header
content = content.replace(
    'className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-6 sticky top-0 z-10"',
    'className="bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-20 flex items-center justify-between px-8 sticky top-0 z-10"'
);

// 4. Global Button/Hover Adjustments inside Sidebar
content = content.replace(
    /text-slate-500 hover:bg-slate-50 hover:text-slate-900/g,
    "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 active:scale-[0.97]"
);
content = content.replace(
    /bg-slate-50 text-slate-900/g,
    "bg-indigo-50/80 text-indigo-700 font-semibold shadow-sm"
);

// 5. Buttons in header (Settings/Logout)
content = content.replace(
    'className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"',
    'className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all active:scale-95"'
);
content = content.replace(
    'className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"',
    'className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95"'
);
content = content.replace(
    'className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"',
    'className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all active:scale-95"'
);

// 6. Welcome screen cards
content = content.replace(
    /className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col"/g,
    'className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 group flex flex-col"'
);

// 7. Searchable boat/client containers and Selects
content = content.replace(
    'className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${',
    'className={`w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-100 border rounded-2xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${'
);
content = content.replace(
    "isOpen ? 'border-slate-900 bg-white ring-2 ring-slate-900/10 shadow-sm' : 'border-slate-200 hover:border-slate-300'",
    "isOpen ? 'border-indigo-500 bg-white ring-4 ring-indigo-500/10 shadow-lg' : 'border-slate-200'"
);
content = content.replace(
    'className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 flex flex-col"',
    'className="absolute z-50 left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] max-h-60 flex flex-col overflow-hidden"'
);

// 8. Modals (Settings, etc)
content = content.replace(
    'className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"',
    'className="fixed inset-0 bg-slate-900/30 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-opacity"'
);
content = content.replace(
    'className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]"',
    'className="bg-white/95 backdrop-blur-xl border border-white/50 rounded-[2rem] w-full max-w-xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[90vh]"'
);

// 9. Main Action Buttons
content = content.replace(
    'className="w-full mt-6 py-4 bg-slate-900 hover:bg-indigo-600 text-white font-semibold rounded-xl text-lg flex items-center justify-center space-x-2 transition-all shadow-md hover:shadow-xl"',
    'className="w-full mt-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl text-lg flex items-center justify-center space-x-2 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.16)] active:scale-[0.98]"'
);
content = content.replace(
    /className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"/g,
    'className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all active:scale-[0.97]"'
);
content = content.replace(
    /className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm flex items-center space-x-2 text-sm"/g,
    'className="px-5 py-2.5 bg-emerald-600/90 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)] flex items-center space-x-2 text-sm active:scale-[0.97]"'
);
content = content.replace(
    /className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center space-x-2 text-sm"/g,
    'className="px-5 py-2.5 bg-indigo-600/90 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all shadow-[0_4px_12px_rgba(79,70,229,0.2)] flex items-center space-x-2 text-sm active:scale-[0.97]"'
);
content = content.replace(
    /className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center space-x-2 text-sm"/g,
    'className="px-5 py-2.5 bg-blue-600/90 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center space-x-2 text-sm active:scale-[0.97]"'
);
content = content.replace(
    /className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"/g,
    'className="px-5 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all active:scale-[0.97]"'
);

// 10. Forms / Inputs
content = content.replace(
    /className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-800"/g,
    'className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-100/50 border border-slate-200/80 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-800"'
);

// 11. Content Layout
content = content.replace(
    'className="max-w-7xl mx-auto px-6 py-10"',
    'className="max-w-[1400px] mx-auto px-8 py-10"'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Update finished!');
