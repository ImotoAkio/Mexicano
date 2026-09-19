const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

const regex = /<div>\s*<label className="block mb-1\.5">Centro de Custo Pai<\/label>[\s\S]*?<\/select>\s*<\/div>/;
code = code.replace(regex, '');

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('Regex 2 applied');

