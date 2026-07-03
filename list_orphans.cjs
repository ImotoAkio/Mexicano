const fs = require('fs');

async function main() {
  try {
    const fetch = require('node-fetch');
  } catch(e) {}
  
  const token = "a32c224d216aed881ba9d1950f802b65"; // Using local curl to the API
  
  // Actually, we can just connect to MySQL directly since we have the DB credentials in .env
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: "84.247.143.102",
    port: 13306,
    user: "nautico_user",
    password: "Akio2604*",
    database: "gestao_nautica"
  });

  const [clients] = await pool.query("SELECT id, nome FROM Clientes");
  const [boats] = await pool.query("SELECT id, nome FROM Embarcacoes");
  const [reservas] = await pool.query("SELECT * FROM Reservas");

  const clientIds = new Set(clients.map(c => c.id));
  const boatMap = new Map(boats.map(b => [b.id, b.nome]));

  const orphans = reservas.filter(r => !clientIds.has(r.clienteId));
  
  if (orphans.length === 0) {
    console.log("No orphaned reservations found.");
  } else {
    console.log(`Found ${orphans.length} orphaned reservations:`);
    orphans.forEach(r => {
      console.log(`Reserva ID: ${r.id}`);
      console.log(`Data: ${r.data} | Período: ${r.periodo}`);
      console.log(`Embarcação: ${boatMap.get(r.embarcacaoId) || r.embarcacaoId}`);
      console.log(`Cliente ID salvo: ${r.clienteId}`);
      console.log(`Google Event ID: ${r.googleEventId || 'N/A'}`);
      console.log(`Observações: ${r.observacoes || 'Nenhuma'}`);
      console.log('-----------------------------');
    });
  }
  
  pool.end();
}

main();
