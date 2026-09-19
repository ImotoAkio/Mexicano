const fs = require('fs');

let content = fs.readFileSync('src/components/finance/FinanceFluxoCaixa.tsx', 'utf8');

// We need to check what states FinanceFluxoCaixa has for clients and so on.
// Let's see if it has 'clientes' state or what.
