import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { getDbPool } from "../server-db";

// Load environment variables early
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET must be defined in environment.");
  process.exit(1);
}

export function getClientIp(req: express.Request): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) return cfIp.trim();

  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();

  return req.ip || req.socket?.remoteAddress || "unknown";
}

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3000, // Limite generoso por IP para permitir SPA, sockets e multiplos acessos simultaneos
  keyGenerator: (req) => getClientIp(req),
  skip: (req) => {
    // Permite que requisicoes essenciais de leitura interna e usuarios autenticados naveguem livremente
    if (req.method === 'GET') {
      const auth = req.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) return true;
      if (req.path === '/db/status' || req.path.startsWith('/config/public') || req.path.startsWith('/m/')) return true;
    }
    return false;
  },
  message: { error: true, message: "Taxa de requisicoes excedida. Aguarde um momento." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  keyGenerator: (req) => getClientIp(req),
  message: { error: true, message: "Taxa excedida para operacao sensivel." },
});

export const whatsappLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  keyGenerator: (req) => getClientIp(req),
  message: { error: true, message: "Taxa excedida para disparos de WhatsApp." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => getClientIp(req),
  message: { error: true, message: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

export function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Token de autenticação não fornecido." });
  }

  const token = authHeader.substring(7);
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ error: true, message: "Token de autenticação inválido." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as any;
    const userRole = (decoded.role || "").toLowerCase().trim();
    
    // External client tokens are prohibited from admin endpoints
    if (userRole === "client") {
      return res.status(403).json({ error: true, message: "Acesso negado. Permissão insuficiente." });
    }

    const validAdminRoles = [
      "admin", "marina_gerente", "marina_operador", "financeiro", "pecas_servicos", "comercial"
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

export function requireMarinaStaffOrAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  requireAdminAuth(req, res, () => {
    const user = (req as any).user;
    const role = (user?.role || "").toLowerCase().trim();
    const isAllowed = role === "admin" || role === "marina_gerente" || role === "marina_operador";
    if (!isAllowed) {
      return res.status(403).json({ error: true, message: "Acesso restrito à equipe da Marina e Administradores." });
    }
    next();
  });
}

export function requireMarinaManagerOrAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  requireAdminAuth(req, res, () => {
    const user = (req as any).user;
    const role = (user?.role || "").toLowerCase().trim();
    const isAllowed = role === "admin" || role === "marina_gerente";
    if (!isAllowed) {
      return res.status(403).json({ error: true, message: "Acesso restrito ao Gerente da Marina e Administradores." });
    }
    next();
  });
}

export function requireStrictAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  requireAdminAuth(req, res, () => {
    const user = (req as any).user;
    const role = (user?.role || "").toLowerCase().trim();
    if (role !== "admin") {
      return res.status(403).json({ error: true, message: "Acesso restrito exclusivamente ao Administrador." });
    }
    next();
  });
}

export async function requireClientAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Token não fornecido." });
  }
  const token = authHeader.substring(7);
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ error: true, message: "Token inválido." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as any;
    if (decoded.role !== "client") {
      return res.status(403).json({ error: true, message: "Acesso negado." });
    }

    // Validação de tokenVersion e status ativo do cliente
    const pool = getDbPool();
    if (pool) {
      const [authRows] = await pool.query(
        "SELECT tokenVersion FROM ClienteAuth WHERE clienteId = ?",
        [decoded.id]
      );
      const authRecord = (authRows as any[])[0];
      if (!authRecord) {
        if (decoded.reservaId) {
          // Token originado de Magic Link: assegura registro inicial em ClienteAuth sem derrubar a sessão
          await pool.query(
            "INSERT INTO ClienteAuth (clienteId, passwordHash, tokenVersion) VALUES (?, '', 1) ON DUPLICATE KEY UPDATE tokenVersion = COALESCE(tokenVersion, 1)",
            [decoded.id]
          ).catch(() => {});
        } else {
          return res.status(401).json({ error: true, message: "Sessão revogada ou credenciais resetadas." });
        }
      } else {
        const currentTv = authRecord.tokenVersion ?? 1;
        const tokenTv = decoded.tv ?? 1;
        if (tokenTv !== currentTv && !decoded.reservaId) {
          return res.status(401).json({ error: true, message: "Sessão expirada devido a alteração de senha ou redefinição de acesso." });
        }
      }

      const [clientRows] = await pool.query(
        "SELECT status FROM Clientes WHERE id = ?",
        [decoded.id]
      );
      const client = (clientRows as any[])[0];
      if (client && client.status === 'inativo') {
        return res.status(403).json({ error: true, message: "Cadastro inativo. Entre em contato com a administração." });
      }
    }

    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: true, message: "Token inválido ou expirado." });
  }
}

export function requireAnyAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Token não fornecido." });
  }
  const token = authHeader.substring(7);
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ error: true, message: "Token inválido." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as any;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: true, message: "Token inválido ou expirado." });
  }
}

function maskSensitiveAudit(val: string): string {
  if (!val) return val;
  // Máscara para CPF nos logs (ex: 123.***.***-45 ou 12345678901 -> 123.***.***-01)
  const clean = val.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.***.***-${clean.slice(-2)}`;
  }
  return val;
}

export function writeAuditLog(userId: string, userRole: string, action: string, ip: string, details?: string) {
  const clientIp = ip || 'unknown';
  const timestamp = new Date().toISOString();
  const maskedUser = maskSensitiveAudit(userId);
  const logEntry = `[AUDIT] [${timestamp}] IP: ${clientIp} | User: ${maskedUser} (${userRole}) | Action: ${action} | Details: ${details || "N/A"}`;
  console.log(logEntry);
}

import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit (adjusted from comment 5MB to 20MB match)
});
