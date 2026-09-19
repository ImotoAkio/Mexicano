const fs = require('fs');

function fixImports(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');
  code = code.replace(/from '\.\.\/types'/g, "from '../../types'");
  fs.writeFileSync(filepath, code);
}

fixImports('src/components/finance/FinanceFluxoCaixa.tsx');
fixImports('src/components/finance/FinanceLancamentos.tsx');
