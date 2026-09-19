const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

// 1. Remove Plano Pai select from Plao de Contas UI form
code = code.replace(/<div>\s*<label className="block mb-1\.5">Plano Pai<\/label>[\s\S]*?<\/select>\s*<\/div>/, '');

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('Plano de Contas form flat structure applied.');