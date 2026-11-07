import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getAdminByUsername, getClientByCpf, getClientAuth, upsertClientAuth, deleteClientAuth, pullDatabase, updateAdmin } from "../server-db";
import { authLimiter, requireAdminAuth } from "./middlewares";
import { sanitizeClientPayload } from "./client.routes";
import { sendEvolutionText } from "./whatsapp.routes";

// Mock writeAuditLog since we are refactoring incrementally. 
// We will export/import it properly from server.ts later.
import { writeAuditLog } from "./middlewares"; 

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET must be defined in environment.");
  process.exit(1);
}
const JWT_EXPIRY = "8h";
const JWT_CLIENT_EXPIRY = "30d";
const authRoutes = Router();

// Store temporário em memória para recuperação de senha de clientes via OTP WhatsApp
interface ClientOtpRecord {
  code: string;
  clientId: string;
  expiresAt: number;
  attempts: number;
}
const clientOtpStore = new Map<string, ClientOtpRecord>();
const usedResetTokens = new Set<string>();

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
      needsRegistration: !clientAuth || !clientAuth.passwordHash,
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

    if (!clientAuth || !clientAuth.passwordHash) {
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
      { id: client.id, nome: client.nome, role: "client", tv: clientAuth.tokenVersion ?? 1 },
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
    if (existingAuth && existingAuth.passwordHash) {
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
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET, { algorithms: ["HS256"] }) as any;
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
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as any;
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


// ---------------- Recuperação de Senha do Cliente (WhatsApp OTP) ----------------

// Route: Solicitar código OTP via WhatsApp
authRoutes.post("/client/forgot-password/request", authLimiter, async (req, res) => {
  const { identifier } = req.body;
  const cleanId = String(identifier || '').replace(/\D/g, '');

  if (!cleanId || cleanId.length !== 11) {
    return res.status(400).json({ error: true, message: "Informe um CPF válido com 11 dígitos." });
  }

  try {
    const client = await getClientByCpf(cleanId);
    if (!client) {
      return res.status(404).json({ error: true, message: "Cadastro não encontrado no Grupo Vila Náutica." });
    }

    if (client.status === 'inativo') {
      return res.status(403).json({ error: true, message: "Este cadastro está inativo. Entre em contato com a administração." });
    }

    // Verificar se possui telefone celular
    const phone = String(client.telefone || '').trim();
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({
        error: true,
        message: "Seu cadastro não possui telefone celular configurado para envio de WhatsApp. Solicite o reset à administração da marina."
      });
    }

    // Rate-limit individual por CPF: não reenviar com menos de 45 segundos
    const existing = clientOtpStore.get(cleanId);
    if (existing && Date.now() < existing.expiresAt - (9 * 60 * 1000 + 15 * 1000)) {
      return res.status(429).json({ error: true, message: "Aguarde alguns segundos antes de solicitar um novo código." });
    }

    // Gerar código de 6 dígitos criptograficamente seguro
    const code = String(crypto.randomInt(100000, 1000000));
    clientOtpStore.set(cleanId, {
      code,
      clientId: client.id,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutos
      attempts: 0
    });

    const primeiroNome = (client.nome || 'Cliente').split(' ')[0];
    const msg = `Olá, *${primeiroNome}*! 🚤\n\nSeu código de segurança para redefinir o acesso ao portal Grupo Vila Náutica é:\n\n*${code}*\n\nEste código é válido por 10 minutos. Se você não solicitou, por favor ignore esta mensagem.`;

    const waRes = await sendEvolutionText(cleanPhone, msg);
    if (!waRes.success) {
      console.error("Falha ao enviar OTP de recuperação via WhatsApp:", waRes.message);
      return res.status(502).json({
        error: true,
        message: `Não foi possível enviar o código via WhatsApp (${waRes.message || 'instabilidade'}). Entre em contato com a administração.`
      });
    }

    writeAuditLog(client.nome, "client", "PASSWORD_RESET_OTP_SENT", req.ip, `ID: ${client.id}`);

    // Mascarar telefone para exibição segura (ex: (87) 9****-8605)
    const last4 = cleanPhone.slice(-4);
    const ddd = cleanPhone.length >= 12 ? cleanPhone.slice(2, 4) : cleanPhone.slice(0, 2);
    const maskedPhone = `(${ddd}) 9****-${last4}`;

    res.json({
      success: true,
      maskedPhone,
      message: `Código enviado com sucesso para o WhatsApp final **-${last4}.`
    });
  } catch (err: any) {
    console.error("Forgot password request error:", err);
    res.status(500).json({ error: true, message: "Erro interno ao processar recuperação de senha." });
  }
});

// Route: Validar código OTP e retornar token de autorização
authRoutes.post("/client/forgot-password/verify", authLimiter, async (req, res) => {
  const { identifier, code } = req.body;
  const cleanId = String(identifier || '').replace(/\D/g, '');
  const cleanCode = String(code || '').trim();

  if (!cleanId || !cleanCode) {
    return res.status(400).json({ error: true, message: "CPF e código são obrigatórios." });
  }

  const record = clientOtpStore.get(cleanId);
  if (!record || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: true, message: "Código expirado ou inválido. Solicite um novo código." });
  }

  if (record.attempts >= 5) {
    clientOtpStore.delete(cleanId);
    return res.status(429).json({ error: true, message: "Limite de tentativas excedido. Solicite um novo código." });
  }

  const isMatch = record.code.length === cleanCode.length && crypto.timingSafeEqual(Buffer.from(record.code), Buffer.from(cleanCode));
  if (!isMatch) {
    record.attempts += 1;
    return res.status(400).json({ error: true, message: "Código incorreto. Verifique o WhatsApp e tente novamente." });
  }

  // Código validado: consumir OTP e gerar token de redefinição de uso único
  const clientId = record.clientId;
  clientOtpStore.delete(cleanId);

  const resetToken = jwt.sign(
    { clientId, purpose: "client_pwd_reset", jti: crypto.randomUUID() },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  res.json({ success: true, resetToken });
});

// Route: Gravar nova senha com o token de redefinição
authRoutes.post("/client/forgot-password/reset", authLimiter, async (req, res) => {
  const { resetToken, password } = req.body;

  if (!resetToken || !password) {
    return res.status(400).json({ error: true, message: "Token de autorização e nova senha são obrigatórios." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: true, message: "A nova senha deve ter no mínimo 6 caracteres." });
  }

  try {
    const decoded = jwt.verify(resetToken, JWT_SECRET, { algorithms: ["HS256"] }) as any;
    if (decoded.purpose !== "client_pwd_reset" || !decoded.clientId || !decoded.jti) {
      return res.status(401).json({ error: true, message: "Autorização inválida ou expirada." });
    }

    if (usedResetTokens.has(decoded.jti)) {
      return res.status(401).json({ error: true, message: "Este token de autorização já foi utilizado." });
    }

    usedResetTokens.add(decoded.jti);
    // Limpar após 15 minutos da memória
    setTimeout(() => usedResetTokens.delete(decoded.jti), 15 * 60 * 1000);

    const passwordHash = await bcrypt.hash(password, 12);
    await upsertClientAuth(decoded.clientId, passwordHash);

    writeAuditLog(`Cliente ${decoded.clientId}`, "client", "PASSWORD_RESET_SUCCESS", req.ip);
    res.json({ success: true, message: "Senha redefinida com sucesso! Você já pode entrar." });
  } catch (err: any) {
    console.error("Forgot password reset error:", err);
    res.status(401).json({ error: true, message: "Token de redefinição expirado ou inválido. Tente novamente." });
  }
});

// ---------------- Admin: Gerenciamento de Acesso de Clientes ----------------

// Route: Consultar status de acesso do cliente
authRoutes.get("/client/admin-status/:clienteId", requireAdminAuth, async (req, res) => {
  try {
    const { clienteId } = req.params;
    const auth = await getClientAuth(clienteId);
    res.json({
      success: true,
      hasAuth: !!auth,
      createdAt: auth?.createdAt || null
    });
  } catch (err: any) {
    res.status(500).json({ error: true, message: "Erro ao consultar status de acesso do cliente." });
  }
});

// Route: Resetar acesso do cliente (remove senha para que ele defina no próximo login)
authRoutes.post("/client/admin-reset/:clienteId", requireAdminAuth, async (req, res) => {
  try {
    const { clienteId } = req.params;
    await deleteClientAuth(clienteId);

    const adminUser = (req as any).user?.username || "admin";
    writeAuditLog(adminUser, "admin", "CLIENT_AUTH_RESET", req.ip, `Cliente: ${clienteId}`);

    res.json({
      success: true,
      message: "Acesso resetado com sucesso! O cliente poderá definir uma nova senha no próximo acesso."
    });
  } catch (err: any) {
    res.status(500).json({ error: true, message: "Erro ao resetar acesso do cliente." });
  }
});

// Route: Definir senha do cliente manualmente pelo administrador
authRoutes.post("/client/admin-set-password/:clienteId", requireAdminAuth, async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: true, message: "A senha deve ter no mínimo 6 caracteres." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await upsertClientAuth(clienteId, passwordHash);

    const adminUser = (req as any).user?.username || "admin";
    writeAuditLog(adminUser, "admin", "CLIENT_AUTH_SET_MANUAL", req.ip, `Cliente: ${clienteId}`);

    res.json({
      success: true,
      message: "Senha cadastrada com sucesso para o cliente."
    });
  } catch (err: any) {
    res.status(500).json({ error: true, message: "Erro ao definir senha para o cliente." });
  }
});

export default authRoutes;
