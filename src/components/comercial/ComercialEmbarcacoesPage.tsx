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
  RotateCcw
} from 'lucide-react';
import { boatDB, clientDB, syncWithRemote, onDbUpdate, isDbLoaded } from '../../db';
import { Embarcacao, Cliente } from '../../types';
import ComercialBoatDrawer from './ComercialBoatDrawer';
import ComercialBoatFilterDrawer, {
  BoatFilters,
  DEFAULT_BOAT_FILTERS
} from './ComercialBoatFilterDrawer';

export default function ComercialEmbarcacoesPage() {
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !isDbLoaded && boatDB.getAll().length === 0);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filtros avançados com Drawer
  const [filters, setFilters] = useState<BoatFilters>(DEFAULT_BOAT_FILTERS);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Drawer de Cadastro/Edição
  const [selectedBoatForEdit, setSelectedBoatForEdit] = useState<Embarcacao | null>(null);
  const [isNewBoatOpen, setIsNewBoatOpen] = useState(false);

  // Carregar dados
  const loadData = () => {
    const bt = boatDB.getAll();
    const cl = clientDB.getAll();
    setBoats([...bt]);
    setClients([...cl]);
    if (bt.length > 0 || isDbLoaded) {
      setIsLoading(false);
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

  // Estatísticas / KPIs
  const stats = useMemo(() => {
    const total = boats.length;
    const lanchas = boats.filter(b => b.tipo === 'lancha').length;
    const jets = boats.filter(b => b.tipo === 'jet').length;
    const manutencao = boats.filter(
      b => b.emManutencao || b.statusOperacional === 'em_manutencao' || b.statusOperacional === 'pendencia'
    ).length;

    return { total, lanchas, jets, manutencao };
  }, [boats]);

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.tipos.length > 0) count += filters.tipos.length;
    if (filters.statusOperacional.length > 0) count += filters.statusOperacional.length;
    if (filters.empresas.length > 0) count += filters.empresas.length;
    if (filters.vinculoCotistas !== 'all') count += 1;
    return count;
  }, [filters]);

  // Filtragem
  const filteredBoats = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return boats.filter(b => {
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
        const hasDonos = b.donos && b.donos.length > 0;
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
        const matchDono = b.donos?.some(donoId => {
          const c = clientsMap.get(donoId);
          return c && c.nome?.toLowerCase().includes(term);
        });

        return matchName || matchNumero || matchModelo || matchFabricante || matchVaga || matchDono;
      }

      return true;
    });
  }, [boats, searchTerm, filters, clientsMap]);

  return (
    <div className="space-y-5">
      {/* 1. Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Embarcações da Frota</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Gerencie as lanchas, jet skis, vagas e distribuição de cotas da frota comercial.
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

      {/* 2. KPIs de Embarcações */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Busca */}
          <div className="relative flex-1 min-w-[240px]">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                ×
              </button>
            )}
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
              onClick={() => setFilters(DEFAULT_BOAT_FILTERS)}
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
                  const donosList = (boat.donos || [])
                    .map(id => clientsMap.get(id))
                    .filter((c): c is Cliente => !!c);
                  
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
                            <button
                              onClick={() => setSelectedBoatForEdit(boat)}
                              className="font-semibold text-stone-900 hover:text-mx-ink hover:underline text-left truncate block max-w-[210px] cursor-pointer"
                              title="Editar embarcação"
                            >
                              {boat.nome}
                            </button>
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

                      {/* Cotistas */}
                      <td className="py-3 px-4">
                        {donosList.length > 0 ? (
                          <div className="flex flex-col gap-0.5 max-w-[220px]">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-stone-800 text-[11px]">
                                {donosList.length} cotista{donosList.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-400 truncate">
                              {donosList.slice(0, 2).map(c => c.nome).join(', ')}
                              {donosList.length > 2 && ` +${donosList.length - 2}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic text-[11px]">Nenhum cotista</span>
                        )}
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
                        <button
                          onClick={() => setSelectedBoatForEdit(boat)}
                          className="p-1.5 rounded-md hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                          title="Editar embarcação"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
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
        /* VISUALIZAÇÃO EM GRADE (CARDS) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredBoats.map(boat => {
            const donosList = (boat.donos || [])
              .map(id => clientsMap.get(id))
              .filter((c): c is Cliente => !!c);

            const isDisponivel =
              !boat.emManutencao &&
              (boat.statusOperacional === 'disponivel' || !boat.statusOperacional);
            const isManutencao =
              boat.emManutencao || boat.statusOperacional === 'em_manutencao';

            return (
              <div
                key={boat.id}
                className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-mx-ink-100 text-mx-ink flex items-center justify-center font-bold text-xs shrink-0 border border-mx-ink/10">
                        {boat.tipo === 'jet' ? <Gauge className="w-5 h-5" /> : <Ship className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-stone-900 text-xs truncate" title={boat.nome}>
                          {boat.nome}
                        </h4>
                        <span className="text-[11px] text-stone-400 block truncate">
                          {boat.fabricante || boat.modelo ? `${boat.fabricante || ''} ${boat.modelo || ''}`.trim() : 'Sem modelo'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        isDisponivel
                          ? 'bg-emerald-50 text-emerald-700'
                          : isManutencao
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isDisponivel ? 'bg-emerald-500' : isManutencao ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                      />
                      {isDisponivel ? 'Disponível' : isManutencao ? 'Manutenção' : 'Pendência'}
                    </span>
                  </div>

                  {/* Informações Rápidas */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-stone-100 mb-3 text-stone-600">
                    <div>
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                        Tipo / Tamanho
                      </span>
                      <span className="font-medium">
                        {boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'} {boat.tamanho ? `(${boat.tamanho})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                        Vaga na Marina
                      </span>
                      <span className="font-medium">{boat.vaga || 'Não definida'}</span>
                    </div>
                  </div>

                  {/* Cotistas */}
                  <div className="mb-2">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                      Cotistas ({donosList.length})
                    </span>
                    {donosList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {donosList.slice(0, 3).map(c => (
                          <span
                            key={c.id}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700 truncate max-w-[140px]"
                          >
                            {c.nome}
                          </span>
                        ))}
                        {donosList.length > 3 && (
                          <span className="text-[10px] text-stone-400 font-medium">
                            +{donosList.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-stone-400 text-xs italic">Sem cotistas vinculados</span>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400 tabular-nums">
                    {(boat.horasMotor || boat.horimetroActual) ? `${boat.horasMotor || boat.horimetroActual}h de motor` : 'Sem horímetro'}
                  </span>
                  <button
                    onClick={() => setSelectedBoatForEdit(boat)}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold text-mx-ink bg-mx-ink-100 hover:bg-mx-ink hover:text-white transition-colors cursor-pointer"
                  >
                    Editar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
        onClose={() => setIsNewBoatOpen(false)}
        onSave={saved => {
          setIsNewBoatOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
