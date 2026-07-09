import { createAdmin, initDatabase } from './server-db.js';
import bcrypt from 'bcrypt';

async function main() {
  await initDatabase();
  const hash = await bcrypt.hash('marina123', 12);
  await createAdmin('marina', hash, 'marina');
  console.log('User marina created successfully');
  process.exit(0);
}

main().catch(console.error);
