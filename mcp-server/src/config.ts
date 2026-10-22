import dotenv from "dotenv";

dotenv.config();

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
    port: parseInt(cleanEnv(process.env.MCP_PORT) || "3001", 10),
    apiKey: cleanEnv(process.env.MCP_API_KEY) || "",
    defaultEmpresa: cleanEnv(process.env.MCP_DEFAULT_EMPRESA) || "Todos",
    maxLimit: 50,
    defaultLimit: 20,
  },
};
