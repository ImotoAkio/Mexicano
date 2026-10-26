import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  SunLight,
  Bell,
  Calendar,
  NavArrowDown,
  ViewGrid,
  Download,
  Menu,
  SidebarCollapse,
  SidebarExpand,
} from 'iconoir-react';
import {
  Eye,
  EyeOff,
  FileSignature,
  UserPlus,
  Clock,
  CheckCheck,
  Volume2,
  Settings as SettingsIcon,
  Users,
  Ship,
  ArrowRight,
  X,
  Command,
  LayoutDashboard,
  DollarSign,
} from 'lucide-react';
import UserAvatarMenu from '../header/UserAvatarMenu';
import ComercialSidebar from './ComercialSidebar';
import AddWidgetDrawer from './AddWidgetDrawer';
import ComercialSettingsModal, {
  useComercialSettings,
  loadComercialSettings,
  playNotificationBeep,
} from './ComercialSettingsModal';
import {
  KpiRow,
  RevenueCard,
  TopPlansCard,
  ActiveDayCard,
  ConversionGaugeCard,
  AiAssistantCard,
  SellerCommissionFloatingWidget,
} from './ComercialWidgets';
import ComercialClientesPage from './ComercialClientesPage';
import ComercialAtivosPage from './ComercialAtivosPage';
import ComercialEmbarcacoesPage from './ComercialEmbarcacoesPage';
import ComercialContratosPage from './ComercialContratosPage';
import ComercialVendasPage from './ComercialVendasPage';
import ComercialVendaDrawer from './ComercialVendaDrawer';
import ComercialComissoesPage from './ComercialComissoesPage';
import ComercialCrmPage from './ComercialCrmPage';
import ComercialPropostaDrawer from './ComercialPropostaDrawer';
import ComercialCatalogoModal from './ComercialCatalogoModal';
import ComercialCatalogoGestaoPage from './ComercialCatalogoGestaoPage';
import CatalogoPublicoPage from './CatalogoPublicoPage';
import ComercialSeaTrialModal from './ComercialSeaTrialModal';
import ClientProfileModal from '../ClientProfileModal';
import ComercialContratoViewerModal from './ComercialContratoViewerModal';
import { clientDB, boatDB, onDbUpdate } from '../../db';
import { Cliente, Embarcacao, VendaComercial, LeadComercial } from '../../types';

interface ComercialDashboardProps {
  onLogout?: () => void;
  operadorNome?: string;
}

type SettingsTab = 'perfil' | 'metas' | 'notificacoes' | 'interface' | 'atalhos' | 'regras';

export default function ComercialDashboard({ onLogout, operadorNome }: ComercialDashboardProps) {
  const [settings, updateSettings] = useComercialSettings();

  const [activeNav, setActiveNav] = useState<string>(() => {
    return localStorage.getItem('comercial_active_nav') || 'dashboard';
  });
  const [widgetDrawerOpen, setWidgetDrawerOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<SettingsTab>('perfil');

  // Busca rápida (Ctrl + K)
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [quickSearchIndex, setQuickSearchIndex] = useState(0);
  const quickSearchInputRef = useRef<HTMLInputElement>(null);

  // Modais rápidos acionados pela Busca Rápida (Ctrl + K)
  const [quickProfileClient, setQuickProfileClient] = useState<Cliente | null>(null);
  const [quickContractClient, setQuickContractClient] = useState<Cliente | null>(null);

  // Modais do Fluxo Comercial (Propostas, Test Drive, Catálogo, Vendas)
  const [propostaDrawerOpen, setPropostaDrawerOpen] = useState(false);
  const [propostaLead, setPropostaLead] = useState<LeadComercial | null>(null);
  const [propostaBoatId, setPropostaBoatId] = useState<string | null>(null);
  const [propostaCota, setPropostaCota] = useState<string | null>(null);

  const [vendaDrawerOpen, setVendaDrawerOpen] = useState(false);
  const [vendaBoatId, setVendaBoatId] = useState<string | null>(null);
  const [vendaClientId, setVendaClientId] = useState<string | null>(null);

  const [seaTrialModalOpen, setSeaTrialModalOpen] = useState(false);
  const [seaTrialLead, setSeaTrialLead] = useState<LeadComercial | null>(null);
  const [seaTrialBoatId, setSeaTrialBoatId] = useState<string | null>(null);

  const [catalogoModalOpen, setCatalogoModalOpen] = useState(false);

  // Central de Notificações
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('comercial_read_notifs') || '[]');
    } catch {
      return [];
    }
  });
  const notifRef = useRef<HTMLDivElement>(null);

  // Toast de feedback de atalho / configuração
  const [shortcutToast, setShortcutToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setShortcutToast(msg);
  };

  useEffect(() => {
    if (!shortcutToast) return;
    const t = setTimeout(() => setShortcutToast(null), 2200);
    return () => clearTimeout(t);
  }, [shortcutToast]);

  // Dados locais para Busca Rápida (Ctrl+K) e Notificações
  const [allClients, setAllClients] = useState<Cliente[]>(() => clientDB.getAll());
  const [allBoats, setAllBoats] = useState<Embarcacao[]>(() => boatDB.getAll());
  const [allVendas, setAllVendas] = useState<VendaComercial[]>([]);

  // Filtro de período do Dashboard
  type PeriodFilterType = '30d' | 'mes_atual' | 'mes_anterior' | 'trimestre' | 'ano';
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>('30d');
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  const periodOptions: Record<PeriodFilterType, { label: string; range: string }> = {
    '30d': { label: 'Últimos 30 dias', range: '23 set 2026 – 22 out 2026' },
    'mes_atual': { label: 'Este Mês (Outubro 2026)', range: '01 out 2026 – 31 out 2026' },
    'mes_anterior': { label: 'Mês Anterior (Setembro 2026)', range: '01 set 2026 – 30 set 2026' },
    'trimestre': { label: 'Último Trimestre', range: '01 ago 2026 – 31 out 2026' },
    'ano': { label: 'Ano de 2026', range: '01 jan 2026 – 31 dez 2026' },
  };

  const currentPeriod = periodOptions[periodFilter];

  const fetchDashboardVendas = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/comercial/vendas', { credentials: 'include', headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.vendas)) {
          setAllVendas(data.vendas);
        }
      }
    } catch {}
  };

  useEffect(() => {
    const syncLocal = () => {
      setAllClients([...clientDB.getAll()]);
      setAllBoats([...boatDB.getAll()]);
      fetchDashboardVendas();
    };
    syncLocal();
    fetchDashboardVendas();
    window.addEventListener('comercial-venda-updated', fetchDashboardVendas);
    const unsub = onDbUpdate(syncLocal);
    return () => {
      unsub();
      window.removeEventListener('comercial-venda-updated', fetchDashboardVendas);
    };
  }, []);

  const openSettingsOnTab = (tab: SettingsTab = 'perfil') => {
    setSettingsModalTab(tab);
    setSettingsModalOpen(true);
  };

  const handleNavSelect = (id: string) => {
    if (id === 'config') {
      openSettingsOnTab('perfil');
    } else if (id.startsWith('config:')) {
      const tab = id.split(':')[1] as SettingsTab;
      openSettingsOnTab(tab || 'metas');
    } else if (id === 'search') {
      setQuickSearchOpen(true);
    } else {
      setActiveNav(id);
      localStorage.setItem('comercial_active_nav', id);
    }
  };

  // Estado da barra lateral retrátil sincronizado com ComercialSettings.sidebarColapsadaPadrao
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const savedSettings = loadComercialSettings();
    const rawCollapsed = localStorage.getItem('comercial_sidebar_collapsed');
    if (rawCollapsed !== null) {
      return rawCollapsed === 'true';
    }
    return Boolean(savedSettings.sidebarColapsadaPadrao);
  });

  useEffect(() => {
    const handleSettingsUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail && typeof custom.detail.sidebarColapsadaPadrao === 'boolean') {
        setSidebarCollapsed(custom.detail.sidebarColapsadaPadrao);
      }
    };
    window.addEventListener('comercial-settings-updated', handleSettingsUpdated);
    return () => window.removeEventListener('comercial-settings-updated', handleSettingsUpdated);
  }, []);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('comercial_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Fechar popover de notificações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lista dinâmica de notificações baseada nas preferências do modal
  const notifications = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'contrato' | 'proposta' | 'lead';
      title: string;
      desc: string;
      time: string;
      targetNav: string;
      client?: Cliente;
    }> = [];

    if (settings.notificarContratosPendentes) {
      const pendingClients = allClients.filter(c => c.statusContrato === 'pendente');
      if (pendingClients.length > 0) {
        list.push({
          id: `contratos-pendentes-${pendingClients.length}`,
          type: 'contrato',
          title: `${pendingClients.length} ${pendingClients.length === 1 ? 'contrato pendente' : 'contratos pendentes'} de assinatura`,
          desc: `Cotistas aguardando formalização: ${pendingClients
            .slice(0, 2)
            .map(c => c.nome.split(' ')[0])
            .join(', ')}${pendingClients.length > 2 ? ` e +${pendingClients.length - 2}` : ''}`,
          time: 'Agora',
          targetNav: 'contratos',
        });
      } else {
        list.push({
          id: 'contratos-revisao',
          type: 'contrato',
          title: 'Contratos aguardando conferência',
          desc: 'Verifique minutas de aquisição e administração emitidas nesta semana',
          time: 'Hoje',
          targetNav: 'contratos',
        });
      }
    }

    if (settings.notificarPropostasSemResposta) {
      list.push({
        id: 'propostas-48h',
        type: 'proposta',
        title: '3 propostas sem retorno há mais de 48h',
        desc: 'Follow-up recomendado para negociações de cotas em aberto',
        time: 'Há 2h',
        targetNav: 'vendas',
      });
    }

    if (settings.notificarNovosLeads) {
      list.push({
        id: 'novos-leads-webhook',
        type: 'lead',
        title: 'Novos leads capturados na campanha',
        desc: 'Oportunidades aguardando primeiro contato comercial via WhatsApp',
        time: 'Hoje',
        targetNav: 'clientes',
      });
    }

    return list;
  }, [
    settings.notificarContratosPendentes,
    settings.notificarPropostasSemResposta,
    settings.notificarNovosLeads,
    allClients,
  ]);

  const unreadNotifications = useMemo(
    () => notifications.filter(n => !readNotifIds.includes(n.id)),
    [notifications, readNotifIds]
  );

  const markAllNotificationsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifIds(allIds);
    localStorage.setItem('comercial_read_notifs', JSON.stringify(allIds));
  };

  const handleNotificationClick = (notif: (typeof notifications)[0]) => {
    const nextRead = Array.from(new Set([...readNotifIds, notif.id]));
    setReadNotifIds(nextRead);
    localStorage.setItem('comercial_read_notifs', JSON.stringify(nextRead));
    setNotificationsOpen(false);
    handleNavSelect(notif.targetNav);
  };

  // Atalhos globais do teclado (Ctrl+K, Esc, Alt+D, Alt+C, Alt+E, Alt+T, Alt+V)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K ou Cmd + K -> Busca Rápida de Cotistas
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickSearchOpen(prev => !prev);
        setQuickSearchQuery('');
        setQuickSearchIndex(0);
        return;
      }

      // Esc -> Fechar modais/drawers abertos
      if (e.key === 'Escape') {
        if (quickSearchOpen) {
          setQuickSearchOpen(false);
          return;
        }
        if (notificationsOpen) {
          setNotificationsOpen(false);
          return;
        }
        if (widgetDrawerOpen) {
          setWidgetDrawerOpen(false);
          return;
        }
        if (mobileNavOpen) {
          setMobileNavOpen(false);
          return;
        }
      }

      // Ignorar atalhos Alt se o foco estiver num input/textarea/select editável (exceto se Alt estiver pressionado)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'd') {
          e.preventDefault();
          handleNavSelect('dashboard');
          showToast('Atalho Alt + D → Dashboard');
        } else if (key === 'c') {
          e.preventDefault();
          handleNavSelect('clientes');
          showToast('Atalho Alt + C → Clientes');
        } else if (key === 'a') {
          e.preventDefault();
          handleNavSelect('ativos');
          showToast('Atalho Alt + A → Ativos & Cotas');
        } else if (key === 'e') {
          e.preventDefault();
          handleNavSelect('embarcacoes');
          showToast('Atalho Alt + E → Embarcações');
        } else if (key === 't') {
          e.preventDefault();
          handleNavSelect('contratos');
          showToast('Atalho Alt + T → Contratos');
        } else if (key === 'v') {
          e.preventDefault();
          handleNavSelect('vendas');
          showToast('Atalho Alt + V → Vendas');
        } else if (key === 'm') {
          e.preventDefault();
          handleNavSelect('comissoes');
          showToast('Atalho Alt + M → Comissões & Bônus');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSearchOpen, notificationsOpen, widgetDrawerOpen, mobileNavOpen]);

  // Focar input ao abrir Ctrl + K
  useEffect(() => {
    if (quickSearchOpen) {
      setTimeout(() => quickSearchInputRef.current?.focus(), 40);
    }
  }, [quickSearchOpen]);

  // Resultados da Busca Rápida (Ctrl + K)
  const quickSearchResults = useMemo(() => {
    const q = quickSearchQuery.toLowerCase().trim();

    const matchedClients = allClients
      .filter(c => {
        if (!q) return true;
        return (
          c.nome?.toLowerCase().includes(q) ||
          c.cpf?.toLowerCase().includes(q) ||
          c.telefone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.cota?.toLowerCase().includes(q)
        );
      })
      .slice(0, q ? 6 : 4);

    const matchedBoats = allBoats
      .filter(b => {
        if (!q) return false;
        return (
          b.nome?.toLowerCase().includes(q) ||
          b.modelo?.toLowerCase().includes(q) ||
          b.fabricante?.toLowerCase().includes(q) ||
          b.vaga?.toLowerCase().includes(q)
        );
      })
      .slice(0, 3);

    const navActions = [
      { id: 'nav-dashboard', label: 'Ir para Dashboard', shortcut: 'Alt + D', nav: 'dashboard' },
      { id: 'nav-ativos', label: 'Ir para Ativos & Cotas (Estoque Mexicano)', shortcut: 'Alt + A', nav: 'ativos' },
      { id: 'nav-embarcacoes', label: 'Ir para Frota de Embarcações (Gestão)', shortcut: 'Alt + E', nav: 'embarcacoes' },
      { id: 'nav-vendas', label: 'Ir para Lançamento de Vendas', shortcut: 'Alt + V', nav: 'vendas' },
      { id: 'nav-comissoes', label: 'Ir para Motor de Comissões & Bonificações', shortcut: 'Alt + M', nav: 'comissoes' },
      { id: 'nav-clientes', label: 'Ir para Cadastro de Clientes', shortcut: 'Alt + C', nav: 'clientes' },
      { id: 'nav-contratos', label: 'Ir para Contratos & Documentos', shortcut: 'Alt + T', nav: 'contratos' },
      { id: 'nav-config', label: 'Abrir Configurações do Sistema', shortcut: '', nav: 'config' },
    ].filter(a => !q || a.label.toLowerCase().includes(q));

    return { matchedClients, matchedBoats, navActions };
  }, [quickSearchQuery, allClients, allBoats]);

  const boatsMap = useMemo(() => {
    const m = new Map<string, Embarcacao>();
    allBoats.forEach(b => m.set(b.id, b));
    return m;
  }, [allBoats]);

  return (
    <div
      data-density={settings.densidadeTabelas}
      className="h-screen w-full flex bg-mx-sand text-stone-900 font-sans overflow-hidden"
    >
      {/* Sidebar — desktop */}
      <div className="hidden lg:block h-full">
        <ComercialSidebar
          active={activeNav}
          onSelect={handleNavSelect}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          operadorNome={operadorNome}
        />
      </div>

      {/* Sidebar — mobile drawer */}
      <div className={`lg:hidden fixed inset-0 z-50 ${mobileNavOpen ? '' : 'pointer-events-none'}`}>
        <div
          onClick={() => setMobileNavOpen(false)}
          className={`absolute inset-0 bg-stone-900/30 transition-opacity ${mobileNavOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className={`absolute inset-y-0 left-0 transition-transform duration-300 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <ComercialSidebar
            active={activeNav}
            onSelect={id => {
              handleNavSelect(id);
              setMobileNavOpen(false);
            }}
            onClose={() => setMobileNavOpen(false)}
            operadorNome={operadorNome}
          />
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-16 shrink-0 bg-white border-b border-stone-200/80 flex items-center gap-3 px-4 lg:px-6">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 cursor-pointer"
            title="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Botão de recolher/expandir sidebar no desktop */}
          <button
            onClick={handleToggleSidebar}
            className="hidden lg:flex w-9 h-9 rounded-lg items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {sidebarCollapsed ? <SidebarExpand className="w-4 h-4" /> : <SidebarCollapse className="w-4 h-4" />}
          </button>

          {/* Gatilho da Busca Rápida (Ctrl + K) */}
          <button
            type="button"
            onClick={() => {
              setQuickSearchOpen(true);
              setQuickSearchQuery('');
            }}
            className="flex items-center gap-2 h-9 w-full max-w-[300px] px-3 rounded-lg bg-stone-50 hover:bg-stone-100/80 border border-stone-200/80 hover:border-stone-300 text-stone-400 hover:text-stone-600 transition-all cursor-pointer text-left"
            title="Busca rápida de cotistas, embarcações e contratos (Ctrl + K)"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-[13px] truncate">Buscar cliente, contrato…</span>
            <kbd className="hidden sm:inline text-[10px] font-medium text-stone-400 border border-stone-200 bg-white rounded px-1.5 py-0.5">
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            {/* Botão rápido de Privacidade (Ocultar valores monetários no Dashboard) */}
            <button
              type="button"
              onClick={() => {
                const next = !settings.ocultarValoresDashboard;
                updateSettings({ ocultarValoresDashboard: next });
                showToast(next ? 'Valores monetários ocultados' : 'Valores monetários visíveis');
              }}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                settings.ocultarValoresDashboard
                  ? 'bg-stone-900 text-white hover:bg-stone-800'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
              title={
                settings.ocultarValoresDashboard
                  ? 'Mostrar valores monetários (Modo privacidade ativo)'
                  : 'Ocultar valores monetários no Dashboard'
              }
            >
              {settings.ocultarValoresDashboard ? (
                <EyeOff className="w-[17px] h-[17px]" />
              ) : (
                <Eye className="w-[17px] h-[17px]" />
              )}
            </button>

            {/* Botão de Densidade / Interface */}
            <button
              type="button"
              onClick={() => openSettingsOnTab('interface')}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Interface & Visualização"
            >
              <SunLight className="w-[18px] h-[18px]" />
            </button>

            {/* Central de Notificações Comercial */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  const nextOpen = !notificationsOpen;
                  setNotificationsOpen(nextOpen);
                  if (nextOpen && unreadNotifications.length > 0 && settings.somNotificacoes) {
                    playNotificationBeep(true);
                  }
                }}
                className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  notificationsOpen
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                }`}
                title="Notificações Comerciais"
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-mx-red ring-2 ring-white" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_18px_40px_-10px_rgba(0,0,0,0.14)] border border-stone-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-stone-900">Notificações Comerciais</h4>
                        {unreadNotifications.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-mx-red text-white">
                            {unreadNotifications.length}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        Alertas ativos conforme suas preferências
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {settings.somNotificacoes && (
                        <button
                          type="button"
                          onClick={() => playNotificationBeep(true)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Testar bipe de notificação"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {unreadNotifications.length > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Marcar todas como lidas"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          openSettingsOnTab('notificacoes');
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                        title="Configurar alertas"
                      >
                        <SettingsIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <p className="text-xs font-semibold text-stone-700">Alertas desativados</p>
                        <p className="text-[11px] text-stone-400">
                          Você desativou os alertas de leads, propostas e contratos nas configurações.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false);
                            openSettingsOnTab('notificacoes');
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Gerenciar notificações
                        </button>
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const isUnread = !readNotifIds.includes(notif.id);
                        const Icon =
                          notif.type === 'contrato'
                            ? FileSignature
                            : notif.type === 'proposta'
                            ? Clock
                            : UserPlus;
                        return (
                          <button
                            key={notif.id}
                            type="button"
                            onClick={() => handleNotificationClick(notif)}
                            className={`w-full p-3.5 text-left flex items-start gap-3 hover:bg-stone-50 transition-colors cursor-pointer ${
                              isUnread ? 'bg-amber-50/20' : ''
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                notif.type === 'contrato'
                                  ? 'bg-amber-100 text-amber-700'
                                  : notif.type === 'proposta'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-stone-900 truncate">
                                  {notif.title}
                                </span>
                                <span className="text-[10px] text-stone-400 shrink-0">{notif.time}</span>
                              </div>
                              <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                                {notif.desc}
                              </p>
                            </div>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-mx-red shrink-0 mt-2" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="px-4 py-2.5 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between text-[11px]">
                    <span className="text-stone-400">
                      Som: <strong className="text-stone-600">{settings.somNotificacoes ? 'Ativo' : 'Mudo'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        openSettingsOnTab('notificacoes');
                      }}
                      className="font-semibold text-stone-700 hover:text-stone-950 cursor-pointer"
                    >
                      Preferências de alerta →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-4.5 w-px bg-stone-200/80 mx-0.5" />
            <UserAvatarMenu
              userName={operadorNome}
              onLogout={onLogout}
              onOpenSettings={tab => openSettingsOnTab(tab || 'perfil')}
              brand="mexicano"
              showDetailsOnDesktop={true}
            />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-4 lg:p-6 space-y-4">
            {activeNav === 'crm' ? (
              <ComercialCrmPage
                operadorNome={operadorNome}
                onOpenProposta={(lead, boatId) => {
                  setPropostaLead(lead || null);
                  setPropostaBoatId(boatId || null);
                  setPropostaDrawerOpen(true);
                }}
                onOpenTestDrive={(lead, boatId) => {
                  setSeaTrialLead(lead || null);
                  setSeaTrialBoatId(boatId || null);
                  setSeaTrialModalOpen(true);
                }}
                onOpenSeaTrial={(lead, boatId) => {
                  setSeaTrialLead(lead || null);
                  setSeaTrialBoatId(boatId || null);
                  setSeaTrialModalOpen(true);
                }}
              />
            ) : activeNav === 'ativos' ? (
              <ComercialAtivosPage
                onOpenProposta={(lead, boatId, cota) => {
                  setPropostaLead(lead || null);
                  setPropostaBoatId(boatId || null);
                  setPropostaCota(cota || null);
                  setPropostaDrawerOpen(true);
                }}
                onOpenVenda={(boatId, cota, clienteId) => {
                  setVendaBoatId(boatId || null);
                  setVendaClientId(clienteId || null);
                  setVendaDrawerOpen(true);
                }}
                onOpenTestDrive={(lead, boatId) => {
                  setSeaTrialLead(lead || null);
                  setSeaTrialBoatId(boatId || null);
                  setSeaTrialModalOpen(true);
                }}
                onOpenSeaTrial={(lead, boatId) => {
                  setSeaTrialLead(lead || null);
                  setSeaTrialBoatId(boatId || null);
                  setSeaTrialModalOpen(true);
                }}
                onOpenCatalogo={() => setActiveNav('catalogo')}
                onNavigateToEmbarcacoes={() => setActiveNav('embarcacoes')}
              />
            ) : activeNav === 'vendas' || activeNav === 'recebimentos' ? (
              <ComercialVendasPage />
            ) : activeNav === 'catalogo' ? (
              <ComercialCatalogoGestaoPage
                operadorNome={operadorNome}
                onOpenProposta={(lead, boatId, cota) => {
                  setPropostaLead(lead || null);
                  setPropostaBoatId(boatId || null);
                  setPropostaCota(cota || null);
                  setPropostaDrawerOpen(true);
                }}
                onOpenSeaTrial={(lead, boatId) => {
                  setSeaTrialLead(lead || null);
                  setSeaTrialBoatId(boatId || null);
                  setSeaTrialModalOpen(true);
                }}
                onOpenVenda={(boatId, cota, clienteId) => {
                  setVendaBoatId(boatId || null);
                  setVendaClientId(clienteId || null);
                  setVendaDrawerOpen(true);
                }}
                onNavigateToEmbarcacoes={() => setActiveNav('embarcacoes')}
              />
            ) : activeNav === 'comissoes' ? (
              <ComercialComissoesPage />
            ) : activeNav === 'clientes' ? (
              <ComercialClientesPage />
            ) : activeNav === 'embarcacoes' ? (
              <ComercialEmbarcacoesPage
                onOpenProposta={(lead, boatId, cota) => {
                  setPropostaLead(lead || null);
                  setPropostaBoatId(boatId || null);
                  setPropostaCota(cota || null);
                  setPropostaDrawerOpen(true);
                }}
                onOpenVenda={(boatId, cota, clienteId) => {
                  setVendaBoatId(boatId || null);
                  setVendaClientId(clienteId || null);
                  setVendaDrawerOpen(true);
                }}
                onOpenSeaTrial={(lead, boatId) => {
                  setSeaTrialLead(lead || null);
                  setSeaTrialBoatId(boatId || null);
                  setSeaTrialModalOpen(true);
                }}
              />
            ) : activeNav === 'contratos' ? (
              <ComercialContratosPage />
            ) : activeNav === 'dashboard' ? (
              <>
                {/* Page header com Seletor Interativo de Período */}
                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <div>
                    <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
                      Dashboard Comercial
                    </h1>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Visão geral de performance, metas financeiras e estoque de cotas em tempo real
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="h-9 px-3 rounded-xl bg-white border border-stone-200 flex items-center gap-2 text-[12px] font-medium text-stone-700 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-stone-500" />
                      <span className="tabular-nums font-semibold">{currentPeriod.range}</span>
                    </div>

                    {/* Dropdown de Período */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
                        className="h-9 px-3 rounded-xl bg-white border border-stone-200 flex items-center gap-1.5 text-[12px] font-semibold text-stone-800 hover:bg-stone-50 transition-colors cursor-pointer shadow-2xs"
                      >
                        {currentPeriod.label}
                        <NavArrowDown className="w-3.5 h-3.5 text-stone-400" />
                      </button>

                      {periodDropdownOpen && (
                        <div className="absolute right-0 mt-1.5 w-56 rounded-2xl bg-white border border-stone-200 shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                          {(Object.keys(periodOptions) as PeriodFilterType[]).map(key => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setPeriodFilter(key);
                                setPeriodDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-stone-50 transition-colors cursor-pointer ${
                                periodFilter === key ? 'font-bold text-[#2B1120] bg-stone-100/60' : 'text-stone-700'
                              }`}
                            >
                              <span>{periodOptions[key].label}</span>
                              {periodFilter === key && <span className="w-1.5 h-1.5 rounded-full bg-[#2B1120]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setWidgetDrawerOpen(true)}
                      className="h-9 px-3 rounded-xl bg-white border border-stone-200 flex items-center gap-1.5 text-[12px] font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer shadow-2xs"
                    >
                      <ViewGrid className="w-3.5 h-3.5 text-stone-500" />
                      Adicionar widget
                    </button>
                    <button
                      onClick={() => openSettingsOnTab('metas')}
                      className="h-9 px-3.5 rounded-xl bg-[#2B1120] hover:bg-[#3e1b30] text-white flex items-center gap-1.5 text-[12px] font-bold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Metas & Exportar
                    </button>
                  </div>
                </div>

                {/* 1. KPIs de Topo com Comparativo e Barra de Meta */}
                <KpiRow periodLabel={currentPeriod.label} vendas={allVendas} />

                {/* 2. Grid Central: Gráfico de Receita & VGV, Estoque de Cotas e Ranking de Embarcações */}
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
                  <div className="space-y-4 min-w-0">
                    <RevenueCard vendas={allVendas} operadorNome={operadorNome} />
                    <TopPlansCard vendas={allVendas} onSelectBoat={() => setActiveNav('embarcacoes')} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4 content-start">
                    <ActiveDayCard />
                    <ConversionGaugeCard />
                    <div className="md:col-span-2 xl:col-span-1">
                      <AiAssistantCard />
                    </div>
                  </div>
                </div>

                {/* 3. Widget Flutuante / Fixo de Comissão do Vendedor */}
                <SellerCommissionFloatingWidget
                  operadorNome={operadorNome}
                  vendas={allVendas}
                  onOpenComissoes={() => handleNavSelect('comissoes')}
                />
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center max-w-lg mx-auto mt-12 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-mx-ink-100 text-mx-ink mx-auto flex items-center justify-center font-bold mb-4">
                  MX
                </div>
                <h3 className="text-lg font-semibold text-stone-900 capitalize">
                  Módulo de {activeNav}
                </h3>
                <p className="text-sm text-stone-500 mt-2">
                  Esta seção do painel comercial está sendo preparada. Você pode acessar o Dashboard ou o Cadastro de Clientes.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveNav('dashboard')}
                    className="h-9 px-4 rounded-lg bg-white border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    Ir para Dashboard
                  </button>
                  <button
                    onClick={() => setActiveNav('clientes')}
                    className="h-9 px-4 rounded-lg bg-mx-ink text-white text-xs font-semibold hover:bg-mx-ink-700 transition-colors cursor-pointer shadow-xs"
                  >
                    Ver Clientes
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal de Busca Rápida (Ctrl + K) */}
      {quickSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setQuickSearchOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-100">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                ref={quickSearchInputRef}
                type="text"
                value={quickSearchQuery}
                onChange={e => {
                  setQuickSearchQuery(e.target.value);
                  setQuickSearchIndex(0);
                }}
                placeholder="Buscar cotista por nome, CPF, embarcação ou navegar pelo sistema..."
                className="flex-1 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-hidden bg-transparent"
              />
              {quickSearchQuery && (
                <button
                  type="button"
                  onClick={() => setQuickSearchQuery('')}
                  className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="text-[10px] font-mono text-stone-400 border border-stone-200 rounded px-1.5 py-0.5 bg-stone-50">
                Esc
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3">
              {/* Clientes / Cotistas */}
              {quickSearchResults.matchedClients.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Cotistas & Clientes ({quickSearchResults.matchedClients.length})
                  </div>
                  <div className="space-y-0.5">
                    {quickSearchResults.matchedClients.map(client => {
                      const boatId = client.embarcacoes?.[0]?.embarcacaoId || client.embarcacaoId;
                      const boat = boatId ? boatsMap.get(boatId) : null;
                      return (
                        <div
                          key={client.id}
                          className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-stone-100/80 transition-colors group"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setQuickSearchOpen(false);
                              setQuickProfileClient(client);
                            }}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-full bg-mx-ink-100 text-mx-ink font-bold text-[10px] flex items-center justify-center shrink-0">
                              {client.nome ? client.nome.slice(0, 2).toUpperCase() : 'CL'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-stone-900 truncate">{client.nome}</p>
                              <p className="text-[10px] text-stone-400 truncate">
                                {boat ? `${boat.nome} (${client.cota || 'Cota'})` : client.cpf || client.telefone || 'Cliente'}
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setQuickSearchOpen(false);
                                setQuickContractClient(client);
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold text-stone-600 hover:text-stone-900 hover:bg-white border border-transparent hover:border-stone-200 transition-all cursor-pointer"
                            >
                              Contrato
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickSearchOpen(false);
                                setQuickProfileClient(client);
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-all cursor-pointer"
                            >
                              Ficha
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Embarcações */}
              {quickSearchResults.matchedBoats.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Embarcações ({quickSearchResults.matchedBoats.length})
                  </div>
                  <div className="space-y-0.5">
                    {quickSearchResults.matchedBoats.map(boat => (
                      <button
                        key={boat.id}
                        type="button"
                        onClick={() => {
                          setQuickSearchOpen(false);
                          handleNavSelect('embarcacoes');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-stone-100/80 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
                            <Ship className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-stone-900">{boat.nome}</p>
                            <p className="text-[10px] text-stone-400">
                              {boat.modelo || boat.tipo} {boat.vaga ? `• Vaga ${boat.vaga}` : ''}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Navegação Rápida & Atalhos */}
              {quickSearchResults.navActions.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Navegação & Atalhos do Sistema
                  </div>
                  <div className="space-y-0.5">
                    {quickSearchResults.navActions.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setQuickSearchOpen(false);
                          handleNavSelect(item.nav);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-stone-100/80 transition-colors cursor-pointer text-left"
                      >
                        <span className="text-xs font-medium text-stone-700">{item.label}</span>
                        {item.shortcut && (
                          <kbd className="text-[10px] font-mono font-semibold text-stone-500 bg-stone-50 border border-stone-200 rounded px-1.5 py-0.5">
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
              <span>Dica: use <strong className="text-stone-600">Alt + D/V/C/E/T</strong> para navegar</span>
              <button
                type="button"
                onClick={() => {
                  setQuickSearchOpen(false);
                  openSettingsOnTab('atalhos');
                }}
                className="text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
              >
                Ver todos os atalhos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ficha Rápida acionado pelo Ctrl + K */}
      {quickProfileClient && (
        <ClientProfileModal
          client={quickProfileClient}
          boats={allBoats}
          onClose={() => setQuickProfileClient(null)}
        />
      )}

      {/* Modal de Contrato Rápido acionado pelo Ctrl + K */}
      {quickContractClient && (
        <ComercialContratoViewerModal
          isOpen={!!quickContractClient}
          onClose={() => setQuickContractClient(null)}
          cliente={quickContractClient}
          embarcacao={
            boatsMap.get(
              quickContractClient.embarcacoes?.[0]?.embarcacaoId || quickContractClient.embarcacaoId
            ) || null
          }
        />
      )}

      {/* Toast de feedback visual de atalhos e preferências */}
      {shortcutToast && (
        <div className="fixed bottom-5 right-5 z-50 px-3.5 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold shadow-lg border border-stone-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {shortcutToast}
        </div>
      )}

      <AddWidgetDrawer open={widgetDrawerOpen} onClose={() => setWidgetDrawerOpen(false)} />
      <ComercialSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        initialTab={settingsModalTab}
        onNavigateShortcut={target => {
          if (target === 'search') {
            setQuickSearchOpen(true);
          } else {
            handleNavSelect(target);
          }
        }}
      />

      {/* Drawer de Proposta Comercial */}
      <ComercialPropostaDrawer
        isOpen={propostaDrawerOpen}
        onClose={() => {
          setPropostaDrawerOpen(false);
          setPropostaCota(null);
        }}
        initialLead={propostaLead}
        initialBoatId={propostaBoatId}
        initialCota={propostaCota}
      />

      {/* Drawer de Venda Direta de Cota */}
      <ComercialVendaDrawer
        open={vendaDrawerOpen}
        onClose={() => {
          setVendaDrawerOpen(false);
          setVendaBoatId(null);
          setVendaClientId(null);
        }}
        preselectedBoatId={vendaBoatId}
        preselectedClientId={vendaClientId}
        onSuccess={() => {
          setVendaDrawerOpen(false);
          fetchDashboardVendas();
        }}
      />

      {/* Modal de Test Drive e Check-in */}
      <ComercialSeaTrialModal
        isOpen={seaTrialModalOpen}
        onClose={() => setSeaTrialModalOpen(false)}
        initialLead={seaTrialLead}
        initialBoatId={seaTrialBoatId}
        providedBoats={allBoats}
        onSuccess={() => setSeaTrialModalOpen(false)}
      />

      {/* Modal de Catálogo Digital e Captação */}
      <ComercialCatalogoModal
        isOpen={catalogoModalOpen}
        onClose={() => setCatalogoModalOpen(false)}
        vendedorNome={operadorNome}
      />
    </div>
  );
}
