const fs = require('fs');

let code = fs.readFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', 'utf8');

// There's a leftover bug in standard string templates being nested inside another template in our replacement. Let's make sure it's clean.
// Using standard React format. 

const reactSelectBug = /label: `\$\{planosContas\.find\(p => p\.id === formData\.planoContasId\)\?\.codigoContabil\} - \$\{planosContas\.find\(p => p\.id === formData\.planoContasId\)\?\.descricao\}`/;
const fixReactSelectBug = `label: planosContas.find(p => p.id === formData.planoContasId)?.codigoContabil + " - " + planosContas.find(p => p.id === formData.planoContasId)?.descricao`;

code = code.replace(reactSelectBug, fixReactSelectBug);

fs.writeFileSync('src/components/finance/FinanceLancamentoDrawer.tsx', code);
console.log('FinanceLancamentoDrawer.tsx fixed interpolated labels');

