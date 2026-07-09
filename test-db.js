import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306'),
    });

    const query = \`
    INSERT INTO Funcionarios (
      id, nome, cargo, setor, cpf, admissao, rg, rgEmissao, rgOrgao, rgUF, ctps, pis, dataNascimento, estadoCivil, filiacao, conjugue, grauInstrucao, primeiroEmprego, contratoExperiencia, endereco, numero, cep, cidade, estado, telefone, contatoEmergencia, salarioBase, dadosBancarios, tamanhoCalca, tamanhoCamisa, tamanhoBota, tamanhoCinto, usuarioId, turnos, createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`;

    const values = [
      "test_raw", "Teste Nome", "Cargo", "Setor", null, null, null, null, null, null,
      null, null, null, null, null, null, null, 1, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null, null, null, new Date().toISOString()
    ];

    console.log("Executing query with", values.length, "values");
    await pool.query(query, values);
    console.log("Success! Inserted test_raw");
    
    // Check if it exists
    const [rows] = await pool.query("SELECT * FROM Funcionarios WHERE id = 'test_raw'");
    console.log("Found:", rows.length);
    
    // Clean up
    await pool.query("DELETE FROM Funcionarios WHERE id = 'test_raw'");
    
  } catch(e) {
    console.error("SQL Error:", e);
  }
  process.exit(0);
}
run();
