const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

const createPlanos = `
    // 8b. PlanosDeContas Table
    await connection.query(\`
      CREATE TABLE IF NOT EXISTS PlanosDeContas (
        id VARCHAR(50) PRIMARY KEY,
        codigoContabil VARCHAR(50),
        descricao VARCHAR(255) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        empresa VARCHAR(50) DEFAULT 'Todos',
        status VARCHAR(20) DEFAULT 'ativo',
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    \`);
`;

const createCentros = `
    // 8x. CentrosDeCusto Table
    await connection.query(\`
      CREATE TABLE IF NOT EXISTS CentrosDeCusto (
        id VARCHAR(50) PRIMARY KEY,
        codigo VARCHAR(50),
        descricao VARCHAR(255) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        empresa VARCHAR(50) DEFAULT 'Todos',
        status VARCHAR(20) DEFAULT 'ativo',
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    \`);

    // In case they exist and need schema upgrade
    try {
        await connection.query("ALTER TABLE CentrosDeCusto CHANGE nome descricao VARCHAR(255) NOT NULL");
        await connection.query("ALTER TABLE CentrosDeCusto ADD COLUMN codigo VARCHAR(50)");
        await connection.query("ALTER TABLE CentrosDeCusto ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'despesa'");
        await connection.query("ALTER TABLE CentrosDeCusto ADD COLUMN status VARCHAR(20) DEFAULT 'ativo'");
    } catch(e) {}
`;

if (code.includes(createPlanos.trim())) {
  code = code.replace(createPlanos.trim(), createPlanos.trim() + '\n\n' + createCentros.trim());
}

// Fix queries
code = code.replace(/SELECT \* FROM CentrosDeCusto ORDER BY nome ASC/g, "SELECT * FROM CentrosDeCusto ORDER BY descricao ASC");
code = code.replace(
`    \`INSERT INTO CentrosDeCusto (id, nome, empresa, ativo, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nome=VALUES(nome), empresa=VALUES(empresa), ativo=VALUES(ativo), updatedAt=VALUES(updatedAt)\`,
    [
      c.id, c.nome, c.empresa || 'Todos', typeof c.ativo === 'boolean' ? c.ativo : true,
      new Date().toISOString(), new Date().toISOString()
    ]`,

`    \`INSERT INTO CentrosDeCusto (id, codigo, descricao, tipo, empresa, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       codigo=VALUES(codigo), descricao=VALUES(descricao), tipo=VALUES(tipo), empresa=VALUES(empresa), status=VALUES(status), updatedAt=VALUES(updatedAt)\`,
    [
      c.id, c.codigo || null, c.descricao, c.tipo || 'despesa', c.empresa || 'Todos', c.status || 'ativo',
      new Date().toISOString(), new Date().toISOString()
    ]`
);

fs.writeFileSync('server-db.ts', code);
