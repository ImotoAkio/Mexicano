import { Cliente, Embarcacao } from '../types';

export const DEFAULT_TOTAL_COTAS = 8;
export const COTAS_LIST = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'];

/**
 * Tenta extrair um código explícito de cota no padrão "C1", "C2", ..., "C99".
 * Retorna null caso o valor seja genérico/legado (ex: "1/4", "1/8", "25%", "Cota", "").
 */
export function parseExplicitCotaCode(raw?: string | number | null): string | null {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim().toUpperCase();
  if (!str) return null;

  // Ignorar frações ou percentuais legados ("1/4", "1/8", "25%", "100%", "COTA")
  if (str.includes('/') || str.includes('%') || str === 'COTA' || str === 'N/A') {
    return null;
  }

  // Padrão explícito: "C1", "C01", "C-1", "COTA 1", "COTA 02"
  const matchC = str.match(/^(?:COTA|C)[\s\-_]*0*(\d+)$/i);
  if (matchC) {
    const num = parseInt(matchC[1], 10);
    if (num > 0 && num <= 64) return `C${num}`;
  }

  // Apenas número inteiro ("1", "01", "2")
  if (/^0*\d+$/.test(str)) {
    const num = parseInt(str, 10);
    if (num > 0 && num <= 64) return `C${num}`;
  }

  return null;
}

/**
 * Normaliza qualquer string de cota para o padrão "C1", "C2", etc.
 * Se o valor for legado ("1/4", "Cota", vazio), usa o fallbackSlot (padrão: 1 -> "C1").
 */
export function normalizeCotaCode(raw?: string | number | null, fallbackSlot = 1): string {
  const explicit = parseExplicitCotaCode(raw);
  if (explicit) return explicit;
  const safeSlot = Math.max(1, Math.floor(Number(fallbackSlot) || 1));
  return `C${safeSlot}`;
}

/**
 * Retorna o total de cotas configurado para a embarcação (padrão 8),
 * garantindo que nunca seja menor que a quantidade de cotas já ocupadas.
 */
export function getBoatTotalCotas(
  boat?: Partial<Embarcacao> | null,
  occupiedCount = 0
): number {
  const configured = Number((boat as any)?.totalCotas);
  const base = !isNaN(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_TOTAL_COTAS;
  return Math.max(base, occupiedCount);
}

/**
 * Gera a lista sequencial de códigos de cota de uma embarcação: ['C1', 'C2', ..., 'CN'].
 */
export function getBoatCotasList(
  boat?: Partial<Embarcacao> | number | null,
  occupiedCount = 0
): string[] {
  const total =
    typeof boat === 'number'
      ? Math.max(1, Math.floor(boat))
      : getBoatTotalCotas(boat, occupiedCount);
  return Array.from({ length: total }, (_, idx) => `C${idx + 1}`);
}

export interface CotaOccupantInfo {
  cota: string;
  clienteId: string;
  clienteNome: string;
  cliente: Cliente;
}

/**
 * Constrói o mapa oficial de ocupação de cotas (C1..CN) de uma embarcação.
 * - Respeita todas as cotas explícitas (C1, C2...) já atribuídas aos clientes ativos,
 *   inclusive múltiplas cotas do mesmo cliente no mesmo barco.
 * - Converte automaticamente vínculos legados ("1/4", "Cota", sem código) alocando-os
 *   nas primeiras vagas livres (C1, C2...) de forma determinística.
 */
export function getBoatCotaOccupancyMap(
  boatId: string,
  clients: Cliente[],
  boat?: Partial<Embarcacao> | null
): Map<string, CotaOccupantInfo> {
  const map = new Map<string, CotaOccupantInfo>();
  if (!boatId) return map;

  const activeClients = clients.filter(c => c.status !== 'inativo');
  const pendingLegacyEntries: Cliente[] = [];

  // Passada 1: Registrar todas as cotas que já possuem código explícito (C1, C2...)
  activeClients.forEach(c => {
    const entriesForBoat = Array.isArray(c.embarcacoes)
      ? c.embarcacoes.filter(eb => eb && eb.embarcacaoId === boatId)
      : [];

    if (entriesForBoat.length > 0) {
      entriesForBoat.forEach(eb => {
        const explicit = parseExplicitCotaCode(eb.cota);
        if (explicit && !map.has(explicit)) {
          map.set(explicit, {
            cota: explicit,
            clienteId: c.id,
            clienteNome: c.nome,
            cliente: c
          });
        } else {
          pendingLegacyEntries.push(c);
        }
      });
    } else if (c.embarcacaoId === boatId) {
      const explicit = parseExplicitCotaCode(c.cota);
      if (explicit && !map.has(explicit)) {
        map.set(explicit, {
          cota: explicit,
          clienteId: c.id,
          clienteNome: c.nome,
          cliente: c
        });
      } else {
        pendingLegacyEntries.push(c);
      }
    } else if (Array.isArray(boat?.donos) && boat!.donos!.includes(c.id)) {
      pendingLegacyEntries.push(c);
    }
  });

  // Passada 2: Alocar entradas legadas ("1/4", "Cota", etc.) nas primeiras cotas livres
  let nextSlot = 1;
  pendingLegacyEntries.forEach(c => {
    while (map.has(`C${nextSlot}`)) {
      nextSlot++;
    }
    const assignedCode = `C${nextSlot}`;
    map.set(assignedCode, {
      cota: assignedCode,
      clienteId: c.id,
      clienteNome: c.nome,
      cliente: c
    });
    nextSlot++;
  });

  return map;
}

/**
 * Retorna a primeira cota livre ("C1", "C2", ...) para a embarcação informada.
 */
export function getFirstAvailableCota(
  boatId: string,
  clients: Cliente[],
  boat?: Partial<Embarcacao> | null
): string {
  if (!boatId) return 'C1';
  const occupiedMap = getBoatCotaOccupancyMap(boatId, clients, boat);
  const total = getBoatTotalCotas(boat, occupiedMap.size);
  for (let i = 1; i <= total; i++) {
    const code = `C${i}`;
    if (!occupiedMap.has(code)) return code;
  }
  return `C${total + 1}`;
}

/**
 * Retorna a lista ordenada de códigos de cota ("C1", "C2"...) que um cliente possui em uma embarcação.
 */
export function getClientCotasForBoat(
  client: Partial<Cliente> | null | undefined,
  boatId: string,
  allClients?: Cliente[],
  boat?: Partial<Embarcacao> | null
): string[] {
  if (!client || !boatId) return [];

  if (allClients && client.id) {
    const occupiedMap = getBoatCotaOccupancyMap(boatId, allClients, boat);
    const list: string[] = [];
    occupiedMap.forEach((info, code) => {
      if (info.clienteId === client.id) list.push(code);
    });
    if (list.length > 0) {
      return list.sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return na - nb;
      });
    }
  }

  const codes: string[] = [];
  if (Array.isArray(client.embarcacoes)) {
    client.embarcacoes
      .filter(eb => eb && eb.embarcacaoId === boatId)
      .forEach((eb, idx) => {
        const code = normalizeCotaCode(eb.cota, idx + 1);
        if (!codes.includes(code)) codes.push(code);
      });
  }
  if (codes.length === 0 && client.embarcacaoId === boatId) {
    codes.push(normalizeCotaCode(client.cota, 1));
  }

  return codes.sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });
}

/**
 * Normaliza a lista de clientes em memória para garantir que nenhum cliente fique com "1/4" ou "Cota"
 * e todos usem códigos padronizados C1, C2, C3...
 */
export function normalizeClientsCotasInPlace(clients: Cliente[], boats: Embarcacao[] = []): void {
  const boatsMap = new Map<string, Embarcacao>();
  boats.forEach(b => boatsMap.set(b.id, b));

  // Mapa de slots já ocupados por embarcação
  const occupiedByBoat = new Map<string, Set<string>>();
  const getOccupiedSet = (boatId: string) => {
    if (!occupiedByBoat.has(boatId)) occupiedByBoat.set(boatId, new Set());
    return occupiedByBoat.get(boatId)!;
  };

  // 1ª Passada: registrar todos os códigos explícitos já válidos (C1, C2...)
  clients.forEach(c => {
    if (c.status === 'inativo') return;
    if (Array.isArray(c.embarcacoes) && c.embarcacoes.length > 0) {
      c.embarcacoes.forEach(eb => {
        if (!eb?.embarcacaoId) return;
        const explicit = parseExplicitCotaCode(eb.cota);
        if (explicit) {
          eb.cota = explicit;
          getOccupiedSet(eb.embarcacaoId).add(explicit);
        }
      });
    } else if (c.embarcacaoId) {
      const explicit = parseExplicitCotaCode(c.cota);
      if (explicit) {
        c.cota = explicit;
        getOccupiedSet(c.embarcacaoId).add(explicit);
      }
    }
  });

  // 2ª Passada: converter valores legados ("1/4", "Cota", vazios) para o próximo C1..CN livre daquele barco
  const allocateNextFree = (boatId: string): string => {
    if (!boatId) return 'C1';
    const set = getOccupiedSet(boatId);
    let slot = 1;
    while (set.has(`C${slot}`)) {
      slot++;
    }
    const code = `C${slot}`;
    set.add(code);
    return code;
  };

  clients.forEach(c => {
    if (Array.isArray(c.embarcacoes) && c.embarcacoes.length > 0) {
      c.embarcacoes.forEach(eb => {
        if (!eb?.embarcacaoId) {
          eb.cota = normalizeCotaCode(eb?.cota, 1);
          return;
        }
        const explicit = parseExplicitCotaCode(eb.cota);
        if (explicit) {
          eb.cota = explicit;
        } else {
          eb.cota = allocateNextFree(eb.embarcacaoId);
        }
      });
      // Sincronizar campos primários com o primeiro item
      c.embarcacaoId = c.embarcacoes[0].embarcacaoId;
      c.cota = c.embarcacoes[0].cota;
    } else if (c.embarcacaoId) {
      const explicit = parseExplicitCotaCode(c.cota);
      c.cota = explicit || allocateNextFree(c.embarcacaoId);
      c.embarcacoes = [{ embarcacaoId: c.embarcacaoId, cota: c.cota }];
    } else if (c.cota) {
      c.cota = normalizeCotaCode(c.cota, 1);
    }
  });
}
