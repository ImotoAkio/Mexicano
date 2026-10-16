/**
 * Utilitários para o módulo de UTV (Veículo de Trilha Off-Road)
 * Baseado nas regras operacionais de utv.md
 */

/**
 * Converte valor decimal de horas de motor para representação com horas e minutos.
 * Regra: Cada 0,1 h equivale a 6 minutos de uso (ex: 2.2 h = 2 horas e 12 minutos).
 */
export function formatHorimetroDecimal(valorHoras?: number | null): string {
  if (valorHoras === null || valorHoras === undefined || isNaN(valorHoras)) {
    return '0.0 h (0min)';
  }

  const h = Number(valorHoras);
  const totalMinutos = Math.round(h * 60);
  const horasInteiras = Math.floor(totalMinutos / 60);
  const minutosRestantes = totalMinutos % 60;

  const decimalFormat = h.toFixed(1);

  if (horasInteiras === 0) {
    return `${decimalFormat} h (${minutosRestantes}min)`;
  }

  return `${decimalFormat} h (${horasInteiras}h ${minutosRestantes.toString().padStart(2, '0')}min)`;
}

/**
 * Formata quilometragem em formato brasileiro
 */
export function formatKm(km?: number | null): string {
  if (km === null || km === undefined || isNaN(km)) return '0 km';
  return `${Number(km).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

/**
 * Calcula a diferença entre valor final e inicial garantindo no mínimo 0
 */
export function calcularDelta(inicial?: number | null, final?: number | null): number {
  const ini = Number(inicial) || 0;
  const fim = Number(final) || 0;
  const delta = fim - ini;
  return delta >= 0 ? Math.round(delta * 100) / 100 : 0;
}

/**
 * Formata moeda BRL
 */
export function formatCurrencyBRL(val?: number | null): string {
  return (Number(val) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

/**
 * Formata data ISO para PT-BR
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
