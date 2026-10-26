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
  cartao_debito: 9,
  cartao_credito: 10,
  faturado: 13,
} as const;

export type FuelPaymentMethod = keyof typeof FUEL_PRICES;

export const getFuelPrice = (method: string): number => {
  return FUEL_PRICES[method as FuelPaymentMethod] || 9;
};

export const getFuelPaymentLabel = (method: string): string => {
  switch (method) {
    case 'dinheiro': return 'Dinheiro (Caixa Físico)';
    case 'cartao_credito': return 'Cartão de Crédito';
    case 'cartao_debito': return 'Cartão de Débito';
    case 'faturado': return 'Faturado / Administradora';
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

// ─── Entidade Interna El Mexicano (Cotista Padrão / Estoque Comercial) ────────
export const MEXICANO_INTERNAL_CLIENT_ID = 'cli_112';
export const DEFAULT_MEXICANO_CLIENT_ID = MEXICANO_INTERNAL_CLIENT_ID;
export const MEXICANO_INTERNAL_CLIENT_NAME = 'MEXICANO LANCHAS LTDA';
export const MEXICANO_INTERNAL_DISPLAY_NAME = 'El Mexicano';

/**
 * Verifica se um determinado ID ou nome refere-se à entidade interna El Mexicano.
 */
export function isInternalMexicano(clienteIdOrNome?: string | null): boolean {
  if (!clienteIdOrNome) return false;
  const s = String(clienteIdOrNome).trim().toLowerCase();
  return (
    s === 'cli_112' ||
    s === 'cli_mexicano_internal' ||
    s === 'mexicano lanchas ltda' ||
    s === 'mexicano lanchas' ||
    s === 'el mexicano' ||
    s === 'mexicano' ||
    s.includes('mexicano lanchas')
  );
}

export const isMexicanoClient = (clientOrId?: any): boolean => {
  if (!clientOrId) return false;
  if (typeof clientOrId === 'string') return isInternalMexicano(clientOrId);
  return isInternalMexicano(clientOrId.id) || isInternalMexicano(clientOrId.nome);
};

// ─── Formatação de Nomes de Embarcações ─────────────────────────────────
/**
 * Formata o nome da embarcação para exibição comercial e em documentos.
 * Converte "M00", "M01", "M02", "M-00", "M 00" para "EL MEXICANO 00", "EL MEXICANO 01", etc.
 */
export function formatBoatName(nome?: any): string {
  if (nome === null || nome === undefined) return '';
  // Se for passado um objeto com propriedade nome (ex: objeto Embarcacao)
  const raw = typeof nome === 'object' && nome !== null && 'nome' in nome ? (nome as any).nome : nome;
  if (raw === null || raw === undefined) return '';
  const str = typeof raw === 'string' ? raw : String(raw);
  const trimmed = str.trim();
  const match = trimmed.match(/^M[-_\s]*(\d+)(.*)$/i);
  if (match) {
    const num = match[1];
    const rest = match[2] ? match[2] : '';
    return `EL MEXICANO ${num}${rest}`;
  }
  return trimmed;
}
