const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceLancamentos.tsx', 'utf8');

// Change export name
code = code.replace(/export default function FinanceFluxoCaixa\(\) \{/, 'export default function FinanceLancamentos() {');

// Remove activeTab completely
code = code.replace(/const activeTab[^;]+;/, '');

// Remove all tabs and keep ONLY the content for 'lancamentos'
// The structure is roughly:
// {activeTab === 'dashboard' && ( ... )}
// {activeTab === 'atividades' && ( ... )}
// {activeTab === 'configuracoes' && ... ( ... )}
// {activeTab === 'lancamentos' && ( ... )}
// {activeTab === 'agenda' && ( ... )}
// {activeTab === 'cobranca' && ( ... )}

// Let's use regex to remove everything from dashboard to the start of lancamentos
code = code.replace(/\{activeTab === 'dashboard'(.|[\r\n])*?\{activeTab === 'lancamentos' && \(\s*<div className="space-y-6 animate-in fade-in duration-300">/, 
`<div className="space-y-6 animate-in fade-in duration-300">`);

// Remove agenda and cobranca
code = code.replace(/\{activeTab === 'agenda'(.|[\r\n])*?\{activeTab === 'cobranca'(.|[\r\n])*?<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*\)\s*;\s*\}/, 
`</div>
  </div>
);
}`);

fs.writeFileSync('src/components/finance/FinanceLancamentos.tsx', code);
console.log('Patched FinanceLancamentos.tsx');
