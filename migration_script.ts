import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Opet123!',
    database: process.env.DB_NAME || 'mexicano_db'
  });

  console.log('Connected to DB. Running migrations...');

  try {
    // 1. Unify abastecimentoLitros
    await connection.query(`
      UPDATE Reservas 
      SET abastecimentoLitros = litrosAbastecidos 
      WHERE (abastecimentoLitros IS NULL OR abastecimentoLitros = '' OR abastecimentoLitros = '0') 
      AND litrosAbastecidos IS NOT NULL AND litrosAbastecidos != '' AND litrosAbastecidos != '0'
    `);
    console.log('Unificou abastecimentoLitros');

    // 2. TransacoesFinanceiras payments
    async function updateMethod(table, column, from, to) {
      await connection.query(`UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`, [to, from]);
    }
    await updateMethod('TransacoesFinanceiras', 'categoria', 'receita_combustivel', 'combustivel');
    await updateMethod('TransacoesFinanceiras', 'categoria', 'Combustivel', 'combustivel');
    await updateMethod('TransacoesFinanceiras', 'categoria', 'Abastecimento Marina', 'combustivel');

    // Nomes de método legados -> novos nas transações (formaPagamento / metodoPagamento)
    // Transacoes financeiras não tem formaPagamento, elas só tem ... vamos checar a estrutura
    // Mas no plano as Formas de Pagamento
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

run();
