const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

code = code.replace(
  /acessoriosSolicitados: r\.acessoriosSolicitados \? \(typeof r\.acessoriosSolicitados === "string" \? JSON\.parse\(r\.acessoriosSolicitados\) : r\.acessoriosSolicitados\) : undefined,/,
  'acessoriosSolicitados,'
);

fs.writeFileSync('server-db.ts', code);
