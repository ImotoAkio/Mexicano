const mysql = require('mysql2/promise');
async function run() {
  const db = await mysql.createConnection({ host: '84.247.143.102', port: 13306, user: 'nautico_user', password: 'Akio2604*', database: 'gestao_nautica' });
  try {
    await db.query('ALTER TABLE Reservas ADD COLUMN litrosAbastecidos VARCHAR(50);');
    console.log('Added litrosAbastecidos column');
  } catch (err) {
    console.log('Error or already exists:', err.message);
  }
  process.exit(0);
}
run().catch(console.error);
