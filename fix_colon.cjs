const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');
code = code.replace(
  "form-centro' : : 'form-fornecedor'",
  "form-centro' : 'form-fornecedor'"
);
fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
