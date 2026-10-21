import React, { useState, useEffect, useMemo } from 'react';
import {
  Ship, Anchor, Users, Search, Filter, Phone, MessageSquare,
  Clock, Wrench, CheckCircle2, AlertTriangle, Eye, X, ChevronRight,
  Shield, Layers, Sparkles, RefreshCw, Building2, User, Key,
  Check, ArrowUpDown, LayoutGrid, List, MapPin, Mail, Hash,
  Compass, AlertCircle, FileText, Package, Plus, Edit2, Lock, ShieldCheck
} from 'lucide-react';
import { io } from 'socket.io-client';
import { Embarcacao, Cliente } from '../types';
import { boatDB, clientDB } from '../db';
import { getBoatCode } from '../utils/boatUtils';
import { formatBoatName } from '../utils/constants';
import ClientProfileModal from './ClientProfileModal';
import BoatModal from './BoatModal';

import defaultJetImg from '../assets/images/jet.webp';
import defaultLanchaImg from '../assets/images/lancha.webp';

interface MarinaEmbarcacoesClientesViewProps {
  boats?: Embarcacao[];
  clients?: Cliente[];
  onReload?: () => void;
  userRole?: string;
  operadorNome?: string;
}

type ViewMode = 'embarcacoes' | 'clientes';

export default function MarinaEmbarcacoesClientesView({
  boats: propBoats,
  clients: propClients,
  onReload,
  userRole = 'marina_gerente',
  operadorNome
}: MarinaEmbarcacoesClientesViewProps) {
  // Dados locais sincronizados
  const [boats, setBoats] = useState<Embarcacao[]>(() => propBoats || boatDB.getAll() || []);
  const [clients, setClients] = useState<Cliente[]>(() => propClients || clientDB.getAll() || []);
  const [loading, setLoading] = useState(false);

  // Modal de Criação / Edição de Embarcação (Marina)
  const [isBoatModalOpen, setIsBoatModalOpen] = useState(false);
  const [editingBoat, setEditingBoat] = useState<Embarcacao | null>(null);

  // Filtros e Visualização
  const [viewMode, setViewMode] = useState<ViewMode>('embarcacoes');
  const [search, setSearch] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');

  // Modais de Visualização Somente Leitura
  const [selectedBoat, setSelectedBoat] = useState<Embarcacao | null>(null);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);

  // Sincronização e Busca dos dados
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/db/pull', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const json = await res.json();
        if (json.boats) setBoats(json.boats);
        if (json.clients) setClients(json.clients);
      } else {
        setBoats(boatDB.getAll() || []);
        setClients(clientDB.getAll() || []);
      }
    } catch {
      setBoats(boatDB.getAll() || []);
      setClients(clientDB.getAll() || []);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (propBoats) setBoats(propBoats);
    if (propClients) setClients(propClients);
  }, [propBoats, propClients]);

  useEffect(() => {
    loadData(true);

    const token = localStorage.getItem('admin_token');
    const socket = io(window.location.origin, {
      auth: token ? { token } : undefined,
      transports: ['polling', 'websocket']
    });

    socket.on('marina_update', () => {
      loadData(true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Mapeamento de donos e cotas por embarcação
  const boatCotistasMap = useMemo(() => {
    const map = new Map<string, Array<{ client: Cliente; cota: string }>>();

    boats.forEach(b => {
      const list: Array<{ client: Cliente; cota: string }> = [];

      clients.forEach(c => {
        let isOwner = false;
        let cota = c.cota || 'Cota';

        // 1. Verifica vínculos múltiplos
        if (c.embarcacoes && c.embarcacoes.length > 0) {
          const match = c.embarcacoes.find(eb => eb.embarcacaoId === b.id);
          if (match) {
            isOwner = true;
            if (match.cota) cota = match.cota;
          }
        }

        // 2. Verifica vínculo primário
        if (!isOwner && c.embarcacaoId === b.id) {
          isOwner = true;
        }

        // 3. Verifica array donos do barco
        if (!isOwner && Array.isArray(b.donos) && b.donos.includes(c.id)) {
          isOwner = true;
        }

        if (isOwner) {
          list.push({ client: c, cota });
        }
      });

      // Ordenar por cota
      list.sort((a, b) => a.cota.localeCompare(b.cota, undefined, { numeric: true }));
      map.set(b.id, list);
    });

    return map;
  }, [boats, clients]);

  // Mapeamento de embarcações por cliente
  const clientBoatsMap = useMemo(() => {
    const map = new Map<string, Array<{ boat: Embarcacao; cota: string }>>();

    clients.forEach(c => {
      const list: Array<{ boat: Embarcacao; cota: string }> = [];

      boats.forEach(b => {
        let isOwner = false;
        let cota = c.cota || 'Cota';

        if (c.embarcacoes && c.embarcacoes.length > 0) {
          const match = c.embarcacoes.find(eb => eb.embarcacaoId === b.id);
          if (match) {
            isOwner = true;
            if (match.cota) cota = match.cota;
          }
        }

        if (!isOwner && c.embarcacaoId === b.id) {
          isOwner = true;
        }

        if (!isOwner && Array.isArray(b.donos) && b.donos.includes(c.id)) {
          isOwner = true;
        }

        if (isOwner) {
          list.push({ boat: b, cota });
        }
      });

      map.set(c.id, list);
    });

    return map;
  }, [boats, clients]);

  // Estatísticas Rápidas (KPIs)
  const stats = useMemo(() => {
    const totalEmbarcacoes = boats.length;
    const lanchas = boats.filter(b => b.tipo === 'lancha').length;
    const jets = boats.filter(b => b.tipo === 'jet').length;
    const emManutencao = boats.filter(b => b.emManutencao || b.statusOperacional === 'em_manutencao').length;
    const prontas = totalEmbarcacoes - emManutencao;
    const totalClientes = clients.length;
    const clientesAtivos = clients.filter(c => c.status !== 'inativo').length;
    const vagasOcupadas = boats.filter(b => !!b.vaga && b.vaga.trim() !== '').length;

    return {
      totalEmbarcacoes,
      lanchas,
      jets,
      emManutencao,
      prontas,
      totalClientes,
      clientesAtivos,
      vagasOcupadas
    };
  }, [boats, clients]);

  // Embarcações Filtradas
  const filteredBoats = useMemo(() => {
    return boats.filter(b => {
      if (filterEmpresa !== 'all') {
        const empresas = b.empresas || ['VALE'];
        if (!empresas.includes(filterEmpresa)) return false;
      }

      if (filterTipo !== 'all' && b.tipo !== filterTipo) {
        return false;
      }

      if (filterStatus === 'pronta') {
        if (b.emManutencao || b.statusOperacional === 'em_manutencao') return false;
      } else if (filterStatus === 'manutencao') {
        if (!b.emManutencao && b.statusOperacional !== 'em_manutencao') return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const code = getBoatCode(b).toLowerCase();
        const nome = (b.nome || '').toLowerCase();
        const formattedNome = formatBoatName(b.nome).toLowerCase();
        const modelo = (b.modelo || '').toLowerCase();
        const fabricante = (b.fabricante || '').toLowerCase();
        const vaga = (b.vaga || '').toLowerCase();

        // Também busca se algum cotista do barco corresponde à busca
        const cotistas = boatCotistasMap.get(b.id) || [];
        const matchCotista = cotistas.some(item => {
          const cNome = (item.client.nome || '').toLowerCase();
          const cTel = (item.client.telefone || '').toLowerCase();
          const cCpf = (item.client.cpf || '').toLowerCase();
          const cCota = (item.cota || '').toLowerCase();
          return cNome.includes(q) || cTel.includes(q) || cCpf.includes(q) || cCota.includes(q);
        });

        if (
          !code.includes(q) &&
          !nome.includes(q) &&
          !formattedNome.includes(q) &&
          !modelo.includes(q) &&
          !fabricante.includes(q) &&
          !vaga.includes(q) &&
          !matchCotista
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const codeA = getBoatCode(a);
      const codeB = getBoatCode(b);
      return codeA.localeCompare(codeB, undefined, { numeric: true });
    });
  }, [boats, filterEmpresa, filterTipo, filterStatus, search, boatCotistasMap]);

  // Clientes Filtrados
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (filterEmpresa !== 'all') {
        const empresas = c.empresas || ['VALE'];
        if (!empresas.includes(filterEmpresa)) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const nome = (c.nome || '').toLowerCase();
        const tel = (c.telefone || '').toLowerCase();
        const cpf = (c.cpf || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const cota = (c.cota || '').toLowerCase();

        // Também busca pelas embarcações associadas
        const barcos = clientBoatsMap.get(c.id) || [];
        const matchBarco = barcos.some(item => {
          const bCode = getBoatCode(item.boat).toLowerCase();
          const bNome = (item.boat.nome || '').toLowerCase();
          const bVaga = (item.boat.vaga || '').toLowerCase();
          return bCode.includes(q) || bNome.includes(q) || bVaga.includes(q);
        });

        if (
          !nome.includes(q) &&
          !tel.includes(q) &&
          !cpf.includes(q) &&
          !email.includes(q) &&
          !cota.includes(q) &&
          !matchBarco
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [clients, filterEmpresa, search, clientBoatsMap]);

  const clearFilters = () => {
    setSearch('');
    setFilterEmpresa('all');
    setFilterTipo('all');
    setFilterStatus('all');
  };

  const hasActiveFilters = search !== '' || filterEmpresa !== 'all' || filterTipo !== 'all' || filterStatus !== 'all';

  const formatWhatsAppUrl = (phone?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) return null;
    const withCountry = clean.startsWith('55') ? clean : `55${clean}`;
    return `https://wa.me/${withCountry}`;
  };

  // Regra de Negócio / Alçadas:
  // Embarcações vinculadas à Vale: Somente Consulta (não pode editar nem excluir)
  // Embarcações vinculadas à Marina (sem Vale): Gestão Plena (cadastrar, editar, excluir)
  const isValeBoat = (boat: Embarcacao): boolean => {
    const emp = boat.empresas && boat.empresas.length > 0 ? boat.empresas : ['VALE'];
    return emp.includes('VALE');
  };

  const isMarinaBoat = (boat: Embarcacao): boolean => {
    const emp = boat.empresas && boat.empresas.length > 0 ? boat.empresas : ['VALE'];
    return emp.includes('MARINA') && !emp.includes('VALE');
  };

  const canEditBoat = (boat: Embarcacao): boolean => {
    return isMarinaBoat(boat);
  };

  const handleOpenNewBoat = () => {
    setEditingBoat(null);
    setIsBoatModalOpen(true);
  };

  const handleEditBoat = (boat: Embarcacao) => {
    if (isValeBoat(boat)) {
      alert("Embarcações vinculadas à Vale Náutica estão disponíveis apenas para consulta e não podem ser editadas pelo Gerente de Marina.");
      return;
    }
    setSelectedBoat(null);
    setEditingBoat(boat);
    setIsBoatModalOpen(true);
  };

  const handleDeleteBoat = async (id: string, name: string) => {
    const boat = boats.find(b => b.id === id);
    if (boat && isValeBoat(boat)) {
      alert("Embarcações vinculadas à Vale Náutica não podem ser excluídas.");
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir a embarcação "${name}" da frota da Marina Club? Esta ação removerá o registro do sistema.`)) {
      return;
    }
    try {
      boatDB.delete(id);
      const token = localStorage.getItem('admin_token');
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ type: 'boats', action: 'delete', data: { id } })
      });
      setBoats(prev => prev.filter(b => b.id !== id));
      setIsBoatModalOpen(false);
      setSelectedBoat(null);
      if (onReload) onReload();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir embarcação.');
    }
  };

  const handleSaveBoat = (savedBoat: Embarcacao) => {
    setBoats(prev => {
      const idx = prev.findIndex(b => b.id === savedBoat.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedBoat;
        return copy;
      }
      return [savedBoat, ...prev];
    });
    setIsBoatModalOpen(false);
    setEditingBoat(null);
    if (onReload) onReload();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">

      {/* ─── HEADER EXECUTIVO COM BADGES E CADASTRO ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-black uppercase tracking-wider">
              Painel Gerencial da Marina
            </span>
            <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-full text-[10px] font-bold flex items-center gap-1">
              <Ship className="w-3 h-3 text-teal-600" /> Frota Marina: Gestão & Cadastro
            </span>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-[10px] font-bold flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" /> Frota Vale: Somente Consulta
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Ship className="w-7 h-7 text-[#186b77]" />
            Embarcações & Clientes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Gestão da frota vinculada da Marina, consulta geral de cotistas, vagas de pátio e horímetros.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={handleOpenNewBoat}
            className="px-4 py-2 bg-[#186b77] hover:bg-[#12555f] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md active:scale-95"
            title="Cadastrar nova embarcação vinculada à Marina Club"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Embarcação</span>
          </button>

          <button
            onClick={() => {
              loadData();
              if (onReload) onReload();
            }}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-2xs"
            title="Atualizar dados do servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#186b77]' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* ─── BANNER INFORMATIVO DE ALÇADA ─── */}
      <div className="bg-gradient-to-r from-teal-50/70 via-slate-50 to-indigo-50/50 border border-slate-200/90 rounded-2xl p-3.5 sm:px-4 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-start sm:items-center gap-3 text-slate-700">
          <div className="p-2 rounded-xl bg-[#186b77]/10 text-[#186b77] shrink-0 border border-[#186b77]/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900">Regras de Acesso da Marina:</span>
              <span className="px-2 py-0.5 rounded-md bg-teal-100/80 text-teal-800 text-[10px] font-bold">
                Gestão Plena em Veículos Marina
              </span>
            </div>
            <p className="text-slate-500 font-medium text-[11px] sm:text-xs mt-0.5">
              Você pode <strong className="text-teal-800">cadastrar novas embarcações e editar livremente os veículos vinculados à Marina Club</strong>. Embarcações vinculadas à <strong className="text-indigo-700">Vale Náutica</strong> são exibidas apenas para consulta operacional.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-teal-200 text-teal-800 rounded-lg font-bold text-[11px] shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Marina: Edição & Cadastro
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg font-bold text-[11px] shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-slate-400" /> Vale: Somente Leitura
          </span>
        </div>
      </div>

      {/* ─── CARDS DE KPIS / RESUMO OPERACIONAL ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Frota</span>
            <span className="text-2xl font-black text-slate-900 mt-0.5 block">{stats.totalEmbarcacoes}</span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {stats.lanchas} Lanchas • {stats.jets} Jets
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Ship className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Disponíveis / Prontas</span>
            <span className="text-2xl font-black text-emerald-600 mt-0.5 block">{stats.prontas}</span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Liberadas para navegação
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Em Manutenção</span>
            <span className="text-2xl font-black text-amber-600 mt-0.5 block">{stats.emManutencao}</span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Aguardando ou em serviço
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Cotistas Cadastrados</span>
            <span className="text-2xl font-black text-[#186b77] mt-0.5 block">{stats.totalClientes}</span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {stats.vagasOcupadas} Vagas com barco
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#186b77] flex items-center justify-center shrink-0 border border-teal-100">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── TOOLBAR: MODOS DE VISÃO, BUSCA E FILTROS ─── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">

        {/* Linha Superior: Seletor de Modo (Embarcações x Clientes) + Busca Global */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">

          {/* Alternador de Modo de Visão */}
          <div className="flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 shrink-0">
            <button
              onClick={() => setViewMode('embarcacoes')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                viewMode === 'embarcacoes'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Ship className="w-4 h-4 text-[#186b77]" />
              <span>Por Embarcação ({filteredBoats.length})</span>
            </button>

            <button
              onClick={() => setViewMode('clientes')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                viewMode === 'clientes'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>Por Cotista / Cliente ({filteredClients.length})</span>
            </button>
          </div>

          {/* Campo de Pesquisa Instantâneo */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                viewMode === 'embarcacoes'
                  ? "Pesquisar por embarcação (M01, Mexicano), vaga, cotista, telefone..."
                  : "Pesquisar por cotista, telefone, CPF, cota ou embarcação..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white transition-all shadow-inner-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botões de Layout (Grade / Tabela) quando em modo Embarcações */}
          {viewMode === 'embarcacoes' && (
            <div className="hidden sm:flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 shrink-0">
              <button
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  layoutMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Visualização em Grade de Cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  layoutMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Visualização em Lista / Tabela"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Linha Inferior: Filtros de Categoria, Status e Empresa */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
          </div>

          <select
            value={filterEmpresa}
            onChange={(e) => setFilterEmpresa(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#186b77]"
          >
            <option value="all">Todas as Empresas</option>
            <option value="VALE">Vale Náutica</option>
            <option value="MARINA">Marina</option>
            <option value="MEXICANO">Mexicano</option>
          </select>

          {viewMode === 'embarcacoes' && (
            <>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#186b77]"
              >
                <option value="all">Todos os Tipos</option>
                <option value="lancha">Somente Lanchas</option>
                <option value="jet">Somente Jet Skis</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#186b77]"
              >
                <option value="all">Qualquer Status</option>
                <option value="pronta">Disponível / Pronta</option>
                <option value="manutencao">Em Manutenção</option>
              </select>
            </>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── CONTEÚDO PRINCIPAL: MODO POR EMBARCAÇÃO ─── */}
      {viewMode === 'embarcacoes' && (
        <>
          {filteredBoats.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center shadow-xs">
              <Ship className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Nenhuma embarcação encontrada</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Não foram encontrados barcos com os filtros informados. Tente ajustar o termo de busca.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : layoutMode === 'table' ? (
            /* VISÃO EM TABELA */
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Embarcação</th>
                      <th className="py-3.5 px-4">Empresa</th>
                      <th className="py-3.5 px-4">Vaga</th>
                      <th className="py-3.5 px-4">Horímetro</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Cotistas Vinculados</th>
                      <th className="py-3.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredBoats.map(boat => {
                      const code = getBoatCode(boat);
                      const isMaintenance = boat.emManutencao || boat.statusOperacional === 'em_manutencao';
                      const cotistas = boatCotistasMap.get(boat.id) || [];
                      const defaultImg = boat.tipo === 'jet' ? defaultJetImg : defaultLanchaImg;
                      const isVale = isValeBoat(boat);
                      const isMarina = isMarinaBoat(boat);
                      const canEdit = canEditBoat(boat);

                      return (
                        <tr key={boat.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={boat.imagemUrl || defaultImg}
                                alt={boat.nome}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-slate-900">{code}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600">
                                    {boat.tipo === 'jet' ? 'Jet' : 'Lancha'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  {boat.fabricante} {boat.modelo} {boat.ano ? `(${boat.ano})` : ''}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {isMarina ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-md text-[10px] font-bold">
                                <Ship className="w-2.5 h-2.5 text-teal-600" /> Marina Club
                              </span>
                            ) : isVale ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-md text-[10px] font-bold">
                                <Lock className="w-2.5 h-2.5 text-indigo-500" /> Vale Náutica
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[10px] font-bold">
                                {(boat.empresas || []).join(', ') || 'Outro'}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {boat.vaga ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-lg text-xs font-bold">
                                <Anchor className="w-3 h-3" />
                                {boat.vaga}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Sem vaga</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {boat.horasMotor !== undefined ? `${boat.horasMotor}h` : '--'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {isMaintenance ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold">
                                <Wrench className="w-3 h-3" />
                                Manutenção
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                Disponível
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {cotistas.length === 0 ? (
                                <span className="text-slate-400 italic text-[11px]">Nenhum cotista vinculado</span>
                              ) : (
                                cotistas.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold flex items-center gap-1"
                                    title={`${item.client.nome} - ${item.client.telefone || 'Sem telefone'}`}
                                  >
                                    <span className="font-extrabold text-[#186b77]">{item.cota}:</span>
                                    <span className="truncate max-w-[100px]">{item.client.nome.split(' ')[0]}</span>
                                  </span>
                                ))
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedBoat(boat)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                                title="Visualizar ficha técnica e cotistas"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ficha</span>
                              </button>
                              {canEdit ? (
                                <button
                                  onClick={() => handleEditBoat(boat)}
                                  className="px-2.5 py-1.5 bg-[#186b77] hover:bg-[#12555f] text-white font-bold rounded-xl text-xs transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                  title="Editar dados da embarcação da Marina"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Editar</span>
                                </button>
                              ) : (
                                <span className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-400 font-bold rounded-xl text-[10px] inline-flex items-center gap-1 select-none" title="Embarcação vinculada à Vale Náutica (somente leitura)">
                                  <Lock className="w-3 h-3" />
                                  <span>Leitura</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VISÃO EM GRADE DE CARDS (PADRÃO MODERNO) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBoats.map(boat => {
                const code = getBoatCode(boat);
                const isMaintenance = boat.emManutencao || boat.statusOperacional === 'em_manutencao';
                const cotistas = boatCotistasMap.get(boat.id) || [];
                const defaultImg = boat.tipo === 'jet' ? defaultJetImg : defaultLanchaImg;
                const isVale = isValeBoat(boat);
                const isMarina = isMarinaBoat(boat);
                const canEdit = canEditBoat(boat);

                return (
                  <div
                    key={boat.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col group"
                  >
                    {/* Header do Card com Imagem e Badges */}
                    <div className="relative h-44 bg-slate-100 overflow-hidden">
                      <img
                        src={boat.imagemUrl || defaultImg}
                        alt={boat.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Gradiente superior para contraste */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/40"></div>

                      {/* Badges de Topo */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-slate-950/80 backdrop-blur-md text-white font-black text-xs rounded-xl border border-white/20 shadow-md">
                          {code}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isMarina ? (
                            <span className="px-2.5 py-1 bg-teal-500/90 backdrop-blur-md text-white font-bold text-[10px] rounded-xl flex items-center gap-1 shadow-md">
                              <Ship className="w-3 h-3" /> Marina Club
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-950/80 backdrop-blur-md text-slate-200 font-bold text-[10px] rounded-xl flex items-center gap-1 shadow-md">
                              <Lock className="w-3 h-3 text-indigo-400" /> Vale Náutica
                            </span>
                          )}

                          {isMaintenance ? (
                            <span className="px-2.5 py-1 bg-amber-500/90 backdrop-blur-md text-white font-bold text-[10px] rounded-xl flex items-center gap-1 shadow-md">
                              <Wrench className="w-3 h-3" /> Manutenção
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-600/90 backdrop-blur-md text-white font-bold text-[10px] rounded-xl flex items-center gap-1 shadow-md">
                              <CheckCircle2 className="w-3 h-3" /> Pronta
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Informações na base da imagem */}
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-base truncate leading-tight drop-shadow-md">
                            {formatBoatName(boat.nome)}
                          </h3>
                        </div>
                        <p className="text-[11px] text-white/80 font-medium truncate mt-0.5 drop-shadow-sm">
                          {boat.fabricante} {boat.modelo} {boat.ano ? `• ${boat.ano}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Corpo do Card: Vaga, Horímetro e Especificações */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                          <Anchor className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Vaga Marina</span>
                            <span className="font-extrabold text-slate-800 truncate block">
                              {boat.vaga || 'Não informada'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Horímetro</span>
                            <span className="font-extrabold text-slate-800 truncate block">
                              {boat.horasMotor !== undefined ? `${boat.horasMotor} horas` : '--'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lista de Cotistas do Barco */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> Cotistas ({cotistas.length})
                          </span>
                        </div>

                        {cotistas.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-1">Sem cotistas vinculados.</p>
                        ) : (
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                            {cotistas.map((item, idx) => {
                              const waUrl = formatWhatsAppUrl(item.client.telefone);

                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 p-2 rounded-xl transition-colors text-xs"
                                >
                                  <div className="min-w-0 flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 bg-[#186b77] text-white font-black text-[10px] rounded-md shrink-0">
                                      {item.cota}
                                    </span>
                                    <div className="truncate">
                                      <p className="font-bold text-slate-800 truncate text-xs leading-none">
                                        {item.client.nome}
                                      </p>
                                      {item.client.telefone && (
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-none">
                                          {item.client.telefone}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    {waUrl && (
                                      <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                        title="Abrir WhatsApp do Cotista"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                    {item.client.telefone && (
                                      <a
                                        href={`tel:${item.client.telefone}`}
                                        className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                        title="Ligar para o Cotista"
                                      >
                                        <Phone className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Botões de Ação */}
                      {canEdit ? (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <button
                            onClick={() => setSelectedBoat(boat)}
                            className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                            title="Ver ficha operacional e técnica"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Ficha</span>
                          </button>
                          <button
                            onClick={() => handleEditBoat(boat)}
                            className="py-2.5 bg-[#186b77] hover:bg-[#12555f] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                            title="Editar dados, cotistas, horímetro ou vaga da embarcação"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-white" />
                            <span>Editar</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1 mt-2">
                          <button
                            onClick={() => setSelectedBoat(boat)}
                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                            title="Ver ficha operacional (somente leitura)"
                          >
                            <Eye className="w-4 h-4 text-slate-300" />
                            <span>Ver Ficha (Somente Leitura)</span>
                          </button>
                          <p className="text-[10px] text-slate-400 text-center font-medium flex items-center justify-center gap-1 pt-0.5">
                            <Lock className="w-2.5 h-2.5" /> Frota Vale Náutica (Bloqueado para edição)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── CONTEÚDO PRINCIPAL: MODO POR CLIENTE / COTISTA ─── */}
      {viewMode === 'clientes' && (
        <>
          {filteredClients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center shadow-xs">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Nenhum cliente/cotista encontrado</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Não foram encontrados cotistas com os termos informados.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Cliente / Cotista</th>
                      <th className="py-3.5 px-4">Contatos</th>
                      <th className="py-3.5 px-4">Embarcação & Cota</th>
                      <th className="py-3.5 px-4">Cidade / UF</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredClients.map(client => {
                      const boatsList = clientBoatsMap.get(client.id) || [];
                      const waUrl = formatWhatsAppUrl(client.telefone);

                      return (
                        <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-blue-800 font-black flex items-center justify-center shrink-0 border border-blue-200/50">
                                {client.nome.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 block">{client.nome}</span>
                                {client.cpf && (
                                  <span className="text-[10px] text-slate-400 font-medium block">
                                    CPF: {client.cpf}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {client.telefone ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-700">{client.telefone}</span>
                                  {waUrl && (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                      title="WhatsApp"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Sem telefone</span>
                              )}
                              {client.email && (
                                <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                                  {client.email}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {boatsList.length === 0 ? (
                                <span className="text-slate-400 italic text-[11px]">Nenhuma cota vinculada</span>
                              ) : (
                                boatsList.map((item, idx) => {
                                  const code = getBoatCode(item.boat);
                                  return (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-teal-50 border border-teal-200 text-[#186b77] rounded-lg text-xs font-bold inline-flex items-center gap-1"
                                      title={`${item.boat.nome} - Vaga: ${item.boat.vaga || 'S/ vaga'}`}
                                    >
                                      <Ship className="w-3 h-3" />
                                      <span>{code}</span>
                                      <span className="text-slate-400">•</span>
                                      <span>{item.cota}</span>
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            {client.cidade ? `${client.cidade}${client.estado ? `/${client.estado}` : ''}` : '--'}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                                  client.status === 'inativo'
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {client.status === 'inativo' ? 'Inativo' : 'Ativo'}
                              </span>

                              {client.statusFinanceiro && (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold w-fit ${
                                    client.statusFinanceiro === 'em_dia'
                                      ? 'bg-blue-50 text-blue-700'
                                      : client.statusFinanceiro === 'inadimplente'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {client.statusFinanceiro === 'em_dia' ? 'Em Dia' : client.statusFinanceiro === 'inadimplente' ? 'Inadimplente' : 'Pendente'}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedClient(client)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-[#186b77] hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                              title="Visualizar ficha cadastral completa do cotista"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ficha</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── MODAL DE DETALHES DA EMBARCAÇÃO (100% SOMENTE LEITURA) ─── */}
      {selectedBoat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">

            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-black text-sm border border-white/20">
                  {getBoatCode(selectedBoat)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    {formatBoatName(selectedBoat.nome)}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {isMarinaBoat(selectedBoat)
                      ? 'Ficha Técnica Operacional • Frota Marina Club (Gestão Habilitada)'
                      : 'Ficha Técnica Operacional • Frota Vale Náutica (Somente Leitura)'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBoat(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body com Scroll */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">

              {/* Foto Expandida */}
              <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={selectedBoat.imagemUrl || (selectedBoat.tipo === 'jet' ? defaultJetImg : defaultLanchaImg)}
                  alt={selectedBoat.nome}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="px-3 py-1 bg-slate-900/80 backdrop-blur-md text-white font-black rounded-lg text-xs">
                    {selectedBoat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}
                  </span>
                  <span className="px-3 py-1 bg-blue-600/90 backdrop-blur-md text-white font-bold rounded-lg text-xs flex items-center gap-1">
                    <Anchor className="w-3.5 h-3.5" />
                    Vaga: {selectedBoat.vaga || 'Não definida'}
                  </span>
                </div>
              </div>

              {/* Informações Técnicas e Cadastrais */}
              <div>
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Especificações Técnicas
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Fabricante</span>
                    <span className="font-extrabold text-slate-800 text-xs block mt-0.5">{selectedBoat.fabricante || '--'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Modelo</span>
                    <span className="font-extrabold text-slate-800 text-xs block mt-0.5">{selectedBoat.modelo || '--'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ano</span>
                    <span className="font-extrabold text-slate-800 text-xs block mt-0.5">{selectedBoat.ano || '--'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tamanho</span>
                    <span className="font-extrabold text-slate-800 text-xs block mt-0.5">{selectedBoat.tamanho ? `${selectedBoat.tamanho} pés` : '--'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Horímetro Atual</span>
                    <span className="font-extrabold text-amber-600 text-xs block mt-0.5">
                      {selectedBoat.horasMotor !== undefined ? `${selectedBoat.horasMotor} horas` : '--'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Status Operacional</span>
                    <span className={`font-extrabold text-xs block mt-0.5 ${
                      selectedBoat.emManutencao || selectedBoat.statusOperacional === 'em_manutencao' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {selectedBoat.emManutencao || selectedBoat.statusOperacional === 'em_manutencao' ? 'Em Manutenção' : 'Pronta / Disponível'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Inscrição Capitania</span>
                    <span className="font-extrabold text-slate-800 text-xs block mt-0.5">{selectedBoat.inscricao || '--'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Chassi</span>
                    <span className="font-extrabold text-slate-800 text-xs block mt-0.5 font-mono">{selectedBoat.chassi || '--'}</span>
                  </div>
                </div>
              </div>

              {/* Acessórios Cadastrados */}
              <div>
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Acessórios e Itens de Pátio
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${selectedBoat.acessorios?.tenda ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <Check className={`w-3.5 h-3.5 ${selectedBoat.acessorios?.tenda ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span className="font-bold">Tenda</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${selectedBoat.acessorios?.mesa ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <Check className={`w-3.5 h-3.5 ${selectedBoat.acessorios?.mesa ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span className="font-bold">Mesa</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${selectedBoat.acessorios?.bancosCadeiras ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <Check className={`w-3.5 h-3.5 ${selectedBoat.acessorios?.bancosCadeiras ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span className="font-bold">Bancos/Cadeiras</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${selectedBoat.acessorios?.churrasqueira ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <Check className={`w-3.5 h-3.5 ${selectedBoat.acessorios?.churrasqueira ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span className="font-bold">Churrasqueira</span>
                  </div>
                </div>
              </div>

              {/* Lista Completa dos Cotistas da Embarcação */}
              <div>
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Cotistas Associados ({boatCotistasMap.get(selectedBoat.id)?.length || 0})
                </h4>

                <div className="space-y-2">
                  {(boatCotistasMap.get(selectedBoat.id) || []).map((item, idx) => {
                    const waUrl = formatWhatsAppUrl(item.client.telefone);

                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <span className="px-2 py-1 bg-[#186b77] text-white font-black text-xs rounded-lg shrink-0">
                            {item.cota}
                          </span>
                          <div className="truncate">
                            <h5 className="font-bold text-slate-900 text-xs">{item.client.nome}</h5>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              {item.client.telefone && <span>{item.client.telefone}</span>}
                              {item.client.cpf && <span>• CPF: {item.client.cpf}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                          <button
                            onClick={() => setSelectedClient(item.client)}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-[#186b77] hover:text-white text-slate-800 rounded-xl font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Ver Ficha Cadastral do Cotista"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ficha</span>
                          </button>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1 shadow-2xs"
                              title="Chamar no WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                          )}
                          {item.client.telefone && (
                            <a
                              href={`tel:${item.client.telefone}`}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl"
                              title="Ligar"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              {isMarinaBoat(selectedBoat) ? (
                <>
                  <span className="text-[11px] text-teal-800 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    Embarcação da Marina Club • Edição permitida
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedBoat(null)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Fechar
                    </button>
                    <button
                      onClick={() => handleEditBoat(selectedBoat)}
                      className="px-5 py-2 bg-[#186b77] hover:bg-[#12555f] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar Embarcação</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Embarcação vinculada à Vale Náutica (somente leitura para o Gerente da Marina).
                  </span>
                  <button
                    onClick={() => setSelectedBoat(null)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE FICHA DO CLIENTE / COTISTA COMPLETO (DOSSIÊ NÁUTICO) ─── */}
      {selectedClient && (
        <ClientProfileModal
          client={selectedClient}
          boats={boats}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {/* ─── MODAL DE CADASTRO / EDIÇÃO DE EMBARCAÇÃO (MARINA) ─── */}
      {isBoatModalOpen && (
        <BoatModal
          isOpen={isBoatModalOpen}
          onClose={() => {
            setIsBoatModalOpen(false);
            setEditingBoat(null);
          }}
          onSave={handleSaveBoat}
          onDelete={handleDeleteBoat}
          editingBoat={editingBoat}
          clients={clients}
          userRole={userRole}
          lockEmpresa="MARINA"
        />
      )}

    </div>
  );
}
