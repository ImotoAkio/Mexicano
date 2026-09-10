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
const FinanceDashboardPage = lazy(() => import('./components/finance/FinanceDashboardPage'));
const FinanceFluxoCaixa = lazy(() => import('./components/finance/FinanceFluxoCaixa'));
const FinanceParcelasFixas = lazy(() => import('./components/finance/FinanceParcelasFixas'));
const FinanceCadastroConfigs = lazy(() => import('./components/finance/FinanceCadastroConfigs'));
const FinanceRelatorios = lazy(() => import('./components/finance/FinanceRelatorios'));
import LoginPage from './components/LoginPage';
import ClientLoginPage from './components/ClientLoginPage';
const ClientDashboardPage = lazy(() => import('./components/ClientDashboardPage'));
const MarinaDashboard = lazy(() => import('./components/MarinaDashboard'));
const MarinaOperadorDashboard = lazy(() => import('./components/MarinaOperadorDashboard'));
const ComercialDashboard = lazy(() => import('./components/ComercialDashboard'));
const UsersPage = lazy(() => import('./components/UsersPage'));
const FeedbackForm = lazy(() => import('./components/FeedbackForm'));
const FeedbackAdmin = lazy(() => import('./components/FeedbackAdmin'));
const PecasKanbanPage = lazy(() => import('./components/PecasKanbanPage'));
const ChamadosPage = lazy(() => import('./components/ChamadosPage'));
const PierTvDisplay = lazy(() => import('./components/MarinaOperador/PierTvDisplay'));
const PecasHorimetrosPage = lazy(() => import('./components/pecas/PecasHorimetrosPage'));
const PecasAcessoriosPage = lazy(() => import('./components/pecas/PecasAcessoriosPage'));
const PecasWhatsAppPage = lazy(() => import('./components/pecas/PecasWhatsAppPage'));
const PecasAtividadesPage = lazy(() => import('./components/pecas/PecasAtividadesPage'));
const PortalInterno = lazy(() => import('./components/finance/PortalInterno'));
const AdminChecklistsPage = lazy(() => import('./components/AdminChecklistsPage'));
const AdminFuelPage = lazy(() => import('./components/AdminFuelPage'));
const WhatsAppPage = lazy(() => import('./components/WhatsAppPage'));
const FinanceWhatsAppPage = lazy(() => import('./components/FinanceWhatsAppPage'));
const FinanceSchedulesPage = lazy(() => import('./components/FinanceSchedulesPage'));
const AvisosSaidaPage = lazy(() => import('./components/AvisosSaidaPage'));
const ControleFolgasPage = lazy(() => import('./components/ControleFolgasPage'));
const ControleEpiPage = lazy(() => import('./components/ControleEpiPage'));
const DPPage = lazy(() => import('./components/DP/DPPage'));
const BoletosPage = lazy(() => import('./components/finance/BoletosPage'));
const RetroativoPage = lazy(() => import('./components/RetroativoPage').then(m => ({ default: m.RetroativoPage })));
const AuditLogsPage = lazy(() => import('./components/AuditLogsPage'));
const SharedChecklistPage = lazy(() => import('./components/SharedChecklistPage'));
const ContractGeneratorPage = lazy(() => import('./components/ContractGeneratorPage'));
const SimuladoPage = lazy(() => import('./components/SimuladoPage'));
import { clientDB, boatDB, reservationDB, registrosAtividadesDB } from './db';
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
  Droplet, Droplets, Clock, CalendarClock, Upload, Trash2, Edit2, Play, Download, Printer, Receipt, History, Package, PieChart
} from 'lucide-react';

// Wrappers para reuso dos componentes da Marina no Admin
const AdminChecklistsWrapper = () => {
  const [data, setData] = useState<any>({ clients: [], boats: [], reservations: [] });

  const loadData = () => {
    setData({
      clients: clientDB.getAll(),
      boats: boatDB.getAll(),
      reservations: reservationDB.getAll()
    });
    const token = localStorage.getItem('admin_token');
    if (!token || token === 'null' || token === 'undefined') return;
    fetch('/api/db/pull', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : null)
      .then(serverData => {
        if (serverData && serverData.reservations) {
          setData(prev => ({ ...prev, reservations: serverData.reservations }));
        }
      }).catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  return <AdminChecklistsPage data={data} setData={setData} reloadData={loadData} />;
};

const AdminFuelWrapper = () => {
  const [data, setData] = useState<any>({ clients: [], boats: [], transacoes: [], reservations: [] });

  const loadData = () => {
    setData({
      clients: clientDB.getAll(),
      boats: boatDB.getAll(),
      transacoes: [],
      reservations: reservationDB.getAll()
    });
    fetch('/api/financeiro/transacoes', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
    })
    .then(r => r.json())
    .then(transacoes => setData(prev => ({ ...prev, transacoes })))
    .catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  return <AdminFuelPage data={data} setData={setData} reloadData={loadData} />;
};

type TabType = 'dp-dashboard' | 'dashboard' | 'schedules' | 'reports' | 'clients' | 'boats' | 'contratos' | 'integrations' | 'sound' | 'finance-aprovacoes' | 'finance-lancamentos' | 'finance-fuel' | 'finance-atividades' | 'finance-cobranca' | 'finance-whatsapp' | 'finance-schedules' | 'finance-boletos' | 'users' | 'feedback' | 'manutencoes' | 'chamados' | 'portal-interno' | 'checklists' | 'fuel' | 'whatsapp' | 'aviso-saida' | 'controle-folgas' | 'controle-epi' | 'audit-logs' | 'pecas-whatsapp' | 'pecas-atividades' | 'pecas-horimetros' | 'pecas-acessorios';

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
  const [adminRole, setAdminRole] = useState<string | null>(() => {
    return localStorage.getItem('admin_role') || null;
  });
  const [adminName, setAdminName] = useState<string>('');
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [isAdminDbLoaded, setIsAdminDbLoaded] = useState(false);
  const [dbData, setDbData] = useState<any>({});

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


  useEffect(() => {
    // Lógica inteligente de roteamento inicial da PWA
    if (currentPath === '/' || currentPath === '/portal') {
      const lastUserType = localStorage.getItem('last_user_type');
      
      // 1. Se tem admin_token mas não tem client_token, joga pro admin
      if (isAuthenticated && !clientToken) {
        window.history.replaceState(null, '', '/admin');
        setCurrentPath('/admin');
        return;
      }
      
      // 2. Se NÃO está logado de nenhuma das formas, mas o último login foi como admin
      // Isso evita que o funcionário veja a tela do cliente após o token expirar.
      if (!isAuthenticated && !clientToken && lastUserType === 'admin') {
        window.history.replaceState(null, '', '/admin');
        setCurrentPath('/admin');
      }
    }
  }, [currentPath, isAuthenticated, clientToken]);


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
          setAdminRole(data.role as any);
          localStorage.setItem('admin_role', data.role || '');
          setAdminName(data.nome || data.username || 'Operador');
          setAdminUsername(data.username || '');
          localStorage.setItem('admin_username', data.username || '');
          const roleStr = (data.role || '').toLowerCase().trim();
          if (roleStr === 'financeiro' || roleStr.includes('financ')) {
            setActiveTab('finance-lancamentos');
          } else if (roleStr === 'pecas_servicos' || roleStr.includes('pecas') || roleStr.includes('servico')) {
            setActiveTab('manutencoes');
          } else if (roleStr === 'comercial' || roleStr.includes('comerc')) {
            setActiveTab('contratos');
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
      loadFromRemote().then((data) => {
        if (!controller.signal.aborted) {
          setDbData(data);
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
      } else if (res.ok) {
        const data = await res.json();
        setClientData(data);
        localStorage.setItem('client_data_cache', JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do cliente:', e);
    } finally {
      if (showLoading) setClientLoading(false);
    }
  };

  useEffect(() => {
    if (clientToken) {
      fetchClientData(true);
      const interval = setInterval(() => fetchClientData(false), 15000);
      return () => clearInterval(interval);
    }
  }, [clientToken]);

  const effectiveRole = (adminRole || localStorage.getItem('admin_role') || '').toLowerCase().trim();
  const isPecasServicos = effectiveRole === 'pecas_servicos' || effectiveRole === 'pecas-servicos' || effectiveRole.includes('pecas') || effectiveRole.includes('servico');
  const isFinanceiro = effectiveRole === 'financeiro' || effectiveRole.includes('financ');
  const isComercial = effectiveRole === 'comercial' || effectiveRole.includes('comerc');

  const menuGroups = [
    {
      group: 'Visão Geral & Reservas',
      items: [
        { id: 'dashboard' as TabType, label: 'Painel Geral', icon: Compass },
        { id: 'schedules' as TabType, label: 'Agendamentos', icon: CalendarIcon },
        { id: 'whatsapp' as TabType, label: 'Central de WhatsApp', icon: MessageSquare },
      ]
    },
    {
      group: 'Operação de Pátio',
      items: [
        { id: 'checklists' as TabType, label: 'Checklists Diários', icon: ClipboardList },
        { id: 'fuel' as TabType, label: 'Abastecimento', icon: Droplets },
        { id: 'sound' as TabType, label: 'Vistoria de Som', icon: Speaker },
        { id: 'aviso-saida' as TabType, label: 'Planos de Navegação', icon: Printer },
      ]
    },
    {
      group: 'Manutenção & Peças',
      items: [
        { id: 'manutencoes' as TabType, label: 'Painel de Manutenções', icon: Wrench },
        { id: 'chamados' as TabType, label: 'Chamados', icon: ClipboardList },
        { id: 'pecas-horimetros' as TabType, label: 'Controle de Horímetros', icon: Clock },
        { id: 'pecas-acessorios' as TabType, label: 'Checklist de Acessórios', icon: Package },
        { id: 'pecas-atividades' as TabType, label: 'Quadro de Atividades', icon: ClipboardList },
        { id: 'pecas-whatsapp' as TabType, label: 'WhatsApp (Peças/Serviços)', icon: MessageSquare },
      ]
    },
    {
      group: 'Comercial & Cadastros',
      items: [
        { id: 'contratos' as TabType, label: 'Gerador de Contratos', icon: FileText },
        { id: 'clients' as TabType, label: 'Cadastro de Clientes', icon: Users },
        { id: 'boats' as TabType, label: 'Cadastro de Embarcações', icon: Ship },
        { id: 'reports' as TabType, label: 'Relatórios & Histórico', icon: FileSearch },
      ]
    },
    {
      group: 'Financeiro',
      items: [
        { id: 'finance-dashboard' as TabType, label: 'Visão Geral (Dashboard)', icon: PieChart },
        { id: 'finance-fluxo' as TabType, label: 'Fluxo de Caixa', icon: Wallet },
        { id: 'finance-recorrencia' as TabType, label: 'Gestão de Parcelas', icon: CalendarClock },
        { id: 'finance-cadastros' as TabType, label: 'Cadastros Financeiros', icon: Settings },
        { id: 'finance-relatorios' as TabType, label: 'Relatórios & DRE', icon: FileSearch },
        { id: 'finance-fuel' as TabType, label: 'Lançamento de Combustível', icon: Droplets },
        { id: 'finance-boletos' as TabType, label: 'Envio de Boletos', icon: Receipt },
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
      group: 'Administração & Sistema',
      items: [
        { id: 'portal-interno' as TabType, label: 'Portal Interno', icon: MessageSquare },
        { id: 'users' as TabType, label: 'Gestão de Usuários', icon: Shield },
        { id: 'integrations' as TabType, label: 'Configurações & Integrações', icon: Settings },
        { id: 'feedback' as TabType, label: 'Central de Feedback', icon: MessageSquare },
        { id: 'audit-logs' as TabType, label: 'Registro de Atividades', icon: History },
      ]
    }
  ].map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (isFinanceiro) {
        return ['finance-dashboard', 'finance-fluxo', 'finance-recorrencia', 'finance-cadastros', 'finance-relatorios', 'finance-fuel', 'finance-boletos', 'finance-whatsapp', 'manutencoes', 'portal-interno'].includes(item.id);
      } else if (isPecasServicos) {
        return ['manutencoes', 'chamados', 'pecas-horimetros', 'pecas-acessorios', 'pecas-whatsapp', 'pecas-atividades', 'checklists', 'finance-schedules', 'boats', 'clients'].includes(item.id);
      } else if (isComercial) {
        return ['contratos', 'clients', 'boats', 'schedules', 'aviso-saida', 'portal-interno'].includes(item.id);
      }
      return true;
    })
  })).filter(group => group.items.length > 0);

  useEffect(() => {
    if (isFinanceiro && !['finance-dashboard', 'finance-fluxo', 'finance-recorrencia', 'finance-cadastros', 'finance-relatorios', 'finance-fuel', 'finance-boletos', 'finance-whatsapp', 'manutencoes', 'portal-interno'].includes(activeTab)) {
      setActiveTab('finance-dashboard');
    } else if (isPecasServicos && !['manutencoes', 'chamados', 'pecas-horimetros', 'pecas-acessorios', 'pecas-whatsapp', 'pecas-atividades', 'checklists', 'finance-schedules', 'boats', 'clients'].includes(activeTab)) {
      setActiveTab('manutencoes');
    } else if (isComercial && !['contratos', 'clients', 'boats', 'schedules', 'aviso-saida', 'portal-interno'].includes(activeTab)) {
      setActiveTab('contratos');
    }
  }, [effectiveRole, activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_role');
    localStorage.removeItem(STORAGE_KEYS.ADMIN_ACTIVE_TAB);
    setIsAuthenticated(false);
    setAdminRole(null);
    setAdminName('');
    setIsAdminDbLoaded(false);
    setDbData({});
    setActiveTab('schedules');
  };

  useEffect(() => {
    const handler = () => {
      handleLogout();
    };
    window.addEventListener('auth-expired', handler);
    return () => window.removeEventListener('auth-expired', handler);
  }, []);

  const isFeedbackRoute = currentPath === '/feedback' || currentPath.startsWith('/feedback');
  const isQuizRoute = currentPath === '/simulado' || currentPath.startsWith('/simulado/');
  const isAdminRoute = currentPath.startsWith('/admin');
  const isSimuladorRoute = currentPath === '/simulador-epi';
  const isSharedChecklistRoute = currentPath.startsWith('/checklist/share/');
  const isPierTvRoute = currentPath === '/tv-pier' || currentPath.startsWith('/tv-pier');
  const isClientRoute = !isAdminRoute && !isFeedbackRoute && !isSimuladorRoute && !isSharedChecklistRoute && !isPierTvRoute && !isQuizRoute;

  // ═══════════ SIMULADO PUBLIC PAGE (/simulado) ═══════════
  if (isQuizRoute) {
    return (
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-[#186b77] border-t-transparent rounded-full animate-spin"></div></div>}>
        <SimuladoPage />
      </Suspense>
    );
  }

  // ═══════════ FEEDBACK PUBLIC PAGE (/feedback) ═══════════
  if (isFeedbackRoute) {
    return (
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}>
        <FeedbackForm />
      </Suspense>
    );
  }

  // ═══════════ SHARED CHECKLIST PAGE (/checklist/share/:id) ═══════════
  if (isSharedChecklistRoute) {
    const sharedChecklistId = currentPath.split('/checklist/share/')[1] || '';
    return (
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}>
        <SharedChecklistPage checklistId={sharedChecklistId} />
      </Suspense>
    );
  }

  // ═══════════ PORTAL DO CLIENTE (Módulo PWA) ═══════════
  if (isClientRoute) {
    if (!clientToken) {
      return (
        <ClientLoginPage 
          onLoginSuccess={(token) => {
            setClientToken(token);
            // fetchClientData runs automatically in useEffect when clientToken changes
          }} 
        />
      );
    }
    return (
      <Suspense fallback={
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
          <div className="w-10 h-10 border-4 border-[#186b77] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-medium animate-pulse">Carregando dados da sua embarcação...</span>
        </div>
      }>
        {clientData ? (
          <ClientDashboardPage
            client={clientData.client}
            boats={clientData.boats || []}
            reservations={clientData.reservations || []}
            transacoes={clientData.transacoes || []}
            chamados={clientData.chamados || []}
            onLogout={() => {
              localStorage.removeItem('client_token');
              localStorage.removeItem('client_data_cache');
              setClientToken(null);
              setClientData(null);
            }}
            onRefresh={() => fetchClientData(false)}
          />
        ) : (
          <div className="h-screen w-full flex items-center justify-center bg-slate-900"><div className="w-8 h-8 border-4 border-[#186b77] border-t-transparent rounded-full animate-spin"></div></div>
        )}
      </Suspense>
    );
  }

  // ═══════════ PAINEL ADMINISTRATIVO (/admin) ═══════════

  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLogin={(role, name, username) => {
          if (role) {
            setAdminRole(role);
            localStorage.setItem('admin_role', role);
            const roleStr = role.toLowerCase().trim();
            if (roleStr === 'financeiro' || roleStr.includes('financ')) {
              setActiveTab('finance-lancamentos');
            } else if (roleStr === 'pecas_servicos' || roleStr.includes('pecas') || roleStr.includes('servico')) {
              setActiveTab('manutencoes');
            } else if (roleStr === 'comercial' || roleStr.includes('comerc')) {
              setActiveTab('contratos');
            } else {
              setActiveTab('dashboard');
            }
          }
          if (name) {
            setAdminName(name);
            localStorage.setItem('admin_name', name);
          }
          if (username) { setAdminUsername(username); localStorage.setItem('admin_username', username); }
          setIsAuthenticated(true);
        }} 
      />
    );
  }

  if (isPierTvRoute) {
    return (
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-900"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}>
        <PierTvDisplay />
      </Suspense>
    );
  }

  if (isRoleLoading) {
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

  const normalizedRole = (adminRole || '').toLowerCase().trim();

  if (normalizedRole === 'marina_operador' || normalizedRole === 'marinheiro' || normalizedRole === 'marinheiro_operador' || normalizedRole === 'operador' || normalizedRole === 'operador_pier' || normalizedRole === 'pier') {
    return (
      <div className="admin-panel h-full w-full">
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}>
          <MarinaOperadorDashboard onLogout={handleLogout} operadorNome={adminName} />
        </Suspense>
      </div>
    );
  }

  if (normalizedRole === 'marina' || normalizedRole === 'marina_gerente' || normalizedRole === 'gerente') {
    return (
      <div className="admin-panel h-full w-full">
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}>
          <MarinaDashboard onLogout={handleLogout} operadorNome={adminName} />
        </Suspense>
      </div>
    );
  }

  if (adminRole === 'comercial') {
    return (
      <div className="admin-panel h-full w-full">
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}>
          <ComercialDashboard onLogout={handleLogout} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="admin-panel h-screen w-full flex bg-[#eaeff3] text-slate-900 font-sans overflow-hidden">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-[env(safe-area-inset-top)] left-0 right-0 h-14 bg-white border-b border-slate-100 z-50 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Logo className={`h-8 w-auto ${isPecasServicos ? 'text-[#B69D74]' : 'text-[#186b77]'}`} />
          {isPecasServicos ? (
            <span className="text-xs font-black text-slate-800 uppercase">Vale Administradora</span>
          ) : (
            <span className="text-xs font-bold text-[#186b77] bg-teal-50 px-2 py-0.5 rounded border border-teal-100 uppercase">Admin</span>
          )}
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        ${isSidebarOpen ? 'w-64' : 'w-20'}
        bg-white border-r border-slate-200/80 flex flex-col justify-between
        transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Logo & Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center space-x-3 overflow-hidden">
              <Logo className={`h-8 w-auto ${isPecasServicos ? 'text-[#B69D74]' : 'text-[#186b77]'}`} />
              {isPecasServicos && isSidebarOpen && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-black text-slate-800 leading-tight tracking-tight uppercase truncate">
                    Vale Administradora
                  </span>
                  <span className="text-[10px] font-bold text-[#B69D74] leading-none truncate">
                    Peças & Serviços
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            >
              {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
            {menuGroups.map((group, idx) => (
              <div key={idx} className="space-y-1">
                {isSidebarOpen && (
                  <div className="px-3 py-1 text-[10px] uppercase font-black tracking-wider text-slate-400">
                    {group.group}
                  </div>
                )}
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      title={!isSidebarOpen ? item.label : undefined}
                      className={`
                        w-full flex items-center px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer
                        ${isActive 
                          ? 'bg-[#186b77] text-white shadow-xs' 
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'}
                      `}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSidebarOpen ? 'mr-3' : 'mx-auto'} ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      {isSidebarOpen && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* User & Logout Footer */}
          <div className="p-3 border-t border-slate-100 shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 shrink-0 ${isSidebarOpen ? 'mr-3' : 'mx-auto'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {isSidebarOpen && <span>Sair</span>}
            </button>
          </div>

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
                {(activeTab === 'fuel' || activeTab === 'finance-fuel') && <AdminFuelWrapper />}
                {activeTab === 'reports' && <SchedulesReportPage />}
                {activeTab === 'clients' && <ClientPage />}
                {activeTab === 'boats' && <BoatPage />}
                {activeTab === 'contratos' && <ContractGeneratorPage />}
                {activeTab === 'sound' && <SoundControlsPage />}
                {activeTab === 'chamados' && <ChamadosPage onNavigateToOS={() => setActiveTab('manutencoes')} />}
                {activeTab === 'manutencoes' && <PecasKanbanPage />}
                {activeTab === 'pecas-horimetros' && <PecasHorimetrosPage />}
                {activeTab === 'pecas-acessorios' && <PecasAcessoriosPage />}
                {activeTab === 'pecas-whatsapp' && <PecasWhatsAppPage />}
                {activeTab === 'pecas-atividades' && <PecasAtividadesPage />}
                {activeTab === 'finance-dashboard' && <FinanceDashboardPage />}
                {activeTab === 'finance-fluxo' && <FinanceFluxoCaixa />}
                {activeTab === 'finance-recorrencia' && <FinanceParcelasFixas />}
                {activeTab === 'finance-cadastros' && <FinanceCadastroConfigs />}
                {activeTab === 'finance-relatorios' && <FinanceRelatorios />}
                {activeTab === 'finance-boletos' && <BoletosPage />}
                {activeTab === 'finance-whatsapp' && <FinanceWhatsAppPage />}
                {activeTab === 'users' && <UsersPage />}
                {activeTab === 'feedback' && <FeedbackAdmin />}
                {activeTab === 'integrations' && <IntegrationsPage />}
                {activeTab === 'portal-interno' && <PortalInterno />}
                {activeTab === 'aviso-saida' && <AvisosSaidaPage />}
                {activeTab === 'dp-dashboard' && <DPPage />}
                {activeTab === 'controle-folgas' && <ControleFolgasPage />}
                {activeTab === 'controle-epi' && <ControleEpiPage />}
                {activeTab === 'audit-logs' && <AuditLogsPage logs={registrosAtividadesDB.getAll() || []} boats={boatDB.getAll() || []} />}
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>

    </div>
  );
}
