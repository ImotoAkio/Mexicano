import React, { useState, useEffect, Suspense, lazy } from 'react';
import Logo from './components/Logo';
import { loadFromRemote } from './db';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { STORAGE_KEYS, UI } from './utils/constants';

const Dashboard = lazy(() => import('./components/Dashboard'));
const SchedulesPage = lazy(() => import('./components/SchedulesPage'));
const SchedulesReportPage = lazy(() => import('./components/SchedulesReportPage'));
const ClientPage = lazy(() => import('./components/ClientPage'));
const BoatPage = lazy(() => import('./components/BoatPage'));
const IntegrationsPage = lazy(() => import('./components/IntegrationsPage'));
const SoundControlsPage = lazy(() => import('./components/SoundControlsPage'));
const FinancePage = lazy(() => import('./components/FinancePage'));
import LoginPage from './components/LoginPage';
import ClientLoginPage from './components/ClientLoginPage';
const ClientDashboardPage = lazy(() => import('./components/ClientDashboardPage'));
import LandingPage from './components/LandingPage';
const MarinaDashboard = lazy(() => import('./components/MarinaDashboard'));
const UsersPage = lazy(() => import('./components/UsersPage'));
const FeedbackForm = lazy(() => import('./components/FeedbackForm'));
const FeedbackAdmin = lazy(() => import('./components/FeedbackAdmin'));
const MaintenancePage = lazy(() => import('./components/MaintenancePage'));
const PortalInterno = lazy(() => import('./components/finance/PortalInterno'));
const MarinaChecklistsView = lazy(() => import('./components/MarinaChecklistsView'));
const MarinaFuelView = lazy(() => import('./components/MarinaFuelView'));
const WhatsAppPage = lazy(() => import('./components/WhatsAppPage'));
const FinanceWhatsAppPage = lazy(() => import('./components/FinanceWhatsAppPage'));
const FinanceSchedulesPage = lazy(() => import('./components/FinanceSchedulesPage'));
const AvisosSaidaPage = lazy(() => import('./components/AvisosSaidaPage'));
const ControleFolgasPage = lazy(() => import('./components/ControleFolgasPage'));
const ControleEpiPage = lazy(() => import('./components/ControleEpiPage'));
const DPPage = lazy(() => import('./components/DP/DPPage'));
const BoletosPage = lazy(() => import('./components/finance/BoletosPage'));
const RetroativoPage = lazy(() => import('./components/RetroativoPage').then(m => ({ default: m.RetroativoPage })));
import { clientDB, boatDB, reservationDB } from './db';

// Wrappers para reuso dos componentes da Marina no Admin
const AdminChecklistsWrapper = () => {
  const [data, setData] = useState<any>({ clients: [], boats: [], reservations: [] });
  useEffect(() => {
    setData({
      clients: clientDB.getAll(),
      boats: boatDB.getAll(),
      reservations: reservationDB.getAll()
    });
  }, []);
  return <MarinaChecklistsView data={data} />;
};

const AdminFuelWrapper = () => {
  const [data, setData] = useState<any>({ clients: [], boats: [], transacoes: [] });
  useEffect(() => {
    setData({
      clients: clientDB.getAll(),
      boats: boatDB.getAll(),
      transacoes: []
    });
    fetch('/api/financeiro/transacoes', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
    })
    .then(r => r.json())
    .then(transacoes => setData(prev => ({ ...prev, transacoes })))
    .catch(console.error);
  }, []);
  return <MarinaFuelView data={data} />;
};
import { 
  Compass, 
  Calendar as CalendarIcon, 
  Users, 
  Ship, 
  Anchor, 
  Settings, 
  Speaker,
  Shield,
  Menu,
  ChevronLeft,
  ChevronRight,
  Database,
  Wallet,
  FileSearch,
  FileText,
  TrendingUp,
  ClipboardList,
  MessageSquare,
  CheckCircle,
  Wrench,
  Droplet, Droplets, Clock, Upload, Trash2, Edit2, Play, Download, Printer, Receipt
} from 'lucide-react';


type TabType = 'dp-dashboard' | 'dashboard' | 'schedules' | 'reports' | 'clients' | 'boats' | 'integrations' | 'sound' | 'finance-aprovacoes' | 'finance-lancamentos' | 'finance-atividades' | 'finance-cobranca' | 'finance-whatsapp' | 'finance-schedules' | 'finance-boletos' | 'users' | 'feedback' | 'manutencoes' | 'portal-interno' | 'checklists' | 'fuel' | 'whatsapp' | 'aviso-saida' | 'controle-folgas' | 'controle-epi';

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  
  // Client session: JWT-based with local cache for instant PWA loading
  const [clientToken, setClientToken] = useState<string | null>(() => localStorage.getItem('client_token'));
  const [clientData, setClientData] = useState<{ client: any; boats: any[]; reservations: any[]; transacoes?: any[] } | null>(() => {
    try {
      const cached = localStorage.getItem('client_data_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [clientLoading, setClientLoading] = useState(false);

  // Admin session: JWT-based
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  });
  const [adminRole, setAdminRole] = useState<'admin' | 'marina' | 'financeiro' | 'pecas_servicos' | null>(null);
  const [adminName, setAdminName] = useState<string>('');
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [isAdminDbLoaded, setIsAdminDbLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (localStorage.getItem(STORAGE_KEYS.ADMIN_ACTIVE_TAB) as TabType) || 'schedules';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADMIN_ACTIVE_TAB, activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Fetch admin role
  useEffect(() => {
    if (isAuthenticated && !adminRole && !isRoleLoading) {
      setIsRoleLoading(true);
      fetch('/api/auth/validate', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setAdminRole(data.role as 'admin' | 'marina' | 'financeiro' | 'pecas_servicos');
          setAdminName(data.nome || data.username || 'Operador');
          if (data.role === 'financeiro') {
            setActiveTab('finance-lancamentos');
          } else if (data.role === 'pecas_servicos') {
            setActiveTab('manutencoes');
          }
        } else {
          handleLogout();
        }
      })
      .catch(() => handleLogout())
      .finally(() => setIsRoleLoading(false));
    }
  }, [isAuthenticated, adminRole, isRoleLoading]);

  // Load DB into memory (com AbortController para evitar race conditions)
  useEffect(() => {
    if (isAuthenticated && !isAdminDbLoaded) {
      const controller = new AbortController();
      loadFromRemote().then(() => {
        if (!controller.signal.aborted) {
          setIsAdminDbLoaded(true);
        }
      });
      return () => controller.abort();
    }
  }, [isAuthenticated, isAdminDbLoaded]);

  const fetchClientData = async (showLoading = false) => {
    if (!clientToken) return;
    if (showLoading && !clientData) setClientLoading(true);
    try {
      const res = await fetch('/api/client/me', {
        headers: { 'Authorization': `Bearer ${clientToken}` }
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('client_token');
        localStorage.removeItem('client_data_cache');
        setClientToken(null);
        setClientData(null);
        throw new Error('Token inválido ou expirado');
      }
      if (!res.ok) {
        throw new Error('Erro ao buscar dados do cliente');
      }
      const data = await res.json();
      setClientData(data);
      try {
        localStorage.setItem('client_data_cache', JSON.stringify(data));
      } catch (err) {}
    } catch (e) {
      console.error("Erro no polling do cliente:", e);
    } finally {
      if (showLoading) setClientLoading(false);
    }
  };

  // Fetch client data from API using JWT
  useEffect(() => {
    if (clientToken && !clientData && !clientLoading) {
      fetchClientData(true);
    } else if (clientToken && clientData) {
      // Re-fetch in background without blocking UI
      fetchClientData(false);
    }
  }, [clientToken]);

  // Polling to keep client data updated in the background
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (clientToken) {
      interval = setInterval(() => {
        fetchClientData(false);
      }, 15000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [clientToken]);

  const navGroups = [
    {
      group: 'Visão Geral',
      items: [
        { id: 'dashboard' as TabType, label: 'Painel Geral', icon: Compass },
      ]
    },
    {
      group: 'Operacional',
      items: [
        { id: 'schedules' as TabType, label: 'Agenda de Reservas', icon: CalendarIcon },
        { id: 'whatsapp' as TabType, label: 'Central de WhatsApp', icon: MessageSquare },
        { id: 'sound' as TabType, label: 'Vistoria de Som', icon: Speaker },
        { id: 'reports' as TabType, label: 'Relatórios & Histórico', icon: FileSearch },
        { id: 'manutencoes' as TabType, label: 'Manutenções', icon: Wrench },
      ]
    },
    {
      group: 'Cadastros',
      items: [
        { id: 'clients' as TabType, label: 'Cadastro de Clientes', icon: Users },
        { id: 'boats' as TabType, label: 'Cadastro de Embarcações', icon: Ship },
      ]
    },
    {
      group: 'Financeiro',
      items: [
        { id: 'finance-lancamentos' as TabType, label: 'Lançamentos', icon: Wallet },
        { id: 'finance-atividades' as TabType, label: 'Atividades', icon: ClipboardList },
        { id: 'finance-cobranca' as TabType, label: 'Débitos & Cobrança', icon: FileText },
        { id: 'finance-boletos' as TabType, label: 'Envio de Boletos', icon: Receipt },
        { id: 'finance-schedules' as TabType, label: 'Consulta de Agendas', icon: CalendarIcon },
        { id: 'finance-whatsapp' as TabType, label: 'WhatsApp', icon: MessageSquare },
      ]
    },
    {
      group: 'Departamento Pessoal',
      items: [
        { id: 'dp-dashboard' as TabType, label: 'Painel & Cadastros', icon: Users },
        { id: 'controle-folgas' as TabType, label: 'Controle de Folgas', icon: CalendarIcon },
        { id: 'controle-epi' as TabType, label: 'Controle de EPI', icon: Shield },
      ]
    },
    {
      group: 'Administração',
      items: [
        { id: 'portal-interno' as TabType, label: 'Portal Interno', icon: MessageSquare },
        { id: 'feedback' as TabType, label: 'Central de Feedback', icon: MessageSquare },
        { id: 'users' as TabType, label: 'Gestão de Usuários', icon: Shield },
        { id: 'integrations' as TabType, label: 'Configurações & Integrações', icon: Settings },
        { id: 'aviso-saida' as TabType, label: 'Planos de Navegação', icon: Printer },
      ]
    }
  ].map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (adminRole === 'financeiro') {
        return ['finance-lancamentos', 'finance-atividades', 'finance-cobranca', 'finance-boletos', 'finance-whatsapp', 'manutencoes', 'portal-interno', 'finance-schedules'].includes(item.id);
      } else if (adminRole === 'pecas_servicos') {
        return ['manutencoes', 'finance-lancamentos', 'finance-atividades', 'finance-cobranca', 'finance-boletos', 'finance-whatsapp', 'finance-schedules', 'schedules', 'portal-interno'].includes(item.id);
      }
      return true;
    })
  })).filter(group => group.items.length > 0);

  useEffect(() => {
    if (adminRole === 'financeiro' && !['finance-lancamentos', 'finance-atividades', 'finance-cobranca', 'finance-boletos', 'finance-whatsapp', 'manutencoes', 'portal-interno', 'finance-schedules'].includes(activeTab)) {
      setActiveTab('finance-lancamentos');
    } else if (adminRole === 'pecas_servicos' && !['manutencoes', 'finance-lancamentos', 'finance-atividades', 'finance-cobranca', 'finance-boletos', 'finance-whatsapp', 'finance-schedules', 'schedules', 'portal-interno'].includes(activeTab)) {
      setActiveTab('manutencoes');
    }
  }, [adminRole, activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const handler = () => {
      handleLogout();
    };
    window.addEventListener('auth-expired', handler);
    return () => window.removeEventListener('auth-expired', handler);
  }, []);

  const isFeedbackRoute = currentPath === '/feedback' || currentPath.startsWith('/feedback');
  const isAdminRoute = currentPath.startsWith('/admin');
  const isPortalRoute = currentPath.startsWith('/portal');
  const isSimuladorRoute = currentPath === '/simulador-epi';
  const isLandingRoute = !isAdminRoute && !isPortalRoute && !isFeedbackRoute && !isSimuladorRoute;

  // ═══════════ FEEDBACK PUBLIC PAGE (/feedback) ═══════════
  if (isFeedbackRoute) {
    return (
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}>
        <FeedbackForm />
      </Suspense>
    );
  }

  // ═══════════ LANDING PAGE (/) ═══════════
  if (isLandingRoute) {
    // Temporariamente inativo - redirecionando para o portal
    window.location.replace('/portal');
    return null;
  }

  // ═══════════ PORTAL DO CLIENTE (/portal) ═══════════
  if (isPortalRoute) {
    if (!clientToken) {
      return (
        <ClientLoginPage 
          onLoginSuccess={(token) => {
            localStorage.setItem('client_token', token);
            setClientToken(token);
          }}
        />
      );
    }

    if (clientLoading || !clientData) {
      return (
        <div className="min-h-[100dvh] w-full bg-[#050505] flex items-center justify-center font-sans relative overflow-hidden text-white">
          <div className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen">
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_50%)]"></div>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center relative z-10">
            <div className="relative w-28 h-28 flex items-center justify-center animate-pulse">
              <div className="w-full h-full opacity-90 p-4">
                <Logo className="w-full h-full text-[#B69D74]" />
              </div>
            </div>
            <div className="mt-8 flex flex-col items-center">
              <h1 className="text-xl font-medium tracking-[0.2em] text-white/90">
                VILA NÁUTICA
              </h1>
              <div className="h-[1px] bg-[#B69D74]/30 mt-4 w-12 [animation:luxury-line-expand_2.5s_ease-in-out_infinite]"></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-[100dvh] w-full bg-[#050505] flex items-center justify-center font-sans relative overflow-hidden text-white"><div className="relative w-28 h-28 flex items-center justify-center animate-pulse"><div className="w-full h-full opacity-90 p-4"><Logo className="w-full h-full text-[#B69D74]" /></div></div></div>}>
          <ClientDashboardPage 
            client={clientData.client}
            boats={clientData.boats}
            reservations={clientData.reservations}
            transacoes={clientData.transacoes || []}
            onRefresh={() => fetchClientData(false)}
            onLogout={() => {
              localStorage.removeItem('client_token');
              localStorage.removeItem('client_data_cache');
              setClientToken(null);
              setClientData(null);
            }}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLogin={(status) => {
          if (status) {
            setIsAuthenticated(true);
            setAdminRole(null); // Reset to trigger fetch
          }
        }} 
      />
    );
  }

  if (isRoleLoading || !adminRole || !isAdminDbLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (currentPath === '/simulador-epi') {
    return (
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}>
        <RetroativoPage />
      </Suspense>
    );
  }

  if (adminRole === 'marina') {
    return (
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}>
        <MarinaDashboard onLogout={handleLogout} operadorNome={adminName} />
      </Suspense>
    );
  }

  return (
    <div className="h-screen w-full flex bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Mobile Top Bar (Only visible on small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-100 z-50 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Logo className="h-8 w-auto text-[#B69D74]" />
          <span className="font-bold text-sm tracking-tight">Reservas Náuticas</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-slate-100 flex flex-col transition-all duration-300 ease-in-out overflow-x-hidden ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } shadow-xl md:shadow-none`}
      >
        {/* Sidebar Header / Logo */}
        <div 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`h-16 flex items-center border-b border-slate-100 px-4 ${isSidebarOpen ? 'justify-between' : 'justify-center'} shrink-0 cursor-pointer hover:bg-slate-50 transition-colors`}
          title={isSidebarOpen ? "Recolher Menu" : "Expandir Menu"}
        >
          {/* Expanded Logo & Text */}
          {isSidebarOpen ? (
            <div className="flex items-center space-x-3 overflow-hidden transition-all w-auto opacity-100">
              <Logo className="h-9 w-auto shrink-0 text-[#B69D74]" />
              <div className="flex flex-col justify-center min-w-[120px]">
                <h1 className="text-sm font-bold tracking-tight text-slate-950 leading-none">Reservas</h1>
                <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">Gestão de Cotas</p>
              </div>
            </div>
          ) : (
            /* Collapsed Logo Only */
            <div className="hidden md:flex justify-center w-full">
              <Logo className="h-8 w-auto shrink-0 text-[#B69D74]" />
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto subtle-scrollbar py-4 px-3 space-y-6">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {/* Group Title */}
              <div className={`px-3 mb-2 transition-all duration-200 ${isSidebarOpen ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden m-0 p-0'}`}>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.group}
                </h3>
              </div>
              
              {/* Group Items */}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer group ${
                      activeTab === item.id
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100'
                    } ${!isSidebarOpen ? 'justify-center' : 'justify-start'}`}
                    title={!isSidebarOpen ? item.label : undefined}
                  >
                    <item.icon className={`w-[18px] h-[18px] shrink-0 ${isSidebarOpen ? 'mr-3' : 'mr-0'}`} />
                    <span className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${
                      isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden md:block'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-3 py-2.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150 group ${!isSidebarOpen ? 'justify-center' : 'justify-start'}`}
            title={!isSidebarOpen ? 'Sair' : undefined}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 shrink-0 ${isSidebarOpen ? 'mr-3' : 'mr-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className={`text-sm font-semibold whitespace-nowrap overflow-hidden transition-all duration-200 ${
              isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden md:block'
            }`}>
              Sair
            </span>
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden pt-14 md:pt-0">
        <div className="flex-1 overflow-y-auto subtle-scrollbar w-full relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full pb-24">
            <ErrorBoundary>
              <Suspense fallback={<div className="h-full w-full min-h-[400px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}>
                {activeTab === 'dashboard' && adminRole !== 'financeiro' && adminRole !== 'pecas_servicos' && <Dashboard onNavigate={handleTabChange} />}
                {activeTab === 'schedules' && <SchedulesPage />}
                {activeTab === 'whatsapp' && <WhatsAppPage />}
                {activeTab === 'checklists' && <AdminChecklistsWrapper />}
                {activeTab === 'fuel' && <AdminFuelWrapper />}
                {activeTab === 'reports' && <SchedulesReportPage />}
                {activeTab === 'clients' && <ClientPage />}
                {activeTab === 'boats' && <BoatPage />}
                {activeTab === 'sound' && <SoundControlsPage />}
                {activeTab === 'manutencoes' && <MaintenancePage />}
                {activeTab === 'finance-lancamentos' && <FinancePage initialTab="lancamentos" />}
                {activeTab === 'finance-atividades' && <FinancePage initialTab="atividades" />}
                {activeTab === 'finance-cobranca' && <FinancePage initialTab="cobranca" />}
                {activeTab === 'finance-boletos' && <BoletosPage />}
                {activeTab === 'finance-whatsapp' && <FinanceWhatsAppPage />}
                {activeTab === 'finance-schedules' && <FinanceSchedulesPage />}
                {activeTab === 'users' && <UsersPage />}
                {activeTab === 'feedback' && <FeedbackAdmin />}
                {activeTab === 'integrations' && <IntegrationsPage />}
                {activeTab === 'portal-interno' && <PortalInterno />}
                {activeTab === 'aviso-saida' && <AvisosSaidaPage />}
                {activeTab === 'dp-dashboard' && <DPPage />}
                {activeTab === 'controle-folgas' && <ControleFolgasPage />}
                {activeTab === 'controle-epi' && <ControleEpiPage />}
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>

    </div>
  );
}
