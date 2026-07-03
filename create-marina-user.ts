import { createAdmin, initializeDatabase } from './server-db.ts';
import bcrypt from 'bcryptjs';

async function main() {
  await initializeDatabase();
  const hash = await bcrypt.hash('marina123', 12);
  try {
    await createAdmin('marina', hash, 'marina');
    console.log('User marina created successfully');
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') {
      console.log('User marina already exists.');
    } else {
      console.error(e);
    }
  }
  process.exit(0);
}

main().catch(console.error);
