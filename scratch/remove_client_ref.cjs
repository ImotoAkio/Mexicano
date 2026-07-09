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
    console.log("Searching for transactions with 'Cliente Ref:' in descriptions...");

    // Get all transactions
    const [transactions] = await connection.query("SELECT id, descricao FROM TransacoesFinanceiras WHERE descricao LIKE '%Cliente Ref:%'");
    
    console.log(`Found ${transactions.length} transactions containing 'Cliente Ref:'.`);

    let updatedCount = 0;
    for (const tx of transactions) {
      if (tx.descricao) {
        // Strip " - Cliente Ref: <any name>" suffix
        let cleanedDesc = tx.descricao.replace(/\s*-\s*Cliente Ref:.*$/i, '');
        // If description is exactly "Cliente Ref: <any name>", make it empty
        cleanedDesc = cleanedDesc.replace(/^Cliente Ref:.*$/i, '');
        
        cleanedDesc = cleanedDesc.trim();

        if (tx.descricao !== cleanedDesc) {
          console.log(`Updating transaction ID ${tx.id}:\n  Before: "${tx.descricao}"\n  After:  "${cleanedDesc}"`);
          await connection.query("UPDATE TransacoesFinanceiras SET descricao = ? WHERE id = ?", [cleanedDesc, tx.id]);
          updatedCount++;
        }
      }
    }

    console.log(`Cleanup complete. Cleaned ${updatedCount} transactions.`);
  } catch (err) {
    console.error("Error during cleanup:", err);
  } finally {
    await connection.end();
  }
}

run();
