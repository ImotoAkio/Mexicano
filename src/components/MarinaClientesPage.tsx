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
  X,
  MapPin,
  Building2,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  Filter,
  Lock
} from 'lucide-react';
import { clientDB, boatDB, syncWithRemote, onDbUpdate, isDbLoaded } from '../db';
import { Cliente, Embarcacao } from '../types';
import { getBoatCode, matchClientBoat } from '../utils/boatUtils';
import { formatBoatName, isInternalMexicano } from '../utils/constants';
import ClientProfileModal from './ClientProfileModal';
import ClientModal from './ClientModal';

interface MarinaClientesPageProps {
  operadorNome?: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function MarinaClientesPage({
  operadorNome,
  showToast: propShowToast
}: MarinaClientesPageProps = {}) {
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll() || []);
  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll() || []);
  const [isLoading, setIsLoading] = useState(() => !isDbLoaded && clientDB.getAll().length === 0);
  const [isSyncing, setIsSyncing] = useState(false);

  // ─── ABA PRINCIPAL: Separação Marina Club vs Vale Administradora vs Todas ───
  // Padrão: 'MARINA' (foco nos clientes da Marina)
  const [companyTab, setCompanyTab] = useState<'MARINA' | 'VALE' | 'ALL'>('MARINA');

  // Filtros rápidos
  const [search, setSearch] = useState('');
  const [filterBoatType, setFilterBoatType] = useState<'all' | 'lancha' | 'jet' | 'sem_barco'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [filterFinanceiro, setFilterFinanceiro] = useState<'all' | 'em_dia' | 'pendente_inadimplente'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modais
  const [selectedClientForProfile, setSelectedClientForProfile] = useState<Cliente | null>(null);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<Cliente | null>(null);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);

  // Toast local
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (propShowToast) {
      propShowToast(message, type);
    } else {
      setLocalToast({ message, type });
      setTimeout(() => setLocalToast(null), 3500);
    }
  };

  // Carregar dados locais
  const loadData = () => {
    const cl = clientDB.getAll() || [];
    const bt = boatDB.getAll() || [];
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
        .catch(err => console.error('[MarinaClientes] Falha ao sincronizar:', err))
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
      notify('Lista de clientes sincronizada com sucesso.');
    } catch (err: any) {
      notify(err.message || 'Erro ao sincronizar clientes.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── MAPEAMENTO DE EMBARCAÇÕES POR CLIENTE ───
  const clientBoatsMap = useMemo(() => {
    const map = new Map<string, Array<{ boat: Embarcacao; cota: string; plano?: string }>>();

    clients.forEach(c => {
      const list: Array<{ boat: Embarcacao; cota: string; plano?: string }> = [];

      // 1. Array de embarcações do cliente
      if (Array.isArray(c.embarcacoes) && c.embarcacoes.length > 0) {
        c.embarcacoes.forEach(eb => {
          const b = boats.find(boat => boat.id === eb.embarcacaoId || matchClientBoat(eb.embarcacaoId, boat));
          if (b && !list.some(x => x.boat.id === b.id)) {
            list.push({ boat: b, cota: eb.cota || c.cota || 'Cota', plano: eb.plano || c.plano });
          }
        });
      }

      // 2. Embarcação primária
      if (c.embarcacaoId) {
        const b = boats.find(boat => boat.id === c.embarcacaoId || matchClientBoat(c.embarcacaoId, boat));
        if (b && !list.some(x => x.boat.id === b.id)) {
          list.push({ boat: b, cota: c.cota || 'Cota', plano: c.plano });
        }
      }

      // 3. Barcos onde boat.donos inclui o cliente
      boats.forEach(b => {
        if (Array.isArray(b.donos) && b.donos.includes(c.id)) {
          if (!list.some(x => x.boat.id === b.id)) {
            list.push({ boat: b, cota: c.cota || 'Cotista', plano: c.plano });
          }
        }
      });

      map.set(c.id, list);
    });

    return map;
  }, [clients, boats]);

  // ─── CLASSIFICAÇÃO DA EMPRESA DO CLIENTE: MARINA vs VALE ───
  const getClientEmpresas = (c: Cliente, linkedBoats: Array<{ boat: Embarcacao; cota: string }>): Set<string> => {
    const set = new Set<string>();

    // 1. Empresas declaradas explicitamente no cliente (Vínculo prioritário)
    if (Array.isArray(c.empresas) && c.empresas.length > 0) {
      c.empresas.forEach(emp => {
        if (emp) set.add(emp.toUpperCase().trim());
      });
      return set;
    }

    // 2. Fallback: Se o cliente ainda não tiver empresas definidas, herda das embarcações associadas
    linkedBoats.forEach(item => {
      const bEmps = item.boat.empresas;
      if (Array.isArray(bEmps) && bEmps.length > 0) {
        bEmps.forEach(emp => {
          if (emp) set.add(emp.toUpperCase().trim());
        });
      }
    });

    // 3. Se nenhuma empresa foi identificada, o padrão histórico é VALE
    if (set.size === 0) {
      set.add('VALE');
    }

    return set;
  };

  const isClientMarina = (c: Cliente): boolean => {
    const linked = clientBoatsMap.get(c.id) || [];
    const emps = getClientEmpresas(c, linked);
    return emps.has('MARINA');
  };

  const isClientVale = (c: Cliente): boolean => {
    const linked = clientBoatsMap.get(c.id) || [];
    const emps = getClientEmpresas(c, linked);
    return emps.has('VALE');
  };

  // Contagens para as abas (ignorando a entidade interna El Mexicano)
  const countMarina = useMemo(() => clients.filter(c => !isInternalMexicano(c.id) && !isInternalMexicano(c.nome) && isClientMarina(c)).length, [clients, clientBoatsMap]);
  const countVale = useMemo(() => clients.filter(c => !isInternalMexicano(c.id) && !isInternalMexicano(c.nome) && isClientVale(c)).length, [clients, clientBoatsMap]);

  // ─── FILTRAGEM DE CLIENTES ───
  const filteredClients = useMemo(() => {
    const term = search.toLowerCase().trim();

    return clients.filter(c => {
      if (isInternalMexicano(c.id) || isInternalMexicano(c.nome)) return false;
      const linked = clientBoatsMap.get(c.id) || [];

      // 1. Aba de Empresa: Marina vs Vale vs Todas
      if (companyTab === 'MARINA' && !isClientMarina(c)) return false;
      if (companyTab === 'VALE' && !isClientVale(c)) return false;

      // 2. Filtro por Tipo de Embarcação
      if (filterBoatType === 'lancha') {
        if (!linked.some(x => x.boat.tipo === 'lancha')) return false;
      } else if (filterBoatType === 'jet') {
        if (!linked.some(x => x.boat.tipo === 'jet')) return false;
      } else if (filterBoatType === 'sem_barco') {
        if (linked.length > 0) return false;
      }

      // 3. Filtro por Status Cadastral
      if (filterStatus === 'ativo' && c.status === 'inativo') return false;
      if (filterStatus === 'inativo' && c.status !== 'inativo') return false;

      // 4. Filtro Financeiro
      if (filterFinanceiro === 'em_dia' && c.statusFinanceiro !== 'em_dia') return false;
      if (filterFinanceiro === 'pendente_inadimplente') {
        if (c.statusFinanceiro === 'em_dia') return false;
      }

      // 5. Busca Textual Universal
      if (term) {
        const matchName = (c.nome || '').toLowerCase().includes(term);
        const matchPhone = (c.telefone || '').toLowerCase().includes(term);
        const matchCpf = (c.cpf || '').toLowerCase().includes(term);
        const matchEmail = (c.email || '').toLowerCase().includes(term);
        const matchCota = (c.cota || '').toLowerCase().includes(term);
        const matchCidade = (c.cidade || '').toLowerCase().includes(term);

        // Busca também pelas embarcações e vagas vinculadas
        const matchBoat = linked.some(item => {
          const code = getBoatCode(item.boat).toLowerCase();
          const bName = (item.boat.nome || '').toLowerCase();
          const bNumero = String(item.boat.numero || '').toLowerCase();
          const bVaga = (item.boat.vaga || '').toLowerCase();
          const bCota = (item.cota || '').toLowerCase();

          return (
            code.includes(term) ||
            bName.includes(term) ||
            bNumero.includes(term) ||
            bVaga.includes(term) ||
            bCota.includes(term)
          );
        });

        if (!matchName && !matchPhone && !matchCpf && !matchEmail && !matchCota && !matchCidade && !matchBoat) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [clients, clientBoatsMap, companyTab, filterBoatType, filterStatus, filterFinanceiro, search]);

  // Estatísticas da categoria ativa
  const stats = useMemo(() => {
    const base = clients.filter(c => {
      if (companyTab === 'MARINA') return isClientMarina(c);
      if (companyTab === 'VALE') return isClientVale(c);
      return true;
    });

    const total = base.length;
    const ativos = base.filter(c => c.status !== 'inativo').length;
    const inativos = total - ativos;
    const emDia = base.filter(c => c.statusFinanceiro === 'em_dia').length;

    let lanchasCount = 0;
    let jetsCount = 0;
    base.forEach(c => {
      const linked = clientBoatsMap.get(c.id) || [];
      if (linked.some(x => x.boat.tipo === 'lancha')) lanchasCount++;
      if (linked.some(x => x.boat.tipo === 'jet')) jetsCount++;
    });

    return { total, ativos, inativos, emDia, lanchasCount, jetsCount };
  }, [clients, clientBoatsMap, companyTab]);

  const clearFilters = () => {
    setSearch('');
    setFilterBoatType('all');
    setFilterStatus('all');
    setFilterFinanceiro('all');
  };

  const hasActiveFilters = search !== '' || filterBoatType !== 'all' || filterStatus !== 'all' || filterFinanceiro !== 'all';

  const formatWhatsAppUrl = (phone?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) return null;
    const ddi = clean.startsWith('55') ? clean : `55${clean}`;
    return `https://wa.me/${ddi}?text=${encodeURIComponent('Olá! Entramos em contato da Marina Club.')}`;
  };

  const handleSaveClient = (savedClient: Cliente) => {
    try {
      notify(`Cliente "${savedClient.nome}" salvo com sucesso.`);
      loadData();
      setIsNewClientOpen(false);
      setSelectedClientForEdit(null);
    } catch (err: any) {
      notify(err.message || 'Erro ao salvar cliente.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">

      {/* Toast Local */}
      {localToast && (
        <div className={`fixed bottom-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border animate-in slide-in-from-bottom-5 duration-300 ${
          localToast.type === 'success'
            ? 'bg-white text-emerald-800 border-emerald-200'
            : localToast.type === 'error'
            ? 'bg-white text-rose-800 border-rose-200'
            : 'bg-white text-blue-800 border-blue-200'
        }`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            localToast.type === 'success' ? 'bg-emerald-500' : localToast.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'
          }`} />
          <span className="text-sm font-semibold">{localToast.message}</span>
        </div>
      )}

      {/* ─── 1. HEADER DO GERENTE DA MARINA (IDENTIDADE AZUL NÁUTICA) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Operações Marina Club
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">Consulta de Clientes & Cotistas</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Consulta de Clientes & Cotistas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Consulte cadastros, contatos rápidos, cotas e a localização das vagas no pátio dos clientes da Marina e da Vale Administradora.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="h-9 px-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            title="Sincronizar com o servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isSyncing ? 'Atualizando...' : 'Sincronizar'}</span>
          </button>

          <button
            onClick={() => {
              setSelectedClientForEdit(null);
              setIsNewClientOpen(true);
            }}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* ─── 2. SEPARAÇÃO PRINCIPAL: MARINA vs VALE ADMINISTRADORA ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold w-full sm:w-auto">
          {/* Aba 1: Clientes Marina Club */}
          <button
            type="button"
            onClick={() => setCompanyTab('MARINA')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              companyTab === 'MARINA'
                ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ship className="w-4 h-4" />
            <span>Clientes Marina Club</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              companyTab === 'MARINA' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {countMarina}
            </span>
          </button>

          {/* Aba 2: Vale Administradora */}
          <button
            type="button"
            onClick={() => setCompanyTab('VALE')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              companyTab === 'VALE'
                ? 'bg-slate-900 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Vale Administradora</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              companyTab === 'VALE' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {countVale}
            </span>
          </button>

          {/* Aba 3: Todos os Clientes */}
          <button
            type="button"
            onClick={() => setCompanyTab('ALL')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              companyTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Todos os Clientes</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
              companyTab === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {clients.length}
            </span>
          </button>
        </div>

        {/* Alternância de Visualização: Cards vs Tabela */}
        <div className="flex items-center gap-1 self-end sm:self-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Visualização em grade de cards"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Cards</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Visualização em tabela/lista"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Tabela</span>
          </button>
        </div>
      </div>

      {/* ─── 3. RESUMO E ESTATÍSTICAS DA ABA SELECIONADA ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Clientes</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{stats.total}</div>
          <span className="text-[10px] text-slate-500 font-medium">
            {companyTab === 'MARINA' ? 'Marina Club' : companyTab === 'VALE' ? 'Vale Administradora' : 'Geral'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ativos</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 mt-1">{stats.ativos}</div>
          <span className="text-[10px] text-slate-500 font-medium">{stats.inativos} inativo(s)</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Embarcações Vinculadas</span>
            <Ship className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{stats.lanchasCount + stats.jetsCount}</div>
          <span className="text-[10px] text-slate-500 font-medium">
            {stats.lanchasCount} lancha(s) • {stats.jetsCount} jet(s)
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Financeiro em Dia</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{stats.emDia}</div>
          <span className="text-[10px] text-slate-500 font-medium">Sem pendências</span>
        </div>
      </div>

      {/* ─── 4. BARRA DE BUSCA E FILTROS RÁPIDOS ─── */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Campo de Busca Universal */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente, CPF, telefone, código do barco (ex: M16), cota ou vaga..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Tipo de Embarcação */}
          <select
            value={filterBoatType}
            onChange={e => setFilterBoatType(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="all">Todas Embarcações</option>
            <option value="lancha">Apenas Lanchas</option>
            <option value="jet">Apenas Jet Ski</option>
            <option value="sem_barco">Sem Embarcação</option>
          </select>

          {/* Filtro por Status Cadastral */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="all">Todos Cadastros</option>
            <option value="ativo">Apenas Ativos</option>
            <option value="inativo">Inativos</option>
          </select>

          {/* Filtro Financeiro */}
          <select
            value={filterFinanceiro}
            onChange={e => setFilterFinanceiro(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="all">Todos Financeiros</option>
            <option value="em_dia">Em Dia</option>
            <option value="pendente_inadimplente">Pendente / Inadimplente</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Limpar todos os filtros"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 5. LISTAGEM DE CLIENTES: CARDS OU TABELA ─── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">Carregando lista de clientes da marina...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum cliente encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-medium">
            {hasActiveFilters
              ? 'Nenhum cliente corresponde aos filtros selecionados. Tente ajustar a busca.'
              : companyTab === 'MARINA'
              ? 'Não há clientes cadastrados vinculados à Marina Club no momento.'
              : companyTab === 'VALE'
              ? 'Não há clientes cadastrados vinculados à Vale Administradora no momento.'
              : 'Nenhum cliente cadastrado no sistema.'}
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
      ) : viewMode === 'grid' ? (
        /* ─── VISÃO 1: GRADE DE CARDS (VISUAL MODERNO) ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => {
            const linked = clientBoatsMap.get(client.id) || [];
            const waUrl = formatWhatsAppUrl(client.telefone);
            const isMarina = isClientMarina(client);
            const isVale = isClientVale(client);

            return (
              <div
                key={client.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group space-y-4"
              >
                {/* Topo do Card: Avatar, Nome e Badges */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-blue-100/80 text-blue-800 font-black text-sm flex items-center justify-center shrink-0 border border-blue-200/60 shadow-xs">
                        {(client.nome || 'CL').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm text-slate-900 truncate leading-snug group-hover:text-blue-600 transition-colors">
                          {client.nome}
                        </h3>
                        {client.cpf && (
                          <span className="text-[11px] text-slate-400 font-medium block">
                            CPF: {client.cpf}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Ativo/Inativo */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        client.status === 'inativo'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {client.status === 'inativo' ? 'Inativo' : 'Ativo'}
                    </span>
                  </div>

                  {/* Badges de Empresa (Marina vs Vale) */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                    {isMarina && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <Ship className="w-3 h-3 text-blue-600" />
                        Marina Club
                      </span>
                    )}

                    {isVale && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-indigo-600" />
                        Vale Administradora
                      </span>
                    )}

                    {client.statusFinanceiro && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          client.statusFinanceiro === 'em_dia'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : client.statusFinanceiro === 'inadimplente'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {client.statusFinanceiro === 'em_dia'
                          ? 'Financeiro Em Dia'
                          : client.statusFinanceiro === 'inadimplente'
                          ? 'Inadimplente'
                          : 'Pendente'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Embarcações & Vagas Vinculadas */}
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Anchor className="w-3 h-3 text-slate-500" />
                      Embarcações & Vagas ({linked.length})
                    </span>
                  </div>

                  {linked.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Nenhuma embarcação vinculada.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5 custom-scrollbar">
                      {linked.map((item, idx) => {
                        const code = getBoatCode(item.boat);
                        const isJet = item.boat.tipo === 'jet';

                        return (
                          <div
                            key={idx}
                            className="bg-white p-2 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-black shrink-0">
                                {code}
                              </span>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-800 truncate block">
                                  {formatBoatName(item.boat.nome)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium block">
                                  {item.cota ? `Cota: ${item.cota}` : (isJet ? 'Jet Ski' : 'Lancha')}
                                </span>
                              </div>
                            </div>

                            {/* Vaga da Marina em Destaque */}
                            <div className="text-right shrink-0">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Vaga</span>
                              <span className={`text-[11px] font-extrabold flex items-center gap-1 ${
                                item.boat.vaga ? 'text-blue-700' : 'text-slate-400 italic'
                              }`}>
                                <MapPin className="w-3 h-3 shrink-0" />
                                {item.boat.vaga || 'S/ vaga'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Contatos Rápidos e Localização */}
                <div className="space-y-1 text-xs">
                  {client.telefone && (
                    <div className="flex items-center justify-between gap-2 py-0.5">
                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {client.telefone}
                      </span>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                          title="Conversar no WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  )}

                  {client.email && (
                    <div className="text-slate-500 font-medium flex items-center gap-1.5 truncate py-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={`mailto:${client.email}`} className="truncate hover:text-blue-600 transition-colors">
                        {client.email}
                      </a>
                    </div>
                  )}

                  {client.cidade && (
                    <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5 py-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{client.cidade}{client.estado ? ` - ${client.estado}` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Botões de Ação na Base */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedClientForProfile(client)}
                    className="flex-1 h-8 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Ficha</span>
                  </button>

                  {isClientMarina(client) ? (
                    <button
                      onClick={() => {
                        setSelectedClientForEdit(client);
                        setIsNewClientOpen(true);
                      }}
                      className="h-8 px-3 rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Editar dados cadastrais"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  ) : (
                    <div
                      className="h-8 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-[11px] font-medium flex items-center justify-center gap-1 cursor-not-allowed"
                      title="Clientes exclusivos da Vale Administradora não podem ser alterados na Marina"
                    >
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Vale</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── VISÃO 2: TABELA COMPACTA (CONSULTA OPERACIONAL RÁPIDA) ─── */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Cliente / Cotista</th>
                  <th className="py-3.5 px-4">Empresa</th>
                  <th className="py-3.5 px-4">Embarcações & Vagas</th>
                  <th className="py-3.5 px-4">Contatos</th>
                  <th className="py-3.5 px-4">Cidade / UF</th>
                  <th className="py-3.5 px-4">Situação</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredClients.map(client => {
                  const linked = clientBoatsMap.get(client.id) || [];
                  const waUrl = formatWhatsAppUrl(client.telefone);
                  const isMarina = isClientMarina(client);
                  const isVale = isClientVale(client);

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-800 font-black flex items-center justify-center shrink-0 border border-blue-200/50">
                            {(client.nome || 'CL').substring(0, 2).toUpperCase()}
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

                      {/* Empresa */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {isMarina && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit">
                              <Ship className="w-3 h-3 text-blue-600" />
                              Marina Club
                            </span>
                          )}
                          {isVale && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 w-fit">
                              <Building2 className="w-3 h-3 text-indigo-600" />
                              Vale Adm.
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Embarcações & Vagas */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {linked.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">Nenhuma embarcação</span>
                          ) : (
                            linked.map((item, idx) => {
                              const code = getBoatCode(item.boat);
                              return (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-slate-100 border border-slate-200/80 text-slate-800 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                                  title={`${item.boat.nome} - Vaga: ${item.boat.vaga || 'Não informada'}`}
                                >
                                  <span className="px-1 py-0.2 bg-slate-900 text-white rounded text-[9px] font-black">
                                    {code}
                                  </span>
                                  {item.cota && <span>{item.cota}</span>}
                                  {item.boat.vaga && (
                                    <span className="text-blue-700 font-extrabold flex items-center gap-0.5">
                                      <MapPin className="w-2.5 h-2.5" />
                                      {item.boat.vaga}
                                    </span>
                                  )}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      {/* Contatos */}
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
                                  <MessageCircle className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Sem telefone</span>
                          )}
                          {client.email && (
                            <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                              {client.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cidade / UF */}
                      <td className="py-3 px-4 text-slate-600">
                        {client.cidade ? `${client.cidade}${client.estado ? `/${client.estado}` : ''}` : '--'}
                      </td>

                      {/* Situação */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                              client.status === 'inativo'
                                ? 'bg-slate-100 text-slate-500'
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
                              {client.statusFinanceiro === 'em_dia'
                                ? 'Em Dia'
                                : client.statusFinanceiro === 'inadimplente'
                                ? 'Inadimplente'
                                : 'Pendente'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedClientForProfile(client)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Visualizar ficha completa do cotista"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ficha</span>
                          </button>

                          {isClientMarina(client) ? (
                            <button
                              onClick={() => {
                                setSelectedClientForEdit(client);
                                setIsNewClientOpen(true);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all inline-flex items-center justify-center cursor-pointer"
                              title="Editar cadastro"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span
                              className="p-1.5 text-slate-300 inline-flex items-center justify-center cursor-not-allowed"
                              title="Clientes exclusivos da Vale Administradora não podem ser alterados na Marina"
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
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
      )}

      {/* ─── MODAL 1: FICHA COMPLETA DO CLIENTE (PERFIL, VEÍCULOS, DOCUMENTOS) ─── */}
      {selectedClientForProfile && (
        <ClientProfileModal
          client={selectedClientForProfile}
          boats={boats}
          onClose={() => setSelectedClientForProfile(null)}
        />
      )}

      {/* ─── MODAL 2: CADASTRO / EDIÇÃO DE CLIENTE (RESTRITO À MARINA) ─── */}
      {isNewClientOpen && (
        <ClientModal
          isOpen={isNewClientOpen}
          onClose={() => {
            setIsNewClientOpen(false);
            setSelectedClientForEdit(null);
          }}
          onSave={handleSaveClient}
          editingClient={selectedClientForEdit}
          boats={boats}
          lockEmpresa="MARINA"
          userRole="marina_gerente"
          defaultEmpresas={['MARINA']}
        />
      )}

    </div>
  );
}
