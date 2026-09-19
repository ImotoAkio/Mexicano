require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    await connection.query(
      `INSERT INTO ContasBancarias (id, nome, empresa, banco, agencia, conta, saldoInicial, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nome=VALUES(nome), empresa=VALUES(empresa), banco=VALUES(banco),
         agencia=VALUES(agencia), conta=VALUES(conta), saldoInicial=VALUES(saldoInicial),
         status=VALUES(status), updatedAt=VALUES(updatedAt)`,
      [
        null, 'Teste', 'Marina', 'Nu', '001', '123',
        0, 'ativo', new Date().toISOString(),
        new Date().toISOString()
      ]
    );
    console.log("Success");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await connection.end();
  }
}
run();
