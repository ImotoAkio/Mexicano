const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the type literal 
code = code.replace(/\{ client: any; boats: any\[\]; reservations: any\[\]; transacoes\?: any\[\]; \}/g, '{ client: any; boats: any[]; reservations: any[]; transacoes?: any[]; chamados?: any[]; }');

fs.writeFileSync('src/App.tsx', code);
