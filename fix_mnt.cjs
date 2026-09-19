const fs = require('fs');
const filepath = 'server-routes/maintenance.routes.ts';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(/status:\s*'pendente'/g, "status: 'lancado'");
content = content.replace(/embarcacaoId:\s*data\.embarcacaoId,\s*createdAt:\s*new Date\(\)\.toISOString\(\)/g, 
  "embarcacaoId: data.embarcacaoId,\n              createdAt: new Date().toISOString(),\n              empresa: 'Marina'");

content = content.replace(/\}\s*else\s*\{\s*await\s+upsertTransacao\(transacaoBase,\s*connection\);\s*\}/g,
  `} else {
              // Adicionando tentativa de vincular cliente caso faltem donos na embarcacao
              const fbClienteId = boat ? (boat.clienteId || null) : null;
              await upsertTransacao({ ...transacaoBase, clienteId: fbClienteId }, connection);
            }`);

fs.writeFileSync(filepath, content, 'utf8');
console.log("maintenance.routes.ts patched.");
