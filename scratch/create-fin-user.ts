import { createAdmin, initializeDatabase } from '../server-db.ts';
import bcrypt from 'bcryptjs';

async function main() {
  await initializeDatabase();
  const hash = await bcrypt.hash('123', 12);
  try {
    await createAdmin('fin', hash, 'financeiro');
    console.log('User fin created successfully');
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') {
      console.log('User fin already exists.');
    } else {
      console.error(e);
    }
  }
  process.exit(0);
}

main().catch(console.error);
