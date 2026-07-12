const mysql = require('mysql2/promise'); 
async function run() { 
  const db = await mysql.createConnection({ host: '84.247.143.102', port: 13306, user: 'nautico_user', password: 'Akio2604*', database: 'gestao_nautica' }); 
  try {
    await db.query(`ALTER TABLE FuncionariosEPIs ADD COLUMN historicoTrocas JSON;`); 
    console.log('Column historicoTrocas added'); 
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') console.log('Column already exists');
    else console.error(err);
  }
  process.exit(0); 
} 
run().catch(console.error);
