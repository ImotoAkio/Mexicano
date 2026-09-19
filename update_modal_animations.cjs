const fs = require('fs');
const filePath = 'src/components/MarinaFuelView.tsx';
let code = fs.readFileSync(filePath, 'utf-8');

// 1. Update backgrounds
code = code.replace(
  /className="fixed inset-0 z-50 bg-slate-950\/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"/g,
  'className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"'
);

code = code.replace(
  /className="fixed inset-0 z-50 bg-slate-950\/70 backdrop-blur-sm flex items-center justify-center p-4"/g,
  'className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"'
);

// We need to clean one specific case that already had fade-in but with z-50 and bg-slate-950/60 
code = code.replace(
  /className="fixed inset-0 z-50 bg-slate-950\/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"/g,
  'className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"'
);

// 2. Update Modal Dialogs (Bottom sheet on mobile, zoom on desktop)
code = code.replace(
  /className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200\/90 w-full max-w-md overflow-hidden shadow-2xl max-h-\[92vh\] flex flex-col"/g,
  'className="bg-white rounded-t-[32px] sm:rounded-[32px] border border-slate-200/90 w-full max-w-md overflow-hidden shadow-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"'
);

code = code.replace(
  /className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl"/g,
  'className="bg-white rounded-[32px] overflow-hidden max-w-lg w-full shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200"'
);

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Finished updating modal animations to match Apple Design standards.');
