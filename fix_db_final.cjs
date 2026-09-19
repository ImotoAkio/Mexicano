const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

// 1. ALTER PlanosDeContas to include parentId
if (!code.includes('ALTER TABLE PlanosDeContas ADD COLUMN parentId')) {
  const alterPlanos = `
    try {
      await connection.query('ALTER TABLE PlanosDeContas ADD COLUMN parentId VARCHAR(50) NULL;');
    } catch (e) {}

    // CentrosCusto
    await connection.query(\`
      CREATE TABLE IF NOT EXISTS CentrosDeCusto (
        id VARCHAR(50) PRIMARY KEY,
        codigo VARCHAR(50),
        descricao VARCHAR(255) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        empresa VARCHAR(50) DEFAULT 'Todos',
        status VARCHAR(20) DEFAULT 'ativo',
        parentId VARCHAR(50),
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    \`);
`;
  code = code.replace(
    'try {\n      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN comprovante',
    alterPlanos + '\n    try {\n      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN comprovante'
  );
}

// 2. update upsertPlanoDeConta
const upsertPlanoRegex = /export async function upsertPlanoDeConta\([\s\S]*?\[\n\s*p\.id, p\.codigoContabil, p\.descricao, p\.tipo, p\.empresa, p\.status, p\.createdAt, p\.updatedAt\n\s*\]\n\s*\);/;
code = code.replace(upsertPlanoRegex, `export async function upsertPlanoDeConta(p: any): Promise<void> {
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
  );`);

// 3. Add CentrosDeCusto methods
if (!code.includes('export async function getAllCentrosDeCusto')) {
const centrosMethods = `
// ──────────── Centros de Custo ────────────

export async function getAllCentrosDeCusto(empresa?: string): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  if (empresa) {
    const [rows] = await currentPool.query("SELECT * FROM CentrosDeCusto WHERE empresa = ? ORDER BY descricao ASC", [empresa]);
    return rows as any[];
  }
  const [rows] = await currentPool.query("SELECT * FROM CentrosDeCusto ORDER BY descricao ASC");
  return rows as any[];
}

export async function upsertCentroDeCusto(p: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query(
    \`INSERT INTO CentrosDeCusto (id, codigo, descricao, tipo, empresa, status, parentId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       codigo=VALUES(codigo), descricao=VALUES(descricao), tipo=VALUES(tipo),
       empresa=VALUES(empresa), status=VALUES(status), parentId=VALUES(parentId), updatedAt=VALUES(updatedAt)\`,
    [
      p.id, p.codigo, p.descricao, p.tipo, p.empresa, p.status, p.parentId || null, p.createdAt, p.updatedAt
    ]
  );
}

export async function deleteCentroDeCusto(id: string): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM CentrosDeCusto WHERE id = ?", [id]);
}
`;

  code = code.replace(
    '// ──────────── Fornecedores ────────────',
    centrosMethods + '\n// ──────────── Fornecedores ────────────'
  );
}

fs.writeFileSync('server-db.ts', code);
console.log('Database updated!');
