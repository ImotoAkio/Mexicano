const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

// Replace all corrupted insertions
code = code.replace(/acessoriosSolicitados: r\.acessoriosSolicitados \? \(typeof r\.acessoriosSolicitados === "string" \? JSON\.parse\(r\.acessoriosSolicitados\) : r\.acessoriosSolicitados\) : undefined,/g, 'acessoriosSolicitados,');

// Insert it where it belongs, in the first map of parsedReservations
// which is line ~1305
const targetStr = `      fotosChecklistDescida,
      fotosChecklistSubida,`;

const replaceStr = `      fotosChecklistDescida,
      fotosChecklistSubida,
      acessoriosSolicitados: r.acessoriosSolicitados ? (typeof r.acessoriosSolicitados === "string" ? JSON.parse(r.acessoriosSolicitados) : r.acessoriosSolicitados) : undefined,`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('server-db.ts', code);
