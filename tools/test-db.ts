import { initializeDatabase } from '../server-db';

async function run() {
  try {
    await initializeDatabase();
    console.log("DB Init Success");
    process.exit(0);
  } catch (err) {
    console.error("DB Init Error:", err);
    process.exit(1);
  }
}

run();
