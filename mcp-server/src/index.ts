import express from "express";
import cors from "cors";
import crypto from "crypto";
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
  CriarReservaSchema,
  AtualizarReservaSchema,
  CancelarReservaSchema,
  handlerListarReservas,
  handlerConsultarSaidasDoDia,
  handlerCriarReserva,
  handlerAtualizarReserva,
  handlerCancelarReserva,
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

import {
  VerificarStatusWhatsappSchema,
  EnviarMensagemWhatsappSchema,
  handlerVerificarStatusWhatsapp,
  handlerEnviarMensagemWhatsapp,
} from "./tools/whatsapp.tools.js";

/**
 * Criação da instância central do Servidor MCP
 */
function createMcpServerInstance() {
  const server = new McpServer({
    name: "mexicano-gestao-nautica",
    version: "1.1.0",
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

  // ── 4. RESERVAS & MARINA (CONSULTAS E AÇÕES) ───────────────────────────
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

  server.tool(
    "criar_reserva",
    "Cria uma nova reserva ou agendamento de saída (cota, marina ou visitante avulso), validando disponibilidade da embarcação, manutenção e datas de fechamento.",
    CriarReservaSchema.shape,
    async (args) => formatResult(await handlerCriarReserva(args))
  );

  server.tool(
    "atualizar_reserva",
    "Atualiza dados de uma reserva existente (data, período, status, horários previstos, destino, pessoas a bordo, marinheiro ou observações).",
    AtualizarReservaSchema.shape,
    async (args) => formatResult(await handlerAtualizarReserva(args))
  );

  server.tool(
    "cancelar_reserva",
    "Cancela uma reserva ou agendamento ativo pelo ID, registrando opcionalmente o motivo do cancelamento.",
    CancelarReservaSchema.shape,
    async (args) => formatResult(await handlerCancelarReserva(args))
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

  // ── 9. WHATSAPP (EVOLUTION API) ────────────────────────────────────────
  server.tool(
    "verificar_status_whatsapp",
    "Verifica o estado da conexão da instância do WhatsApp na Evolution API e informa se a trava de segurança Sandbox está ativa.",
    VerificarStatusWhatsappSchema.shape,
    async (args) => formatResult(await handlerVerificarStatusWhatsapp(args))
  );

  server.tool(
    "enviar_mensagem_whatsapp",
    "Envia uma mensagem de texto pelo WhatsApp para um cliente (via clienteId ou telefone), respeitando a trava física de Sandbox do sistema.",
    EnviarMensagemWhatsappSchema.shape,
    async (args) => formatResult(await handlerEnviarMensagemWhatsapp(args))
  );

  return server;
}

/**
 * Ponto de entrada do serviço:
 * - Se iniciado com `--stdio`, opera via stdin/stdout (ex: Antigravity / Claude Desktop / CLI).
 * - Caso contrário, inicializa o servidor HTTP com transporte SSE protegido por API Key.
 */
async function main() {
  const isStdio = process.argv.includes("--stdio");

  if (isStdio) {
    const server = createMcpServerInstance();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 Servidor MCP Gestão Náutica v1.1.0 iniciado via Stdio (Consultas + Reservas + WhatsApp).");
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
        version: "1.1.0",
        db: dbStatus,
        uptime: process.uptime(),
      });
    });

    // Middleware de Autenticação Fail-Closed para endpoints MCP HTTP/SSE
    app.use((req, res, next) => {
      if (!config.mcp.apiKey || config.mcp.apiKey === "defina_uma_chave_secreta_aqui_para_autenticacao_mcp") {
        return res.status(503).json({
          error: "Service Unavailable",
          message: "Servidor MCP HTTP bloqueado por segurança: defina uma MCP_API_KEY válida no arquivo .env.",
        });
      }

      const authHeader = req.headers.authorization;
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : (req.query.apiKey as string)?.trim();

      if (!bearerToken) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Cabeçalho Authorization: Bearer <MCP_API_KEY> ausente.",
        });
      }

      const expectedBuf = Buffer.from(config.mcp.apiKey, "utf-8");
      const receivedBuf = Buffer.from(bearerToken, "utf-8");
      if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "MCP_API_KEY inválida.",
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
    const host = config.mcp.host;
    app.listen(port, host, () => {
      console.log(`=======================================================`);
      console.log(`⚓ SERVIDOR MCP GESTÃO NÁUTICA v1.1.0 ONLINE`);
      console.log(`📡 Endereço: ${host}:${port}`);
      console.log(`🧰 Tools: 17 Consultas + 3 Reservas + 2 WhatsApp (22 total)`);
      console.log(`🔑 Autenticação MCP_API_KEY: ${config.mcp.apiKey ? "Obrigatória (Fail-Closed Ativo)" : "BLOQUEADO (Defina MCP_API_KEY no .env)"}`);
      console.log(`🔗 Endpoint SSE: http://${host}:${port}/sse`);
      console.log(`❤️  Healthcheck:  http://${host}:${port}/health`);
      console.log(`=======================================================`);
    });
  }
}

main().catch((err) => {
  console.error("Falha fatal ao iniciar o Servidor MCP:", err);
  process.exit(1);
});
