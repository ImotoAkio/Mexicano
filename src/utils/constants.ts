/**
 * Constantes centralizadas da aplicação.
 * Evitar strings hardcoded espalhadas pelos componentes.
 */

// ─── Chaves do LocalStorage ────────────────────────────────────────────────
export const STORAGE_KEYS = {
  ADMIN_TOKEN: 'admin_token',
  ADMIN_USERNAME: 'admin_username',
  ADMIN_ACTIVE_TAB: 'admin_active_tab',
  CLIENT_TOKEN: 'client_token',
  CLIENT_DATA_CACHE: 'client_data_cache',
} as const;

// ─── Taxas e Constantes Financeiras ───────────────────────────────────────
export const FINANCE = {
  /** Taxa de juros diária aproximada (0,0733% ao dia) */
  TAXA_JUROS_DIARIA: 0.000733,
  /** Limite mínimo de valor para gerar cobrança */
  VALOR_MINIMO_COBRANCA: 0.01,
} as const;

export const FUEL_PRICES = {
  dinheiro: 9,
  pix: 9,
  debit: 9,
  credit: 10,
  admin: 13,
} as const;

export type FuelPaymentMethod = keyof typeof FUEL_PRICES;

export const getFuelPrice = (method: string): number => {
  return FUEL_PRICES[method as FuelPaymentMethod] || 9;
};

export const getFuelPaymentLabel = (method: string): string => {
  switch (method) {
    case 'dinheiro': return 'Dinheiro (Caixa Físico)';
    case 'credit': return 'Cartão de Crédito';
    case 'debit': return 'Cartão de Débito';
    case 'admin': return 'Faturado / Administradora';
    case 'pix':
    default: return 'PIX (Digital)';
  }
};

// ─── Configurações de UI ───────────────────────────────────────────────────
export const UI = {
  /** Duração padrão dos toasts em ms */
  TOAST_DURATION_MS: 3000,
  /** Intervalo de polling de dados do cliente em ms */
  CLIENT_POLL_INTERVAL_MS: 15000,
} as const;

// ─── Roles de Usuário ──────────────────────────────────────────────────────
export const USER_ROLES = {
  ADMIN: 'admin',
  MARINA: 'marina',
  MARINA_OPERADOR: 'marina_operador',
  MARINA_GERENTE: 'marina_gerente',
  FINANCEIRO: 'financeiro',
  PECAS_SERVICOS: 'pecas_servicos',
  COMERCIAL: 'comercial',
  CLIENT: 'client',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// ─── Formatação de Nomes de Embarcações ─────────────────────────────────
/**
 * Formata o nome da embarcação para exibição comercial e em documentos.
 * Converte "M00", "M01", "M02", "M-00", "M 00" para "EL MEXICANO 00", "EL MEXICANO 01", etc.
 */
export function formatBoatName(nome?: string): string {
  if (!nome) return '';
  const trimmed = nome.trim();
  const match = trimmed.match(/^M[-_\s]*(\d+)(.*)$/i);
  if (match) {
    const num = match[1];
    const rest = match[2] ? match[2] : '';
    return `EL MEXICANO ${num}${rest}`;
  }
  return trimmed;
}
