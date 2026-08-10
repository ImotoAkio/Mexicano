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
