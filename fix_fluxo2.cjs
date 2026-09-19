const fs = require('fs');

let code = fs.readFileSync('src/components/finance/FinanceFluxoCaixa.tsx', 'utf8');

// We add dummy components or just import them, or just delete the blocks!
// Since we isolated FinanceLancamentos, let's just make FinanceFluxoCaixa render only 'lancamentos' content but call it 'finance-fluxo' for now (or a message saying it's flux).
// Actually, we can just delete the blocks for dashboard, atividades, configuracoes, agenda, cobranca.
code = code.replace(/\{activeTab === 'dashboard' && \([\s\S]*?FinanceDashboard[\s\S]*?\)\}/, '');
code = code.replace(/\{activeTab === 'atividades' && \([\s\S]*?FinanceKanban[\s\S]*?\)\}/, '');
code = code.replace(/\{activeTab === 'configuracoes' && isFinanceiroOrAdmin && \([\s\S]*?FinanceConfig[\s\S]*?\)\}/, '');

fs.writeFileSync('src/components/finance/FinanceFluxoCaixa.tsx', code);
