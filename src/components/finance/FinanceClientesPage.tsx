import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  Filter,
  Eye,
  FileText,
  Phone,
  Mail,
  Ship,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  X,
  Building2,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Download,
  Copy,
  LayoutGrid,
  List,
  Sparkles,
  ArrowUpDown,
  Smartphone,
  Calendar,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { clientDB, boatDB, onDbUpdate, loadFromRemote, isDbLoaded } from '../../db';
import { Cliente, Embarcacao, TransacaoFinanceira } from '../../types';
import { getBoatCode } from '../../utils/boatUtils';
import { PageHeader } from '../tailadmin';
import ClientProfileModal from '../ClientProfileModal';

export default function FinanceClientesPage() {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFinanceiroFiltro, setStatusFinanceiroFiltro] = useState<string>('todos');
  const [statusCadastroFiltro, setStatusCadastroFiltro] = useState<string>('todos');
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('Todos');
  const [selectedBoatId, setSelectedBoatId] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals & Drawers
  const [profileModalClient, setProfileModalClient] = useState<Cliente | null>(null);
  const [statementClient, setStatementClient] = useState<Cliente | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    // Subscribe to DB update events
    const unsubscribe = onDbUpdate(() => {
      if (isMountedRef.current) {
        refreshFromLocal();
      }
    });

    const handleCustomEvents = () => {
      if (isMountedRef.current) {
        refreshFromLocal();
      }
    };

    window.addEventListener('db_updated', handleCustomEvents);
    window.addEventListener('db_synced', handleCustomEvents);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      window.removeEventListener('db_updated', handleCustomEvents);
      window.removeEventListener('db_synced', handleCustomEvents);
    };
  }, []);

  const refreshFromLocal = () => {
    const cl = clientDB.getAll() || [];
    const bt = boatDB.getAll() || [];
    if (cl.length > 0) setClients([...cl]);
    if (bt.length > 0) setBoats([...bt]);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Initial check of memory
      refreshFromLocal();

      const token = localStorage.getItem('admin_token') || localStorage.getItem('client_token');

      // 2. Fetch direct pull from server to guarantee data availability
      if (token) {
        try {
          const pullRes = await fetch('/api/db/pull', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (pullRes.ok) {
            const remoteData = await pullRes.json();
            if (isMountedRef.current) {
              if (Array.isArray(remoteData.clients) && remoteData.clients.length > 0) {
                setClients(remoteData.clients);
              }
              if (Array.isArray(remoteData.boats) && remoteData.boats.length > 0) {
                setBoats(remoteData.boats);
              }
            }
          }
        } catch (pullErr) {
          console.warn("Pull direto falhou, tentando loadFromRemote:", pullErr);
          await loadFromRemote();
          refreshFromLocal();
        }

        // 3. Fetch transactions
        try {
          const res = await fetch('/api/financeiro/transacoes', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && isMountedRef.current) {
              setTransacoes(data);
            }
          }
        } catch (transErr) {
          console.error("Erro ao buscar transacoes financeiras:", transErr);
        }
      }
    } catch (err) {
      console.error("Erro geral ao carregar dados dos clientes:", err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Map client transactions & calculate financial metrics per client
  const clientFinancialSummary = useMemo(() => {
    const summary: Record<string, {
      totalPago: number;
      totalEmAberto: number;
      totalVencido: number;
      hasInadimplencia: boolean;
      qtdTransacoes: number;
    }> = {};

    const todayStr = new Date().toISOString().split('T')[0];

    transacoes.forEach(t => {
      if (!t.clienteId) return;
      if (!summary[t.clienteId]) {
        summary[t.clienteId] = {
          totalPago: 0,
          totalEmAberto: 0,
          totalVencido: 0,
          hasInadimplencia: false,
          qtdTransacoes: 0
        };
      }

      const val = Number(t.valor) || 0;
      summary[t.clienteId].qtdTransacoes += 1;

      if (t.status === 'pago') {
        summary[t.clienteId].totalPago += val;
      } else if (t.status === 'pendente') {
        summary[t.clienteId].totalEmAberto += val;
        if (t.dataVencimento && t.dataVencimento < todayStr) {
          summary[t.clienteId].totalVencido += val;
          summary[t.clienteId].hasInadimplencia = true;
        }
      }
    });

    return summary;
  }, [transacoes]);

  // Companies list
  const companies = ['Todos', 'Marina Velho Chico', 'Vale Administradora', 'Mexicano'];

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // 1. Empresa filter
      if (empresaFiltro !== 'Todos') {
        const clientEmpresas = Array.isArray(c.empresas) && c.empresas.length > 0 ? c.empresas : [];
        const boat = boats.find(b => b.id === c.embarcacaoId);
        const boatEmpresas = boat && Array.isArray(boat.empresas) ? boat.empresas : [];
        const allEmpresas = [...clientEmpresas, ...boatEmpresas].map(e => String(e).toUpperCase().trim());

        const matchesEmpresa = allEmpresas.some(emp => {
          if (empresaFiltro === 'Marina Velho Chico') return emp.includes('MARINA');
          if (empresaFiltro === 'Vale Administradora') return emp.includes('VALE');
          if (empresaFiltro === 'Mexicano') return emp.includes('MEXICANO');
          return true;
        });

        // Se o cliente não tem empresa explícita nem no barco, só aceitamos se empresaFiltro for Todos
        if (!matchesEmpresa) return false;
      }

      // 2. Status Financeiro
      const fin = clientFinancialSummary[c.id];
      const isActuallyInadimplente = fin?.hasInadimplencia || c.statusFinanceiro === 'inadimplente';

      if (statusFinanceiroFiltro === 'inadimplente') {
        if (!isActuallyInadimplente) return false;
      } else if (statusFinanceiroFiltro === 'em_dia') {
        if (isActuallyInadimplente) return false;
      } else if (statusFinanceiroFiltro === 'pendente') {
        if (!fin || fin.totalEmAberto === 0) return false;
      }

      // 3. Status Cadastro (Ativo / Inativo)
      if (statusCadastroFiltro === 'ativo' && c.status === 'inativo') return false;
      if (statusCadastroFiltro === 'inativo' && c.status !== 'inativo') return false;

      // 4. Embarcação filter
      if (selectedBoatId !== 'todos') {
        const hasBoat = c.embarcacaoId === selectedBoatId || (c.embarcacoes && c.embarcacoes.some(b => b.embarcacaoId === selectedBoatId));
        if (!hasBoat) return false;
      }

      // 5. Search term (Nome, CPF, Telefone, Email, Embarcação/Cota)
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const nome = (c.nome || '').toLowerCase();
        const cpf = (c.cpf || '').toLowerCase();
        const tel = (c.telefone || '').replace(/\D/g, '');
        const email = (c.email || '').toLowerCase();
        const cota = (c.cota || '').toLowerCase();

        const matchText = nome.includes(q) || cpf.includes(q) || tel.includes(q) || email.includes(q) || cota.includes(q);
        if (!matchText) return false;
      }

      return true;
    });
  }, [clients, boats, empresaFiltro, statusFinanceiroFiltro, statusCadastroFiltro, selectedBoatId, searchTerm, clientFinancialSummary]);

  // Overall KPIs
  const stats = useMemo(() => {
    let emDiaCount = 0;
    let inadimplentesCount = 0;
    let totalDividasEmAberto = 0;
    let totalCotistasComBarco = 0;

    clients.forEach(c => {
      const fin = clientFinancialSummary[c.id];
      if (fin?.hasInadimplencia || c.statusFinanceiro === 'inadimplente') {
        inadimplentesCount++;
      } else {
        emDiaCount++;
      }
      if (fin?.totalEmAberto) {
        totalDividasEmAberto += fin.totalEmAberto;
      }
      if (c.embarcacaoId || (c.embarcacoes && c.embarcacoes.length > 0)) {
        totalCotistasComBarco++;
      }
    });

    return {
      total: clients.length,
      emDia: emDiaCount,
      inadimplentes: inadimplentesCount,
      totalDividasEmAberto,
      totalCotistasComBarco
    };
  }, [clients, clientFinancialSummary]);

  // Client's primary or all boats
  const getClientBoats = (c: Cliente) => {
    const list: { boat: Embarcacao | undefined; cota: string; plano?: string }[] = [];
    if (c.embarcacaoId) {
      list.push({
        boat: boats.find(b => b.id === c.embarcacaoId),
        cota: c.cota || '',
        plano: c.plano
      });
    }
    if (c.embarcacoes && c.embarcacoes.length > 0) {
      c.embarcacoes.forEach(extra => {
        if (extra.embarcacaoId !== c.embarcacaoId) {
          list.push({
            boat: boats.find(b => b.id === extra.embarcacaoId),
            cota: extra.cota || '',
            plano: extra.plano
          });
        }
      });
    }
    return list;
  };

  const formatBRL = (val: number) => {
    return (Number(val) || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Transactions of selected statement client
  const statementTransactions = useMemo(() => {
    if (!statementClient) return [];
    return transacoes
      .filter(t => t.clienteId === statementClient.id)
      .sort((a, b) => (b.dataVencimento || '').localeCompare(a.dataVencimento || ''));
  }, [transacoes, statementClient]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header TailAdmin Padrão */}
      <PageHeader
        pageTitle="Clientes & Cotistas"
        subtitle="Consulta de cadastro, cotas náuticas vinculadas, situação financeira e extrato de lançamentos"
        breadcrumbs={[
          { label: "Financeiro" },
          { label: "Recebíveis & Cobrança" },
          { label: "Clientes & Cotistas" }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Empresa Filter Pill */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto gap-1">
              {companies.map(emp => {
                const isActive = empresaFiltro === emp;
                return (
                  <button
                    key={emp}
                    onClick={() => setEmpresaFiltro(emp)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    {emp}
                  </button>
                );
              })}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Visualização em Lista / Tabela"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Total de Clientes</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-stone-900 tabular-nums">{stats.total}</p>
            <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
              Cadastrados
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Base completa do sistema</p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Situação Regular</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-emerald-700 tabular-nums">{stats.emDia}</p>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
              Em Dia
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Sem títulos vencidos</p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Inadimplentes</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-rose-700 tabular-nums">{stats.inadimplentes}</p>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-md">
              Atenção
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Com pendências ou atrasos</p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Cotistas Ativos</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-stone-900 tabular-nums">{stats.totalCotistasComBarco}</p>
            <span className="text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
              Com Cota
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Vinculados a embarcações</p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, telefone, e-mail ou cota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200/90 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <select
              value={statusFinanceiroFiltro}
              onChange={(e) => setStatusFinanceiroFiltro(e.target.value)}
              className="bg-stone-50 border border-stone-200/90 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 focus:outline-none cursor-pointer"
            >
              <option value="todos">Status Fin.: Todos</option>
              <option value="em_dia">Apenas Em Dia</option>
              <option value="inadimplente">Apenas Inadimplentes</option>
              <option value="pendente">Com Títulos em Aberto</option>
            </select>

            <select
              value={selectedBoatId}
              onChange={(e) => setSelectedBoatId(e.target.value)}
              className="bg-stone-50 border border-stone-200/90 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="todos">Embarcação: Todas</option>
              {boats.map(b => (
                <option key={b.id} value={b.id}>
                  {getBoatCode(b)} - {b.nome}
                </option>
              ))}
            </select>

            <select
              value={statusCadastroFiltro}
              onChange={(e) => setStatusCadastroFiltro(e.target.value)}
              className="bg-stone-50 border border-stone-200/90 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 focus:outline-none cursor-pointer"
            >
              <option value="todos">Cadastro: Todos</option>
              <option value="ativo">Apenas Ativos</option>
              <option value="inativo">Apenas Inativos</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
          <span>
            Mostrando <strong>{filteredClients.length}</strong> de <strong>{clients.length}</strong> clientes
          </span>
          {(searchTerm || statusFinanceiroFiltro !== 'todos' || selectedBoatId !== 'todos' || statusCadastroFiltro !== 'todos' || empresaFiltro !== 'Todos') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFinanceiroFiltro('todos');
                setSelectedBoatId('todos');
                setStatusCadastroFiltro('todos');
                setEmpresaFiltro('Todos');
              }}
              className="text-stone-600 hover:text-stone-900 font-semibold underline cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* 4. Client Presentation (Table View or Grid View) */}
      {loading && clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-16 text-center text-stone-400 space-y-3">
          <div className="w-8 h-8 border-3 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold">Carregando lista de clientes e cotistas...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center text-stone-400 space-y-2">
          <Users className="w-12 h-12 text-stone-300 mx-auto" />
          <h4 className="text-sm font-bold text-stone-700">Nenhum cliente encontrado</h4>
          <p className="text-xs text-stone-400">
            {clients.length === 0
              ? 'Conectando ao banco de dados para sincronizar os cadastros...'
              : 'Nenhum cliente coincide com os filtros aplicados.'}
          </p>
          {clients.length === 0 && (
            <button
              type="button"
              onClick={loadData}
              className="mt-3 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar Sincronizar Novamente</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200/80 bg-stone-50/70 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Cliente / Documento</th>
                  <th className="py-3 px-4">Contato (WhatsApp / Email)</th>
                  <th className="py-3 px-4">Embarcação & Cota</th>
                  <th className="py-3 px-4">Situação Financeira</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-stone-800">
                {filteredClients.map((client) => {
                  const fin = clientFinancialSummary[client.id];
                  const isInadimplente = fin?.hasInadimplencia || client.statusFinanceiro === 'inadimplente';
                  const clientBoats = getClientBoats(client);
                  const cleanPhone = (client.telefone || '').replace(/\D/g, '');

                  return (
                    <tr key={client.id} className="hover:bg-stone-50/80 transition-colors">
                      {/* Name & Document */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-stone-900 text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                            {client.nome ? client.nome.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-stone-900 leading-snug truncate max-w-[220px]">
                              {client.nome}
                            </p>
                            <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                              {client.cpf || 'CPF não informado'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contacts */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {client.telefone ? (
                            <a
                              href={`https://wa.me/55${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                            >
                              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{client.telefone}</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-stone-400 italic">Sem telefone</span>
                          )}

                          {client.email && (
                            <p className="text-[11px] text-stone-500 truncate max-w-[200px]">
                              {client.email}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Boats & Cotas */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                          {clientBoats.length > 0 ? (
                            clientBoats.map((cb, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-stone-100 text-stone-800 border border-stone-200/70"
                              >
                                <Ship className="w-3 h-3 text-stone-600" />
                                <span>{cb.boat ? getBoatCode(cb.boat) : 'Barco'}</span>
                                {cb.cota && <span className="text-stone-400">({cb.cota})</span>}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-stone-400 italic">Sem cota vinculada</span>
                          )}
                        </div>
                      </td>

                      {/* Financial Status */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {isInadimplente ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" /> Inadimplente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Em Dia
                            </span>
                          )}

                          {fin && fin.totalEmAberto > 0 && (
                            <p className="text-[11px] font-semibold text-stone-600">
                              Aberto: <span className="text-stone-900 font-bold">{formatBRL(fin.totalEmAberto)}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setStatementClient(client)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors cursor-pointer flex items-center gap-1"
                            title="Ver extrato financeiro deste cliente"
                          >
                            <Wallet className="w-3.5 h-3.5 text-stone-600" />
                            <span>Extrato</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setProfileModalClient(client)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Ver perfil completo e documentos"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Perfil</span>
                          </button>
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
        /* GRID / CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const fin = clientFinancialSummary[client.id];
            const isInadimplente = fin?.hasInadimplencia || client.statusFinanceiro === 'inadimplente';
            const clientBoats = getClientBoats(client);
            const cleanPhone = (client.telefone || '').replace(/\D/g, '');

            return (
              <div
                key={client.id}
                className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-stone-900 text-white font-bold flex items-center justify-center text-sm shadow-2xs shrink-0">
                        {client.nome ? client.nome.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-sm text-stone-900 truncate leading-snug">
                          {client.nome}
                        </h5>
                        <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                          {client.cpf || 'CPF não informado'}
                        </p>
                      </div>
                    </div>

                    {isInadimplente ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Inadimplente
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Em Dia
                      </span>
                    )}
                  </div>

                  {/* Embarcações */}
                  <div className="space-y-1.5 pt-2 border-t border-stone-100 text-xs">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Cotas Náuticas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {clientBoats.length > 0 ? (
                        clientBoats.map((cb, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200/80"
                          >
                            <Ship className="w-3 h-3 text-stone-600" />
                            <span>{cb.boat ? getBoatCode(cb.boat) : 'Barco'}</span>
                            {cb.cota && <span className="text-stone-500">({cb.cota})</span>}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-stone-400 italic">Nenhuma cota vinculada</span>
                      )}
                    </div>
                  </div>

                  {/* Financial overview */}
                  <div className="pt-3 mt-3 border-t border-stone-100 text-xs grid grid-cols-2 gap-2 text-stone-600">
                    <div>
                      <p className="text-[10px] text-stone-400 font-medium">Total em Aberto</p>
                      <p className="font-bold text-stone-900 mt-0.5">
                        {formatBRL(fin?.totalEmAberto || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400 font-medium">Total Liquidado</p>
                      <p className="font-bold text-emerald-700 mt-0.5">
                        {formatBRL(fin?.totalPago || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card actions */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  {client.telefone ? (
                    <a
                      href={`https://wa.me/55${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  ) : <div />}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatementClient(client)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      Extrato
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileModalClient(client)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 transition-colors cursor-pointer shadow-2xs"
                    >
                      Perfil
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Client Statement Drawer / Modal */}
      {statementClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-900 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                  {statementClient.nome ? statementClient.nome.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 leading-tight">
                    Extrato Financeiro: {statementClient.nome}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    CPF: {statementClient.cpf || 'N/A'} • {statementClient.telefone || 'Sem telefone'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStatementClient(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Summary cards for this client */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/80">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Total Liquidado</p>
                  <p className="text-base font-black text-emerald-700 mt-0.5">
                    {formatBRL(clientFinancialSummary[statementClient.id]?.totalPago || 0)}
                  </p>
                </div>
                <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/80">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Total em Aberto</p>
                  <p className="text-base font-black text-stone-900 mt-0.5">
                    {formatBRL(clientFinancialSummary[statementClient.id]?.totalEmAberto || 0)}
                  </p>
                </div>
                <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/80">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Total Vencido</p>
                  <p className="text-base font-black text-rose-700 mt-0.5">
                    {formatBRL(clientFinancialSummary[statementClient.id]?.totalVencido || 0)}
                  </p>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Lançamentos Registrados ({statementTransactions.length})
                </h4>

                {statementTransactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl">
                    Nenhum lançamento financeiro vinculado a este cliente até o momento.
                  </div>
                ) : (
                  <div className="border border-stone-200/80 rounded-xl overflow-hidden divide-y divide-stone-100">
                    {statementTransactions.map((t) => (
                      <div key={t.id} className="p-3 flex items-center justify-between text-xs hover:bg-stone-50 transition-colors">
                        <div className="space-y-0.5 min-w-0 pr-3">
                          <p className="font-bold text-stone-900 truncate">{t.descricao}</p>
                          <p className="text-[11px] text-stone-400 flex items-center gap-2">
                            <span>Vencimento: {t.dataVencimento ? t.dataVencimento.split('-').reverse().join('/') : 'N/A'}</span>
                            {t.empresa && <span>• {t.empresa}</span>}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`font-bold tabular-nums ${t.tipo === 'receita' ? 'text-emerald-700' : 'text-stone-900'}`}>
                            {t.tipo === 'receita' ? '+' : '-'}{formatBRL(Number(t.valor) || 0)}
                          </p>
                          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                            t.status === 'pago'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}>
                            {t.status === 'pago' ? 'Pago' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-stone-100 bg-stone-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setStatementClient(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 cursor-pointer shadow-2xs"
              >
                Fechar Extrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Complete Profile Modal (Drive, Personal Data, Vehicles) */}
      {profileModalClient && (
        <ClientProfileModal
          client={profileModalClient}
          boats={boats}
          onClose={() => setProfileModalClient(null)}
        />
      )}
    </div>
  );
}
