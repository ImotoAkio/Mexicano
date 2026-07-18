const { upsertReservation, getDbPool, initializeDatabase } = require('../dist/server-db.js');
const mysql = require('mysql2/promise');

async function test() {
  const dummyReserva = {
    id: 'res_test_123',
    embarcacaoId: 'emb_test',
    clienteId: 'cli_test',
    data: '2026-07-15',
    periodo: 'dia_inteiro',
    observacoes: 'Test observation',
    googleEventId: 'gevent_123',
    status: 'confirmado',
    createdAt: new Date().toISOString(),
    litrosAbastecidos: '10'
  };

  try {
    const pool = mysql.createPool({ host: '84.247.143.102', port: 13306, user: 'nautico_user', password: 'Akio2604*', database: 'gestao_nautica' });
    global.dbPool = pool;
    // mock getDbPool if needed but it's exported
    // wait, server-db uses `getDbPool()` which relies on the internal pool initialized by `setDbPool` or something.
    // Let's just require server-db and call initializeDatabase. But I need to provide process.env.
    process.env.DB_HOST = '84.247.143.102';
    process.env.DB_PORT = '13306';
    process.env.DB_USER = 'nautico_user';
    process.env.DB_PASSWORD = 'Akio2604*';
    process.env.DB_NAME = 'gestao_nautica';
    
    // Instead of using dist, I can just use ts-node or run plain insert directly to test the SQL query.
    await pool.query(`INSERT INTO Reservas (id, embarcacaoId, clienteId, data, periodo, status, createdAt, litrosAbastecidos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
      dummyReserva.id, dummyReserva.embarcacaoId, dummyReserva.clienteId, dummyReserva.data, dummyReserva.periodo, dummyReserva.status, dummyReserva.createdAt, dummyReserva.litrosAbastecidos
    ]);
    console.log('Inserted successfully!');
    
    // clean up
    await pool.query(`DELETE FROM Reservas WHERE id = 'res_test_123'`);
    console.log('Deleted successfully!');
    process.exit(0);
  } catch(e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

test();
