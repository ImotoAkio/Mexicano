import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getDbPool, getConfigValue, logNotificacao, hasNotificacaoLog } from "./server-db";
import { sendEvolutionText } from "./server-routes/whatsapp.routes";

/**
 * 10 Modelos Padrões de Mensagens de Confirmação Progressivas
 * Cada envio sucessivo utiliza uma abordagem diferente, evitando repetição robótica e spam.
 */
export const DEFAULT_10_CONFIRMATION_TEMPLATES: string[] = [
  // 1º Envio: Boas-vindas matinal e acolhimento
  "Bom dia, *{cliente}*! ☀️ Tudo bem?\n\nSua embarcação *{barco}* está agendada para *{quando}*! 🚤\n\nNossa equipe de marinharia já está preparando tudo. Para adiantarmos a descida da embarcação e seu plano de navegação, por favor confirme sua saída pelo link direto no app:\n\n👉 {link}\n\nTenha um excelente passeio!",

  // 2º Envio: Lembrete amigável e foco em agilidade
  "Olá, *{cliente}*! Passando para checar os detalhes do seu passeio de *{quando}* com a *{barco}*. ⚓\n\nVocê consegue nos confirmar rapidinho? Leva menos de 1 minuto pelo seu link de acesso rápido:\n\n👉 {link}\n\nAssim garantimos sua embarcação pronta e revisada para a sua chegada!",

  // 3º Envio: Logística da marina e prioridade na fila de descida
  "Oi, *{cliente}*! 🚤 A equipe do pátio está organizando a fila de descida das embarcações desta manhã. Para mantermos a prioridade da sua lancha *{barco}*, confirme seus horários de saída pelo link:\n\n👉 {link}\n\nEstamos aguardando sua resposta para colocar seu barco na água a tempo!",

  // 4º Envio: Segurança e normas da Capitania dos Portos
  "Olá, *{cliente}*! ⚠️ Lembrando que a Capitania dos Portos exige o Plano de Navegação prévio (destino e quantidade de passageiros a bordo). Agilize sua liberação no píer confirmando os dados pelo app:\n\n👉 {link}\n\nSua segurança e conforto são nossas prioridades!",

  // 5º Envio: Apoio ao marinheiro e pontualidade
  "Oi, *{cliente}*! Tudo certo para navegar *{quando}* com a *{barco}*? 🌊\n\nPara que nossa equipe organize os marinheiros de apoio e você não pegue fila no píer, confirme sua saída agora pelo link:\n\n👉 {link}\n\nQualquer dúvida, estamos à disposição aqui no WhatsApp!",

  // 6º Envio: Alinhamento operacional de uso
  "Olá, *{cliente}*! Ainda não identificamos sua confirmação para o agendamento de *{quando}* na embarcação *{barco}*.\n\nCaso vá utilizar a embarcação hoje, por favor valide sua presença pelo link abaixo:\n\n👉 {link}\n\nAssim mantemos os marinheiros escalados para recebê-lo!",

  // 7º Envio: Movimentação intensa no píer
  "Oi, *{cliente}*! ⚓ Como as movimentações no píer e no trator de descida estão intensas, precisamos da sua confirmação para mantermos a *{barco}* escalada. Acesse o link rápido para confirmar:\n\n👉 {link}\n\nAgradecemos a sua cooperação!",

  // 8º Envio: Urgência moderada
  "Olá, *{cliente}*! 😊 Queremos garantir que sua navegação ocorra sem qualquer atraso ou fila de espera! Caso ainda vá sair hoje com a *{barco}*, clique aqui para confirmar agora:\n\n👉 {link}\n\nNossa equipe aguarda sua resposta!",

  // 9º Envio: Penúltimo aviso de liberação de vaga
  "Oi, *{cliente}*! ⚠️ Nossa marinharia precisa confirmar se a embarcação *{barco}* vai para a água hoje. Caso o passeio esteja mantido, confirme pelo link:\n\n👉 {link}\n\nSe tiver ocorrido algum imprevisto e não for utilizar, nos avise por favor para liberarmos o espaço.",

  // 10º Envio: Última chamada antes do cancelamento operacional
  "Olá, *{cliente}*! Última verificação da marina: sua reserva da *{barco}* para *{quando}* continua pendente de confirmação. Para evitarmos o cancelamento do agendamento por ausência de check-in, confirme no link abaixo:\n\n👉 {link}\n\nContamos com sua compreensão!"
];

/**
 * Retorna os 10 modelos configurados no banco ou a lista padrão
 */
export async function getConfirmationTemplates(): Promise<string[]> {
  try {
    const raw = await getConfigValue("whatsapp_conf_templates_10");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 10) {
        return parsed.map((t, idx) => String(t || DEFAULT_10_CONFIRMATION_TEMPLATES[idx]));
      }
    }
  } catch (e) {}
  return [...DEFAULT_10_CONFIRMATION_TEMPLATES];
}

/**
 * Retorna data (YYYY-MM-DD) e hora (HH:mm) no fuso oficial de Brasília
 */
export function getBrasiliaDateTime(): { dateStr: string; timeStr: string } {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  const timeStr = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);

  return { dateStr, timeStr };
}

// Guarda o último slot executado para evitar disparos múltiplos no mesmo minuto (ex: "2026-10-31_08:00")
let lastSlotExecuted: string | null = null;
let isProcessingReservas = false;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatFirstName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
}

function formatCurrency(val: any): string {
  const num = Number(val) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateBr(dateIso?: string): string {
  if (!dateIso) return '';
  const parts = dateIso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateIso;
}

/**
 * Gera um Magic Link com JWT seguro para que o cliente acesse o app em 1 toque
 * já logado e com a reserva aberta no modal de check-in / confirmação.
 */
export async function generateClientMagicLink(clienteId: string, clienteNome: string, reservaId: string, customAppUrl?: string): Promise<string> {
  const pool = getDbPool();
  let tokenVersion = 1;

  if (pool) {
    try {
      const [authRows] = await pool.query(
        "SELECT tokenVersion FROM ClienteAuth WHERE clienteId = ?",
        [clienteId]
      );
      const authRecord = (authRows as any[])[0];
      if (authRecord && authRecord.tokenVersion !== undefined) {
        tokenVersion = authRecord.tokenVersion;
      } else {
        // Assegura registro inicial para o cliente
        await pool.query(
          "INSERT INTO ClienteAuth (clienteId, passwordHash, tokenVersion) VALUES (?, '', 1) ON DUPLICATE KEY UPDATE tokenVersion = tokenVersion",
          [clienteId]
        );
      }
    } catch (e) {
      console.warn("[MagicLink] Aviso ao obter tokenVersion:", e);
    }
  }

  const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
  const token = jwt.sign(
    {
      id: clienteId,
      nome: clienteNome,
      role: "client",
      tv: tokenVersion,
      reservaId
    },
    jwtSecret,
    { expiresIn: "7d" }
  );

  let rawAppUrl = customAppUrl;
  if (!rawAppUrl) {
    try {
      rawAppUrl = await getConfigValue("app_url");
    } catch {}
  }
  if (!rawAppUrl) {
    rawAppUrl = process.env.APP_URL || "https://echo.dev.br";
  }
  const appUrl = rawAppUrl.replace(/\/$/, "");

  // Gera código curto exclusivo de 8 caracteres alfanuméricos
  const code = crypto.randomBytes(4).toString("hex");
  const linkId = `ml_${Date.now()}_${code}`;
  const nowIso = new Date().toISOString();
  const expiresIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO MagicLinks (id, code, clienteId, reservaId, token, expiresAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [linkId, code, clienteId, reservaId, token, expiresIso, nowIso]
      );
      return `${appUrl}/m/${code}`;
    } catch (dbErr) {
      console.warn("[MagicLink] Fallback para link completo:", dbErr);
    }
  }

  return `${appUrl}/portal?token=${token}&reserva=${reservaId}`;
}

/**
 * Ciclo de verificação e envio de confirmações de reservas
 */
export async function processReservasConfirmationCycle(options?: {
  isManual?: boolean;
  targetDate?: string;
  selectedReservaIds?: string[];
}): Promise<{
  success: boolean;
  disparos: number;
  pendentes: number;
  detalhes: any[];
  slot?: string;
}> {
  if (isProcessingReservas) {
    return { success: false, disparos: 0, pendentes: 0, detalhes: [], slot: "Em processamento" };
  }

  isProcessingReservas = true;
  const pool = getDbPool();
  if (!pool) {
    isProcessingReservas = false;
    return { success: false, disparos: 0, pendentes: 0, detalhes: [{ erro: "Banco indisponível" }] };
  }

  try {
    const { dateStr, timeStr } = getBrasiliaDateTime();
    const effectiveDate = options?.targetDate || dateStr;

    // 0. TRAVA MESTRA DE SEGURANÇA: Modo Automático vs Manual
    const modoOperacao = (await getConfigValue("notif_modo_operacao")) || "automatico";
    if (modoOperacao === "manual" && !options?.isManual) {
      return {
        success: true,
        disparos: 0,
        pendentes: 0,
        detalhes: [{ info: "Modo Manual Ativo: envios automáticos congelados por segurança." }]
      };
    }

    // 1. Verifica se a automação está habilitada
    const ativaRaw = await getConfigValue("notif_reservas_ativa");
    const isAtiva = ativaRaw === null || ativaRaw === undefined || ativaRaw === "1" || ativaRaw === "true";
    if (!isAtiva && !options?.isManual) {
      return { success: true, disparos: 0, pendentes: 0, detalhes: [{ info: "Automação de reservas desativada pelo administrador." }] };
    }

    // 2. Horários configurados (padrão: 08:00 e 09:00)
    const horariosJson = await getConfigValue("notif_reservas_horarios");
    let horarios: string[] = ["08:00", "09:00"];
    if (horariosJson) {
      try {
        const parsed = JSON.parse(horariosJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          horarios = parsed.map(h => String(h).trim());
        }
      } catch (e) {}
    }

    const currentSlot = options?.isManual ? `manual_${timeStr}` : timeStr;

    // Se for execução automática, o horário atual precisa bater com um dos horários configurados
    if (!options?.isManual) {
      if (!horarios.includes(timeStr)) {
        return { success: true, disparos: 0, pendentes: 0, detalhes: [] };
      }
      const slotKey = `${effectiveDate}_${timeStr}`;
      if (lastSlotExecuted === slotKey) {
        return { success: true, disparos: 0, pendentes: 0, detalhes: [] };
      }
      lastSlotExecuted = slotKey;
    }

    console.log(`[Robô Notificações] Iniciando ciclo de confirmação para ${effectiveDate} às ${currentSlot}...`);

    // 3. Busca reservas do dia cuja confirmação ainda NÃO foi realizada
    const [reservasRows] = await pool.query(
      `SELECT r.*, c.nome as clienteNome, c.telefone as clienteTelefone, c.statusFinanceiro as clienteStatusFin,
              e.nome as embarcacaoNome, e.numero as embarcacaoNumero
       FROM Reservas r
       LEFT JOIN Clientes c ON r.clienteId = c.id
       LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
       WHERE r.data = ? 
         AND r.status != 'cancelado' 
         AND r.status != 'confirmado'`,
      [effectiveDate]
    );

    let pendentes = reservasRows as any[];
    if (options?.selectedReservaIds && Array.isArray(options.selectedReservaIds) && options.selectedReservaIds.length > 0) {
      pendentes = pendentes.filter(r => options.selectedReservaIds!.includes(r.id));
    }

    if (pendentes.length === 0) {
      console.log(`[Robô Notificações] Nenhuma reserva pendente de confirmação encontrada para ${effectiveDate}.`);
      return { success: true, disparos: 0, pendentes: 0, detalhes: [], slot: currentSlot };
    }

    // 4. Carrega os 10 modelos de mensagens configurados
    const templates10 = await getConfirmationTemplates();

    const detalhes: any[] = [];
    let disparos = 0;

    for (const res of pendentes) {
      const telefone = res.clienteTelefone || res.telefoneAvulso;
      const clienteNome = res.clienteNome || res.nomeAvulso || "Cliente";

      if (!telefone) {
        detalhes.push({ reservaId: res.id, cliente: clienteNome, status: "sem_telefone" });
        continue;
      }

      // Evita duplicar no mesmo slot de horário hoje
      const jaEnviadoNoSlot = await hasNotificacaoLog("reserva_confirmacao", res.id, currentSlot, effectiveDate);
      if (jaEnviadoNoSlot && !options?.isManual) {
        detalhes.push({ reservaId: res.id, cliente: clienteNome, status: "ja_enviado_no_slot" });
        continue;
      }

      const boatCode = res.embarcacaoNumero ? `M${res.embarcacaoNumero}` : (res.embarcacaoNome || "Embarcação");
      const clientFirstName = formatFirstName(clienteNome);
      const quando = "hoje";

      // 5. Gera Magic Link exclusivo do cliente para entrar direto no app e abrir o check-in
      const magicLink = await generateClientMagicLink(res.clienteId, clienteNome, res.id);

      // 6. Seleciona o modelo de acordo com o número da tentativa (1 a 10)
      const tentativaAtual = Number(res.tentativasConfirmacao || 0) + 1;
      const templateIndex = Math.min(Math.max(tentativaAtual - 1, 0), templates10.length - 1);
      const chosenTemplate = templates10[templateIndex] || templates10[0];

      const messageText = chosenTemplate
        .replace(/\{\s*cliente\s*\}/gi, clientFirstName)
        .replace(/\{\s*barco\s*\}/gi, boatCode)
        .replace(/\{\s*quando\s*\}/gi, quando)
        .replace(/\{\s*data\s*\}/gi, formatDateBr(effectiveDate))
        .replace(/\{\s*link\s*\}/gi, magicLink);

      try {
        const sendResult = await sendEvolutionText(telefone, messageText);
        if (!sendResult.success) {
          throw new Error(sendResult.message || "Falha no envio da mensagem de confirmação");
        }

        // Registra log com sucesso
        await logNotificacao({
          tipo: "reserva_confirmacao",
          referenciaId: res.id,
          clienteId: res.clienteId,
          clienteNome: clienteNome,
          telefone: telefone,
          horarioSlot: currentSlot,
          mensagem: messageText,
          status: "sucesso"
        });

        // Atualiza a reserva no banco com o incremento da tentativa
        const nowIso = new Date().toISOString();
        await pool.query(
          `UPDATE Reservas 
           SET confirmacaoEnviada = 1, 
               tentativasConfirmacao = COALESCE(tentativasConfirmacao, 0) + 1,
               ultimaTentativaConfirmacao = ?
           WHERE id = ?`,
          [nowIso, res.id]
        );

        disparos++;
        detalhes.push({
          reservaId: res.id,
          cliente: clienteNome,
          telefone,
          tentativa: tentativaAtual,
          modeloUsado: templateIndex + 1,
          status: "sucesso"
        });

        console.log(`[Robô Notificações] Confirmação (Modelo ${templateIndex + 1}) enviada com sucesso para ${clienteNome} (${telefone}).`);

        // Intervalo entre clientes diferentes para proteção do número
        await sleep(4000);
      } catch (err: any) {
        console.error(`[Robô Notificações] Erro ao enviar para reserva ${res.id}:`, err.message);
        await logNotificacao({
          tipo: "reserva_confirmacao",
          referenciaId: res.id,
          clienteId: res.clienteId,
          clienteNome: clienteNome,
          telefone: telefone,
          horarioSlot: currentSlot,
          mensagem: messageText,
          status: "erro",
          erro: err.message
        });
        detalhes.push({ reservaId: res.id, cliente: clienteNome, status: "erro", erro: err.message });
      }
    }

    return {
      success: true,
      disparos,
      pendentes: pendentes.length,
      detalhes,
      slot: currentSlot
    };
  } catch (error: any) {
    console.error("[Robô Notificações] Erro fatal no ciclo de reservas:", error);
    return { success: false, disparos: 0, pendentes: 0, detalhes: [{ erro: error.message }] };
  } finally {
    isProcessingReservas = false;
  }
}

/**
 * Gatilho automático para notificar o cliente sobre novos lançamentos financeiros
 */
export async function triggerFinancialNotification(transacao: any): Promise<boolean> {
  const pool = getDbPool();
  if (!pool || !transacao) return false;

  try {
    // 0. TRAVA MESTRA DE SEGURANÇA: No Modo Manual, lançamentos não disparam WhatsApp sozinhos
    const modoOperacao = (await getConfigValue("notif_modo_operacao")) || "automatico";
    if (modoOperacao === "manual") {
      return false;
    }

    // 1. Verifica se a automação financeira está ativa
    const ativaRaw = await getConfigValue("notif_financeiro_ativa");
    const isAtiva = ativaRaw === null || ativaRaw === undefined || ativaRaw === "1" || ativaRaw === "true";
    if (!isAtiva) return false;

    // 2. Apenas receitas com cliente associado e valor > 0
    if (transacao.tipo !== "receita" || !transacao.clienteId || Number(transacao.valor) <= 0) {
      return false;
    }

    // Não notifica faturas que já foram salvas como pagas ou canceladas
    if (transacao.status === "pago" || transacao.status === "cancelado") {
      return false;
    }

    // Se já foi marcada como notificada, ignora
    if (transacao.notificacaoEnviada === 1 || transacao.notificacaoEnviada === true) {
      return false;
    }

    // Verifica no log se já houve notificação dessa transação
    const jaNotificado = await hasNotificacaoLog("financeiro_lancamento", transacao.id);
    if (jaNotificado) return false;

    // 3. Busca dados do cliente
    const [clientRows] = await pool.query(
      `SELECT id, nome, telefone FROM Clientes WHERE id = ?`,
      [transacao.clienteId]
    );
    const client = (clientRows as any[])[0];
    if (!client || !client.telefone) {
      return false;
    }

    // 4. Monta o template da mensagem
    const customTemplate = await getConfigValue("notif_financeiro_template");
    const template = customTemplate ||
      "Olá, *{cliente}*! 😊\n\nIdentificamos um novo lançamento no seu cadastro:\n\n📋 *Descrição:* {descricao}\n💰 *Valor:* R$ {valor}\n📅 *Vencimento:* {vencimento}{link_info}\n\nFicamos à disposição para qualquer dúvida! 👍";

    const clientFirstName = formatFirstName(client.nome);
    const formattedValor = formatCurrency(transacao.valor);
    const formattedVencimento = formatDateBr(transacao.dataVencimento);
    const linkPagamento = transacao.asaasPaymentUrl || "";
    const linkInfo = linkPagamento ? `\n🔗 *Link para Pagamento:* ${linkPagamento}` : "";

    const messageText = template
      .replace(/{cliente}/g, clientFirstName)
      .replace(/{descricao}/g, transacao.descricao || "Lançamento Financeiro")
      .replace(/{valor}/g, formattedValor)
      .replace(/{vencimento}/g, formattedVencimento || "A combinar")
      .replace(/{link_info}/g, linkInfo)
      .replace(/{link_pagamento}/g, linkPagamento);

    console.log(`[Robô Financeiro] Disparando notificação de lançamento para ${client.nome} (${client.telefone})...`);

    const sendRes = await sendEvolutionText(client.telefone, messageText);
    if (!sendRes.success) {
      await logNotificacao({
        tipo: "financeiro_lancamento",
        referenciaId: transacao.id,
        clienteId: client.id,
        clienteNome: client.nome,
        telefone: client.telefone,
        mensagem: messageText,
        status: "erro",
        erro: sendRes.message
      });
      return false;
    }

    // Registra sucesso e atualiza a transação
    await logNotificacao({
      tipo: "financeiro_lancamento",
      referenciaId: transacao.id,
      clienteId: client.id,
      clienteNome: client.nome,
      telefone: client.telefone,
      mensagem: messageText,
      status: "sucesso"
    });

    await pool.query(
      `UPDATE TransacoesFinanceiras SET notificacaoEnviada = 1 WHERE id = ?`,
      [transacao.id]
    );

    console.log(`[Robô Financeiro] Notificação financeira enviada com sucesso para ${client.nome}.`);
    return true;
  } catch (err: any) {
    console.error("[Robô Financeiro] Erro ao disparar notificação financeira:", err.message);
    return false;
  }
}

/**
 * Inicia o temporizador contínuo do robô no servidor (verifica a cada 30 segundos)
 */
export function startNotificationScheduler() {
  console.log("⏰ [Robô Notificações] Agendador inteligente de WhatsApp inicializado.");

  // Executa uma checagem a cada 30 segundos
  setInterval(async () => {
    try {
      await processReservasConfirmationCycle();
    } catch (err: any) {
      console.warn("[Robô Notificações Scheduler] Erro silencioso na rodada:", err?.message);
    }
  }, 30000);
}
