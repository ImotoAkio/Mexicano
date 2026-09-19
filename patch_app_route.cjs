const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add import (if not exists)
if (!code.includes('FinanceLancamentos')) {
  code = code.replace(/const FinanceFluxoCaixa = lazy[^\n]+;/, 
    "const FinanceFluxoCaixa = lazy(() => import('./components/finance/FinanceFluxoCaixa'));\nconst FinanceLancamentos = lazy(() => import('./components/finance/FinanceLancamentos'));");
}

// 2. Add to TabType (it already has 'finance-lancamentos')
// 3. Add to menuGroups
if (!code.includes("id: 'finance-lancamentos' as TabType")) {
  code = code.replace(/\{ id: 'finance-fluxo' as TabType, label: 'Fluxo de Caixa', icon: Wallet \},/,
    "{ id: 'finance-lancamentos' as TabType, label: 'Lançamentos (Contas a Pagar/Receber)', icon: FileText },\n        { id: 'finance-fluxo' as TabType, label: 'Fluxo de Caixa', icon: Wallet },");
}

// 4. Update the Suspense block to render it
if (!code.includes("activeTab === 'finance-lancamentos' && <FinanceLancamentos />")) {
  code = code.replace(/\{activeTab === 'finance-fluxo' && <FinanceFluxoCaixa \/>\}/,
    "{activeTab === 'finance-lancamentos' && <FinanceLancamentos />}\n                {activeTab === 'finance-fluxo' && <FinanceFluxoCaixa />}");
}

// 5. Update auth checks if needed
// isFinanceiro allows it by default but we should make sure it's in the array
code = code.replace(/return \['finance-dashboard', 'finance-fluxo', 'finance-recorrencia'/g, "return ['finance-dashboard', 'finance-lancamentos', 'finance-fluxo', 'finance-recorrencia'");
code = code.replace(/\!\['finance-dashboard', 'finance-fluxo', 'finance-recorrencia'/g, "!['finance-dashboard', 'finance-lancamentos', 'finance-fluxo', 'finance-recorrencia'");

fs.writeFileSync('src/App.tsx', code);
