const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

code = code.replace(/fotosChecklistSubidaStr,/, 'fotosChecklistSubidaStr,\n    acessoriosSolicitadosStr,');

fs.writeFileSync('server-db.ts', code);
