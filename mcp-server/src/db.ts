import mysql from "mysql2/promise";
import { config } from "./config.js";

let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool {
  if (pool) return pool;

  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  return pool;
}

/**
 * Executa uma consulta SQL em modo ESTRITAMENTE SOMENTE LEITURA.
 * Valida que o comando começa com SELECT ou WITH (para CTEs de leitura),
 * bloqueando em nível de código qualquer tentativa de escrita.
 */
export async function queryReadOnly<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const normalizedSql = sql.trim().toUpperCase();

  // Defesa em profundidade: bloqueio rigoroso de comandos de mutação
  const forbiddenKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "RENAME",
    "REPLACE",
    "GRANT",
    "REVOKE",
  ];

  for (const keyword of forbiddenKeywords) {
    // Verifica se a palavra-chave aparece como comando isolado no início ou após quebra
    const regex = new RegExp(`(^|[\\s;])${keyword}\\b`, "i");
    if (regex.test(normalizedSql)) {
      throw new Error(
        `[MCP Security Violation] Operação proibida detectada: ${keyword}. Use apenas tools de ação homologadas.`
      );
    }
  }

  if (!normalizedSql.startsWith("SELECT") && !normalizedSql.startsWith("WITH") && !normalizedSql.startsWith("SHOW")) {
    throw new Error(
      `[MCP Security Violation] Apenas consultas de leitura (SELECT) são permitidas em queryReadOnly.`
    );
  }

  const currentPool = getDbPool();
  const [rows] = await currentPool.query(sql, params);
  return rows as T[];
}

/**
 * Executa uma transação controlada exclusivamente para operações homologadas de escrita (ex: Reservas).
 */
export async function withControlledTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const currentPool = getDbPool();
  const conn = await currentPool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Busca um valor de configuração da tabela Config (ex: notif_sandbox_ativa, marina_datas_fechadas).
 */
export async function getConfigValue(chave: string): Promise<string | null> {
  try {
    const rows = await queryReadOnly<{ valor: string }>(
      "SELECT valor FROM Config WHERE chave = ? LIMIT 1",
      [chave]
    );
    return rows[0]?.valor ?? null;
  } catch {
    return null;
  }
}

export async function checkDbConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const currentPool = getDbPool();
    const conn = await currentPool.getConnection();
    await conn.ping();
    conn.release();
    return { connected: true, message: "Conectado com sucesso ao MariaDB/MySQL." };
  } catch (err: any) {
    return { connected: false, message: `Erro ao conectar no banco: ${err.message || err}` };
  }
}
