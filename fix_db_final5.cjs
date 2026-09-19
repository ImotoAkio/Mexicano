const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

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
console.log('Inserted missing DB methods');
