import { upsertFuncionario, getDbPool } from './server-db.ts';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
dotenv.config();

// Initialize pool manually for test
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function test() {
  try {
    const { initializeDatabase, pullDatabase } = require('./server-db.ts');
    // Just inject the pool globally (mock)
    globalThis.__mysqlPool = pool; 
    
    await upsertFuncionario({
      id: "test_123",
      nome: "Test",
      cargo: "Tester",
      setor: "IT",
      cpf: "123",
      createdAt: new Date().toISOString()
    });
    console.log("Success!");
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
  process.exit(0);
}

// patch getDbPool mock
const mod = require('./server-db.ts');
mod.getDbPool = () => pool;

test();
