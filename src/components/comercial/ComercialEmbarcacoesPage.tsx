import React, { useState, useEffect, useMemo } from 'react';
import {
  Ship,
  Search,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  X,
  LayoutGrid,
  List,
  Edit2,
  Anchor,
  Gauge,
  Users,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  Building2,
  RotateCcw,
  Eye,
  Lock,
  Check,
  Share2,
  Clock,
  Waves
} from 'lucide-react';
import { boatDB, clientDB, syncWithRemote, onDbUpdate, isDbLoaded } from '../../db';
import { Embarcacao, Cliente } from '../../types';
import { getBoatCotaOccupancyMap, getBoatTotalCotas, getClientCotasForBoat, getBoatEstoqueResumo, getBoatCotasStatusList, normalizeCotaCode } from '../../utils/cotaUtils';
import { getTaxaAdmMensal } from '../../utils/boatUtils';
import { isInternalMexicano, formatBoatName } from '../../utils/constants';
import ComercialBoatDrawer from './ComercialBoatDrawer';
import ComercialCotaTransferModal from './ComercialCotaTransferModal';
import ComercialBoatFilterDrawer, {
  BoatFilters,
  DEFAULT_BOAT_FILTERS
} from './ComercialBoatFilterDrawer';

interface ComercialEmbarcacoesPageProps {
  userRole?: string;
  onOpenProposta?: (lead?: any, boatId?: string, cota?: string) => void;
  onOpenVenda?: (boatId?: string, cota?: string, clienteId?: string) => void;
  onOpenSeaTrial?: (lead?: any, boatId?: string) => void;
}

export default function ComercialEmbarcacoesPage({
  userRole,
  onOpenProposta,
  onOpenVenda,
  onOpenSeaTrial
}: ComercialEmbarcacoesPageProps = {}) {
  const effectiveRole = (userRole || localStorage.getItem('admin_role') || 'comercial').toLowerCase().trim();
  const isMarinaGerente = effectiveRole === 'marina_gerente' || effectiveRole === 'marina';
  const isComercial = effectiveRole === 'comercial';
  const isAdmin = effectiveRole === 'admin';

  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [activeReservas, setActiveReservas] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickEmpresa, setQuickEmpresa] = useState<'all' | 'MARINA' | 'VALE'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !isDbLoaded && boatDB.getAll().length === 0);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  // Filtros avançados com Drawer
  const [filters, setFilters] = useState<BoatFilters>(DEFAULT_BOAT_FILTERS);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Drawer de Cadastro/Edição
  const [selectedBoatForEdit, setSelectedBoatForEdit] = useState<Embarcacao | null>(null);
  const [isNewBoatOpen, setIsNewBoatOpen] = useState(false);

  // Modal de Cota (Reserva 48h / Repasse)
  const [isCotaModalOpen, setIsCotaModalOpen] = useState(false);
  const [modalBoatId, setModalBoatId] = useState<string>('');
  const [modalCota, setModalCota] = useState<string>('C1');
  const [modalMode, setModalMode] = useState<'reserva' | 'repasse' | 'recompra' | 'transferencia'>('reserva');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Verificador de Permissões:
  // - Admin: edita tudo
  // - Comercial: edita Vale e Mexicano (Marina pura é consulta)
  // - Gerente Marina: consulta apenas embarcações com Vale, mas pode criar/editar/excluir Marina
  const canEditBoat = (boat: Embarcacao | null | undefined): boolean => {
    if (!boat) return true;
    if (isAdmin) return true;

    const boatEmpresas = (boat.empresas && boat.empresas.length > 0) ? boat.empresas : ['VALE'];
    const hasVale = boatEmpresas.includes('VALE');
    const hasMexicano = boatEmpresas.includes('MEXICANO');

    if (isMarinaGerente) {
      // Se estiver vinculada à Vale Náutica, Gerente da Marina tem somente permissão de consulta
      if (hasVale) return false;
      // Embarcações da Marina (ou sem vínculo Vale): controle total
      return true;
    }

    if (isComercial) {
      // Comercial pode gerenciar Vale e Mexicano
      if (hasVale || hasMexicano) return true;
      // Embarcações puras da Marina não podem ser alteradas pelo Comercial
      return false;
    }

    return true;
  };

  const handleDeleteBoat = (id: string, name: string) => {
    try {
      boatDB.delete(id);
      loadData();
    } catch (err: any) {
      console.error('Erro ao excluir embarcação:', err);
      alert('Não foi possível excluir a embarcação: ' + (err.message || 'Erro desconhecido'));
    }
  };

  // Carregar dados
  const loadData = () => {
    const bt = boatDB.getAll();
    const cl = clientDB.getAll();
    setBoats([...bt]);
    setClients([...cl]);
    if (bt.length > 0 || isDbLoaded) {
      setIsLoading(false);
    }

    const token = localStorage.getItem('admin_token');
    if (token) {
      fetch('/api/comercial/cotas-reservadas', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && Array.isArray(data.reservas)) {
            setActiveReservas(data.reservas);
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadData();

    const unsubscribe = onDbUpdate(() => {
      if (isMounted) loadData();
    });

    if (!isDbLoaded || boatDB.getAll().length === 0) {
      setIsLoading(true);
      syncWithRemote()
        .then(() => {
          if (isMounted) loadData();
        })
        .catch(err => console.error('[Embarcacoes] Falha ao sincronizar:', err))
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncWithRemote();
      loadData();
    } catch (err) {
      console.error('Erro ao sincronizar embarcações:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Mapa de Clientes por ID para resolver os nomes dos cotistas
  const clientsMap = useMemo(() => {
    const map = new Map<string, Cliente>();
    clients.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);

  // Mapa de cotistas consolidados por embarcação (garante sincronia total bidirecional)
  const boatCotistasMap = useMemo(() => {
    const map = new Map<string, Cliente[]>();

    boats.forEach(boat => {
      const clientMap = new Map<string, Cliente>();

      // Se boat.donos é um array (mesmo vazio), ele é a autoridade máxima sobre os cotistas
      if (Array.isArray(boat.donos)) {
        boat.donos.forEach(id => {
          const c = clientsMap.get(id);
          if (c) clientMap.set(c.id, c);
        });
      } else {
        // Fallback apenas para embarcações sem a propriedade donos
        clients.forEach(c => {
          const isLinked =
            c.embarcacaoId === boat.id ||
            (c.embarcacoes && c.embarcacoes.some(eb => eb.embarcacaoId === boat.id));
          if (isLinked) {
            clientMap.set(c.id, c);
          }
        });
      }

      const list = Array.from(clientMap.values()).sort((a, b) =>
        (a.nome || '').localeCompare(b.nome || '')
      );
      map.set(boat.id, list);
    });

    return map;
  }, [boats, clients, clientsMap]);

  // Identificação de vínculo com Marina e Vale
  const isBoatMarina = (boat: Embarcacao): boolean => {
    const bEmpresas = (boat.empresas && boat.empresas.length > 0) ? boat.empresas : ['VALE'];
    if (bEmpresas.includes('MARINA')) return true;
    const donos = boatCotistasMap.get(boat.id) || [];
    return donos.some(c => (c.empresas || ['VALE']).includes('MARINA'));
  };

  const isBoatVale = (boat: Embarcacao): boolean => {
    const bEmpresas = (boat.empresas && boat.empresas.length > 0) ? boat.empresas : ['VALE'];
    if (bEmpresas.includes('VALE')) return true;
    const donos = boatCotistasMap.get(boat.id) || [];
    return donos.some(c => (c.empresas || ['VALE']).includes('VALE'));
  };

  // Contagem para o filtro rápido Vale vs Marina
  const { countMarina, countVale } = useMemo(() => {
    let marina = 0;
    let vale = 0;
    boats.forEach(b => {
      if (isBoatMarina(b)) marina++;
      if (isBoatVale(b)) vale++;
    });
    return { countMarina: marina, countVale: vale };
  }, [boats, boatCotistasMap]);

  // Estatísticas / KPIs da Frota Geral
  const stats = useMemo(() => {
    const total = boats.length;
    const lanchas = boats.filter(b => b.tipo === 'lancha').length;
    const jets = boats.filter(b => b.tipo === 'jet').length;
    const manutencao = boats.filter(
      b => b.emManutencao || b.statusOperacional === 'em_manutencao' || b.statusOperacional === 'pendencia'
    ).length;
    const cotistasAtivos = clients.filter(c => c.status !== 'inativo').length;

    return { total, lanchas, jets, manutencao, cotistasAtivos };
  }, [boats, clients]);

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (quickEmpresa !== 'all') count += 1;
    if (filters.tipos.length > 0) count += filters.tipos.length;
    if (filters.statusOperacional.length > 0) count += filters.statusOperacional.length;
    if (filters.empresas.length > 0) count += filters.empresas.length;
    if (filters.vinculoCotistas !== 'all') count += 1;
    return count;
  }, [filters, quickEmpresa]);

  // Filtragem
  const filteredBoats = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return boats.filter(b => {
      // 0. Filtro Rápido: Vale vs Marina
      if (quickEmpresa === 'MARINA' && !isBoatMarina(b)) return false;
      if (quickEmpresa === 'VALE' && !isBoatVale(b)) return false;

      // 1. Tipo
      if (filters.tipos.length > 0) {
        if (!filters.tipos.includes(b.tipo)) return false;
      }

      // 2. Status Operacional
      if (filters.statusOperacional.length > 0) {
        const effectiveStatus = b.statusOperacional || (b.emManutencao ? 'em_manutencao' : 'disponivel');
        if (!filters.statusOperacional.includes(effectiveStatus)) return false;
      }

      // 3. Empresas
      if (filters.empresas.length > 0) {
        const bEmpresas = b.empresas || [];
        const hasMatching = filters.empresas.some(emp => bEmpresas.includes(emp));
        if (!hasMatching) return false;
      }

      // 4. Vínculo com Cotistas
      if (filters.vinculoCotistas !== 'all') {
        const cotistas = boatCotistasMap.get(b.id) || [];
        const hasDonos = cotistas.length > 0;
        if (filters.vinculoCotistas === 'com_cotistas' && !hasDonos) return false;
        if (filters.vinculoCotistas === 'sem_cotistas' && hasDonos) return false;
      }

      // 5. Busca Textual
      if (term) {
        const matchName = b.nome?.toLowerCase().includes(term);
        const matchNumero = b.numero?.toLowerCase().includes(term);
        const matchModelo = b.modelo?.toLowerCase().includes(term);
        const matchFabricante = b.fabricante?.toLowerCase().includes(term);
        const matchVaga = b.vaga?.toLowerCase().includes(term);

        // Checar nomes de cotistas vinculados
        const cotistas = boatCotistasMap.get(b.id) || [];
        const matchDono = cotistas.some(c =>
          c.nome?.toLowerCase().includes(term) || (c.cpf && c.cpf.includes(term))
        );

        return matchName || matchNumero || matchModelo || matchFabricante || matchVaga || matchDono;
      }

      return true;
    });
  }, [boats, searchTerm, filters, boatCotistasMap]);

  return (
    <div className="space-y-5">
      {/* 1. Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              {isMarinaGerente ? 'Embarcações da Marina' : 'Embarcações da Frota'}
            </h1>
            {isMarinaGerente && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                Painel Marina Club
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500">
            {isMarinaGerente
              ? 'Consulte a frota náutica e gerencie as embarcações próprias da Marina com total autonomia.'
              : 'Gerencie as lanchas, jet skis, vagas e distribuição de cotas da frota comercial.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="h-9 px-3.5 rounded-lg bg-white border border-stone-200/90 hover:bg-stone-50 text-stone-700 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            title="Atualizar frota com o servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Atualizando…' : 'Sincronizar'}</span>
          </button>

          <button
            onClick={() => setIsNewBoatOpen(true)}
            className="h-9 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white flex items-center gap-2 text-xs font-semibold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Embarcação</span>
          </button>
        </div>
      </div>

      {/* Alerta de Regra Operacional Marina Club */}
      {isMarinaGerente && (
        <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between gap-3 text-xs text-indigo-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Ship className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-indigo-950 block">Regra de Acesso e Permissões</span>
              <span className="text-[11px] text-indigo-700">
                Embarcações vinculadas à Marina possuem permissão completa (cadastro, edição e exclusão). Embarcações da Vale Náutica estão disponíveis exclusivamente em modo de consulta.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-bold shrink-0">
            Gerente Marina
          </span>
        </div>
      )}

      {/* 2. KPIs de Embarcações */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Frota Total</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <Ship className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 tabular-nums">{stats.total}</span>
            <span className="text-xs text-stone-400">embarcações</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Lanchas</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Anchor className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700 tabular-nums">{stats.lanchas}</span>
            <span className="text-xs text-stone-400">cabinadas / abertas</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Jet Skis</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 tabular-nums">{stats.jets}</span>
            <span className="text-xs text-stone-400">motonáutica</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Cotistas Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-700 tabular-nums">{stats.cotistasAtivos}</span>
            <span className="text-xs text-stone-400">vinculados</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Em Manutenção</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700 tabular-nums">{stats.manutencao}</span>
            <span className="text-xs text-stone-400">em revisão</span>
          </div>
        </div>
      </div>

      {/* 3. Barra de Controle: Busca + Filtros + View */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Busca */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nome, modelo, fabricante, vaga ou cotista..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:bg-white focus:border-mx-ink transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Filtro Rápido: Vale vs Marina */}
          <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200/80 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setQuickEmpresa('all')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                quickEmpresa === 'all'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>Todas</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200/70 text-stone-700 tabular-nums font-bold">
                {boats.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setQuickEmpresa('MARINA')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                quickEmpresa === 'MARINA'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold ring-1 ring-indigo-200/60'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Ship className="w-3.5 h-3.5 text-indigo-600" />
              <span>Marina</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80 tabular-nums">
                {countMarina}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setQuickEmpresa('VALE')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                quickEmpresa === 'VALE'
                  ? 'bg-white text-amber-800 shadow-xs font-bold ring-1 ring-amber-200/60'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Anchor className="w-3.5 h-3.5 text-amber-600" />
              <span>Vale Náutica</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200/80 tabular-nums">
                {countVale}
              </span>
            </button>
          </div>

          {/* Botões Direita */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`h-10 px-3.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeFiltersCount > 0
                  ? 'bg-mx-ink text-white border-mx-ink shadow-sm hover:bg-mx-ink-700'
                  : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-mx-ink text-[11px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Alternar Tabela / Cards */}
            <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-stone-500">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'
                }`}
                title="Visualização em tabela"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'
                }`}
                title="Visualização em grade de cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4. Chips de Filtros Ativos */}
        {activeFiltersCount > 0 && (
          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-medium text-stone-400 mr-1">Filtros aplicados:</span>

            {quickEmpresa !== 'all' && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                quickEmpresa === 'MARINA'
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                <span>{quickEmpresa === 'MARINA' ? 'Marina Club' : 'Vale Náutica'}</span>
                <button
                  onClick={() => setQuickEmpresa('all')}
                  className="hover:opacity-75 ml-0.5 cursor-pointer"
                  title="Remover filtro de empresa"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.tipos.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200/60">
                <span>Tipo: {filters.tipos.join(', ')}</span>
                <button
                  onClick={() => setFilters({ ...filters, tipos: [] })}
                  className="hover:text-blue-950 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.statusOperacional.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-100 text-stone-800 border border-stone-200/60">
                <span>Status: {filters.statusOperacional.join(', ')}</span>
                <button
                  onClick={() => setFilters({ ...filters, statusOperacional: [] })}
                  className="hover:text-stone-950 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.empresas.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-100 text-stone-800 border border-stone-200/60">
                <span>Empresa: {filters.empresas.join(', ')}</span>
                <button
                  onClick={() => setFilters({ ...filters, empresas: [] })}
                  className="hover:text-stone-950 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.vinculoCotistas !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                <span>{filters.vinculoCotistas === 'com_cotistas' ? 'Com cotistas' : 'Sem cotistas'}</span>
                <button
                  onClick={() => setFilters({ ...filters, vinculoCotistas: 'all' })}
                  className="hover:text-emerald-950 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={() => {
                setQuickEmpresa('all');
                setFilters(DEFAULT_BOAT_FILTERS);
              }}
              className="text-[11px] text-mx-red hover:underline font-medium ml-1 cursor-pointer"
            >
              Limpar todos
            </button>
          </div>
        )}
      </div>

      {/* 5. Resultados */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-stone-200/80 p-16 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-stone-100 mx-auto flex items-center justify-center text-stone-500 mb-3">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-base font-semibold text-stone-800">Carregando frota de embarcações...</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            Sincronizando embarcações e cotas com a base de dados.
          </p>
        </div>
      ) : filteredBoats.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200/80 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-stone-100 mx-auto flex items-center justify-center text-stone-400 mb-3">
            <Ship className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-stone-800">Nenhuma embarcação encontrada</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            {searchTerm || activeFiltersCount > 0
              ? 'Tente ajustar os termos de busca ou remover alguns filtros.'
              : 'Não há embarcações cadastradas na frota atualmente.'}
          </p>
          {(searchTerm || activeFiltersCount > 0) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setQuickEmpresa('all');
                setFilters(DEFAULT_BOAT_FILTERS);
              }}
              className="mt-4 px-3.5 py-2 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Redefinir busca e filtros
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* VISUALIZAÇÃO EM TABELA */
        <div className="bg-white rounded-xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/90 border-b border-stone-200/80 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Embarcação</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Vaga / Local</th>
                  <th className="py-3 px-4">Cotistas Vinculados</th>
                  <th className="py-3 px-4">Horímetro</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredBoats.map(boat => {
                  const donosList = boatCotistasMap.get(boat.id) || [];
                  const occupiedMap = getBoatCotaOccupancyMap(boat.id, clients, boat);
                  const totalCotasBoat = getBoatTotalCotas(boat, occupiedMap.size);
                  
                  const isDisponivel =
                    !boat.emManutencao &&
                    (boat.statusOperacional === 'disponivel' || !boat.statusOperacional);
                  const isManutencao =
                    boat.emManutencao || boat.statusOperacional === 'em_manutencao';

                  return (
                    <tr
                      key={boat.id}
                      className="hover:bg-stone-50/60 transition-colors group"
                    >
                      {/* Embarcação (Nome + Modelo) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-mx-ink-100 text-mx-ink flex items-center justify-center font-bold text-xs shrink-0 border border-mx-ink/10">
                            {boat.tipo === 'jet' ? <Gauge className="w-4 h-4" /> : <Ship className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => setSelectedBoatForEdit(boat)}
                                className="font-semibold text-stone-900 hover:text-mx-ink hover:underline text-left truncate max-w-[210px] cursor-pointer"
                                title="Editar embarcação"
                              >
                                {boat.nome}
                              </button>
                              {isBoatMarina(boat) && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-tight">
                                  Marina
                                </span>
                              )}
                              {isBoatVale(boat) && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-tight">
                                  Vale
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-stone-400 block truncate">
                              {boat.fabricante || boat.modelo ? `${boat.fabricante || ''} ${boat.modelo || ''}`.trim() : (boat.tamanho ? `${boat.tamanho}` : 'Sem modelo')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            boat.tipo === 'jet'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                              : 'bg-mx-ink-50 text-mx-ink border border-mx-ink/20'
                          }`}
                        >
                          {boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}
                        </span>
                      </td>

                      {/* Vaga */}
                      <td className="py-3 px-4 text-stone-600 font-medium">
                        {boat.vaga || <span className="text-stone-400 italic text-[11px]">Não definida</span>}
                      </td>

                      {/* Cotistas & Estoque Comercial */}
                      <td className="py-3 px-4">
                        {(() => {
                          const estoque = getBoatEstoqueResumo(boat.id, clients, boat);
                          const donosReais = donosList.filter(c => !isInternalMexicano(c.id) && !isInternalMexicano(c.nome));

                          return (
                            <div className="flex flex-col gap-1 max-w-[260px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-stone-800 text-[11px] tabular-nums">
                                  {estoque.cotasVendidas}/{estoque.totalCotas} cotas vendidas
                                </span>
                                {estoque.cotasDisponiveis > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {estoque.cotasDisponiveis} em estoque Mexicano
                                  </span>
                                )}
                              </div>
                              {donosReais.length > 0 ? (
                                <span className="text-[10px] text-stone-500 truncate" title={donosReais.map(c => c.nome).join(', ')}>
                                  {donosReais
                                    .slice(0, 2)
                                    .map(c => {
                                      const cs = getClientCotasForBoat(c, boat.id, clients, boat);
                                      return `${c.nome}${cs.length > 0 ? ` (${cs.join(', ')})` : ''}`;
                                    })
                                    .join(' • ')}
                                  {donosReais.length > 2 && ` +${donosReais.length - 2}`}
                                </span>
                              ) : (
                                <span className="text-emerald-700 italic text-[10px] font-medium">100% no estoque El Mexicano</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Horímetro */}
                      <td className="py-3 px-4 text-stone-700 tabular-nums font-medium">
                        {(boat.horasMotor || boat.horimetroActual) ? (
                          <span>{boat.horasMotor || boat.horimetroActual}h</span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isDisponivel
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : isManutencao
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-red-50 text-red-700 border border-red-200/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDisponivel ? 'bg-emerald-500' : isManutencao ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                          />
                          {isDisponivel ? 'Disponível' : isManutencao ? 'Manutenção' : 'Pendência'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        {canEditBoat(boat) ? (
                          <button
                            onClick={() => setSelectedBoatForEdit(boat)}
                            className="p-1.5 rounded-md hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                            title="Editar embarcação"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedBoatForEdit(boat)}
                            className="p-1.5 rounded-md hover:bg-amber-100/70 text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
                            title="Consultar dados da embarcação (Somente Consulta)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="py-2.5 px-4 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>
              Mostrando <strong className="text-stone-800">{filteredBoats.length}</strong> de{' '}
              <strong className="text-stone-800">{boats.length}</strong> embarcações
            </span>
          </div>
        </div>
      ) : (
        /* VISUALIZAÇÃO EM GRADE (CARDS RICOS VILA NÁUTICA) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoats.map(boat => {
            const donosList = boatCotistasMap.get(boat.id) || [];
            const estoque = getBoatEstoqueResumo(boat.id, clients, boat, activeReservas);
            const slots = getBoatCotasStatusList(boat.id, clients, boat, activeReservas);
            const totalCotasBoat = Math.max(4, Math.min(8, Number(boat.totalCotas) || 8));

            const isDisponivel = !boat.emManutencao && (boat.statusOperacional === 'disponivel' || !boat.statusOperacional);
            const isManutencao = boat.emManutencao || boat.statusOperacional === 'em_manutencao';
            const isSoldOut = estoque.cotasDisponiveisMexicano === 0 && estoque.cotasRepasse === 0;

            const valorCota = Number(boat.valorCota) || 180000;
            const taxaAdmMensal = getTaxaAdmMensal(boat);

            const handleCopyLink = () => {
              const vendedor = localStorage.getItem('admin_nome') || 'comercial';
              const link = `${window.location.origin}/catalogo?barco=${boat.id}&vendedor=${encodeURIComponent(vendedor)}`;
              navigator.clipboard.writeText(link);
              setCopiedId(boat.id);
              setTimeout(() => setCopiedId(null), 2000);
            };

            return (
              <div
                key={boat.id}
                className="bg-white rounded-2xl border border-stone-200/70 hover:border-stone-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Foto de Capa com badge minimalista e elegante */}
                  <div className="relative h-40 w-full bg-stone-100 overflow-hidden">
                    {boat.imagemUrl ? (
                      <img
                        src={boat.imagemUrl}
                        alt={boat.nome}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50">
                        <Ship className="w-8 h-8 opacity-25 mb-1" />
                        <span className="text-[11px] font-normal text-stone-400">Sem foto cadastrada</span>
                      </div>
                    )}

                    {/* Badge de exceção física (apenas se em manutenção) */}
                    {isManutencao && (
                      <div className="absolute top-2.5 left-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-xs shadow-2xs border bg-white/95 text-amber-800 border-amber-200/80">
                          <Wrench className="w-2.5 h-2.5 text-amber-600" />
                          <span>Em manutenção</span>
                        </span>
                      </div>
                    )}

                    {/* Badge de disponibilidade discreto no topo direito */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium shadow-2xs backdrop-blur-xs border ${
                        isSoldOut
                          ? 'bg-stone-900/80 text-stone-200 border-stone-700/60'
                          : 'bg-white/95 text-stone-700 border-stone-200/80'
                      }`}>
                        {isSoldOut ? '100% vendida' : `${estoque.cotasDisponiveisMexicano} ${estoque.cotasDisponiveisMexicano === 1 ? 'cota livre' : 'cotas livres'}`}
                      </span>
                    </div>
                  </div>

                  {/* Informações da Embarcação */}
                  <div className="p-4 space-y-3">
                    {/* Cabeçalho do Ativo */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedBoatForEdit(boat)}
                        className="text-left font-semibold text-stone-900 text-sm tracking-tight hover:text-[#2D0A16] transition-colors truncate block w-full cursor-pointer"
                        title={boat.nome}
                      >
                        {boat.nome}
                      </button>
                      <p className="text-[11px] text-stone-400 truncate mt-0.5">
                        {boat.modelo || boat.fabricante || 'Embarcação'}
                        {boat.ano ? ` • Ano ${boat.ano}` : ''}
                        {boat.vaga ? ` • Vaga ${boat.vaga}` : ''}
                      </p>
                    </div>

                    {/* Especificações Rápidas e Discretas */}
                    <div className="flex items-center gap-2 text-[11px] text-stone-500">
                      <span>{boat.potencia || 'Motor'}</span>
                      <span className="text-stone-300">•</span>
                      <span>{boat.horasMotor || 0}h</span>
                      <span className="text-stone-300">•</span>
                      <span>{boat.capacidadePassageiros || 8} passageiros</span>
                    </div>

                    {/* Valores Comerciais Sóbrios */}
                    <div className="pt-2.5 border-t border-stone-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block">
                          Valor da cota
                        </span>
                        <span className="text-sm font-bold text-stone-900 tabular-nums">
                          R$ {valorCota.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block">
                          Condomínio / mês
                        </span>
                        <span className="text-xs font-medium text-stone-600 tabular-nums">
                          R$ {taxaAdmMensal.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Mini-Mapa de Cotas (Compacto e Discreto) */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium">
                        <span className="uppercase tracking-wider">Espelho de Cotas</span>
                        <span>
                          {estoque.cotasDisponiveisMexicano} livres • {estoque.cotasVendidas} vendidas
                        </span>
                      </div>

                      <div className="grid grid-cols-8 gap-1">
                        {slots.map(s => {
                          const isMex = s.status === 'disponivel_mexicano';
                          const isRep = s.status === 'em_repasse';
                          const isRes = s.status === 'reservada';

                          let tooltip = `${s.cota}: Titular ${s.clienteNome}`;
                          if (isMex) tooltip = `${s.cota}: Disponível no Estoque El Mexicano`;
                          if (isRep) tooltip = `${s.cota}: Em Repasse (${s.clienteNome})`;
                          if (isRes) tooltip = `${s.cota}: Bloqueio 48h (${s.leadNome || 'Lead'})`;

                          return (
                            <button
                              key={s.cota}
                              type="button"
                              onClick={() => {
                                if (isMex || isRep) {
                                  setModalBoatId(boat.id);
                                  setModalCota(s.cota);
                                  setModalMode('reserva');
                                  setIsCotaModalOpen(true);
                                } else if (s.status === 'vendida') {
                                  setModalBoatId(boat.id);
                                  setModalCota(s.cota);
                                  setModalMode('repasse');
                                  setIsCotaModalOpen(true);
                                } else {
                                  setSelectedBoatForEdit(boat);
                                }
                              }}
                              className={`h-6 rounded flex items-center justify-center text-[10px] font-medium border transition-colors cursor-pointer ${
                                isMex
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70 hover:bg-emerald-100'
                                  : isRep
                                  ? 'bg-sky-50 text-sky-800 border-sky-200/70 hover:bg-sky-100'
                                  : isRes
                                  ? 'bg-amber-50 text-amber-800 border-amber-200/70 hover:bg-amber-100'
                                  : 'bg-stone-100 text-stone-400 border-stone-200/50 hover:bg-stone-200/60'
                              }`}
                              title={tooltip}
                            >
                              {s.cota}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card com Ações Harmoniosas */}
                <div className="px-4 py-3 bg-stone-50/50 border-t border-stone-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBoatForEdit(boat)}
                    className="flex-1 h-8 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900 text-xs font-medium flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  >
                    Painel do Ativo
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalBoatId(boat.id);
                      setModalCota('C1');
                      setModalMode('reserva');
                      setIsCotaModalOpen(true);
                    }}
                    className="h-8 px-3 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Bloquear cota por 48h"
                  >
                    <Lock className="w-3 h-3 text-stone-400" />
                    <span>Reservar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-8 h-8 rounded-xl bg-white border border-stone-200 text-stone-500 hover:text-[#2D0A16] hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
                    title="Copiar link do catálogo para WhatsApp"
                  >
                    {copiedId === boat.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Reserva / Repasse de Cota */}
      <ComercialCotaTransferModal
        isOpen={isCotaModalOpen}
        onClose={() => setIsCotaModalOpen(false)}
        preselectedBoatId={modalBoatId}
        preselectedCota={modalCota}
        initialMode={modalMode}
        boats={boats}
        clients={clients}
        onSuccess={() => loadData()}
      />

      {/* Drawer de Filtros de Embarcações */}
      <ComercialBoatFilterDrawer
        open={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onChangeFilters={setFilters}
        boats={boats}
        totalFiltered={filteredBoats.length}
      />

      {/* Drawer de Edição / Cadastro de Embarcação */}
      <ComercialBoatDrawer
        open={!!selectedBoatForEdit}
        editingBoat={selectedBoatForEdit}
        clients={clients}
        isReadOnly={!canEditBoat(selectedBoatForEdit)}
        userRole={effectiveRole}
        onDelete={handleDeleteBoat}
        onClose={() => setSelectedBoatForEdit(null)}
        onSave={saved => {
          setSelectedBoatForEdit(null);
          loadData();
        }}
      />

      <ComercialBoatDrawer
        open={isNewBoatOpen}
        editingBoat={null}
        clients={clients}
        isReadOnly={false}
        userRole={effectiveRole}
        onClose={() => setIsNewBoatOpen(false)}
        onSave={saved => {
          setIsNewBoatOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
