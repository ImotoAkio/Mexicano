const mysql = require('mysql2/promise');
async function run() {
  const db = await mysql.createConnection({ host: '84.247.143.102', port: 13306, user: 'nautico_user', password: 'Akio2604*', database: 'gestao_nautica' });
  const [rows] = await db.query('DESCRIBE Reservas;');
  console.log(rows.map(r => r.Field));
  process.exit(0);
}
run().catch(console.error);
