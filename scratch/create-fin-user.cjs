const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'sua_senha_do_banco',
    database: process.env.DB_NAME || 'gestao_nautica'
  });

  const hash = await bcrypt.hash('123', 12);
  try {
    const [rows] = await connection.query("SELECT * FROM AdminUsers WHERE username = 'fin'");
    if (rows.length === 0) {
      await connection.query(
        "INSERT INTO AdminUsers (username, passwordHash, role) VALUES (?, ?, ?)",
        ['fin', hash, 'financeiro']
      );
      console.log('User fin created successfully');
    } else {
      console.log('User fin already exists.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
