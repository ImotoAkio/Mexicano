import express from "express";
import path from "path";
import { uploadToR2, generatePresignedUrl } from "./server-r2";
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
import { apiLimiter, authLimiter, sensitiveLimiter, whatsappLimiter, requireAdminAuth, requireClientAuth, requireAnyAuth, requireMarinaManagerOrAdminAuth, upload } from "./server-routes/middlewares";
import clientRoutes from "./server-routes/client.routes";
import authRoutes from "./server-routes/auth.routes";
import marinaCaixaRoutes from "./server-routes/marina-caixa.routes";
import maintenanceRoutes from "./server-routes/maintenance.routes";
import chamadosRoutes from "./server-routes/chamados.routes";
import tiposManutencaoRoutes from "./server-routes/tipos-manutencao.routes";
import financeiroRoutes from "./server-routes/financeiro.routes";
import webhookRoutes from "./server-routes/webhook.routes";
import publicLeadsRoutes from "./server-routes/leads.routes";
import whatsappRoutes from "./server-routes/whatsapp.routes";
import { PDFDocument } from "pdf-lib";
import uploadRoutes from "./server-routes/upload.routes";
import funcionariosRoutes from "./server-routes/funcionarios.routes";
import fuelRoutes from "./server-routes/fuel.routes";
import { dbRoutes, logsRouter } from "./server-routes/db.routes";
import comercialRoutes from "./server-routes/comercial.routes";
import boletosRoutes from "./server-routes/boletos.routes";
import feedbacksRoutes from "./server-routes/feedbacks.routes";
import driveRoutes from "./server-routes/drive.routes";
import configRoutes from "./server-routes/config.routes";
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
  getFuelInventoryFromDb, saveFuelInventoryInDb, getFuelHistoryFromDb, saveFuelHistoryInDb, resetFuelDataInDb, consumeFuelAtomicDb, restoreFuelAtomicDb,
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
app.locals.io = io; // Expose socket.io to route handlers via req.app.locals.io
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
      connectSrc: ["'self'", "https://www.googleapis.com", "https://api.open-meteo.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "ws:", "wss:", "https://*.r2.cloudflarestorage.com", "https://*.r2.dev"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      mediaSrc: ["'self'", "data:", "blob:", "https:", "http:"],
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


app.use('/api/', apiLimiter);

// Cache loaded client



// --- Core Extracted routes ---

app.use("/api/auth", authRoutes);
app.use("/api/marina/caixa", marinaCaixaRoutes);
app.use("/api/manutencoes", maintenanceRoutes);
app.use("/api/chamados", chamadosRoutes);
app.use("/api/tipos-manutencao", tiposManutencaoRoutes);
// Route: Change password for logged in admin user
app.use('/api/client/', clientRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/leads', publicLeadsRoutes);
app.use("/api", whatsappRoutes);

app.use("/api/db", dbRoutes);
app.use("/api", comercialRoutes);
app.use("/api", boletosRoutes);
app.use("/api", feedbacksRoutes);
app.use("/api", driveRoutes);
app.use("/api", configRoutes);
app.use("/api/logs", logsRouter);
app.use("/api/fuel", fuelRoutes);
app.use("/api", funcionariosRoutes);
app.use("/api/upload", uploadRoutes);



// Route: Public endpoint to view a shared checklist by reservation ID
app.get("/api/public/checklist/:checklistId", async (req, res) => {
  try {
    const { checklistId } = req.params;
    if (!checklistId) {
      return res.status(400).json({ success: false, message: "ID do checklist é obrigatório." });
    }

    const dbData = await pullDatabase();
    const reserva = dbData.reservations?.find((r: any) => r.id === checklistId);

    if (!reserva) {
      return res.status(404).json({ success: false, message: "Checklist de reserva não encontrado." });
    }

    // Anexar dados extras
    let embarcacao = null;
    let cliente = null;
    if (reserva.embarcacaoId) {
       embarcacao = dbData.embarcacoes?.find((e: any) => e.id === reserva.embarcacaoId);
    }
    if (reserva.clienteId) {
       cliente = dbData.clientes?.find((c: any) => c.id === reserva.clienteId);
    }

    return res.json({
      success: true,
      checklist: {
        ...reserva,
        embarcacaoDetalhes: embarcacao,
        clienteDetalhes: cliente
      }
    });

  } catch (err: any) {
    console.error("Error fetching shared checklist:", err);
    return res.status(500).json({ success: false, message: "Erro interno ao carregar checklist." });
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



