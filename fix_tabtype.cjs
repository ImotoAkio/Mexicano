const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/type TabType = 'dp-dashboard'/, 
  "type TabType = 'finance-dashboard' | 'finance-fluxo' | 'finance-recorrencia' | 'finance-cadastros' | 'finance-relatorios' | 'dp-dashboard'");

fs.writeFileSync('src/App.tsx', code);
