import { initializeDatabase, resetFuelDataInDb } from '../server-db';

async function run() {
  try {
    await initializeDatabase();
    await resetFuelDataInDb();
    console.log('SUCCESS_FUEL_DB_RESET');
    process.exit(0);
  } catch (err) {
    console.error('ERROR_FUEL_DB_RESET:', err);
    process.exit(1);
  }
}

run();
