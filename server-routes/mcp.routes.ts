import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import https from "https";
import http from "http";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import { getDbPool, getConfigValue, setConfigValue, invalidateDbCache, getAdminByUsername } from "../server-db";
import { requireAdminAuth, writeAuditLog, getClientIp } from "./middlewares";

const MCP_JWT_SECRET = process.env.JWT_SECRET || "mexicano-mcp-fallback-secret";

const router = Router();

// ─── Sanitização e Segurança (LGPD) ─────────────────────────────────────────

function maskCpf(cpf?: string | null): string {
  if (!cpf) return "";
  const cleaned = String(cpf).replace(/\D/g, "");
  if (cleaned.length !== 11) return "***.***.***-**";
  return `***.***.${cleaned.substring(6, 9)}-${cleaned.substring(9, 11)}`;
}

function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length < 8) return "****-****";
  const lastFour = cleaned.slice(-4);
  return `(XX) X****-${lastFour}`;
}

function safeJsonParse<T = any>(val: any, fallback: any = null): T {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function enforceLimit(limit?: number, max = 50, def = 20): number {
  const num = Number(limit);
  if (!num || isNaN(num) || num <= 0) return def;
  return Math.min(Math.floor(num), max);
}

function getTodayBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function sanitizeClient(client: any) {
  if (!client) return null;
  return {
    id: client.id,
    nome: client.nome,
    telefone: client.telefone ? maskPhone(client.telefone) : undefined,
    email: client.email ? String(client.email).replace(/(?<=.{2}).(?=[^@]*?@)/g, "*") : undefined,
    cpfMascarado: maskCpf(client.cpf),
    status: client.status || "ativo",
    statusFinanceiro: client.statusFinanceiro || "em_dia",
    observacoesFinanceiras: client.observacoesFinanceiras || undefined,
    plano: client.plano || "normal",
    cota: client.cota || undefined,
    embarcacaoId: client.embarcacaoId || undefined,
    embarcacoes: safeJsonParse(client.embarcacoes, []),
    cidade: client.cidade || undefined,
    estado: client.estado || undefined,
    statusContrato: client.statusContrato || undefined,
    dataCadastro: client.dataCadastro || undefined,
    empresas: client.empresas || undefined,
  };
}

function sanitizeBoat(boat: any) {
  if (!boat) return null;
  return {
    id: boat.id,
    nome: boat.nome,
    tipo: boat.tipo,
    numero: boat.numero || undefined,
    modelo: boat.modelo || undefined,
    fabricante: boat.fabricante || undefined,
    ano: boat.ano || undefined,
    vaga: boat.vaga || undefined,
    tamanho: boat.tamanho || undefined,
    tipoPropulsao: boat.tipo_propulsao || undefined,
    potencia: boat.potencia || undefined,
    emManutencao: Boolean(boat.emManutencao),
    temSom: Boolean(boat.temSom),
    totalCotas: Number(boat.totalCotas) || 8,
    capacidadePassageiros: boat.capacidadePassageiros ? Number(boat.capacidadePassageiros) : undefined,
    horasMotor: boat.horasMotor ? Number(boat.horasMotor) : 0,
    ultimaAtualizacaoHoras: boat.ultimaAtualizacaoHoras || undefined,
    horasUltimaManutencao: boat.horasUltimaManutencao ? Number(boat.horasUltimaManutencao) : 0,
    donos: safeJsonParse(boat.donos, []),
    acessorios: safeJsonParse(boat.acessorios, []),
    validadeSeguro: boat.validadeSeguro || undefined,
    validadeExtintor: boat.validadeExtintor || undefined,
    validadeTie: boat.validadeTie || boat.validadeDocumento || undefined,
    validadeDocumento: boat.validadeDocumento || boat.validadeTie || undefined,
    empresas: boat.empresas || undefined,
  };
}

function sanitizeReservation(res: any) {
  if (!res) return null;
  return {
    id: res.id,
    embarcacaoId: res.embarcacaoId,
    embarcacaoNome: res.embarcacaoNome || res.modeloAvulso || undefined,
    clienteId: res.clienteId,
    clienteNome: res.clienteNome || res.nomeAvulso || undefined,
    data: res.data,
    periodo: res.periodo,
    status: res.status,
    statusMarina: res.statusMarina || undefined,
    horaSaida: res.horaSaida || res.previsaoSaida || undefined,
    horaChegada: res.horaChegada || res.previsaoChegada || undefined,
    destino: res.destino || undefined,
    pessoasABordo: res.pessoasABordo || undefined,
    marinheiroPiloto: res.marinheiroPiloto || undefined,
    posicaoFila: res.posicaoFila || undefined,
    origem: res.origem || "cota",
    observacoes: res.observacoes || undefined,
  };
}

function sanitizeTransaction(tx: any) {
  if (!tx) return null;
  return {
    id: tx.id,
    tipo: tx.tipo,
    categoria: tx.categoria,
    valor: Number(tx.valor) || 0,
    dataVencimento: tx.dataVencimento,
    dataPagamento: tx.dataPagamento || null,
    status: tx.status,
    descricao: tx.descricao || "",
    clienteId: tx.clienteId || null,
    clienteNome: tx.clienteNome || undefined,
    embarcacaoId: tx.embarcacaoId || null,
    embarcacaoNome: tx.embarcacaoNome || undefined,
    empresa: tx.empresa || "Marina",
    numeroParcela: tx.numeroParcela || 1,
    totalParcelas: tx.totalParcelas || 1,
  };
}

function sanitizeMaintenance(os: any) {
  if (!os) return null;
  return {
    id: os.id,
    codigoOS: os.codigoOS || os.id,
    embarcacaoId: os.embarcacaoId,
    embarcacaoNome: os.embarcacaoNome || undefined,
    clienteId: os.clienteId || undefined,
    titulo: os.titulo || os.tipoManutencaoNome || "Manutenção",
    tipoManutencaoNome: os.tipoManutencaoNome || undefined,
    categoria: os.categoria || undefined,
    status: os.status,
    urgencia: os.urgencia || "normal",
    mecanicoNome: os.mecanicoNome || os.mecanico || undefined,
    oficinaNome: os.oficinaNome || undefined,
    dataEntradaOficina: os.dataEntradaOficina || os.dataSaida || undefined,
    previsaoTermino: os.previsaoTermino || undefined,
    dataTermino: os.dataTermino || os.concluidoEm || undefined,
    orcamento: os.orcamento ? Number(os.orcamento) : undefined,
    custoTotal: os.custoTotal ? Number(os.custoTotal) : (os.custo ? Number(os.custo) : undefined),
    descricaoServico: os.descricaoServico || undefined,
    horasMotorAtual: os.horasMotorAtual ? Number(os.horasMotorAtual) : undefined,
    proximaRevisaoHoras: os.proximaRevisaoHoras ? Number(os.proximaRevisaoHoras) : undefined,
  };
}

// ─── Camada de Acesso ao Banco (Read-Only + Transação Controlada) ───────────

async function queryReadOnly<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const normalizedSql = sql.trim().toUpperCase();
  const forbiddenKeywords = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER",
    "TRUNCATE", "CREATE", "RENAME", "REPLACE", "GRANT", "REVOKE"
  ];

  for (const keyword of forbiddenKeywords) {
    const regex = new RegExp(`(^|[\\s;])${keyword}\\b`, "i");
    if (regex.test(normalizedSql)) {
      throw new Error(`[MCP Security Violation] Operação proibida em queryReadOnly: ${keyword}.`);
    }
  }

  if (!normalizedSql.startsWith("SELECT") && !normalizedSql.startsWith("WITH") && !normalizedSql.startsWith("SHOW")) {
    throw new Error("[MCP Security Violation] Apenas consultas SELECT são permitidas.");
  }

  const pool = getDbPool();
  if (!pool) throw new Error("Pool de conexão com o banco de dados indisponível.");
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

async function withControlledTransaction<T>(fn: (conn: any) => Promise<T>): Promise<T> {
  const pool = getDbPool();
  if (!pool) throw new Error("Pool de conexão com o banco de dados indisponível.");
  const conn = await pool.getConnection();
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

// ─── Evolution API Helper ───────────────────────────────────────────────────

const evolutionHttpsAgent = new https.Agent({ rejectUnauthorized: false });

function evolutionRequest(
  urlStr: string,
  options: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number } = {}
): Promise<{ ok: boolean; status: number; statusText: string; text: string }> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const isHttps = url.protocol === "https:";
      const reqOptions: https.RequestOptions = {
        method: options.method || "GET",
        headers: options.headers || {},
        agent: isHttps ? evolutionHttpsAgent : undefined,
        timeout: options.timeoutMs || 15000,
      };

      const req = (isHttps ? https : http).request(url, reqOptions, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          resolve({
            ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
            status: res.statusCode || 500,
            statusText: res.statusMessage || "",
            text,
          });
        });
      });

      req.on("timeout", () => req.destroy(new Error("Timeout ao comunicar com a Evolution API.")));
      req.on("error", reject);
      if (options.body) req.write(options.body);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Configurações Dinâmicas do MCP no Banco ────────────────────────────────

interface McpRuntimeSettings {
  mcpAtivo: boolean;
  permitirReservas: boolean;
  permitirWhatsapp: boolean;
  apiKey: string;
  geminiApiKey: string;
  geminiModel: string;
}

async function getMcpSettings(): Promise<McpRuntimeSettings> {
  const mcpAtivoRaw = await getConfigValue("mcp_ativo");
  const permitirReservasRaw = await getConfigValue("mcp_permitir_reservas");
  const permitirWhatsappRaw = await getConfigValue("mcp_permitir_whatsapp");
  let apiKey = (await getConfigValue("mcp_api_key")) || "";

  if (!apiKey) {
    const envKey = (process.env.MCP_API_KEY || "").trim();
    if (envKey && envKey !== "defina_uma_chave_secreta_aqui_para_autenticacao_mcp" && envKey !== "chave_secreta_para_autenticacao_mcp") {
      apiKey = envKey;
    } else {
      apiKey = `mcp_mex_${crypto.randomBytes(24).toString("hex")}`;
    }
    await setConfigValue("mcp_api_key", apiKey).catch(() => {});
  }

  const savedGeminiKey = (await getConfigValue("mcp_gemini_api_key")) || "";
  const envGeminiKey = (process.env.GEMINI_API_KEY || "").trim();
  const geminiApiKey = savedGeminiKey || (envGeminiKey !== "MY_GEMINI_API_KEY" ? envGeminiKey : "");
  const geminiModel = (await getConfigValue("mcp_gemini_model")) || "gemini-2.5-flash";

  return {
    mcpAtivo: mcpAtivoRaw === null ? true : mcpAtivoRaw === "1",
    permitirReservas: permitirReservasRaw === null ? true : permitirReservasRaw === "1",
    permitirWhatsapp: permitirWhatsappRaw === null ? true : permitirWhatsappRaw === "1",
    apiKey,
    geminiApiKey,
    geminiModel,
  };
}

// ─── Histórico em Memória das Execuções MCP ─────────────────────────────────

interface McpExecutionLog {
  id: string;
  timestamp: string;
  toolName: string;
  source: "external-mcp" | "admin-chat" | "admin-test";
  durationMs: number;
  success: boolean;
  argsPreview: string;
  resultPreview: string;
}

const mcpRecentLogs: McpExecutionLog[] = [];

function recordMcpExecution(entry: Omit<McpExecutionLog, "id" | "timestamp">) {
  mcpRecentLogs.unshift({
    id: `mcp_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (mcpRecentLogs.length > 60) {
    mcpRecentLogs.length = 60;
  }
}

// ─── Definição Completa das 22 Tools do MCP ─────────────────────────────────

export interface McpToolDefinition {
  name: string;
  category: string;
  mode: "read" | "write";
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any, context?: { io?: any }) => Promise<any>;
}

const MCP_TOOLS: McpToolDefinition[] = [
  // 1. VISÃO 360
  {
    name: "obter_visao_360_cliente",
    category: "Visão 360°",
    mode: "read",
    description: "Retorna o dossiê completo de um cliente: dados cadastrais (filtrados), cotas e embarcações pertencentes, próximas reservas e situação financeira consolidada.",
    inputSchema: {
      type: "object",
      properties: {
        termo: { type: "string", description: "Nome parcial, nome completo ou ID do cliente (mínimo 2 caracteres)" },
        empresa: { type: "string", description: "Filtrar por empresa (ex: 'VALE', 'MEXICANO', 'Marina' ou omitir para todas)" },
      },
      required: ["termo"],
    },
    handler: async (args) => {
      const termo = String(args?.termo || "").trim();
      const empresa = args?.empresa;
      if (termo.length < 2) throw new Error("Informe pelo menos 2 caracteres em 'termo'.");

      let clientQuery = "SELECT c.* FROM Clientes c WHERE (c.id = ? OR c.nome LIKE ?)";
      const clientParams: any[] = [termo, `%${termo}%`];
      if (empresa && empresa !== "Todos") {
        clientQuery += " AND EXISTS (SELECT 1 FROM ClienteEmpresas ce WHERE ce.clienteId = c.id AND ce.empresa = ?)";
        clientParams.push(empresa);
      }
      clientQuery += " LIMIT 5";

      const clients = await queryReadOnly<any>(clientQuery, clientParams);
      if (clients.length === 0) {
        return { encontrado: false, mensagem: `Nenhum cliente encontrado com '${termo}'.` };
      }

      const cliente = clients[0];
      const clienteSanitizado = sanitizeClient(cliente);
      const empresasRows = await queryReadOnly<any>("SELECT empresa FROM ClienteEmpresas WHERE clienteId = ?", [cliente.id]);
      const empresas = empresasRows.map((r) => r.empresa);

      const cotasCliente = clienteSanitizado?.embarcacoes || [];
      const boatIds = new Set<string>();
      if (cliente.embarcacaoId) boatIds.add(cliente.embarcacaoId);
      cotasCliente.forEach((c: any) => { if (c?.embarcacaoId) boatIds.add(c.embarcacaoId); });

      let embarcacoesVinculadas: any[] = [];
      if (boatIds.size > 0) {
        const placeholders = Array.from(boatIds).map(() => "?").join(",");
        const boatsRows = await queryReadOnly<any>(
          `SELECT id, nome, tipo, modelo, vaga, horasMotor, emManutencao, totalCotas FROM Embarcacoes WHERE id IN (${placeholders})`,
          Array.from(boatIds)
        );
        embarcacoesVinculadas = boatsRows.map((b) => {
          const cotaInfo = cotasCliente.find((c: any) => c.embarcacaoId === b.id);
          return { ...sanitizeBoat(b), cotaDoCliente: cotaInfo?.cota || cliente.cota || "Cota Titular" };
        });
      }

      const reservasRows = await queryReadOnly<any>(
        `SELECT r.*, e.nome as embarcacaoNome FROM Reservas r LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id WHERE r.clienteId = ? ORDER BY r.data DESC LIMIT 10`,
        [cliente.id]
      );
      const pendenciasRows = await queryReadOnly<any>(
        `SELECT t.*, e.nome as embarcacaoNome FROM TransacoesFinanceiras t LEFT JOIN Embarcacoes e ON t.embarcacaoId = e.id WHERE t.clienteId = ? AND t.status IN ('pendente', 'atrasado') ORDER BY t.dataVencimento ASC LIMIT 15`,
        [cliente.id]
      );
      const lancamentosPendentes = pendenciasRows.map(sanitizeTransaction);
      const totalEmAberto = lancamentosPendentes.reduce((sum, item) => sum + (item?.valor || 0), 0);

      return {
        encontrado: true,
        outrosResultadosSugeridos: clients.length > 1 ? clients.slice(1).map((c) => ({ id: c.id, nome: c.nome, cota: c.cota })) : undefined,
        dossieCliente: {
          perfil: { ...clienteSanitizado, empresas },
          embarcacoes: embarcacoesVinculadas,
          resumoFinanceiro: {
            statusGeral: cliente.statusFinanceiro || "em_dia",
            observacoes: cliente.observacoesFinanceiras || null,
            totalValorEmAberto: totalEmAberto,
            quantidadeTitulosPendentes: lancamentosPendentes.length,
            titulosEmAberto: lancamentosPendentes,
          },
          ultimasReservasOuAgendamentos: reservasRows.map(sanitizeReservation),
        },
      };
    },
  },
  {
    name: "obter_visao_360_embarcacao",
    category: "Visão 360°",
    mode: "read",
    description: "Retorna a visão 360° de uma embarcação: ficha técnica, todos os cotistas cadastrados, próximas saídas agendadas, últimas ordens de serviço (OS) e abastecimentos recentes.",
    inputSchema: {
      type: "object",
      properties: {
        termo: { type: "string", description: "Nome parcial, nome completo ou ID da embarcação" },
        empresa: { type: "string", description: "Filtrar por empresa" },
      },
      required: ["termo"],
    },
    handler: async (args) => {
      const termo = String(args?.termo || "").trim();
      const empresa = args?.empresa;
      if (termo.length < 2) throw new Error("Informe pelo menos 2 caracteres em 'termo'.");

      let boatQuery = "SELECT b.* FROM Embarcacoes b WHERE (b.id = ? OR b.nome LIKE ?)";
      const boatParams: any[] = [termo, `%${termo}%`];
      if (empresa && empresa !== "Todos") {
        boatQuery += " AND EXISTS (SELECT 1 FROM EmbarcacaoEmpresas ee WHERE ee.embarcacaoId = b.id AND ee.empresa = ?)";
        boatParams.push(empresa);
      }
      boatQuery += " LIMIT 5";

      const boats = await queryReadOnly<any>(boatQuery, boatParams);
      if (boats.length === 0) {
        return { encontrado: false, mensagem: `Nenhuma embarcação encontrada com '${termo}'.` };
      }

      const boat = boats[0];
      const boatSanitizado = sanitizeBoat(boat);
      const empresasRows = await queryReadOnly<any>("SELECT empresa FROM EmbarcacaoEmpresas WHERE embarcacaoId = ?", [boat.id]);
      const cotistasRows = await queryReadOnly<any>(
        `SELECT id, nome, telefone, cota, statusFinanceiro, status, embarcacoes FROM Clientes WHERE embarcacaoId = ? OR embarcacoes LIKE ?`,
        [boat.id, `%"${boat.id}"%`]
      );
      const cotistas = cotistasRows.map((c) => {
        let cotaIdentificada = c.cota || "Cota";
        const parsedEmbarcacoes = safeJsonParse<any[]>(c.embarcacoes, []);
        const match = parsedEmbarcacoes.find((item: any) => item.embarcacaoId === boat.id);
        if (match && match.cota) cotaIdentificada = match.cota;
        return {
          clienteId: c.id,
          nome: c.nome,
          cota: cotaIdentificada,
          statusFinanceiro: c.statusFinanceiro || "em_dia",
          status: c.status || "ativo",
        };
      });

      const reservasRows = await queryReadOnly<any>(
        `SELECT r.*, c.nome as clienteNome FROM Reservas r LEFT JOIN Clientes c ON r.clienteId = c.id WHERE r.embarcacaoId = ? ORDER BY r.data DESC LIMIT 10`,
        [boat.id]
      );
      const manutencoesRows = await queryReadOnly<any>(
        `SELECT m.*, b.nome as embarcacaoNome FROM Manutencoes m LEFT JOIN Embarcacoes b ON m.embarcacaoId = b.id WHERE m.embarcacaoId = ? ORDER BY m.dataSaida DESC LIMIT 5`,
        [boat.id]
      );
      const combustivelRows = await queryReadOnly<any>(
        `SELECT * FROM CombustivelMovimentacoes WHERE barco_nome LIKE ? OR detalhes LIKE ? ORDER BY data_hora DESC LIMIT 5`,
        [`%${boat.nome}%`, `%${boat.id}%`]
      );

      return {
        encontrado: true,
        outrosResultadosSugeridos: boats.length > 1 ? boats.slice(1).map((b) => ({ id: b.id, nome: b.nome, modelo: b.modelo })) : undefined,
        dossieEmbarcacao: {
          fichaTecnica: { ...boatSanitizado, empresas: empresasRows.map((r) => r.empresa) },
          cotistasCadastrados: cotistas,
          totalCotistasAtivos: cotistas.length,
          vagasCotasOcupadas: `${cotistas.length}/${boatSanitizado?.totalCotas || 8}`,
          proximasReservasOuSaidas: reservasRows.map(sanitizeReservation),
          manutencoesRecentes: manutencoesRows.map(sanitizeMaintenance),
          ultimosAbastecimentos: combustivelRows.map((cb) => ({
            id: cb.id,
            tipo: cb.tipo,
            litros: Number(cb.litros) || 0,
            operador: cb.operador,
            dataHora: cb.data_hora,
            detalhes: cb.detalhes,
          })),
        },
      };
    },
  },

  // 2. CLIENTES
  {
    name: "listar_clientes",
    category: "Clientes & Cotas",
    mode: "read",
    description: "Lista clientes com suporte a paginação (máx 50) e filtros por empresa, status ativo/inativo, status financeiro e busca por nome.",
    inputSchema: {
      type: "object",
      properties: {
        empresa: { type: "string", description: "Filtrar por empresa" },
        status: { type: "string", description: "Filtrar por status cadastral ('ativo', 'inativo')" },
        statusFinanceiro: { type: "string", description: "Filtrar por status financeiro ('em_dia', 'inadimplente', 'bloqueado')" },
        busca: { type: "string", description: "Busca por nome, ID ou cota" },
        limit: { type: "number", description: "Máximo de registros (padrão 20, máx 50)" },
        offset: { type: "number", description: "Offset de paginação" },
      },
    },
    handler: async (args) => {
      const { empresa, status, statusFinanceiro, busca } = args || {};
      const limit = enforceLimit(args?.limit);
      const offset = Math.max(0, Number(args?.offset) || 0);
      const whereClauses: string[] = ["1=1"];
      const params: any[] = [];

      if (status && status !== "todos") { whereClauses.push("c.status = ?"); params.push(status); }
      if (statusFinanceiro && statusFinanceiro !== "todos") { whereClauses.push("c.statusFinanceiro = ?"); params.push(statusFinanceiro); }
      if (busca && String(busca).trim()) {
        whereClauses.push("(c.nome LIKE ? OR c.id LIKE ? OR c.cota LIKE ?)");
        const term = `%${String(busca).trim()}%`;
        params.push(term, term, term);
      }
      if (empresa && empresa !== "Todos") {
        whereClauses.push("EXISTS (SELECT 1 FROM ClienteEmpresas ce WHERE ce.clienteId = c.id AND ce.empresa = ?)");
        params.push(empresa);
      }

      const whereSql = whereClauses.join(" AND ");
      const countRows = await queryReadOnly<any>(`SELECT COUNT(*) as total FROM Clientes c WHERE ${whereSql}`, params);
      const total = countRows[0]?.total || 0;
      const rows = await queryReadOnly<any>(`SELECT c.* FROM Clientes c WHERE ${whereSql} ORDER BY c.nome ASC LIMIT ? OFFSET ?`, [...params, limit, offset]);

      return {
        paginacao: { total, limit, offset, retornados: rows.length, temMais: offset + rows.length < total },
        clientes: rows.map(sanitizeClient),
      };
    },
  },
  {
    name: "consultar_detalhes_cliente",
    category: "Clientes & Cotas",
    mode: "read",
    description: "Consulta informações cadastrais detalhadas de um cliente específico por ID ou Nome.",
    inputSchema: {
      type: "object",
      properties: {
        clienteId: { type: "string", description: "ID único do cliente" },
        nomeCliente: { type: "string", description: "Nome parcial ou completo do cliente" },
      },
    },
    handler: async (args) => {
      const { clienteId, nomeCliente } = args || {};
      if (!clienteId && !nomeCliente) throw new Error("Informe 'clienteId' ou 'nomeCliente'.");

      const sql = clienteId
        ? "SELECT * FROM Clientes WHERE id = ? LIMIT 1"
        : "SELECT * FROM Clientes WHERE nome LIKE ? ORDER BY nome ASC LIMIT 5";
      const params = [clienteId ? clienteId : `%${nomeCliente}%`];
      const rows = await queryReadOnly<any>(sql, params);
      if (rows.length === 0) return { encontrado: false, mensagem: "Cliente não encontrado." };

      const cliente = rows[0];
      const empresasRows = await queryReadOnly<any>("SELECT empresa FROM ClienteEmpresas WHERE clienteId = ?", [cliente.id]);
      return {
        encontrado: true,
        cliente: { ...sanitizeClient(cliente), empresasVinculadas: empresasRows.map((r) => r.empresa) },
        outrosEncontrados: rows.length > 1 ? rows.slice(1).map((r) => ({ id: r.id, nome: r.nome, status: r.status })) : undefined,
      };
    },
  },

  // 3. EMBARCAÇÕES
  {
    name: "listar_embarcacoes",
    category: "Embarcações",
    mode: "read",
    description: "Lista embarcações da frota com paginação e filtros por empresa, tipo, se está em manutenção ou busca por nome/vaga.",
    inputSchema: {
      type: "object",
      properties: {
        empresa: { type: "string", description: "Filtrar por empresa" },
        emManutencao: { type: "boolean", description: "Filtrar embarcações em manutenção (true/false)" },
        tipo: { type: "string", description: "Tipo de embarcação (ex: 'Lancha', 'Jet Ski')" },
        busca: { type: "string", description: "Busca por nome, modelo ou vaga" },
        limit: { type: "number", description: "Máximo de registros (máx 50)" },
        offset: { type: "number", description: "Offset de paginação" },
      },
    },
    handler: async (args) => {
      const { empresa, emManutencao, tipo, busca } = args || {};
      const limit = enforceLimit(args?.limit);
      const offset = Math.max(0, Number(args?.offset) || 0);
      const whereClauses: string[] = ["1=1"];
      const params: any[] = [];

      if (typeof emManutencao === "boolean") { whereClauses.push("b.emManutencao = ?"); params.push(emManutencao ? 1 : 0); }
      if (tipo && String(tipo).trim()) { whereClauses.push("b.tipo LIKE ?"); params.push(`%${String(tipo).trim()}%`); }
      if (busca && String(busca).trim()) {
        whereClauses.push("(b.nome LIKE ? OR b.modelo LIKE ? OR b.vaga LIKE ?)");
        const term = `%${String(busca).trim()}%`;
        params.push(term, term, term);
      }
      if (empresa && empresa !== "Todos") {
        whereClauses.push("EXISTS (SELECT 1 FROM EmbarcacaoEmpresas ee WHERE ee.embarcacaoId = b.id AND ee.empresa = ?)");
        params.push(empresa);
      }

      const whereSql = whereClauses.join(" AND ");
      const countRows = await queryReadOnly<any>(`SELECT COUNT(*) as total FROM Embarcacoes b WHERE ${whereSql}`, params);
      const total = countRows[0]?.total || 0;
      const rows = await queryReadOnly<any>(`SELECT b.* FROM Embarcacoes b WHERE ${whereSql} ORDER BY b.nome ASC LIMIT ? OFFSET ?`, [...params, limit, offset]);

      return {
        paginacao: { total, limit, offset, retornados: rows.length, temMais: offset + rows.length < total },
        embarcacoes: rows.map(sanitizeBoat),
      };
    },
  },
  {
    name: "consultar_cotistas_embarcacao",
    category: "Embarcações",
    mode: "read",
    description: "Lista detalhadamente todos os cotistas de uma embarcação com número da cota e situação cadastral.",
    inputSchema: {
      type: "object",
      properties: {
        embarcacaoId: { type: "string", description: "ID da embarcação" },
        nomeEmbarcacao: { type: "string", description: "Nome da embarcação caso não tenha o ID" },
      },
    },
    handler: async (args) => {
      const { embarcacaoId, nomeEmbarcacao } = args || {};
      if (!embarcacaoId && !nomeEmbarcacao) throw new Error("Informe 'embarcacaoId' ou 'nomeEmbarcacao'.");

      const boatRows = await queryReadOnly<any>(
        embarcacaoId ? "SELECT id, nome, totalCotas FROM Embarcacoes WHERE id = ?" : "SELECT id, nome, totalCotas FROM Embarcacoes WHERE nome LIKE ? LIMIT 1",
        [embarcacaoId ? embarcacaoId : `%${nomeEmbarcacao}%`]
      );
      if (boatRows.length === 0) return { encontrado: false, mensagem: "Embarcação não encontrada." };

      const boat = boatRows[0];
      const clients = await queryReadOnly<any>(
        `SELECT id, nome, telefone, cota, statusFinanceiro, status, embarcacoes FROM Clientes WHERE embarcacaoId = ? OR embarcacoes LIKE ?`,
        [boat.id, `%"${boat.id}"%`]
      );
      const cotistas = clients.map((c) => {
        let cotaIdentificada = c.cota || "Cota";
        const parsedEmbarcacoes = safeJsonParse<any[]>(c.embarcacoes, []);
        const match = parsedEmbarcacoes.find((item: any) => item.embarcacaoId === boat.id);
        if (match && match.cota) cotaIdentificada = match.cota;
        return {
          clienteId: c.id,
          nome: c.nome,
          cota: cotaIdentificada,
          statusFinanceiro: c.statusFinanceiro || "em_dia",
          status: c.status || "ativo",
        };
      });

      return {
        encontrado: true,
        embarcacao: {
          id: boat.id,
          nome: boat.nome,
          totalCotasDefinidas: boat.totalCotas || 8,
          cotasCadastradas: cotistas.length,
          vagasDisponiveis: Math.max(0, (boat.totalCotas || 8) - cotistas.length),
        },
        cotistas,
      };
    },
  },

  // 4. RESERVAS & MARINA
  {
    name: "listar_reservas",
    category: "Reservas & Marina",
    mode: "read",
    description: "Lista reservas e agendamentos de uso das embarcações com filtros por período (datas), barco, cliente e status.",
    inputSchema: {
      type: "object",
      properties: {
        data_inicio: { type: "string", description: "Data inicial YYYY-MM-DD" },
        data_fim: { type: "string", description: "Data final YYYY-MM-DD" },
        embarcacaoId: { type: "string", description: "ID da embarcação" },
        clienteId: { type: "string", description: "ID do cliente" },
        status: { type: "string", description: "Status ('confirmado', 'agendado', 'cancelado', 'todos')" },
        limit: { type: "number", description: "Máximo de registros (máx 50)" },
        offset: { type: "number", description: "Offset" },
      },
    },
    handler: async (args) => {
      const { data_inicio, data_fim, embarcacaoId, clienteId, status } = args || {};
      const limit = enforceLimit(args?.limit);
      const offset = Math.max(0, Number(args?.offset) || 0);
      const whereClauses: string[] = ["1=1"];
      const params: any[] = [];

      if (data_inicio) { whereClauses.push("r.data >= ?"); params.push(data_inicio); }
      if (data_fim) { whereClauses.push("r.data <= ?"); params.push(data_fim); }
      if (embarcacaoId) { whereClauses.push("r.embarcacaoId = ?"); params.push(embarcacaoId); }
      if (clienteId) { whereClauses.push("r.clienteId = ?"); params.push(clienteId); }
      if (status && status !== "todos") { whereClauses.push("r.status = ?"); params.push(status); }

      const whereSql = whereClauses.join(" AND ");
      const countRows = await queryReadOnly<any>(`SELECT COUNT(*) as total FROM Reservas r WHERE ${whereSql}`, params);
      const total = countRows[0]?.total || 0;
      const rows = await queryReadOnly<any>(
        `SELECT r.*, e.nome as embarcacaoNome, c.nome as clienteNome FROM Reservas r LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id LEFT JOIN Clientes c ON r.clienteId = c.id WHERE ${whereSql} ORDER BY r.data DESC, r.horaSaida ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        paginacao: { total, limit, offset, retornados: rows.length, temMais: offset + rows.length < total },
        reservas: rows.map(sanitizeReservation),
      };
    },
  },
  {
    name: "consultar_saidas_do_dia",
    category: "Reservas & Marina",
    mode: "read",
    description: "Consulta rápida de todas as saídas e chegadas de barcos agendadas para o dia especificado (ou hoje).",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "string", description: "Data no formato YYYY-MM-DD (se omitido, usa hoje)" },
      },
    },
    handler: async (args) => {
      const targetDate = args?.data || getTodayBrasilia();
      const rows = await queryReadOnly<any>(
        `SELECT r.*, e.nome as embarcacaoNome, e.vaga as embarcacaoVaga, c.nome as clienteNome FROM Reservas r LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id LEFT JOIN Clientes c ON r.clienteId = c.id WHERE r.data = ? AND r.status != 'cancelado' ORDER BY r.posicaoFila ASC, r.previsaoSaida ASC, r.horaSaida ASC`,
        [targetDate]
      );
      return {
        dataReferencia: targetDate,
        totalAgendamentos: rows.length,
        saidas: rows.map((r) => ({
          reservaId: r.id,
          posicaoFila: r.posicaoFila || null,
          embarcacao: r.embarcacaoNome || r.modeloAvulso || r.embarcacaoId,
          vaga: r.embarcacaoVaga || "Pátio",
          cliente: r.clienteNome || r.nomeAvulso || r.clienteId,
          periodo: r.periodo,
          horaSaidaPrevista: r.previsaoSaida || r.horaSaida || "Não informada",
          horaChegadaPrevista: r.previsaoChegada || r.horaChegada || "Não informada",
          destino: r.destino || "Local",
          pessoasABordo: r.pessoasABordo || "1",
          status: r.status,
          statusMarina: r.statusMarina || undefined,
          observacoes: r.observacoes || undefined,
        })),
      };
    },
  },
  {
    name: "criar_reserva",
    category: "Reservas & Marina",
    mode: "write",
    description: "Cria uma nova reserva ou agendamento de saída (cota, marina ou visitante avulso), validando disponibilidade da embarcação, manutenção e datas de fechamento.",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "string", description: "Data da reserva no formato YYYY-MM-DD" },
        embarcacaoId: { type: "string", description: "ID da embarcação cadastrada (obrigatório quando origem for 'cota' ou 'marina')" },
        clienteId: { type: "string", description: "ID do cliente/cotista" },
        periodo: { type: "string", description: "Período ('dia_inteiro', 'manha', 'tarde')" },
        origem: { type: "string", enum: ["cota", "marina", "avulso"], description: "Origem: 'cota', 'marina' ou 'avulso'" },
        previsaoSaida: { type: "string", description: "Horário previsto de saída (HH:MM)" },
        previsaoChegada: { type: "string", description: "Horário previsto de chegada (HH:MM)" },
        destino: { type: "string", description: "Destino planejado" },
        pessoasABordo: { type: "string", description: "Quantidade de pessoas a bordo" },
        marinheiroPiloto: { type: "string", description: "Marinheiro ou piloto responsável" },
        litrosAbastecerPrevio: { type: "string", description: "Litros solicitados para abastecimento prévio" },
        nomeAvulso: { type: "string", description: "Nome do visitante (quando origem = 'avulso')" },
        telefoneAvulso: { type: "string", description: "Telefone do visitante avulso" },
        modeloAvulso: { type: "string", description: "Nome/modelo do barco avulso (quando origem = 'avulso')" },
        tipoAvulso: { type: "string", enum: ["lancha", "jet", "utv"], description: "Tipo da embarcação avulsa" },
        observacoes: { type: "string", description: "Observações da reserva" },
      },
      required: ["data"],
    },
    handler: async (args, context) => {
      const settings = await getMcpSettings();
      if (!settings.permitirReservas) {
        return { sucesso: false, erro: "As ações de escrita em Reservas via MCP estão desativadas pelo Administrador no painel de gestão." };
      }

      const {
        data, embarcacaoId, clienteId, periodo = "dia_inteiro", origem = "cota",
        previsaoSaida, previsaoChegada, destino, pessoasABordo, marinheiroPiloto,
        litrosAbastecerPrevio, nomeAvulso, telefoneAvulso, modeloAvulso, tipoAvulso = "lancha", observacoes,
      } = args || {};

      if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return { sucesso: false, erro: "O campo 'data' deve estar no formato YYYY-MM-DD." };
      }

      const todayStr = getTodayBrasilia();
      if (data < todayStr) {
        return { sucesso: false, erro: `Não é permitido criar reservas em datas passadas (${data}). Hoje é ${todayStr}.` };
      }

      const datasFechadasRaw = await getConfigValue("marina_datas_fechadas");
      if (datasFechadasRaw) {
        try {
          const datasFechadas: Array<{ data: string; motivo?: string }> = JSON.parse(datasFechadasRaw);
          const fechamento = datasFechadas.find((item) => item.data === data);
          if (fechamento) {
            return { sucesso: false, erro: `A Marina está fechada na data ${data}${fechamento.motivo ? ` (${fechamento.motivo})` : ""}.` };
          }
        } catch {}
      }

      const isAvulso = origem === "avulso";
      if (isAvulso && (!nomeAvulso || !modeloAvulso)) {
        return { sucesso: false, erro: "Para reservas avulsas, 'nomeAvulso' e 'modeloAvulso' são obrigatórios." };
      }
      if (!isAvulso && !embarcacaoId) {
        return { sucesso: false, erro: "O campo 'embarcacaoId' é obrigatório para reservas de cota ou marina." };
      }

      const result = await withControlledTransaction(async (conn) => {
        let boat: any = null;
        let client: any = null;

        if (!isAvulso && embarcacaoId) {
          const [boatRows] = await conn.query("SELECT id, nome, vaga, tipo, emManutencao FROM Embarcacoes WHERE id = ? LIMIT 1", [embarcacaoId]);
          boat = (boatRows as any[])[0];
          if (!boat) return { sucesso: false, erro: `Embarcação '${embarcacaoId}' não encontrada.` };
          if (boat.emManutencao) return { sucesso: false, erro: `A embarcação '${boat.nome}' está em manutenção.` };

          const [existingActive] = await conn.query(
            "SELECT id FROM Reservas WHERE embarcacaoId = ? AND data = ? AND status != 'cancelado' FOR UPDATE",
            [embarcacaoId, data]
          );
          if ((existingActive as any[]).length > 0) {
            const conflito = (existingActive as any[])[0];
            return {
              sucesso: false,
              erro: `A embarcação '${boat.nome}' já possui uma reserva ativa (${conflito.id}) na data ${data}.`,
              reservaConflitanteId: conflito.id,
            };
          }
        }

        if (clienteId && clienteId !== "cliente_avulso" && clienteId !== "cliente_marina") {
          const [clientRows] = await conn.query("SELECT id, nome FROM Clientes WHERE id = ? LIMIT 1", [clienteId]);
          client = (clientRows as any[])[0];
          if (!client) return { sucesso: false, erro: `Cliente '${clienteId}' não encontrado.` };
        }

        const [maxRows] = await conn.query("SELECT MAX(posicaoFila) as maxPos FROM Reservas WHERE data = ? AND status != 'cancelado'", [data]);
        const nextPos = ((maxRows as any[])[0]?.maxPos || 0) + 1;

        const id = `res_mcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const finalEmbarcacaoId = isAvulso ? "embarcacao_avulsa" : embarcacaoId!;
        const finalClienteId = isAvulso ? "cliente_avulso" : (clienteId || "cliente_marina");
        const createdAt = new Date().toISOString();

        await conn.query(
          `INSERT INTO Reservas (
            id, embarcacaoId, clienteId, data, periodo,
            previsaoSaida, previsaoChegada, status, statusMarina,
            tipoReserva, origem, nomeAvulso, telefoneAvulso, modeloAvulso, tipoAvulso,
            posicaoFila, litrosAbastecerPrevio, marinheiroPiloto, destino, pessoasABordo,
            observacoes, observacoesDescida, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, finalEmbarcacaoId, finalClienteId, data, periodo,
            previsaoSaida || null, previsaoChegada || null, "agendado", "agendado",
            "garantida", origem,
            isAvulso ? nomeAvulso : null, isAvulso ? (telefoneAvulso || null) : null,
            isAvulso ? modeloAvulso : null, isAvulso ? tipoAvulso : null,
            nextPos,
            litrosAbastecerPrevio !== undefined ? String(litrosAbastecerPrevio) : null,
            marinheiroPiloto || null, destino || null,
            pessoasABordo !== undefined ? String(pessoasABordo) : null,
            observacoes || null, observacoes || null, createdAt,
          ]
        );

        return {
          sucesso: true,
          mensagem: "Reserva criada com sucesso.",
          reserva: {
            id,
            embarcacaoId: finalEmbarcacaoId,
            embarcacaoNome: boat?.nome || modeloAvulso || "Embarcação Avulsa",
            vaga: boat?.vaga || null,
            clienteId: finalClienteId,
            clienteNome: client?.nome || nomeAvulso || "Cliente Marina",
            data,
            periodo,
            previsaoSaida: previsaoSaida || null,
            previsaoChegada: previsaoChegada || null,
            destino: destino || null,
            pessoasABordo: pessoasABordo || null,
            posicaoFila: nextPos,
            status: "agendado",
            origem,
            observacoes: observacoes || null,
            createdAt,
          },
        };
      });

      if (result.sucesso) {
        invalidateDbCache();
        context?.io?.emit("marina_update", { action: "new", reservation: result.reserva });
      }
      return result;
    },
  },
  {
    name: "atualizar_reserva",
    category: "Reservas & Marina",
    mode: "write",
    description: "Atualiza dados de uma reserva existente (data, período, status, horários previstos, destino, pessoas a bordo, marinheiro ou observações).",
    inputSchema: {
      type: "object",
      properties: {
        reservaId: { type: "string", description: "ID da reserva a ser atualizada" },
        data: { type: "string", description: "Nova data (YYYY-MM-DD)" },
        periodo: { type: "string", description: "Novo período" },
        status: { type: "string", enum: ["agendado", "confirmado", "em_andamento", "concluido", "cancelado"], description: "Novo status" },
        statusMarina: { type: "string", description: "Status operacional na marina" },
        previsaoSaida: { type: "string", description: "Horário previsto de saída (HH:MM)" },
        previsaoChegada: { type: "string", description: "Horário previsto de chegada (HH:MM)" },
        destino: { type: "string", description: "Destino" },
        pessoasABordo: { type: "string", description: "Quantidade de pessoas a bordo" },
        marinheiroPiloto: { type: "string", description: "Marinheiro/piloto" },
        observacoes: { type: "string", description: "Observações" },
      },
      required: ["reservaId"],
    },
    handler: async (args, context) => {
      const settings = await getMcpSettings();
      if (!settings.permitirReservas) {
        return { sucesso: false, erro: "As ações de escrita em Reservas via MCP estão desativadas pelo Administrador." };
      }

      const { reservaId, data, periodo, status, statusMarina, previsaoSaida, previsaoChegada, destino, pessoasABordo, marinheiroPiloto, observacoes } = args || {};
      if (!reservaId) return { sucesso: false, erro: "O campo 'reservaId' é obrigatório." };

      const result = await withControlledTransaction(async (conn) => {
        const [rows] = await conn.query(
          `SELECT r.*, e.nome as embarcacaoNome, c.nome as clienteNome FROM Reservas r LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id LEFT JOIN Clientes c ON r.clienteId = c.id WHERE r.id = ? LIMIT 1 FOR UPDATE`,
          [reservaId]
        );
        const existing = (rows as any[])[0];
        if (!existing) return { sucesso: false, erro: `Reserva '${reservaId}' não encontrada.` };

        const novaData = data || existing.data;
        if (data && data !== existing.data && existing.embarcacaoId !== "embarcacao_avulsa") {
          const [conflicts] = await conn.query(
            "SELECT id FROM Reservas WHERE embarcacaoId = ? AND data = ? AND status != 'cancelado' AND id != ? LIMIT 1",
            [existing.embarcacaoId, novaData, reservaId]
          );
          if ((conflicts as any[]).length > 0) {
            return { sucesso: false, erro: `A embarcação já possui outra reserva ativa na data ${novaData}.` };
          }
        }

        const novoPeriodo = periodo !== undefined ? periodo : existing.periodo;
        const novoStatus = status !== undefined ? status : existing.status;
        const novoStatusMarina = statusMarina !== undefined ? statusMarina : existing.statusMarina;
        const novaPrevSaida = previsaoSaida !== undefined ? previsaoSaida : existing.previsaoSaida;
        const novaPrevChegada = previsaoChegada !== undefined ? previsaoChegada : existing.previsaoChegada;
        const novoDestino = destino !== undefined ? destino : existing.destino;
        const novasPessoas = pessoasABordo !== undefined ? String(pessoasABordo) : existing.pessoasABordo;
        const novoPiloto = marinheiroPiloto !== undefined ? marinheiroPiloto : existing.marinheiroPiloto;
        const novasObs = observacoes !== undefined ? observacoes : existing.observacoes;

        await conn.query(
          `UPDATE Reservas SET data = ?, periodo = ?, status = ?, statusMarina = ?, previsaoSaida = ?, previsaoChegada = ?, destino = ?, pessoasABordo = ?, marinheiroPiloto = ?, observacoes = ? WHERE id = ?`,
          [novaData, novoPeriodo, novoStatus, novoStatusMarina, novaPrevSaida, novaPrevChegada, novoDestino, novasPessoas, novoPiloto, novasObs, reservaId]
        );

        return {
          sucesso: true,
          mensagem: "Reserva atualizada com sucesso.",
          reserva: {
            id: reservaId,
            embarcacaoId: existing.embarcacaoId,
            embarcacaoNome: existing.embarcacaoNome || existing.modeloAvulso || undefined,
            clienteId: existing.clienteId,
            clienteNome: existing.clienteNome || existing.nomeAvulso || undefined,
            data: novaData,
            periodo: novoPeriodo,
            status: novoStatus,
            statusMarina: novoStatusMarina,
            previsaoSaida: novaPrevSaida,
            previsaoChegada: novaPrevChegada,
            destino: novoDestino,
            pessoasABordo: novasPessoas,
            marinheiroPiloto: novoPiloto,
            observacoes: novasObs,
          },
        };
      });

      if (result.sucesso) {
        invalidateDbCache();
        context?.io?.emit("marina_update", { action: "update", reservation: result.reserva });
      }
      return result;
    },
  },
  {
    name: "cancelar_reserva",
    category: "Reservas & Marina",
    mode: "write",
    description: "Cancela uma reserva ou agendamento ativo pelo ID, registrando opcionalmente o motivo do cancelamento.",
    inputSchema: {
      type: "object",
      properties: {
        reservaId: { type: "string", description: "ID da reserva a ser cancelada" },
        motivo: { type: "string", description: "Motivo do cancelamento" },
      },
      required: ["reservaId"],
    },
    handler: async (args, context) => {
      const settings = await getMcpSettings();
      if (!settings.permitirReservas) {
        return { sucesso: false, erro: "As ações de escrita em Reservas via MCP estão desativadas pelo Administrador." };
      }

      const { reservaId, motivo } = args || {};
      if (!reservaId) return { sucesso: false, erro: "O campo 'reservaId' é obrigatório." };

      const result = await withControlledTransaction(async (conn) => {
        const [rows] = await conn.query(
          `SELECT r.*, e.nome as embarcacaoNome, c.nome as clienteNome FROM Reservas r LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id LEFT JOIN Clientes c ON r.clienteId = c.id WHERE r.id = ? LIMIT 1 FOR UPDATE`,
          [reservaId]
        );
        const existing = (rows as any[])[0];
        if (!existing) return { sucesso: false, erro: `Reserva '${reservaId}' não encontrada.` };

        if (existing.status === "cancelado") {
          return { sucesso: true, mensagem: `A reserva '${reservaId}' já estava cancelada.`, reservaCancelada: sanitizeReservation(existing) };
        }

        const obsFinal = motivo
          ? `${existing.observacoes ? existing.observacoes + " | " : ""}Cancelado via MCP: ${motivo}`
          : existing.observacoes;

        await conn.query("UPDATE Reservas SET status = 'cancelado', statusMarina = 'cancelado', observacoes = ? WHERE id = ?", [obsFinal, reservaId]);

        return {
          sucesso: true,
          mensagem: "Reserva cancelada com sucesso.",
          reservaCancelada: {
            id: reservaId,
            embarcacao: existing.embarcacaoNome || existing.modeloAvulso || existing.embarcacaoId,
            cliente: existing.clienteNome || existing.nomeAvulso || existing.clienteId,
            data: existing.data,
            statusAnterior: existing.status,
            statusAtual: "cancelado",
            motivo: motivo || null,
          },
        };
      });

      if (result.sucesso) {
        invalidateDbCache();
        context?.io?.emit("marina_update", { action: "cancel", reservation: { id: reservaId, status: "cancelado" } });
      }
      return result;
    },
  },

  // 5. FINANCEIRO
  {
    name: "consultar_resumo_financeiro",
    category: "Financeiro",
    mode: "read",
    description: "Retorna o balanço financeiro consolidado (receitas previstas vs recebidas, despesas pagas vs a pagar, inadimplência e saldo líquido) em um período.",
    inputSchema: {
      type: "object",
      properties: {
        data_inicio: { type: "string", description: "Data inicial YYYY-MM-DD" },
        data_fim: { type: "string", description: "Data final YYYY-MM-DD" },
        empresa: { type: "string", description: "Filtrar por empresa ('VALE', 'MEXICANO', 'Marina', 'Todos')" },
      },
    },
    handler: async (args) => {
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      const inicio = args?.data_inicio || firstDay;
      const fim = args?.data_fim || lastDay;
      const empresa = args?.empresa;

      const whereClauses: string[] = ["t.dataVencimento >= ?", "t.dataVencimento <= ?", "t.status != 'cancelado'"];
      const params: any[] = [inicio, fim];
      if (empresa && empresa !== "Todos") { whereClauses.push("t.empresa = ?"); params.push(empresa); }

      const rows = await queryReadOnly<any>(
        `SELECT t.tipo, t.status, COUNT(*) as qtd, SUM(t.valor) as totalValor FROM TransacoesFinanceiras t WHERE ${whereClauses.join(" AND ")} GROUP BY t.tipo, t.status`,
        params
      );

      let receitasRecebidas = 0, receitasPendentes = 0, receitasAtrasadas = 0;
      let despesasPagas = 0, despesasPendentes = 0, despesasAtrasadas = 0;

      for (const r of rows) {
        const val = Number(r.totalValor) || 0;
        if (r.tipo === "receita") {
          if (r.status === "pago") receitasRecebidas += val;
          else if (r.status === "pendente") receitasPendentes += val;
          else if (r.status === "atrasado") receitasAtrasadas += val;
        } else if (r.tipo === "despesa") {
          if (r.status === "pago") despesasPagas += val;
          else if (r.status === "pendente") despesasPendentes += val;
          else if (r.status === "atrasado") despesasAtrasadas += val;
        }
      }

      return {
        periodo: { data_inicio: inicio, data_fim: fim, empresa: empresa || "Todos" },
        receitas: {
          recebidas: Number(receitasRecebidas.toFixed(2)),
          aReceberNoPrazo: Number(receitasPendentes.toFixed(2)),
          emAtrasoInadimplencia: Number(receitasAtrasadas.toFixed(2)),
          totalPrevisto: Number((receitasRecebidas + receitasPendentes + receitasAtrasadas).toFixed(2)),
        },
        despesas: {
          pagas: Number(despesasPagas.toFixed(2)),
          aPagarNoPrazo: Number(despesasPendentes.toFixed(2)),
          vencidas: Number(despesasAtrasadas.toFixed(2)),
          totalPrevisto: Number((despesasPagas + despesasPendentes + despesasAtrasadas).toFixed(2)),
        },
        resultadoCaixaRealizado: Number((receitasRecebidas - despesasPagas).toFixed(2)),
        resultadoCompetenciaPrevisto: Number(((receitasRecebidas + receitasPendentes + receitasAtrasadas) - (despesasPagas + despesasPendentes + despesasAtrasadas)).toFixed(2)),
      };
    },
  },
  {
    name: "listar_transacoes_financeiras",
    category: "Financeiro",
    mode: "read",
    description: "Lista transações financeiras (receitas e despesas) com filtros por status, categoria, cliente, barco e período.",
    inputSchema: {
      type: "object",
      properties: {
        tipo: { type: "string", description: "'receita', 'despesa' ou 'todos'" },
        status: { type: "string", description: "'pago', 'pendente', 'atrasado', 'cancelado' ou 'todos'" },
        empresa: { type: "string", description: "Filtrar por empresa" },
        clienteId: { type: "string", description: "ID do cliente" },
        embarcacaoId: { type: "string", description: "ID da embarcação" },
        categoria: { type: "string", description: "Busca por categoria" },
        data_inicio: { type: "string", description: "Vencimento inicial YYYY-MM-DD" },
        data_fim: { type: "string", description: "Vencimento final YYYY-MM-DD" },
        limit: { type: "number", description: "Máximo de registros (máx 50)" },
        offset: { type: "number", description: "Offset" },
      },
    },
    handler: async (args) => {
      const { tipo, status, empresa, clienteId, embarcacaoId, categoria, data_inicio, data_fim } = args || {};
      const limit = enforceLimit(args?.limit);
      const offset = Math.max(0, Number(args?.offset) || 0);
      const whereClauses: string[] = ["1=1"];
      const params: any[] = [];

      if (tipo && tipo !== "todos") { whereClauses.push("t.tipo = ?"); params.push(tipo); }
      if (status && status !== "todos") { whereClauses.push("t.status = ?"); params.push(status); }
      if (empresa && empresa !== "Todos") { whereClauses.push("t.empresa = ?"); params.push(empresa); }
      if (clienteId) { whereClauses.push("t.clienteId = ?"); params.push(clienteId); }
      if (embarcacaoId) { whereClauses.push("t.embarcacaoId = ?"); params.push(embarcacaoId); }
      if (categoria) { whereClauses.push("t.categoria LIKE ?"); params.push(`%${categoria}%`); }
      if (data_inicio) { whereClauses.push("t.dataVencimento >= ?"); params.push(data_inicio); }
      if (data_fim) { whereClauses.push("t.dataVencimento <= ?"); params.push(data_fim); }

      const whereSql = whereClauses.join(" AND ");
      const countRows = await queryReadOnly<any>(`SELECT COUNT(*) as total FROM TransacoesFinanceiras t WHERE ${whereSql}`, params);
      const total = countRows[0]?.total || 0;
      const rows = await queryReadOnly<any>(
        `SELECT t.*, c.nome as clienteNome, e.nome as embarcacaoNome FROM TransacoesFinanceiras t LEFT JOIN Clientes c ON t.clienteId = c.id LEFT JOIN Embarcacoes e ON t.embarcacaoId = e.id WHERE ${whereSql} ORDER BY t.dataVencimento DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        paginacao: { total, limit, offset, retornados: rows.length, temMais: offset + rows.length < total },
        transacoes: rows.map(sanitizeTransaction),
      };
    },
  },
  {
    name: "consultar_inadimplentes",
    category: "Financeiro",
    mode: "read",
    description: "Gera um relatório ordenado dos clientes com mensalidades ou taxas de marina atrasadas, total devido e quantidade de títulos.",
    inputSchema: {
      type: "object",
      properties: {
        empresa: { type: "string", description: "Filtrar por empresa" },
        limit: { type: "number", description: "Máximo de registros (máx 50)" },
      },
    },
    handler: async (args) => {
      const empresa = args?.empresa;
      const limit = enforceLimit(args?.limit);
      const hoje = getTodayBrasilia();
      const whereClauses: string[] = ["t.tipo = 'receita'", "(t.status = 'atrasado' OR (t.status = 'pendente' AND t.dataVencimento < ?))"];
      const params: any[] = [hoje];

      if (empresa && empresa !== "Todos") { whereClauses.push("t.empresa = ?"); params.push(empresa); }

      const rows = await queryReadOnly<any>(
        `SELECT t.clienteId, COALESCE(c.nome, 'Cliente Sem Vínculo') as clienteNome, c.statusFinanceiro, COUNT(t.id) as qtdTitulosVencidos, SUM(t.valor) as valorTotalDevido, MIN(t.dataVencimento) as vencimentoMaisAntigo
         FROM TransacoesFinanceiras t LEFT JOIN Clientes c ON t.clienteId = c.id
         WHERE ${whereClauses.join(" AND ")}
         GROUP BY t.clienteId, c.nome, c.statusFinanceiro
         ORDER BY valorTotalDevido DESC LIMIT ?`,
        [...params, limit]
      );

      const totalGeralInadimplencia = rows.reduce((acc, r) => acc + (Number(r.valorTotalDevido) || 0), 0);
      return {
        dataReferencia: hoje,
        empresa: empresa || "Todos",
        totalInadimplentesRetornados: rows.length,
        somaTotalDevidaNosRegistros: Number(totalGeralInadimplencia.toFixed(2)),
        inadimplentes: rows.map((r) => ({
          clienteId: r.clienteId,
          nome: r.clienteNome,
          statusCadastroFinanceiro: r.statusFinanceiro || "inadimplente",
          quantidadeTitulosVencidos: Number(r.qtdTitulosVencidos) || 0,
          valorTotalDevido: Number(Number(r.valorTotalDevido || 0).toFixed(2)),
          vencimentoMaisAntigo: r.vencimentoMaisAntigo,
        })),
      };
    },
  },

  // 6. MANUTENÇÃO & OS
  {
    name: "listar_manutencoes",
    category: "Manutenção & OS",
    mode: "read",
    description: "Lista Ordens de Serviço (OS) de manutenção com filtros por embarcação, status, mecânico e urgência.",
    inputSchema: {
      type: "object",
      properties: {
        embarcacaoId: { type: "string", description: "ID da embarcação" },
        status: { type: "string", description: "Status da OS ('pendente', 'em_andamento', 'concluida', 'todos')" },
        urgencia: { type: "string", description: "Urgência ('baixa', 'normal', 'alta', 'critica')" },
        mecanico: { type: "string", description: "Nome do mecânico" },
        limit: { type: "number", description: "Máximo de registros (máx 50)" },
        offset: { type: "number", description: "Offset" },
      },
    },
    handler: async (args) => {
      const { embarcacaoId, status, urgencia, mecanico } = args || {};
      const limit = enforceLimit(args?.limit);
      const offset = Math.max(0, Number(args?.offset) || 0);
      const whereClauses: string[] = ["1=1"];
      const params: any[] = [];

      if (embarcacaoId) { whereClauses.push("m.embarcacaoId = ?"); params.push(embarcacaoId); }
      if (status && status !== "todos") { whereClauses.push("m.status = ?"); params.push(status); }
      if (urgencia) { whereClauses.push("m.urgencia = ?"); params.push(urgencia); }
      if (mecanico) { whereClauses.push("(m.mecanicoNome LIKE ? OR m.mecanico LIKE ?)"); params.push(`%${mecanico}%`, `%${mecanico}%`); }

      const whereSql = whereClauses.join(" AND ");
      const countRows = await queryReadOnly<any>(`SELECT COUNT(*) as total FROM Manutencoes m WHERE ${whereSql}`, params);
      const total = countRows[0]?.total || 0;
      const rows = await queryReadOnly<any>(
        `SELECT m.*, e.nome as embarcacaoNome FROM Manutencoes m LEFT JOIN Embarcacoes e ON m.embarcacaoId = e.id WHERE ${whereSql} ORDER BY m.dataSaida DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        paginacao: { total, limit, offset, retornados: rows.length, temMais: offset + rows.length < total },
        ordensDeServico: rows.map(sanitizeMaintenance),
      };
    },
  },
  {
    name: "consultar_detalhes_os",
    category: "Manutenção & OS",
    mode: "read",
    description: "Retorna os detalhes completos de uma Ordem de Serviço pelo código legível (ex: OS-2026-001) ou ID.",
    inputSchema: {
      type: "object",
      properties: {
        termo: { type: "string", description: "Código da OS (ex: OS-2026-001) ou ID" },
      },
      required: ["termo"],
    },
    handler: async (args) => {
      const termo = String(args?.termo || "").trim();
      const rows = await queryReadOnly<any>(
        `SELECT m.*, e.nome as embarcacaoNome, c.nome as clienteNome FROM Manutencoes m LEFT JOIN Embarcacoes e ON m.embarcacaoId = e.id LEFT JOIN Clientes c ON m.clienteId = c.id WHERE m.id = ? OR m.codigoOS = ? OR m.codigoOS LIKE ? LIMIT 1`,
        [termo, termo, `%${termo}%`]
      );
      if (rows.length === 0) return { encontrado: false, mensagem: `Nenhuma OS encontrada para '${termo}'.` };
      const os = rows[0];
      return {
        encontrado: true,
        ordemDeServico: {
          ...sanitizeMaintenance(os),
          clienteNome: os.clienteNome || undefined,
          pecasUsadas: safeJsonParse(os.pecasUsadas, []),
          maoDeObra: os.maoDeObra ? Number(os.maoDeObra) : 0,
          observacoesTecnicas: os.observacoes || undefined,
        },
      };
    },
  },

  // 7. UTV
  {
    name: "listar_veiculos_utv",
    category: "UTV Off-Road",
    mode: "read",
    description: "Lista a frota de veículos UTV (veículos de trilha), status atual, km e horímetro.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filtrar por status" },
      },
    },
    handler: async (args) => {
      const status = args?.status;
      const sql = status && status !== "todos" ? "SELECT * FROM UtvVeiculos WHERE status = ? ORDER BY nome ASC" : "SELECT * FROM UtvVeiculos ORDER BY nome ASC";
      const rows = await queryReadOnly<any>(sql, status && status !== "todos" ? [status] : []);
      return {
        totalVeiculos: rows.length,
        veiculos: rows.map((v) => ({
          id: v.id,
          nome: v.nome,
          modelo: v.modelo || undefined,
          ano: v.ano || undefined,
          chassi: v.chassi || undefined,
          status: v.status || "disponivel",
          horimetroAtual: Number(v.horimetro_atual) || 0,
          kmAtual: Number(v.km_atual) || 0,
          totalCotas: Number(v.total_cotas) || 0,
        })),
      };
    },
  },
  {
    name: "listar_usos_utv",
    category: "UTV Off-Road",
    mode: "read",
    description: "Lista o histórico ou reservas de uso dos UTVs por período, veículo ou cotista.",
    inputSchema: {
      type: "object",
      properties: {
        utvId: { type: "string", description: "ID do veículo UTV" },
        cotistaId: { type: "string", description: "ID do cotista" },
        data_inicio: { type: "string", description: "Data inicial YYYY-MM-DD" },
        data_fim: { type: "string", description: "Data final YYYY-MM-DD" },
        limit: { type: "number", description: "Máximo de registros (máx 50)" },
      },
    },
    handler: async (args) => {
      const { utvId, cotistaId, data_inicio, data_fim } = args || {};
      const limit = enforceLimit(args?.limit);
      const whereClauses: string[] = ["1=1"];
      const params: any[] = [];

      if (utvId) { whereClauses.push("u.utv_id = ?"); params.push(utvId); }
      if (cotistaId) { whereClauses.push("u.cotista_id = ?"); params.push(cotistaId); }
      if (data_inicio) { whereClauses.push("u.data_uso >= ?"); params.push(data_inicio); }
      if (data_fim) { whereClauses.push("u.data_uso <= ?"); params.push(data_fim); }

      const rows = await queryReadOnly<any>(
        `SELECT u.*, v.nome as utvNome, c.nome as cotistaNome FROM UtvUsos u LEFT JOIN UtvVeiculos v ON u.utv_id = v.id LEFT JOIN Clientes c ON u.cotista_id = c.id WHERE ${whereClauses.join(" AND ")} ORDER BY u.data_uso DESC LIMIT ?`,
        [...params, limit]
      );
      return {
        retornados: rows.length,
        usos: rows.map((u) => ({
          id: u.id,
          utvId: u.utv_id,
          utvNome: u.utvNome || undefined,
          cotistaId: u.cotista_id,
          cotistaNome: u.cotistaNome || u.cotista_nome || undefined,
          dataUso: u.data_uso,
          status: u.status,
          horimetroInicial: Number(u.horimetro_inicial) || 0,
          horimetroFinal: Number(u.horimetro_final) || 0,
          observacoes: u.observacoes || undefined,
        })),
      };
    },
  },

  // 8. COMBUSTÍVEL
  {
    name: "consultar_estoque_combustivel",
    category: "Combustível",
    mode: "read",
    description: "Retorna os níveis atuais de combustível no tanque principal da marina, galões e status de alerta mínimo.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const rows = await queryReadOnly<any>("SELECT * FROM CombustivelEstoque LIMIT 10");
      return {
        tanques: rows.map((t) => ({
          id: t.id,
          tipoCombustivel: t.tipo || "Gasolina",
          litrosAtuais: Number(t.litros_atuais ?? t.quantidade ?? 0),
          capacidadeMaxima: Number(t.capacidade_maxima ?? 0),
          nivelMinimoAlerta: Number(t.nivel_minimo ?? 0),
          precoPorLitro: Number(t.preco_litro ?? 0),
          ultimaAtualizacao: t.updated_at || t.ultima_atualizacao || undefined,
        })),
      };
    },
  },
  {
    name: "listar_abastecimentos",
    category: "Combustível",
    mode: "read",
    description: "Lista os últimos abastecimentos realizados na marina por embarcação ou período.",
    inputSchema: {
      type: "object",
      properties: {
        buscaBarco: { type: "string", description: "Nome ou ID da embarcação" },
        tipoMovimentacao: { type: "string", description: "'saida' (consumo), 'entrada' (compra) ou 'todos'" },
        limit: { type: "number", description: "Máximo de registros (máx 50)" },
      },
    },
    handler: async (args) => {
      const { buscaBarco, tipoMovimentacao } = args || {};
      const limit = enforceLimit(args?.limit);
      const whereClauses: string[] = ["1=1"];
      const params: any[] = [];

      if (buscaBarco) { whereClauses.push("(barco_nome LIKE ? OR detalhes LIKE ?)"); params.push(`%${buscaBarco}%`, `%${buscaBarco}%`); }
      if (tipoMovimentacao && tipoMovimentacao !== "todos") { whereClauses.push("tipo = ?"); params.push(tipoMovimentacao); }

      const rows = await queryReadOnly<any>(
        `SELECT * FROM CombustivelMovimentacoes WHERE ${whereClauses.join(" AND ")} ORDER BY data_hora DESC LIMIT ?`,
        [...params, limit]
      );
      return {
        retornados: rows.length,
        movimentacoes: rows.map((m) => ({
          id: m.id,
          tipo: m.tipo,
          litros: Number(m.litros) || 0,
          embarcacao: m.barco_nome || undefined,
          operador: m.operador || undefined,
          dataHora: m.data_hora,
          detalhes: m.detalhes || undefined,
        })),
      };
    },
  },

  // 9. WHATSAPP (EVOLUTION API)
  {
    name: "verificar_status_whatsapp",
    category: "WhatsApp",
    mode: "read",
    description: "Verifica o estado da conexão da instância do WhatsApp na Evolution API e informa se a trava de segurança Sandbox está ativa.",
    inputSchema: {
      type: "object",
      properties: {
        instancia: { type: "string", description: "Nome opcional da instância na Evolution API" },
      },
    },
    handler: async (args) => {
      const apiUrl = process.env.EVOLUTION_API_URL || "";
      const apiKey = process.env.EVOLUTION_API_KEY || "";
      const instance = (args?.instancia || process.env.EVOLUTION_INSTANCE || "mexicano").trim();
      const sandboxAtiva = (await getConfigValue("notif_sandbox_ativa")) === "1";
      const sandboxTelefone = await getConfigValue("notif_sandbox_telefone");
      const settings = await getMcpSettings();

      if (!apiUrl || !apiKey) {
        return {
          conectado: false,
          estado: "not_configured",
          instancia: instance,
          sandboxAtiva,
          permitirWhatsappMcp: settings.permitirWhatsapp,
          mensagem: "EVOLUTION_API_URL ou EVOLUTION_API_KEY não configuradas no ambiente.",
        };
      }

      try {
        const response = await evolutionRequest(`${apiUrl}/instance/connectionState/${instance}`, {
          method: "GET",
          headers: { apikey: apiKey },
          timeoutMs: 10000,
        });
        const parsed = safeJsonParse(response.text, {});
        return {
          conectado: response.ok && parsed?.instance?.state === "open",
          estado: parsed?.instance?.state || (response.status === 404 ? "not_created" : "close"),
          instancia: instance,
          sandboxAtiva,
          permitirWhatsappMcp: settings.permitirWhatsapp,
          sandboxTelefoneMascarado: sandboxTelefone ? maskPhone(sandboxTelefone) : null,
          detalhes: parsed,
        };
      } catch (err: any) {
        return {
          conectado: false,
          estado: "error",
          instancia: instance,
          sandboxAtiva,
          erro: err.message || "Falha ao verificar status da Evolution API",
        };
      }
    },
  },
  {
    name: "enviar_mensagem_whatsapp",
    category: "WhatsApp",
    mode: "write",
    description: "Envia uma mensagem de texto pelo WhatsApp para um cliente (via clienteId ou telefone), respeitando a trava física de Sandbox do sistema.",
    inputSchema: {
      type: "object",
      properties: {
        clienteId: { type: "string", description: "ID do cliente cadastrado no sistema (busca o telefone automaticamente)" },
        telefone: { type: "string", description: "Número com DDD (ex: '11999999999') caso não informe clienteId" },
        mensagem: { type: "string", description: "Texto da mensagem a ser enviada" },
      },
      required: ["mensagem"],
    },
    handler: async (args) => {
      const settings = await getMcpSettings();
      if (!settings.permitirWhatsapp) {
        return { sucesso: false, erro: "O envio de mensagens WhatsApp via MCP está desativado pelo Administrador no painel de gestão." };
      }

      const { clienteId, telefone, mensagem } = args || {};
      if (!mensagem || !String(mensagem).trim()) {
        return { sucesso: false, erro: "O campo 'mensagem' não pode estar vazio." };
      }
      if (!clienteId && !telefone) {
        return { sucesso: false, erro: "Informe 'clienteId' ou 'telefone'." };
      }

      let targetPhone = telefone || "";
      let destinatarioNome = "Número avulso";

      if (clienteId) {
        const rows = await queryReadOnly<any>("SELECT id, nome, telefone FROM Clientes WHERE id = ? LIMIT 1", [clienteId]);
        const client = rows[0];
        if (!client) return { sucesso: false, erro: `Cliente '${clienteId}' não encontrado.` };
        destinatarioNome = client.nome || clienteId;
        if (!targetPhone) targetPhone = client.telefone || "";
        if (!targetPhone) return { sucesso: false, erro: `O cliente '${destinatarioNome}' não possui telefone cadastrado.` };
      }

      let cleanedNumber = String(targetPhone).trim();
      if (!cleanedNumber.includes("@g.us")) {
        cleanedNumber = cleanedNumber.replace(/\D/g, "");
        if (cleanedNumber.length >= 10 && cleanedNumber.length <= 11 && !cleanedNumber.startsWith("55")) {
          cleanedNumber = `55${cleanedNumber}`;
        }
      }

      if (!cleanedNumber || cleanedNumber.length < 10) {
        return { sucesso: false, erro: "Número de telefone inválido para WhatsApp." };
      }

      // Trava física de Sandbox
      const sandboxAtiva = (await getConfigValue("notif_sandbox_ativa")) === "1";
      const sandboxTelefone = (await getConfigValue("notif_sandbox_telefone")) || "";
      if (sandboxAtiva) {
        let cleanedSandbox = sandboxTelefone.replace(/\D/g, "");
        if (cleanedSandbox.length >= 10 && cleanedSandbox.length <= 11 && !cleanedSandbox.startsWith("55")) {
          cleanedSandbox = `55${cleanedSandbox}`;
        }
        if (!cleanedSandbox || cleanedNumber !== cleanedSandbox) {
          return {
            sucesso: true,
            sandboxInterceptado: true,
            destinatario: destinatarioNome,
            telefoneMascarado: maskPhone(cleanedNumber),
            mensagem: "Modo Sandbox ativo no sistema: o envio para cliente real foi interceptado e bloqueado com segurança.",
          };
        }
      }

      const apiUrl = process.env.EVOLUTION_API_URL || "";
      const apiKey = process.env.EVOLUTION_API_KEY || "";
      const instance = (process.env.EVOLUTION_INSTANCE || "mexicano").trim();

      if (!apiUrl || !apiKey) {
        return { sucesso: false, erro: "Evolution API não configurada no servidor." };
      }

      const response = await evolutionRequest(`${apiUrl}/message/sendText/${instance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ number: cleanedNumber, text: String(mensagem) }),
      });

      if (!response.ok) {
        return {
          sucesso: false,
          destinatario: destinatarioNome,
          telefoneMascarado: maskPhone(cleanedNumber),
          statusHttp: response.status,
          erro: response.text || response.statusText,
        };
      }

      return {
        sucesso: true,
        sandboxInterceptado: false,
        destinatario: destinatarioNome,
        telefoneMascarado: maskPhone(cleanedNumber),
        instancia: instance,
        mensagem: "Mensagem enviada com sucesso via WhatsApp.",
      };
    },
  },
];

async function executeMcpToolByName(
  toolName: string,
  args: any,
  source: "external-mcp" | "admin-chat" | "admin-test",
  io?: any
) {
  const start = Date.now();
  const tool = MCP_TOOLS.find((t) => t.name === toolName);
  if (!tool) {
    throw new Error(`Ferramenta MCP '${toolName}' não encontrada.`);
  }

  try {
    const result = await tool.handler(args || {}, { io });
    const durationMs = Date.now() - start;
    recordMcpExecution({
      toolName,
      source,
      durationMs,
      success: result?.sucesso !== false,
      argsPreview: JSON.stringify(args || {}).slice(0, 180),
      resultPreview: JSON.stringify(result).slice(0, 220),
    });
    return result;
  } catch (err: any) {
    const durationMs = Date.now() - start;
    recordMcpExecution({
      toolName,
      source,
      durationMs,
      success: false,
      argsPreview: JSON.stringify(args || {}).slice(0, 180),
      resultPreview: err?.message || String(err),
    });
    throw err;
  }
}

// ─── Helpers de URL Base e Metadados OAuth 2.1 (RFC 9728 / RFC 8414 / RFC 7591) ─

export function getPublicBaseUrl(req: Request): string {
  const host = req.get("x-forwarded-host") || req.get("host") || "mexicano.echo.dev.br";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("192.168.");
  const proto = isLocal ? (req.get("x-forwarded-proto") || req.protocol || "http") : "https";
  return `${proto}://${host}`;
}

export function buildOAuthProtectedResourceMetadata(req: Request) {
  const baseUrl = getPublicBaseUrl(req);
  const fullPath = (req.originalUrl || req.path || "").split("?")[0];
  let resourcePath = "/api/mcp";
  const prefixIdx = fullPath.indexOf("/.well-known/oauth-protected-resource");
  if (prefixIdx >= 0) {
    const after = fullPath.slice(prefixIdx + "/.well-known/oauth-protected-resource".length);
    if (after && after.startsWith("/")) {
      resourcePath = after;
    } else if (prefixIdx > 0) {
      resourcePath = fullPath.slice(0, prefixIdx);
    }
  }
  return {
    resource: `${baseUrl}${resourcePath}`,
    authorization_servers: [baseUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:tools", "read", "write"],
    resource_documentation: `${baseUrl}/api/mcp/health`,
  };
}

export function buildOAuthAuthorizationServerMetadata(req: Request) {
  const baseUrl = getPublicBaseUrl(req);
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/mcp/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/mcp/oauth/token`,
    registration_endpoint: `${baseUrl}/api/mcp/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token", "client_credentials"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256", "plain"],
    scopes_supported: ["mcp:tools", "read", "write"],
    service_documentation: `${baseUrl}/api/mcp/health`,
  };
}

function setMcpCorsHeaders(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-MCP-API-Key, Mcp-Session-Id, Accept, MCP-Protocol-Version");
  res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate, Mcp-Session-Id");
}

function verifyBearerTokenOrApiKey(token: string, expectedApiKey: string): boolean {
  if (!token) return false;
  // 1) Verifica se é um token JWT OAuth 2.1 emitido por este servidor
  try {
    const decoded = jwt.verify(token, MCP_JWT_SECRET) as any;
    if (decoded && (decoded.type === "mcp_oauth_access" || decoded.role === "admin")) {
      return true;
    }
  } catch {}

  // 2) Verifica se é a MCP_API_KEY estática
  const expectedBuf = Buffer.from(expectedApiKey, "utf-8");
  const receivedBuf = Buffer.from(token, "utf-8");
  if (expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
    return true;
  }
  return false;
}

// ─── Middleware de Autenticação das Rotas Externas MCP (/api/mcp/*) ─────────

async function requireMcpExternalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    setMcpCorsHeaders(res);
    const settings = await getMcpSettings();
    if (!settings.mcpAtivo) {
      return res.status(403).json({
        error: "Forbidden",
        message: "O Servidor MCP externo está temporariamente desativado pelo Administrador.",
      });
    }

    const baseUrl = getPublicBaseUrl(req);
    const reqPath = (req.originalUrl || req.path || "/api/mcp").split("?")[0];
    const metadataUrl = `${baseUrl}/.well-known/oauth-protected-resource${reqPath.startsWith("/") ? reqPath : `/${reqPath}`}`;
    const wwwAuthHeader = `Bearer realm="mcp", resource_metadata="${metadataUrl}"`;

    const authHeader = req.headers.authorization;
    const headerKey = (req.headers["x-mcp-api-key"] as string) || "";
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : (headerKey || (req.query.apiKey as string) || (req.query.access_token as string) || "").trim();

    if (!bearerToken) {
      res.setHeader("WWW-Authenticate", wwwAuthHeader);
      return res.status(401).json({
        error: "invalid_token",
        error_description: "OAuth 2.0 Bearer token ou MCP_API_KEY obrigatório.",
        resource_metadata: metadataUrl,
      });
    }

    if (!verifyBearerTokenOrApiKey(bearerToken, settings.apiKey)) {
      res.setHeader("WWW-Authenticate", `${wwwAuthHeader}, error="invalid_token", error_description="Invalid or expired access token"`);
      return res.status(401).json({
        error: "invalid_token",
        error_description: "Token OAuth ou MCP_API_KEY inválido ou expirado.",
      });
    }

    next();
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
}

// ─── Processador JSON-RPC 2.0 (Compatível com MCP SSE e Streamable HTTP) ────

async function handleJsonRpcMessage(payload: any, io?: any): Promise<any | null> {
  if (!payload || typeof payload !== "object") {
    return { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } };
  }

  const { id, method, params } = payload;

  // Notificações sem ID não exigem resposta JSON-RPC
  if (id === undefined || id === null) {
    return null;
  }

  try {
    if (method === "initialize") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: params?.protocolVersion || "2025-03-26",
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: "mexicano-gestao-nautica",
            version: "1.2.0",
          },
        },
      };
    }

    if (method === "ping") {
      return { jsonrpc: "2.0", id, result: {} };
    }

    if (method === "resources/list") {
      return { jsonrpc: "2.0", id, result: { resources: [] } };
    }

    if (method === "resources/templates/list") {
      return { jsonrpc: "2.0", id, result: { resourceTemplates: [] } };
    }

    if (method === "prompts/list") {
      return { jsonrpc: "2.0", id, result: { prompts: [] } };
    }

    if (method === "tools/list") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: MCP_TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      };
    }

    if (method === "tools/call") {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const data = await executeMcpToolByName(toolName, toolArgs, "external-mcp", io);
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          isError: false,
        },
      };
    }

    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    };
  } catch (err: any) {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify({ erro: err.message || String(err) }, null, 2) }],
        isError: true,
      },
    };
  }
}

// ─── Rotas OAuth 2.1 + Descoberta Dinâmica para Google Gemini / Claude ──────

router.options("/mcp*", (_req, res) => {
  setMcpCorsHeaders(res);
  res.status(204).end();
});

router.get("/mcp/.well-known/oauth-protected-resource", (req, res) => {
  setMcpCorsHeaders(res);
  res.json(buildOAuthProtectedResourceMetadata(req));
});

router.get("/mcp/.well-known/oauth-authorization-server", (req, res) => {
  setMcpCorsHeaders(res);
  res.json(buildOAuthAuthorizationServerMetadata(req));
});

router.get("/mcp/.well-known/openid-configuration", (req, res) => {
  setMcpCorsHeaders(res);
  res.json(buildOAuthAuthorizationServerMetadata(req));
});

// RFC 7591 - Dynamic Client Registration
export async function handleMcpOAuthRegister(req: Request, res: Response) {
  try {
    setMcpCorsHeaders(res);
    const settings = await getMcpSettings();
    const body = req.body || {};
    const issuedAt = Math.floor(Date.now() / 1000);
    const clientId = body.client_id || `mexicano_client_${crypto.randomBytes(6).toString("hex")}`;
    const authMethod = body.token_endpoint_auth_method || "none";

    res.status(201).json({
      client_id: clientId,
      client_secret: settings.apiKey,
      client_id_issued_at: issuedAt,
      client_secret_expires_at: 0,
      client_name: body.client_name || "Google Gemini MCP Connector",
      redirect_uris: Array.isArray(body.redirect_uris) ? body.redirect_uris : [],
      grant_types: body.grant_types || ["authorization_code", "refresh_token", "client_credentials"],
      response_types: body.response_types || ["code"],
      token_endpoint_auth_method: authMethod,
      scope: body.scope || "mcp:tools read write",
    });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", error_description: err.message });
  }
}

// OAuth 2.1 Authorization Endpoint (GET -> Tela de Consentimento do Administrador)
export async function handleMcpOAuthAuthorizeGet(req: Request, res: Response) {
  setMcpCorsHeaders(res);
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; form-action *;"
  );

  const clientId = String(req.query.client_id || "mexicano-gemini-client");
  const redirectUri = String(req.query.redirect_uri || "");
  const state = String(req.query.state || "");
  const codeChallenge = String(req.query.code_challenge || "");
  const codeChallengeMethod = String(req.query.code_challenge_method || "S256");
  const scope = String(req.query.scope || "mcp:tools");
  const resource = String(req.query.resource || "");

  const escapeHtml = (str: string) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Autorizar Conexão MCP — Marina El Mexicano</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(circle at top, #0f172a 0%, #020617 100%);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      width: 100%;
      max-width: 440px;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 6px; }
    p.sub { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px; }
    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      background: #020617;
      padding: 4px;
      border-radius: 10px;
      border: 1px solid #1e293b;
      margin-bottom: 18px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 8px 10px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .tab-btn.active {
      background: #0284c7;
      color: #ffffff;
    }
    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      background: #020617;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 11px 13px;
      border-radius: 10px;
      font-size: 14px;
      margin-bottom: 14px;
      outline: none;
    }
    input:focus { border-color: #38bdf8; }
    .error-box {
      display: none;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 12px;
      margin-bottom: 14px;
    }
    .btn-submit {
      width: 100%;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: #ffffff;
      border: none;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-submit:disabled { opacity: 0.6; cursor: wait; }
    .scope-box {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid #1e293b;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }
    .scope-box strong { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">OAuth 2.1 Seguro • MCP Server</div>
    <h1>Conectar ao Google Gemini</h1>
    <p class="sub">Autorize o conector externo a acessar as 22 ferramentas do <strong>Sistema de Gestão Marina El Mexicano</strong>.</p>

    <div class="tabs">
      <button type="button" id="tab-admin" class="tab-btn active" onclick="switchMode('admin')">Login do Painel Admin</button>
      <button type="button" id="tab-key" class="tab-btn" onclick="switchMode('key')">Chave MCP_API_KEY</button>
    </div>

    <div id="error-box" class="error-box"></div>

    <form id="oauth-form" onsubmit="submitConsent(event)">
      <div id="mode-admin">
        <label for="username">Usuário Administrador</label>
        <input type="text" id="username" name="username" placeholder="Digite seu usuário admin" autocomplete="username" />
        <label for="password">Senha</label>
        <input type="password" id="password" name="password" placeholder="Digite sua senha" autocomplete="current-password" />
      </div>

      <div id="mode-key" style="display:none;">
        <label for="apiKey">Chave Secreta (MCP_API_KEY)</label>
        <input type="password" id="apiKey" name="apiKey" placeholder="mcp_mex_..." autocomplete="off" />
      </div>

      <button type="submit" id="submit-btn" class="btn-submit">Autorizar e Conectar ao Gemini</button>
    </form>

    <div class="scope-box">
      <strong>Cliente OAuth:</strong> ${escapeHtml(clientId)}<br/>
      <strong>Permissões:</strong> 17 ferramentas de leitura (360°, Financeiro, OS, UTV, Combustível) + Reservas + WhatsApp (protegidas pelas travas do painel).
    </div>
  </div>

  <script>
    var authMode = 'admin';
    var oauthParams = {
      client_id: ${JSON.stringify(clientId)},
      redirect_uri: ${JSON.stringify(redirectUri)},
      state: ${JSON.stringify(state)},
      code_challenge: ${JSON.stringify(codeChallenge)},
      code_challenge_method: ${JSON.stringify(codeChallengeMethod)},
      scope: ${JSON.stringify(scope)},
      resource: ${JSON.stringify(resource)}
    };

    function switchMode(mode) {
      authMode = mode;
      document.getElementById('mode-admin').style.display = mode === 'admin' ? 'block' : 'none';
      document.getElementById('mode-key').style.display = mode === 'key' ? 'block' : 'none';
      document.getElementById('tab-admin').className = 'tab-btn' + (mode === 'admin' ? ' active' : '');
      document.getElementById('tab-key').className = 'tab-btn' + (mode === 'key' ? ' active' : '');
      document.getElementById('error-box').style.display = 'none';
    }

    async function submitConsent(e) {
      e.preventDefault();
      var errBox = document.getElementById('error-box');
      var btn = document.getElementById('submit-btn');
      errBox.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Validando e redirecionando...';

      var payload = Object.assign({}, oauthParams, {
        authMode: authMode,
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value,
        apiKey: document.getElementById('apiKey').value.trim()
      });

      try {
        var res = await fetch('/api/mcp/oauth/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (!res.ok || !data.success) {
          errBox.textContent = data.message || 'Falha na autenticação. Verifique suas credenciais.';
          errBox.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Autorizar e Conectar ao Gemini';
          return;
        }
        window.location.replace(data.redirectUrl);
      } catch (err) {
        errBox.textContent = 'Erro de conexão com o servidor: ' + err.message;
        errBox.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Autorizar e Conectar ao Gemini';
      }
    }
  </script>
</body>
</html>`;

  res.status(200).send(html);
}

// OAuth 2.1 Authorization POST (Valida Admin ou MCP_API_KEY e emite Authorization Code PKCE)
export async function handleMcpOAuthAuthorizePost(req: Request, res: Response) {
  try {
    setMcpCorsHeaders(res);
    const settings = await getMcpSettings();
    if (!settings.mcpAtivo) {
      return res.status(403).json({ success: false, message: "O Servidor MCP está desativado no painel." });
    }

    const {
      authMode,
      username,
      password,
      apiKey,
      client_id,
      redirect_uri,
      state,
      code_challenge,
      code_challenge_method,
      scope,
      resource,
    } = req.body || {};

    if (!redirect_uri) {
      return res.status(400).json({ success: false, message: "Parâmetro 'redirect_uri' ausente na requisição OAuth." });
    }

    let authorizedSub = "mcp-admin";

    if (authMode === "key" || (!username && apiKey)) {
      const cleanKey = String(apiKey || "").trim();
      if (!cleanKey || !verifyBearerTokenOrApiKey(cleanKey, settings.apiKey)) {
        writeAuditLog("oauth-mcp", "admin", "MCP_OAUTH_FAILED", getClientIp(req), "MCP_API_KEY inválida no consentimento OAuth");
        return res.status(401).json({ success: false, message: "Chave MCP_API_KEY inválida." });
      }
      authorizedSub = "mcp-apikey-admin";
    } else {
      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Informe seu usuário e senha de administrador (ou use a aba Chave MCP_API_KEY)." });
      }
      const admin = await getAdminByUsername(String(username).trim());
      if (!admin) {
        writeAuditLog(String(username), "admin", "MCP_OAUTH_FAILED", getClientIp(req), "Usuário não encontrado no OAuth MCP");
        return res.status(401).json({ success: false, message: "Usuário ou senha de administrador inválidos." });
      }
      const validPass = await bcrypt.compare(String(password), admin.passwordHash);
      if (!validPass) {
        writeAuditLog(String(username), "admin", "MCP_OAUTH_FAILED", getClientIp(req), "Senha incorreta no OAuth MCP");
        return res.status(401).json({ success: false, message: "Usuário ou senha de administrador inválidos." });
      }
      authorizedSub = admin.username;
    }

    const authCode = jwt.sign(
      {
        type: "mcp_oauth_code",
        sub: authorizedSub,
        client_id: client_id || "mexicano-gemini-client",
        redirect_uri,
        code_challenge: code_challenge || "",
        code_challenge_method: code_challenge_method || "S256",
        scope: scope || "mcp:tools",
        resource: resource || "",
      },
      MCP_JWT_SECRET,
      { expiresIn: "10m" }
    );

    writeAuditLog(authorizedSub, "admin", "MCP_OAUTH_AUTHORIZED", getClientIp(req), `Conector OAuth autorizado (${client_id || "gemini"})`);

    const targetUrl = new URL(String(redirect_uri));
    targetUrl.searchParams.set("code", authCode);
    if (state !== undefined && state !== "") {
      targetUrl.searchParams.set("state", String(state));
    }

    if (String(req.headers.accept || "").includes("application/json")) {
      return res.json({ success: true, redirectUrl: targetUrl.toString() });
    }
    return res.redirect(302, targetUrl.toString());
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || "Erro interno ao autorizar OAuth." });
  }
}

// OAuth 2.1 Token Endpoint (Suporta authorization_code + PKCE, refresh_token e client_credentials)
export async function handleMcpOAuthToken(req: Request, res: Response) {
  try {
    setMcpCorsHeaders(res);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");

    const settings = await getMcpSettings();
    if (!settings.mcpAtivo) {
      return res.status(403).json({ error: "access_denied", error_description: "MCP Server disabled by administrator" });
    }

    const grantType = req.body?.grant_type || req.query?.grant_type;
    const code = req.body?.code || req.query?.code;
    const codeVerifier = req.body?.code_verifier || req.query?.code_verifier;
    const refreshToken = req.body?.refresh_token || req.query?.refresh_token;

    // Extrai client_secret caso enviado via Basic Auth ou post body
    let clientSecret = req.body?.client_secret || "";
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Basic ")) {
      try {
        const decodedBasic = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
        const colonIdx = decodedBasic.indexOf(":");
        if (colonIdx >= 0) {
          clientSecret = decodedBasic.slice(colonIdx + 1);
        }
      } catch {}
    }

    if (grantType === "authorization_code") {
      if (!code) {
        return res.status(400).json({ error: "invalid_request", error_description: "Missing authorization code" });
      }

      let decodedCode: any;
      try {
        decodedCode = jwt.verify(String(code), MCP_JWT_SECRET);
      } catch {
        return res.status(400).json({ error: "invalid_grant", error_description: "Authorization code expired or invalid" });
      }

      if (!decodedCode || decodedCode.type !== "mcp_oauth_code") {
        return res.status(400).json({ error: "invalid_grant", error_description: "Invalid authorization code type" });
      }

      // Validação PKCE (S256 ou plain) se code_challenge foi enviado na autorização
      if (decodedCode.code_challenge) {
        if (!codeVerifier) {
          return res.status(400).json({ error: "invalid_request", error_description: "Missing code_verifier for PKCE" });
        }
        const method = String(decodedCode.code_challenge_method || "S256").toUpperCase();
        const computedChallenge =
          method === "PLAIN"
            ? String(codeVerifier)
            : crypto.createHash("sha256").update(String(codeVerifier)).digest("base64url");

        if (computedChallenge !== decodedCode.code_challenge) {
          return res.status(400).json({ error: "invalid_grant", error_description: "PKCE code_verifier mismatch" });
        }
      }

      const accessToken = jwt.sign(
        {
          type: "mcp_oauth_access",
          sub: decodedCode.sub || "mcp-admin",
          scope: decodedCode.scope || "mcp:tools",
        },
        MCP_JWT_SECRET,
        { expiresIn: "365d" }
      );

      const newRefreshToken = jwt.sign(
        {
          type: "mcp_oauth_refresh",
          sub: decodedCode.sub || "mcp-admin",
          scope: decodedCode.scope || "mcp:tools",
        },
        MCP_JWT_SECRET,
        { expiresIn: "365d" }
      );

      return res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 2592000,
        refresh_token: newRefreshToken,
        scope: decodedCode.scope || "mcp:tools",
      });
    }

    if (grantType === "refresh_token") {
      if (!refreshToken) {
        return res.status(400).json({ error: "invalid_request", error_description: "Missing refresh_token" });
      }
      let decodedRefresh: any;
      try {
        decodedRefresh = jwt.verify(String(refreshToken), MCP_JWT_SECRET);
      } catch {
        return res.status(400).json({ error: "invalid_grant", error_description: "Invalid or expired refresh_token" });
      }
      if (!decodedRefresh || decodedRefresh.type !== "mcp_oauth_refresh") {
        return res.status(400).json({ error: "invalid_grant", error_description: "Invalid refresh_token type" });
      }

      const accessToken = jwt.sign(
        {
          type: "mcp_oauth_access",
          sub: decodedRefresh.sub || "mcp-admin",
          scope: decodedRefresh.scope || "mcp:tools",
        },
        MCP_JWT_SECRET,
        { expiresIn: "365d" }
      );

      return res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 2592000,
        refresh_token: refreshToken,
        scope: decodedRefresh.scope || "mcp:tools",
      });
    }

    if (grantType === "client_credentials") {
      if (!clientSecret || !verifyBearerTokenOrApiKey(String(clientSecret), settings.apiKey)) {
        return res.status(401).json({ error: "invalid_client", error_description: "Invalid client_secret" });
      }

      const accessToken = jwt.sign(
        {
          type: "mcp_oauth_access",
          sub: "mcp-client-credentials",
          scope: "mcp:tools",
        },
        MCP_JWT_SECRET,
        { expiresIn: "365d" }
      );

      return res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 2592000,
        scope: "mcp:tools",
      });
    }

    return res.status(400).json({
      error: "unsupported_grant_type",
      error_description: `Grant type '${grantType}' is not supported`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "server_error", error_description: err.message });
  }
}

router.post("/mcp/oauth/register", handleMcpOAuthRegister);
router.get("/mcp/oauth/authorize", handleMcpOAuthAuthorizeGet);
router.post("/mcp/oauth/authorize", handleMcpOAuthAuthorizePost);
router.post("/mcp/oauth/token", handleMcpOAuthToken);

// ─── Rotas Públicas/Externas do Protocolo MCP (/api/mcp/*) ──────────────────

const sseSessions = new Map<string, Response>();

router.get("/mcp/health", async (req, res) => {
  setMcpCorsHeaders(res);
  const settings = await getMcpSettings();
  const pool = getDbPool();
  const baseUrl = getPublicBaseUrl(req);
  res.json({
    status: pool ? "healthy" : "degraded",
    service: "mexicano-mcp-integrated",
    version: "1.2.0",
    mcpAtivo: settings.mcpAtivo,
    oauth2Enabled: true,
    totalTools: MCP_TOOLS.length,
    endpoints: {
      streamableHttp: `${baseUrl}/api/mcp`,
      sse: `${baseUrl}/api/mcp/sse`,
      messages: `${baseUrl}/api/mcp/messages`,
      oauthProtectedResource: `${baseUrl}/.well-known/oauth-protected-resource`,
      oauthAuthorizationServer: `${baseUrl}/.well-known/oauth-authorization-server`,
      oauthAuthorize: `${baseUrl}/api/mcp/oauth/authorize`,
      oauthToken: `${baseUrl}/api/mcp/oauth/token`,
      oauthRegister: `${baseUrl}/api/mcp/oauth/register`,
    },
  });
});

function openSseSession(req: Request, res: Response) {
  setMcpCorsHeaders(res);
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const sessionId = crypto.randomUUID();
  sseSessions.set(sessionId, res);

  const apiKeyParam = req.query.apiKey ? `&apiKey=${encodeURIComponent(String(req.query.apiKey))}` : "";
  res.write(`event: endpoint\ndata: /api/mcp/messages?sessionId=${sessionId}${apiKeyParam}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {}
  }, 20000);

  req.on("close", () => {
    clearInterval(keepAlive);
    sseSessions.delete(sessionId);
  });
}

// Transporte Streamable HTTP GET / SSE unificado em /api/mcp
router.get("/mcp", requireMcpExternalAuth, (req, res) => {
  const accept = String(req.headers.accept || "");
  if (accept.includes("text/event-stream")) {
    return openSseSession(req, res);
  }
  return res.json({
    status: "ok",
    service: "mexicano-gestao-nautica",
    version: "1.2.0",
    protocolVersion: "2025-03-26",
  });
});

// Transporte Streamable HTTP POST (MCP 2025-03-26)
router.post("/mcp", requireMcpExternalAuth, async (req, res) => {
  const io = req.app.locals.io;
  const body = req.body;

  if (!req.headers["mcp-session-id"]) {
    res.setHeader("Mcp-Session-Id", crypto.randomUUID());
  }

  if (Array.isArray(body)) {
    const responses = [];
    for (const item of body) {
      const r = await handleJsonRpcMessage(item, io);
      if (r) responses.push(r);
    }
    return res.json(responses);
  }

  const response = await handleJsonRpcMessage(body, io);
  if (!response) {
    return res.status(202).end();
  }
  return res.json(response);
});

router.delete("/mcp", requireMcpExternalAuth, (_req, res) => {
  return res.status(200).json({ terminated: true });
});

// Transporte SSE (MCP 2024-11-05)
router.get("/mcp/sse", requireMcpExternalAuth, (req, res) => {
  openSseSession(req, res);
});

router.post("/mcp/messages", requireMcpExternalAuth, async (req, res) => {
  const sessionId = String(req.query.sessionId || "");
  const sseRes = sseSessions.get(sessionId);
  const io = req.app.locals.io;

  const response = await handleJsonRpcMessage(req.body, io);
  if (sseRes && response) {
    sseRes.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
    return res.status(202).json({ accepted: true });
  }

  if (!response) {
    return res.status(202).end();
  }
  return res.json(response);
});

// ─── Rotas Administrativas de Gestão e Teste (/api/admin/mcp/*) ─────────────

router.get("/admin/mcp/config", requireAdminAuth, async (_req, res) => {
  try {
    const settings = await getMcpSettings();
    const sandboxAtiva = (await getConfigValue("notif_sandbox_ativa")) === "1";
    const sandboxTelefone = (await getConfigValue("notif_sandbox_telefone")) || "";

    res.json({
      success: true,
      config: {
        mcpAtivo: settings.mcpAtivo,
        permitirReservas: settings.permitirReservas,
        permitirWhatsapp: settings.permitirWhatsapp,
        sandboxAtiva,
        sandboxTelefone,
        apiKey: settings.apiKey,
        hasGeminiKey: Boolean(settings.geminiApiKey),
        geminiKeyMasked: settings.geminiApiKey
          ? `${settings.geminiApiKey.slice(0, 6)}...${settings.geminiApiKey.slice(-4)}`
          : "",
        geminiModel: settings.geminiModel,
      },
      tools: MCP_TOOLS.map((t) => ({
        name: t.name,
        category: t.category,
        mode: t.mode,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
      recentLogs: mcpRecentLogs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/admin/mcp/config", requireAdminAuth, async (req, res) => {
  try {
    const { mcpAtivo, permitirReservas, permitirWhatsapp, geminiApiKey, geminiModel } = req.body || {};

    if (typeof mcpAtivo === "boolean") {
      await setConfigValue("mcp_ativo", mcpAtivo ? "1" : "0");
    }
    if (typeof permitirReservas === "boolean") {
      await setConfigValue("mcp_permitir_reservas", permitirReservas ? "1" : "0");
    }
    if (typeof permitirWhatsapp === "boolean") {
      await setConfigValue("mcp_permitir_whatsapp", permitirWhatsapp ? "1" : "0");
    }
    if (typeof geminiApiKey === "string") {
      const cleaned = geminiApiKey.trim();
      if (cleaned) {
        await setConfigValue("mcp_gemini_api_key", cleaned);
      }
    }
    if (typeof geminiModel === "string" && geminiModel.trim()) {
      await setConfigValue("mcp_gemini_model", geminiModel.trim());
    }

    const user = (req as any).user;
    writeAuditLog(user?.username || "admin", "admin", "UPDATE_MCP_CONFIG", getClientIp(req), "Configurações do Servidor MCP atualizadas");

    const updated = await getMcpSettings();
    res.json({
      success: true,
      message: "Configurações do Servidor MCP salvas com sucesso.",
      config: {
        mcpAtivo: updated.mcpAtivo,
        permitirReservas: updated.permitirReservas,
        permitirWhatsapp: updated.permitirWhatsapp,
        apiKey: updated.apiKey,
        hasGeminiKey: Boolean(updated.geminiApiKey),
        geminiKeyMasked: updated.geminiApiKey
          ? `${updated.geminiApiKey.slice(0, 6)}...${updated.geminiApiKey.slice(-4)}`
          : "",
        geminiModel: updated.geminiModel,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/admin/mcp/regenerate-key", requireAdminAuth, async (req, res) => {
  try {
    const newKey = `mcp_mex_${crypto.randomBytes(24).toString("hex")}`;
    await setConfigValue("mcp_api_key", newKey);

    const user = (req as any).user;
    writeAuditLog(user?.username || "admin", "admin", "REGENERATE_MCP_KEY", getClientIp(req), "Chave MCP_API_KEY regenerada");

    res.json({
      success: true,
      apiKey: newKey,
      message: "Nova chave MCP_API_KEY gerada com sucesso. Clientes antigos precisarão usar a nova chave.",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/admin/mcp/execute-tool", requireAdminAuth, async (req, res) => {
  try {
    const { toolName, args } = req.body || {};
    if (!toolName) {
      return res.status(400).json({ success: false, message: "Informe 'toolName'." });
    }

    const io = req.app.locals.io;
    const result = await executeMcpToolByName(toolName, args || {}, "admin-test", io);
    res.json({
      success: true,
      toolName,
      result,
      recentLogs: mcpRecentLogs,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Erro ao executar ferramenta MCP.",
      recentLogs: mcpRecentLogs,
    });
  }
});

// Chat Gemini Integrado ao MCP (Executa as 22 Tools em Tempo Real no Navegador)
router.post("/admin/mcp/chat", requireAdminAuth, async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: "Digite uma mensagem para enviar ao Gemini." });
    }

    const settings = await getMcpSettings();
    if (!settings.geminiApiKey) {
      return res.status(400).json({
        success: false,
        needsGeminiKey: true,
        message: "Configure sua GEMINI_API_KEY na aba 'Configurações & Segurança' desta página para usar o Chat Gemini integrado.",
      });
    }

    const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
    const io = req.app.locals.io;

    const functionDeclarations = MCP_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema as any,
    }));

    const hoje = getTodayBrasilia();
    const systemInstruction = `Você é o Assistente Inteligente Oficial da Marina El Mexicano / Vale Administradora, conectado diretamente ao banco de dados MariaDB e à Evolution API através do Servidor MCP (22 ferramentas).
Data atual (Brasília): ${hoje}.
Regras:
1. Sempre use as ferramentas MCP disponíveis para buscar dados reais antes de responder sobre clientes, embarcações, cotistas, saídas do dia, reservas, financeiro, inadimplência, manutenções (OS), UTV, combustível ou WhatsApp.
2. Nunca invente nomes, IDs ou valores. Se precisar do ID de uma embarcação ou cliente para criar/alterar/cancelar uma reserva ou enviar WhatsApp, consulte primeiro usando listar_embarcacoes, listar_clientes ou obter_visao_360.
3. Responda sempre em português claro, organizado em Markdown (tabelas ou listas quando útil).`;

    const contents: any[] = [];
    for (const h of Array.isArray(history) ? history.slice(-10) : []) {
      if (h && (h.role === "user" || h.role === "model") && h.text) {
        contents.push({
          role: h.role,
          parts: [{ text: String(h.text) }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: String(message) }],
    });

    const executedTools: Array<{ name: string; args: any; result: any }> = [];

    let response = await ai.models.generateContent({
      model: settings.geminiModel || "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations }],
      },
    });

    let turns = 0;
    while (response.functionCalls && response.functionCalls.length > 0 && turns < 6) {
      turns++;
      const modelParts = response.candidates?.[0]?.content?.parts || [];
      contents.push({ role: "model", parts: modelParts });

      const functionResponseParts: any[] = [];
      for (const call of response.functionCalls) {
        const toolName = call.name || "";
        const toolArgs = call.args || {};
        let toolResult: any;
        try {
          toolResult = await executeMcpToolByName(toolName, toolArgs, "admin-chat", io);
        } catch (toolErr: any) {
          toolResult = { erro: toolErr.message || String(toolErr) };
        }
        executedTools.push({ name: toolName, args: toolArgs, result: toolResult });
        functionResponseParts.push({
          functionResponse: {
            name: toolName,
            response: { result: toolResult },
          },
        });
      }

      contents.push({ role: "user", parts: functionResponseParts });

      response = await ai.models.generateContent({
        model: settings.geminiModel || "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations }],
        },
      });
    }

    const replyText = response.text || "Operação concluída.";
    res.json({
      success: true,
      reply: replyText,
      executedTools,
      recentLogs: mcpRecentLogs,
    });
  } catch (err: any) {
    console.error("[MCP-GEMINI-CHAT] Erro:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Falha ao processar mensagem no Gemini.",
    });
  }
});

export default router;
