const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log("Auditing boat maintenance status...");

    // Get all boats
    const [boats] = await connection.query("SELECT id, nome, emManutencao FROM Embarcacoes");
    
    // Get all active maintenances
    const [activeMaintenances] = await connection.query("SELECT DISTINCT embarcacaoId FROM Manutencoes WHERE status = 'em_andamento'");
    const activeBoatIds = new Set(activeMaintenances.map(m => m.embarcacaoId));

    console.log("Active maintenance boat IDs in DB:", Array.from(activeBoatIds));

    let fixedCount = 0;
    for (const boat of boats) {
      const shouldBeInMaintenance = activeBoatIds.has(boat.id) ? 1 : 0;
      const currentStatus = boat.emManutencao;

      if (currentStatus !== shouldBeInMaintenance) {
        console.log(`Boat ${boat.nome} (ID: ${boat.id}): emManutencao is ${currentStatus}, but should be ${shouldBeInMaintenance}. Fixing...`);
        await connection.query("UPDATE Embarcacoes SET emManutencao = ? WHERE id = ?", [shouldBeInMaintenance, boat.id]);
        fixedCount++;
      }
    }

    console.log(`Audit complete. Fixed ${fixedCount} boats.`);
  } catch (err) {
    console.error("Error during audit/fix:", err);
  } finally {
    await connection.end();
  }
}

run();
