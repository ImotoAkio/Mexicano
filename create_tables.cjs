const mysql = require('mysql2/promise'); 
async function run() { 
  const db = await mysql.createConnection({ host: '84.247.143.102', port: 13306, user: 'nautico_user', password: 'Akio2604*', database: 'gestao_nautica' }); 
  await db.query(`CREATE TABLE IF NOT EXISTS FuncionariosEPIs ( id VARCHAR(50) PRIMARY KEY, funcionarioId VARCHAR(50) NOT NULL, descricao VARCHAR(255), ca VARCHAR(50), quantidade VARCHAR(50), dataEntrega VARCHAR(50), dataDevolucao VARCHAR(50), status VARCHAR(50) DEFAULT 'pendente', geradoEm VARCHAR(50) ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`); 
  await db.query(`CREATE TABLE IF NOT EXISTS HistoricoEPIMensal ( id VARCHAR(50) PRIMARY KEY, funcionarioId VARCHAR(50) NOT NULL, mesAno VARCHAR(7) NOT NULL, dadosSnapshot JSON, dataEmissao VARCHAR(50) ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`); 
  console.log('Tables created'); 
  process.exit(0); 
} 
run().catch(console.error);
