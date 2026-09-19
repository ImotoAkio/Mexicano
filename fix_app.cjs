const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the type literal { client: any; boats: any[]; reservations: any[]; transacoes?: any[]; } with chamados string
code = code.replace(/\{ client: any; boats: any\[\]; reservations: any\[\]; transacoes\?: any\[\]; \}/, '{ client: any; boats: any[]; reservations: any[]; transacoes?: any[]; chamados?: any[]; }');

fs.writeFileSync('src/App.tsx', code);
