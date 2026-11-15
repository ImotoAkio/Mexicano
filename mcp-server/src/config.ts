import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env local (mcp-server/.env) e fallback do diretório raiz (../.env)
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const cleanEnv = (val?: string) => (val ? val.replace(/^['"]|['"]$/g, "").trim() : "");

export const config = {
  db: {
    host: cleanEnv(process.env.DB_HOST) || "localhost",
    port: parseInt(cleanEnv(process.env.DB_PORT) || "3306", 10),
    user: cleanEnv(process.env.DB_USER) || "root",
    password: cleanEnv(process.env.DB_PASSWORD) || "",
    database: cleanEnv(process.env.DB_NAME) || "gestao_nautica",
  },
  mcp: {
    host: cleanEnv(process.env.MCP_HOST) || "0.0.0.0",
    port: parseInt(cleanEnv(process.env.MCP_PORT) || "3001", 10),
    apiKey: cleanEnv(process.env.MCP_API_KEY) || "",
    defaultEmpresa: cleanEnv(process.env.MCP_DEFAULT_EMPRESA) || "Todos",
    maxLimit: 50,
    defaultLimit: 20,
  },
  evolution: {
    apiUrl: cleanEnv(process.env.EVOLUTION_API_URL) || "",
    apiKey: cleanEnv(process.env.EVOLUTION_API_KEY) || "",
    instance: cleanEnv(process.env.EVOLUTION_INSTANCE) || "mexicano",
  },
};
