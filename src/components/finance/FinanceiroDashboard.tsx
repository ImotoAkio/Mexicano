import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import {
  Search,
  Bell,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  FileText,
  TrendingUp,
  CalendarClock,
  Receipt,
  FileSearch,
  CheckCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  X,
  Volume2
} from 'lucide-react';
import UserAvatarMenu from '../header/UserAvatarMenu';
import FinanceiroSidebar from './FinanceiroSidebar';
import FinanceDashboardPage from './FinanceDashboardPage';
import FinanceLancamentos from './FinanceLancamentos';
import FinanceLancamentoDrawer from './FinanceLancamentoDrawer';
import FinanceiroSettingsModal, { loadFinanceiroSettings } from './FinanceiroSettingsModal';
import { clientDB, boatDB, onDbUpdate } from '../../db';
import { Cliente, Embarcacao, TransacaoFinanceira } from '../../types';

// Lazy-loaded secondary pages
const FinanceFluxoCaixa = lazy(() => import('./FinanceFluxoCaixa'));
const FinanceParcelasFixas = lazy(() => import('./FinanceParcelasFixas'));
const BoletosPage = lazy(() => import('./BoletosPage'));
const FinanceRelatorios = lazy(() => import('./FinanceRelatorios'));
const FinanceCadastroConfigs = lazy(() => import('./FinanceCadastroConfigs'));
const FinanceReservasPage = lazy(() => import('./FinanceReservasPage'));
const FinanceAgendamentosReportPage = lazy(() => import('./FinanceAgendamentosReportPage'));
const AdminFuelPage = lazy(() => import('../MarinaFuelView'));

function FuelWrapper({ operadorNome }: { operadorNome?: string }) {
  const [fuelData, setFuelData] = useState<any>({ clients: [], boats: [], transacoes: [], reservations: [] });

  const loadData = () => {
    setFuelData({
      clients: clientDB.getAll(),
      boats: boatDB.getAll(),
      transacoes: [],
      reservations: []
    });
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    fetch('/api/financeiro/transacoes', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(transacoes => setFuelData((prev: any) => ({ ...prev, transacoes })))
      .catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AdminFuelPage
      data={fuelData}
      setData={setFuelData}
      reloadData={loadData}
      isAdmin={true}
      operadorNome={operadorNome || 'Financeiro'}
    />
  );
}

interface FinanceiroDashboardProps {
  onLogout?: () => void;
  operadorNome?: string;
}

const COMPANIES = ['Todos', 'Marina Velho Chico', 'Vale Administradora', 'Mexicano'];

export default function FinanceiroDashboard({ onLogout, operadorNome }: FinanceiroDashboardProps) {
  // Navigation
  const [activeNav, setActiveNav] = useState<string>(() => {
    return localStorage.getItem('financeiro_active_nav') || 'dashboard';
  });

  // Sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('financeiro_sidebar_collapsed') === 'true';
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Global Company Filter
  const [empresaFiltro, setEmpresaFiltro] = useState<string>(() => {
    return localStorage.getItem('financeiro_empresa_filtro') || 'Todos';
  });

  // Privacy Mode (hide monetary values with R$ ••••)
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('financeiro_privacy_mode') === 'true';
  });

  // Quick Search Modal (Ctrl + K)
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const quickSearchInputRef = useRef<HTMLInputElement>(null);

  // Notifications Popover
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('financeiro_read_notifs') || '[]');
    } catch {
      return [];
    }
  });
  const notifRef = useRef<HTMLDivElement>(null);

  // User details
  const resolvedOperadorNome =
    operadorNome ||
    localStorage.getItem('admin_name') ||
    localStorage.getItem('admin_username') ||
    'Financeiro';

  // Settings modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<'perfil' | 'regras' | 'notificacoes' | 'interface' | 'atalhos'>('interface');

  // Quick Drawer "+ Novo Lançamento"
  const [novoLancamentoDrawerOpen, setNovoLancamentoDrawerOpen] = useState(false);

  // Ancillary data for drawer and quick search
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>(() => clientDB.getAll());
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>(() => boatDB.getAll());
  const [planosContas, setPlanosContas] = useState<any[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);

  // Toast message
  const [shortcutToast, setShortcutToast] = useState<string | null>(null);
  const showToast = (msg: string) => setShortcutToast(msg);

  useEffect(() => {
    if (!shortcutToast) return;
    const t = setTimeout(() => setShortcutToast(null), 2200);
    return () => clearTimeout(t);
  }, [shortcutToast]);

  // Sync settings when changed from modal
  useEffect(() => {
    const handleSettingsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (customEvent.detail.modoPrivacidadePadrao !== undefined) {
          setPrivacyMode(Boolean(customEvent.detail.modoPrivacidadePadrao));
        }
        if (customEvent.detail.sidebarColapsadaPadrao !== undefined) {
          setSidebarCollapsed(Boolean(customEvent.detail.sidebarColapsadaPadrao));
        }
        if (customEvent.detail.empresaFiltroPadrao && customEvent.detail.empresaFiltroPadrao !== empresaFiltro) {
          setEmpresaFiltro(customEvent.detail.empresaFiltroPadrao);
        }
      }
    };
    window.addEventListener('financeiro-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('financeiro-settings-updated', handleSettingsUpdate);
  }, [empresaFiltro]);

  const handleNavSelect = (id: string) => {
    setActiveNav(id);
    localStorage.setItem('financeiro_active_nav', id);
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('financeiro_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleTogglePrivacy = () => {
    setPrivacyMode(prev => {
      const next = !prev;
      localStorage.setItem('financeiro_privacy_mode', String(next));
      showToast(next ? 'Modo Privacidade Ativado (Valores Ocultos)' : 'Modo Privacidade Desativado');
      return next;
    });
  };

  const handleSelectEmpresa = (empresa: string) => {
    setEmpresaFiltro(empresa);
    localStorage.setItem('financeiro_empresa_filtro', empresa);
  };

  // Fetch finance data for sidebar, Ctrl+K search and global drawer
  const fetchGlobalData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const [resT, resP, resC, resB, resF] = await Promise.all([
        fetch('/api/financeiro/transacoes', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/financeiro/planos-contas', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/financeiro/centros-custo', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/financeiro/contas-bancarias', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/financeiro/fornecedores', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (resT.ok) {
        const d = await resT.json();
        if (Array.isArray(d)) setTransacoes(d);
      }
      if (resP.ok) setPlanosContas(await resP.json());
      if (resC.ok) setCentrosCusto(await resC.json());
      if (resB.ok) setContasBancarias(await resB.json());
      if (resF.ok) setFornecedores(await resF.json());
    } catch {
      // Ignorar erros silenciosos de background
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const syncLocal = () => {
      setClientes([...clientDB.getAll()]);
      setEmbarcacoes([...boatDB.getAll()]);
    };
    syncLocal();

    const handleUpdate = () => {
      fetchGlobalData();
      syncLocal();
    };

    window.addEventListener('finance_updated', handleUpdate);
    window.addEventListener('db_updated', handleUpdate);
    window.addEventListener('db_synced', handleUpdate);

    return () => {
      window.removeEventListener('finance_updated', handleUpdate);
      window.removeEventListener('db_updated', handleUpdate);
      window.removeEventListener('db_synced', handleUpdate);
    };
  }, []);

  // Save transaction from global drawer
  const handleSaveLancamentos = async (novosLancamentos: Partial<TransacaoFinanceira>[]) => {
    setNovoLancamentoDrawerOpen(false);
    const withIds = novosLancamentos.map(l => ({
      ...l,
      id: l.id || `fin_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      createdAt: l.createdAt || new Date().toISOString()
    }));

    try {
      const token = localStorage.getItem('admin_token');
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'upsert', data: withIds })
      });
      fetchGlobalData();
      window.dispatchEvent(new CustomEvent('finance_updated'));
      showToast('Lançamento salvo com sucesso!');
    } catch {
      alert('Erro ao salvar lançamento financeiro.');
    }
  };

  // Click outside notifications popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Financial Notifications
  const notifications = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'vencido' | 'aberto' | 'baixa';
      title: string;
      desc: string;
      time: string;
      targetNav: string;
    }> = [];

    const todayStr = new Date().toISOString().substring(0, 10);
    const vencidas = transacoes.filter(
      t => t.tipo === 'receita' && (t.status === 'vencido' || (t.status === 'lancado' && t.dataVencimento < todayStr))
    );

    if (vencidas.length > 0) {
      const totalVenc = vencidas.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
      list.push({
        id: `vencidos-${vencidas.length}`,
        type: 'vencido',
        title: `${vencidas.length} contas a receber vencidas`,
        desc: `Total de R$ ${totalVenc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aguardando regularização`,
        time: 'Hoje',
        targetNav: 'lancamentos'
      });
    }

    const baixasPendentes = transacoes.filter(t => t.status !== 'pago' && t.status !== 'cancelado' && !!t.comprovante);
    if (baixasPendentes.length > 0) {
      list.push({
        id: `baixas-pendentes-${baixasPendentes.length}`,
        type: 'baixa',
        title: `${baixasPendentes.length} comprovantes aguardando baixa`,
        desc: 'Verifique os comprovantes enviados pelos clientes para conciliação',
        time: 'Agora',
        targetNav: 'lancamentos'
      });
    }

    return list;
  }, [transacoes]);

  const unreadNotifications = useMemo(
    () => notifications.filter(n => !readNotifIds.includes(n.id)),
    [notifications, readNotifIds]
  );

  const markAllNotificationsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifIds(allIds);
    localStorage.setItem('financeiro_read_notifs', JSON.stringify(allIds));
  };

  // Keyboard Shortcuts (Ctrl + K, Alt + D, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickSearchOpen(prev => !prev);
        setQuickSearchQuery('');
        return;
      }

      if (e.key === 'Escape') {
        if (quickSearchOpen) setQuickSearchOpen(false);
        if (notificationsOpen) setNotificationsOpen(false);
        if (mobileNavOpen) setMobileNavOpen(false);
        return;
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'd') {
          e.preventDefault();
          handleNavSelect('dashboard');
          showToast('Atalho Alt + D → Visão Geral');
        } else if (k === 'l') {
          e.preventDefault();
          handleNavSelect('lancamentos');
          showToast('Atalho Alt + L → Lançamentos');
        } else if (k === 'f') {
          e.preventDefault();
          handleNavSelect('fluxo');
          showToast('Atalho Alt + F → Fluxo de Caixa');
        } else if (k === 'p') {
          e.preventDefault();
          handleNavSelect('parcelas');
          showToast('Atalho Alt + P → Gestão de Parcelas');
        } else if (k === 'b') {
          e.preventDefault();
          handleNavSelect('boletos');
          showToast('Atalho Alt + B → Boletos & Cobrança');
        } else if (k === 'r') {
          e.preventDefault();
          handleNavSelect('relatorios');
          showToast('Atalho Alt + R → Relatórios & DRE');
        } else if (k === 'c') {
          e.preventDefault();
          handleNavSelect('cadastros');
          showToast('Atalho Alt + C → Cadastros');
        } else if (k === 'n') {
          e.preventDefault();
          setNovoLancamentoDrawerOpen(true);
          showToast('Atalho Alt + N → Novo Lançamento');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSearchOpen, notificationsOpen, mobileNavOpen]);

  // Focus quick search
  useEffect(() => {
    if (quickSearchOpen) {
      setTimeout(() => quickSearchInputRef.current?.focus(), 50);
    }
  }, [quickSearchOpen]);

  // Quick search results
  const quickSearchResults = useMemo(() => {
    const q = quickSearchQuery.toLowerCase().trim();
    if (!q) {
      return { matchedTransacoes: [], navActions: [
        { id: 'nav-dash', label: 'Ir para Visão Geral (Dashboard)', shortcut: 'Alt + D', nav: 'dashboard' },
        { id: 'nav-lanc', label: 'Ir para Lançamentos (Contas a Pagar/Receber)', shortcut: 'Alt + L', nav: 'lancamentos' },
        { id: 'nav-flux', label: 'Ir para Fluxo de Caixa', shortcut: 'Alt + F', nav: 'fluxo' },
        { id: 'nav-parc', label: 'Ir para Gestão de Parcelas', shortcut: 'Alt + P', nav: 'parcelas' },
        { id: 'nav-bole', label: 'Ir para Boletos & Cobrança', shortcut: 'Alt + B', nav: 'boletos' },
        { id: 'nav-res', label: 'Ir para Consulta de Reservas', nav: 'reservas' },
        { id: 'nav-agrep', label: 'Ir para Relatórios & Agendamentos', nav: 'agendamentos_relatorios' },
        { id: 'nav-rela', label: 'Ir para Relatórios & DRE', shortcut: 'Alt + R', nav: 'relatorios' },
        { id: 'nav-novo', label: 'Cadastrar Novo Lançamento', shortcut: 'Alt + N', action: () => setNovoLancamentoDrawerOpen(true) },
      ] };
    }

    const matchedTransacoes = transacoes
      .filter(t => {
        const descMatch = (t.descricao || '').toLowerCase().includes(q);
        const catMatch = (t.categoria || '').toLowerCase().includes(q);
        const client = clientes.find(c => c.id === t.clienteId);
        const clientMatch = client ? client.nome.toLowerCase().includes(q) : false;
        const valMatch = String(t.valor).includes(q);
        return descMatch || catMatch || clientMatch || valMatch;
      })
      .slice(0, 6);

    const navActions = [
      { id: 'nav-dash', label: 'Ir para Visão Geral (Dashboard)', shortcut: 'Alt + D', nav: 'dashboard' },
      { id: 'nav-lanc', label: 'Ir para Lançamentos', shortcut: 'Alt + L', nav: 'lancamentos' },
      { id: 'nav-flux', label: 'Ir para Fluxo de Caixa', shortcut: 'Alt + F', nav: 'fluxo' },
      { id: 'nav-parc', label: 'Ir para Gestão de Parcelas', shortcut: 'Alt + P', nav: 'parcelas' },
      { id: 'nav-bole', label: 'Ir para Boletos & Cobrança', shortcut: 'Alt + B', nav: 'boletos' },
      { id: 'nav-rela', label: 'Ir para Relatórios & DRE', shortcut: 'Alt + R', nav: 'relatorios' },
    ].filter(a => a.label.toLowerCase().includes(q));

    return { matchedTransacoes, navActions };
  }, [quickSearchQuery, transacoes, clientes]);

  return (
    <div className="h-screen w-full flex bg-mx-sand text-stone-900 font-sans overflow-hidden">
      {/* Sidebar — desktop */}
      <div className="hidden lg:block h-full">
        <FinanceiroSidebar
          active={activeNav}
          onSelect={handleNavSelect}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          privacyMode={privacyMode}
          empresaFiltro={empresaFiltro}
        />
      </div>

      {/* Sidebar — mobile drawer */}
      <div className={`lg:hidden fixed inset-0 z-50 ${mobileNavOpen ? '' : 'pointer-events-none'}`}>
        <div
          onClick={() => setMobileNavOpen(false)}
          className={`absolute inset-0 bg-stone-900/30 transition-opacity ${mobileNavOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          className={`absolute inset-y-0 left-0 transition-transform duration-300 ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <FinanceiroSidebar
            active={activeNav}
            onSelect={id => {
              handleNavSelect(id);
              setMobileNavOpen(false);
            }}
            onClose={() => setMobileNavOpen(false)}
            privacyMode={privacyMode}
            empresaFiltro={empresaFiltro}
          />
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 bg-white border-b border-stone-200/80 flex items-center gap-3 px-4 lg:px-6">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 cursor-pointer"
            title="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={handleToggleSidebar}
            className="hidden lg:flex w-9 h-9 rounded-lg items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          {/* Quick Search trigger button (Ctrl + K) */}
          <button
            type="button"
            onClick={() => {
              setQuickSearchOpen(true);
              setQuickSearchQuery('');
            }}
            className="flex items-center gap-2 h-9 w-full max-w-[320px] px-3 rounded-lg bg-stone-50 hover:bg-stone-100/80 border border-stone-200/80 hover:border-stone-300 text-stone-400 hover:text-stone-600 transition-all cursor-pointer text-left"
            title="Busca rápida de transações, clientes e contas (Ctrl + K)"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-[13px] truncate">Buscar transação, cliente…</span>
            <kbd className="hidden sm:inline text-[10px] font-medium text-stone-400 border border-stone-200 bg-white rounded px-1.5 py-0.5">
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            {/* Quick Action Button: Novo Lançamento */}
            <button
              type="button"
              onClick={() => setNovoLancamentoDrawerOpen(true)}
              className="h-9 px-3.5 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white flex items-center gap-1.5 text-xs font-semibold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Lançamento</span>
            </button>

            {/* Notifications Popover */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(prev => !prev)}
                className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  notificationsOpen
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                }`}
                title="Central de notificações financeiras"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-mx-red ring-2 ring-white" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-stone-900">Alertas Financeiros</h3>
                      <p className="text-[10px] text-stone-400">Notificações e conciliações pendentes</p>
                    </div>
                    {unreadNotifications.length > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                        title="Marcar todas como lidas"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-stone-400">
                        Nenhum alerta pendente no momento.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <button
                          key={n.id}
                          onClick={() => {
                            handleNavSelect(n.targetNav);
                            setNotificationsOpen(false);
                          }}
                          className="w-full p-3.5 text-left flex items-start gap-3 hover:bg-stone-50 transition-colors cursor-pointer"
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              n.type === 'vencido'
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-stone-900 truncate">{n.title}</span>
                              <span className="text-[10px] text-stone-400 shrink-0">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">{n.desc}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-4.5 w-px bg-stone-200/80 mx-0.5" />

            {/* User Avatar Menu */}
            <UserAvatarMenu
              userName={resolvedOperadorNome}
              userRole="Financeiro"
              onLogout={onLogout}
              brand="mexicano"
              showDetailsOnDesktop={true}
              onOpenSettings={(tab) => {
                const targetTab = tab === 'metas' ? 'regras' : (tab || 'interface');
                setSettingsModalTab(targetTab as 'perfil' | 'regras' | 'notificacoes' | 'interface' | 'atalhos');
                setSettingsModalOpen(true);
              }}
            />
          </div>
        </header>

        {/* Toast Feedback */}
        {shortcutToast && (
          <div className="fixed bottom-5 right-5 z-50 px-3.5 py-2 rounded-lg bg-stone-900 text-white text-xs font-medium shadow-lg animate-fade-in flex items-center gap-2">
            <span>{shortcutToast}</span>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-4 lg:p-6 space-y-4">
            <Suspense
              fallback={
                <div className="h-72 w-full flex flex-col items-center justify-center bg-white rounded-xl border border-stone-200/80 gap-3">
                  <div className="w-8 h-8 border-3 border-mx-ink border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-stone-400 font-medium">Carregando módulo financeiro...</span>
                </div>
              }
            >
              {activeNav === 'dashboard' && (
                <FinanceDashboardPage
                  empresaFiltro={empresaFiltro}
                  privacyMode={privacyMode}
                  onOpenNovoLancamento={() => setNovoLancamentoDrawerOpen(true)}
                  hideTopHeader={false}
                />
              )}

              {activeNav === 'lancamentos' && (
                <FinanceLancamentos
                  empresaFiltro={empresaFiltro}
                  privacyMode={privacyMode}
                  onOpenNovoLancamento={() => setNovoLancamentoDrawerOpen(true)}
                  hideTopHeader={false}
                />
              )}

              {activeNav === 'fluxo' && <FinanceFluxoCaixa />}
              {activeNav === 'parcelas' && <FinanceParcelasFixas />}
              {activeNav === 'boletos' && <BoletosPage />}
              {activeNav === 'reservas' && <FinanceReservasPage />}
              {activeNav === 'agendamentos_relatorios' && <FinanceAgendamentosReportPage />}
              {activeNav === 'relatorios' && <FinanceRelatorios />}
              {activeNav === 'cadastros' && <FinanceCadastroConfigs />}
              {activeNav === 'combustivel' && <FuelWrapper operadorNome={operadorNome} />}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Quick Search Modal (Ctrl + K) */}
      {quickSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-stone-950/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-3.5 border-b border-stone-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-stone-400 shrink-0" />
              <input
                ref={quickSearchInputRef}
                type="text"
                value={quickSearchQuery}
                onChange={e => setQuickSearchQuery(e.target.value)}
                placeholder="Buscar lançamento, cliente, valor ou atalho..."
                className="w-full text-sm text-stone-900 placeholder-stone-400 focus:outline-none"
              />
              <button
                onClick={() => setQuickSearchOpen(false)}
                className="w-6 h-6 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {quickSearchResults.navActions.length > 0 && (
                <div className="px-2 pt-1 pb-1 text-[10px] uppercase font-bold text-stone-400">Ações Rápidas</div>
              )}
              {quickSearchResults.navActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => {
                    if (action.action) action.action();
                    else if (action.nav) handleNavSelect(action.nav);
                    setQuickSearchOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg text-left text-xs font-semibold text-stone-700 hover:bg-stone-100 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>{action.label}</span>
                  {action.shortcut && (
                    <kbd className="text-[10px] font-mono text-stone-400 border border-stone-200 bg-white rounded px-1.5 py-0.5">
                      {action.shortcut}
                    </kbd>
                  )}
                </button>
              ))}

              {quickSearchResults.matchedTransacoes.length > 0 && (
                <div className="px-2 pt-3 pb-1 text-[10px] uppercase font-bold text-stone-400">Lançamentos Encontrados</div>
              )}
              {quickSearchResults.matchedTransacoes.map(t => {
                const client = clientes.find(c => c.id === t.clienteId);
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      handleNavSelect('lancamentos');
                      setQuickSearchOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs text-stone-800 hover:bg-stone-100 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold truncate">{t.descricao || t.categoria}</p>
                      <p className="text-[11px] text-stone-400 truncate">{client?.nome || 'Geral'} • {t.dataVencimento}</p>
                    </div>
                    <span className="font-bold tabular-nums shrink-0">
                      {privacyMode ? 'R$ ••••' : `R$ ${Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Global Novo Lançamento Drawer */}
      <FinanceLancamentoDrawer
        open={novoLancamentoDrawerOpen}
        onClose={() => setNovoLancamentoDrawerOpen(false)}
        onSave={handleSaveLancamentos}
        defaultEmpresa={empresaFiltro}
        planosContas={planosContas}
        centrosCusto={centrosCusto}
        clientes={clientes}
        fornecedores={fornecedores}
        contasBancarias={contasBancarias}
        embarcacoes={embarcacoes}
      />

      {/* Global Financeiro Settings Modal */}
      <FinanceiroSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        initialTab={settingsModalTab}
        onNavigateShortcut={(target) => {
          if (target === 'novo') {
            setNovoLancamentoDrawerOpen(true);
          } else if (target === 'search') {
            setQuickSearchOpen(true);
          } else if (['dashboard', 'lancamentos', 'fluxo', 'parcelas', 'boletos', 'relatorios', 'reservas', 'agendamentos_relatorios'].includes(target)) {
            handleNavSelect(target);
          }
        }}
      />
    </div>
  );
}
