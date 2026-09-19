const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

// 1. Remove Plano Pai from the TH
code = code.replace(/<th className="px-6 py-4">Plano Pai<\/th>/, '');

// 2. Remove Plano Pai from the TR
const planoPaiTdRegex = /<td className="px-6 py-4">\s*\{\(\(\) => \{\s*const parent = planosContas\.find\(c => c\.id === plano\.parentId\);\s*if \(parent\) return <span className="text-xs text-slate-500 font-medium">\{parent\.codigoContabil\} - \{parent\.descricao\}<\/span>;\s*return <span className="text-xs text-slate-400 font-medium">-<\/span>;\s*\}\)\(\)\}\s*<\/td>/;
code = code.replace(planoPaiTdRegex, '');

// 3. Keep forms updated : Remove from the form inside "Novo Plano de Contas" modal
const planoPaiFormRegex = /<div>\s*<label className="block mb-1\.5">Plano Pai<\/label>\s*<select\s*value=\{planoForm\.parentId \|\| ''\}\s*onChange=\{\(e\) => setPlanoForm\(\{ \.\.\.planoForm, parentId: e\.target\.value \}\)\}\s*className="w-full px-3\.5 py-2\.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500\/20 focus:border-indigo-500 transition-all font-normal"\s*>\s*<option value="">Nenhum \(Raiz\)<\/option>\s*\{planosContas\s*\?\.filter\(c => c.status === 'ativo'\)\s*\.map\(\(c, idx\) => \(\s*<option key=\{idx\} value=\{c\.id\}>\s*\{c\.codigoContabil\}\{c\.descricao\} - \(Empr: \{c\.empresa\}\)\s*<\/option>\s*\)\)\}\s*<\/select>\s*<\/div>/;
code = code.replace(planoPaiFormRegex, '');

// 4. Remove Centro de Custo Pai from "Novo Centro de Custo" modal
const centroCustoPaiFormRegex = /<div>\s*<label className="block mb-1\.5">Centro de Custo Pai<\/label>\s*<select\s*value=\{centroForm\.parentId \|\| ''\}\s*onChange=\{e => setCentroForm\(\{\.\.\.centroForm, parentId: e\.target\.value\}\)\}\s*className="w-full px-4 py-2\.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500\/20 focus:border-indigo-500 outline-none transition-all appearance-none"\s*>\s*<option value="">Raiz \(Nenhum\)<\/option>\s*\{centrosCusto\.filter\(c => c\.status === 'ativo'\)\.map\(c => \(\s*<option key=\{c\.id\} value=\{c\.id\}>\{c\.nome\} \(\{c\.empresa\}\)<\/option>\s*\)\)\}\s*<\/select>\s*<\/div>/;
code = code.replace(centroCustoPaiFormRegex, '');

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('FinanceConfig.tsx fixes applied');

