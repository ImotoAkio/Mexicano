const mysql = require('mysql2/promise');

async function clean() {
  try {
    const pool = mysql.createPool({
      host: "84.247.143.102",
      port: 13306,
      user: "nautico_user",
      password: "Akio2604*",
      database: "gestao_nautica",
    });

    console.log("Conectando e limpando tabela de transações financeiras e atividades...");
    await pool.query("DELETE FROM TransacoesFinanceiras");
    await pool.query("DELETE FROM AtividadesFinanceiras");
    
    // Update clients to reset statusFinanceiro since all transactions are deleted
    await pool.query("UPDATE Clientes SET statusFinanceiro = 'em_dia'");

    console.log("Banco de dados limpo com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("Erro:", err);
    process.exit(1);
  }
}

clean();
