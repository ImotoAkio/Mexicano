import React, { useState } from 'react';
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
import UserAvatarMenu from '../header/UserAvatarMenu';
import ComercialSidebar from './ComercialSidebar';
import AddWidgetDrawer from './AddWidgetDrawer';
import ComercialSettingsModal from './ComercialSettingsModal';
import {
  KpiRow,
  RevenueCard,
  TopPlansCard,
  ActiveDayCard,
  ConversionGaugeCard,
  AiAssistantCard,
} from './ComercialWidgets';
import ComercialClientesPage from './ComercialClientesPage';
import ComercialEmbarcacoesPage from './ComercialEmbarcacoesPage';
import ComercialContratosPage from './ComercialContratosPage';
import ComercialVendasPage from './ComercialVendasPage';

interface ComercialDashboardProps {
  onLogout?: () => void;
  operadorNome?: string;
}

export default function ComercialDashboard({ onLogout, operadorNome }: ComercialDashboardProps) {
  const [activeNav, setActiveNav] = useState<string>(() => {
    return localStorage.getItem('comercial_active_nav') || 'vendas';
  });
  const [widgetDrawerOpen, setWidgetDrawerOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const handleNavSelect = (id: string) => {
    if (id === 'config') {
      setSettingsModalOpen(true);
    } else {
      setActiveNav(id);
      localStorage.setItem('comercial_active_nav', id);
    }
  };

  // Estado da barra lateral retrátil (persistido em localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('comercial_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('comercial_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="h-screen w-full flex bg-mx-sand text-stone-900 font-sans overflow-hidden">
      {/* Sidebar — desktop */}
      <div className="hidden lg:block h-full">
        <ComercialSidebar
          active={activeNav}
          onSelect={handleNavSelect}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
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
            title={sidebarCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          >
            {sidebarCollapsed ? <SidebarExpand className="w-4 h-4" /> : <SidebarCollapse className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2 h-9 w-full max-w-[280px] px-3 rounded-lg bg-stone-50 border border-stone-200/80 text-stone-400">
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-[13px] truncate">Buscar cliente, contrato…</span>
            <kbd className="hidden sm:inline text-[10px] font-medium text-stone-400 border border-stone-200 bg-white rounded px-1.5 py-0.5">
              Ctrl K
            </kbd>
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer" title="Tema">
              <SunLight className="w-[18px] h-[18px]" />
            </button>
            <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer" title="Notificações">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-mx-red ring-2 ring-white" />
            </button>
            <div className="h-4.5 w-px bg-stone-200/80 mx-0.5" />
            <UserAvatarMenu
              userName={operadorNome}
              onLogout={onLogout}
              onOpenSettings={() => setSettingsModalOpen(true)}
              brand="mexicano"
              showDetailsOnDesktop={true}
            />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-4 lg:p-6 space-y-4">
            {activeNav === 'vendas' || activeNav === 'recebimentos' ? (
              <ComercialVendasPage />
            ) : activeNav === 'clientes' ? (
              <ComercialClientesPage />
            ) : activeNav === 'embarcacoes' ? (
              <ComercialEmbarcacoesPage />
            ) : activeNav === 'contratos' ? (
              <ComercialContratosPage />
            ) : activeNav === 'dashboard' ? (
              <>
                {/* Page header */}
                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <h1 className="text-[22px] font-semibold tracking-tight text-stone-900">Dashboard</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="h-9 px-3 rounded-lg bg-white border border-stone-200 flex items-center gap-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer">
                      <Calendar className="w-3.5 h-3.5 text-stone-500" />
                      <span className="tabular-nums">15 set 2026 – 14 out 2026</span>
                    </button>
                    <button className="h-9 px-3 rounded-lg bg-white border border-stone-200 flex items-center gap-1.5 text-[12px] font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer">
                      Últimos 30 dias
                      <NavArrowDown className="w-3.5 h-3.5 text-stone-400" />
                    </button>
                    <button
                      onClick={() => setWidgetDrawerOpen(true)}
                      className="h-9 px-3 rounded-lg bg-white border border-stone-200 flex items-center gap-1.5 text-[12px] font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                      <ViewGrid className="w-3.5 h-3.5 text-stone-500" />
                      Adicionar widget
                    </button>
                    <button className="h-9 px-3.5 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white flex items-center gap-1.5 text-[12px] font-semibold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-colors cursor-pointer">
                      <Download className="w-3.5 h-3.5" />
                      Exportar
                    </button>
                  </div>
                </div>

                <KpiRow />

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
                  <div className="space-y-4 min-w-0">
                    <RevenueCard />
                    <TopPlansCard />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4 content-start">
                    <ActiveDayCard />
                    <ConversionGaugeCard />
                    <div className="md:col-span-2 xl:col-span-1">
                      <AiAssistantCard />
                    </div>
                  </div>
                </div>
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

      <AddWidgetDrawer open={widgetDrawerOpen} onClose={() => setWidgetDrawerOpen(false)} />
      <ComercialSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
}
