const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

if(!code.includes("CREATE TABLE IF NOT EXISTS CentrosDeCusto")) {
code = code.replace(
      "CREATE TABLE IF NOT EXISTS PlanosDeContas",
      "CREATE TABLE IF NOT EXISTS CentrosDeCusto (\n        id VARCHAR(50) PRIMARY KEY,\n        codigo VARCHAR(50),\n        descricao VARCHAR(255) NOT NULL,\n        tipo VARCHAR(20) NOT NULL,\n        empresa VARCHAR(50) DEFAULT 'Todos',\n        status VARCHAR(20) DEFAULT 'ativo',\n        createdAt VARCHAR(50) NOT NULL,\n        updatedAt VARCHAR(50) NOT NULL\n      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n    `);\n\n    try {\n        await connection.query(\"ALTER TABLE CentrosDeCusto CHANGE nome descricao VARCHAR(255) NOT NULL\");\n        await connection.query(\"ALTER TABLE CentrosDeCusto ADD COLUMN codigo VARCHAR(50)\");\n        await connection.query(\"ALTER TABLE CentrosDeCusto ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'despesa'\");\n        await connection.query(\"ALTER TABLE CentrosDeCusto ADD COLUMN status VARCHAR(20) DEFAULT 'ativo'\");\n        await connection.query(\"ALTER TABLE CentrosDeCusto DROP COLUMN ativo\");\n    } catch(e) {}\n\n    await connection.query(`\n      CREATE TABLE IF NOT EXISTS PlanosDeContas"
);
}

// Ensure the insert query is replaced
code = code.replace(
    /`INSERT INTO CentrosDeCusto \(id, nome, empresa, ativo, createdAt, updatedAt\)[\s\S]*?`/,
    `\`INSERT INTO CentrosDeCusto (id, codigo, descricao, tipo, empresa, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       codigo=VALUES(codigo), descricao=VALUES(descricao), tipo=VALUES(tipo), empresa=VALUES(empresa), status=VALUES(status), updatedAt=VALUES(updatedAt)\``
);

code = code.replace(
    /\[\s*c\.id,\s*c\.nome,\s*c\.empresa\s*\|\|\s*'Todos',\s*typeof\s*c\.ativo\s*===\s*'boolean'\s*\?\s*c\.ativo\s*:\s*true,\s*new Date\(\)\.toISOString\(\),\s*new Date\(\)\.toISOString\(\)\s*\]/,
    `[
      c.id, c.codigo || null, c.descricao, c.tipo || 'despesa', c.empresa || 'Todos', c.status || 'ativo',
      new Date().toISOString(), new Date().toISOString()
    ]`
);

code = code.replace(/SELECT \* FROM CentrosDeCusto ORDER BY nome ASC/g, "SELECT * FROM CentrosDeCusto ORDER BY descricao ASC");
code = code.replace(/SELECT \* FROM CentrosDeCusto WHERE empresa = \? ORDER BY nome ASC/g, "SELECT * FROM CentrosDeCusto WHERE empresa = ? ORDER BY descricao ASC");

fs.writeFileSync('server-db.ts', code);
