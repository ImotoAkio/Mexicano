export interface FuelInventory {
  tanquePrincipalLitros: number;
  tanqueCapacidadeMaxima: number;
  alertaMinimoTanque: number;
  
  galoesPierQuantidade: number; // Qtd de galões de 20L cheios
  galoesCapacidadeLitros: number; // Padrão 20L
  galaoParcialLitros: number; // Litros em galão aberto
  
  ultimaAtualizacao: string;
}

export interface FuelHistoryEntry {
  id: string;
  tipo: 'compra_tanque' | 'compra_galoes' | 'transferencia_tanque_pier' | 'abastecimento_embarcacao' | 'fechamento_turno' | 'ajuste_manual';
  litros: number;
  galoes?: number;
  fornecedor?: string;
  notaFiscal?: string;
  valorTotal?: number;
  barcoNome?: string;
  operador: string;
  dataHora: string;
  detalhes?: string;
  diferencaLitros?: number;
}

export const EMPTY_INVENTORY: FuelInventory = {
  tanquePrincipalLitros: 0,
  tanqueCapacidadeMaxima: 1000,
  alertaMinimoTanque: 200,
  
  galoesPierQuantidade: 0,
  galoesCapacidadeLitros: 20,
  galaoParcialLitros: 0,
  
  ultimaAtualizacao: new Date().toLocaleDateString('pt-BR')
};

export function getFuelInventory(): FuelInventory {
  const saved = localStorage.getItem('marina_fuel_inventory');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          tanquePrincipalLitros: Number(parsed.tanquePrincipalLitros ?? EMPTY_INVENTORY.tanquePrincipalLitros),
          tanqueCapacidadeMaxima: Number(parsed.tanqueCapacidadeMaxima || EMPTY_INVENTORY.tanqueCapacidadeMaxima),
          alertaMinimoTanque: Number(parsed.alertaMinimoTanque || EMPTY_INVENTORY.alertaMinimoTanque),
          galoesPierQuantidade: Number(parsed.galoesPierQuantidade ?? EMPTY_INVENTORY.galoesPierQuantidade),
          galoesCapacidadeLitros: Number(parsed.galoesCapacidadeLitros || 20),
          galaoParcialLitros: Number(parsed.galaoParcialLitros ?? 0),
          ultimaAtualizacao: parsed.ultimaAtualizacao || new Date().toLocaleDateString('pt-BR')
        };
      }
    } catch (e) {
      console.error('Erro ao ler estoque de combustivel:', e);
    }
  }
  return { ...EMPTY_INVENTORY };
}

export function saveFuelInventory(inv: FuelInventory): void {
  inv.ultimaAtualizacao = new Date().toLocaleDateString('pt-BR');
  localStorage.setItem('marina_fuel_inventory', JSON.stringify(inv));

  // Sync com o servidor / banco de dados
  fetch('/api/fuel/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inv)
  }).catch(() => {});
}

export function getFuelHistory(): FuelHistoryEntry[] {
  const saved = localStorage.getItem('marina_fuel_history');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao ler historico de combustivel:', e);
    }
  }
  return [];
}

export function saveFuelHistory(history: FuelHistoryEntry[]): void {
  localStorage.setItem('marina_fuel_history', JSON.stringify(history));

  // Sync com o servidor / banco de dados
  fetch('/api/fuel/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(history)
  }).catch(() => {});
}

export function addFuelHistoryEntry(entry: Omit<FuelHistoryEntry, 'id' | 'dataHora'>): FuelHistoryEntry {
  const history = getFuelHistory();
  const newEntry: FuelHistoryEntry = {
    ...entry,
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    dataHora: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };
  const updatedHistory = [newEntry, ...history];
  saveFuelHistory(updatedHistory);
  return newEntry;
}

/**
 * Reseta e zera completamente todas as informações no localStorage e banco de dados para testes.
 */
export async function resetFuelDataToZero(): Promise<void> {
  localStorage.setItem('marina_fuel_inventory', JSON.stringify(EMPTY_INVENTORY));
  localStorage.setItem('marina_fuel_history', JSON.stringify([]));
  localStorage.removeItem('marina_tanks_config');
  localStorage.removeItem('marina_tanks_history');

  try {
    await fetch('/api/fuel/reset', { method: 'POST' });
  } catch (e) {
    console.error('Erro ao resetar banco no servidor:', e);
  }
}

/**
 * Deduct liters when an embarcação is refueled at the pier
 */
export function consumeFuelForEmbarcacao(litros: number, barcoNome: string, operador: string): boolean {
  if (litros <= 0) return false;
  
  const inv = getFuelInventory();
  let remainingToDeduct = litros;
  
  // 1. Deduz do galão parcial aberto primeiro se houver
  if (inv.galaoParcialLitros > 0) {
    if (inv.galaoParcialLitros >= remainingToDeduct) {
      inv.galaoParcialLitros -= remainingToDeduct;
      remainingToDeduct = 0;
    } else {
      remainingToDeduct -= inv.galaoParcialLitros;
      inv.galaoParcialLitros = 0;
    }
  }
  
  // 2. Se sobrou valor para deduzir, abre galões cheios de 20L
  if (remainingToDeduct > 0) {
    const galoesNecessarios = Math.ceil(remainingToDeduct / inv.galoesCapacidadeLitros);
    if (inv.galoesPierQuantidade >= galoesNecessarios) {
      inv.galoesPierQuantidade -= galoesNecessarios;
      const litrosExtraidos = galoesNecessarios * inv.galoesCapacidadeLitros;
      const sobraNoUltimoGalao = litrosExtraidos - remainingToDeduct;
      inv.galaoParcialLitros = sobraNoUltimoGalao;
      remainingToDeduct = 0;
    } else {
      // Caso limite: Consome todos os galões cheios disponíveis e deixa residual
      const litrosDisponiveisNosGaloes = inv.galoesPierQuantidade * inv.galoesCapacidadeLitros;
      remainingToDeduct -= litrosDisponiveisNosGaloes;
      inv.galoesPierQuantidade = 0;
      inv.galaoParcialLitros = 0;
      
      // Se não havia galões suficientes no píer, consome direto do Tanque Principal como fallback emergencial
      inv.tanquePrincipalLitros = Math.max(0, inv.tanquePrincipalLitros - remainingToDeduct);
    }
  }
  
  saveFuelInventory(inv);
  addFuelHistoryEntry({
    tipo: 'abastecimento_embarcacao',
    litros,
    barcoNome,
    operador,
    detalhes: `Abastecimento de ${litros}L na embarcação ${barcoNome}`
  });
  
  return true;
}

/**
 * Total fuel in Litros = Main Tank + (Galoes * 20) + Parcial
 */
export function getEstoqueTotalLitros(inv?: FuelInventory | null): number {
  if (!inv) return 0;
  const t = Number(inv.tanquePrincipalLitros || 0);
  const g = Number(inv.galoesPierQuantidade || 0);
  const cap = Number(inv.galoesCapacidadeLitros || 20);
  const p = Number(inv.galaoParcialLitros || 0);
  return t + (g * cap) + p;
}
