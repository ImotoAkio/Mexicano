import { Router } from "express";
import { requireAdminAuth, sensitiveLimiter } from "./middlewares";
import { getConfigValue, setConfigValue, getNotificacoesLogs } from "../server-db";
import {
  processReservasConfirmationCycle,
  getConfirmationTemplates,
  DEFAULT_10_CONFIRMATION_TEMPLATES,
  generateClientMagicLink,
  formatConfirmationMessage
} from "../server-notifications-scheduler";
import { sendEvolutionText } from "./whatsapp.routes";

const router = Router();

// ----------------------------------------------------
// 1. Obter configurações das automações de notificação
// ----------------------------------------------------
router.get("/notifications/config", requireAdminAuth, async (req, res) => {
  try {
    const notif_modo_operacao = (await getConfigValue("notif_modo_operacao")) || "automatico";
    const notif_reservas_ativa = (await getConfigValue("notif_reservas_ativa")) !== "0";
    const horariosRaw = await getConfigValue("notif_reservas_horarios");
    let notif_reservas_horarios = ["08:00", "09:00"];
    if (horariosRaw) {
      try {
        const parsed = JSON.parse(horariosRaw);
        if (Array.isArray(parsed) && parsed.length > 0) notif_reservas_horarios = parsed;
      } catch (e) {}
    }

    const notif_financeiro_ativa = (await getConfigValue("notif_financeiro_ativa")) !== "0";
    const notif_financeiro_template = await getConfigValue("notif_financeiro_template") ||
      "Olá, *{cliente}*! 😊\n\nIdentificamos um novo lançamento no seu cadastro:\n\n📋 *Descrição:* {descricao}\n💰 *Valor:* R$ {valor}\n📅 *Vencimento:* {vencimento}{link_info}\n\nFicamos à disposição para qualquer dúvida! 👍";

    const whatsapp_conf_templates_10 = await getConfirmationTemplates();

    res.json({
      success: true,
      config: {
        notif_modo_operacao,
        notif_reservas_ativa,
        notif_reservas_horarios,
        notif_financeiro_ativa,
        notif_financeiro_template,
        whatsapp_conf_templates_10
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Erro ao carregar configurações de notificação." });
  }
});

// ----------------------------------------------------
// 2. Salvar configurações das automações de notificação
// ----------------------------------------------------
router.post("/notifications/config", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const {
      notif_modo_operacao,
      notif_reservas_ativa,
      notif_reservas_horarios,
      notif_financeiro_ativa,
      notif_financeiro_template,
      whatsapp_conf_templates_10
    } = req.body;

    if (notif_modo_operacao !== undefined) {
      const safeModo = notif_modo_operacao === "manual" ? "manual" : "automatico";
      await setConfigValue("notif_modo_operacao", safeModo);
    }

    if (notif_reservas_ativa !== undefined) {
      await setConfigValue("notif_reservas_ativa", notif_reservas_ativa ? "1" : "0");
    }

    if (notif_reservas_horarios !== undefined && Array.isArray(notif_reservas_horarios)) {
      // Sanitiza horários formato HH:mm
      const cleaned = notif_reservas_horarios
        .map(h => String(h).trim())
        .filter(h => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(h));
      await setConfigValue("notif_reservas_horarios", JSON.stringify(cleaned));
    }

    if (notif_financeiro_ativa !== undefined) {
      await setConfigValue("notif_financeiro_ativa", notif_financeiro_ativa ? "1" : "0");
    }

    if (notif_financeiro_template !== undefined) {
      await setConfigValue("notif_financeiro_template", String(notif_financeiro_template));
    }

    if (whatsapp_conf_templates_10 !== undefined && Array.isArray(whatsapp_conf_templates_10)) {
      await setConfigValue("whatsapp_conf_templates_10", JSON.stringify(whatsapp_conf_templates_10));
    }

    res.json({ success: true, message: "Configurações de notificação salvas com sucesso!" });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar configurações de notificação." });
  }
});

// ----------------------------------------------------
// 2b. Restaurar 10 modelos de templates padrões
// ----------------------------------------------------
router.post("/notifications/reset-templates", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    await setConfigValue("whatsapp_conf_templates_10", JSON.stringify(DEFAULT_10_CONFIRMATION_TEMPLATES));
    res.json({ success: true, templates: DEFAULT_10_CONFIRMATION_TEMPLATES });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Erro ao restaurar modelos padrões." });
  }
});

// ----------------------------------------------------
// 3. Obter logs / histórico de envios automáticos
// ----------------------------------------------------
router.get("/notifications/logs", requireAdminAuth, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = await getNotificacoesLogs(limit);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar logs de notificação." });
  }
});

// ----------------------------------------------------
// 4. Obter reservas pendentes de confirmação de hoje
// ----------------------------------------------------
router.get("/notifications/reservas-pendentes", requireAdminAuth, async (req, res) => {
  try {
    const currentPool = (await import("../server-db")).getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "Banco offline" });

    const targetDate = (req.query.date as string) || new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const [rows] = await currentPool.query(
      `SELECT r.id, r.data, r.periodo, r.status, r.statusMarina, r.confirmacaoEnviada,
              r.tentativasConfirmacao, r.ultimaTentativaConfirmacao,
              c.id as clienteId, c.nome as clienteNome, c.telefone as clienteTelefone,
              e.id as embarcacaoId, e.nome as embarcacaoNome, e.numero as embarcacaoNumero,
              e.tipo as embarcacaoTipo, e.modelo as embarcacaoModelo, e.fabricante as embarcacaoFabricante
       FROM Reservas r
       LEFT JOIN Clientes c ON r.clienteId = c.id
       LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
       WHERE r.data = ? 
         AND r.status != 'cancelado' 
         AND r.status != 'confirmado'
       ORDER BY r.createdAt ASC`,
      [targetDate]
    );

    res.json({ success: true, date: targetDate, reservas: rows });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Erro ao listar reservas pendentes." });
  }
});

// ----------------------------------------------------
// 5. Testar ou disparar manualmente o ciclo de confirmação
// ----------------------------------------------------
router.post("/notifications/test-reserva-cycle", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const targetDate = req.body?.targetDate;
    const selectedReservaIds = req.body?.selectedReservaIds;
    const result = await processReservasConfirmationCycle({ isManual: true, targetDate, selectedReservaIds });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Erro ao executar ciclo de confirmação." });
  }
});

// ----------------------------------------------------
// 5. Enviar mensagem de teste para um telefone com Magic Link real
// ----------------------------------------------------
router.post("/notifications/test-send-whatsapp", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const { number, templateIndex, text, reservaId, origin } = req.body;
    if (!number) {
      return res.status(400).json({ error: true, message: "Informe número de telefone para o envio de teste." });
    }

    const currentPool = (await import("../server-db")).getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "Banco de dados offline." });

    // 1. Obter cotista para o teste (Prioridade configurada: Vitor Akio - CPF: 07833944467)
    let targetReserva: any = null;
    if (reservaId) {
      const [rows] = await currentPool.query(
        `SELECT r.id, r.data, r.periodo, r.embarcacaoId, r.clienteId, 
                c.nome as clienteNome, c.telefone as clienteTelefone,
                e.nome as embarcacaoNome, e.numero as embarcacaoNumero,
                e.tipo as embarcacaoTipo, e.modelo as embarcacaoModelo, e.fabricante as embarcacaoFabricante
         FROM Reservas r
         JOIN Clientes c ON r.clienteId = c.id
         LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
         WHERE r.id = ? LIMIT 1`,
        [reservaId]
      );
      targetReserva = (rows as any[])[0];
    }

    // 1a. Prioridade oficial para testes: Cotista Vitor Akio (CPF: 07833944467)
    if (!targetReserva) {
      const [vitorRows] = await currentPool.query(
        `SELECT r.id, r.data, r.periodo, r.embarcacaoId, r.clienteId, 
                c.nome as clienteNome, c.telefone as clienteTelefone,
                e.nome as embarcacaoNome, e.numero as embarcacaoNumero,
                e.tipo as embarcacaoTipo, e.modelo as embarcacaoModelo, e.fabricante as embarcacaoFabricante
         FROM Clientes c
         JOIN Reservas r ON r.clienteId = c.id
         LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
         WHERE (c.cpf LIKE '%07833944467%' OR c.cpf LIKE '%078.339.444-67%' OR c.id = 'cli_1780767128264')
           AND r.status != 'cancelado'
         ORDER BY r.data DESC LIMIT 1`
      );
      if ((vitorRows as any[]).length > 0) {
        targetReserva = (vitorRows as any[])[0];
      } else {
        // Se Vitor Akio não tiver reserva pendente futura, utiliza seu cadastro direto com sua embarcação EL MEXICANO 99
        const [vitorClientRows] = await currentPool.query(
          `SELECT c.id as clienteId, c.nome as clienteNome, c.telefone as clienteTelefone,
                  e.id as embarcacaoId, e.nome as embarcacaoNome, e.numero as embarcacaoNumero,
              e.tipo as embarcacaoTipo, e.modelo as embarcacaoModelo, e.fabricante as embarcacaoFabricante
           FROM Clientes c
           LEFT JOIN Embarcacoes e ON e.id = 'boat_1780767211388'
           WHERE c.cpf LIKE '%07833944467%' OR c.cpf LIKE '%078.339.444-67%' OR c.id = 'cli_1780767128264'
           LIMIT 1`
        );
        const vClient = (vitorClientRows as any[])[0];
        if (vClient) {
          targetReserva = {
            id: "res_teste_vitor",
            data: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
            periodo: "dia_inteiro",
            clienteId: vClient.clienteId,
            clienteNome: vClient.clienteNome,
            clienteTelefone: vClient.clienteTelefone,
            embarcacaoId: vClient.embarcacaoId || "boat_1780767211388",
            embarcacaoNome: vClient.embarcacaoNome || "EL MEXICANO 99",
            embarcacaoNumero: vClient.embarcacaoNumero || "99"
          };
        }
      }
    }

    // 1b. Fallback caso Vitor Akio não esteja no banco
    if (!targetReserva) {
      const [rows] = await currentPool.query(
        `SELECT r.id, r.data, r.periodo, r.embarcacaoId, r.clienteId, 
                c.nome as clienteNome, c.telefone as clienteTelefone,
                e.nome as embarcacaoNome, e.numero as embarcacaoNumero,
                e.tipo as embarcacaoTipo, e.modelo as embarcacaoModelo, e.fabricante as embarcacaoFabricante
         FROM Reservas r
         JOIN Clientes c ON r.clienteId = c.id
         LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
         WHERE c.status = 'ativo' AND r.status != 'cancelado'
         ORDER BY r.data DESC LIMIT 1`
      );
      targetReserva = (rows as any[])[0];
    }

    // Se ainda não encontrou nenhuma reserva, busca um cliente ativo qualquer
    if (!targetReserva) {
      const [cRows] = await currentPool.query(
        `SELECT id, nome, telefone FROM Clientes WHERE status = 'ativo' LIMIT 1`
      );
      const cliente = (cRows as any[])[0];
      if (!cliente) {
        return res.status(400).json({ error: true, message: "Nenhum cliente ativo encontrado no banco para gerar teste." });
      }
      targetReserva = {
        id: "demo_reserva",
        data: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        embarcacaoNome: "Lancha de Demonstração",
        embarcacaoNumero: "M01"
      };
    }

    // 2. Determinar o origin para o link
    const requestOrigin = origin || req.headers.origin || (req.headers.referer ? new URL(req.headers.referer as string).origin : null);

    // 3. Gerar o Magic Link REAL e autenticado
    const magicLink = await generateClientMagicLink(
      targetReserva.clienteId,
      targetReserva.clienteNome,
      targetReserva.id,
      requestOrigin
    );

    // 4. Selecionar o template (texto personalizado ou template index)
    let templateText = text;
    if (!templateText) {
      const templates = await getConfirmationTemplates();
      const idx = typeof templateIndex === 'number' && templateIndex >= 0 && templateIndex < templates.length
        ? templateIndex
        : 0;
      templateText = templates[idx];
    }

    // 5. Substituir tags dinâmicas (case-insensitive com suporte a espaços)
    const clientePrimeiroNome = targetReserva.clienteNome ? targetReserva.clienteNome.trim().split(/\s+/)[0] : "Cliente";
    const nomeBarco = targetReserva.embarcacaoNome 
      ? (targetReserva.embarcacaoNome.includes(targetReserva.embarcacaoNumero) || targetReserva.embarcacaoNome.toLowerCase().includes('mexicano')
          ? targetReserva.embarcacaoNome 
          : (targetReserva.embarcacaoNumero ? `M${targetReserva.embarcacaoNumero} (${targetReserva.embarcacaoNome})` : targetReserva.embarcacaoNome))
      : "sua embarcação";

    const finalMessage = formatConfirmationMessage(templateText, {
      clienteNome: targetReserva.clienteNome,
      boatCode: nomeBarco,
      quando: "hoje",
      dataIso: targetReserva.data,
      magicLink,
      boatInfo: {
        tipo: targetReserva.embarcacaoTipo,
        nome: targetReserva.embarcacaoNome,
        modelo: targetReserva.embarcacaoModelo,
        fabricante: targetReserva.embarcacaoFabricante
      }
    });







    console.log(`[Robô Teste WhatsApp] Destino: ${number} | Mensagem:\n${finalMessage}`);

    // 6. Enviar via Evolution API
    const result = await sendEvolutionText(number, finalMessage);
    if (!result.success) {
      return res.status(400).json({ error: true, message: result.message || "Falha ao enviar mensagem de teste no WhatsApp." });
    }

    res.json({
      success: true,
      message: "Mensagem de teste enviada com sucesso!",
      magicLink,
      cliente: clientePrimeiroNome,
      barco: nomeBarco
    });
  } catch (err: any) {
    console.error("Erro interno ao enviar teste de WhatsApp:", err);
    res.status(500).json({ error: true, message: err.message || "Erro interno ao processar teste." });
  }
});

// ----------------------------------------------------
// 6. Resolver Short Magic Link (/api/m/:code)
// ----------------------------------------------------
router.get("/m/:code", async (req, res) => {
  try {
    const code = req.params.code;
    if (!code) return res.status(400).json({ error: true, message: "Código ausente." });

    const currentPool = (await import("../server-db")).getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "Banco de dados offline." });

    const nowIso = new Date().toISOString();
    const [rows] = await currentPool.query(
      "SELECT * FROM MagicLinks WHERE code = ? AND expiresAt > ? LIMIT 1",
      [code, nowIso]
    );
    const linkRecord = (rows as any[])[0];

    if (!linkRecord) {
      return res.status(404).json({ error: true, message: "Link expirado ou inválido." });
    }

    // Registra métrica de acesso
    await currentPool.query(
      "UPDATE MagicLinks SET accessCount = accessCount + 1, lastAccessedAt = ? WHERE id = ?",
      [nowIso, linkRecord.id]
    ).catch(() => {});

    res.json({
      success: true,
      token: linkRecord.token,
      reservaId: linkRecord.reservaId,
      clienteId: linkRecord.clienteId
    });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Erro ao resolver short link." });
  }
});

export default router;
