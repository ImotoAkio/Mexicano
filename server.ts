import express from "express";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { createServer as createViteServer } from "vite";
import { Server as SocketIOServer } from "socket.io";
import http from "http";
import https from "https";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import fs from "fs";
import crypto from "crypto";
import compression from "compression";
import { PDFParse } from "pdf-parse";
import { apiLimiter, authLimiter, sensitiveLimiter, whatsappLimiter, requireAdminAuth, requireClientAuth, requireAnyAuth, requireMarinaManagerOrAdminAuth } from "./server-routes/middlewares";
import clientRoutes from "./server-routes/client.routes";
import authRoutes from "./server-routes/auth.routes";
import financeiroRoutes from "./server-routes/financeiro.routes";
import webhookRoutes from "./server-routes/webhook.routes";
import { PDFDocument } from "pdf-lib";
import {
  getDbPool, getDbStatus, initializeDatabase, pullDatabase,
  upsertClient, deleteClient, upsertBoat, deleteBoat,
  upsertReservation, deleteReservation, bulkSyncDatabase,
  getConfigValue, setConfigValue, getClientByCpf,
  getAdminByUsername, getClientAuth, upsertClientAuth,
  getAllAdmins, createAdmin, updateAdmin, deleteAdmin,
  getAllTransacoes, upsertTransacao, deleteTransacao, syncClientFinancialStatus, syncMultipleClientsFinancialStatus, deleteAllTransacoes, deleteTransacoesByClientIds,
  getAllAtividades, upsertAtividade, deleteAtividade,
  getAllFeedbacks, upsertFeedback, deleteFeedback,
  upsertManutencao, deleteManutencao, getNextCodigoOS,
  upsertMecanico, deleteMecanico,
  getAllTiposManutencao, upsertTipoManutencao, deleteTipoManutencao,
  upsertFuncionario, deleteFuncionario,
  upsertFolga, deleteFolga,
  upsertEPI, deleteEPI, saveHistoricoEPI, upsertCatalogoEPI, deleteCatalogoEPI,
  getUserPreferences, upsertUserPreferences,
  getFuelInventoryFromDb, saveFuelInventoryInDb, getFuelHistoryFromDb, saveFuelHistoryInDb, resetFuelDataInDb,
  getAllChamados, upsertChamado, deleteChamado, getNextChamadoCode,
  getCaixaMarinaTransacoes, upsertCaixaMarinaTransacao, deleteCaixaMarinaTransacao,
  devolverColetesCaixaMarina, getCaixaMarinaFechamento, salvarCaixaMarinaFechamento,
  getAbastecimentosPendentesCaixa
} from "./server-db";
import { getOrRegisterAsaasCustomer, createAsaasCharge, getPixQrCode, createAsaasBulkCharge } from "./server-asaas";

// Load environment variables early
dotenv.config();

const cleanEnvStr = (val?: string) => val ? val.replace(/^['"]|['"]$/g, '').trim() : '';
if (process.env.EVOLUTION_API_URL) process.env.EVOLUTION_API_URL = cleanEnvStr(process.env.EVOLUTION_API_URL);
if (process.env.EVOLUTION_API_KEY) process.env.EVOLUTION_API_KEY = cleanEnvStr(process.env.EVOLUTION_API_KEY);
if (process.env.EVOLUTION_INSTANCE) process.env.EVOLUTION_INSTANCE = cleanEnvStr(process.env.EVOLUTION_INSTANCE);
if (process.env.APP_URL) process.env.APP_URL = cleanEnvStr(process.env.APP_URL);

process.on("uncaughtException", (err) => {
  console.error("FATAL UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("FATAL UNHANDLED REJECTION:", reason);
});

// HTTPS agent for Evolution API (may use self-signed cert)
const evolutionHttpsAgent = new https.Agent({ rejectUnauthorized: false });

// Helper: fetch com tolerância a certificados SSL autoassinados para a Evolution API (Usando https nativo para evitar bugs do undici/vite-node)
async function evolutionFetch(urlStr: string, options: RequestInit = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const isHttps = url.protocol === 'https:';
      const reqOptions = {
        method: options.method || 'GET',
        headers: options.headers as any || {},
        agent: isHttps ? evolutionHttpsAgent : undefined,
      };

      const req = (isHttps ? https : http).request(url, reqOptions, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const bodyBuffer = Buffer.concat(chunks);
          const response = {
            ok: res.statusCode && res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode || 500,
            statusText: res.statusMessage || '',
            headers: {
              get: (name: string) => res.headers[name.toLowerCase()]
            },
            text: async () => bodyBuffer.toString('utf-8'),
            json: async () => JSON.parse(bodyBuffer.toString('utf-8'))
          } as unknown as Response;
          resolve(response);
        });
      });

      req.on('error', reject);

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          req.destroy(new Error('Aborted'));
        });
      }

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// JWT secret — use env var or generate a random fallback (should be set in production)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET must be defined in environment.");
  process.exit(1);
}
const JWT_EXPIRY = "8h";
const JWT_CLIENT_EXPIRY = "30d";

// Create Express app
const app = express();
const httpServer = http.createServer(app);
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
app.set('trust proxy', 1);
const PORT = 3000;

// Security: Helmet HTTP headers (configured for SPA compatibility)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://frontend-cdn.perplexity.ai", "data:"],
      connectSrc: ["'self'", "https://www.googleapis.com", "https://api.open-meteo.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "ws:", "wss:"],
      imgSrc: ["'self'", "data:", "blob:", "https://api.qrserver.com", "https://*.ibb.co", "https://i.ibb.co"],
      upgradeInsecureRequests: null,
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: false,
}));

// CORS configuration - allow standard local development origins and production domain
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.5.152:3000"
];
if (process.env.APP_URL) {
  allowedOrigins.push(process.env.APP_URL);
  if (process.env.APP_URL.startsWith("https://")) {
    allowedOrigins.push(process.env.APP_URL.replace("https://", "http://"));
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://192.168.") || origin.includes("echo.dev.br")) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));

// Audit Logging Utility for LGPD Compliance (Art. 37)
export function writeAuditLog(userId: string, userRole: string, action: string, ip: string, details?: string) {
  const clientIp = ip || 'unknown';
  const timestamp = new Date().toISOString();
  const logEntry = `[AUDIT] IP: ${clientIp} | User: ${userId} (${userRole}) | Action: ${action} | Details: ${details || "N/A"}`;
  console.log(logEntry);
}

// Body parsing configurations
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Static uploads directory
const uploadsDir = path.join(process.cwd(), 'uploads');
const boatsUploadsDir = path.join(uploadsDir, 'boats');
const clientsUploadsDir = path.join(uploadsDir, 'clients');
const checklistUploadsDir = path.join(uploadsDir, 'checklists');
const comprovantesUploadsDir = path.join(uploadsDir, 'comprovantes');
const driveUploadsDir = path.join(uploadsDir, 'drive');
const boletosUploadsDir = path.join(uploadsDir, 'boletos');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(boatsUploadsDir)) fs.mkdirSync(boatsUploadsDir, { recursive: true });
if (!fs.existsSync(clientsUploadsDir)) fs.mkdirSync(clientsUploadsDir, { recursive: true });
if (!fs.existsSync(checklistUploadsDir)) fs.mkdirSync(checklistUploadsDir, { recursive: true });
if (!fs.existsSync(comprovantesUploadsDir)) fs.mkdirSync(comprovantesUploadsDir, { recursive: true });
if (!fs.existsSync(driveUploadsDir)) fs.mkdirSync(driveUploadsDir, { recursive: true });
if (!fs.existsSync(boletosUploadsDir)) fs.mkdirSync(boletosUploadsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, path) => {
    // Bloqueia execução de scripts nos arquivos enviados pelo cliente (Prevenção de XSS)
    res.set('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline';");
    // Força download (attachment) de extensões perigosas que o navegador tentaria renderizar
    if (path.match(/\.(html|htm|svg|xml|js|json|css)$/i)) {
      res.set('Content-Disposition', 'attachment');
      res.set('X-Content-Type-Options', 'nosniff');
    }
  }
}));

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600, // Permite navegação fluida e sincronização sem estourar limites
  message: { error: true, message: "Taxa de requisições excedida." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: true, message: "Taxa excedida para operação sensível." },
});

const whatsappLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: true, message: "Taxa excedida para disparos de WhatsApp." },
});

// Rate limiting on auth routes - max 50 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: true, message: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Cache loaded client
export let cachedAuthClient: JWT | null = null;
let lastUsedSAJson: string | null = null;

// Helper to load credentials and initialize standard Google Auth Client
export async function getGoogleAuthClient(): Promise<JWT | null> {
  const saJsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || await getConfigValue("google_service_account_json") || "";
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (cachedAuthClient && lastUsedSAJson === saJsonString && !clientEmail && !privateKey) {
    return cachedAuthClient;
  }

  let credentials: { client_email?: string; private_key?: string } = {};

  if (saJsonString) {
    try {
      credentials = JSON.parse(saJsonString);
    } catch (e1: any) {
      try {
        const cleaned = saJsonString.replace(/\\"/g, '"');
        credentials = JSON.parse(cleaned);
      } catch (e2: any) {
        console.warn("Could not parse GOOGLE_SERVICE_ACCOUNT_JSON on server load:", e1.message || e1);
      }
    }
  }

  const email = clientEmail || credentials.client_email;
  let key = privateKey || credentials.private_key;

  if (!email || !key) {
    cachedAuthClient = null;
    lastUsedSAJson = saJsonString;
    return null;
  }

  key = key.trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1).trim();
  }
  if (key.startsWith("'") && key.endsWith("'")) {
    key = key.substring(1, key.length - 1).trim();
  }
  key = key.replace(/\\n/g, "\n");

  const lines = key.split("\n");
  const cleanedLines = lines.map(line => {
    if (line.includes("-----BEGIN") || line.includes("-----END")) {
      return line.trim();
    }
    return line.replace(/[^a-zA-Z0-9+/= ]/g, "").trim();
  });
  key = cleanedLines.filter(line => line.length > 0).join("\n");

  const client = new JWT({
    email,
    key,
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events"
    ]
  });

  cachedAuthClient = client;
  lastUsedSAJson = saJsonString;
  return client;
}

function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Token de autenticação não fornecido." });
  }

  const token = authHeader.substring(7);
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ error: true, message: "Token de autenticação inválido." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userRole = (decoded.role || "").toLowerCase().trim();
    
    // External client tokens are prohibited from admin endpoints
    if (userRole === "client") {
      return res.status(403).json({ error: true, message: "Acesso negado. Permissão insuficiente." });
    }

    const validAdminRoles = [
      "admin", "marina", "marina_operador", "marina_gerente", "financeiro", 
      "pecas_servicos", "comercial", "operador", "gerente", "marinheiro", 
      "marinheiros", "marinheiro_operador", "operador_marina", "operador_pier", 
      "pier", "funcionario", "colaborador", "user", "staff"
    ];

    if (userRole && !validAdminRoles.includes(userRole)) {
      console.warn(`[AUTH WARNING] Non-standard admin role detected: '${userRole}'`);
      return res.status(403).json({ error: true, message: "Acesso negado. Perfil de usuário não autorizado." });
    }

    (req as any).user = decoded;
    next();
  } catch (err) {
    console.error("JWT Verification failed:", err);
    return res.status(401).json({ error: true, message: "Token inválido ou expirado." });
  }
}

function requireMarinaManagerOrAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  requireAdminAuth(req, res, () => {
    const user = (req as any).user;
    const role = (user?.role || "").toLowerCase().trim();
    const isAllowed = role === "admin" || role === "gerente" || role === "marina_gerente" || role === "marina";
    if (!isAllowed) {
      return res.status(403).json({ error: true, message: "Acesso restrito ao Gerente da Marina e Administradores." });
    }
    next();
  });
}

function requireClientAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Token não fornecido." });
  }
  const token = authHeader.substring(7);
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ error: true, message: "Token inválido." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== "client") {
      return res.status(403).json({ error: true, message: "Acesso negado." });
    }
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: true, message: "Token inválido ou expirado." });
  }
}

function requireAnyAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Token não fornecido." });
  }
  const token = authHeader.substring(7);
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ error: true, message: "Token inválido." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: true, message: "Token inválido ou expirado." });
  }
}

// ---------------- Auth Routes (Public) ----------------

// Route: Admin login
app.post("/api/auth/admin", authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: true, message: "Usuário e senha são obrigatórios." });
  }

  try {
    const admin = await getAdminByUsername(username);
    if (!admin) {
      writeAuditLog(username, "admin", "LOGIN_FAILED", req.ip, "Usuário não encontrado");
      return res.status(401).json({ error: true, message: "Usuário ou senha inválidos." });
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      writeAuditLog(username, "admin", "LOGIN_FAILED", req.ip, "Senha incorreta");
      return res.status(401).json({ error: true, message: "Usuário ou senha inválidos." });
    }

    // Buscar o nome do funcionário vinculado ao usuário
    let funcionarioNome = admin.nome || admin.username;
    if (admin.funcionarioId) {
      try {
        const dbData = await pullDatabase();
        const func = (dbData.funcionarios || []).find((f: any) => f.id === admin.funcionarioId);
        if (func && func.nome) {
          funcionarioNome = func.nome;
        }
      } catch (e) {
        console.warn("Falha ao buscar funcionário vinculado:", e);
      }
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, nome: funcionarioNome, role: admin.role || "admin" },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    writeAuditLog(admin.username, "admin", "LOGIN_SUCCESS", req.ip);
    res.json({ success: true, token, username: admin.username, nome: funcionarioNome, role: admin.role || "admin" });
  } catch (err: any) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: true, message: "Erro interno de autenticação." });
  }
});

// Route: Check client registration (CPF/Identifier)
app.post("/api/auth/client/check", authLimiter, async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: true, message: "Identificador (CPF) é obrigatório." });
  }

  try {
    const cleanId = identifier.replace(/\D/g, '');
    const client = await getClientByCpf(cleanId);
    
    if (!client) {
      writeAuditLog(identifier, "client", "LOGIN_CHECK_FAILED", req.ip, "Usuário não cadastrado");
      return res.status(401).json({ error: true, message: "Cadastro não encontrado. Este é um sistema fechado apenas para clientes do Grupo Marina Club." });
    }

    if (client.status === 'inativo') {
      writeAuditLog(identifier, "client", "LOGIN_BLOCKED_INACTIVE", req.ip, `Cliente inativo: ${client.nome}`);
      return res.status(403).json({ error: true, message: "Este cadastro encontra-se desativado. Entre em contato com a administração da marina." });
    }

    // Check if client has registered a password
    const clientAuth = await getClientAuth(client.id);

    return res.json({
      success: true,
      needsRegistration: !clientAuth,
      clientName: client.nome,
    });
  } catch (err: any) {
    console.error("Client check error:", err);
    res.status(500).json({ error: true, message: "Erro interno ao verificar cadastro." });
  }
});

// Route: Client login (CPF + password)
app.post("/api/auth/client", authLimiter, async (req, res) => {
  const { cpf, password } = req.body;
  if (!cpf) {
    return res.status(400).json({ error: true, message: "CPF é obrigatório." });
  }

  try {
    const client = await getClientByCpf(cpf);
    if (!client) {
      writeAuditLog(cpf, "client", "LOGIN_FAILED", req.ip, "CPF não cadastrado");
      return res.status(401).json({ error: true, message: "CPF não cadastrado no sistema." });
    }

    if (client.status === 'inativo') {
      writeAuditLog(client.nome, "client", "LOGIN_BLOCKED_INACTIVE", req.ip, `Cliente inativo: ${client.id}`);
      return res.status(403).json({ error: true, message: "Este cadastro encontra-se desativado. Entre em contato com a administração da marina." });
    }

    // Check if client has registered a password
    const clientAuth = await getClientAuth(client.id);

    if (!clientAuth) {
      // Client needs to register a password first
      writeAuditLog(client.nome, "client", "LOGIN_NEEDS_REGISTRATION", req.ip, `ID: ${client.id}`);
      return res.json({
        success: false,
        needsRegistration: true,
        clientName: client.nome,
        message: "Primeiro acesso. Por favor, cadastre uma senha."
      });
    }

    // Validate password
    if (!password) {
      return res.status(400).json({ error: true, message: "Senha é obrigatória." });
    }

    const isValid = await bcrypt.compare(password, clientAuth.passwordHash);
    if (!isValid) {
      writeAuditLog(client.nome, "client", "LOGIN_FAILED", req.ip, "Senha incorreta");
      return res.status(401).json({ error: true, message: "Senha incorreta." });
    }

    // Load associated data
    const dbData = await pullDatabase();
    const allBoats = dbData.boats || [];
    const allReservations = dbData.reservations || [];

    const clientBoatsList = client.embarcacoes && client.embarcacoes.length > 0
      ? client.embarcacoes.map((eb: any) => eb.embarcacaoId)
      : [client.embarcacaoId];

    const boats = allBoats.filter((b: any) => clientBoatsList.includes(b.id));
    const reservations = allReservations.filter((r: any) => clientBoatsList.includes(r.embarcacaoId));

    const token = jwt.sign(
      { id: client.id, nome: client.nome, role: "client" },
      JWT_SECRET,
      { expiresIn: JWT_CLIENT_EXPIRY }
    );

    writeAuditLog(client.nome, "client", "LOGIN_SUCCESS", req.ip, `ID: ${client.id}`);
    res.json({
      success: true,
      token,
      client,
      boats,
      reservations
    });
  } catch (err: any) {
    console.error("Client login error:", err);
    res.status(500).json({ error: true, message: "Erro interno de autenticação." });
  }
});

// Route: Client password registration (first access)
app.post("/api/auth/client/register", authLimiter, async (req, res) => {
  const { cpf, password } = req.body;

  if (!cpf || !password) {
    return res.status(400).json({ error: true, message: "CPF e senha são obrigatórios." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: true, message: "A senha deve ter no mínimo 6 caracteres." });
  }

  try {
    const client = await getClientByCpf(cpf);
    if (!client) {
      writeAuditLog(cpf, "client", "REGISTRATION_FAILED", req.ip, "CPF não cadastrado");
      return res.status(401).json({ error: true, message: "CPF não cadastrado no sistema." });
    }

    if (client.status === 'inativo') {
      return res.status(403).json({ error: true, message: "Este cadastro encontra-se desativado. Entre em contato com a administração da marina." });
    }

    // Check if already has a password
    const existingAuth = await getClientAuth(client.id);
    if (existingAuth) {
      writeAuditLog(client.nome, "client", "REGISTRATION_FAILED", req.ip, "Senha já existente");
      return res.status(409).json({ error: true, message: "Este CPF já possui uma senha cadastrada. Use o login normal." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await upsertClientAuth(client.id, passwordHash);

    writeAuditLog(client.nome, "client", "REGISTRATION_SUCCESS", req.ip, `ID: ${client.id}`);
    res.json({ success: true, message: "Senha cadastrada com sucesso! Faça login." });
  } catch (err: any) {
    console.error("Client registration error:", err);
    res.status(500).json({ error: true, message: "Erro interno ao cadastrar senha." });
  }
});

// Route: Validate JWT token (for frontend session checks)
app.get("/api/auth/validate", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ valid: false });
  }

  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    let funcionarioNome = decoded.nome || decoded.username;
    
    if (decoded.username) {
      try {
        const admin = await getAdminByUsername(decoded.username);
        if (admin && admin.funcionarioId) {
          const dbData = await pullDatabase();
          const func = (dbData.funcionarios || []).find((f: any) => f.id === admin.funcionarioId);
          if (func && func.nome) {
            funcionarioNome = func.nome;
          }
        } else if (admin && admin.nome) {
          funcionarioNome = admin.nome;
        }
      } catch (e) {
        console.warn("Falha ao resolver nome do funcionário em validate:", e);
      }
    }

    res.json({ valid: true, role: decoded.role, username: decoded.username, nome: funcionarioNome || decoded.username, id: decoded.id });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// Route: Change password for logged in admin user
app.post("/api/auth/change-password", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Não autorizado." });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: true, message: "Senha atual e nova senha são obrigatórias." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: true, message: "A nova senha deve ter no mínimo 6 caracteres." });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const username = decoded.username;

    if (!username) {
      return res.status(400).json({ error: true, message: "Sessão inválida para alteração de senha." });
    }

    const admin = await getAdminByUsername(username);
    if (!admin) {
      return res.status(404).json({ error: true, message: "Usuário não encontrado." });
    }

    const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isValid) {
      writeAuditLog(username, "admin", "CHANGE_PASSWORD_FAILED", req.ip, "Senha atual incorreta");
      return res.status(401).json({ error: true, message: "Senha atual incorreta." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await updateAdmin(admin.id, admin.username, newHash, admin.role, admin.funcionarioId);

    writeAuditLog(username, "admin", "CHANGE_PASSWORD_SUCCESS", req.ip);
    res.json({ success: true, message: "Senha alterada com sucesso." });
  } catch (err: any) {
    console.error("Change password error:", err);
    res.status(500).json({ error: true, message: "Erro interno ao alterar a senha." });
  }
});

app.use('/api/client/', clientRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/webhooks', webhookRoutes);

// Route: Save admin user
app.post("/api/admin/users/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteAdmin(data.id);
    } else if (action === 'upsert') {
      if (!data.funcionarioId) {
        return res.status(400).json({ error: true, message: "É obrigatório associar um colaborador do DP ao usuário." });
      }
      if (data.id) {
        let hash;
        if (data.password) {
          hash = await bcrypt.hash(data.password, 12);
        }
        await updateAdmin(data.id, data.username, hash, data.role, data.funcionarioId);
      } else {
        const hash = await bcrypt.hash(data.password, 12);
        await createAdmin(data.username, hash, data.role || 'admin', data.funcionarioId);
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save admin user" });
  }
});

// Route: Operacional - Folgas
app.post("/api/folgas/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteFolga(data.id);
    } else if (action === 'upsert') {
      await upsertFolga(data);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save folga" });
  }
});

// Route: Operacional/Financeiro - Manutencoes
app.get("/api/manutencoes/next-code", requireAdminAuth, async (req, res) => {
  try {
    const code = await getNextCodigoOS();
    res.json({ success: true, code });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to generate OS code" });
  }
});

app.post("/api/manutencoes/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteManutencao(data.id);
    } else if (action === 'upsert') {
      await upsertManutencao(data);

      const pool = getDbPool();
      if (!pool) throw new Error("MySQL Connection pool is offline.");
      const [existingTrans] = await pool.query(
        "SELECT id, clienteId FROM TransacoesFinanceiras WHERE id LIKE ?",
        [`fin_manut_${data.id}%`]
      );
      const hasExisting = (existingTrans as any[]).length > 0;

      if (data.gerarFinanceiro || hasExisting) {
        const baseValor = Number(data.valorRepassado) || Number(data.custo) || 0;
        if (baseValor > 0) {
          const clientsToSync = new Set<string>();
          for (const t of existingTrans as any[]) {
            if (t.clienteId) clientsToSync.add(t.clienteId);
          }

          // ─── Transação SQL: garante atomicidade entre DELETE e INSERTs ───
          const connection = await pool.getConnection();
          try {
            await connection.beginTransaction();

            await connection.query(
              "DELETE FROM TransacoesFinanceiras WHERE id LIKE ?",
              [`fin_manut_${data.id}%`]
            );

            const transacaoBaseId = `fin_manut_${data.id}`;
            const transacaoBase = {
              id: transacaoBaseId,
              tipo: 'receita',
              categoria: 'Serviços/Manutenção',
              valor: baseValor,
              dataVencimento: data.dataSaida || data.prazoEntrega || data.dataChamado || new Date().toISOString().split('T')[0],
              status: 'pendente',
              descricao: data.descricaoServico || `Manutenção Embarcação`,
              embarcacaoId: data.embarcacaoId,
              createdAt: new Date().toISOString()
            };

            const dbData = await pullDatabase();
            const boat = dbData.boats.find((b: any) => b.id === data.embarcacaoId);

            if (boat && boat.donos && boat.donos.length > 0) {
              const numDonos = boat.donos.length;
              const valorRateado = Number((baseValor / numDonos).toFixed(2));

              for (const donoId of boat.donos) {
                const splitData = {
                  ...transacaoBase,
                  id: `${transacaoBaseId}_${donoId}`,
                  clienteId: donoId,
                  valor: valorRateado,
                  descricao: `${transacaoBase.descricao} | Rateio (1/${numDonos})`
                };
                await upsertTransacao(splitData, connection);
                clientsToSync.add(donoId);
              }
            } else {
              await upsertTransacao(transacaoBase, connection);
            }

            await connection.commit();
          } catch (txErr) {
            await connection.rollback();
            throw txErr;
          } finally {
            connection.release();
          }

          if (clientsToSync.length > 0) {
            await syncMultipleClientsFinancialStatus(clientsToSync);
          }
        }
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save manutencao" });
  }
});

// Route: Operacional - Mecanicos
app.post("/api/mecanicos/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteMecanico(data.id);
    } else if (action === 'upsert') {
      await upsertMecanico(data);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save mecanico" });
  }
});

// Route: Operacional - Tipos de Manutenção / Serviço
app.get("/api/tipos-manutencao", requireAdminAuth, async (req, res) => {
  try {
    const tipos = await getAllTiposManutencao();
    res.json(tipos);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch tipos de manutencao" });
  }
});

app.post("/api/tipos-manutencao/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteTipoManutencao(data.id);
    } else if (action === 'upsert') {
      await upsertTipoManutencao(data);
    }
    if (io) {
      io.emit('db_update', { entity: 'tiposManutencao', action, data });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save tipo de manutencao" });
  }
});

// Route: Operacional - Chamados
app.get("/api/chamados", requireAdminAuth, async (req, res) => {
  try {
    const chamados = await getAllChamados();
    res.json(chamados);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch chamados" });
  }
});

app.get("/api/chamados/next-code", requireAdminAuth, async (req, res) => {
  try {
    const code = await getNextChamadoCode();
    res.json({ code });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to generate chamado code" });
  }
});

app.post("/api/chamados/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteChamado(data.id);
    } else if (action === 'upsert') {
      await upsertChamado(data);
    }
    // Broadcast real-time update to all connected clients
    if (io) {
      io.emit('marina_update', { type: action === 'delete' ? 'delete' : 'upsert', entity: 'chamados', data });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save chamado" });
  }
});


// Route: Operacional - Funcionarios
app.get("/api/funcionarios", requireAdminAuth, async (req, res) => {
  try {
    const { getFuncionarios } = await import('./server-db');
    const list = await getFuncionarios();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch funcionarios" });
  }
});

app.post("/api/funcionarios/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteFuncionario(data.id);
    } else if (action === 'upsert') {
      await upsertFuncionario(data);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Funcionario Save Error]", err);
    res.status(500).json({ error: true, message: err.message || "Failed to save funcionario" });
  }
});


// Route: Asaas Webhook (Public Endpoint)


// Route: Financeiro - Atividades (Kanban)


// ═════════════════════════════════════════════════════════════════════════════
// ── ROTAS: CONTROLE DE CAIXA DA MARINA (Acesso Exclusivo Gerente / Admin) ──
// ═════════════════════════════════════════════════════════════════════════════

app.get("/api/marina/caixa/transacoes", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const { startDate, endDate, tipo, categoria, formaPagamento, status, search } = req.query;
    const transacoes = await getCaixaMarinaTransacoes({
      startDate: startDate as string,
      endDate: endDate as string,
      tipo: tipo as string,
      categoria: categoria as string,
      formaPagamento: formaPagamento as string,
      status: status as string,
      search: search as string,
    });
    res.json(transacoes);
  } catch (err: any) {
    console.error("[Caixa Marina Transacoes Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar lançamentos do caixa." });
  }
});

app.post("/api/marina/caixa/transacoes/save", requireMarinaManagerOrAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteCaixaMarinaTransacao(data.id || data);
    } else if (action === 'upsert') {
      if (Array.isArray(data)) {
        for (const item of data) {
          await upsertCaixaMarinaTransacao(item);
        }
      } else {
        await upsertCaixaMarinaTransacao(data);
      }
    } else {
      return res.status(400).json({ error: true, message: `Ação inválida: ${action}` });
    }

    io.emit('marina_caixa_update', { action, data });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Caixa Marina Save Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar lançamento do caixa." });
  }
});

app.post("/api/marina/caixa/transacoes/devolver-coletes", requireMarinaManagerOrAdminAuth, sensitiveLimiter, async (req, res) => {
  const { id, devolvidoPor } = req.body;
  if (!id) return res.status(400).json({ error: true, message: "ID da transação não fornecido." });

  try {
    await devolverColetesCaixaMarina(id, devolvidoPor || 'Gerente');
    io.emit('marina_caixa_update', { action: 'devolver_coletes', id });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Caixa Marina Devolver Coletes Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao marcar coletes como devolvidos." });
  }
});

app.get("/api/marina/caixa/fechamento", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const dataStr = (req.query.data as string) || new Date().toISOString().split('T')[0];
    const fechamento = await getCaixaMarinaFechamento(dataStr);
    res.json(fechamento || null);
  } catch (err: any) {
    console.error("[Caixa Marina Fechamento Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao obter fechamento de caixa." });
  }
});

app.post("/api/marina/caixa/fechamento/salvar", requireMarinaManagerOrAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const fechamentoData = req.body;
    if (!fechamentoData || !fechamentoData.data) {
      return res.status(400).json({ error: true, message: "Data do fechamento é obrigatória." });
    }

    await salvarCaixaMarinaFechamento(fechamentoData);
    io.emit('marina_caixa_update', { action: 'fechamento', data: fechamentoData });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Caixa Marina Salvar Fechamento Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar fechamento de caixa." });
  }
});

app.get("/api/marina/caixa/abastecimentos-pendentes", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const pendentes = await getAbastecimentosPendentesCaixa();
    res.json(pendentes);
  } catch (err: any) {
    console.error("[Caixa Marina Abastecimentos Pendentes Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar abastecimentos pendentes." });
  }
});

app.post("/api/marina/caixa/abastecimentos-baixar", requireMarinaManagerOrAdminAuth, sensitiveLimiter, async (req, res) => {
  const { reservaId, formaPagamento, valorTotal, operadorNome, comprovanteUrl } = req.body;
  if (!reservaId) return res.status(400).json({ error: true, message: "ID da reserva é obrigatório." });

  try {
    const currentPool = getDbPool();
    if (!currentPool) throw new Error("Banco de dados offline.");

    // Obter dados da reserva
    const [rows] = await currentPool.query("SELECT * FROM Reservas WHERE id = ?", [reservaId]);
    const reserva = (rows as any[])[0];
    if (!reserva) return res.status(404).json({ error: true, message: "Reserva não encontrada." });

    const litros = Number(reserva.abastecimentoLitros || reserva.litrosAbastecidos) || 0;
    const finalValor = Number(valorTotal) || Number(reserva.abastecimentoValorTotal) || (litros * 9.00);
    const finalFormaPagamento = formaPagamento || reserva.abastecimentoFormaPagamento || 'pix';
    const finalOperador = operadorNome || 'Gerente';
    const finalComprovante = comprovanteUrl || reserva.abastecimentoComprovanteUrl || null;

    // 1. Atualizar a reserva
    await currentPool.query(
      `UPDATE Reservas SET 
        abastecimentoStatusCobranca = 'cobrado',
        abastecimentoFormaPagamento = ?,
        abastecimentoValorTotal = ?,
        abastecimentoComprovanteUrl = ?
       WHERE id = ?`,
      [finalFormaPagamento, finalValor, finalComprovante, reservaId]
    );

    // 2. Criar lançamento no Caixa da Marina
    const caixaTransacao = {
      id: `cx_fuel_${reservaId}_${Date.now()}`,
      tipo: 'entrada',
      categoria: 'combustivel',
      descricao: `Abastecimento de ${litros}L (Reserva ${reservaId})`,
      valor: finalValor,
      formaPagamento: finalFormaPagamento,
      data: reserva.data || new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'confirmado',
      clienteTipo: 'cotista',
      clienteId: reserva.clienteId || null,
      embarcacaoId: reserva.embarcacaoId || null,
      reservaId: reservaId,
      combustivelLitros: litros,
      comprovanteUrl: finalComprovante,
      observacoes: `Baixa de combustível realizada por ${finalOperador}`,
      registradoPor: finalOperador,
      createdAt: new Date().toISOString()
    };

    await upsertCaixaMarinaTransacao(caixaTransacao);

    io.emit('marina_update', { action: 'update', reservation: { id: reservaId, abastecimentoStatusCobranca: 'cobrado' } });
    io.emit('marina_caixa_update', { action: 'upsert', data: caixaTransacao });

    res.json({ success: true, transacao: caixaTransacao });
  } catch (err: any) {
    console.error("[Caixa Marina Baixa Abastecimento Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao dar baixa no abastecimento." });
  }
});


// Route: Operacional - EPIs
app.post("/api/funcionarios/:id/epis", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const { id, ...epiData } = req.body;
    const finalId = id || `epi_${Date.now()}`;
    await upsertEPI(req.params.id, { ...epiData, id: finalId });
    res.json({ success: true, id: finalId });
  } catch (err: any) {
    console.error("[EPI Save Error]", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

app.delete("/api/epis/:id", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    await deleteEPI(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[EPI Delete Error]", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

app.post("/api/funcionarios/:id/historico-epi", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const logData = req.body;
    await saveHistoricoEPI({ 
      ...logData, 
      funcionarioId: req.params.id,
      id: logData.id || `hist_epi_${Date.now()}`
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Historico EPI Save Error]", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

// Route: Operacional - Catálogo EPIs
app.post("/api/catalogo-epis", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const { id, ...epiData } = req.body;
    const finalId = id || `epi_cat_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    await upsertCatalogoEPI({ ...epiData, id: finalId });
    res.json({ success: true, id: finalId });
  } catch (err: any) {
    console.error("[Catalogo EPI Save Error]", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

app.delete("/api/catalogo-epis/:id", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    await deleteCatalogoEPI(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Catalogo EPI Delete Error]", err);
    res.status(500).json({ error: true, message: err.message });
  }
});


// Route: Upload boat image
app.post("/api/upload/boat-image", requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "No image file provided." });
    const filename = `boat_${Date.now()}.webp`;
    const outputPath = path.join(boatsUploadsDir, filename);
    await sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(outputPath);
    res.json({ success: true, imageUrl: `/uploads/boats/${filename}` });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to upload image" });
  }
});

// Route: Upload boat document
app.post("/api/upload/boat-document", requireAdminAuth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "No file provided." });
    const isPDF = req.file.mimetype === 'application/pdf';
    let filename = '';
    if (isPDF) {
      filename = `doc_${Date.now()}_${Math.floor(Math.random()*1000)}.pdf`;
      require('fs').writeFileSync(path.join(boatsUploadsDir, filename), req.file.buffer);
    } else {
      filename = `doc_${Date.now()}_${Math.floor(Math.random()*1000)}.webp`;
      await sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(boatsUploadsDir, filename));
    }
    res.json({ success: true, documentUrl: `/uploads/boats/${filename}` });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Route: Upload checklist image
app.post("/api/upload/checklist-image", requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "No image file provided." });
    const filename = `chk_${Date.now()}_${Math.floor(Math.random()*1000)}.webp`;
    await sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(checklistUploadsDir, filename));
    res.json({ success: true, imageUrl: `/uploads/checklists/${filename}` });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Route: Upload comprovante (accepts images and PDF files)
app.post("/api/upload/comprovante", requireAdminAuth, upload.single('comprovante'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "Nenhum arquivo fornecido." });
    const isPdf = req.file.mimetype === 'application/pdf';
    const isImage = req.file.mimetype.startsWith('image/');
    if (!isPdf && !isImage) return res.status(400).json({ error: true, message: "Apenas imagens e arquivos PDF sao permitidos." });
    let filename;
    const originalNameClean = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    if (isImage) {
      filename = `comp_${Date.now()}_${Math.floor(Math.random()*1000)}.webp`;
      await sharp(req.file.buffer).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(comprovantesUploadsDir, filename));
    } else {
      filename = `comp_${Date.now()}_${originalNameClean}`;
      require('fs').writeFileSync(path.join(comprovantesUploadsDir, filename), req.file.buffer);
    }
    res.json({ success: true, url: `/uploads/comprovantes/${filename}` });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Route: Get all admin users
app.get("/api/admin/users", requireAdminAuth, async (req, res) => {
  try {
    const admins = await getAllAdmins();
    res.json(admins);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch admins" });
  }
});

// Route: Save admin user
app.post("/api/admin/users/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteAdmin(data.id);
    } else if (action === 'upsert') {
      if (data.id) {
        let hash;
        if (data.password) {
          hash = await bcrypt.hash(data.password, 12);
        }
        await updateAdmin(data.id, data.username, hash, data.role);
      } else {
        const hash = await bcrypt.hash(data.password, 12);
        await createAdmin(data.username, hash, data.role || 'admin');
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save admin user" });
  }
});

// Route: Check VPS database connection status
app.get("/api/db/status", requireAdminAuth, async (req, res) => {
  try {
    const status = await getDbStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Unknown db status error." });
  }
});

// Route: Get ControlesSom
app.get("/api/db/controles_som", requireAdminAuth, async (req, res) => {
  try {
    const { getControlesSom } = await import('./server-db');
    const data = await getControlesSom();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch controles som." });
  }
});

// Route: Pull remote data from VPS MariaDB/MySQL database
app.get("/api/db/pull", requireAdminAuth, async (req, res) => {
  try {
    const data = await pullDatabase();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to pull remote database." });
  }
});

// Route: Save/Upsert single client, boat, or reservation record
app.post("/api/db/save", requireAdminAuth, async (req, res) => {
  const { type, action, data } = req.body;
  
  if (!type || !action || !data) {
    return res.status(400).json({ error: "Missing required parameters: type, action, or data." });
  }

  try {
    if (type === "clients") {
      if (action === "delete") {
        await deleteClient(data.id || data);
      } else {
        await upsertClient(data);
      }
    } else if (type === "boats") {
      if (action === "delete") {
        await deleteBoat(data.id || data);
      } else {
        await upsertBoat(data);
      }
    } else if (type === "reservations") {
      if (action === "delete") {
        await deleteReservation(data.id || data);
        io.emit("marina_update", { action: 'delete', reservation: data });
      } else {
        await upsertReservation(data);
        io.emit("marina_update", { action: 'upsert', reservation: data });
      }
    } else if (type === "controles_som") {
      if (action === "upsert") {
        const { upsertControleSom } = await import('./server-db');
        await upsertControleSom(data);
      }
    } else {
      return res.status(400).json({ error: `Unsupported table type: ${type}` });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error(`Error saving db item type=${type} action=${action}:`, err);
    res.status(500).json({ error: true, message: err.message || "Failed to save record to remote database." });
  }
});

// Route: Bulk save / upload full state to MariaDB/MySQL database
app.post("/api/db/bulk-save", requireAdminAuth, async (req, res) => {
  try {
    const { clients, boats, reservations } = req.body;
    await bulkSyncDatabase({ 
      clients: clients || [], 
      boats: boats || [], 
      reservations: reservations || [] 
    });
    res.json({ success: true, message: "Bulk database synchronization completed successfully." });
  } catch (err: any) {
    console.error("Failed bulk sync database route:", err);
    res.status(500).json({ error: true, message: err.message || "Bulk sync failure." });
  }
});

// Route: Get status of Google Service Account configuration
app.get("/api/calendar/config", requireAnyAuth, async (req, res) => {
  try {
    const client = await getGoogleAuthClient();
    res.json({
      configured: client !== null,
      email: client?.email || null,
      msg: client 
        ? "Google Service Account is successfully configured and active."
        : "Google Service Account credentials missing (configure GOOGLE_SERVICE_ACCOUNT_JSON inside environment or paste via Calendar settings)."
    });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message || "Unknown config read error." });
  }
});

// Route: Save calendar configuration and mappings
app.post("/api/calendar/config", requireAdminAuth, async (req, res) => {
  try {
    const { calendar_mappings } = req.body;
    if (calendar_mappings !== undefined) {
      await setConfigValue("calendar_mappings", JSON.stringify(calendar_mappings));
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message || "Failed to save calendar config." });
  }
});

// Route: Save an activity log (Audit)
app.post("/api/logs/action", requireAnyAuth, async (req, res) => {
  const { operadorNome, acao, detalhes, embarcacaoId } = req.body;
  
  if (!acao) {
    return res.status(400).json({ error: "Missing required parameter: acao" });
  }

  try {
    const { upsertRegistroAtividade } = await import('./server-db');
    await upsertRegistroAtividade({
      operadorNome,
      acao,
      detalhes,
      embarcacaoId,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error saving action log:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to save action log." });
  }
});

// Route: Get central configuration details from database
app.get("/api/config", requireAdminAuth, async (req, res) => {
  try {
    const google_client_id = await getConfigValue("google_client_id");
    const mappingsStr = await getConfigValue("calendar_mappings");
    let calendar_mappings = null;
    if (mappingsStr) {
      try {
        calendar_mappings = JSON.parse(mappingsStr);
      } catch {
        calendar_mappings = {};
      }
    }

    // WhatsApp templates & configs
    const whatsapp_conf_template1 = await getConfigValue("whatsapp_conf_template1");
    const whatsapp_conf_template2 = await getConfigValue("whatsapp_conf_template2");
    const whatsapp_cal_template = await getConfigValue("whatsapp_cal_template");
    const finance_whatsapp_instance = await getConfigValue("finance_whatsapp_instance");
    const finance_whatsapp_custom_templates_str = await getConfigValue("finance_whatsapp_custom_templates");
    let finance_whatsapp_custom_templates = null;
    if (finance_whatsapp_custom_templates_str) {
      try { finance_whatsapp_custom_templates = JSON.parse(finance_whatsapp_custom_templates_str); } catch { finance_whatsapp_custom_templates = []; }
    }
    const dbAsaasApiKey = await getConfigValue("asaas_api_key");
    const dbAsaasApiUrl = await getConfigValue("asaas_api_url");
    const dbAsaasWebhookToken = await getConfigValue("asaas_webhook_token");

    const nautical_csv_mapping_str = await getConfigValue("nautical_csv_mapping");
    let nautical_csv_mapping = null;
    if (nautical_csv_mapping_str) {
      try { nautical_csv_mapping = JSON.parse(nautical_csv_mapping_str); } catch { nautical_csv_mapping = {}; }
    }

    const client = await getGoogleAuthClient();
    res.json({
      google_client_id,
      calendar_mappings,
      has_service_account: client !== null,
      service_account_email: client?.email || null,
      whatsapp_conf_template1,
      whatsapp_conf_template2,
      whatsapp_cal_template,
      finance_whatsapp_instance,
      finance_whatsapp_custom_templates,
      nautical_csv_mapping,
      has_asaas_api_key: !!dbAsaasApiKey || !!process.env.ASAAS_API_KEY,
      asaas_api_url: dbAsaasApiUrl || process.env.ASAAS_API_URL || "https://api-sandbox.asaas.com/v3",
      asaas_webhook_token: dbAsaasWebhookToken || process.env.ASAAS_WEBHOOK_TOKEN || ""
    });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message || "Could not retrieve central configurations from database." });
  }
});

// Route: Save central configuration details to database
app.post("/api/config", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const { google_client_id, calendar_mappings, google_service_account_json,
            whatsapp_conf_template1, whatsapp_conf_template2, whatsapp_cal_template,
            finance_whatsapp_instance, finance_whatsapp_custom_templates,
            nautical_csv_mapping, asaas_api_key, asaas_api_url, asaas_webhook_token } = req.body;

    if (google_client_id !== undefined) {
      await setConfigValue("google_client_id", google_client_id);
    }
    
    if (calendar_mappings !== undefined) {
      await setConfigValue("calendar_mappings", JSON.stringify(calendar_mappings));
    }

    if (google_service_account_json !== undefined) {
      const trimmed = google_service_account_json.trim();
      if (trimmed) {
        try {
          JSON.parse(trimmed);
        } catch {
          return res.status(400).json({ error: true, message: "A credencial da Conta de Serviço fornecida não é um JSON válido." });
        }
      }
      await setConfigValue("google_service_account_json", trimmed);
    }

    // WhatsApp templates
    if (whatsapp_conf_template1 !== undefined) {
      await setConfigValue("whatsapp_conf_template1", whatsapp_conf_template1);
    }
    if (whatsapp_conf_template2 !== undefined) {
      await setConfigValue("whatsapp_conf_template2", whatsapp_conf_template2);
    }
    if (whatsapp_cal_template !== undefined) {
      await setConfigValue("whatsapp_cal_template", whatsapp_cal_template);
    }

    // Finance WhatsApp instance
    if (finance_whatsapp_instance !== undefined) {
      await setConfigValue("finance_whatsapp_instance", finance_whatsapp_instance);
    }
    if (finance_whatsapp_custom_templates !== undefined) {
      await setConfigValue("finance_whatsapp_custom_templates", JSON.stringify(finance_whatsapp_custom_templates));
    }

    // CSV import mapping
    if (nautical_csv_mapping !== undefined) {
      await setConfigValue("nautical_csv_mapping", JSON.stringify(nautical_csv_mapping));
    }

    // Asaas integration settings
    if (asaas_api_key !== undefined) {
      if (asaas_api_key !== "__UNCHANGED__" && asaas_api_key !== "") {
        await setConfigValue("asaas_api_key", asaas_api_key.trim());
      }
    }
    if (asaas_api_url !== undefined) {
      await setConfigValue("asaas_api_url", asaas_api_url.trim());
    }
    if (asaas_webhook_token !== undefined) {
      await setConfigValue("asaas_webhook_token", asaas_webhook_token.trim());
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message || "Could not save central configurations to database." });
  }
});

// ---------------- Fuel Inventory & History Endpoints ----------------
app.get("/api/fuel/inventory", async (req, res) => {
  try {
    const inv = await getFuelInventoryFromDb();
    res.json(inv || {
      tanquePrincipalLitros: 0,
      tanqueCapacidadeMaxima: 1000,
      alertaMinimoTanque: 200,
      galoesPierQuantidade: 0,
      galoesCapacidadeLitros: 20,
      galaoParcialLitros: 0,
      ultimaAtualizacao: new Date().toLocaleDateString('pt-BR')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/fuel/inventory", async (req, res) => {
  try {
    const inv = req.body;
    await saveFuelInventoryInDb(inv);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/fuel/history", async (req, res) => {
  try {
    const history = await getFuelHistoryFromDb();
    res.json(history || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/fuel/history", async (req, res) => {
  try {
    const history = req.body;
    await saveFuelHistoryInDb(history);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/fuel/reset", async (req, res) => {
  try {
    await resetFuelDataInDb();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ---------------- Google Calendar Proxy ----------------
// Permite que chamadas à API do Google feitas no frontend utilizem a credencial
// da Service Account carregada de forma centralizada pelo backend, sem expor a chave
app.all("/api/calendar-proxy/*", requireAnyAuth, async (req, res) => {
  const authClient = await getGoogleAuthClient();
  if (!authClient) {
    return res.status(503).json({
      error: "Google Service Account not configured.",
      message: "Please configure GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in your env secrets."
    });
  }

  const prefix = "/api/calendar-proxy/";
  let relativePath = req.url.startsWith(prefix) ? req.url.substring(prefix.length) : req.url;
  
  if (relativePath.startsWith("/")) {
    relativePath = relativePath.substring(1);
  }

  if (!relativePath.startsWith('calendar/v3/')) {
    return res.status(403).json({ error: "Apenas Calendar API é permitida." });
  }

  const googleApiUrl = `https://www.googleapis.com/${relativePath}`;

  try {
    const tokenInfo = await authClient.getAccessToken();
    const token = tokenInfo.token;

    if (!token) {
      throw new Error("Failed to retrieve a valid bearer token for Google Calendar Service Account.");
    }

    const fetchHeaders: Record<string, string> = {
      "Authorization": `Bearer ${token}`
    };

    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      fetchHeaders["Content-Type"] = "application/json";
    }

    const isBodyRequest = ["POST", "PUT", "PATCH"].includes(req.method) && req.body;
    
    const response = await fetch(googleApiUrl, {
      method: req.method,
      headers: fetchHeaders,
      body: isBodyRequest ? JSON.stringify(req.body) : undefined
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");

    if (response.status === 404 && relativePath.includes("/events")) {
      res.status(200).json({
        items: [],
        error: {
          code: 404,
          message: `Google Calendar not shared or not found. Please ensure the calendar is shared with the Service Account email: ${authClient?.email || 'configured email'}`
        }
      });
      return;
    }

    res.status(response.status);

    if (!response.ok && response.status !== 404) {
      console.warn(`[PROXY] [${req.method}] ${response.status} from ${googleApiUrl}`);
    }

    if (isJson) {
      const data = await response.json();
      res.json(data);
    } else {
      const data = await response.text();
      res.send(data);
    }
  } catch (error: any) {
    console.error(`Google API Proxy failure on [${req.method}] ${googleApiUrl}:`, error);
    res.status(500).json({
      error: "Proxy Connection Error",
      message: error.message || "An unexpected error occurred while proxying call to Google API."
    });
  }
});

// Route: Get WhatsApp Connection Status (Evolution API)
app.get("/api/whatsapp/status", requireAdminAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.json({ instance: { state: "not_configured" }, message: "Evolution API (EVOLUTION_API_URL / EVOLUTION_API_KEY) não configurada nas variáveis de ambiente." });
    }

    const response = await evolutionFetch(`${apiUrl}/instance/connectionState/${instance}`, {
      method: "GET",
      headers: { "apikey": apiKey },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.json({ error: "Not Found", instance: { state: "not_created" }, message: "Instância não existe" });
      }
      return res.json({ instance: { state: "close" }, message: `Evolution API status: ${response.statusText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.warn("Error checking WhatsApp status (safe handling):", err?.message);
    res.json({ instance: { state: "close" }, message: err?.message || "Failed to fetch status" });
  }
});

// Route: Get WhatsApp Connect / QR Code (Evolution API)
app.get("/api/whatsapp/connect", requireAdminAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = (req.query.instance as string) || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.json({ base64: null, count: 0, message: "Evolution API não configurada nas variáveis de ambiente." });
    }

    let response = await evolutionFetch(`${apiUrl}/instance/connect/${instance}`, {
      method: "GET",
      headers: { "apikey": apiKey }
    });

    if (!response.ok) {
      const statusText = (response.statusText || '').toLowerCase();
      if (response.status === 404 || statusText.includes('not found')) {
        console.log(`[WhatsApp Connect] Instance '${instance}' not found on Evolution API. Creating automatically...`);
        const createRes = await evolutionFetch(`${apiUrl}/instance/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
          body: JSON.stringify({ instanceName: instance, qrcode: true, integration: "WHATSAPP-BAILEYS" })
        });

        if (createRes.ok || createRes.status === 403 || createRes.status === 409) {
          await new Promise(r => setTimeout(r, 1500));
          response = await evolutionFetch(`${apiUrl}/instance/connect/${instance}`, {
            method: "GET",
            headers: { "apikey": apiKey }
          });
        }
      }
    }

    if (!response.ok) {
      return res.json({ base64: null, count: 0, message: `Evolution API instance connect: ${response.statusText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.warn("Error connecting WhatsApp (safe handling):", err?.message);
    res.json({ base64: null, count: 0, message: err?.message || "Failed to connect" });
  }
});

// Route: Get all instances from Evolution API
app.get("/api/whatsapp/instances", requireAdminAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API não configurada." });
    }

    const response = await evolutionFetch(`${apiUrl}/instance/fetchInstances`, {
      method: "GET",
      headers: { "apikey": apiKey }
    });

    if (!response.ok) {
      return res.status(500).json({ error: true, message: `Failed to fetch instances: ${response.statusText}` });
    }

    const data = await response.json();
    // data is typically an array of instances: [{ instance: { instanceName: "mexicano", status: "open" } }, ...] or similar depending on Evolution version.
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err?.message || "Failed to fetch instances" });
  }
});

// Route: Debug WhatsApp Connection & Evolution API Diagnostics
app.get("/api/whatsapp/debug", requireAdminAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = (req.query.instance as string) || process.env.EVOLUTION_INSTANCE || "mexicano";

    const report: any = {
      timestamp: new Date().toISOString(),
      env: {
        EVOLUTION_API_URL: apiUrl ? apiUrl : "NÃO CONFIGURADO",
        EVOLUTION_API_KEY: apiKey ? `${apiKey.substring(0, 6)}...` : "NÃO CONFIGURADO",
        EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE || "mexicano",
        targetInstance: instance
      },
      tests: {}
    };

    if (!apiUrl || !apiKey) {
      report.status = "ERROR_ENV_MISSING";
      return res.json(report);
    }

    // Test 1: fetchInstances
    try {
      const resInst = await evolutionFetch(`${apiUrl}/instance/fetchInstances`, {
        headers: { "apikey": apiKey }
      });
      const instData = await resInst.json();
      report.tests.fetchInstances = {
        status: resInst.status,
        ok: resInst.ok,
        instancesCount: Array.isArray(instData) ? instData.length : 0,
        instances: Array.isArray(instData) ? instData.map((i: any) => ({ name: i.name, connectionStatus: i.connectionStatus, ownerJid: i.ownerJid })) : instData
      };
    } catch (e: any) {
      report.tests.fetchInstances = { error: e.message };
    }

    // Test 2: connectionState
    try {
      const resState = await evolutionFetch(`${apiUrl}/instance/connectionState/${instance}`, {
        headers: { "apikey": apiKey }
      });
      report.tests.connectionState = {
        status: resState.status,
        ok: resState.ok,
        data: await resState.json()
      };
    } catch (e: any) {
      report.tests.connectionState = { error: e.message };
    }

    // Test 3: connect (QR code endpoint)
    try {
      const resConn = await evolutionFetch(`${apiUrl}/instance/connect/${instance}`, {
        headers: { "apikey": apiKey }
      });
      const connData = await resConn.json();
      report.tests.connect = {
        status: resConn.status,
        ok: resConn.ok,
        keysReturned: Object.keys(connData || {}),
        hasBase64: !!(connData?.base64 || connData?.qrcode?.base64),
        hasCode: !!connData?.code,
        dataSummary: {
          instance: connData?.instance,
          state: connData?.instance?.state || connData?.state,
          pairingCode: connData?.pairingCode,
          codePreview: connData?.code ? (connData.code.substring(0, 30) + "...") : null
        }
      };
    } catch (e: any) {
      report.tests.connect = { error: e.message };
    }

    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Route: Logout WhatsApp (Evolution API)
app.delete("/api/whatsapp/logout", requireAdminAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured" });
    }

    const response = await evolutionFetch(`${apiUrl}/instance/logout/${instance}`, {
      method: "DELETE",
      headers: { "apikey": apiKey }
    });

    if (!response.ok) {
      return res.status(502).json({ error: true, message: `Evolution API failure: ${response.statusText}` });
    }

    res.json({ success: true, message: "Deslogado com sucesso" });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to logout" });
  }
});

// Route: Create WhatsApp Instance (Evolution API)
app.post("/api/whatsapp/instance/create", requireAdminAuth, async (req, res) => {
  try {
    const { instanceName } = req.body;
    if (!instanceName) {
      return res.status(400).json({ error: true, message: "instanceName is required" });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    
    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured" });
    }

    const response = await evolutionFetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
      body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({ error: true, message: `Evolution API failure: ${errorText}` });
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to create instance" });
  }
});

// Route: Delete WhatsApp Instance (Evolution API)
app.delete("/api/whatsapp/instance/delete/:instanceName", requireAdminAuth, async (req, res) => {
  try {
    const { instanceName } = req.params;
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    
    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured" });
    }

    const response = await evolutionFetch(`${apiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': apiKey }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({ error: true, message: `Evolution API failure: ${errorText}` });
    }

    res.json({ success: true, message: "Instância deletada com sucesso" });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to delete instance" });
  }
});

// Route: Get WhatsApp Groups (Evolution API)
app.get("/api/whatsapp/groups", requireAnyAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || req.body.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured on VPS" });
    }

    const response = await evolutionFetch(`${apiUrl}/group/fetchAllGroups/${instance}?getParticipants=false`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: true, message: `Evolution API failure: ${response.statusText}` });
    }

    const data = await response.json();
    const rawGroups = Array.isArray(data) ? data : (data?.data || []);
    const uniqueGroupsMap = new Map();
    for (const g of rawGroups) {
      const gid = g?.id || g?.jid;
      if (gid && !uniqueGroupsMap.has(gid)) {
        uniqueGroupsMap.set(gid, { ...g, id: gid, subject: g.subject || g.name || gid });
      }
    }
    const deduplicatedGroups = Array.from(uniqueGroupsMap.values());
    res.json({ success: true, groups: deduplicatedGroups });
  } catch (err: any) {
    console.error("Error fetching WhatsApp groups:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to fetch WhatsApp groups" });
  }
});

// Route: Get WhatsApp Contacts (Evolution API)
app.get("/api/whatsapp/contacts", requireAnyAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || req.body.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured on VPS" });
    }

    const response = await evolutionFetch(`${apiUrl}/chat/findContacts/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API contact fetch error:", response.status, errorText);
      return res.status(502).json({ error: true, message: `Evolution API failure: ${response.statusText}` });
    }

    const data = await response.json();
    const rawContacts = Array.isArray(data) ? data : (data?.data || []);
    const uniqueContactsMap = new Map();
    for (const c of rawContacts) {
      const cid = c?.id || c?.remoteJid || c?.jid;
      if (cid && !uniqueContactsMap.has(cid)) {
        uniqueContactsMap.set(cid, { ...c, id: cid, remoteJid: c.remoteJid || cid });
      }
    }
    const deduplicatedContacts = Array.from(uniqueContactsMap.values());
    res.json({ success: true, contacts: deduplicatedContacts });
  } catch (err: any) {
    console.error("Error fetching WhatsApp contacts:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to fetch WhatsApp contacts" });
  }
});

// Route: Evolution Direct Send Message (Text or Media, individual or group)
app.post("/api/evolution/send-message", requireAnyAuth, whatsappLimiter, async (req, res) => {
  try {
    const { number, text, media, mimetype, fileName, caption } = req.body;
    const messageText = text || caption || "";

    if (!number || (!messageText && !media)) {
      return res.status(400).json({ error: true, message: "Missing number or message content" });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || req.body.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured on VPS" });
    }

    let targetRecipient = String(number).trim();
    if (!targetRecipient.includes('@g.us')) {
      let cleaned = targetRecipient.replace(/\D/g, "");
      if (cleaned.length >= 10 && cleaned.length <= 11 && !cleaned.startsWith("55")) {
        cleaned = `55${cleaned}`;
      }
      targetRecipient = cleaned;
    }

    if (media && mimetype) {
      let mediatype = "document";
      if (mimetype.startsWith("image/")) mediatype = "image";
      else if (mimetype.startsWith("video/")) mediatype = "video";

      const base64Data = media.replace(/^data:.*?;base64,/, "");

      const payload = {
        number: targetRecipient,
        mediatype,
        mimetype,
        caption: messageText,
        media: base64Data,
        fileName: fileName || "documento"
      };

      const response = await evolutionFetch(`${apiUrl}/message/sendMedia/${instance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({ error: true, message: `Evolution API Media error: ${errorText}` });
      }
    } else {
      const payload = {
        number: targetRecipient,
        text: messageText
      };

      const response = await evolutionFetch(`${apiUrl}/message/sendText/${instance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({ error: true, message: `Evolution API Text error: ${errorText}` });
      }
    }

    res.json({ success: true, message: "Message sent successfully" });
  } catch (err: any) {
    console.error("Error sending Evolution message:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to send message" });
  }
});

// Route: Send text message (Evolution API)
app.post("/api/whatsapp/send-text", requireAdminAuth, whatsappLimiter, async (req, res) => {
  try {
    const { number, text } = req.body;
    
    if (!number || !text) {
      return res.status(400).json({ error: true, message: "Missing number or text" });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || req.body.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    // Clean number unless it's a group JID (@g.us)
    let cleanedNumber = number.trim();
    if (!cleanedNumber.includes('@g.us')) {
      cleanedNumber = cleanedNumber.replace(/\D/g, "");
      if (cleanedNumber.length >= 10 && cleanedNumber.length <= 11 && !cleanedNumber.startsWith("55")) {
        cleanedNumber = `55${cleanedNumber}`;
      }
    }

    const payload = {
      number: cleanedNumber,
      text: text
    };

    const response = await evolutionFetch(`${apiUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API error:", response.status, errorText);
      return res.status(502).json({ error: true, message: `Evolution API failure: ${response.statusText}` });
    }

    res.json({ success: true, message: "Message sent successfully" });
  } catch (err: any) {
    console.error("Error sending WhatsApp message:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to send WhatsApp message" });
  }
});

// Route: Custom flexible send message (Text and/or Media for individuals or groups)
app.post("/api/whatsapp/send-custom", requireAdminAuth, whatsappLimiter, async (req, res) => {
  try {
    const { number, text, media, mimetype, fileName } = req.body;
    
    if (!number || (!text && !media)) {
      return res.status(400).json({ error: true, message: "É necessário informar o número/grupo e o texto ou mídia." });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || req.body.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API não configurada na VPS." });
    }

    let targetRecipient = number.trim();
    if (!targetRecipient.includes('@g.us')) {
      let cleanedNumber = targetRecipient.replace(/\D/g, "");
      if (cleanedNumber.length >= 10 && cleanedNumber.length <= 11 && !cleanedNumber.startsWith("55")) {
        cleanedNumber = `55${cleanedNumber}`;
      }
      targetRecipient = cleanedNumber;
    }

    if (media && mimetype) {
      let mediatype = "document";
      if (mimetype.startsWith("image/")) mediatype = "image";
      else if (mimetype.startsWith("video/")) mediatype = "video";

      const base64Data = media.replace(/^data:.*?;base64,/, "");

      const payload = {
        number: targetRecipient,
        mediatype,
        mimetype,
        caption: text || "",
        media: base64Data,
        fileName: fileName || "arquivo"
      };

      const response = await evolutionFetch(`${apiUrl}/message/sendMedia/${instance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({ error: true, message: `Erro ao enviar mídia via Evolution API: ${errorText}` });
      }
    } else {
      const payload = {
        number: targetRecipient,
        text: text
      };

      const response = await evolutionFetch(`${apiUrl}/message/sendText/${instance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({ error: true, message: `Erro ao enviar mensagem via Evolution API: ${errorText}` });
      }
    }

    res.json({ success: true, message: "Mensagem enviada com sucesso!" });
  } catch (err: any) {
    console.error("Error sending custom WhatsApp message:", err);
    res.status(500).json({ error: true, message: err.message || "Falha ao enviar mensagem no WhatsApp" });
  }
});

// Route: Generic send message for Finance (Text or Media)
app.post("/api/whatsapp/finance/send-message", requireAdminAuth, whatsappLimiter, async (req, res) => {
  try {
    const { instanceName, number, text, media, mimetype, fileName } = req.body;
    
    if (!instanceName || !number) {
      return res.status(400).json({ error: true, message: "Missing instanceName or number" });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured" });
    }

    let cleanedNumber = number.replace(/\D/g, "");
    if (cleanedNumber.length >= 10 && cleanedNumber.length <= 11 && !cleanedNumber.startsWith("55")) {
      cleanedNumber = `55${cleanedNumber}`;
    }

    if (media && mimetype) {
      // Send Media (Image or Document)
      let mediatype = "document";
      if (mimetype.startsWith("image/")) mediatype = "image";
      else if (mimetype.startsWith("video/")) mediatype = "video";

      const base64Data = media.replace(/^data:.*?;base64,/, "");

      const payload = {
        number: cleanedNumber,
        mediatype,
        mimetype,
        caption: text || "",
        media: base64Data,
        fileName: fileName || "arquivo"
      };

      const response = await evolutionFetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({ error: true, message: `Evolution API Media failure: ${errorText}` });
      }
    } else if (text) {
      // Send Text only
      const payload = { number: cleanedNumber, text };

      const response = await evolutionFetch(`${apiUrl}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({ error: true, message: `Evolution API Text failure: ${errorText}` });
      }
    } else {
      return res.status(400).json({ error: true, message: "No text or media provided to send" });
    }

    res.json({ success: true, message: "Message sent successfully" });
  } catch (err: any) {
    console.error("Error sending Finance message:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to send Finance message" });
  }
});

// Endpoint para gerar a foto e notificar no grupo de whatsapp da lancha/jet
app.post("/api/whatsapp/send-calendar", requireAnyAuth, whatsappLimiter, async (req, res) => {
  try {
    const { base64Image, groupId, boatName, clientName, dates, caption } = req.body;
    
    if (!base64Image || !groupId) {
      return res.status(400).json({ error: true, message: "Missing base64Image or groupId" });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || req.body.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured on VPS" });
    }

    const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const payload = {
      number: groupId,
      mediatype: "image",
      mimetype: "image/png",
      caption: caption || `📅 ✅`,
      media: base64Data
    };

    const response = await evolutionFetch(`${apiUrl}/message/sendMedia/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API error:", response.status, errorText);
      return res.status(502).json({ error: true, message: `Evolution API failure: ${response.statusText}` });
    }

    res.json({ success: true, message: "Calendar sent successfully to WhatsApp" });
  } catch (err: any) {
    console.error("Error sending WhatsApp calendar:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to send WhatsApp message" });
  }
});

// ---------------- Boletos (Upload & Send) ----------------

// Helper to normalize strings for fuzzy matching
function normalizeString(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

app.post("/api/boletos/upload", upload.array('boletos', 50), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: true, message: "Nenhum arquivo enviado" });
    }

    const results = [];

    for (const file of files) {
      if (file.mimetype !== 'application/pdf') {
        continue;
      }

      // Load PDF to check and split pages
      const pdfDoc = await PDFDocument.load(file.buffer);
      const pageCount = pdfDoc.getPageCount();

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        // Extract single page
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageIndex]);
        singlePagePdf.addPage(copiedPage);
        const singlePageBytes = await singlePagePdf.save();
        const singlePageBuffer = Buffer.from(singlePageBytes);

        // Parse single page PDF
        const parser = new PDFParse({ data: singlePageBuffer });
        const pdfData = await parser.getText();
        await parser.destroy();
        const text = pdfData.text;
        
        let payerName = "";
        
        // Basic extraction logic: try to find "Pagador" or "Sacado"
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const upperLine = line.toUpperCase();
          
          // Remove accents for checking
          const cleanLine = upperLine.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          
          if (cleanLine === "PAGADOR" || cleanLine === "SACADO" || cleanLine.startsWith("PAGADOR:") || cleanLine.startsWith("PAGADOR -") || cleanLine.startsWith("SACADO:") || cleanLine.startsWith("SACADO -")) {
            if (cleanLine === "PAGADOR" || cleanLine === "SACADO") {
               // The name is on the next line
               if (i + 1 < lines.length) {
                 payerName = lines[i + 1].trim();
                 if (payerName.includes(" - CPF/CNPJ")) payerName = payerName.split(" - CPF/CNPJ")[0].trim();
                 if (payerName.length > 3) break;
               }
            } else {
              // It's on the same line like PAGADOR: Nome
              const match = cleanLine.match(/^(?:PAGADOR|SACADO)(?:\s*:\s*|\s+-\s+)(.+)/);
              if (match && match[1].trim().length > 3) {
                payerName = match[1].trim();
                if (payerName.includes(" - CPF/CNPJ")) payerName = payerName.split(" - CPF/CNPJ")[0].trim();
                break;
              }
            }
          }
        }
        
        // Save temporarily
        const originalBase = file.originalname.replace('.pdf', '');
        const tempFilename = `boleto_${Date.now()}_${Math.random().toString(36).substring(2,7)}.pdf`;
        const tempPath = path.join(boletosUploadsDir, tempFilename);
        fs.writeFileSync(tempPath, singlePageBuffer);
        
        const displayOriginalName = pageCount > 1 ? `${originalBase} - Pag ${pageIndex + 1}.pdf` : file.originalname;

        results.push({
          originalName: displayOriginalName,
          payerName,
          tempPath: `/uploads/boletos/${tempFilename}`,
          localPath: tempPath // Keep local path for later sending
        });
      }
    }

    res.json({ success: true, boletos: results });
  } catch (err: any) {
    console.error("Error processing boletos:", err);
    fs.appendFileSync('boleto-debug.log', new Date().toISOString() + ' | ' + err.message + '\n' + err.stack + '\n---\n');
    res.status(500).json({ error: true, message: "Erro ao processar boletos. Verifique o arquivo boleto-debug.log no servidor." });
  }
});

app.post("/api/boletos/match-clients", requireAdminAuth, async (req, res) => {
  try {
    const { names } = req.body; // array of strings
    if (!names || !Array.isArray(names)) {
      return res.status(400).json({ error: true, message: "Names array is required" });
    }

    const dbData = await pullDatabase();
    const clients = dbData.clients || [];
    
    const results = names.map((name: string) => {
      if (!name) return { name, match: null, confidence: 'none' };
      
      const normName = normalizeString(name);
      
      // Exact match
      let match = clients.find((c: any) => normalizeString(c.nome) === normName);
      if (match) return { name, match, confidence: 'alta' };
      
      // Includes / partial match
      match = clients.find((c: any) => {
        const normC = normalizeString(c.nome);
        return normName.includes(normC) || normC.includes(normName);
      });
      if (match) return { name, match, confidence: 'media' };
      
      // Very basic fuzzy (split words)
      const nameWords = normName.split(/\s+/).filter(w => w.length > 2);
      match = clients.find((c: any) => {
        const cWords = normalizeString(c.nome).split(/\s+/);
        let matches = 0;
        for (const w of nameWords) {
          if (cWords.includes(w)) matches++;
        }
        return matches >= 2; // at least 2 words match
      });
      
      if (match) return { name, match, confidence: 'baixa' };
      
      return { name, match: null, confidence: 'none' };
    });

    res.json({ success: true, matches: results });
  } catch (err: any) {
    console.error("Error matching clients:", err);
    res.status(500).json({ error: true, message: "Erro ao fazer matching de clientes." });
  }
});

app.post("/api/boletos/send", requireAdminAuth, whatsappLimiter, async (req, res) => {
  try {
    const { instanceName, boletos } = req.body;
    // boletos = [{ clientId, number, text, localPath, fileName }]
    
    if (!instanceName || !boletos || !Array.isArray(boletos)) {
      return res.status(400).json({ error: true, message: "Parâmetros inválidos" });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured" });
    }

    const results = [];

    for (const boleto of boletos) {
      try {
        let cleanedNumber = boleto.number.replace(/\D/g, "");
        if (cleanedNumber.length >= 10 && cleanedNumber.length <= 11 && !cleanedNumber.startsWith("55")) {
          cleanedNumber = `55${cleanedNumber}`;
        }
        
        // Read file
        if (!fs.existsSync(boleto.localPath)) {
          results.push({ clientId: boleto.clientId, status: 'error', error: 'Arquivo não encontrado' });
          continue;
        }
        
        const fileBuffer = fs.readFileSync(boleto.localPath);
        const base64Data = fileBuffer.toString('base64');
        
        const payload = {
          number: cleanedNumber,
          mediatype: "document",
          mimetype: "application/pdf",
          caption: boleto.text || "",
          media: base64Data,
          fileName: boleto.fileName || "boleto.pdf"
        };
        
        const response = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": apiKey },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          results.push({ clientId: boleto.clientId, status: 'error', error: errorText });
        } else {
          results.push({ clientId: boleto.clientId, status: 'success' });
          // Cleanup file after successful send
          try {
            fs.unlinkSync(boleto.localPath);
          } catch (e) {
            console.error("Erro ao deletar boleto temporário:", e);
          }
        }
        
        // Wait 2 seconds before sending next (rate limiting)
        await new Promise(r => setTimeout(r, 2000));
        
      } catch (err: any) {
        results.push({ clientId: boleto.clientId, status: 'error', error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err: any) {
    console.error("Error sending boletos:", err);
    res.status(500).json({ error: true, message: "Erro ao enviar boletos." });
  }
});

// ---------------- Feedbacks (Central de Reclamações & Melhorias) ----------------

// Route: Get all feedbacks (Admin only)
app.get("/api/feedbacks", requireAdminAuth, async (req, res) => {
  try {
    const feedbacks = await getAllFeedbacks();
    res.json({ success: true, feedbacks });
  } catch (err: any) {
    console.error("Error getting feedbacks:", err);
    res.status(500).json({ error: true, message: "Erro ao buscar feedbacks." });
  }
});

// Route: Identify client by CPF safely (Public)
app.post("/api/feedbacks/identificar", async (req, res) => {
  try {
    const { cpf } = req.body;
    if (!cpf) {
      return res.status(400).json({ error: true, message: "CPF é obrigatório." });
    }
    const cleanCpf = cpf.replace(/\D/g, '');
    const client = await getClientByCpf(cleanCpf);
    if (!client) {
      return res.status(404).json({ error: true, message: "Cliente não encontrado." });
    }
    
    // Format name safely: "Deivid Nico" -> "Deivid N."
    const nameParts = client.nome.trim().split(/\s+/);
    let safeName = nameParts[0];
    if (nameParts.length > 1) {
      const lastName = nameParts[nameParts.length - 1];
      if (lastName.length > 0) {
        safeName += ` ${lastName[0]}.`;
      }
    }

    res.json({ success: true, nome: safeName });
  } catch (err: any) {
    console.error("Error identifying client for feedback:", err);
    res.status(500).json({ error: true, message: "Erro ao buscar cliente." });
  }
});

// Route: Submit a new feedback (Public)
app.post("/api/feedbacks", async (req, res) => {
  try {
    const { cpf, nomeCliente, telefoneCliente, categoria, nota, comentario } = req.body;
    if (!categoria || !nota || !comentario) {
      return res.status(400).json({ error: true, message: "Campos categoria, nota e comentário são obrigatórios." });
    }
    
    let clienteId = null;
    let finalNome = nomeCliente;
    let finalTelefone = telefoneCliente;

    if (cpf) {
      const cleanCpf = cpf.replace(/\D/g, '');
      const client = await getClientByCpf(cleanCpf);
      if (client) {
        clienteId = client.id;
        if (!finalNome) finalNome = client.nome;
        if (!finalTelefone) finalTelefone = client.telefone;
      }
    }

    const id = "fb_" + crypto.randomUUID();
    const feedback = {
      id,
      clienteId,
      nomeCliente: finalNome || null,
      telefoneCliente: finalTelefone || null,
      categoria,
      nota: parseInt(nota, 10),
      comentario,
      status: "pendente",
      respostaAdmin: null,
      createdAt: new Date().toISOString()
    };

    await upsertFeedback(feedback);
    writeAuditLog("public", "anonymous", "CREATE_FEEDBACK", req.ip, `ID: ${id}, Categoria: ${categoria}`);
    res.json({ success: true, feedback });
  } catch (err: any) {
    console.error("Error saving feedback:", err);
    res.status(500).json({ error: true, message: "Erro ao enviar feedback." });
  }
});

// Route: Respond to or update feedback status (Admin only)
app.post("/api/feedbacks/:id/responder", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, respostaAdmin } = req.body;

    const currentFeedbacks = await getAllFeedbacks();
    const fb = currentFeedbacks.find(x => x.id === id);
    if (!fb) {
      return res.status(404).json({ error: true, message: "Feedback não encontrado." });
    }

    const updated = {
      ...fb,
      status: status || fb.status,
      respostaAdmin: respostaAdmin !== undefined ? respostaAdmin : fb.respostaAdmin
    };

    await upsertFeedback(updated);
    writeAuditLog((req as any).user.username, "admin", "RESPOND_FEEDBACK", req.ip, `ID: ${id}, Status: ${status}`);
    res.json({ success: true, feedback: updated });
  } catch (err: any) {
    console.error("Error responding to feedback:", err);
    res.status(500).json({ error: true, message: "Erro ao registrar resposta." });
  }
});

// Route: Delete feedback (Admin only)
app.delete("/api/feedbacks/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteFeedback(id);
    writeAuditLog((req as any).user.username, "admin", "DELETE_FEEDBACK", req.ip, `ID: ${id}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting feedback:", err);
    res.status(500).json({ error: true, message: "Erro ao deletar feedback." });
  }
});

// Route: Public endpoint to view a shared checklist by reservation ID
app.get("/api/public/checklist/:checklistId", async (req, res) => {
  try {
    const { checklistId } = req.params;
    if (!checklistId) {
      return res.status(400).json({ success: false, message: "ID do checklist é obrigatório." });
    }

    const dbData = await pullDatabase();
    const reserva = dbData.reservations?.find((r: any) => r.id === checklistId);

  } catch (err: any) {
    console.error("Error fetching shared checklist:", err);
    return res.status(500).json({ success: false, message: "Erro interno ao carregar checklist." });
  }
});

// ---------------- Internal Chat & Drive (Admin/Financeiro) ----------------

app.get("/api/chat/messages", requireAdminAuth, async (req, res) => {
  try {
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    const [messages] = await currentPool.query("SELECT * FROM ChatMessages ORDER BY createdAt ASC LIMIT 500");
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.get("/api/drive/folders", requireAdminAuth, async (req, res) => {
  try {
    const clienteId = req.query.clienteId;
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    
    let query = "SELECT * FROM DriveFolders WHERE clienteId IS NULL ORDER BY name ASC";
    let params: any[] = [];
    if (clienteId) {
      query = "SELECT * FROM DriveFolders WHERE clienteId = ? ORDER BY name ASC";
      params = [clienteId];
    }
    const [folders] = await currentPool.query(query, params);
    res.json({ success: true, folders });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.get("/api/drive/files", requireAdminAuth, async (req, res) => {
  try {
    const clienteId = req.query.clienteId;
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    
    let query = "SELECT * FROM DriveFiles WHERE clienteId IS NULL ORDER BY createdAt DESC";
    let params: any[] = [];
    if (clienteId) {
      query = "SELECT * FROM DriveFiles WHERE clienteId = ? ORDER BY createdAt DESC";
      params = [clienteId];
    }
    const [files] = await currentPool.query(query, params);
    res.json({ success: true, files });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.post("/api/drive/folder", requireAdminAuth, async (req, res) => {
  try {
    const { name, parentId, clienteId } = req.body;
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    const id = `folder_${Date.now()}`;
    await currentPool.query(
      "INSERT INTO DriveFolders (id, name, parentId, clienteId, createdAt) VALUES (?, ?, ?, ?, ?)",
      [id, name, parentId || null, clienteId || null, new Date().toISOString()]
    );
    res.json({ success: true, folder: { id, name, parentId: parentId || null, clienteId: clienteId || null } });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.post("/api/drive/upload", requireAdminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: "Nenhum arquivo enviado." });
    
    const { folderId, clienteId } = req.body;
    const uploaderName = (req as any).user.username;
    
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });

    // In a real app we'd save to disk. For MVP, we save using fs
    const uniqueFilename = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(driveUploadsDir, uniqueFilename);
    fs.writeFileSync(filePath, req.file.buffer);

    const id = `file_${Date.now()}`;
    const fileRecord = {
      id,
      folderId: folderId || null,
      filename: uniqueFilename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: uploaderName,
      createdAt: new Date().toISOString()
    };

    await currentPool.query(
      "INSERT INTO DriveFiles (id, folderId, filename, originalName, mimeType, size, uploadedBy, clienteId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, fileRecord.folderId, fileRecord.filename, fileRecord.originalName, fileRecord.mimeType, fileRecord.size, fileRecord.uploadedBy, clienteId || null, fileRecord.createdAt]
    );

    res.json({ success: true, file: fileRecord });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

app.delete("/api/drive/file/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    
    const [files] = await currentPool.query("SELECT * FROM DriveFiles WHERE id = ?", [id]);
    if ((files as any[]).length > 0) {
      const file = (files as any[])[0];
      const filePath = path.join(driveUploadsDir, file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await currentPool.query("DELETE FROM DriveFiles WHERE id = ?", [id]);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.delete("/api/drive/folder/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    
    const [files] = await currentPool.query("SELECT * FROM DriveFiles WHERE folderId = ?", [id]);
    for (const file of (files as any[])) {
      const filePath = path.join(driveUploadsDir, file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await currentPool.query("DELETE FROM DriveFiles WHERE folderId = ?", [id]);
    await currentPool.query("DELETE FROM DriveFolders WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Socket.io integration
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (socket as any).user = decoded;
    } catch (err) {
      (socket as any).user = { username: 'Operador', role: 'marina' };
    }
  } else {
    (socket as any).user = { username: 'Operador', role: 'marina' };
  }
  next();
});

io.on("connection", (socket) => {
  const username = (socket as any).user?.username || 'Operador';
  console.log(`User connected to socket: ${username}`);

  socket.on("sendMessage", async (data) => {
    try {
      const currentPool = getDbPool();
      if (!currentPool) return;
      
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
      const newMsg = {
        id: msgId,
        senderId: (socket as any).user.id || (socket as any).user.username,
        senderName: (socket as any).user.username,
        content: data.content,
        isSystemMessage: 0,
        createdAt: new Date().toISOString()
      };

      await currentPool.query(
        "INSERT INTO ChatMessages (id, senderId, senderName, content, createdAt, isSystemMessage) VALUES (?, ?, ?, ?, ?, ?)",
        [newMsg.id, newMsg.senderId, newMsg.senderName, newMsg.content, newMsg.createdAt, newMsg.isSystemMessage]
      );

      io.emit("receiveMessage", newMsg);
    } catch (err) {
      console.error("Socket error saving msg:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${username}`);
  });
});

// ---------------- Vite Middleware Routing ----------------

async function setupViteAndListen() {
  // Initialize Database Pool & ensure DB tables exist in MySQL/MariaDB
  try {
    await initializeDatabase();
  } catch (e) {
    console.warn("Could not auto-initialize tables:", e);
  }

  if (process.env.NODE_ENV !== "production") {
    // Development mode uses Vite Dev Middleware for HMR/Asset bundle
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    
    app.use(vite.middlewares);
    
    console.log("Vite dev server middleware integrated.");
  } else {
    // Production mode serves the compiled final static package
    const distPath = path.join(process.cwd(), "dist");
    
    // Global JSON error handler for API routes
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error("Express API Error:", err);
      if (req.path.startsWith("/api/")) {
        return res.status(err.status || 500).json({
          error: true,
          message: err.message || "Erro interno do servidor."
        });
      }
      next(err);
    });

    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    
    console.log("Serving production build from dist.");
  }

  // Bind server listener
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running internally on http://0.0.0.0:${PORT}`);
  });
}

// Start Server Setup
setupViteAndListen().catch((error) => {
  console.error("Vite/Express Setup failed crash:", error);
});


// ---------------- Comercial User Preferences ----------------

app.get("/api/comercial/preferences", requireAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) return res.status(401).json({ error: true, message: "Unauthorized" });
    const prefs = await getUserPreferences(user.id);
    res.json(prefs || {});
  } catch(err: any) {
    res.status(500).json({ error: true, message: err.message || "Error fetching preferences" });
  }
});

app.post("/api/comercial/preferences", requireAdminAuth, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'background', maxCount: 1 }]), async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) return res.status(401).json({ error: true, message: "Unauthorized" });
    
    const { greetingText } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    let logoUrl = req.body.logoUrl || null;
    let backgroundUrl = req.body.backgroundUrl || null;

    if (files && files['logo'] && files['logo'][0]) {
      const file = files['logo'][0];
      const filename = `logo_${Date.now()}_${file.originalname}`;
      fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
      logoUrl = `/uploads/${filename}`;
    }

    if (files && files['background'] && files['background'][0]) {
      const file = files['background'][0];
      const filename = `bg_${Date.now()}_${file.originalname}`;
      fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
      backgroundUrl = `/uploads/${filename}`;
    }

    const prefs = await getUserPreferences(user.id);
    await upsertUserPreferences(user.id, {
      logoUrl: logoUrl !== undefined ? logoUrl : (prefs?.logoUrl || null),
      backgroundUrl: backgroundUrl !== undefined ? backgroundUrl : (prefs?.backgroundUrl || null),
      greetingText: greetingText !== undefined ? greetingText : (prefs?.greetingText || null)
    });

    res.json({ success: true, logoUrl, backgroundUrl, greetingText });
  } catch(err: any) {
    console.error(err);
    res.status(500).json({ error: true, message: err.message || "Error saving preferences" });
  }
});
