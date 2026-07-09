const fs = require('fs');

// Patch server-db.ts
let dbContent = fs.readFileSync('c:/mexicano/server-db.ts', 'utf8');

// 1. Table Creation
const tableCreationSearch = `      CREATE TABLE IF NOT EXISTS Notificacoes (`;
const tableCreationReplace = `      CREATE TABLE IF NOT EXISTS FuncionariosEPIs (
        id VARCHAR(50) PRIMARY KEY,
        funcionarioId VARCHAR(50) NOT NULL,
        descricao VARCHAR(255) NOT NULL,
        ca VARCHAR(50),
        quantidade INT,
        dataEntrega VARCHAR(20),
        dataDevolucao VARCHAR(20),
        geradoEm VARCHAR(50) NOT NULL,
        INDEX(funcionarioId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS Notificacoes (`;
dbContent = dbContent.replace(tableCreationSearch, tableCreationReplace);

// 2. pullDatabase
const pullSearch = `  const [funcionarios] = await currentPool.query("SELECT * FROM Funcionarios ORDER BY createdAt DESC");
  const [folgas] = await currentPool.query("SELECT * FROM Folgas ORDER BY data DESC");`;
const pullReplace = `  const [funcionarios] = await currentPool.query("SELECT * FROM Funcionarios ORDER BY createdAt DESC");
  const [folgas] = await currentPool.query("SELECT * FROM Folgas ORDER BY data DESC");
  const [epis] = await currentPool.query("SELECT * FROM FuncionariosEPIs ORDER BY geradoEm DESC");`;
dbContent = dbContent.replace(pullSearch, pullReplace);

const pullReturnSearch = `    funcionarios: (funcionarios as any[]).map(f => ({...f, turnos: f.turnos ? JSON.parse(f.turnos) : [], primeiroEmprego: f.primeiroEmprego === 1})),
    folgas,`;
const pullReturnReplace = `    funcionarios: (funcionarios as any[]).map(f => ({...f, turnos: f.turnos ? JSON.parse(f.turnos) : [], primeiroEmprego: f.primeiroEmprego === 1})),
    folgas,
    epis,`;
dbContent = dbContent.replace(pullReturnSearch, pullReturnReplace);

// 3. Methods
const methodsSearch = `export async function deleteFuncionario(id: string) {`;
const methodsReplace = `export async function upsertEPI(funcionarioId: string, e: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  const query = \`
    INSERT INTO FuncionariosEPIs (id, funcionarioId, descricao, ca, quantidade, dataEntrega, dataDevolucao, geradoEm)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      descricao = VALUES(descricao), ca = VALUES(ca), quantidade = VALUES(quantidade), dataEntrega = VALUES(dataEntrega), dataDevolucao = VALUES(dataDevolucao)
  \`;
  const values = [
    e.id, funcionarioId, e.descricao, e.ca || null, e.quantidade || 1, e.dataEntrega || null, e.dataDevolucao || null, e.geradoEm || new Date().toISOString()
  ];
  await currentPool.query(query, values);
}

export async function deleteEPI(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM FuncionariosEPIs WHERE id = ?", [id]);
}

export async function deleteFuncionario(id: string) {`;
dbContent = dbContent.replace(methodsSearch, methodsReplace);

fs.writeFileSync('c:/mexicano/server-db.ts', dbContent);


// Patch server.ts
let serverContent = fs.readFileSync('c:/mexicano/server.ts', 'utf8');

const routeSearch = `// Route: Operacional - Funcionarios`;
const routeReplace = `// Route: Operacional - EPIs
app.post("/api/funcionarios/:id/epis", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const { id, ...epiData } = req.body;
    const finalId = id || \`epi_\${Date.now()}\`;
    await import('./server-db.js').then(m => m.upsertEPI(req.params.id, { ...epiData, id: finalId }));
    res.json({ success: true, id: finalId });
  } catch (err: any) {
    console.error("[EPI Save Error]", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

app.delete("/api/epis/:id", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    await import('./server-db.js').then(m => m.deleteEPI(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    console.error("[EPI Delete Error]", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

// Route: Operacional - Funcionarios`;

serverContent = serverContent.replace(routeSearch, routeReplace);
fs.writeFileSync('c:/mexicano/server.ts', serverContent);

console.log('Patched EPI APIs');
