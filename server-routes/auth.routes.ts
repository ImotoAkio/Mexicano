import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getAdminByUsername, getClientByCpf, getClientAuth, upsertClientAuth, pullDatabase, updateAdmin } from "../server-db";
import { authLimiter } from "./middlewares";
import { sanitizeClientPayload } from "./client.routes";

// Mock writeAuditLog since we are refactoring incrementally. 
// We will export/import it properly from server.ts later.
import { writeAuditLog } from "./middlewares"; 

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_change_in_production";
const JWT_EXPIRY = "8h";
const JWT_CLIENT_EXPIRY = "30d";
const authRoutes = Router();

// ---------------- Auth Routes (Public) ----------------

// Route: Admin login
authRoutes.post("/admin", authLimiter, async (req, res) => {
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
    let funcionarioNome = admin.funcionarioNome || admin.nome || admin.username;
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

// Route: Check client registration (CPF)
authRoutes.post("/client/check", authLimiter, async (req, res) => {
  const { identifier } = req.body;
  const cleanId = String(identifier || '').replace(/\D/g, '');
  if (!cleanId || cleanId.length !== 11) {
    return res.status(400).json({ error: true, message: "Informe um CPF válido com 11 dígitos." });
  }

  try {
    const client = await getClientByCpf(cleanId);
    
    if (!client) {
      writeAuditLog(cleanId, "client", "LOGIN_CHECK_FAILED", req.ip, "CPF não cadastrado");
      return res.status(401).json({ error: true, message: "Cadastro não encontrado. Este é um sistema fechado apenas para clientes do Grupo Vila Náutica." });
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
authRoutes.post("/client", authLimiter, async (req, res) => {
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
    const rawReservations = allReservations.filter((r: any) => clientBoatsList.includes(r.embarcacaoId));
    const rawTransacoes = (dbData.transacoes || []).filter((t: any) => t.clienteId === client.id && t.tipo === 'receita');
    const { safeClient, safeReservations } = sanitizeClientPayload(client, rawReservations, rawTransacoes, []);

    const token = jwt.sign(
      { id: client.id, nome: client.nome, role: "client" },
      JWT_SECRET,
      { expiresIn: JWT_CLIENT_EXPIRY }
    );

    writeAuditLog(client.nome, "client", "LOGIN_SUCCESS", req.ip, `ID: ${client.id}`);
    res.json({
      success: true,
      token,
      client: safeClient,
      boats,
      reservations: safeReservations
    });
  } catch (err: any) {
    console.error("Client login error:", err);
    res.status(500).json({ error: true, message: "Erro interno de autenticação." });
  }
});

// Route: Client password registration (first access)
authRoutes.post("/client/register", authLimiter, async (req, res) => {
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
authRoutes.get("/validate", async (req, res) => {
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
        if (admin && admin.funcionarioNome) {
          funcionarioNome = admin.funcionarioNome;
        } else if (admin && admin.funcionarioId) {
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
authRoutes.post("/change-password", async (req, res) => {
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

// Route: Get client data using JWT (secure data fetch)


export default authRoutes;
