import { Cliente, Embarcacao, Reserva, Manutencao, Chamado, TipoManutencao, Funcionario, Folga, Mecanico, EpiEntrega, CatalogoEpi, HistoricoEPIMensal, RegistroHoras, RegistroAcessorios } from './types';

// In-Memory Database Arrays (No LocalStorage)
let memoryClients: Cliente[] = [];
let memoryBoats: Embarcacao[] = [];
let memoryReservations: Reserva[] = [];
let memoryManutencoes: Manutencao[] = [];
let memoryChamados: Chamado[] = [];
let memoryMecanicos: Mecanico[] = [];
let memoryFuncionarios: Funcionario[] = [];
let memoryFolgas: Folga[] = [];
let memoryEpis: EpiEntrega[] = [];
let memoryCatalogoEpis: CatalogoEpi[] = [];
let memoryHistoricoEpis: HistoricoEPIMensal[] = [];
let memoryRegistrosAtividades: any[] = [];

export let isDbLoaded = false;
export let isDbLoadAttempted = false;

// Helper: Get admin JWT token for authenticated API calls
export function getAdminToken(): string | null {
  return localStorage.getItem('admin_token') || localStorage.getItem('client_token');
}

const pendingSaves: Promise<any>[] = [];

// Shared remote background synchronizer helper (with JWT auth)
async function saveToRemoteDB(type: 'clients' | 'boats' | 'reservations' | 'manutencoes', action: 'create' | 'update' | 'delete', data: any) {
  const p = (async () => {
    try {
      const token = getAdminToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/db/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, action, data })
      });
      if (!res.ok) {
        console.warn(`[Remote DB Sync Error] Failed to ${action} ${type} on server.`);
      }
    } catch (err) {
      console.warn(`[Remote DB Connection Error] Could not reach server to ${action} ${type}:`, err);
    }
  })();
  
  pendingSaves.push(p);
  try {
    await p;
  } finally {
    const idx = pendingSaves.indexOf(p);
    if (idx !== -1) pendingSaves.splice(idx, 1);
  }
}

// Client DB Operations
export const clientDB = {
  getAll: (): Cliente[] => {
    return memoryClients;
  },
  getById: (id: string): Cliente | undefined => {
    return memoryClients.find(c => c.id === id);
  },
  create: (cliente: (Omit<Cliente, 'id' | 'dataCadastro'> & { id?: string; dataCadastro?: string }) | Cliente): Cliente => {
    const newClient: Cliente = {
      status: 'ativo',
      ...cliente,
      id: (cliente as any).id || `cli_${Date.now()}`,
      dataCadastro: (cliente as any).dataCadastro || new Date().toISOString()
    };
    memoryClients.push(newClient);

    // Also link the owner to the boats
    const targetBoatsList = cliente.embarcacoes && cliente.embarcacoes.length > 0
      ? cliente.embarcacoes.map(eb => eb.embarcacaoId)
      : [cliente.embarcacaoId];

    let boatsChanged = false;
    memoryBoats.forEach(b => {
      if (targetBoatsList.includes(b.id)) {
        if (!b.donos.includes(newClient.id)) {
          b.donos.push(newClient.id);
          boatsChanged = true;
        }
      }
    });

    // Save client record to VPS remote database
    saveToRemoteDB('clients', 'create', newClient);
    
    // Also save ownership links to boats in VPS database
    if (boatsChanged) {
      memoryBoats.forEach(b => {
        if (targetBoatsList.includes(b.id)) {
          saveToRemoteDB('boats', 'update', b);
        }
      });
    }

    return newClient;
  },
  update: (id: string, updatedFields: Partial<Omit<Cliente, 'id' | 'dataCadastro'>>): Cliente => {
    const idx = memoryClients.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Cliente não encontrado.');
    
    const oldClient = memoryClients[idx];
    const oldBoatsList = oldClient.embarcacoes && oldClient.embarcacoes.length > 0
      ? oldClient.embarcacoes.map(eb => eb.embarcacaoId)
      : [oldClient.embarcacaoId];

    const updatedClient = { ...oldClient, ...updatedFields };
    memoryClients[idx] = updatedClient;

    // Update boat ownerships
    const newBoatsList = updatedClient.embarcacoes && updatedClient.embarcacoes.length > 0
      ? updatedClient.embarcacoes.map(eb => eb.embarcacaoId)
      : [updatedClient.embarcacaoId].filter(id => id);

    // Clean up from old boats if they are not in the new list, and add to new ones
    memoryBoats.forEach(b => {
      const wasOwner = oldBoatsList.includes(b.id);
      const isOwnerNow = newBoatsList.includes(b.id);

      if (wasOwner && !isOwnerNow) {
        b.donos = b.donos.filter(d => d !== id);
      } else if (!wasOwner && isOwnerNow) {
        if (!b.donos.includes(id)) {
          b.donos.push(id);
        }
      }
    });

    // Save client record to VPS remote database
    saveToRemoteDB('clients', 'update', updatedClient);

    // Save modified owners on VPS database or update linked boats
    memoryBoats.forEach(b => {
      const wasOwner = oldBoatsList.includes(b.id);
      const isOwnerNow = newBoatsList.includes(b.id);
      if (wasOwner !== isOwnerNow) {
        saveToRemoteDB('boats', 'update', b);
      }
    });

    return updatedClient;
  },
  activate: (id: string): Cliente => {
    return clientDB.update(id, { status: 'ativo' });
  },
  deactivate: (id: string): Cliente => {
    return clientDB.update(id, { status: 'inativo' });
  },
  toggleStatus: (id: string): Cliente => {
    const c = clientDB.getById(id);
    const newStatus = c?.status === 'inativo' ? 'ativo' : 'inativo';
    return clientDB.update(id, { status: newStatus });
  },
  // Soft-delete to preserve 100% of historical reservations and financial records
  delete: (id: string): void => {
    clientDB.deactivate(id);
  },
  // Permanent delete — removes client record and cleans up boat ownership references
  permanentDelete: (id: string): void => {
    const client = memoryClients.find(c => c.id === id);
    if (!client) throw new Error('Cliente não encontrado.');

    // Remove client from memory
    memoryClients = memoryClients.filter(c => c.id !== id);

    // Clean up boat ownership references
    const modifiedBoatIds = new Set<string>();
    memoryBoats.forEach(b => {
      if (b.donos.includes(id)) {
        b.donos = b.donos.filter(d => d !== id);
        modifiedBoatIds.add(b.id);
      }
    });

    // Sync deletions to remote DB
    saveToRemoteDB('clients', 'delete', { id });
    if (modifiedBoatIds.size > 0) {
      memoryBoats.forEach(b => {
        if (modifiedBoatIds.has(b.id)) {
          saveToRemoteDB('boats', 'update', b);
        }
      });
    }
  }
};

// Boat DB Operations
export const boatDB = {
  getAll: (): Embarcacao[] => {
    return memoryBoats.map(b => {
      return {
        ...b,
      };
    });
  },
  getById: (id: string): Embarcacao | undefined => {
    return boatDB.getAll().find(b => b.id === id);
  },
  create: (boat: (Omit<Embarcacao, 'id'> & { id?: string }) | Embarcacao): Embarcacao => {
    const newBoat: Embarcacao = {
      ...boat,
      id: (boat as any).id || `boat_${Date.now()}`
    };
    memoryBoats.push(newBoat);
    saveToRemoteDB('boats', 'create', newBoat);

    // Sync client records of their ownerships
    let clientsChanged = false;
    if (newBoat.donos && newBoat.donos.length > 0) {
      memoryClients.forEach(c => {
        if (newBoat.donos.includes(c.id)) {
          if (!c.embarcacoes) {
            c.embarcacoes = [];
          }
          if (!c.embarcacoes.some(eb => eb.embarcacaoId === newBoat.id)) {
            c.embarcacoes.push({ embarcacaoId: newBoat.id, cota: '1/4' }); // default cota
            clientsChanged = true;
          }
        }
      });
    }
    
    if (clientsChanged) {
      memoryClients.forEach(c => {
        if (newBoat.donos && newBoat.donos.includes(c.id)) {
          saveToRemoteDB('clients', 'update', c);
        }
      });
    }

    return newBoat;
  },
  update: (id: string, updatedFields: Partial<Omit<Embarcacao, 'id'>>): Embarcacao => {
    const idx = memoryBoats.findIndex(b => b.id === id);
    if (idx === -1) throw new Error('Embarcação não encontrada.');
    const oldBoat = memoryBoats[idx];
    const updatedBoat = { ...oldBoat, ...updatedFields };
    memoryBoats[idx] = updatedBoat;

    // Sync client records of their ownerships
    const modifiedClientIds = new Set<string>();
    if (updatedFields.donos) {
      const newDonos = updatedFields.donos;

      memoryClients.forEach(c => {
        if (!c.embarcacoes) {
          c.embarcacoes = [{ embarcacaoId: c.embarcacaoId, cota: c.cota }];
        }

        const ownsThisBoat = c.embarcacoes.some(eb => eb.embarcacaoId === id);
        const shouldOwnThisBoat = newDonos.includes(c.id);

        if (!ownsThisBoat && shouldOwnThisBoat) {
          c.embarcacoes.push({ embarcacaoId: id, cota: '1/4' }); // default cota
          modifiedClientIds.add(c.id);
        } else if (ownsThisBoat && !shouldOwnThisBoat) {
          c.embarcacoes = c.embarcacoes.filter(eb => eb.embarcacaoId !== id);
          modifiedClientIds.add(c.id);
        }
      });
    }

    saveToRemoteDB('boats', 'update', updatedBoat);
    if (modifiedClientIds.size > 0) {
      memoryClients.forEach(c => {
        if (modifiedClientIds.has(c.id)) {
          saveToRemoteDB('clients', 'update', c);
        }
      });
    }

    return updatedBoat;
  },
  registrarHoras: (
    boatId: string, 
    horas: number, 
    observacao?: string, 
    dataCustom?: string,
    registradoPor?: string
  ): Embarcacao => {
    const boat = memoryBoats.find(b => b.id === boatId);
    if (!boat) throw new Error('Embarcação não encontrada.');

    const timestamp = dataCustom || new Date().toISOString();
    const novoRegistro: RegistroHoras = {
      id: `reg_hr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      embarcacaoId: boatId,
      horas: Number(horas),
      data: timestamp,
      observacao,
      registradoPor,
      createdAt: new Date().toISOString()
    };

    const historicoAtual = boat.historicoHoras || [];
    const novoHistorico = [novoRegistro, ...historicoAtual].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return boatDB.update(boatId, {
      horasMotor: Number(horas),
      ultimaAtualizacaoHoras: timestamp,
      historicoHoras: novoHistorico
    });
  },
  registrarConferenciaAcessorios: (
    boatId: string,
    acessoriosData: {
      tenda?: boolean;
      mesa?: boolean;
      bancosCadeiras?: boolean;
      churrasqueira?: boolean;
      extintores?: boolean;
      observacoes?: string;
    },
    horasMotor?: number,
    dataCustom?: string,
    registradoPor?: string
  ): Embarcacao => {
    const boat = memoryBoats.find(b => b.id === boatId);
    if (!boat) throw new Error('Embarcação não encontrada.');

    const timestamp = dataCustom || new Date().toISOString();
    
    const isFullyEquipped = 
      acessoriosData.tenda !== false && 
      acessoriosData.mesa !== false && 
      acessoriosData.bancosCadeiras !== false && 
      acessoriosData.churrasqueira !== false &&
      acessoriosData.extintores !== false;

    const novoRegistro: RegistroAcessorios = {
      id: `reg_acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      embarcacaoId: boatId,
      data: timestamp,
      horasMotor: horasMotor !== undefined ? Number(horasMotor) : boat.horasMotor,
      tenda: !!acessoriosData.tenda,
      mesa: !!acessoriosData.mesa,
      bancosCadeiras: !!acessoriosData.bancosCadeiras,
      churrasqueira: !!acessoriosData.churrasqueira,
      extintores: !!acessoriosData.extintores,
      observacoes: acessoriosData.observacoes || '',
      statusConferencia: isFullyEquipped ? 'conforme' : 'com_pendencia',
      registradoPor,
      createdAt: new Date().toISOString()
    };

    const historicoAtual = boat.acessorios?.historico || [];
    const novoHistoricoAcc = [novoRegistro, ...historicoAtual].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );

    const updateFields: Partial<Omit<Embarcacao, 'id'>> = {
      acessorios: {
        tenda: !!acessoriosData.tenda,
        mesa: !!acessoriosData.mesa,
        bancosCadeiras: !!acessoriosData.bancosCadeiras,
        churrasqueira: !!acessoriosData.churrasqueira,
        extintores: !!acessoriosData.extintores,
        observacoes: acessoriosData.observacoes || '',
        ultimaConferencia: timestamp,
        historico: novoHistoricoAcc
      }
    };

    if (horasMotor !== undefined && horasMotor !== boat.horasMotor) {
      const autoRegHoras: RegistroHoras = {
        id: `reg_hr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        embarcacaoId: boatId,
        horas: Number(horasMotor),
        data: timestamp,
        observacao: 'Conferência semanal de acessórios e horímetro',
        registradoPor,
        createdAt: new Date().toISOString()
      };
      const historicoHorasAtual = boat.historicoHoras || [];
      updateFields.horasMotor = Number(horasMotor);
      updateFields.ultimaAtualizacaoHoras = timestamp;
      updateFields.historicoHoras = [autoRegHoras, ...historicoHorasAtual].sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      );
    }

    return boatDB.update(boatId, updateFields);
  },
  delete: (id: string): void => {
    memoryBoats = memoryBoats.filter(b => b.id !== id);

    // Delete associated reservations
    const reservationsToDelete = memoryReservations.filter(r => r.embarcacaoId === id);
    memoryReservations = memoryReservations.filter(r => r.embarcacaoId !== id);
    
    // Also update any clients that were linked to this boat
    const modifiedClientIds = new Set<string>();
    memoryClients.forEach(c => {
      if (!c.embarcacoes) {
        c.embarcacoes = [{ embarcacaoId: c.embarcacaoId, cota: c.cota }];
      }
      const hasThisBoat = c.embarcacoes.some(eb => eb.embarcacaoId === id);
      
      if (hasThisBoat) {
        c.embarcacoes = c.embarcacoes.filter(eb => eb.embarcacaoId !== id);
        if (c.embarcacoes.length > 0) {
          c.embarcacaoId = c.embarcacoes[0].embarcacaoId;
          c.cota = c.embarcacoes[0].cota;
        } else {
          c.embarcacaoId = '';
          c.cota = '';
        }
        modifiedClientIds.add(c.id);
      } else if (c.embarcacaoId === id) {
        c.embarcacaoId = '';
        c.cota = '';
        modifiedClientIds.add(c.id);
      }
    });

    saveToRemoteDB('boats', 'delete', { id });
    if (modifiedClientIds.size > 0) {
      memoryClients.forEach(c => {
        if (modifiedClientIds.has(c.id)) {
          saveToRemoteDB('clients', 'update', c);
        }
      });
    }
    if (reservationsToDelete.length > 0) {
      reservationsToDelete.forEach(r => {
        saveToRemoteDB('reservations', 'delete', { id: r.id });
      });
    }
  }
};

// Reservation DB Operations
export const reservationDB = {
  getAll: (): Reserva[] => {
    return memoryReservations;
  },
  getById: (id: string): Reserva | undefined => {
    return memoryReservations.find(r => r.id === id);
  },
  getByDate: (date: string): Reserva[] => {
    return memoryReservations.filter(r => r.data === date);
  },
  create: (reservation: Omit<Reserva, 'id' | 'createdAt'>): Reserva => {
    const newReservation: Reserva = {
      ...reservation,
      id: `res_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    memoryReservations.push(newReservation);
    saveToRemoteDB('reservations', 'create', newReservation);
    return newReservation;
  },
  update: (id: string, updatedFields: Partial<Omit<Reserva, 'id' | 'createdAt'>>): Reserva => {
    const idx = memoryReservations.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Reserva não encontrada.');
    const updated = { ...memoryReservations[idx], ...updatedFields };
    memoryReservations[idx] = updated;

    saveToRemoteDB('reservations', 'update', updated);
    return updated;
  },
  cancel: (id: string): Reserva => {
    return reservationDB.update(id, { status: 'cancelado' });
  },
  delete: (id: string): void => {
    memoryReservations = memoryReservations.filter(r => r.id !== id);
    saveToRemoteDB('reservations', 'delete', { id });
  }
};

// Chamado DB Operations — synced with backend MySQL
export const chamadoDB = {
  getAll: (): Chamado[] => {
    return memoryChamados.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getById: (id: string): Chamado | undefined => {
    return memoryChamados.find(c => c.id === id);
  },
  getByEmbarcacaoId: (embarcacaoId: string): Chamado[] => {
    return memoryChamados.filter(c => c.embarcacaoId === embarcacaoId);
  },
  create: async (chamado: Omit<Chamado, 'id' | 'codigoChamado' | 'createdAt'>): Promise<Chamado> => {
    // Generate a temporary code locally (will be overwritten by server-generated code if available)
    const tempNum = memoryChamados.length + 1;
    const year = new Date().getFullYear();
    const newChamado: Chamado = {
      ...chamado,
      id: `chm_${Date.now()}`,
      codigoChamado: `CHM-${year}-${String(tempNum).padStart(3, '0')}`,
      status: chamado.status || 'pendente',
      dataAbertura: chamado.dataAbertura || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    try {
      const token = getAdminToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Get the correct sequential code from the server
      const codeRes = await fetch('/api/chamados/next-code', { headers });
      if (codeRes.ok) {
        const { code } = await codeRes.json();
        newChamado.codigoChamado = code;
      }

      // Persist to database
      const saveRes = await fetch('/api/chamados/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'upsert', data: newChamado })
      });

      if (!saveRes.ok) {
        throw new Error('Falha ao salvar no banco de dados');
      }

      memoryChamados.push(newChamado); // Only push if successful
    } catch (err) {
      console.warn('[Chamados] Failed to sync create to server:', err);
      throw err;
    }

    return newChamado;
  },
  update: (id: string, updatedFields: Partial<Chamado>): Chamado => {
    const idx = memoryChamados.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Chamado não encontrado.');
    const updated = { ...memoryChamados[idx], ...updatedFields };
    memoryChamados[idx] = updated;

    // Async: persist to backend
    const token = getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/chamados/save', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'upsert', data: updated })
    }).catch(err => console.warn('[Chamados] Failed to sync update to server:', err));

    return updated;
  },
  delete: (id: string): void => {
    memoryChamados = memoryChamados.filter(c => c.id !== id);

    // Async: persist to backend
    const token = getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/chamados/save', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'delete', data: { id } })
    }).catch(err => console.warn('[Chamados] Failed to sync delete to server:', err));
  }
};

let memoryTiposManutencao: TipoManutencao[] = [
  { id: 'tip_1', nome: 'Revisão Preventiva (100h / 200h)', descricao: 'Troca de óleos, filtros, velas e inspeção geral', createdAt: new Date().toISOString() },
  { id: 'tip_2', nome: 'Troca de Óleo e Filtros', descricao: 'Substituição de óleo do motor e elemento filtrante', createdAt: new Date().toISOString() },
  { id: 'tip_3', nome: 'Reparo de Motor / Rabeta', descricao: 'Serviço mecânico em bloco, cabeçote, hélice ou rabeta', createdAt: new Date().toISOString() },
  { id: 'tip_4', nome: 'Sistema Elétrico & Baterias', descricao: 'Inspeção de chicote, alternador, baterias e fiação', createdAt: new Date().toISOString() },
  { id: 'tip_5', nome: 'Bomba de Porão & Automático', descricao: 'Troca ou reparo da bomba de esgotamento e sensor', createdAt: new Date().toISOString() },
  { id: 'tip_6', nome: 'Tapeçaria & Estofamento', descricao: 'Reparo de bancos, capas e acabamento de couro náutico', createdAt: new Date().toISOString() },
  { id: 'tip_7', nome: 'Pintura, Fibra & Gel Coat', descricao: 'Reparos de casco, polimento, retoque de tinta e gel coat', createdAt: new Date().toISOString() },
  { id: 'tip_8', nome: 'Instalação de Eletrônicos & Som', descricao: 'Instalação de GPS, sonar, som náutico e acessórios', createdAt: new Date().toISOString() },
  { id: 'tip_9', nome: 'Manutenção de Jet Ski', descricao: 'Revisão de turbina, cinta, vela e motor de jet ski', createdAt: new Date().toISOString() },
  { id: 'tip_10', nome: 'Outros Serviços Náuticos', descricao: 'Serviços gerais sob demanda', createdAt: new Date().toISOString() }
];

export const tipoManutencaoDB = {
  getAll: (): TipoManutencao[] => {
    return [...memoryTiposManutencao].sort((a, b) => a.nome.localeCompare(b.nome));
  },
  create: (tipo: Omit<TipoManutencao, 'id' | 'createdAt'>): TipoManutencao => {
    const newTipo: TipoManutencao = {
      ...tipo,
      id: `tip_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    memoryTiposManutencao = [...memoryTiposManutencao, newTipo];
    const token = getAdminToken();
    fetch('/api/tipos-manutencao/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
      body: JSON.stringify({ action: 'upsert', data: newTipo })
    }).catch(console.error);
    return newTipo;
  },
  update: (id: string, updatedFields: Partial<TipoManutencao>): TipoManutencao => {
    const idx = memoryTiposManutencao.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Tipo de manutenção não encontrado.');
    const updated = { ...memoryTiposManutencao[idx], ...updatedFields };
    memoryTiposManutencao = memoryTiposManutencao.map(t => t.id === id ? updated : t);
    const token = getAdminToken();
    fetch('/api/tipos-manutencao/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
      body: JSON.stringify({ action: 'upsert', data: updated })
    }).catch(console.error);
    return updated;
  },
  delete: (id: string): void => {
    memoryTiposManutencao = memoryTiposManutencao.filter(t => t.id !== id);
    const token = getAdminToken();
    fetch('/api/tipos-manutencao/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
      body: JSON.stringify({ action: 'delete', data: { id } })
    }).catch(console.error);
  }
};

// Maintenance DB Operations
export const maintenanceDB = {
  getAll: (): Manutencao[] => {
    return memoryManutencoes.sort((a, b) => new Date(b.dataSaida).getTime() - new Date(a.dataSaida).getTime());
  },
  getById: (id: string): Manutencao | undefined => {
    return memoryManutencoes.find(m => m.id === id);
  },
  getByBoatId: (embarcacaoId: string): Manutencao[] => {
    return memoryManutencoes.filter(m => m.embarcacaoId === embarcacaoId);
  },
  create: (manutencao: Omit<Manutencao, 'id' | 'createdAt'>): Manutencao => {
    const year = new Date().getFullYear();
    const existingCount = memoryManutencoes.filter(m => m.codigoOS && m.codigoOS.startsWith(`OS-${year}`)).length;
    const generatedCodigoOS = `OS-${year}-${String(existingCount + 1).padStart(3, '0')}`;

    const newManutencao: Manutencao = {
      ...manutencao,
      id: `man_${Date.now()}`,
      codigoOS: manutencao.codigoOS || generatedCodigoOS,
      dataSaida: manutencao.dataSaida || manutencao.dataChamado || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    memoryManutencoes.push(newManutencao);
    
    const boat = memoryBoats.find(b => b.id === newManutencao.embarcacaoId);
    if (boat) {
      boat.emManutencao = memoryManutencoes.some(m => m.embarcacaoId === newManutencao.embarcacaoId && m.status !== 'concluido' && m.status !== 'reprovado');
      if (newManutencao.horasMotorAtual !== undefined && newManutencao.horasMotorAtual > 0) {
        boatDB.update(boat.id, { horasMotor: newManutencao.horasMotorAtual });
      }
    }
    
    // save to new API
    const token = getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/manutencoes/save', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'upsert', data: newManutencao })
    }).catch(console.error);
    return newManutencao;
  },
  update: (id: string, updatedFields: Partial<Omit<Manutencao, 'id' | 'createdAt'>>): Manutencao => {
    if (!id) throw new Error('ID de manutenção não informado.');
    const idx = memoryManutencoes.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Manutenção não encontrada.');
    const updated = { ...memoryManutencoes[idx], ...updatedFields };
    memoryManutencoes[idx] = updated;

    const boat = memoryBoats.find(b => b.id === updated.embarcacaoId);
    if (boat) {
      boat.emManutencao = memoryManutencoes.some(m => m.embarcacaoId === updated.embarcacaoId && m.status !== 'concluido' && m.status !== 'reprovado');
      if (updated.horasMotorAtual !== undefined && updated.horasMotorAtual > 0) {
        boatDB.update(boat.id, { horasMotor: updated.horasMotorAtual });
      }
    }

    const token = getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/manutencoes/save', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'upsert', data: updated })
    }).catch(console.error);
    return updated;
  },
  delete: (id: string): void => {
    const m = memoryManutencoes.find(item => item.id === id);
    const boatId = m?.embarcacaoId;

    memoryManutencoes = memoryManutencoes.filter(m => m.id !== id);
    
    if (boatId) {
      const boat = memoryBoats.find(b => b.id === boatId);
      if (boat) {
        boat.emManutencao = memoryManutencoes.some(item => item.embarcacaoId === boatId && item.status !== 'concluido' && m.status !== 'reprovado');
      }
    }
    
    // save to new API
    const token = getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/manutencoes/save', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'delete', data: { id } })
    }).catch(console.error);
  }
};

export const mecanicoDB = {
  getAll: (): any[] => {
    return memoryMecanicos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  create: (mecanico: any): any => {
    const newMecanico = {
      ...mecanico,
      id: `mec_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    memoryMecanicos.push(newMecanico);
    const token = getAdminToken();
    fetch('/api/mecanicos/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
      body: JSON.stringify({ action: 'upsert', data: newMecanico })
    }).catch(console.error);
    return newMecanico;
  },
  update: (id: string, updatedFields: any): any => {
    const idx = memoryMecanicos.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Mecânico não encontrado.');
    const updated = { ...memoryMecanicos[idx], ...updatedFields };
    memoryMecanicos[idx] = updated;
    const token = getAdminToken();
    fetch('/api/mecanicos/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
      body: JSON.stringify({ action: 'upsert', data: updated })
    }).catch(console.error);
    return updated;
  },
  delete: (id: string): void => {
    memoryMecanicos = memoryMecanicos.filter(m => m.id !== id);
    const token = getAdminToken();
    fetch('/api/mecanicos/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
      body: JSON.stringify({ action: 'delete', data: { id } })
    }).catch(console.error);
  }
};

export const funcionarioDB = {
  getAll: (): Funcionario[] => {
    return memoryFuncionarios.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getById: (id: string): Funcionario | undefined => {
    return memoryFuncionarios.find(f => f.id === id);
  },
  create: (funcionario: Omit<Funcionario, 'id' | 'createdAt'>): Funcionario => {
    const newFuncionario: Funcionario = {
      ...funcionario,
      id: `func_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    memoryFuncionarios.push(newFuncionario);
    const token = getAdminToken();
    fetch('/api/funcionarios/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
      body: JSON.stringify({ action: 'upsert', data: newFuncionario })
    }).catch(console.error);
    return newFuncionario;
  },
  update: (id: string, updatedFields: Partial<Funcionario>): Funcionario => {
    const idx = memoryFuncionarios.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Funcionário não encontrado.');
    const updated = { ...memoryFuncionarios[idx], ...updatedFields };
    memoryFuncionarios[idx] = updated;
    const token = getAdminToken();
    fetch('/api/funcionarios/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
      body: JSON.stringify({ action: 'upsert', data: updated })
    }).catch(console.error);
    return updated;
  },
  delete: (id: string): void => {
    memoryFuncionarios = memoryFuncionarios.filter(f => f.id !== id);
    const token = getAdminToken();
    fetch('/api/funcionarios/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
      body: JSON.stringify({ action: 'delete', data: { id } })
    }).catch(console.error);
  }
};

export const folgaDB = {
  getAll: (): Folga[] => {
    return memoryFolgas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  },
  getByFuncionarioId: (funcionarioId: string): Folga[] => {
    return folgaDB.getAll().filter(f => f.funcionarioId === funcionarioId);
  },
  create: (folga: Omit<Folga, 'id' | 'createdAt'>): Folga => {
    const newFolga: Folga = {
      ...folga,
      id: `folga_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    memoryFolgas.push(newFolga);
    const token = getAdminToken();
    fetch('/api/folgas/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
      body: JSON.stringify({ action: 'upsert', data: newFolga })
    }).catch(console.error);
    return newFolga;
  },
  update: (id: string, updatedFields: Partial<Folga>): Folga => {
    const idx = memoryFolgas.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Folga não encontrada.');
    const updated = { ...memoryFolgas[idx], ...updatedFields };
    memoryFolgas[idx] = updated;
    const token = getAdminToken();
    fetch('/api/folgas/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
      body: JSON.stringify({ action: 'upsert', data: updated })
    }).catch(console.error);
    return updated;
  },
  delete: (id: string): void => {
    memoryFolgas = memoryFolgas.filter(f => f.id !== id);
    const token = getAdminToken();
    fetch('/api/folgas/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
      body: JSON.stringify({ action: 'delete', data: { id } })
    }).catch(console.error);
  }
};



export const epiDB = {
  getAll: (): any[] => {
    return memoryEpis.sort((a, b) => new Date(b.geradoEm).getTime() - new Date(a.geradoEm).getTime());
  },
  getByFuncionarioId: (funcionarioId: string): any[] => {
    return epiDB.getAll().filter(e => e.funcionarioId === funcionarioId);
  },
  create: async (funcionarioId: string, epi: any): Promise<any> => {
    try {
      const token = getAdminToken();
      const res = await fetch(`/api/funcionarios/${funcionarioId}/epis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
        body: JSON.stringify(epi)
      });
      if (res.ok) {
        const data = await res.json();
        const newEpi = { ...epi, id: data.id, funcionarioId, geradoEm: new Date().toISOString() };
        const existingIndex = memoryEpis.findIndex(e => e.id === data.id);
        if (existingIndex >= 0) {
          memoryEpis[existingIndex] = newEpi;
        } else {
          memoryEpis.push(newEpi);
        }
        return newEpi;
      }
    } catch(e) {
      console.error(e);
    }
  },
  delete: async (id: string): Promise<void> => {
    try {
      const token = getAdminToken();
      const res = await fetch(`/api/epis/${id}`, {
        method: 'DELETE',
        headers: { ...(token ? {'Authorization': `Bearer ${token}`} : {}) }
      });
      if (res.ok) {
        memoryEpis = memoryEpis.filter(e => e.id !== id);
      }
    } catch(e) {
      console.error(e);
    }
  }
};


// Carrega os dados remotamente e preenche a memoria
export async function loadFromRemote(forceRefresh = false) {
  if (!localStorage.getItem('admin_token')) {
    return { success: false, connected: false, message: "Apenas administradores podem acessar." };
  }

  try {
    // Wait for any in-flight saves to finish before fetching, to avoid race condition where we fetch old data
    if (pendingSaves.length > 0) {
      await Promise.allSettled(pendingSaves);
    }

    const token = getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const statusRes = await fetch('/api/db/status', { headers });
    if (!statusRes.ok) {
        isDbLoadAttempted = true;
        isDbLoaded = true;
        return { success: false, message: "Não foi possível verificar conexão com a VPS." };
    }
    const status = await statusRes.json();

    if (!status.connected) {
      isDbLoadAttempted = true;
      isDbLoaded = true;
      return {
        connected: false,
        success: false,
        vpsHost: status.vpsHost,
        message: status.error || "Banco de dados da VPS desconectado. O sistema operará sem dados."
      };
    }

    // Pull remote records
    const url = forceRefresh ? '/api/db/pull?forceRefresh=true' : '/api/db/pull';
    const pullRes = await fetch(url, { headers });
    if (!pullRes.ok) {
        isDbLoadAttempted = true;
        isDbLoaded = true;
        return { success: false, message: "Acesso de leitura remota falhou." };
    }
    const remoteData = await pullRes.json();

    memoryClients = remoteData.clients || [];
    memoryBoats = remoteData.boats || [];
    memoryReservations = remoteData.reservations || [];
    memoryManutencoes = remoteData.manutencoes || [];
    memoryMecanicos = remoteData.mecanicos || [];
    if (remoteData.tiposManutencao && remoteData.tiposManutencao.length > 0) {
      memoryTiposManutencao = remoteData.tiposManutencao;
    }
    memoryFuncionarios = remoteData.funcionarios || [];
    memoryFolgas = remoteData.folgas || [];
    memoryEpis = remoteData.epis || [];
    memoryCatalogoEpis = remoteData.catalogoEPIs || [];
    memoryHistoricoEpis = remoteData.historicoEpis || [];
    memoryRegistrosAtividades = remoteData.registrosAtividades || [];

    // Migração em tempo de leitura para compatibilidade (1:1 -> 1:N)
    memoryChamados = (remoteData.chamados || []).map((ch: any) => {
      if (ch.manutencaoId && (!ch.osIds || ch.osIds.length === 0)) {
        ch.osIds = [ch.manutencaoId];
      }
      return ch;
    });

    memoryManutencoes = (remoteData.manutencoes || []).map((m: any) => {
      // Auto-migrate legacy statuses cleanly to the 4 funicular stages
      if (['chamado_aberto', 'fila_espera'].includes(m.status)) {
        m.status = 'aguardando_orcamento';
      } else if (m.status === 'orcamento_pendente') {
        m.status = 'aguardando_aprovacao';
      } else if (['na_oficina', 'em_execucao', 'aguardando_pecas'].includes(m.status)) {
        m.status = 'em_execucao';
      } else if (m.status === 'cancelado') {
        m.status = 'reprovado';
      }
      return m;
    });

    isDbLoadAttempted = true;
    isDbLoaded = true;

    return {
      connected: true,
      success: true,
      vpsHost: status.vpsHost,
      database: status.database,
      message: "Dados carregados com sucesso da VPS!"
    };
  } catch (err: any) {
    console.error("loadFromRemote failure:", err);
    isDbLoadAttempted = true;
    isDbLoaded = true;
    return {
      connected: false,
      success: false,
      message: `Erro ao buscar dados na VPS: ${err.message || err}`
    };
  }
}

// Mantendo o nome antigo temporariamente para não quebrar componentes não atualizados, mas chamando a versão nova
export async function syncWithRemote() {
  return await loadFromRemote();
}

export const catalogoEpiDB = {
  getAll: (): any[] => {
    return memoryCatalogoEpis;
  },
  create: async (epi: any): Promise<any> => {
    try {
      const token = getAdminToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/catalogo-epis`, {
        method: 'POST',
        headers,
        body: JSON.stringify(epi)
      });
      if (res.ok) {
        const data = await res.json();
        const newEpi = { ...epi, id: data.id, createdAt: new Date().toISOString() };
        const existingIndex = memoryCatalogoEpis.findIndex(e => e.id === data.id);
        if (existingIndex >= 0) {
          memoryCatalogoEpis[existingIndex] = newEpi;
        } else {
          memoryCatalogoEpis.push(newEpi);
        }
        return newEpi;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  },
  delete: async (id: string) => {
    try {
      const token = getAdminToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/catalogo-epis/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        memoryCatalogoEpis = memoryCatalogoEpis.filter(e => e.id !== id);
      }
    } catch (e) {
      console.error(e);
    }
  }
};

export const historicoEpiDB = {
  getAll: (): any[] => {
    return memoryHistoricoEpis.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getByFuncionarioId: (funcionarioId: string): any[] => {
    return historicoEpiDB.getAll().filter(e => e.funcionarioId === funcionarioId);
  },
  create: async (funcionarioId: string, log: any): Promise<any> => {
    try {
      const token = getAdminToken();
      const res = await fetch(`/api/funcionarios/${funcionarioId}/historico-epi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization': `Bearer ${token}`} : {}) },
        body: JSON.stringify(log)
      });
      if (res.ok) {
        const newLog = { ...log, funcionarioId, createdAt: log.createdAt || new Date().toISOString() };
        memoryHistoricoEpis.push(newLog);
      }
    } catch(e) {
      console.error(e);
    }
  }
};

export const registrosAtividadesDB = {
  getAll: () => {
    return memoryRegistrosAtividades;
  }
};

export async function logAction(acao: string, detalhes?: string, embarcacaoId?: string, operadorNome?: string) {
  try {
    const token = getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Usaremos "Sistema" ou o adminName caso venha vazio, mas operadorNome é injetado via props
    const res = await fetch('/api/logs/action', {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        acao, 
        detalhes, 
        embarcacaoId, 
        operadorNome: operadorNome || localStorage.getItem('adminName') || 'Sistema'
      })
    });
    
    if (res.ok) {
      // Local push to reflect immediately
      memoryRegistrosAtividades.unshift({
        id: `log_${Date.now()}`,
        operadorNome: operadorNome || localStorage.getItem('adminName') || 'Sistema',
        acao,
        detalhes,
        embarcacaoId,
        createdAt: new Date().toISOString()
      });
    }
  } catch(e) {
    console.error("Failed to log action:", e);
  }
}
