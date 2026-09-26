const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

// 1. Remove the extra `acessoriosSolicitados,` from pullDatabase map
code = code.replace(/acessoriosSolicitados: r\.acessoriosSolicitados \? \(typeof r\.acessoriosSolicitados === "string" \? JSON\.parse\(r\.acessoriosSolicitados\) : r\.acessoriosSolicitados\) : undefined,\r?\n\s+acessoriosSolicitados,/, 'acessoriosSolicitados: r.acessoriosSolicitados ? (typeof r.acessoriosSolicitados === "string" ? JSON.parse(r.acessoriosSolicitados) : r.acessoriosSolicitados) : undefined,');

// 2. Fix upsertReservation:
// Define const acessoriosSolicitadosStr = reserva.acessoriosSolicitados ? JSON.stringify(reserva.acessoriosSolicitados) : null;
code = code.replace(/const fotosChecklistSubidaStr = reserva\.fotosChecklistSubida \? JSON\.stringify\(reserva\.fotosChecklistSubida\) : null;/, "const fotosChecklistSubidaStr = reserva.fotosChecklistSubida ? JSON.stringify(reserva.fotosChecklistSubida) : null;\n  const acessoriosSolicitadosStr = reserva.acessoriosSolicitados ? JSON.stringify(reserva.acessoriosSolicitados) : null;");

// Update VALUES in upsertReservation
code = code.replace(/\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)/, ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

// Add acessoriosSolicitados = VALUES(acessoriosSolicitados)
code = code.replace(/fotosChecklistSubida = VALUES\(fotosChecklistSubida\),/, "fotosChecklistSubida = VALUES(fotosChecklistSubida),\n      acessoriosSolicitados = VALUES(acessoriosSolicitados),");

fs.writeFileSync('server-db.ts', code);
