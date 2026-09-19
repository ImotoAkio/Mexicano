import { getDbPool } from "../server-db";

const pool = getDbPool();

async function check() {
    if (!pool) return;
    const [rows] = await pool.query('SELECT username, role FROM AdminUsers');
    console.log(rows);
    process.exit(0);
}
check();
