import { Embarcacao, RegrasOperacaoEmbarcacao } from '../types';
import { getBoatCode } from './boatUtils';

/**
 * Regras padrão aplicadas às embarcações da frota quando não há regra personalizada.
 */
export const DEFAULT_FLEET_RULES: RegrasOperacaoEmbarcacao = {
  usarPadraoFrota: true,
  maxReservasAtivas: 2,
  regraFimDeSemana: 'sabado_e_domingo',
  maxFdsGarantidosMes: 2,
  permitirReservaExtraFds: true,
  prazoContestacaoHoras: 48,
  antecedenciaMaximaDias: null,
  diasSemanaBloqueados: [],
  taxaDescidaAvulsaPersonalizada: null,
};

/**
 * Regras operacionais padrão da embarcação M62:
 * - Apenas 1 reserva ativa simultânea por sócio
 * - Apenas 1 Sábado OU 1 Domingo por mês por sócio (sem reserva extra no portal do cliente)
 */
export const M62_DEFAULT_RULES: RegrasOperacaoEmbarcacao = {
  usarPadraoFrota: false,
  maxReservasAtivas: 1,
  regraFimDeSemana: 'sabado_ou_domingo',
  maxFdsGarantidosMes: 1,
  permitirReservaExtraFds: false,
  prazoContestacaoHoras: 48,
  antecedenciaMaximaDias: null,
  diasSemanaBloqueados: [],
  taxaDescidaAvulsaPersonalizada: null,
};

const WEEKDAY_NAMES_PT = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

function formatDateBR(isoStr?: string | null): string {
  if (!isoStr || typeof isoStr !== 'string') return '';
  const parts = isoStr.split('T')[0].split('-');
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getBrasiliaDateMs(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00-03:00`).getTime();
}

/**
 * Identifica se uma embarcação é a M62 (código M62, número 62 ou nome contendo M62).
 */
export function isBoatM62(boat?: Partial<Embarcacao> | null): boolean {
  if (!boat) return false;
  if (boat.id === 'boat_M62' || String(boat.id || '').trim().toUpperCase() === 'M62') {
    return true;
  }
  const code = getBoatCode(boat).toUpperCase();
  if (code === 'M62') return true;

  const rawNum = String(boat.numero || '')
    .trim()
    .toUpperCase()
    .replace(/^M/i, '')
    .replace(/^0+/, '');
  if (rawNum === '62') return true;

  const nome = String(boat.nome || '').trim();
  if (/\bM[-_\s]*0*62\b/i.test(nome)) return true;

  return false;
}

function normalizeCustomRules(
  raw: Partial<RegrasOperacaoEmbarcacao>,
  baseFallback: RegrasOperacaoEmbarcacao
): RegrasOperacaoEmbarcacao {
  const maxReservasAtivas =
    raw.maxReservasAtivas !== undefined &&
    raw.maxReservasAtivas !== null &&
    !isNaN(Number(raw.maxReservasAtivas))
      ? Math.max(1, Math.floor(Number(raw.maxReservasAtivas)))
      : baseFallback.maxReservasAtivas;

  const regraFimDeSemana: RegrasOperacaoEmbarcacao['regraFimDeSemana'] =
    raw.regraFimDeSemana === 'sabado_e_domingo' ||
    raw.regraFimDeSemana === 'sabado_ou_domingo' ||
    raw.regraFimDeSemana === 'personalizado'
      ? raw.regraFimDeSemana
      : baseFallback.regraFimDeSemana;

  let maxFdsGarantidosMes = 2;
  if (regraFimDeSemana === 'sabado_ou_domingo') {
    maxFdsGarantidosMes = 1;
  } else if (regraFimDeSemana === 'personalizado') {
    const parsed = Number(raw.maxFdsGarantidosMes);
    maxFdsGarantidosMes = !isNaN(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
  }

  const permitirReservaExtraFds =
    typeof raw.permitirReservaExtraFds === 'boolean'
      ? raw.permitirReservaExtraFds
      : baseFallback.permitirReservaExtraFds;

  const prazoContestacaoHoras =
    raw.prazoContestacaoHoras !== undefined &&
    raw.prazoContestacaoHoras !== null &&
    !isNaN(Number(raw.prazoContestacaoHoras))
      ? Math.max(0, Math.floor(Number(raw.prazoContestacaoHoras)))
      : baseFallback.prazoContestacaoHoras;

  const antecedenciaMaximaDias =
    raw.antecedenciaMaximaDias !== undefined &&
    raw.antecedenciaMaximaDias !== null &&
    Number(raw.antecedenciaMaximaDias) > 0
      ? Math.floor(Number(raw.antecedenciaMaximaDias))
      : null;

  const diasSemanaBloqueados = Array.isArray(raw.diasSemanaBloqueados)
    ? Array.from(
        new Set(
          raw.diasSemanaBloqueados
            .map((d) => Number(d))
            .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        )
      ).sort((a, b) => a - b)
    : [];

  const rawTaxa = raw.taxaDescidaAvulsaPersonalizada;
  const taxaDescidaAvulsaPersonalizada =
    rawTaxa !== undefined &&
    rawTaxa !== null &&
    String(rawTaxa).trim() !== '' &&
    !isNaN(Number(rawTaxa)) &&
    Number(rawTaxa) >= 0
      ? Number(rawTaxa)
      : null;

  return {
    usarPadraoFrota: false,
    maxReservasAtivas,
    regraFimDeSemana,
    maxFdsGarantidosMes,
    permitirReservaExtraFds,
    prazoContestacaoHoras,
    antecedenciaMaximaDias,
    diasSemanaBloqueados,
    taxaDescidaAvulsaPersonalizada,
  };
}

/**
 * Resolve as regras operacionais vigentes para uma embarcação.
 * Se não houver configuração explícita, aplica automaticamente as regras padrão da M62 ou da frota.
 */
export function getBoatOperationRules(
  boat?: Partial<Embarcacao> | null
): RegrasOperacaoEmbarcacao {
  const rawCandidate =
    boat?.regrasOperacao ?? (boat?.acessorios as any)?.regrasOperacao ?? null;

  let raw: Partial<RegrasOperacaoEmbarcacao> | null = null;
  if (typeof rawCandidate === 'string' && rawCandidate.trim()) {
    try {
      raw = JSON.parse(rawCandidate);
    } catch {
      raw = null;
    }
  } else if (rawCandidate && typeof rawCandidate === 'object') {
    raw = rawCandidate;
  }

  if (raw) {
    if (raw.usarPadraoFrota === true) {
      return { ...DEFAULT_FLEET_RULES };
    }
    if (raw.usarPadraoFrota === false || Object.keys(raw).length > 0) {
      const base = isBoatM62(boat) ? M62_DEFAULT_RULES : DEFAULT_FLEET_RULES;
      return normalizeCustomRules(raw, base);
    }
  }

  return isBoatM62(boat) ? { ...M62_DEFAULT_RULES } : { ...DEFAULT_FLEET_RULES };
}

export interface ClientWeekendUsage {
  saturdaysAll: any[];
  sundaysAll: any[];
  saturdaysGuaranteed: any[];
  sundaysGuaranteed: any[];
  allWeekendReservations: any[];
  guaranteedWeekendReservations: any[];
}

/**
 * Lista o uso de fins de semana (Sábados e Domingos) do cliente em um mês/ano para uma embarcação.
 */
export function getClientWeekendUsageInMonth(
  userId: string,
  embarcacaoId: string,
  month: number,
  year: number,
  reservations: any[]
): ClientWeekendUsage {
  const saturdaysAll: any[] = [];
  const sundaysAll: any[] = [];
  const saturdaysGuaranteed: any[] = [];
  const sundaysGuaranteed: any[] = [];
  const allWeekendReservations: any[] = [];
  const guaranteedWeekendReservations: any[] = [];

  for (const r of reservations || []) {
    if (
      !r ||
      r.clienteId !== userId ||
      r.embarcacaoId !== embarcacaoId ||
      r.status === 'cancelado' ||
      !r.data
    ) {
      continue;
    }

    const rDateObj = new Date(`${String(r.data).split('T')[0]}T12:00:00Z`);
    if (isNaN(rDateObj.getTime())) continue;
    if (rDateObj.getUTCMonth() !== month || rDateObj.getUTCFullYear() !== year) {
      continue;
    }

    const dow = rDateObj.getUTCDay();
    if (dow !== 0 && dow !== 6) continue;

    const isGuaranteed = r.tipoReserva !== 'extra';
    allWeekendReservations.push(r);
    if (isGuaranteed) {
      guaranteedWeekendReservations.push(r);
    }

    if (dow === 6) {
      saturdaysAll.push(r);
      if (isGuaranteed) saturdaysGuaranteed.push(r);
    } else if (dow === 0) {
      sundaysAll.push(r);
      if (isGuaranteed) sundaysGuaranteed.push(r);
    }
  }

  return {
    saturdaysAll,
    sundaysAll,
    saturdaysGuaranteed,
    sundaysGuaranteed,
    allWeekendReservations,
    guaranteedWeekendReservations,
  };
}

export interface WeekendBookingEvaluation {
  isWeekend: boolean;
  allowed: boolean;
  tipoReserva: 'garantida' | 'extra';
  blockedReason?: string;
  confirmMessage?: string;
}

/**
 * Avalia se uma data de reserva do cliente é válida segundo as regras de fim de semana da embarcação,
 * indicando se é 'garantida', 'extra' (contestável) ou se deve ser bloqueada no portal do cliente.
 */
export function evaluateWeekendBookingForClient(params: {
  userId: string;
  embarcacaoId: string;
  dateStr: string;
  reservations: any[];
  boat?: Partial<Embarcacao> | null;
}): WeekendBookingEvaluation {
  const { userId, embarcacaoId, dateStr, reservations, boat } = params;
  const cleanDate = String(dateStr || '').split('T')[0];
  const reqDateObj = new Date(`${cleanDate}T12:00:00Z`);
  if (isNaN(reqDateObj.getTime())) {
    return { isWeekend: false, allowed: true, tipoReserva: 'garantida' };
  }

  const dow = reqDateObj.getUTCDay();
  if (dow !== 0 && dow !== 6) {
    return { isWeekend: false, allowed: true, tipoReserva: 'garantida' };
  }

  const rules = getBoatOperationRules(boat);
  const usage = getClientWeekendUsageInMonth(
    userId,
    embarcacaoId,
    reqDateObj.getUTCMonth(),
    reqDateObj.getUTCFullYear(),
    reservations
  );

  const boatLabel = boat ? getBoatCode(boat) : 'esta embarcação';
  const requestedDayName = WEEKDAY_NAMES_PT[dow];

  if (rules.regraFimDeSemana === 'sabado_ou_domingo') {
    const relevantList = rules.permitirReservaExtraFds
      ? usage.guaranteedWeekendReservations
      : usage.allWeekendReservations;

    if (relevantList.length >= 1) {
      const existing = relevantList[0];
      const existingDow = new Date(`${String(existing.data).split('T')[0]}T12:00:00Z`).getUTCDay();
      const existingDayLabel = WEEKDAY_NAMES_PT[existingDow] || 'fim de semana';

      if (!rules.permitirReservaExtraFds) {
        return {
          isWeekend: true,
          allowed: false,
          tipoReserva: 'garantida',
          blockedReason: `A embarcação ${boatLabel} permite apenas 1 Sábado OU 1 Domingo por mês por sócio. Você já utilizou sua cota de fim de semana em ${existingDayLabel} (${formatDateBR(existing.data)}) neste mês.`,
        };
      }

      return {
        isWeekend: true,
        allowed: true,
        tipoReserva: 'extra',
        confirmMessage: `Você já utilizou seu fim de semana garantido deste mês (${existingDayLabel}, ${formatDateBR(existing.data)}) para ${boatLabel}. Esta será uma reserva EXTRA e poderá ser contestada por outro cotista até ${rules.prazoContestacaoHoras} horas antes da data.`,
      };
    }

    return { isWeekend: true, allowed: true, tipoReserva: 'garantida' };
  }

  if (rules.regraFimDeSemana === 'personalizado') {
    const limit = Math.max(1, Number(rules.maxFdsGarantidosMes) || 1);
    const relevantList = rules.permitirReservaExtraFds
      ? usage.guaranteedWeekendReservations
      : usage.allWeekendReservations;

    if (relevantList.length >= limit) {
      if (!rules.permitirReservaExtraFds) {
        return {
          isWeekend: true,
          allowed: false,
          tipoReserva: 'garantida',
          blockedReason: `A embarcação ${boatLabel} permite no máximo ${limit} dia(s) de fim de semana por mês por sócio, e você já atingiu esse limite neste mês.`,
        };
      }

      return {
        isWeekend: true,
        allowed: true,
        tipoReserva: 'extra',
        confirmMessage: `Você já utilizou seus ${limit} dia(s) de fim de semana garantidos neste mês para ${boatLabel}. Esta será uma reserva EXTRA e poderá ser contestada por outro cotista até ${rules.prazoContestacaoHoras} horas antes da data.`,
      };
    }

    return { isWeekend: true, allowed: true, tipoReserva: 'garantida' };
  }

  // Padrão: 'sabado_e_domingo' (1 Sábado e 1 Domingo por mês)
  const sameDayList = rules.permitirReservaExtraFds
    ? dow === 6
      ? usage.saturdaysGuaranteed
      : usage.sundaysGuaranteed
    : dow === 6
      ? usage.saturdaysAll
      : usage.sundaysAll;

  if (sameDayList.length >= 1) {
    if (!rules.permitirReservaExtraFds) {
      return {
        isWeekend: true,
        allowed: false,
        tipoReserva: 'garantida',
        blockedReason: `A embarcação ${boatLabel} permite apenas 1 ${requestedDayName} por mês por sócio (já utilizado em ${formatDateBR(sameDayList[0].data)}).`,
      };
    }

    return {
      isWeekend: true,
      allowed: true,
      tipoReserva: 'extra',
      confirmMessage: `Você já utilizou seu ${requestedDayName} garantido neste mês para esta embarcação. Esta será uma reserva EXTRA e poderá ser contestada por outro cotista até ${rules.prazoContestacaoHoras} horas antes da data.`,
    };
  }

  return { isWeekend: true, allowed: true, tipoReserva: 'garantida' };
}

/**
 * Valida restrições adicionais de data da embarcação (dias da semana bloqueados e antecedência máxima).
 */
export function evaluateDateRestrictionsForClient(params: {
  dateStr: string;
  todayStr: string;
  boat?: Partial<Embarcacao> | null;
}): { allowed: boolean; reason?: string } {
  const { dateStr, todayStr, boat } = params;
  const cleanDate = String(dateStr || '').split('T')[0];
  const reqDateObj = new Date(`${cleanDate}T12:00:00Z`);
  if (isNaN(reqDateObj.getTime())) {
    return { allowed: false, reason: 'Data inválida.' };
  }

  const rules = getBoatOperationRules(boat);
  const dow = reqDateObj.getUTCDay();

  if (Array.isArray(rules.diasSemanaBloqueados) && rules.diasSemanaBloqueados.includes(dow)) {
    const dayLabel = WEEKDAY_NAMES_PT[dow] || 'este dia';
    return {
      allowed: false,
      reason: `Agendamentos às ${dayLabel}s estão bloqueados para ${boat ? getBoatCode(boat) : 'esta embarcação'} conforme regra da administração.`,
    };
  }

  if (rules.antecedenciaMaximaDias && rules.antecedenciaMaximaDias > 0 && todayStr) {
    const diffMs = getBrasiliaDateMs(cleanDate) - getBrasiliaDateMs(todayStr);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > rules.antecedenciaMaximaDias) {
      return {
        allowed: false,
        reason: `Esta embarcação permite agendamentos com no máximo ${rules.antecedenciaMaximaDias} dia(s) de antecedência.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Verifica se um cliente pode contestar (suplência) uma reserva EXTRA de outro cotista.
 */
export function canClientContestExtraReservation(params: {
  userId: string;
  embarcacaoId: string;
  targetReservation: any;
  reservations: any[];
  boat?: Partial<Embarcacao> | null;
  todayStr: string;
  nowMs?: number;
}): { canContest: boolean; reason?: string } {
  const {
    userId,
    embarcacaoId,
    targetReservation,
    reservations,
    boat,
    todayStr,
    nowMs = Date.now(),
  } = params;

  if (!targetReservation) {
    return { canContest: false, reason: 'Reserva não encontrada.' };
  }
  if (targetReservation.status === 'cancelado') {
    return { canContest: false, reason: 'Esta reserva já foi cancelada.' };
  }
  if (targetReservation.tipoReserva !== 'extra') {
    return { canContest: false, reason: 'Apenas reservas EXTRAS podem ser contestadas.' };
  }
  if (targetReservation.clienteId === userId) {
    return { canContest: false, reason: 'Você não pode contestar sua própria reserva.' };
  }
  if (targetReservation.embarcacaoId !== embarcacaoId) {
    return { canContest: false, reason: 'Embarcação não confere.' };
  }

  const rules = getBoatOperationRules(boat);

  const dateRestriction = evaluateDateRestrictionsForClient({
    dateStr: targetReservation.data,
    todayStr,
    boat,
  });
  if (!dateRestriction.allowed) {
    return { canContest: false, reason: dateRestriction.reason };
  }

  const activeCount = (reservations || []).filter(
    (r) =>
      r &&
      r.clienteId === userId &&
      r.embarcacaoId === embarcacaoId &&
      r.status !== 'cancelado' &&
      r.data >= todayStr
  ).length;

  if (activeCount >= rules.maxReservasAtivas) {
    const msg =
      rules.maxReservasAtivas === 1
        ? 'Você já possui 1 reserva ativa para esta embarcação. Pela regra de operação, só é permitido ter 1 reserva ativa por vez.'
        : `Você atingiu o limite máximo de ${rules.maxReservasAtivas} reservas ativas simultâneas para esta embarcação.`;
    return { canContest: false, reason: msg };
  }

  const resDateMs = getBrasiliaDateMs(String(targetReservation.data).split('T')[0]);
  const hoursUntil = (resDateMs - nowMs) / (1000 * 60 * 60);
  if (hoursUntil <= rules.prazoContestacaoHoras) {
    return {
      canContest: false,
      reason: `Esta reserva não pode mais ser contestada pois está a menos de ${rules.prazoContestacaoHoras} horas da data.`,
    };
  }

  const weekendEval = evaluateWeekendBookingForClient({
    userId,
    embarcacaoId,
    dateStr: targetReservation.data,
    reservations,
    boat,
  });

  if (!weekendEval.allowed || weekendEval.tipoReserva !== 'garantida') {
    const reqDow = new Date(`${String(targetReservation.data).split('T')[0]}T12:00:00Z`).getUTCDay();
    const dayName = WEEKDAY_NAMES_PT[reqDow] || 'fim de semana';
    return {
      canContest: false,
      reason:
        weekendEval.blockedReason ||
        (rules.regraFimDeSemana === 'sabado_ou_domingo'
          ? 'Você já utilizou sua cota de fim de semana (sábado ou domingo) neste mês. Não é possível contestar.'
          : `Você já utilizou seu ${dayName} garantido neste mês. Não é possível contestar.`),
    };
  }

  return { canContest: true };
}

export interface AdminReservationWarningResult {
  hasWarnings: boolean;
  warnings: string[];
  rulesSummary: string;
  rules: RegrasOperacaoEmbarcacao;
}

/**
 * Avalia todas as possíveis violações de regras operacionais quando o Administrador
 * está criando uma reserva (permitindo prosseguir mediante aviso prévio e confirmação de exceção).
 */
export function evaluateAdminReservationWarnings(params: {
  clientId: string;
  embarcacaoId: string;
  datesToBook: string[];
  reservations: any[];
  boat?: Partial<Embarcacao> | null;
  todayStr: string;
}): AdminReservationWarningResult {
  const { clientId, embarcacaoId, datesToBook, reservations, boat, todayStr } = params;
  const rules = getBoatOperationRules(boat);
  const badges = formatBoatRulesSummaryBadges(boat);
  const rulesSummary = `${badges.activeLimitLabel} • ${badges.weekendRuleLabel}`;
  const warnings: string[] = [];

  if (!clientId || !embarcacaoId) {
    return { hasWarnings: false, warnings, rulesSummary, rules };
  }

  const uniqueDates = Array.from(new Set((datesToBook || []).filter(Boolean))).sort();
  if (uniqueDates.length === 0) {
    return { hasWarnings: false, warnings, rulesSummary, rules };
  }

  const boatLabel = boat ? getBoatCode(boat) : 'esta embarcação';

  // 1. Limite de reservas ativas simultâneas
  const currentActive = (reservations || []).filter(
    (r) =>
      r &&
      r.clienteId === clientId &&
      r.embarcacaoId === embarcacaoId &&
      r.status !== 'cancelado' &&
      r.data >= todayStr
  );
  const futureDatesToBook = uniqueDates.filter((d) => d >= todayStr);
  const totalActiveAfter = currentActive.length + futureDatesToBook.length;

  if (futureDatesToBook.length > 0 && totalActiveAfter > rules.maxReservasAtivas) {
    if (currentActive.length >= rules.maxReservasAtivas) {
      const activeDatesFmt = currentActive.map((r) => formatDateBR(r.data)).join(', ');
      warnings.push(
        `Limite de reservas ativas excedido: ${boatLabel} permite no máximo ${rules.maxReservasAtivas} reserva(s) ativa(s) por vez, e este sócio já possui ${currentActive.length} (${activeDatesFmt}).`
      );
    } else {
      warnings.push(
        `Limite de reservas ativas excedido: ${currentActive.length} ativa(s) + ${futureDatesToBook.length} nova(s) totalizam ${totalActiveAfter}, acima do máximo de ${rules.maxReservasAtivas} permitida(s) para ${boatLabel}.`
      );
    }
  }

  // 2. Restrições de dia da semana / antecedência e cota de fim de semana
  const simulatedReservations = [...(reservations || [])];

  for (const d of uniqueDates) {
    const dateRestr = evaluateDateRestrictionsForClient({
      dateStr: d,
      todayStr,
      boat,
    });
    if (!dateRestr.allowed && dateRestr.reason) {
      warnings.push(`Data ${formatDateBR(d)}: ${dateRestr.reason}`);
    }

    const weekendEval = evaluateWeekendBookingForClient({
      userId: clientId,
      embarcacaoId,
      dateStr: d,
      reservations: simulatedReservations,
      boat,
    });

    if (weekendEval.isWeekend) {
      if (!weekendEval.allowed && weekendEval.blockedReason) {
        warnings.push(`Regra de Fim de Semana (${formatDateBR(d)}): ${weekendEval.blockedReason}`);
      } else if (weekendEval.tipoReserva === 'extra') {
        warnings.push(
          `Excesso de cota de FDS (${formatDateBR(d)}): O sócio já utilizou sua cota garantida de fim de semana neste mês (no app do cliente esta data seria Reserva EXTRA/contestável).`
        );
      }
      simulatedReservations.push({
        id: `sim_${d}`,
        clienteId: clientId,
        embarcacaoId,
        data: d,
        status: 'agendado',
        tipoReserva: weekendEval.tipoReserva,
      });
    }
  }

  const dedupedWarnings = Array.from(new Set(warnings));
  return {
    hasWarnings: dedupedWarnings.length > 0,
    warnings: dedupedWarnings,
    rulesSummary,
    rules,
  };
}

/**
 * Gera rótulos resumidos e legíveis das regras operacionais vigentes da embarcação.
 */
export function formatBoatRulesSummaryBadges(boat?: Partial<Embarcacao> | null): {
  activeLimitLabel: string;
  weekendRuleLabel: string;
  extraAllowedLabel: string;
  isCustom: boolean;
  rules: RegrasOperacaoEmbarcacao;
} {
  const rules = getBoatOperationRules(boat);
  const isCustom =
    rules.usarPadraoFrota === false ||
    rules.maxReservasAtivas !== DEFAULT_FLEET_RULES.maxReservasAtivas ||
    rules.regraFimDeSemana !== DEFAULT_FLEET_RULES.regraFimDeSemana ||
    rules.permitirReservaExtraFds !== DEFAULT_FLEET_RULES.permitirReservaExtraFds ||
    rules.prazoContestacaoHoras !== DEFAULT_FLEET_RULES.prazoContestacaoHoras ||
    Boolean(rules.antecedenciaMaximaDias) ||
    (Array.isArray(rules.diasSemanaBloqueados) && rules.diasSemanaBloqueados.length > 0) ||
    (rules.taxaDescidaAvulsaPersonalizada !== null &&
      rules.taxaDescidaAvulsaPersonalizada !== undefined);

  const activeLimitLabel =
    rules.maxReservasAtivas === 1
      ? 'Máx. 1 reserva ativa por vez'
      : `Máx. ${rules.maxReservasAtivas} reservas ativas`;

  let weekendRuleLabel = 'FDS: 1 Sáb + 1 Dom/mês';
  if (rules.regraFimDeSemana === 'sabado_ou_domingo') {
    weekendRuleLabel = rules.permitirReservaExtraFds
      ? 'FDS: 1 Sáb OU 1 Dom/mês'
      : 'FDS: 1 Sáb OU 1 Dom/mês (2º bloqueado)';
  } else if (rules.regraFimDeSemana === 'personalizado') {
    const qty = rules.maxFdsGarantidosMes || 1;
    weekendRuleLabel = `FDS: ${qty} dia(s)/mês${rules.permitirReservaExtraFds ? '' : ' (2º bloqueado)'}`;
  } else if (!rules.permitirReservaExtraFds) {
    weekendRuleLabel = 'FDS: 1 Sáb + 1 Dom/mês (Extra bloqueada)';
  }

  const extraAllowedLabel = rules.permitirReservaExtraFds
    ? `Suplência/Extra permitida (${rules.prazoContestacaoHoras}h)`
    : 'Sem reserva extra de FDS';

  return {
    activeLimitLabel,
    weekendRuleLabel,
    extraAllowedLabel,
    isCustom,
    rules,
  };
}
