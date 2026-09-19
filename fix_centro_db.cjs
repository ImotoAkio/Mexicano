const fs = require('fs');

let code = fs.readFileSync('server-db.ts', 'utf8');

// 1. Rewrite the CentrosDeCusto creation query anywhere it exists or add it near PlanosDeContas.
// First remove old CentrosDeCusto schemas
code = code.replace(/CREATE TABLE IF NOT EXISTS CentrosDeCusto[\s\S]*?;/g, '');

// Insert after PlanosDeContas fallback creation
const tableQuery = `
    // 8.5 CentrosDeCusto Table
    await connection.query(\`
      CREATE TABLE IF NOT EXISTS CentrosDeCusto (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        empresa VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'ativo',
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    \`);`;

if (!code.includes('8.5 CentrosDeCusto Table')) {
    code = code.replace(/\/\/ 8b\. PlanosDeContas Table/, tableQuery + '\n\n    // 8b. PlanosDeContas Table');
}

// 2. Rewrite DB functions
const getAllRegex = /export async function getAllCentrosDeCusto[\s\S]*?\n\}/;
const getAllReplacement = `export async function getAllCentrosDeCusto(empresa?: string): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  if (empresa && empresa !== 'Todos') {
    const [rows] = await currentPool.query("SELECT * FROM CentrosDeCusto WHERE empresa = ? ORDER BY nome ASC", [empresa]);
    return rows as any[];
  }
  const [rows] = await currentPool.query("SELECT * FROM CentrosDeCusto ORDER BY nome ASC");
  return rows as any[];
}`;

const upsertRegex = /export async function upsertCentroDeCusto[\s\S]*?\n\}/;
const upsertReplacement = `export async function upsertCentroDeCusto(p: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query(
    \`INSERT INTO CentrosDeCusto (id, nome, empresa, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nome=VALUES(nome), empresa=VALUES(empresa), status=VALUES(status), updatedAt=VALUES(updatedAt)\`,
    [p.id, p.nome, p.empresa, p.status, p.createdAt, p.updatedAt]
  );
}`;

code = code.replace(getAllRegex, getAllReplacement);
code = code.replace(upsertRegex, upsertReplacement);

fs.writeFileSync('server-db.ts', code);
console.log('schema updated');