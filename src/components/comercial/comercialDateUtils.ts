export type PeriodFilterType = '30d' | 'mes_atual' | 'mes_anterior' | 'trimestre' | 'ano';

export interface DashboardPeriodInfo {
  key: PeriodFilterType;
  label: string;
  range: string;
  startDate: Date;
  endDate: Date;
  prevStartDate: Date;
  prevEndDate: Date;
}

export function computePeriodInfo(key: PeriodFilterType, now = new Date()): DashboardPeriodInfo {
  const pad = (n: number) => String(n).padStart(2, '0');
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mesesFull = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const fmtDate = (d: Date) => `${pad(d.getDate())} ${meses[d.getMonth()]} ${d.getFullYear()}`;

  let startDate: Date;
  let endDate: Date;
  let prevStartDate: Date;
  let prevEndDate: Date;
  let label = '';

  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (key) {
    case 'mes_atual': {
      startDate = new Date(y, m, 1, 0, 0, 0, 0);
      endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
      prevStartDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
      prevEndDate = new Date(y, m, 0, 23, 59, 59, 999);
      label = `Este Mês (${mesesFull[m]} ${y})`;
      break;
    }
    case 'mes_anterior': {
      startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
      endDate = new Date(y, m, 0, 23, 59, 59, 999);
      prevStartDate = new Date(y, m - 2, 1, 0, 0, 0, 0);
      prevEndDate = new Date(y, m - 1, 0, 23, 59, 59, 999);
      label = `Mês Anterior (${mesesFull[startDate.getMonth()]} ${startDate.getFullYear()})`;
      break;
    }
    case 'trimestre': {
      startDate = new Date(y, m - 2, 1, 0, 0, 0, 0);
      endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
      prevStartDate = new Date(y, m - 5, 1, 0, 0, 0, 0);
      prevEndDate = new Date(y, m - 2, 0, 23, 59, 59, 999);
      label = 'Último Trimestre';
      break;
    }
    case 'ano': {
      startDate = new Date(y, 0, 1, 0, 0, 0, 0);
      endDate = new Date(y, 11, 31, 23, 59, 59, 999);
      prevStartDate = new Date(y - 1, 0, 1, 0, 0, 0, 0);
      prevEndDate = new Date(y - 1, 11, 31, 23, 59, 59, 999);
      label = `Ano de ${y}`;
      break;
    }
    case '30d':
    default: {
      endDate = new Date(y, m, d, 23, 59, 59, 999);
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      prevEndDate = new Date(startDate.getTime() - 1);
      prevStartDate = new Date(prevEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevStartDate.setHours(0, 0, 0, 0);
      label = 'Últimos 30 dias';
      break;
    }
  }

  const range = `${fmtDate(startDate)} – ${fmtDate(endDate)}`;

  return {
    key,
    label,
    range,
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
  };
}

/**
 * Normaliza qualquer data string/Date e checa se cai no intervalo [start, end]
 */
export function isDateInRange(val: any, start: Date, end: Date): boolean {
  if (!val) return false;
  // Se for apenas data YYYY-MM-DD
  const dateStr = String(val);
  const t = dateStr.length === 10 ? new Date(`${dateStr}T12:00:00`).getTime() : new Date(val).getTime();
  if (isNaN(t)) return false;
  return t >= start.getTime() && t <= end.getTime();
}

/**
 * Calcula variação percentual real entre período atual e anterior
 */
export function calculateDelta(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) {
    if (current > 0) return { value: '+100%', positive: true };
    return { value: '0,0%', positive: true };
  }
  const diff = current - previous;
  const pct = (diff / previous) * 100;
  const sign = pct >= 0 ? '+' : '';
  return {
    value: `${sign}${pct.toFixed(1).replace('.', ',')}%`,
    positive: pct >= 0,
  };
}
