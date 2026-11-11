import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getDbPool, getConfigValue, logNotificacao, hasNotificacaoLog } from "./server-db";
import { sendEvolutionText } from "./server-routes/whatsapp.routes";
import { sendPushToClient } from "./server-push";
import { syncGempDailyIncremental } from "./server-gemp";

/**
 * 10 Modelos Padrões de Mensagens de Confirmação Progressivas (Cliente Em Dia)
 * Cada envio sucessivo utiliza uma abordagem diferente, evitando repetição robótica e spam.
 * A partir do 6º envio, inclui a dica amigável de cancelamento caso o cliente não vá utilizar.
 */
export const DEFAULT_10_CONFIRMATION_TEMPLATES: string[] = [
  // 1º Envio: Boas-vindas matinal e acolhimento
  "Bom dia, *{cliente}*! ☀️ Tudo bem?\n\nSua embarcação *{barco}* está agendada para *{quando}*! 🚤\n\nNossa equipe de marinharia já está preparando tudo. Para adiantarmos a descida {do_seu_barco} e seu plano de navegação, por favor confirme sua saída pelo link direto no app:\n\n👉 {link}\n\nTenha um excelente passeio!",

  // 2º Envio: Lembrete amigável e foco em agilidade
  "Olá, *{cliente}*! Passando para checar os detalhes do seu passeio de *{quando}* com {seu_barco} *{barco}*. ⚓\n\nVocê consegue nos confirmar rapidinho? Leva menos de 1 minuto pelo seu link de acesso rápido:\n\n👉 {link}\n\nAssim garantimos {seu_barco} pronta e revisada para a sua chegada!",

  // 3º Envio: Logística da marina e prioridade na fila de descida
  "Oi, *{cliente}*! 🚤 A equipe do pátio está organizando a fila de descida das embarcações desta manhã. Para mantermos a prioridade {do_seu_barco} *{barco}*, confirme seus horários de saída pelo link:\n\n👉 {link}\n\nEstamos aguardando sua resposta para colocar {seu_barco} na água a tempo!",

  // 4º Envio: Segurança e normas da Capitania dos Portos
  "Olá, *{cliente}*! ⚠️ Lembrando que a Capitania dos Portos exige o Plano de Navegação prévio (destino e quantidade de passageiros a bordo). Agilize sua liberação no píer confirmando os dados {do_seu_barco} pelo app:\n\n👉 {link}\n\nSua segurança e conforto são nossas prioridades!",

  // 5º Envio: Apoio ao marinheiro e pontualidade
  "Oi, *{cliente}*! Tudo certo para navegar *{quando}* com {seu_barco} *{barco}*? 🌊\n\nPara que nossa equipe organize os marinheiros de apoio e você não pegue fila no píer, confirme sua saída agora pelo link:\n\n👉 {link}\n\nQualquer dúvida, estamos à disposição aqui no WhatsApp!",

  // 6º Envio: Alinhamento operacional + Dica de cancelamento no portal
  "Olá, *{cliente}*! Ainda não identificamos sua confirmação para o agendamento de *{quando}* em {seu_barco} *{barco}*.\n\nPara validar sua presença, acesse o link rápido:\n👉 {link}\n\n💡 *Dica de cancelamento:* Se teve algum imprevisto e não for mais utilizar hoje, você pode cancelar a reserva direto pelo portal no link acima para liberar a marinharia.",

  // 7º Envio: Movimentação intensa no píer + Opção de liberar vaga
  "Oi, *{cliente}*! ⚓ Como as movimentações no píer e nos tratores de descida estão intensas, precisamos da sua confirmação para manter {seu_barco} *{barco}* escalado.\n\nAcesse o link rápido para confirmar:\n👉 {link}\n\n💡 *Não vai navegar?* Cancele sua reserva pelo link para liberar a vaga no pátio e evitar desencontros operacionais.",

  // 8º Envio: Urgência moderada + Cancelamento no portal
  "Olá, *{cliente}*! 😊 Queremos garantir que sua navegação ocorra sem qualquer atraso ou fila de espera! Se ainda for sair hoje com {seu_barco} *{barco}*, clique abaixo para confirmar:\n\n👉 {link}\n\n⚠️ *Mudança de planos?* Caso não vá utilizar hoje, você pode efetuar o cancelamento em 1 clique pelo portal no link acima, liberando a vaga para outro cotista.",

  // 9º Envio: Penúltimo aviso + Cancelamento para liberação
  "Oi, *{cliente}*! ⚠️ Nossa marinharia precisa confirmar se {seu_barco} *{barco}* vai para a água hoje. Caso o passeio esteja mantido, confirme pelo link:\n\n👉 {link}\n\nCaso tenha ocorrido algum imprevisto e não vá utilizar, por favor acesse o link e cancele a reserva para liberarmos o espaço na marina.",

  // 10º Envio: Última chamada antes do cancelamento operacional
  "Olá, *{cliente}*! Última verificação da marina: sua reserva {do_seu_barco} *{barco}* para *{quando}* continua pendente de confirmação.\n\nPara confirmar sua saída ou cancelar a reserva sem penalidades, acesse o link abaixo:\n👉 {link}\n\nContamos com sua compreensão para mantermos o pátio e as descidas organizadas!"
];

/**
 * 10 Modelos Padrões de Confirmação com Alerta de Débito Financeiro (Cliente com Pendência Vencida)
 * Informa sobre o agendamento do dia, avisa da pendência financeira e permite quitar via PIX + liberar o check-in no mesmo Magic Link.
 */
export const DEFAULT_10_DEBT_CONFIRMATION_TEMPLATES: string[] = [
  // 1º Envio (Com Débito)
  "Bom dia, *{cliente}*! ☀️ Tudo bem?\n\nIdentificamos seu agendamento {do_seu_barco} *{barco}* para *{quando}*! 🚤\n\n⚠️ *Aviso importante:* Consta em seu cadastro uma pendência financeira em aberto no valor de *R$ {valor_debito}* ({qtd_faturas}).\n\nPara liberar a descida {do_seu_barco} e concluir seu check-in rapidamente via PIX automático, acesse seu link exclusivo:\n\n👉 {link}\n\nAssim que regularizado, sua saída é liberada na hora!",

  // 2º Envio (Com Débito)
  "Olá, *{cliente}*! Passando para lembrar do seu agendamento de *{quando}* com {seu_barco} *{barco}*. ⚓\n\nPara que a marinharia seja autorizada a preparar e descer {seu_barco}, é necessário quitar o saldo vencido de *R$ {valor_debito}* e confirmar seu plano de navegação pelo link:\n\n👉 {link}\n\nO pagamento via PIX no link libera o check-in automaticamente em segundos!",

  // 3º Envio (Com Débito)
  "Oi, *{cliente}*! 🚤 Nossa equipe de pátio está organizando a fila de descida desta manhã.\n\nSua reserva {do_seu_barco} *{barco}* aguarda a regularização da pendência de *R$ {valor_debito}* para liberação operacional.\n\nVocê pode quitar via PIX e confirmar sua saída em 1 toque direto no link abaixo:\n👉 {link}",

  // 4º Envio (Com Débito)
  "Olá, *{cliente}*! ⚠️ A liberação de descida {do_seu_barco} *{barco}* para *{quando}* encontra-se retida pelo sistema devido ao débito em aberto de *R$ {valor_debito}*.\n\nPara regularizar agora mesmo e preencher os dados obrigatórios de saída, acesse:\n👉 {link}\n\nCaso já tenha efetuado o pagamento, envie o comprovante para nossa equipe financeira.",

  // 5º Envio (Com Débito)
  "Oi, *{cliente}*! Tudo bem? Ainda pretende navegar *{quando}* com {seu_barco} *{barco}*? 🌊\n\nLembramos que a Ordem de Serviço de descida só é liberada após a quitação da pendência de *R$ {valor_debito}* e confirmação do check-in:\n\n👉 {link}\n\nPelo link você gera o PIX Copia e Cola e destrava seu passeio na mesma tela!",

  // 6º Envio (Com Débito + Dica de Cancelamento)
  "Olá, *{cliente}*! Sua reserva {do_seu_barco} *{barco}* para *{quando}* segue bloqueada por pendência financeira (*R$ {valor_debito}*) e sem confirmação de check-in.\n\n👉 Acesse para quitar e confirmar: {link}\n\n💡 *Não vai utilizar hoje?* Você também pode cancelar a reserva pelo link acima para liberar a programação da marina.",

  // 7º Envio (Com Débito + Opção de liberar vaga)
  "Oi, *{cliente}*! ⚓ As movimentações no píer estão intensas hoje. Para mantermos {seu_barco} *{barco}* na programação, regularize o débito de *R$ {valor_debito}* e confirme sua saída pelo link:\n\n👉 {link}\n\n💡 Caso não vá navegar hoje, acesse o link para cancelar a reserva.",

  // 8º Envio (Com Débito + Urgência)
  "Olá, *{cliente}*! ⚠️ Últimos horários para liberar a descida {do_seu_barco} *{barco}* hoje. O sistema aguarda a quitação de *R$ {valor_debito}* e o preenchimento do check-in:\n\n👉 {link}\n\nSe mudou de planos e não for sair hoje, cancele em 1 clique pelo link acima.",

  // 9º Envio (Com Débito + Penúltimo aviso)
  "Oi, *{cliente}*! Nossa marinharia precisa saber se você irá regularizar e confirmar a saída {do_seu_barco} *{barco}* de hoje (pendência: *R$ {valor_debito}*).\n\nAcesse agora para liberar com PIX ou cancelar a reserva:\n👉 {link}",

  // 10º Envio (Com Débito + Última chamada)
  "Olá, *{cliente}*! Última verificação da marina: sua reserva {do_seu_barco} *{barco}* para *{quando}* permanece retida por pendência financeira (*R$ {valor_debito}*) e falta de check-in.\n\nPara quitar e liberar imediatamente ou cancelar a reserva de hoje, acesse:\n👉 {link}"
];

/**
 * Detecta se a embarcação é Jet Ski ou Lancha e retorna as variações linguísticas em português
 */
export function detectBoatTerms(boat?: {
  tipo?: string;
  nome?: string;
  modelo?: string;
  fabricante?: string;
} | null) {
  if (!boat) {
    return {
      isJet: false,
      tipo: 'lancha',
      tipo_barco: 'lancha',
      seu_barco: 'sua lancha',
      do_seu_barco: 'da sua lancha',
      o_barco: 'a lancha',
      no_barco: 'na lancha',
      termo: 'lancha'
    };
  }

  const tipoRaw = String(boat.tipo || '').toLowerCase();
  const text = `${boat.nome || ''} ${boat.modelo || ''} ${boat.fabricante || ''} ${tipoRaw}`.toUpperCase();

  const isJet =
    tipoRaw === 'jet' ||
    tipoRaw === 'jetski' ||
    tipoRaw === 'jet-ski' ||
    text.includes('JET') ||
    text.includes('SEA DOO') ||
    text.includes('SEADOO') ||
    text.includes('SEA-DOO') ||
    text.includes('RXT') ||
    text.includes('GTI') ||
    text.includes('WAKE') ||
    text.includes('GTX') ||
    text.includes('GTR') ||
    text.includes('SPARK') ||
    text.includes('MOTO AQUÁTICA') ||
    text.includes('MOTO AQUATICA') ||
    text.includes('WATERCRAFT');

  if (isJet) {
    return {
      isJet: true,
      tipo: 'jet',
      tipo_barco: 'jet',
      seu_barco: 'seu jet',
      do_seu_barco: 'do seu jet',
      o_barco: 'o jet',
      no_barco: 'no jet',
      termo: 'jet'
    };
  }

  return {
    isJet: false,
    tipo: 'lancha',
    tipo_barco: 'lancha',
    seu_barco: 'sua lancha',
    do_seu_barco: 'da sua lancha',
    o_barco: 'a lancha',
    no_barco: 'na lancha',
    termo: 'lancha'
  };
}

/**
 * Aplica a substituição inteligente de variáveis no template da mensagem
 */
export function formatConfirmationMessage(
  templateText: string,
  params: {
    clienteNome: string;
    boatCode: string;
    quando?: string;
    dataIso?: string;
    magicLink: string;
    valorDebito?: number;
    qtdFaturas?: number;
    boatInfo?: {
      tipo?: string;
      nome?: string;
      modelo?: string;
      fabricante?: string;
    } | null;
  }
): string {
  const terms = detectBoatTerms(params.boatInfo);
  const clientFirstName = formatFirstName(params.clienteNome);
  const quando = params.quando || "hoje";
  const dataBr = params.dataIso ? formatDateBr(params.dataIso) : "hoje";
  const valorDebitoFmt = formatCurrency(params.valorDebito || 0);
  const qtdFaturasNum = Number(params.qtdFaturas || 0);
  const qtdFaturasStr = qtdFaturasNum > 1 ? `${qtdFaturasNum} faturas vencidas` : `1 fatura vencida`;

  let msg = templateText
    .replace(/\{\s*cliente\s*\}/gi, clientFirstName)
    .replace(/\{\s*barco\s*\}/gi, params.boatCode)
    .replace(/\{\s*quando\s*\}/gi, quando)
    .replace(/\{\s*data\s*\}/gi, dataBr)
    .replace(/\{\s*link\s*\}/gi, params.magicLink)
    .replace(/\{\s*valor_debito\s*\}/gi, valorDebitoFmt)
    .replace(/\{\s*debito\s*\}/gi, valorDebitoFmt)
    .replace(/\{\s*qtd_faturas\s*\}/gi, qtdFaturasStr)
    .replace(/\{\s*tipo\s*\}/gi, terms.tipo)
    .replace(/\{\s*tipo_barco\s*\}/gi, terms.tipo_barco)
    .replace(/\{\s*seu_barco\s*\}/gi, terms.seu_barco)
    .replace(/\{\s*do_seu_barco\s*\}/gi, terms.do_seu_barco)
    .replace(/\{\s*o_barco\s*\}/gi, terms.o_barco)
    .replace(/\{\s*no_barco\s*\}/gi, terms.no_barco);

  // Inteligência contextual: se a embarcação for Jet Ski e o texto ainda tiver 'lancha' hardcoded
  if (terms.isJet) {
    msg = msg
      .replace(/da\s+sua\s+lancha/gi, 'do seu jet')
      .replace(/da\s+lancha/gi, 'do jet')
      .replace(/sua\s+lancha/gi, 'seu jet')
      .replace(/na\s+lancha/gi, 'no jet')
      .replace(/a\s+lancha/gi, 'o jet')
      .replace(/\blancha\b/gi, 'jet');
  }

  return msg;
}

/**
 * Retorna os 10 modelos configurados no banco ou a lista padrão (Em Dia)
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
 * Retorna os 10 modelos de confirmação COM DÉBITO configurados no banco ou a lista padrão
 */
export async function getDebtConfirmationTemplates(): Promise<string[]> {
  try {
    const raw = await getConfigValue("whatsapp_conf_debt_templates_10");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 10) {
        return parsed.map((t, idx) => String(t || DEFAULT_10_DEBT_CONFIRMATION_TEMPLATES[idx]));
      }
    }
  } catch (e) {}
  return [...DEFAULT_10_DEBT_CONFIRMATION_TEMPLATES];
}

/**
 * Retorna data (YYYY-MM-DD) e hora (HH:mm) no fuso oficial de Brasília
 */
export function getBrasiliaDateTime(): { dateStr: string; timeStr: string; minutesOfDay: number } {
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

  const [hh, mm] = timeStr.split(':').map(n => parseInt(n, 10) || 0);
  const minutesOfDay = hh * 60 + mm;

  return { dateStr, timeStr, minutesOfDay };
}

/**
 * Calcula a situação de débito vencido de todos os clientes (com multa e juros atualizados)
 */
export async function getClientsOverdueDebtMap(targetTodayStr?: string): Promise<Map<string, {
  hasDebt: boolean;
  totalAberto: number;
  qtdFaturasVencidas: number;
}>> {
  const map = new Map<string, { hasDebt: boolean; totalAberto: number; qtdFaturasVencidas: number }>();
  const pool = getDbPool();
  if (!pool) return map;

  const todayStr = targetTodayStr || getBrasiliaDateTime().dateStr;

  try {
    const taxaJurosMensal = parseFloat((await getConfigValue("fin_taxa_juros_mensal")) || "2.2") || 2.2;
    const taxaMultaAtraso = parseFloat((await getConfigValue("fin_taxa_multa_atraso")) || "2.0") || 2.0;

    const [txRows] = await pool.query(
      `SELECT id, clienteId, valor, dataVencimento, status
       FROM TransacoesFinanceiras
       WHERE tipo = 'receita'
         AND LOWER(COALESCE(status, '')) NOT IN ('pago', 'cancelado', 'realizado', 'estornado')
         AND clienteId IS NOT NULL
         AND (status = 'vencido' OR (dataVencimento IS NOT NULL AND dataVencimento != '' AND dataVencimento < ?))`,
      [todayStr]
    );

    const todayRef = new Date(todayStr + "T12:00:00");

    for (const tx of txRows as any[]) {
      const cid = String(tx.clienteId);
      const baseVal = Number(tx.valor || 0);
      if (baseVal <= 0) continue;

      let finalVal = baseVal;
      if (tx.dataVencimento && tx.dataVencimento < todayStr) {
        const due = new Date(tx.dataVencimento + "T12:00:00");
        const diffDays = Math.max(0, Math.floor((todayRef.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
        if (diffDays > 0) {
          const fine = baseVal * (Math.max(0, taxaMultaAtraso) / 100);
          const interest = baseVal * (Math.max(0, taxaJurosMensal) / 100) * (diffDays / 30);
          finalVal = Number((baseVal + fine + interest).toFixed(2));
        }
      }

      const prev = map.get(cid) || { hasDebt: true, totalAberto: 0, qtdFaturasVencidas: 0 };
      prev.hasDebt = true;
      prev.totalAberto = Number((prev.totalAberto + finalVal).toFixed(2));
      prev.qtdFaturasVencidas += 1;
      map.set(cid, prev);
    }
  } catch (err) {
    console.warn("[Robô Notificações] Aviso ao calcular mapa de débitos:", err);
  }

  return map;
}

// Guarda os slots já processados por data para permitir janela de tolerância (catch-up window de 15 min) sem duplicar
const executedSlotsMemory = new Set<string>();
let isProcessingReservas = false;
let lastSchedulerCheckAt: string | null = null;
let lastSchedulerSlotTriggered: string | null = null;

export function getSchedulerRuntimeStatus() {
  return {
    isProcessingReservas,
    lastSchedulerCheckAt,
    lastSchedulerSlotTriggered
  };
}

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

  if (pool && clienteId) {
    try {
      const [authRows] = await pool.query(
        "SELECT tokenVersion FROM ClienteAuth WHERE clienteId = ?",
        [clienteId]
      );
      const authRecord = (authRows as any[])[0];
      if (authRecord && authRecord.tokenVersion != null) {
        tokenVersion = Number(authRecord.tokenVersion) || 1;
      } else {
        // Assegura registro inicial para o cliente
        await pool.query(
          "INSERT INTO ClienteAuth (clienteId, passwordHash, tokenVersion) VALUES (?, '', 1) ON DUPLICATE KEY UPDATE tokenVersion = COALESCE(tokenVersion, 1)",
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
  // Se o customAppUrl for um tunnel temporário ou localhost, ignora e usa o domínio de produção oficial
  if (rawAppUrl && (rawAppUrl.includes("localhost") || rawAppUrl.includes("tunnelmole") || rawAppUrl.includes("ngrok"))) {
    rawAppUrl = undefined;
  }

  if (!rawAppUrl) {
    try {
      rawAppUrl = await getConfigValue("app_url");
    } catch {}
  }
  if (!rawAppUrl) {
    rawAppUrl = process.env.APP_URL;
  }
  if (!rawAppUrl || rawAppUrl.includes("localhost") || rawAppUrl.includes("tunnelmole")) {
    rawAppUrl = "https://mexicano.echo.dev.br";
  }
  const appUrl = rawAppUrl.replace(/\/$/, "");

  // Gera código curto exclusivo de 8 caracteres alfanuméricos
  const code = crypto.randomBytes(4).toString("hex");
  const linkId = `ml_${Date.now()}_${code}`;
  const nowIso = new Date().toISOString();
  const expiresIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (pool && clienteId) {
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
 * Garante que o token de um MagicLink esteja sincronizado com o ClienteAuth atual
 * e não falhe caso o cliente tenha redefinido senha ou o registro ClienteAuth tenha sido recriado.
 */
export async function ensureValidMagicLinkToken(linkRecord: any): Promise<string> {
  const pool = getDbPool();
  const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
  const clienteId = linkRecord.clienteId;
  const reservaId = linkRecord.reservaId || "";
  let tokenVersion = 1;
  let clienteNome = "Cliente";

  if (pool && clienteId) {
    try {
      const [authRows] = await pool.query(
        "SELECT tokenVersion FROM ClienteAuth WHERE clienteId = ?",
        [clienteId]
      );
      const authRecord = (authRows as any[])[0];
      if (authRecord && authRecord.tokenVersion != null) {
        tokenVersion = Number(authRecord.tokenVersion) || 1;
      } else {
        await pool.query(
          "INSERT INTO ClienteAuth (clienteId, passwordHash, tokenVersion) VALUES (?, '', 1) ON DUPLICATE KEY UPDATE tokenVersion = COALESCE(tokenVersion, 1)",
          [clienteId]
        );
      }
    } catch (e) {
      console.warn("[MagicLink] Aviso ao sincronizar ClienteAuth no redirecionamento:", e);
    }
  }

  try {
    const decoded = jwt.verify(linkRecord.token, jwtSecret, { algorithms: ["HS256"] }) as any;
    if (decoded?.nome) clienteNome = decoded.nome;
    if ((decoded?.tv ?? 1) === tokenVersion && decoded?.role === "client") {
      return linkRecord.token;
    }
  } catch {}

  const freshToken = jwt.sign(
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

  if (pool && linkRecord.id) {
    await pool.query(
      "UPDATE MagicLinks SET token = ? WHERE id = ?",
      [freshToken, linkRecord.id]
    ).catch(() => {});
  }

  return freshToken;
}

/**
 * Encontra se há algum horário configurado elegível na janela atual (tolerância de até 15 minutos)
 */
function findMatchingScheduledSlot(horarios: string[], currentMinutesOfDay: number, effectiveDate: string): string | null {
  const sorted = [...horarios].sort();
  for (const h of sorted) {
    const parts = h.split(':');
    if (parts.length !== 2) continue;
    const slotMins = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    const diff = currentMinutesOfDay - slotMins;
    // Aceita se estamos no minuto exato ou até 15 minutos depois (caso o servidor tenha reiniciado ou ciclo anterior demorado)
    if (diff >= 0 && diff <= 15) {
      const slotKey = `${effectiveDate}_${h}`;
      if (!executedSlotsMemory.has(slotKey)) {
        return h;
      }
    }
  }
  return null;
}

/**
 * Ciclo de verificação e envio de confirmações de reservas (Com verificação inteligente de Débitos)
 */
export async function processReservasConfirmationCycle(options?: {
  isManual?: boolean;
  targetDate?: string;
  selectedReservaIds?: string[];
  origin?: string;
}): Promise<{
  success: boolean;
  disparos: number;
  pendentes: number;
  detalhes: any[];
  slot?: string;
}> {
  const { dateStr, timeStr, minutesOfDay } = getBrasiliaDateTime();
  lastSchedulerCheckAt = `${dateStr}T${timeStr}:00-03:00`;

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

    // 1. Verifica se a automação de reservas está habilitada
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

    let currentSlot = options?.isManual ? `manual_${timeStr}` : timeStr;

    // Se for execução automática, verifica janela de tolerância de 15 minutos para os horários configurados
    if (!options?.isManual) {
      const matchedSlot = findMatchingScheduledSlot(horarios, minutesOfDay, effectiveDate);
      if (!matchedSlot) {
        return { success: true, disparos: 0, pendentes: 0, detalhes: [] };
      }
      currentSlot = matchedSlot;
      executedSlotsMemory.add(`${effectiveDate}_${matchedSlot}`);
      lastSchedulerSlotTriggered = `${effectiveDate} ${matchedSlot}`;
    }

    console.log(`[Robô Notificações] Iniciando ciclo de confirmação para ${effectiveDate} (Slot: ${currentSlot})...`);

    // 3. Busca reservas do dia cuja confirmação ainda NÃO foi realizada
    // Ignora reservas que já confirmaram, já estão no píer/navegando/concluídas ou foram canceladas
    const [reservasRows] = await pool.query(
      `SELECT r.*, c.nome as clienteNome, c.telefone as clienteTelefone, c.statusFinanceiro as clienteStatusFin,
              e.nome as embarcacaoNome, e.numero as embarcacaoNumero,
              e.tipo as embarcacaoTipo, e.modelo as embarcacaoModelo, e.fabricante as embarcacaoFabricante
       FROM Reservas r
       LEFT JOIN Clientes c ON r.clienteId = c.id
       LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
       WHERE r.data = ? 
         AND r.status != 'cancelado' 
         AND r.status != 'confirmado'
         AND COALESCE(r.statusMarina, '') NOT IN ('confirmada', 'descida', 'pier', 'pronta', 'saida', 'navegando', 'chegada', 'guardada')
         AND (r.horaDescida IS NULL OR r.horaDescida = '')
         AND (r.horaSaida IS NULL OR r.horaSaida = '')`,
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

    // 4. Carrega mapa de débitos vencidos e os modelos de mensagens (Em Dia + Com Débito)
    const debtMap = await getClientsOverdueDebtMap(effectiveDate);
    const templatesRegular = await getConfirmationTemplates();
    const templatesDebt = await getDebtConfirmationTemplates();
    const usarMensagemDebito = (await getConfigValue("notif_usar_mensagem_debito")) !== "0";
    const sandboxAtiva = (await getConfigValue("notif_sandbox_ativa")) === "1";
    const sandboxTelefone = (await getConfigValue("notif_sandbox_telefone")) || "";

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

      // Verifica se o cliente possui débito financeiro vencido
      const clientDebtInfo = res.clienteId ? debtMap.get(String(res.clienteId)) : undefined;
      // O modelo com débito só é usado quando existem faturas vencidas reais (evita enviar "R$ 0,00"
      // para clientes marcados manualmente como inadimplentes sem nenhuma fatura em aberto).
      const isInadimplente = Boolean(
        clientDebtInfo && clientDebtInfo.hasDebt && clientDebtInfo.totalAberto > 0
      );
      const valorDebito = clientDebtInfo?.totalAberto || 0;
      const qtdFaturas = clientDebtInfo?.qtdFaturasVencidas || 0;

      // 5. Gera Magic Link exclusivo do cliente para entrar direto no app e abrir o check-in (ou regularização PIX in-place)
      const magicLink = await generateClientMagicLink(res.clienteId, clienteNome, res.id, options?.origin);

      // 6. Seleciona o modelo de acordo com o número da tentativa (1 a 10) e situação financeira
      const tentativaAtual = Number(res.tentativasConfirmacao || 0) + 1;
      const activeTemplatesList = (isInadimplente && usarMensagemDebito) ? templatesDebt : templatesRegular;
      const templateIndex = Math.min(Math.max(tentativaAtual - 1, 0), activeTemplatesList.length - 1);
      const chosenTemplate = activeTemplatesList[templateIndex] || activeTemplatesList[0];

      const messageText = formatConfirmationMessage(chosenTemplate, {
        clienteNome,
        boatCode,
        quando,
        dataIso: effectiveDate,
        magicLink,
        valorDebito,
        qtdFaturas,
        boatInfo: {
          tipo: res.embarcacaoTipo,
          nome: res.embarcacaoNome,
          modelo: res.embarcacaoModelo,
          fabricante: res.embarcacaoFabricante
        }
      });

      const logTipo = (isInadimplente && usarMensagemDebito) ? "reserva_confirmacao_debito" : "reserva_confirmacao";

      try {
        // Se o modo Sandbox estiver ativo, NÃO envia push real para o cliente
        let pushEntregues = 0;
        if (res.clienteId && !sandboxAtiva) {
          let pushUrl = "/portal";
          try {
            const parsedLink = new URL(magicLink);
            pushUrl = `${parsedLink.pathname}${parsedLink.search}`;
          } catch {}
          pushEntregues = await sendPushToClient(res.clienteId, {
            title: isInadimplente
              ? `Pendência Financeira · Reserva ${boatCode} ⚠️`
              : (tentativaAtual <= 1 ? "Seu passeio é hoje ⚓" : "Confirme sua saída de hoje"),
            body: isInadimplente
              ? `${clientFirstName}, regularize via PIX e libere a saída de ${boatCode} em 1 toque.`
              : `${clientFirstName}, confirme a saída de ${boatCode} em um toque.`,
            url: pushUrl,
            tag: `checkin_${res.id}`,
            requireInteraction: true
          });
        }

        const pushSubstituiWhatsapp = (await getConfigValue("notif_push_substitui_whatsapp")) === "1";
        const canalUsado = pushEntregues > 0 && pushSubstituiWhatsapp ? "push" : (pushEntregues > 0 ? "push+whatsapp" : "whatsapp");

        // Definição do número de destino e prefixo Sandbox se ativado
        let telefoneDestino = telefone;
        let textoFinal = messageText;

        if (sandboxAtiva) {
          if (!sandboxTelefone) {
            console.log(`[Robô Notificações - SANDBOX] Simulação pura (sem envio externo): para ${clienteNome} (${telefone})`);
          } else {
            telefoneDestino = sandboxTelefone;
            const debitoTag = isInadimplente ? `COM DÉBITO (R$ ${valorDebito.toFixed(2)})` : `EM DIA`;
            textoFinal = `🧪 *[TESTE ROBÔ - MODO SANDBOX]*\n👤 *Cotista:* ${clienteNome} (${telefone})\n⚓ *Barco:* ${boatCode}\n📊 *Situação:* ${debitoTag}\n━━━━━━━━━━━━━━━━━━━━\n\n${messageText}`;
          }
        }

        if (canalUsado !== "push") {
          if (sandboxAtiva && !sandboxTelefone) {
            // Simulação sem envio de WhatsApp (dry-run total)
          } else {
            const sendResult = await sendEvolutionText(telefoneDestino, textoFinal);
            if (!sendResult.success) {
              throw new Error(sendResult.message || "Falha no envio da mensagem de confirmação");
            }
          }
        }

        // Registra log com sucesso (marca se foi Sandbox)
        await logNotificacao({
          tipo: logTipo,
          referenciaId: res.id,
          clienteId: res.clienteId,
          clienteNome: sandboxAtiva ? `[TESTE] ${clienteNome}` : clienteNome,
          telefone: sandboxAtiva && sandboxTelefone ? `${sandboxTelefone} (orig: ${telefone})` : telefone,
          horarioSlot: currentSlot,
          mensagem: sandboxAtiva ? `[SANDBOX] ${textoFinal}` : (canalUsado === "whatsapp" ? messageText : `[${canalUsado}] ${messageText}`),
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
          comDebito: isInadimplente,
          valorDebito,
          canal: canalUsado,
          status: "sucesso"
        });

        console.log(`[Robô Notificações] Confirmação (${isInadimplente ? 'COM DÉBITO - ' : ''}Modelo ${templateIndex + 1}) enviada para ${clienteNome} (${telefone}).`);

        // Intervalo entre clientes diferentes para proteção do número
        await sleep(3500);
      } catch (err: any) {
        console.error(`[Robô Notificações] Erro ao enviar para reserva ${res.id}:`, err.message);
        await logNotificacao({
          tipo: logTipo,
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
 * Inicia o temporizador contínuo do robô no servidor:
 * 1. Confirmações de passeios e check-ins no WhatsApp (a cada 25s)
 * 2. Sincronização incremental contínua do ERP GEMP Firebird (a cada 15 minutos)
 */
export function startNotificationScheduler() {
  console.log("⏰ [Robô Notificações] Agendador inteligente de WhatsApp inicializado.");

  // Executa uma checagem imediata após 5s do boot e depois a cada 25 segundos
  setTimeout(() => {
    processReservasConfirmationCycle().catch(() => {});
  }, 5000);

  setInterval(async () => {
    try {
      await processReservasConfirmationCycle();
    } catch (err: any) {
      console.warn("[Robô Notificações Scheduler] Erro silencioso na rodada:", err?.message);
    }
  }, 25000);

  // Sincronizador Automático ERP GEMP (roda 30s após boot e depois a cada 15 minutos)
  setTimeout(() => {
    syncGempDailyIncremental()
      .then((res) => {
        if (res.insertedOrUpdated > 0) {
          console.log(`[GEMP Auto-Sync] Sincronização inicial finalizada: ${res.novos} novos, ${res.atualizados} atualizados/baixados.`);
        }
      })
      .catch((e) => console.warn("[GEMP Auto-Sync] Aviso na checagem inicial:", e?.message));
  }, 30000);

  setInterval(async () => {
    try {
      const res = await syncGempDailyIncremental();
      if (res.insertedOrUpdated > 0) {
        console.log(`[GEMP Auto-Sync] Ciclo automático executado: ${res.novos} novos, ${res.atualizados} atualizados/baixados.`);
      }
    } catch (err: any) {
      console.warn("[GEMP Auto-Sync] Erro no ciclo automático de 15min:", err?.message);
    }
  }, 15 * 60 * 1000); // 15 minutos
}
