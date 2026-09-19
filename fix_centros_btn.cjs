const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

const t = code.indexOf("onClick={() => setActiveSubTab('fornecedores')}");
let start = code.lastIndexOf('<button', t);
const toInsert = `          <button
            type="button"
            onClick={() => setActiveSubTab('centros_custo')}
            className={\`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 \${
              activeSubTab === 'centros_custo'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }\`}
          >
            <Building2 className="w-4 h-4" />
            Centros de Custo
          </button>\n`;

code = code.substring(0, start) + toInsert + code.substring(start);
fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('Centros custom subtab added safely.');
