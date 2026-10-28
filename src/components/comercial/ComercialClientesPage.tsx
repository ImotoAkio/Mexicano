import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  Ship,
  Eye,
  Edit2,
  LayoutGrid,
  List,
  MessageCircle,
  Anchor,
  UserCheck,
  UserX,
  SlidersHorizontal,
  X,
  RotateCcw,
  FileSignature
} from 'lucide-react';
import { clientDB, boatDB, syncWithRemote, onDbUpdate, isDbLoaded } from '../../db';
import { Cliente, Embarcacao } from '../../types';
import { getBoatCode, matchClientBoat, getClientAllBoatIds } from '../../utils/boatUtils';
import ClientProfileModal from '../ClientProfileModal';
import ComercialClientModal from './ComercialClientModal';
import ComercialContratoViewerModal from './ComercialContratoViewerModal';
import ComercialClientFilterDrawer, {
  ClientFilters,
  DEFAULT_CLIENT_FILTERS
} from './ComercialClientFilterDrawer';

interface ComercialClientesPageProps {
  userRole?: string;
}

export default function ComercialClientesPage({ userRole }: ComercialClientesPageProps = {}) {
  const effectiveRole = (userRole || localStorage.getItem('admin_role') || 'comercial').toLowerCase().trim();
  const isMarinaGerente = effectiveRole === 'marina_gerente' || effectiveRole === 'marina';

  const [clients, setClients] = useState<Cliente[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros avançados com Drawer
  const [filters, setFilters] = useState<ClientFilters>(DEFAULT_CLIENT_FILTERS);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !isDbLoaded && clientDB.getAll().length === 0);

  // Modais
  const [selectedClientForProfile, setSelectedClientForProfile] = useState<Cliente | null>(null);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<Cliente | null>(null);
  const [selectedClientForContract, setSelectedClientForContract] = useState<Cliente | null>(null);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);

  // Carregar dados locais
  const loadData = () => {
    const cl = clientDB.getAll();
    const bt = boatDB.getAll();
    setClients([...cl]);
    setBoats([...bt]);
    if (cl.length > 0 || isDbLoaded) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadData();

    const unsubscribe = onDbUpdate(() => {
      if (isMounted) loadData();
    });

    if (!isDbLoaded || clientDB.getAll().length === 0) {
      setIsLoading(true);
      syncWithRemote()
        .then(() => {
          if (isMounted) loadData();
        })
        .catch(err => console.error('[Clientes] Falha ao sincronizar:', err))
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Sincronizar com VPS / Remote DB
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncWithRemote();
      loadData();
    } catch (err) {
      console.error('Erro ao sincronizar clientes:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Mapa de nomes de embarcações por ID
  const boatsMap = useMemo(() => {
    const map = new Map<string, Embarcacao>();
    boats.forEach(b => map.set(b.id, b));
    return map;
  }, [boats]);

  // KPIs
  const stats = useMemo(() => {
    const total = clients.length;
    const ativos = clients.filter(c => c.status !== 'inativo').length;
    const inativos = clients.filter(c => c.status === 'inativo').length;
    const cotistas = clients.filter(c => {
      const hasMain = !!c.embarcacaoId;
      const hasMultiple = c.embarcacoes && c.embarcacoes.length > 0;
      return hasMain || hasMultiple;
    }).length;

    return { total, ativos, inativos, cotistas };
  }, [clients]);


  // Função auxiliar de normalização de texto sem acentos
  const normalizeText = (text?: string | null): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Resolver embarcação associada a um cliente com suporte a ID, código (M16) ou nome
  const resolveBoatForClient = (rawRef?: string): Embarcacao | undefined => {
    if (!rawRef) return undefined;
    const direct = boatsMap.get(rawRef);
    if (direct) return direct;
    return boats.find(b => matchClientBoat(rawRef, b));
  };

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.boatIds.length > 0) count += filters.boatIds.length;
    if (filters.planos.length > 0) count += filters.planos.length;
    if (filters.statusFinanceiro.length > 0) count += filters.statusFinanceiro.length;
    if (filters.empresas.length > 0) count += filters.empresas.length;
    if (filters.statusCadastral.length > 0) count += filters.statusCadastral.length;
    if (filters.vinculo !== 'all') count += 1;
    return count;
  }, [filters]);

  // Filtragem de clientes com múltiplos critérios
  const filteredClients = useMemo(() => {
    const rawTerm = searchTerm.trim();
    const term = normalizeText(rawTerm);
    const termDigits = rawTerm.replace(/\D/g, '');

    return clients.filter(client => {
      // 1. Filtro por Embarcação (Multi-select robusto)
      if (filters.boatIds.length > 0) {
        const clientBoatIds = getClientAllBoatIds(client, boats);
        const hasMatchingBoat = filters.boatIds.some(id => clientBoatIds.has(id));
        if (!hasMatchingBoat) return false;
      }

      // 2. Filtro por Plano (Multi-select)
      if (filters.planos.length > 0) {
        const hasCompleto = (Array.isArray(client.embarcacoes) && client.embarcacoes.some(eb => eb?.plano === 'completo')) || client.plano === 'completo';
        const hasNormal = (Array.isArray(client.embarcacoes) && client.embarcacoes.some(eb => (eb?.plano || 'normal') === 'normal')) || (!hasCompleto);
        const matchesCompleto = filters.planos.includes('completo') && hasCompleto;
        const matchesNormal = filters.planos.includes('normal') && hasNormal;
        if (!matchesCompleto && !matchesNormal) return false;
      }

      // 3. Filtro por Status Financeiro (Multi-select)
      if (filters.statusFinanceiro.length > 0) {
        const fin = client.statusFinanceiro || 'em_dia';
        if (!filters.statusFinanceiro.includes(fin)) {
          return false;
        }
      }

      // 4. Filtro por Empresa (Multi-select)
      if (filters.empresas.length > 0) {
        const clientEmpresas = (client.empresas && client.empresas.length > 0) ? client.empresas : ['VALE'];
        const hasMatchingEmpresa = filters.empresas.some(emp => clientEmpresas.includes(emp));
        if (!hasMatchingEmpresa) return false;
      }

      // 5. Filtro por Status Cadastral (Multi-select)
      if (filters.statusCadastral.length > 0) {
        const effectiveStatus = client.status === 'inativo' ? 'inativo' : 'ativo';
        if (!filters.statusCadastral.includes(effectiveStatus)) return false;
      }

      // 6. Filtro por Vínculo Náutico
      if (filters.vinculo !== 'all') {
        const hasBoats = !!client.embarcacaoId || (client.embarcacoes && client.embarcacoes.length > 0);
        if (filters.vinculo === 'com_embarcacao' && !hasBoats) return false;
        if (filters.vinculo === 'sem_embarcacao' && hasBoats) return false;
      }

      // 7. Busca Textual Rigorosa (Nome, CPF, Telefone, E-mail, Embarcação, Cota)
      if (term) {
        const matchName = normalizeText(client.nome).includes(term);
        const matchEmail = normalizeText(client.email).includes(term);

        // CPF: se houver dígitos na busca, compara apenas dígitos; senão compara string direta
        const cpfDigits = (client.cpf || '').replace(/\D/g, '');
        const matchCpf = termDigits.length > 0
          ? cpfDigits.includes(termDigits)
          : normalizeText(client.cpf).includes(term);

        // Telefone: se houver ao menos 3 dígitos, compara dígitos limpos
        const telDigits = (client.telefone || '').replace(/\D/g, '');
        const matchPhone = termDigits.length >= 3
          ? telDigits.includes(termDigits)
          : normalizeText(client.telefone).includes(term);

        // Cota: testa cota principal e array de cotas
        const matchCota = (client.cota && normalizeText(client.cota).includes(term)) ||
          Boolean(client.embarcacoes && client.embarcacoes.some(eb => eb.cota && normalizeText(eb.cota).includes(term)));

        // Embarcação: testa IDs, nomes, códigos (ex: M16, M10, 58) e modelos
        const clientBoatIds = getClientAllBoatIds(client, boats);
        let matchBoat = false;
        for (const bId of clientBoatIds) {
          const b = boatsMap.get(bId);
          if (!b) continue;
          if (normalizeText(b.nome).includes(term)) { matchBoat = true; break; }
          if (normalizeText(b.modelo).includes(term)) { matchBoat = true; break; }
          if (normalizeText(getBoatCode(b)).includes(term)) { matchBoat = true; break; }
        }
        if (!matchBoat) {
          if (client.embarcacaoId && normalizeText(client.embarcacaoId).includes(term)) matchBoat = true;
          if (client.embarcacoes?.some(eb => normalizeText(eb.embarcacaoId).includes(term))) matchBoat = true;
        }

        // Empresa e Cidade/Estado
        const matchEmpresa = Boolean(client.empresas?.some(emp => normalizeText(emp).includes(term)));
        const matchCidade = client.cidade ? normalizeText(client.cidade).includes(term) : false;

        return Boolean(
          matchName ||
          matchCpf ||
          matchPhone ||
          matchEmail ||
          matchCota ||
          matchBoat ||
          matchEmpresa ||
          matchCidade
        );
      }

      return true;
    });
  }, [clients, searchTerm, filters, boatsMap, boats]);

  // Obter lista consolidada de embarcações e cotas de um cliente
  const getClientBoatsSummary = (client: Cliente) => {
    const list: Array<{ name: string; cota: string; id: string }> = [];

    if (client.embarcacoes && client.embarcacoes.length > 0) {
      client.embarcacoes.forEach(eb => {
        const b = resolveBoatForClient(eb.embarcacaoId);
        list.push({
          name: b ? (getBoatCode(b) !== b.nome ? `${getBoatCode(b)} (${b.nome})` : b.nome) : (eb.embarcacaoId || 'Embarcação'),
          cota: eb.cota || client.cota || 'Cota',
          id: b?.id || eb.embarcacaoId
        });
      });
    } else if (client.embarcacaoId) {
      const b = resolveBoatForClient(client.embarcacaoId);
      list.push({
        name: b ? (getBoatCode(b) !== b.nome ? `${getBoatCode(b)} (${b.nome})` : b.nome) : client.embarcacaoId,
        cota: client.cota || 'Cota',
        id: b?.id || client.embarcacaoId
      });
    }

    return list;
  };

  // Formatação de data
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Formatação de telefone profissional
  const formatPhone = (phone?: string) => {
    if (!phone) return null;
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('55') && clean.length >= 12) {
      clean = clean.slice(2);
    }
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phone;
  };

  // URL WhatsApp
  const getWhatsAppUrl = (phone?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    const full = clean.length <= 11 ? `55${clean}` : clean;
    return `https://wa.me/${full}`;
  };

  return (
    <div className="space-y-5">
      {/* 1. Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              {isMarinaGerente ? 'Clientes e Cotistas da Marina' : 'Cadastro de Clientes'}
            </h1>
            {isMarinaGerente && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                Painel Marina Club
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500">
            {isMarinaGerente
              ? 'Gerencie cotistas, condutores autorizados e contratos vinculados à Marina Club Velho Chico.'
              : 'Gerencie cotistas, contratos e clientes da Vale Administradora e Marina Club Velho Chico.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="h-9 px-3.5 rounded-lg bg-white border border-stone-200/90 hover:bg-stone-50 text-stone-700 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            title="Atualizar lista com o servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Atualizando…' : 'Sincronizar'}</span>
          </button>

          <button
            onClick={() => setIsNewClientOpen(true)}
            className="h-9 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white flex items-center gap-2 text-xs font-semibold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* 2. Cards de Métricas / KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Total de Clientes</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 tabular-nums">{stats.total}</span>
            <span className="text-xs text-stone-400">cadastrados</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Clientes Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 tabular-nums">{stats.ativos}</span>
            {stats.total > 0 && (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                {Math.round((stats.ativos / stats.total) * 100)}%
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Cotistas / Proprietários</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Ship className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700 tabular-nums">{stats.cotistas}</span>
            <span className="text-xs text-stone-400">com cotas</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Clientes Inativos</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-600 tabular-nums">{stats.inativos}</span>
            <span className="text-xs text-stone-400">desativados</span>
          </div>
        </div>
      </div>

      {/* 3. Barra de Controle: Busca + Botão Filtros + Alternância de View */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Campo de Busca Principal */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, telefone, e-mail ou cota..."
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

          {/* Botões de Ação Direita */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Botão de Filtros que abre o Drawer Lateral */}
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

            {/* Embarcações */}
            {filters.boatIds.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200/60">
                <Ship className="w-3 h-3 text-blue-600" />
                <span>
                  {filters.boatIds.length === 1
                    ? boatsMap.get(filters.boatIds[0])?.nome || '1 embarcação'
                    : `${filters.boatIds.length} embarcações`}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, boatIds: [] })}
                  className="hover:text-blue-950 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Planos */}
            {filters.planos.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                <span>Plano: {filters.planos.join(', ')}</span>
                <button
                  onClick={() => setFilters({ ...filters, planos: [] })}
                  className="hover:text-amber-950 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Status Financeiro */}
            {filters.statusFinanceiro.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200/60">
                <span>Fin: {filters.statusFinanceiro.join(', ')}</span>
                <button
                  onClick={() => setFilters({ ...filters, statusFinanceiro: [] })}
                  className="hover:text-purple-950 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Empresas */}
            {filters.empresas.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-100 text-stone-800 border border-stone-200/60">
                <span>Empresas: {filters.empresas.join(', ')}</span>
                <button
                  onClick={() => setFilters({ ...filters, empresas: [] })}
                  className="hover:text-stone-950 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Status Cadastral */}
            {filters.statusCadastral.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-stone-100 text-stone-800 border border-stone-200/60">
                <span>Status: {filters.statusCadastral.join(', ')}</span>
                <button
                  onClick={() => setFilters({ ...filters, statusCadastral: [] })}
                  className="hover:text-stone-950 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Vínculo */}
            {filters.vinculo !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                <span>{filters.vinculo === 'com_embarcacao' ? 'Com cotas' : 'Sem cotas'}</span>
                <button
                  onClick={() => setFilters({ ...filters, vinculo: 'all' })}
                  className="hover:text-emerald-950 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={() => setFilters(DEFAULT_CLIENT_FILTERS)}
              className="text-[11px] text-mx-red hover:underline font-medium ml-1 cursor-pointer"
            >
              Limpar todos
            </button>
          </div>
        )}
      </div>

      {/* 5. Listagem de Clientes */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-stone-200/80 p-16 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-stone-100 mx-auto flex items-center justify-center text-stone-500 mb-3">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-base font-semibold text-stone-800">Carregando carteira de clientes...</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            Sincronizando clientes e cotistas com a base de dados.
          </p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200/80 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-stone-100 mx-auto flex items-center justify-center text-stone-400 mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-stone-800">Nenhum cliente encontrado</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            {searchTerm || activeFiltersCount > 0
              ? 'Tente ajustar os termos de busca ou remover alguns filtros.'
              : 'Não há clientes cadastrados no sistema atualmente.'}
          </p>
          {(searchTerm || activeFiltersCount > 0) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilters(DEFAULT_CLIENT_FILTERS);
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
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Embarcação / Cota</th>
                  <th className="py-3 px-4">Contato</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4">Empresas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredClients.map(client => {
                  const boatsSummary = getClientBoatsSummary(client);
                  const isAtivo = client.status !== 'inativo';
                  const waUrl = getWhatsAppUrl(client.telefone);

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-stone-50/60 transition-colors group"
                    >
                      {/* Cliente (Avatar + Nome + CPF) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-mx-ink-100 text-mx-ink flex items-center justify-center font-bold text-xs shrink-0 border border-mx-ink/10">
                            {client.nome ? client.nome.slice(0, 2).toUpperCase() : 'CL'}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => setSelectedClientForProfile(client)}
                              className="font-semibold text-stone-900 hover:text-mx-ink hover:underline text-left truncate block max-w-[210px] cursor-pointer"
                              title="Ver ficha completa"
                            >
                              {client.nome}
                            </button>
                            <span className="text-[11px] text-stone-400 block truncate">
                              {client.cpf ? `CPF: ${client.cpf}` : (client.email || 'Sem documento')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Embarcação / Cota */}
                      <td className="py-3 px-4">
                        {boatsSummary.length > 0 ? (
                          <div className="flex flex-col gap-1 max-w-[220px]">
                            {boatsSummary.slice(0, 2).map((b, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200/60 text-[11px] font-medium text-stone-700 truncate"
                              >
                                <Anchor className="w-3 h-3 text-stone-500 shrink-0" />
                                <span className="truncate">{b.name}</span>
                                <span className="text-stone-400 font-semibold shrink-0">({b.cota})</span>
                              </span>
                            ))}
                            {boatsSummary.length > 2 && (
                              <span className="text-[10px] text-stone-400 font-medium">
                                +{boatsSummary.length - 2} outra(s)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400 italic text-[11px]">Nenhuma vinculada</span>
                        )}
                      </td>

                      {/* Contatos */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          {client.telefone ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-stone-700 font-medium tabular-nums">{formatPhone(client.telefone)}</span>
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-5 h-5 rounded flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors"
                                  title="Conversar no WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-400 italic text-[11px]">Sem telefone</span>
                          )}
                          {client.email && (
                            <span className="text-[11px] text-stone-400 truncate max-w-[180px]">
                              {client.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Plano */}
                      <td className="py-3 px-4">
                        {(() => {
                          const ebs = Array.isArray(client.embarcacoes) && client.embarcacoes.length > 0
                            ? client.embarcacoes
                            : (client.embarcacaoId ? [{ embarcacaoId: client.embarcacaoId, cota: client.cota, plano: client.plano || 'normal' }] : []);
                          
                          if (ebs.length === 0) {
                            return <span className="text-stone-400 text-[11px]">—</span>;
                          }

                          const completas = ebs.filter(e => e?.plano === 'completo');
                          const normais = ebs.filter(e => (e?.plano || 'normal') === 'normal');

                          if (completas.length > 0 && normais.length > 0) {
                            return (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {completas.length}x Completo
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600">
                                  {normais.length}x Normal
                                </span>
                              </div>
                            );
                          }

                          const isAllCompleto = completas.length > 0;
                          return (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                isAllCompleto
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                  : 'bg-stone-100 text-stone-600 border border-stone-200/60'
                              }`}
                            >
                              {isAllCompleto ? 'Completo' : 'Normal'}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Empresas */}
                      <td className="py-3 px-4">
                        {client.empresas && client.empresas.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {client.empresas.map(emp => (
                              <span
                                key={emp}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200/50"
                              >
                                {emp === 'VALE' ? 'Vale Administradora' : emp === 'MARINA' ? 'Marina' : emp}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-stone-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isAtivo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-stone-100 text-stone-500 border border-stone-200/60'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isAtivo ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                          {isAtivo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setSelectedClientForContract(client)}
                            className="p-1.5 rounded-md hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                            title="Visualizar Contrato Oficial"
                          >
                            <FileSignature className="w-3.5 h-3.5 text-stone-600" />
                          </button>
                          <button
                            onClick={() => setSelectedClientForProfile(client)}
                            className="p-1.5 rounded-md hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                            title="Ver ficha do cliente"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedClientForEdit(client)}
                            className="p-1.5 rounded-md hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                            title="Editar cadastro"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="py-2.5 px-4 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>
              Mostrando <strong className="text-stone-800">{filteredClients.length}</strong> de{' '}
              <strong className="text-stone-800">{clients.length}</strong> clientes
            </span>
          </div>
        </div>
      ) : (
        /* VISUALIZAÇÃO EM GRADE (CARDS) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredClients.map(client => {
            const boatsSummary = getClientBoatsSummary(client);
            const isAtivo = client.status !== 'inativo';
            const waUrl = getWhatsAppUrl(client.telefone);

            return (
              <div
                key={client.id}
                className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-mx-ink-100 text-mx-ink flex items-center justify-center font-bold text-xs shrink-0 border border-mx-ink/10">
                        {client.nome ? client.nome.slice(0, 2).toUpperCase() : 'CL'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-stone-900 text-xs truncate" title={client.nome}>
                          {client.nome}
                        </h4>
                        <span className="text-[11px] text-stone-400 block truncate">
                          {client.cpf ? `CPF: ${client.cpf}` : (client.email || 'Sem CPF')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(() => {
                        const hasComp = (Array.isArray(client.embarcacoes) && client.embarcacoes.some(e => e?.plano === 'completo')) || client.plano === 'completo';
                        return (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              hasComp
                                ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {hasComp ? 'Completo' : 'Normal'}
                          </span>
                        );
                      })()}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isAtivo
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isAtivo ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                        {isAtivo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  {/* Embarcações */}
                  <div className="mb-3">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                      Embarcação / Cota
                    </span>
                    {boatsSummary.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {boatsSummary.map((b, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200/60 text-[11px] font-medium text-stone-700"
                          >
                            <Anchor className="w-3 h-3 text-stone-500" />
                            <span className="truncate max-w-[120px]">{b.name}</span>
                            <span className="text-stone-400 font-semibold">({b.cota})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-stone-400 text-xs italic">Nenhuma vinculada</span>
                    )}
                  </div>

                  {/* Contatos */}
                  <div className="space-y-1 mb-3 text-xs">
                    {client.telefone && (
                      <div className="flex items-center justify-between text-stone-600">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <span className="tabular-nums">{formatPhone(client.telefone)}</span>
                        </span>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-[11px] font-medium"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-1.5 text-stone-500 truncate">
                        <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-end">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedClientForContract(client)}
                      className="px-2 py-1 rounded-md text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Contrato"
                    >
                      <FileSignature className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedClientForEdit(client)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setSelectedClientForProfile(client)}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold text-mx-ink bg-mx-ink-100 hover:bg-mx-ink hover:text-white transition-colors cursor-pointer"
                    >
                      Ficha
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal do Visualizador de Contratos */}
      {selectedClientForContract && (
        <ComercialContratoViewerModal
          isOpen={!!selectedClientForContract}
          onClose={() => setSelectedClientForContract(null)}
          cliente={selectedClientForContract}
          embarcacao={boatsMap.get(
            selectedClientForContract.embarcacoes?.[0]?.embarcacaoId ||
            selectedClientForContract.embarcacaoId
          ) || null}
          onStatusChange={() => loadData()}
        />
      )}

      {/* Drawer de Filtros Avançados */}
      <ComercialClientFilterDrawer
        open={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onChangeFilters={setFilters}
        boats={boats}
        clients={clients}
        totalFiltered={filteredClients.length}
      />

      {/* Modal de Ficha/Perfil do Cliente */}
      {selectedClientForProfile && (
        <ClientProfileModal
          client={selectedClientForProfile}
          boats={boats}
          onClose={() => setSelectedClientForProfile(null)}
        />
      )}

      {/* Modal de Edição / Cadastro de Cliente no padrão Split-View */}
      <ComercialClientModal
        isOpen={!!selectedClientForEdit}
        editingClient={selectedClientForEdit}
        boats={boats}
        clients={clients}
        onClose={() => setSelectedClientForEdit(null)}
        onSave={saved => {
          setSelectedClientForEdit(null);
          loadData();
        }}
      />

      <ComercialClientModal
        isOpen={isNewClientOpen}
        editingClient={null}
        boats={boats}
        clients={clients}
        onClose={() => setIsNewClientOpen(false)}
        onSave={saved => {
          setIsNewClientOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
