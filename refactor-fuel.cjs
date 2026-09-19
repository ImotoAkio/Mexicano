const fs = require('fs');
let content = fs.readFileSync('src/components/MarinaFuelView.tsx', 'utf8');

// 1. Refactor getFuelPrice and hardcoded fuel strings
content = content.replace(/import \{ getBoatCode \} from '\.\.\/utils\/boatUtils';/, "import { getBoatCode } from '../utils/boatUtils';\nimport { getFuelPrice } from '../utils/constants';");

content = content.replace(/unitPrice = pm === 'credit' \? 10 : pm === 'admin' \? 13 : 9/g, "unitPrice = getFuelPrice(pm)");
content = content.replace(/unitPrice = method === 'credit' \? 10 : method === 'admin' \? 13 : 9/g, "unitPrice = getFuelPrice(method)");
content = content.replace(/unitPrice = valType === 'credit' \? 10 : valType === 'admin' \? 13 : 9/g, "unitPrice = getFuelPrice(valType)");
content = content.replace(/paymentType === 'credit' \? 10 : paymentType === 'admin' \? 13 : 9/g, "getFuelPrice(paymentType)");
content = content.replace(/chargePaymentType === 'credit' \? 10 : chargePaymentType === 'admin' \? 13 : 9/g, "getFuelPrice(chargePaymentType)");
content = content.replace(/editPaymentType === 'credit' \? 10 : editPaymentType === 'admin' \? 13 : 9/g, "getFuelPrice(editPaymentType)");

// 2. Apple Design CSS Replacements - Header
content = content.replace(/className="max-w-7xl mx-auto p-2 sm:p-6 space-y-4 sm:space-y-6"/g, 'className="max-w-[1400px] mx-auto p-4 sm:p-8 space-y-8 animate-in fade-in duration-500"');
content = content.replace(/className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"/g, 'className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-white/70 backdrop-blur-2xl z-20 py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-slate-900/5"');
content = content.replace(/className="bg-white border border-slate-200 rounded-2xl p-4"/g, 'className="bg-white rounded-3xl p-5 ring-1 ring-slate-900/5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all hover:shadow-md"');

// Modals
content = content.replace(/bg-slate-900\/50 flex/g, 'bg-slate-900/30 backdrop-blur-md flex animate-in fade-in duration-200');
content = content.replace(/className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-\[90vh\] flex flex-col"/g, 'className="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col ring-1 ring-slate-900/5 shadow-2xl animate-in zoom-in-95 duration-200"');

// Action Menus
content = content.replace(/className="absolute bg-white border border-slate-200 shadow-xl rounded-2xl w-44 z-50 overflow-hidden text-sm"/g, 'className="absolute bg-white/90 backdrop-blur-2xl ring-1 ring-slate-900/10 shadow-2xl rounded-2xl w-44 z-50 overflow-hidden text-sm animate-in zoom-in-95 duration-100"');

// Inputs
content = content.replace(/border-2 border-slate-200/g, 'bg-slate-50 border-transparent hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-cyan-500 transition-all');

// Lists/Tables
content = content.replace(/bg-white border border-slate-200 rounded-2xl overflow-hidden/g, 'bg-white rounded-3xl overflow-hidden ring-1 ring-slate-900/5 shadow-sm');
content = content.replace(/bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest/g, 'bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider backdrop-blur-sm');

// Buttons / Spring interactions
content = content.replace(/hover:bg-cyan-700/g, 'hover:bg-cyan-700 active:scale-95 transition-all');
content = content.replace(/hover:bg-slate-100/g, 'hover:bg-slate-100 active:scale-95 transition-all');

fs.writeFileSync('src/components/MarinaFuelView.tsx', content);
console.log("Refactored UI classes successfully.");
