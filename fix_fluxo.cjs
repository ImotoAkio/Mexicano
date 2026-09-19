const fs = require('fs');

let code = fs.readFileSync('src/components/finance/FinanceFluxoCaixa.tsx', 'utf8');

// The file has a hardcoded `const activeTab = 'lancamentos';`
// and various `activeTab === '...'` wrappers.
// We just need to make the TS compiler happy because we already moved lancamentos logic to FinanceLancamentos.tsx.
// But wait, the App.tsx renders FinanceFluxoCaixa for the "finance-fluxo" tab!

// Let's replace the hardcoded activeTab and remove invalid TS conditions
code = code.replace(/const activeTab = 'lancamentos';/g, "const activeTab = 'finance-fluxo';");

// Remove the `activeTab === ...` blocks that cause TS errors because the types don't overlap in TS's eyes
// Since activeTab is inferred as 'finance-fluxo', TS complains about comparisons with 'dashboard', 'lancamentos' etc.
// Let's change `const activeTab = 'lancamentos';` to `const activeTab: string = 'finance-fluxo';`!
code = code.replace(/const activeTab = 'lancamentos';/g, "const activeTab: string = 'finance-fluxo';");
code = code.replace(/const activeTab = 'finance-fluxo';/g, "const activeTab: string = 'finance-fluxo';");

// Fix planoContasId error in FinanceFluxoCaixa.tsx
code = code.replace(/, planoContasId: ''/g, "");
code = code.replace(/, planoContasId: selectedPlan\?\.id || ''/g, "");
code = code.replace(/\?\.temMultiplosDonos/g, "?.donos?.length > 1");

fs.writeFileSync('src/components/finance/FinanceFluxoCaixa.tsx', code);
