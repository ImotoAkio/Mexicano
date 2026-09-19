const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

const regex = /export async function upsertPlanoDeConta\([\s\S]*?\]\n\s*\);\n\}/;

const replaceFunc = `export async function upsertPlanoDeConta(p: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query(
    \`INSERT INTO PlanosDeContas (id, codigoContabil, descricao, tipo, empresa, status, parentId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       codigoContabil=VALUES(codigoContabil), descricao=VALUES(descricao), tipo=VALUES(tipo),
       empresa=VALUES(empresa), status=VALUES(status), parentId=VALUES(parentId), updatedAt=VALUES(updatedAt)\`,
    [
      p.id, p.codigoContabil, p.descricao, p.tipo, p.empresa, p.status, p.parentId || null, p.createdAt, p.updatedAt
    ]
  );
}`;

code = code.replace(regex, replaceFunc);
fs.writeFileSync('server-db.ts', code);
console.log('Fixed upsertPlanoDeConta with regex');
