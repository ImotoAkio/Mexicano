const fs = require('fs');
let content = fs.readFileSync('server-db.ts', 'utf8');

const target = `    try {
      await connection.query(\`ALTER TABLE Reservas ADD COLUMN confirmacaoEnviada TINYINT(1) DEFAULT 0;\`);
    } catch (e) {}

    // 4. ControlesSom Table`.replace(/\r\n/g, '\n');

const replacement = `    try {
      await connection.query(\`ALTER TABLE Reservas ADD COLUMN confirmacaoEnviada TINYINT(1) DEFAULT 0;\`);
    } catch (e) {}
    try {
      await connection.query(\`ALTER TABLE Reservas ADD COLUMN litrosAbastecidos VARCHAR(50);\`);
    } catch (e) {}

    // 4. ControlesSom Table`.replace(/\n/g, '\r\n'); // Write CRLF back just in case

content = content.replace(/\r\n/g, '\n');

if (content.includes(target)) {
  content = content.replace(target, replacement);
  // keep consistent newlines based on original
  fs.writeFileSync('server-db.ts', content, 'utf8');
  console.log('Successfully patched server-db.ts');
} else {
  console.log('Target not found in server-db.ts');
}
