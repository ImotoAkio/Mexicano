const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server-db.ts');
let content = fs.readFileSync(dbPath, 'utf8');

// 1. Add tables and migration
const initSearch = `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    \`);

    try {
      const [existingEPIs]`;

const initReplace = `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS ClienteEmpresas (
        clienteId VARCHAR(50) NOT NULL,
        empresa VARCHAR(50) NOT NULL,
        PRIMARY KEY (clienteId, empresa),
        FOREIGN KEY (clienteId) REFERENCES Clientes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS EmbarcacaoEmpresas (
        embarcacaoId VARCHAR(50) NOT NULL,
        empresa VARCHAR(50) NOT NULL,
        PRIMARY KEY (embarcacaoId, empresa),
        FOREIGN KEY (embarcacaoId) REFERENCES Embarcacoes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    \`);

    try {
      await connection.query(\`
        INSERT INTO ClienteEmpresas (clienteId, empresa)
        SELECT id, 'VALE' FROM Clientes
        WHERE id NOT IN (SELECT clienteId FROM ClienteEmpresas)
      \`);
      await connection.query(\`
        INSERT INTO EmbarcacaoEmpresas (embarcacaoId, empresa)
        SELECT id, 'VALE' FROM Embarcacoes
        WHERE id NOT IN (SELECT embarcacaoId FROM EmbarcacaoEmpresas)
      \`);
      console.log("✅ Multi-company associations migrated for existing records.");
    } catch(migErr) {
      console.warn("Failed to migrate multi-company associations:", migErr);
    }

    try {
      const [existingEPIs]`;
content = content.replace(initSearch, initReplace);

// 2. pullDatabase logic
const pullDbSearch = `const [clients] = await currentPool.query("SELECT * FROM Clientes");
  const [boats] = await currentPool.query("SELECT * FROM Embarcacoes");`;

const pullDbReplace = `const [clients] = await currentPool.query("SELECT * FROM Clientes");
  const [boats] = await currentPool.query("SELECT * FROM Embarcacoes");
  const [clienteEmpresas] = await currentPool.query("SELECT * FROM ClienteEmpresas");
  const [embarcacaoEmpresas] = await currentPool.query("SELECT * FROM EmbarcacaoEmpresas");

  const clienteEmpresasMap = new Map<string, string[]>();
  (clienteEmpresas as any[]).forEach(row => {
    if (!clienteEmpresasMap.has(row.clienteId)) clienteEmpresasMap.set(row.clienteId, []);
    clienteEmpresasMap.get(row.clienteId)!.push(row.empresa);
  });

  const embarcacaoEmpresasMap = new Map<string, string[]>();
  (embarcacaoEmpresas as any[]).forEach(row => {
    if (!embarcacaoEmpresasMap.has(row.embarcacaoId)) embarcacaoEmpresasMap.set(row.embarcacaoId, []);
    embarcacaoEmpresasMap.get(row.embarcacaoId)!.push(row.empresa);
  });`;
content = content.replace(pullDbSearch, pullDbReplace);

const clientMapSearch = `const fin = finMap.get(c.id) || { totalCnt: 0, openCnt: 0, overdueCnt: 0 };
    return {
      ...c,`;
const clientMapReplace = `const fin = finMap.get(c.id) || { totalCnt: 0, openCnt: 0, overdueCnt: 0 };
    return {
      ...c,
      empresas: clienteEmpresasMap.get(c.id) || ['VALE'],`;
content = content.replace(clientMapSearch, clientMapReplace);

const boatMapSearch = `return {
      ...b,
      chassi: b.chassi || '',`;
const boatMapReplace = `return {
      ...b,
      empresas: embarcacaoEmpresasMap.get(b.id) || ['VALE'],
      chassi: b.chassi || '',`;
content = content.replace(boatMapSearch, boatMapReplace);


// 3. upsertClient
const upsertClientSearch = `    client.categoriaHabilitacao || null
  ]);
}`;
const upsertClientReplace = `    client.categoriaHabilitacao || null
  ]);

  if (client.empresas && Array.isArray(client.empresas)) {
    await currentPool.query("DELETE FROM ClienteEmpresas WHERE clienteId = ?", [client.id]);
    if (client.empresas.length > 0) {
      const values = client.empresas.map((e: string) => [client.id, e]);
      await currentPool.query("INSERT INTO ClienteEmpresas (clienteId, empresa) VALUES ?", [values]);
    }
  }
}`;
content = content.replace(upsertClientSearch, upsertClientReplace);

// 4. upsertBoat
const upsertBoatSearch = `    acessoriosJson
  ]);
}`;
const upsertBoatReplace = `    acessoriosJson
  ]);

  if (boat.empresas && Array.isArray(boat.empresas)) {
    await currentPool.query("DELETE FROM EmbarcacaoEmpresas WHERE embarcacaoId = ?", [boat.id]);
    if (boat.empresas.length > 0) {
      const values = boat.empresas.map((e: string) => [boat.id, e]);
      await currentPool.query("INSERT INTO EmbarcacaoEmpresas (embarcacaoId, empresa) VALUES ?", [values]);
    }
  }
}`;
content = content.replace(upsertBoatSearch, upsertBoatReplace);

// 5. deleteClient
const deleteClientSearch = `  await currentPool.query("DELETE FROM Clientes WHERE id = ?", [id]);
}`;
const deleteClientReplace = `  await currentPool.query("DELETE FROM ClienteEmpresas WHERE clienteId = ?", [id]);
  await currentPool.query("DELETE FROM Clientes WHERE id = ?", [id]);
}`;
content = content.replace(deleteClientSearch, deleteClientReplace);

// 6. deleteBoat
const deleteBoatSearch = `  await currentPool.query("DELETE FROM Embarcacoes WHERE id = ?", [id]);
}`;
const deleteBoatReplace = `  await currentPool.query("DELETE FROM EmbarcacaoEmpresas WHERE embarcacaoId = ?", [id]);
  await currentPool.query("DELETE FROM Embarcacoes WHERE id = ?", [id]);
}`;
content = content.replace(deleteBoatSearch, deleteBoatReplace);


fs.writeFileSync(dbPath, content, 'utf8');
console.log("server-db.ts patched successfully!");
