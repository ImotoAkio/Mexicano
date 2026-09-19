const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

if (!code.includes('CREATE TABLE IF NOT EXISTS CentrosDeCusto')) {
const target = '    try {\n      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN comprovante VARCHAR(255) NULL;`);';
const idx = code.indexOf(target);
if (idx > -1) {
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
  code = code.substring(0, idx) + alterPlanos + '\n' + code.substring(idx);
}
}
fs.writeFileSync('server-db.ts', code);
console.log('Fixed DB Table creation!');
