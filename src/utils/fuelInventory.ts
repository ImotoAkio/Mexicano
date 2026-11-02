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
  const token = localStorage.getItem('marina_token') || localStorage.getItem('admin_token');
  const res = await fetch('/api/fuel/inventory', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(inv)
  });
  if (!res.ok) {
    console.warn("Estoque salvo apenas offline (sem conexao com o banco).");
    throw new Error("Falha ao sincronizar inventário no banco de dados.");
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
  const token = localStorage.getItem('marina_token') || localStorage.getItem('admin_token');
  const res = await fetch('/api/fuel/history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(history)
  });
  if (!res.ok) {
    console.warn("Historico salvo apenas offline (sem conexao com o banco).");
    throw new Error("Falha ao sincronizar histórico no banco de dados.");
  }
}

export async function addFuelHistoryEntry(entry: Omit<FuelHistoryEntry, 'id' | 'dataHora'>): Promise<FuelHistoryEntry> {
  const history = getFuelHistory();
  const newEntry: FuelHistoryEntry = {
    ...entry,
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    dataHora: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };
  const updatedHistory = [newEntry, ...history];
  await saveFuelHistory(updatedHistory);
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
    const token = localStorage.getItem('marina_token') || localStorage.getItem('admin_token');
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
    
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data && data.novoEstoque) {
        localStorage.setItem('marina_fuel_inventory', JSON.stringify(data.novoEstoque));
        window.dispatchEvent(new CustomEvent('marina_fuel_inventory_updated', { detail: data.novoEstoque }));
      }
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      console.error("Erro na API de combustivel:", err);
    }
  } catch (e) {
    console.error("Erro ao chamar API de combustivel:", e);
  }

  // Fallback offline caso API falhe
  try {
    const current = getFuelInventory();
    let remaining = litros;
    let parcial = Number(current.galaoParcialLitros || 0);
    let galoes = Number(current.galoesPierQuantidade || 0);
    const cap = Number(current.galoesCapacidadeLitros || 20);

    if (parcial > 0) {
      if (parcial >= remaining) {
        parcial -= remaining;
        remaining = 0;
      } else {
        remaining -= parcial;
        parcial = 0;
      }
    }

    if (remaining > 0) {
      const needed = Math.ceil(remaining / cap);
      galoes -= needed;
      parcial = (needed * cap) - remaining;
      remaining = 0;
    }

    current.galaoParcialLitros = Math.round(parcial * 100) / 100;
    current.galoesPierQuantidade = galoes;
    current.ultimaAtualizacao = new Date().toLocaleDateString('pt-BR');

    localStorage.setItem('marina_fuel_inventory', JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('marina_fuel_inventory_updated', { detail: current }));
    return true;
  } catch (localErr) {
    console.error("Erro no fallback de combustível:", localErr);
    return false;
  }
}

/**
 * Restore liters to pier galões (e.g. cancellation or reduction)
 */
export async function restoreFuelForEmbarcacao(litros: number, motivo: string, operador?: string): Promise<boolean> {
  if (litros <= 0) return false;

  try {
    const token = localStorage.getItem('marina_token') || localStorage.getItem('admin_token');
    const res = await fetch('/api/fuel/restore', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ litros, motivo, operador })
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data && data.novoEstoque) {
        localStorage.setItem('marina_fuel_inventory', JSON.stringify(data.novoEstoque));
        window.dispatchEvent(new CustomEvent('marina_fuel_inventory_updated', { detail: data.novoEstoque }));
      }
      return true;
    }
  } catch (e) {
    console.error("Erro ao estornar combustível:", e);
  }

  // Fallback offline
  try {
    const current = getFuelInventory();
    const cap = Number(current.galoesCapacidadeLitros || 20);
    const total = (Number(current.galoesPierQuantidade || 0) * cap) + Number(current.galaoParcialLitros || 0) + litros;
    current.galoesPierQuantidade = Math.floor(total / cap);
    current.galaoParcialLitros = Math.round((total % cap) * 100) / 100;
    current.ultimaAtualizacao = new Date().toLocaleDateString('pt-BR');
    localStorage.setItem('marina_fuel_inventory', JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('marina_fuel_inventory_updated', { detail: current }));
    return true;
  } catch (localErr) {
    console.error("Erro no fallback de estorno de combustível:", localErr);
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
