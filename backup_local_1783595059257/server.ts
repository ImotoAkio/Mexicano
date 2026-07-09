import express from "express";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { createServer as createViteServer } from "vite";
import { Server as SocketIOServer } from "socket.io";
import http from "http";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import fs from "fs";
import crypto from "crypto";
import {
  getDbPool, getDbStatus, initializeDatabase, pullDatabase,
  upsertClient, deleteClient, upsertBoat, deleteBoat,
  upsertReservation, deleteReservation, bulkSyncDatabase,
  getConfigValue, setConfigValue, getClientByCpf,
  getAdminByUsername, getClientAuth, upsertClientAuth,
  getAllAdmins, createAdmin, updateAdmin, deleteAdmin,
  getAllTransacoes, upsertTransacao, deleteTransacao, syncClientFinancialStatus,
  getAllAtividades, upsertAtividade, deleteAtividade,
  getAllFeedbacks, upsertFeedback, deleteFeedback,
  upsertManutencao, deleteManutencao,
  getAllMecanicos, upsertMecanico, deleteMecanico,
  upsertFuncionario, deleteFuncionario,
  upsertFolga, deleteFolga
} from "./server-db";

// Load environment variables early
dotenv.config();

process.on("uncaughtException", (err) => {
  console.error("FATAL UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("FATAL UNHANDLED REJECTION:", reason);
});

// Ignore SSL certificate errors (due to Evolution API cert issues)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// JWT secret — use env var or generate a random fallback (should be set in production)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET must be defined in environment.");
  process.exit(1);
}
const JWT_EXPIRY = "8h";
const JWT_CLIENT_EXPIRY = "4h";

// Create Express app
const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
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
      connectSrc: ["'self'", "https://www.googleapis.com", "https://api.open-meteo.com", "ws:", "wss:"],
      imgSrc: ["'self'", "data:", "blob:", "https://api.qrserver.com"],
      upgradeInsecureRequests: null,
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: false,
}));

// CORS configuration - allow standard local development origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.5.152:3000"
];
if (process.env.APP_URL) {
  allowedOrigins.push(process.env.APP_URL);
}
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://192.168.")) {
      callback(null, true);
    } else {
      callback(new Error("CORS access denied."));
    }
  },
  credentials: true
}));

// Audit Logging Utility for LGPD Compliance (Art. 37)
function writeAuditLog(userId: string, userRole: string, action: string, ip: string, details?: string) {
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
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(boatsUploadsDir)) fs.mkdirSync(boatsUploadsDir, { recursive: true });
if (!fs.existsSync(clientsUploadsDir)) fs.mkdirSync(clientsUploadsDir, { recursive: true });
if (!fs.existsSync(checklistUploadsDir)) fs.mkdirSync(checklistUploadsDir, { recursive: true });
if (!fs.existsSync(comprovantesUploadsDir)) fs.mkdirSync(comprovantesUploadsDir, { recursive: true });
if (!fs.existsSync(driveUploadsDir)) fs.mkdirSync(driveUploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit


const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: true, message: "Taxa de requisições excedida." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: true, message: "Taxa excedida para operação sensível." },
});

const whatsappLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
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
let cachedAuthClient: JWT | null = null;
let lastUsedSAJson: string | null = null;

// Helper to load credentials and initialize standard Google Auth Client
async function getGoogleAuthClient(): Promise<JWT | null> {
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

// ---------------- Auth Middleware ----------------

// Middleware: Require admin JWT token
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Token de autenticação não fornecido." });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== "admin" && decoded.role !== "marina" && decoded.role !== "financeiro") {
      return res.status(403).json({ error: true, message: "Acesso negado. Permissão insuficiente." });
    }
    (req as any).user = decoded;
    next();
  } catch (err) {
    console.error("JWT Verification failed:", err);
    return res.status(401).json({ error: true, message: "Token inválido ou expirado." });
  }
}

function requireClientAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Token não fornecido." });
  }
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
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
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    if (decoded.role !== "admin" && decoded.role !== "client" && decoded.role !== "marina" && decoded.role !== "financeiro") {
      return res.status(403).json({ error: true, message: "Acesso negado." });
    }
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

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role || "admin" },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    writeAuditLog(admin.username, "admin", "LOGIN_SUCCESS", req.ip);
    res.json({ success: true, token, username: admin.username });
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
    const reservations = allReservations.filter((r: any) => r.clienteId === client.id);

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
app.get("/api/auth/validate", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ valid: false });
  }

  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    res.json({ valid: true, role: decoded.role, username: decoded.username, nome: decoded.nome, id: decoded.id });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// Route: Get client data using JWT (secure data fetch)
app.get("/api/client/me", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const dbData = await pullDatabase();
    const client = dbData.clients.find((c: any) => c.id === userId);

    if (!client) {
      return res.status(404).json({ error: true, message: "Cliente não encontrado." });
    }

    const clientBoatsList = client.embarcacoes && client.embarcacoes.length > 0
      ? client.embarcacoes.map((eb: any) => eb.embarcacaoId)
      : [client.embarcacaoId];

    const boats = dbData.boats.filter((b: any) => clientBoatsList.includes(b.id));
    const reservations = dbData.reservations.filter((r: any) => r.clienteId === client.id);

    writeAuditLog(client.nome, "client", "FETCH_DATA", req.ip, `ID: ${client.id}`);
    res.json({ client, boats, reservations });
  } catch (err: any) {
    console.error("Client data fetch error:", err);
    res.status(500).json({ error: true, message: "Erro ao carregar dados do cliente." });
  }
});

// Route: Create a new reservation for the client securely
app.post("/api/client/reserve", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { embarcacaoId, date, periodo = 'dia_inteiro', observacoes = '' } = req.body;

    const dbData = await pullDatabase();
    const client = dbData.clients.find((c: any) => c.id === userId);

    if (!client) {
      return res.status(404).json({ error: true, message: "Cliente não encontrado." });
    }

    const clientBoatsList = client.embarcacoes && client.embarcacoes.length > 0
      ? client.embarcacoes.map((eb: any) => eb.embarcacaoId)
      : [client.embarcacaoId];

    if (!clientBoatsList.includes(embarcacaoId)) {
      return res.status(403).json({ error: true, message: "Acesso negado à embarcação." });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) {
      return res.status(400).json({ error: true, message: "Não é possível reservar datas passadas." });
    }

    // Check overlaps
    const overlaps = dbData.reservations.filter((r: any) => 
      r.embarcacaoId === embarcacaoId && r.data === date && r.status !== 'cancelado'
    );
    if (overlaps.length > 0) {
      return res.status(400).json({ error: true, message: "A embarcação já possui reserva para esta data." });
    }

    // Check limits
    const activeReservations = dbData.reservations.filter((r: any) => 
      r.clienteId === userId && r.status !== 'cancelado' && r.data >= todayStr
    );
    if (activeReservations.length >= 2) {
      return res.status(400).json({ error: true, message: "Você atingiu o limite máximo de 2 reservas ativas simultâneas." });
    }

    const newRes = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
      embarcacaoId,
      clienteId: userId,
      data: date,
      periodo,
      observações: observacoes,
      status: 'confirmado', // Automatically confirmed per requirements
      createdAt: new Date().toISOString()
    };

    await upsertReservation(newRes);

    io.emit("marina_update");

    writeAuditLog(client.nome, "client", "CREATE_RESERVATION", req.ip, `Reserva criada: ${date} - ${embarcacaoId}`);
    res.json({ success: true, reservation: newRes });
  } catch (err: any) {
    console.error("Client reserve error:", err);
    res.status(500).json({ error: true, message: "Erro ao realizar agendamento." });
  }
});

// Route: Update a reservation's googleEventId securely for a client
app.post("/api/client/update-reservation", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id, googleEventId } = req.body;
    
    if (!id || !googleEventId) {
      return res.status(400).json({ error: true, message: "Faltam parâmetros." });
    }

    const currentPool = getDbPool();
    if (!currentPool) {
      return res.status(500).json({ error: true, message: "Banco de dados indisponível." });
    }

    await currentPool.query(
      "UPDATE Reservas SET googleEventId = ? WHERE id = ? AND clienteId = ?",
      [googleEventId, id, userId]
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error("Client update reservation error:", err);
    res.status(500).json({ error: true, message: "Erro ao atualizar agendamento." });
  }
});

// Route: Register data deletion request under LGPD (Art. 18)
app.post("/api/client/request-deletion", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userName = (req as any).user.nome;
    
    // Log the request for compliance audit
    writeAuditLog(userName, "client", "REQUEST_DATA_DELETION", req.ip, `Solicitação de exclusão recebida para ID: ${userId}`);

    res.json({
      success: true,
      message: "Sua solicitação de exclusão de dados pessoais foi registrada com sucesso sob protocolo LGPD. O Encarregado de Dados (DPO) entrará em contato em até 15 dias."
    });
  } catch (err: any) {
    console.error("Data deletion request error:", err);
    res.status(500).json({ error: true, message: "Erro ao processar solicitação de exclusão." });
  }
});

// Route: Client day-of checkin (NORMAM info)
app.post("/api/client/checkin", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id, previsaoSaida, previsaoChegada, pessoasABordo, destino } = req.body;
    
    if (!id || !previsaoSaida || !pessoasABordo || !previsaoChegada || !destino) {
      return res.status(400).json({ error: true, message: "Faltam parâmetros obrigatórios para a NORMAM." });
    }

    const currentPool = getDbPool();
    if (!currentPool) {
      return res.status(500).json({ error: true, message: "Banco de dados indisponível." });
    }

    await currentPool.query(
      "UPDATE Reservas SET previsaoSaida = ?, previsaoChegada = ?, pessoasABordo = ?, destino = ?, statusMarina = 'confirmado' WHERE id = ? AND clienteId = ?",
      [previsaoSaida, previsaoChegada, pessoasABordo, destino, id, userId]
    );

    io.emit("marina_update");

    res.json({ success: true });
  } catch (err: any) {
    console.error("Client checkin error:", err);
    res.status(500).json({ error: true, message: "Erro interno: " + err.message, stack: err.stack });
  }
});

// Route: Client cancel reservation
app.post("/api/client/cancel-reservation", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: true, message: "Falta o ID da reserva." });
    }

    const currentPool = getDbPool();
    if (!currentPool) {
      return res.status(500).json({ error: true, message: "Banco de dados indisponível." });
    }

    await currentPool.query(
      "UPDATE Reservas SET status = 'cancelado' WHERE id = ? AND clienteId = ?",
      [id, userId]
    );

    io.emit("marina_update");

    res.json({ success: true });
  } catch (err: any) {
    console.error("Client cancel reservation error:", err);
    res.status(500).json({ error: true, message: "Erro ao cancelar agendamento." });
  }
});

// ---------------- Public API Routes (No Auth) ----------------

// Route: Public boats listing for landing page
app.get("/api/public/boats", async (req, res) => {
  try {
    const data = await pullDatabase();
    const publicBoats = data.boats.map((b: any) => ({
      id: b.id,
      tipo: b.tipo,
      nome: b.nome,
      numero: b.numero,
      modelo: b.modelo,
      fabricante: b.fabricante,
      ano: b.ano,
      imagemUrl: b.imagemUrl || null,
      emManutencao: b.emManutencao || false,
    }));
    res.json(publicBoats);
  } catch (err: any) {
    res.status(500).json([]);
  }
});

// ---------------- Protected API Routes (Require Admin JWT) ----------------

// Route: Financeiro - Transacoes
app.get("/api/financeiro/transacoes", requireAdminAuth, async (req, res) => {
  try {
    const transacoes = await getAllTransacoes();
    res.json(transacoes);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch transacoes" });
  }
});

app.post("/api/financeiro/transacoes/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteTransacao(data.id);
    } else if (action === 'upsert') {
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.comprovanteUrl && !item.comprovante) {
          item.comprovante = item.comprovanteUrl;
        }
        
        if (item.embarcacaoId && !item.clienteId) {
          const dbData = await pullDatabase();
          const boat = dbData.boats.find((b: any) => b.id === item.embarcacaoId);
          
          if (boat && boat.donos && boat.donos.length > 0) {
            const numDonos = boat.donos.length;
            const valorRateado = Number((item.valor / numDonos).toFixed(2));
            
            for (const donoId of boat.donos) {
              const splitData = {
                ...item,
                id: `${item.id}_${donoId}`,
                clienteId: donoId,
                valor: valorRateado,
                descricao: `${item.descricao ? item.descricao + ' | ' : ''}Rateio Embarcação (1/${numDonos})`
              };
              await upsertTransacao(splitData);
            }
          } else {
            await upsertTransacao(item);
          }
        } else {
          await upsertTransacao(item);
        }
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save transacao" });
  }
});

// Route: Financeiro - Atividades (Kanban)
app.get("/api/financeiro/atividades", requireAdminAuth, async (req, res) => {
  try {
    const atividades = await getAllAtividades();
    res.json(atividades);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch atividades" });
  }
});

app.post("/api/financeiro/atividades/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteAtividade(data.id);
    } else if (action === 'upsert') {
      await upsertAtividade(data);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save atividade" });
  }
});

// Route: Operacional - Funcionarios
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
    res.status(500).json({ error: true, message: err.message || "Failed to save funcionario" });
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

          await pool.query(
            "DELETE FROM TransacoesFinanceiras WHERE id LIKE ?",
            [`fin_manut_${data.id}%`]
          );

          const transacaoBaseId = `fin_manut_${data.id}`;
          const transacaoBase = {
            id: transacaoBaseId,
            tipo: 'receita',
            categoria: 'Serviços/Manutenção',
            valor: baseValor,
            dataVencimento: data.dataSaida,
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
              await upsertTransacao(splitData);
              clientsToSync.add(donoId);
            }
          } else {
            await upsertTransacao(transacaoBase);
          }

          for (const clienteId of clientsToSync) {
            await syncClientFinancialStatus(clienteId);
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

// Route: Upload boat image
app.post("/api/upload/boat-image", requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: "No image file provided." });
    }
    
    const filename = `boat_${Date.now()}.webp`;
    const outputPath = path.join(boatsUploadsDir, filename);
    
    // Process and compress image to webp
    await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true }) // Limit max width
      .webp({ quality: 80 })
      .toFile(outputPath);
      
    const imageUrl = `/uploads/boats/${filename}`;
    res.json({ success: true, imageUrl });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to upload image" });
  }
});

// Route: Upload checklist image
app.post("/api/upload/checklist-image", requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: "No image file provided." });
    }
    
    const filename = `chk_${Date.now()}_${Math.floor(Math.random()*1000)}.webp`;
    const outputPath = path.join(checklistUploadsDir, filename);
    
    // Process and compress image to webp
    await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true }) // Limit max width
      .webp({ quality: 80 })
      .toFile(outputPath);
      
    const imageUrl = `/uploads/checklists/${filename}`;
    res.json({ success: true, imageUrl });
  } catch (err: any) {
    console.error("Checklist Upload error:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to upload checklist image" });
  }
});

// Route: Upload comprovante (accepts images and PDF files)
app.post("/api/upload/comprovante", requireAdminAuth, upload.single('comprovante'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: "Nenhum arquivo fornecido." });
    }
    
    const isPdf = req.file.mimetype === 'application/pdf';
    const isImage = req.file.mimetype.startsWith('image/');
    
    if (!isPdf && !isImage) {
      return res.status(400).json({ error: true, message: "Apenas imagens e arquivos PDF são permitidos." });
    }
    
    let filename: string;
    const originalNameClean = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    if (isImage) {
      filename = `comp_${Date.now()}_${Math.floor(Math.random()*1000)}.webp`;
      const outputPath = path.join(comprovantesUploadsDir, filename);
      await sharp(req.file.buffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);
    } else {
      filename = `comp_${Date.now()}_${originalNameClean}`;
      const outputPath = path.join(comprovantesUploadsDir, filename);
      fs.writeFileSync(outputPath, req.file.buffer);
    }
    
    const fileUrl = `/uploads/comprovantes/${filename}`;
    res.json({ success: true, url: fileUrl });
  } catch (err: any) {
    console.error("Comprovante Upload error:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to upload comprovante" });
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
app.post("/api/db/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
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
      } else {
        await upsertReservation(data);
      }
      io.emit("marina_update");
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
app.post("/api/db/bulk-save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
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
app.get("/api/calendar/config", requireAdminAuth, async (req, res) => {
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
      nautical_csv_mapping
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
            nautical_csv_mapping } = req.body;

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

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: true, message: error.message || "Could not save central configurations to database." });
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
      return res.status(500).json({ error: true, message: "Evolution API not configured" });
    }

    const response = await fetch(`${apiUrl}/instance/connectionState/${instance}`, {
      method: "GET",
      headers: { "apikey": apiKey }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.json({ instance: { state: "close" } }); // Instância pode não existir ainda
      }
      return res.status(502).json({ error: true, message: `Evolution API failure: ${response.statusText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch status" });
  }
});

// Route: Get WhatsApp Connect / QR Code (Evolution API)
app.get("/api/whatsapp/connect", requireAdminAuth, async (req, res) => {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = req.query.instance || process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured" });
    }

    const response = await fetch(`${apiUrl}/instance/connect/${instance}`, {
      method: "GET",
      headers: { "apikey": apiKey }
    });

    if (!response.ok) {
      return res.status(502).json({ error: true, message: `Evolution API failure: ${response.statusText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to connect" });
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

    const response = await fetch(`${apiUrl}/instance/logout/${instance}`, {
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

    const response = await fetch(`${apiUrl}/instance/create`, {
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

    const response = await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
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
    const instance = process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured on VPS" });
    }

    const response = await fetch(`${apiUrl}/group/fetchAllGroups/${instance}?getParticipants=false`, {
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
    res.json({ success: true, groups: data });
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
    const instance = process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured on VPS" });
    }

    const response = await fetch(`${apiUrl}/chat/findContacts/${instance}`, {
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
    res.json({ success: true, contacts: data });
  } catch (err: any) {
    console.error("Error fetching WhatsApp contacts:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to fetch WhatsApp contacts" });
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
    const instance = process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Evolution API not configured on VPS" });
    }

    // Clean number to ensure only digits
    let cleanedNumber = number.replace(/\D/g, "");
    
    // If the number doesn't start with 55 (and length is 10 or 11, typical Brazilian phone number), prepend 55
    if (cleanedNumber.length >= 10 && cleanedNumber.length <= 11 && !cleanedNumber.startsWith("55")) {
      cleanedNumber = `55${cleanedNumber}`;
    }

    const payload = {
      number: cleanedNumber,
      text: text
    };

    const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
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

      const response = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
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

      const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
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
    const instance = process.env.EVOLUTION_INSTANCE || "mexicano";

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

    const response = await fetch(`${apiUrl}/message/sendMedia/${instance}`, {
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
    
    // Naive folder deletion (does not cascade to sub-folders recursively, just files in this exact folder)
    await currentPool.query("DELETE FROM DriveFolders WHERE id = ?", [id]);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Socket.io integration
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== "admin" && decoded.role !== "financeiro" && decoded.role !== "marina") {
      return next(new Error("Permission denied"));
    }
    (socket as any).user = decoded;
    next();
  } catch (err) {
    return next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(`User connected to chat: ${(socket as any).user.username}`);

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

      // Broadcast to all connected clients
      io.emit("receiveMessage", newMsg);
    } catch (err) {
      console.error("Socket error saving msg:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${(socket as any).user.username}`);
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
