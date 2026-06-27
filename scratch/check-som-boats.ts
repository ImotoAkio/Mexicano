import { getDbPool, initializeDatabase } from '../server-db.ts';

async function main() {
  await initializeDatabase();
  const pool = getDbPool();
  if (!pool) {
    console.error("No database pool.");
    process.exit(1);
  }
  const [boatsWithSom] = await pool.query("SELECT id, nome, numero, modelo, fabricante, temSom FROM Embarcacoes WHERE temSom = 1");
  console.log("Boats with temSom = 1:");
  console.log(JSON.stringify(boatsWithSom, null, 2));

  const [controlesSom] = await pool.query("SELECT DISTINCT embarcacaoId FROM ControlesSom");
  console.log("Unique boat IDs in ControlesSom table:");
  console.log(JSON.stringify(controlesSom, null, 2));

  if (controlesSom.length > 0) {
    const ids = controlesSom.map((c: any) => c.embarcacaoId);
    const [boatsInControle] = await pool.query("SELECT id, nome, numero, modelo, fabricante FROM Embarcacoes WHERE id IN (?)", [ids]);
    console.log("Boats that have records in ControlesSom table:");
    console.log(JSON.stringify(boatsInControle, null, 2));
  }

  process.exit(0);
}

main().catch(console.error);
