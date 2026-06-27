import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log("Limpiando registros de checklists nas Reservas...");
    await connection.execute(`
      UPDATE Reservas 
      SET fotosChecklistSaida = NULL,
          fotosChecklistChegada = NULL,
          fotosChecklistDescida = NULL,
          statusMarina = NULL,
          horaDescida = NULL,
          horaSaida = NULL,
          horaChegada = NULL,
          operadorDescida = NULL,
          operadorSaida = NULL,
          operadorChegada = NULL
    `);
    
    console.log("Deletando abastecimentos...");
    await connection.execute(`
      DELETE FROM TransacoesFinanceiras 
      WHERE categoria = 'Combustível'
    `);

    console.log("Limpeza concluída com sucesso.");
  } catch(e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
