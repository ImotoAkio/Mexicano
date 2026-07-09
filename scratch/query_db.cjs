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
    // 1. Get boat details
    const [boats] = await connection.query("SELECT * FROM Embarcacoes WHERE numero = '33' OR nome LIKE '%33%' OR id LIKE '%33%'");
    console.log("Boats matching '33':");
    console.log(boats);

    if (boats.length > 0) {
      const boatId = boats[0].id;
      // 2. Get maintenance records for this boat
      const [maintenances] = await connection.query("SELECT * FROM Manutencoes WHERE embarcacaoId = ?", [boatId]);
      console.log("\nMaintenance records for boat ID", boatId, ":");
      console.log(maintenances);
    }
  } catch (err) {
    console.error("Error running query:", err);
  } finally {
    await connection.end();
  }
}

run();
