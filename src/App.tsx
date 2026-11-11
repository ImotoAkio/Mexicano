import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './components/Logo';
import { loadFromRemote } from './db';
import { io } from 'socket.io-client';
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
const FinanceLancamentos = lazy(() => import('./components/finance/FinanceLancamentos'));
const FinanceParcelasFixas = lazy(() => import('./components/finance/FinanceParcelasFixas'));
const FinanceCadastroConfigs = lazy(() => import('./components/finance/FinanceCadastroConfigs'));
const FinanceRelatorios = lazy(() => import('./components/finance/FinanceRelatorios'));
const FinanceGempMigrationPage = lazy(() => import('./components/finance/FinanceGempMigrationPage'));
const FinanceClientesPage = lazy(() => import('./components/finance/FinanceClientesPage'));
import LoginPage from './components/LoginPage';
import ClientLoginPage from './components/ClientLoginPage';
const ClientDashboardPage = lazy(() => import('./components/ClientDashboardPage'));
const MarinaDashboard = lazy(() => import('./components/MarinaDashboard'));
const MarinaOperadorDashboard = lazy(() => import('./components/MarinaOperadorDashboard'));
const ComercialDashboard = lazy(() => import('./components/comercial/ComercialDashboard'));
const FinanceiroDashboard = lazy(() => import('./components/finance/FinanceiroDashboard'));
const UsersPage = lazy(() => import('./components/UsersPage'));
const FeedbackForm = lazy(() => import('./components/FeedbackForm'));
const FeedbackAdmin = lazy(() => import('./components/FeedbackAdmin'));
const PecasServicosPage = lazy(() => import('./components/PecasServicosPage'));
const ChamadosPage = lazy(() => import('./components/ChamadosPage'));
const PierTvDisplay = lazy(() => import('./components/MarinaOperador/PierTvDisplay'));
const PecasHorimetrosPage = lazy(() => import('./components/pecas/PecasHorimetrosPage'));
const PecasAcessoriosPage = lazy(() => import('./components/pecas/PecasAcessoriosPage'));
const PecasWhatsAppPage = lazy(() => import('./components/pecas/PecasWhatsAppPage'));
const PecasAtividadesPage = lazy(() => import('./components/pecas/PecasAtividadesPage'));
const PortalInterno = lazy(() => import('./components/finance/PortalInterno'));
const AdminChecklistsPage = lazy(() => import('./components/AdminChecklistsPage'));
const AdminFuelPage = lazy(() => import('./components/MarinaFuelView'));
const WhatsAppPage = lazy(() => import('./components/WhatsAppPage'));
const NotificationsRobotPage = lazy(() => import('./components/NotificationsRobotPage'));
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
const UtvPage = lazy(() => import('./components/utv/UtvPage'));
const MarinaAgendamentosView = lazy(() => import('./components/MarinaAgendamentosView'));
const CatalogoPublicoPage = lazy(() => import('./components/comercial/CatalogoPublicoPage'));
const ValidarEmbarquePage = lazy(() => import('./components/ValidarEmbarquePage'));
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
  ChevronDown,
  Kanban,
  Database,
  Wallet,
  FileSearch,
  FileText,
  TrendingUp,
  ClipboardList,
  MessageSquare,
  CheckCircle,
  Wrench,
  Droplet, Droplets, Clock, CalendarClock, Upload, Trash2, Edit2, Play, Download, Printer, Receipt, History, Package, PieChart, CalendarDays,
  Truck, Calculator, Bot
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

  return <AdminFuelPage data={data} setData={setData} reloadData={loadData} operadorNome="Admin" isAdmin={true} />;
};

type TabType = 'finance-dashboard' | 'finance-fluxo' | 'finance-recorrencia' | 'finance-cadastros' | 'finance-relatorios' | 'finance-gemp' | 'finance-clientes' | 'dp-dashboard' | 'dashboard' | 'schedules' | 'marina-agendamentos' | 'reports' | 'clients' | 'boats' | 'contratos' | 'integrations' | 'sound' | 'finance-aprovacoes' | 'finance-lancamentos' | 'finance-fuel' | 'finance-atividades' | 'finance-cobranca' | 'finance-whatsapp' | 'finance-schedules' | 'finance-boletos' | 'users' | 'feedback' | 'manutencoes' | 'chamados' | 'portal-interno' | 'checklists' | 'fuel' | 'whatsapp' | 'aviso-saida' | 'controle-folgas' | 'controle-epi' | 'audit-logs' | 'pecas-whatsapp' | 'pecas-atividades' | 'pecas-horimetros' | 'pecas-acessorios' | 'utv-operacao' | 'utv-controle-anual' | 'utv-rateio' | 'notificacoes-robot' | 'comercial-hub' | 'marina-hub';

function persistClientSessionToken(token: string, reservaId?: string | null) {
  if (!token || token === 'null' || token === 'undefined') return;
  (window as any).__CLIENT_TOKEN__ = token;
  if (reservaId) {
    (window as any).__AUTO_CHECKIN_RESERVA_ID__ = reservaId;
  }
  const writeToStorage = () => {
    localStorage.setItem('client_token', token);
    localStorage.setItem('last_user_type', 'client');
    if (reservaId) {
      localStorage.setItem('auto_checkin_reserva_id', reservaId);
    }
  };
  try {
    writeToStorage();
  } catch {
    try {
      localStorage.removeItem('client_data_cache');
      localStorage.removeItem('marina_data_cache');
      writeToStorage();
    } catch {}
  }
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  
  // Client session: JWT-based with local cache for instant PWA loading
  const [clientToken, setClientToken] = useState<string | null>(() => {
    try {
      // Se estiver na rota curta de Magic Link (/m/:code), aguarda a resolução da API (/api/m/:code)
      // sem disparar requisições concorrentes com um token antigo do localStorage
      if (window.location.pathname.startsWith('/m/')) {
        return null;
      }
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = searchParams.get('token') || searchParams.get('auth_token');
      const urlReservaId = searchParams.get('reserva') || searchParams.get('reservaId');
      if (urlToken && urlToken !== 'null' && urlToken !== 'undefined') {
        const prevToken = localStorage.getItem('client_token');
        if (prevToken !== urlToken || urlReservaId) {
          try { localStorage.removeItem('client_data_cache'); } catch {}
        }
        persistClientSessionToken(urlToken, urlReservaId);
        return urlToken;
      }
    } catch (e) {
      console.warn("Erro ao ler token da URL na inicialização:", e);
    }
    try {
      const stored = localStorage.getItem('client_token');
      if (stored && stored !== 'null' && stored !== 'undefined') {
        (window as any).__CLIENT_TOKEN__ = stored;
        return stored;
      }
    } catch {}
    return (window as any).__CLIENT_TOKEN__ || null;
  });
  const [clientData, setClientData] = useState<{ client: any; boats: any[]; reservations: any[]; transacoes?: any[]; chamados?: any[]; manutencoes?: any[]; marinaDatasFechadas?: any[] } | null>(() => {
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
  const [adminName, setAdminName] = useState<string>(() => {
    return localStorage.getItem('admin_name') || localStorage.getItem('admin_username') || '';
  });
  const [adminUsername, setAdminUsername] = useState<string>(() => {
    return localStorage.getItem('admin_username') || '';
  });
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [isAdminDbLoaded, setIsAdminDbLoaded] = useState(false);
  const [dbData, setDbData] = useState<any>({});

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (localStorage.getItem(STORAGE_KEYS.ADMIN_ACTIVE_TAB) as TabType) || 'schedules';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Controle de grupos recolhiveis (accordions) na Sidebar do Admin
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_collapsed_groups');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups(prev => {
      const updated = { ...prev, [groupName]: !prev[groupName] };
      try {
        localStorage.setItem('admin_sidebar_collapsed_groups', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

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

  // Processamento de Magic Link de acesso direto do cliente via WhatsApp
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = searchParams.get('token') || searchParams.get('auth_token');
      const urlReservaId = searchParams.get('reserva') || searchParams.get('reservaId');

      if (urlToken && urlToken !== 'null' && urlToken !== 'undefined') {
        persistClientSessionToken(urlToken, urlReservaId);
        setClientToken(urlToken);
        // Limpa os parâmetros da URL mantendo a rota do portal
        window.history.replaceState(null, '', '/portal');
        setCurrentPath('/portal');
      }
    } catch (e) {
      console.warn("Erro ao processar magic link:", e);
    }
  }, []);

  // Processamento de Short Magic Link seguro (/m/:code)
  useEffect(() => {
    if (window.location.pathname.startsWith('/m/')) {
      const code = window.location.pathname.replace(/^\/m\//, '').replace(/\/+$/, '').trim();
      if (code) {
        fetch(`/api/m/${code}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.token) {
              try { localStorage.removeItem('client_data_cache'); } catch {}
              setClientData(null);
              persistClientSessionToken(data.token, data.reservaId);
              setClientToken(data.token);
              window.history.replaceState(null, '', '/portal');
              setCurrentPath('/portal');
            } else {
              window.history.replaceState(null, '', '/portal?expirado=1');
              setCurrentPath('/portal');
            }
          })
          .catch(() => {
            window.history.replaceState(null, '', '/portal');
            setCurrentPath('/portal');
          });
      }
    }
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
    if (isAuthenticated && currentPath.startsWith('/admin') && (!adminRole || !adminName) && !isRoleLoading) {
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
          localStorage.setItem('admin_name', data.nome || data.username || 'Operador');
          setAdminUsername(data.username || '');
          localStorage.setItem('admin_username', data.username || '');
          const roleStr = (data.role || '').toLowerCase().trim();
          if (roleStr === 'financeiro') {
            setActiveTab('finance-lancamentos');
          } else if (roleStr === 'pecas_servicos') {
            setActiveTab('manutencoes');
          } else if (roleStr === 'comercial') {
            setActiveTab('contratos');
          }
        } else {
          handleLogout();
        }
      })
      .catch(() => handleLogout())
      .finally(() => setIsRoleLoading(false));
    }
  }, [isAuthenticated, currentPath, adminRole, isRoleLoading]);

  // Load DB into memory
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && !isAdminDbLoaded) {
      loadFromRemote().then((data) => {
        if (isMounted) {
          setDbData(data);
          setIsAdminDbLoaded(true);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isAdminDbLoaded]);

  // Real-time synchronization for Admin/Marina/Peças/Financeiro dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('admin_token');
      const socket = io('/', { path: '/socket.io', auth: { token } });

      const handleGlobalAdminSync = () => {
        // Silently reload the DB into memory to update internal arrays
        // This will reflect in any page currently mounted since they do polling/intervals on the local memory arrays
        loadFromRemote().then((data) => {
          setDbData(data);
        });
      };

      socket.on('chamado_update', handleGlobalAdminSync);

      return () => {
        socket.disconnect();
      };
    }
  }, [isAuthenticated, currentPath]);

  const fetchClientData = async (showLoading = false, forceRefresh = false) => {
    const activeToken = clientToken || localStorage.getItem('client_token') || (window as any).__CLIENT_TOKEN__;
    if (!activeToken || activeToken === 'null' || activeToken === 'undefined') return;
    if (showLoading && !clientData) setClientLoading(true);
    try {
      const url = forceRefresh ? '/api/client/me?forceRefresh=true' : '/api/client/me';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.status === 401 || res.status === 403) {
        const currentStored = localStorage.getItem('client_token') || (window as any).__CLIENT_TOKEN__;
        if (!currentStored || currentStored === activeToken) {
          localStorage.removeItem('client_token');
          localStorage.removeItem('client_data_cache');
          delete (window as any).__CLIENT_TOKEN__;
          setClientToken(null);
          setClientData(null);
        }
      } else if (res.ok) {
        const data = await res.json();
        persistClientSessionToken(activeToken);
        setClientData(data);
        try {
          localStorage.setItem('client_data_cache', JSON.stringify(data));
        } catch {}
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do cliente:', e);
    } finally {
      if (showLoading) setClientLoading(false);
    }
  };

  useEffect(() => {
    if (clientToken) {
      persistClientSessionToken(clientToken);
      const hasAutoCheckin = !!(localStorage.getItem('auto_checkin_reserva_id') || (window as any).__AUTO_CHECKIN_RESERVA_ID__);
      fetchClientData(true, hasAutoCheckin);
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchClientData(false);
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [clientToken]);

  const effectiveRole = (adminRole || localStorage.getItem('admin_role') || '').toLowerCase().trim();
  const isAdmin = effectiveRole === 'admin';
  const isPecasServicos = effectiveRole === 'pecas_servicos';
  const isFinanceiro = effectiveRole === 'financeiro';
  const isComercial = effectiveRole === 'comercial';
  const isFullWidthPage = ['manutencoes', 'pecas-atividades', 'pecas-acessorios', 'pecas-horimetros', 'pecas-whatsapp', 'comercial-hub', 'marina-hub'].includes(activeTab);

  const menuGroups = [
    {
      group: 'Visão Geral & Reservas',
      items: [
        { id: 'dashboard' as TabType, label: 'Painel Geral', icon: Compass },
        { id: 'schedules' as TabType, label: 'Agendamentos Cotas', icon: CalendarIcon },
        { id: 'marina-agendamentos' as TabType, label: 'Agendamentos Marina', icon: Anchor },
      ]
    },
    {
      group: 'Marina & Operação',
      items: [
        { id: 'marina-hub' as TabType, label: 'Painel da Marina (Fila)', icon: Anchor },
        { id: 'checklists' as TabType, label: 'Checklists Diários', icon: ClipboardList },
        { id: 'aviso-saida' as TabType, label: 'Planos de Navegação', icon: Printer },
        { id: 'fuel' as TabType, label: 'Abastecimento', icon: Droplets },
      ]
    },
    {
      group: 'Comercial & Cotistas',
      items: [
        { id: 'comercial-hub' as TabType, label: 'Hub Comercial (CRM & Vendas)', icon: Kanban },
        { id: 'clients' as TabType, label: 'Cadastro de Clientes', icon: Users },
        { id: 'boats' as TabType, label: 'Cadastro de Embarcações', icon: Ship },
        { id: 'contratos' as TabType, label: 'Gerador de Contratos', icon: FileText },
        { id: 'reports' as TabType, label: 'Relatórios & Histórico', icon: FileSearch },
      ]
    },
    {
      group: 'Manutenção & Peças',
      items: [
        { id: 'manutencoes' as TabType, label: 'Painel de Manutenções', icon: Wrench },
        { id: 'chamados' as TabType, label: 'Chamados', icon: ClipboardList },
        { id: 'pecas-horimetros' as TabType, label: 'Controle de Horímetros', icon: Clock },
        { id: 'pecas-atividades' as TabType, label: 'Quadro de Atividades', icon: ClipboardList },
        { id: 'pecas-acessorios' as TabType, label: 'Checklist de Acessórios', icon: Package },
        { id: 'pecas-whatsapp' as TabType, label: 'WhatsApp Peças', icon: MessageSquare },
      ]
    },
    {
      group: 'Financeiro',
      items: [
        { id: 'finance-dashboard' as TabType, label: 'Visão Geral (Dashboard)', icon: PieChart },
        { id: 'finance-lancamentos' as TabType, label: 'Lançamentos (Pagar/Receber)', icon: FileText },
        { id: 'finance-fluxo' as TabType, label: 'Fluxo de Caixa', icon: Wallet },
        { id: 'finance-recorrencia' as TabType, label: 'Gestão de Parcelas', icon: CalendarClock },
        { id: 'finance-boletos' as TabType, label: 'Envio de Boletos', icon: Receipt },
        { id: 'finance-clientes' as TabType, label: 'Clientes & Cotistas', icon: Users },
        { id: 'finance-relatorios' as TabType, label: 'Relatórios & DRE', icon: FileSearch },
        { id: 'finance-cadastros' as TabType, label: 'Cadastros Financeiros', icon: Settings },
        { id: 'finance-gemp' as TabType, label: 'Migração ERP GEMP', icon: Database },
        { id: 'finance-whatsapp' as TabType, label: 'WhatsApp Cobrança', icon: MessageSquare },
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
      group: 'UTV Trilha (Off-Road)',
      items: [
        { id: 'utv-operacao' as TabType, label: 'Módulo UTV Trilha', icon: Truck },
      ]
    },
    {
      group: 'Administração & Sistema',
      items: [
        { id: 'users' as TabType, label: 'Gestão de Usuários', icon: Shield },
        { id: 'whatsapp' as TabType, label: 'Central de WhatsApp', icon: MessageSquare },
        { id: 'notificacoes-robot' as TabType, label: 'Robô de Notificações', icon: Bot },
        { id: 'integrations' as TabType, label: 'Configurações & Integrações', icon: Settings },
        { id: 'audit-logs' as TabType, label: 'Registro de Atividades', icon: History },
        { id: 'portal-interno' as TabType, label: 'Portal Interno', icon: MessageSquare },
        { id: 'feedback' as TabType, label: 'Central de Feedback', icon: MessageSquare },
      ]
    }
  ].map(group => ({
    ...group,
    items: group.items.filter(item => {
      // Regra estrita: O módulo UTV é exclusivo para o administrador
      if (item.id.startsWith('utv-') && !isAdmin) {
        return false;
      }
      if (isFinanceiro) {
        return ['finance-dashboard', 'finance-lancamentos', 'finance-fluxo', 'finance-recorrencia', 'finance-cadastros', 'finance-relatorios', 'finance-gemp', 'finance-fuel', 'finance-boletos', 'finance-clientes', 'finance-whatsapp', 'manutencoes', 'portal-interno', 'finance-schedules', 'clients', 'boats'].includes(item.id);
      } else if (isPecasServicos) {
        return ['manutencoes', 'chamados', 'pecas-horimetros', 'pecas-acessorios', 'pecas-whatsapp', 'pecas-atividades', 'checklists', 'finance-schedules', 'boats', 'clients'].includes(item.id);
      } else if (isComercial) {
        return ['contratos', 'clients', 'boats', 'schedules', 'aviso-saida', 'portal-interno'].includes(item.id);
      }
      return true;
    })
  })).filter(group => group.items.length > 0);

  // Garante que o grupo da tab ativa nunca fique colapsado/escondido
  useEffect(() => {
    const activeGroup = menuGroups.find(g => g.items.some(i => i.id === activeTab));
    if (activeGroup && collapsedGroups[activeGroup.group]) {
      setCollapsedGroups(prev => {
        const next = { ...prev, [activeGroup.group]: false };
        try {
          localStorage.setItem('admin_sidebar_collapsed_groups', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isAdmin && ['utv-operacao', 'utv-controle-anual', 'utv-rateio'].includes(activeTab)) {
      setActiveTab('schedules');
    } else if (isFinanceiro && !['finance-dashboard', 'finance-lancamentos', 'finance-fluxo', 'finance-recorrencia', 'finance-cadastros', 'finance-relatorios', 'finance-gemp', 'finance-fuel', 'finance-boletos', 'finance-whatsapp', 'manutencoes', 'portal-interno', 'finance-schedules', 'clients', 'boats'].includes(activeTab)) {
      setActiveTab('finance-dashboard');
    } else if (isPecasServicos && !['manutencoes', 'chamados', 'pecas-horimetros', 'pecas-acessorios', 'pecas-whatsapp', 'pecas-atividades', 'checklists', 'finance-schedules', 'boats', 'clients'].includes(activeTab)) {
      setActiveTab('manutencoes');
    } else if (isComercial && !['contratos', 'clients', 'boats', 'schedules', 'aviso-saida', 'portal-interno'].includes(activeTab)) {
      setActiveTab('contratos');
    }
  }, [effectiveRole, activeTab, isAdmin]);

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
    localStorage.removeItem('marina_active_tab');
    localStorage.removeItem('marina_data_cache');
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
    const clientExpiredHandler = () => {
      localStorage.removeItem('client_token');
      localStorage.removeItem('client_data_cache');
      delete (window as any).__CLIENT_TOKEN__;
      setClientToken(null);
      setClientData(null);
    };
    window.addEventListener('auth-expired', handler);
    window.addEventListener('client-auth-expired', clientExpiredHandler);
    return () => {
      window.removeEventListener('auth-expired', handler);
      window.removeEventListener('client-auth-expired', clientExpiredHandler);
    };
  }, []);

  const isFeedbackRoute = currentPath === '/feedback' || currentPath.startsWith('/feedback');
  const isQuizRoute = currentPath === '/simulado' || currentPath.startsWith('/simulado/');
  const isAdminRoute = currentPath.startsWith('/admin');
  const isSimuladorRoute = currentPath === '/simulador-epi';
  const isSharedChecklistRoute = currentPath.startsWith('/checklist/share/');
  const isPierTvRoute = currentPath === '/tv-pier' || currentPath.startsWith('/tv-pier');
  const isCatalogoRoute = currentPath === '/catalogo' || currentPath.startsWith('/catalogo');
  const isValidarEmbarqueRoute = currentPath === '/validar-embarque' || currentPath.startsWith('/validar-embarque') || currentPath.startsWith('/validar-ticket');
  const isClientRoute = !isAdminRoute && !isCatalogoRoute && !isFeedbackRoute && !isSimuladorRoute && !isSharedChecklistRoute && !isPierTvRoute && !isQuizRoute && !isValidarEmbarqueRoute;

  // ═══════════ VALIDADOR DE EMBARQUE PÚBLICO (/validar-embarque) ═══════════
  if (isValidarEmbarqueRoute) {
    return (
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-[#07080c]"><div className="w-8 h-8 border-4 border-[#B69D74] border-t-transparent rounded-full animate-spin"></div></div>}>
        <ValidarEmbarquePage />
      </Suspense>
    );
  }

  // ═══════════ CATÁLOGO DIGITAL PÚBLICO (/catalogo) ═══════════
  if (isCatalogoRoute) {
    return (
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-[#F8F7F4]"><div className="w-8 h-8 border-4 border-[#2D0A16] border-t-transparent rounded-full animate-spin"></div></div>}>
        <CatalogoPublicoPage />
      </Suspense>
    );
  }

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

  // ═══════════ RESOLUÇÃO DO SHORT MAGIC LINK (/m/:code) ═══════════
  if (currentPath.startsWith('/m/')) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
        <div className="w-10 h-10 border-4 border-[#186b77] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-slate-300 font-medium animate-pulse">Acessando embarcação com link seguro...</span>
      </div>
    );
  }

  // ═══════════ PORTAL DO CLIENTE (Módulo PWA) ═══════════
  if (isClientRoute) {
    return (
      <AnimatePresence mode="wait">
        {!clientToken ? (
          <motion.div
            key="client-login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full min-h-screen"
          >
            <ClientLoginPage 
              onLoginSuccess={(token) => {
                persistClientSessionToken(token);
                setClientToken(token);
                // fetchClientData runs automatically in useEffect when clientToken changes
              }} 
            />
          </motion.div>
        ) : (
          <motion.div
            key="client-dashboard"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full min-h-screen"
          >
            <Suspense fallback={
              <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
                <div className="w-10 h-10 border-4 border-[#186b77] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-slate-400 font-medium animate-pulse">Carregando dados da sua embarcação...</span>
              </div>
            }>
              {clientData ? (
                <ClientDashboardPage
                  client={clientData.client}
                  clientToken={clientToken}
                  boats={clientData.boats || []}
                  reservations={clientData.reservations || []}
                  transacoes={clientData.transacoes || []}
                  chamados={clientData.chamados || []}
                  manutencoes={clientData.manutencoes || []}
                  marinaDatasFechadas={clientData.marinaDatasFechadas || []}
                  onLogout={() => {
                    localStorage.removeItem('client_token');
                    localStorage.removeItem('client_data_cache');
                    delete (window as any).__CLIENT_TOKEN__;
                    setClientToken(null);
                    setClientData(null);
                  }}
                  onRefresh={(force) => fetchClientData(false, force)}
                />
              ) : (
                <div className="h-screen w-full flex items-center justify-center bg-slate-900"><div className="w-8 h-8 border-4 border-[#186b77] border-t-transparent rounded-full animate-spin"></div></div>
              )}
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
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
            if (roleStr === 'financeiro') {
              setActiveTab('finance-lancamentos');
            } else if (roleStr === 'pecas_servicos') {
              setActiveTab('manutencoes');
            } else if (roleStr === 'comercial') {
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

  if (normalizedRole === 'marina_operador') {
    return (
      <div className="admin-panel h-full w-full">
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}>
          <MarinaOperadorDashboard onLogout={handleLogout} operadorNome={adminName} />
        </Suspense>
      </div>
    );
  }

  if (normalizedRole === 'marina_gerente') {
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
          <ComercialDashboard onLogout={handleLogout} operadorNome={adminName} />
        </Suspense>
      </div>
    );
  }

  if (normalizedRole === 'financeiro') {
    return (
      <div className="admin-panel h-full w-full">
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-[#f6f3f0]"><div className="w-8 h-8 border-4 border-[#2b1120] border-t-transparent rounded-full animate-spin"></div></div>}>
          <FinanceiroDashboard onLogout={handleLogout} operadorNome={adminName} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="admin-panel h-screen w-full flex bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-[env(safe-area-inset-top)] left-0 right-0 h-14 bg-white border-b border-slate-100 z-50 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Logo className={`h-8 w-auto ${isPecasServicos ? 'text-[#B69D74]' : isFinanceiro ? 'text-brand-500' : 'text-[#186b77]'}`} />
          {isPecasServicos ? (
            <span className="text-xs font-black text-slate-800 uppercase">Vale Administradora</span>
          ) : isFinanceiro ? (
            <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 uppercase">Financeiro</span>
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
              <Logo className={`h-8 w-auto ${isPecasServicos ? 'text-[#B69D74]' : isFinanceiro ? 'text-brand-500' : 'text-[#186b77]'}`} />
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
              {isFinanceiro && isSidebarOpen && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-black text-slate-800 leading-tight tracking-tight uppercase truncate">
                    Painel Financeiro
                  </span>
                  <span className="text-[10px] font-bold text-brand-600 leading-none truncate">
                    Gestão Integrada
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
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {menuGroups.map((group, idx) => {
              const isCollapsed = Boolean(collapsedGroups[group.group]);
              const hasActiveItem = group.items.some(i => i.id === activeTab);

              return (
                <div key={idx} className="space-y-1">
                  {isSidebarOpen ? (
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(group.group)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider text-slate-400 hover:text-slate-700 hover:bg-slate-100/70 transition-all cursor-pointer select-none group"
                      title={isCollapsed ? `Expandir ${group.group}` : `Recolher ${group.group}`}
                    >
                      <span className="truncate flex items-center gap-1.5">
                        {group.group}
                        {hasActiveItem && isCollapsed && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#186b77]" />
                        )}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                    </button>
                  ) : (
                    <div className="my-2 border-t border-slate-100" />
                  )}

                  {(!isCollapsed || !isSidebarOpen) && (
                    <div className="space-y-1">
                      {group.items.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            title={!isSidebarOpen ? item.label : undefined}
                            className={`
                              w-full flex items-center px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
                              ${isActive 
                                ? (isFinanceiro || activeTab.startsWith('finance-') ? 'bg-brand-500 text-white shadow-xs' : 'bg-[#186b77] text-white shadow-xs') 
                                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'}
                            `}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isSidebarOpen ? 'mr-3' : 'mx-auto'} ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            {isSidebarOpen && <span className="truncate">{item.label}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
        <div className={`flex-1 w-full relative ${isFullWidthPage ? 'h-full overflow-hidden' : 'overflow-y-auto subtle-scrollbar'}`}>
          <div className={isFullWidthPage ? 'w-full h-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full pb-24'}>
            <ErrorBoundary>
              <Suspense fallback={<div className="h-full w-full min-h-[400px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>}>
                {activeTab === 'dashboard' && adminRole !== 'financeiro' && adminRole !== 'pecas_servicos' && <Dashboard onNavigate={handleTabChange} />}
                {activeTab === 'schedules' && <SchedulesPage />}
                {activeTab === 'marina-agendamentos' && <MarinaAgendamentosView />}
                {activeTab === 'finance-schedules' && <FinanceSchedulesPage />}
                {activeTab === 'whatsapp' && <WhatsAppPage />}
                {activeTab === 'notificacoes-robot' && <NotificationsRobotPage />}
                {activeTab === 'checklists' && <AdminChecklistsWrapper />}
                {(activeTab === 'fuel' || activeTab === 'finance-fuel') && <AdminFuelWrapper />}
                {activeTab === 'reports' && <SchedulesReportPage />}
                {activeTab === 'clients' && <ClientPage />}
                {activeTab === 'boats' && <BoatPage />}
                {activeTab === 'contratos' && <ContractGeneratorPage />}
                {activeTab === 'sound' && <SoundControlsPage />}
                {activeTab === 'chamados' && <ChamadosPage onNavigateToOS={() => setActiveTab('manutencoes')} />}
                {activeTab === 'manutencoes' && <PecasServicosPage />}
                {activeTab === 'pecas-horimetros' && <PecasHorimetrosPage />}
                {activeTab === 'pecas-acessorios' && <PecasAcessoriosPage />}
                {activeTab === 'pecas-whatsapp' && <PecasWhatsAppPage />}
                {activeTab === 'pecas-atividades' && <PecasAtividadesPage />}
                {activeTab === 'finance-dashboard' && <FinanceDashboardPage />}
                {activeTab === 'finance-lancamentos' && <FinanceLancamentos />}
                {activeTab === 'finance-fluxo' && <FinanceFluxoCaixa />}
                {activeTab === 'finance-recorrencia' && <FinanceParcelasFixas />}
                {activeTab === 'finance-cadastros' && <FinanceCadastroConfigs />}
                {activeTab === 'finance-gemp' && <FinanceGempMigrationPage />}
                {activeTab === 'finance-relatorios' && <FinanceRelatorios />}
                {activeTab === 'finance-boletos' && <BoletosPage />}
                {activeTab === 'finance-clientes' && <FinanceClientesPage />}
                {activeTab === 'finance-whatsapp' && <FinanceWhatsAppPage />}
                {activeTab === 'users' && <UsersPage />}
                {activeTab === 'feedback' && <FeedbackAdmin />}
                {activeTab === 'integrations' && <IntegrationsPage onNavigate={handleTabChange} />}
                {activeTab === 'portal-interno' && <PortalInterno />}
                {activeTab === 'aviso-saida' && <AvisosSaidaPage />}
                {activeTab === 'dp-dashboard' && <DPPage />}
                {activeTab === 'controle-folgas' && <ControleFolgasPage />}
                {activeTab === 'controle-epi' && <ControleEpiPage />}
                {activeTab === 'audit-logs' && <AuditLogsPage logs={registrosAtividadesDB.getAll() || []} boats={boatDB.getAll() || []} />}
                {activeTab === 'utv-operacao' && isAdmin && <UtvPage initialTab="operacao" />}
                {activeTab === 'utv-controle-anual' && isAdmin && <UtvPage initialTab="controle-anual" />}
                {activeTab === 'utv-rateio' && isAdmin && <UtvPage initialTab="rateio" />}
                {activeTab === 'comercial-hub' && <ComercialDashboard onLogout={handleLogout} operadorNome={adminName} />}
                {activeTab === 'marina-hub' && <MarinaDashboard onLogout={handleLogout} operadorNome={adminName} />}
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>

    </div>
  );
}
