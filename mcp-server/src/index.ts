import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config.js";
import { checkDbConnection } from "./db.js";

// Import schemas e handlers
import {
  ObterVisao360ClienteSchema,
  ObterVisao360EmbarcacaoSchema,
  handlerVisao360Cliente,
  handlerVisao360Embarcacao,
} from "./tools/visao360.tools.js";

import {
  ListarClientesSchema,
  ConsultarDetalhesClienteSchema,
  handlerListarClientes,
  handlerConsultarDetalhesCliente,
} from "./tools/clientes.tools.js";

import {
  ListarEmbarcacoesSchema,
  ConsultarCotistasEmbarcacaoSchema,
  handlerListarEmbarcacoes,
  handlerConsultarCotistasEmbarcacao,
} from "./tools/embarcacoes.tools.js";

import {
  ListarReservasSchema,
  ConsultarSaidasDoDiaSchema,
  handlerListarReservas,
  handlerConsultarSaidasDoDia,
} from "./tools/reservas.tools.js";

import {
  ConsultarResumoFinanceiroSchema,
  ListarTransacoesFinanceirasSchema,
  ConsultarInadimplentesSchema,
  handlerConsultarResumoFinanceiro,
  handlerListarTransacoesFinanceiras,
  handlerConsultarInadimplentes,
} from "./tools/financeiro.tools.js";

import {
  ListarManutencoesSchema,
  ConsultarDetalhesOsSchema,
  handlerListarManutencoes,
  handlerConsultarDetalhesOs,
} from "./tools/manutencao.tools.js";

import {
  ListarVeiculosUtvSchema,
  ListarUsosUtvSchema,
  handlerListarVeiculosUtv,
  handlerListarUsosUtv,
} from "./tools/utv.tools.js";

import {
  ConsultarEstoqueCombustivelSchema,
  ListarAbastecimentosSchema,
  handlerConsultarEstoqueCombustivel,
  handlerListarAbastecimentos,
} from "./tools/combustivel.tools.js";

/**
 * Criação da instância central do Servidor MCP
 */
function createMcpServerInstance() {
  const server = new McpServer({
    name: "mexicano-gestao-nautica",
    version: "1.0.0",
  });

  const formatResult = (data: any) => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  });

  // ── 1. SUPER-TOOLS VISÃO 360° ──────────────────────────────────────────
  server.tool(
    "obter_visao_360_cliente",
    "Retorna o dossiê completo de um cliente: dados cadastrais (filtrados), cotas e embarcações pertencentes, próximas reservas e situação financeira consolidada.",
    ObterVisao360ClienteSchema.shape,
    async (args) => formatResult(await handlerVisao360Cliente(args))
  );

  server.tool(
    "obter_visao_360_embarcacao",
    "Retorna a visão 360° de uma embarcação: ficha técnica, todos os cotistas cadastrados, próximas saídas agendadas, últimas ordens de serviço (OS) e abastecimentos recentes.",
    ObterVisao360EmbarcacaoSchema.shape,
    async (args) => formatResult(await handlerVisao360Embarcacao(args))
  );

  // ── 2. CLIENTES & COTAS ────────────────────────────────────────────────
  server.tool(
    "listar_clientes",
    "Lista clientes com suporte a paginação (máx 50) e filtros por empresa, status ativo/inativo, status financeiro e busca por nome.",
    ListarClientesSchema.shape,
    async (args) => formatResult(await handlerListarClientes(args))
  );

  server.tool(
    "consultar_detalhes_cliente",
    "Consulta informações cadastrais detalhadas de um cliente específico por ID ou Nome.",
    ConsultarDetalhesClienteSchema.shape,
    async (args) => formatResult(await handlerConsultarDetalhesCliente(args))
  );

  // ── 3. EMBARCAÇÕES ─────────────────────────────────────────────────────
  server.tool(
    "listar_embarcacoes",
    "Lista embarcações da frota com paginação e filtros por empresa, tipo, se está em manutenção ou busca por nome/vaga.",
    ListarEmbarcacoesSchema.shape,
    async (args) => formatResult(await handlerListarEmbarcacoes(args))
  );

  server.tool(
    "consultar_cotistas_embarcacao",
    "Lista detalhadamente todos os cotistas de uma embarcação com número da cota e situação cadastral.",
    ConsultarCotistasEmbarcacaoSchema.shape,
    async (args) => formatResult(await handlerConsultarCotistasEmbarcacao(args))
  );

  // ── 4. RESERVAS & MARINA ───────────────────────────────────────────────
  server.tool(
    "listar_reservas",
    "Lista reservas e agendamentos de uso das embarcações com filtros por período (datas), barco, cliente e status.",
    ListarReservasSchema.shape,
    async (args) => formatResult(await handlerListarReservas(args))
  );

  server.tool(
    "consultar_saidas_do_dia",
    "Consulta rápida de todas as saídas e chegadas de barcos agendadas para o dia especificado (ou hoje).",
    ConsultarSaidasDoDiaSchema.shape,
    async (args) => formatResult(await handlerConsultarSaidasDoDia(args))
  );

  // ── 5. FINANCEIRO ──────────────────────────────────────────────────────
  server.tool(
    "consultar_resumo_financeiro",
    "Retorna o balanço financeiro consolidado (receitas previstas vs recebidas, despesas pagas vs a pagar, inadimplência e saldo líquido) em um período.",
    ConsultarResumoFinanceiroSchema.shape,
    async (args) => formatResult(await handlerConsultarResumoFinanceiro(args))
  );

  server.tool(
    "listar_transacoes_financeiras",
    "Lista transações financeiras (receitas e despesas) com filtros por status, categoria, cliente, barco e período.",
    ListarTransacoesFinanceirasSchema.shape,
    async (args) => formatResult(await handlerListarTransacoesFinanceiras(args))
  );

  server.tool(
    "consultar_inadimplentes",
    "Gera um relatório ordenado dos clientes com mensalidades ou taxas de marina atrasadas, total devido e quantidade de títulos.",
    ConsultarInadimplentesSchema.shape,
    async (args) => formatResult(await handlerConsultarInadimplentes(args))
  );

  // ── 6. MANUTENÇÃO & OS ─────────────────────────────────────────────────
  server.tool(
    "listar_manutencoes",
    "Lista Ordens de Serviço (OS) de manutenção com filtros por embarcação, status, mecânico e urgência.",
    ListarManutencoesSchema.shape,
    async (args) => formatResult(await handlerListarManutencoes(args))
  );

  server.tool(
    "consultar_detalhes_os",
    "Retorna os detalhes completos de uma Ordem de Serviço pelo código legível (ex: OS-2026-001) ou ID.",
    ConsultarDetalhesOsSchema.shape,
    async (args) => formatResult(await handlerConsultarDetalhesOs(args))
  );

  // ── 7. UTV (VEÍCULOS OFF-ROAD) ─────────────────────────────────────────
  server.tool(
    "listar_veiculos_utv",
    "Lista a frota de veículos UTV (veículos de trilha), status atual, km e horímetro.",
    ListarVeiculosUtvSchema.shape,
    async (args) => formatResult(await handlerListarVeiculosUtv(args))
  );

  server.tool(
    "listar_usos_utv",
    "Lista o histórico ou reservas de uso dos UTVs por período, veículo ou cotista.",
    ListarUsosUtvSchema.shape,
    async (args) => formatResult(await handlerListarUsosUtv(args))
  );

  // ── 8. COMBUSTÍVEL ─────────────────────────────────────────────────────
  server.tool(
    "consultar_estoque_combustivel",
    "Retorna os níveis atuais de combustível no tanque principal da marina, galões e status de alerta mínimo.",
    ConsultarEstoqueCombustivelSchema.shape,
    async () => formatResult(await handlerConsultarEstoqueCombustivel())
  );

  server.tool(
    "listar_abastecimentos",
    "Lista os últimos abastecimentos realizados na marina por embarcação ou período.",
    ListarAbastecimentosSchema.shape,
    async (args) => formatResult(await handlerListarAbastecimentos(args))
  );

  return server;
}

/**
 * Ponto de entrada do serviço:
 * - Se iniciado com `--stdio`, opera via stdin/stdout (ex: Claude Desktop / CLI).
 * - Caso contrário, inicializa o servidor HTTP com transporte SSE protegido por API Key.
 */
async function main() {
  const isStdio = process.argv.includes("--stdio");

  if (isStdio) {
    const server = createMcpServerInstance();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 Servidor MCP Gestão Náutica iniciado via Stdio.");
  } else {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Healthcheck
    app.get("/health", async (_req, res) => {
      const dbStatus = await checkDbConnection();
      res.json({
        status: dbStatus.connected ? "healthy" : "degraded",
        service: "mexicano-mcp-server",
        db: dbStatus,
        uptime: process.uptime(),
      });
    });

    // Middleware de Autenticação para endpoints MCP
    app.use((req, res, next) => {
      if (!config.mcp.apiKey) {
        return next(); // Se não foi definida chave no .env, permite passagem (aviso emitido nos logs)
      }

      const authHeader = req.headers.authorization;
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : (req.query.apiKey as string);

      if (!bearerToken || bearerToken !== config.mcp.apiKey) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Cabeçalho Authorization: Bearer <MCP_API_KEY> inválido ou ausente.",
        });
      }

      next();
    });

    // Gerenciador de sessões SSE
    const transports = new Map<string, SSEServerTransport>();

    app.get("/sse", async (req, res) => {
      console.log(`[MCP-SSE] Nova conexão SSE solicitada por ${req.ip}`);
      const server = createMcpServerInstance();
      const transport = new SSEServerTransport("/messages", res);
      const sessionId = transport.sessionId;

      transports.set(sessionId, transport);

      req.on("close", () => {
        console.log(`[MCP-SSE] Conexão SSE encerrada (sessionId: ${sessionId})`);
        transports.delete(sessionId);
      });

      await server.connect(transport);
    });

    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports.get(sessionId);

      if (!transport) {
        return res.status(400).json({
          error: "Sessão SSE não encontrada ou expirada.",
          sessionId,
        });
      }

      await transport.handlePostMessage(req, res);
    });

    const port = config.mcp.port;
    app.listen(port, () => {
      console.log(`=======================================================`);
      console.log(`⚓ SERVIDOR MCP GESTÃO NÁUTICA (READ-ONLY) ONLINE`);
      console.log(`📡 Porta: ${port}`);
      console.log(`🔒 Modo de Segurança: Read-Only Ativo`);
      console.log(`🔑 Autenticação MCP_API_KEY: ${config.mcp.apiKey ? "Habilitada" : "Desabilitada (Inseguro para Produção)"}`);
      console.log(`🔗 Endpoint SSE: http://0.0.0.0:${port}/sse`);
      console.log(`❤️  Healthcheck:  http://0.0.0.0:${port}/health`);
      console.log(`=======================================================`);
    });
  }
}

main().catch((err) => {
  console.error("Falha fatal ao iniciar o Servidor MCP:", err);
  process.exit(1);
});
