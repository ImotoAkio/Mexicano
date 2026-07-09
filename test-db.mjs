import mysql from 'mysql2/promise';

async function run() {
  try {
    const pool = mysql.createPool({
      host: "84.247.143.102",
      user: "nautico_user",
      password: "Akio2604*",
      database: "gestao_nautica",
      port: 13306,
    });

    const [cols] = await pool.query("DESCRIBE Funcionarios");
    console.log("Columns:", cols.map(c => c.Field).join(", "));
    
    // Clean up
    
    // Check if it exists
    const [rows] = await pool.query("SELECT * FROM Funcionarios WHERE id = 'test_raw_2'");
    console.log("Found:", rows.length);
    
    // Clean up
    await pool.query("DELETE FROM Funcionarios WHERE id = 'test_raw_2'");
    
  } catch(e) {
    console.error("SQL Error:", e);
  }
  process.exit(0);
}
run();
