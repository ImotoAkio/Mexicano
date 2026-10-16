import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

// Load environment variables early
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_change_in_production";

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600, // Permite navegação fluida e sincronização sem estourar limites
  message: { error: true, message: "Taxa de requisições excedida." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: true, message: "Taxa excedida para operação sensível." },
});

export const whatsappLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: true, message: "Taxa excedida para disparos de WhatsApp." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
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
    const decoded = jwt.verify(token, JWT_SECRET) as any;
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

export function requireClientAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
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
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: true, message: "Token inválido ou expirado." });
  }
}

export function writeAuditLog(userId: string, userRole: string, action: string, ip: string, details?: string) {
  const clientIp = ip || 'unknown';
  const timestamp = new Date().toISOString();
  const logEntry = `[AUDIT] IP: ${clientIp} | User: ${userId} (${userRole}) | Action: ${action} | Details: ${details || "N/A"}`;
  console.log(logEntry);
}

import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit (adjusted from comment 5MB to 20MB match)
});
