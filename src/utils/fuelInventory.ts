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

export async function saveFuelInventory(inv: FuelInventory): Promise<void> {
  inv.ultimaAtualizacao = new Date().toLocaleDateString('pt-BR');
  localStorage.setItem('marina_fuel_inventory', JSON.stringify(inv));

  // Sync com o servidor / banco de dados
  try {
    const token = localStorage.getItem('admin_token');
    const res = await fetch('/api/fuel/inventory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(inv)
    });
    if (!res.ok) throw new Error("Server error");
  } catch (e) {
    console.warn("Estoque salvo apenas offline (sem conexao com o banco). Sincronizara automaticamente no recarregamento.");
  }
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

export async function saveFuelHistory(history: FuelHistoryEntry[]): Promise<void> {
  localStorage.setItem('marina_fuel_history', JSON.stringify(history));

  // Sync com o servidor / banco de dados
  try {
    const token = localStorage.getItem('admin_token');
    const res = await fetch('/api/fuel/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(history)
    });
    if (!res.ok) throw new Error("Server error");
  } catch (e) {
    console.warn("Historico salvo apenas offline (sem conexao com o banco). Sincronizara no proximo recarregamento.");
  }
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
    const token = localStorage.getItem('admin_token');
    await fetch('/api/fuel/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
  } catch (e) {
    console.error('Erro ao resetar banco no servidor:', e);
  }
}

/**
 * Deduct liters when an embarcação is refueled at the pier
 */
export async function consumeFuelForEmbarcacao(litros: number, barcoNome: string, operador: string): Promise<boolean> {
  if (litros <= 0) return false;
  
  try {
    const token = localStorage.getItem('marina_token') || localStorage.getItem('admin_token');
    const res = await fetch('/api/fuel/consume', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ litros, barcoNome, operador, detalhes: `Abastecimento de ${litros}L na embarcação ${barcoNome}` })
    });
    
    if (!res.ok) {
      const err = await res.json();
      console.error("Erro na API de combustivel:", err);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error("Erro ao chamar API de combustivel:", e);
    return false;
  }
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
