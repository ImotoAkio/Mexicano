import React, { useState, useMemo, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  LayoutDashboard,
  Users,
  Ship,
  FileSignature,
  DollarSign,
  Wallet,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Target,
  X,
  ArrowRight,
  Kanban,
  Sparkles,
  Anchor
} from 'lucide-react';
import logoMexicano from '../../assets/images/logo_mexicano_trim.png';
import { clientDB, boatDB, onDbUpdate } from '../../db';
import { getBoatEstoqueResumo } from '../../utils/cotaUtils';
import { loadComercialSettings, ComercialSettings } from './ComercialSettingsModal';
import { VendaComercial, ConfigMotorComissoes } from '../../types';
import { DEFAULT_MOTOR_COMISSOES_CONFIG, calculateComissoesResumo, getCurrentMonthKey } from '../../utils/comissaoUtils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'crm', label: 'CRM & Funil', icon: Kanban },
  { id: 'ativos', label: 'Ativos & Cotas', icon: Anchor },
  { id: 'embarcacoes', label: 'Embarcações', icon: Ship },
  { id: 'vendas', label: 'Propostas & Vendas', icon: DollarSign },
  { id: 'catalogo', label: 'Catálogo & Captação', icon: Sparkles },
  { id: 'comissoes', label: 'Comissões', icon: Wallet },
  { id: 'clientes', label: 'Cotistas', icon: Users },
  { id: 'contratos', label: 'Contratos', icon: FileSignature },
];

interface ComercialSidebarProps {
  active: string;
  onSelect: (id: string) => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  operadorNome?: string;
}

export default function ComercialSidebar({
  active,
  onSelect,
  onClose,
  collapsed = false,
  onToggleCollapse,
  operadorNome,
}: ComercialSidebarProps) {
  const [metaSettings, setMetaSettings] = useState<ComercialSettings>(() => loadComercialSettings());

  // Vendas e Configuração de Comissões em Tempo Real
  const [vendas, setVendas] = useState<VendaComercial[]>([]);
  const [comissoesConfig, setComissoesConfig] = useState<ConfigMotorComissoes>(() => {
    try {
      const saved = localStorage.getItem('comercial_motor_comissoes_config');
      if (saved) return { ...DEFAULT_MOTOR_COMISSOES_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_MOTOR_COMISSOES_CONFIG;
  });

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchVendasAndConfig = async () => {
    try {
      const headers = getAuthHeader();
      const [vendasRes, cfgRes] = await Promise.all([
        fetch('/api/comercial/vendas', { credentials: 'include', headers }),
        fetch('/api/comercial/comissoes/config', { credentials: 'include', headers }),
      ]);

      if (vendasRes.ok) {
        const vData = await vendasRes.json();
        if (Array.isArray(vData.vendas)) {
          setVendas(vData.vendas);
        }
      }

      if (cfgRes.ok) {
        const cData = await cfgRes.json();
        if (cData.config) {
          setComissoesConfig(cData.config);
          localStorage.setItem('comercial_motor_comissoes_config', JSON.stringify(cData.config));
        }
      }
    } catch {
      // Falha silenciosa de sincronização em segundo plano
    }
  };

  useEffect(() => {
    fetchVendasAndConfig();

    const handleSettingsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setMetaSettings(customEvent.detail);
      }
    };

    const handleVendaUpdated = () => {
      fetchVendasAndConfig();
    };

    window.addEventListener('comercial-settings-updated', handleSettingsUpdate);
    window.addEventListener('comercial-venda-updated', handleVendaUpdated);
    window.addEventListener('comercial-comissoes-updated', handleVendaUpdated);
    window.addEventListener('db_updated', handleVendaUpdated);
    window.addEventListener('db_synced', handleVendaUpdated);

    // Conexão Socket.io para acompanhar vendas e comissões em tempo real instantâneo
    const socket = io('/', {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
    });

    socket.on('venda_created', handleVendaUpdated);
    socket.on('venda_cancelled', handleVendaUpdated);
    socket.on('venda_updated', handleVendaUpdated);
    socket.on('finance_update', handleVendaUpdated);

    const unsubDb = onDbUpdate(() => {
      fetchVendasAndConfig();
    });

    return () => {
      window.removeEventListener('comercial-settings-updated', handleSettingsUpdate);
      window.removeEventListener('comercial-venda-updated', handleVendaUpdated);
      window.removeEventListener('comercial-comissoes-updated', handleVendaUpdated);
      window.removeEventListener('db_updated', handleVendaUpdated);
      window.removeEventListener('db_synced', handleVendaUpdated);
      socket.disconnect();
      unsubDb();
    };
  }, []);

  // Resumo de comissões e faturamento em tempo real do mês atual
  const currentMonthKey = getCurrentMonthKey();
  const resumoComissoes = useMemo(() => {
    return calculateComissoesResumo(vendas, comissoesConfig, currentMonthKey);
  }, [vendas, comissoesConfig, currentMonthKey]);

  const vendedorLogado =
    operadorNome ||
    metaSettings.nome ||
    (typeof window !== 'undefined' ? localStorage.getItem('admin_name') : null) ||
    'Consultor Comercial';
  const metaIndividual = metaSettings.metaIndividualVendedor || 250000;
  const faturamentoAtual =
    resumoComissoes.faturamentoRealMes > 0
      ? resumoComissoes.faturamentoRealMes
      : (metaSettings.faturamentoAtual || 184500);

  const progressPercent = Math.min(100, Math.round((faturamentoAtual / metaIndividual) * 100));
  const totalCotasMes = resumoComissoes.totalCotasMes > 0 ? resumoComissoes.totalCotasMes : 5;
  const comissaoTotalVendedor = resumoComissoes.totalVariavelPorVendedor > 0 ? resumoComissoes.totalVariavelPorVendedor : 4250;

  const formatK = (val: number) => {
    if (metaSettings.ocultarValoresDashboard) return 'R$ ••••';
    const k = val / 1000;
    return `R$ ${k.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}K`;
  };

  const formatBRL = (val: number) => {
    if (metaSettings.ocultarValoresDashboard) return 'R$ ••••';
    return `R$ ${(Number(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const [pendingContractsCount, setPendingContractsCount] = useState(() => {
    try {
      return clientDB.getAll().filter(c => c.statusContrato === 'pendente').length;
    } catch {
      return 0;
    }
  });

  const [cotasMexicanoCount, setCotasMexicanoCount] = useState(() => {
    try {
      const boats = boatDB.getAll();
      const clients = clientDB.getAll();
      return boats.reduce((acc, b) => {
        const res = getBoatEstoqueResumo(b.id, clients, b);
        return acc + (res.cotasDisponiveisMexicano ?? res.cotasDisponiveis);
      }, 0);
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const updateCount = () => {
      try {
        setPendingContractsCount(clientDB.getAll().filter(c => c.statusContrato === 'pendente').length);
        const boats = boatDB.getAll();
        const clients = clientDB.getAll();
        const total = boats.reduce((acc, b) => {
          const res = getBoatEstoqueResumo(b.id, clients, b);
          return acc + (res.cotasDisponiveisMexicano ?? res.cotasDisponiveis);
        }, 0);
        setCotasMexicanoCount(total);
      } catch {
        setPendingContractsCount(0);
        setCotasMexicanoCount(0);
      }
    };
    updateCount();
    return onDbUpdate(updateCount);
  }, []);

  const renderItem = (item: NavItem) => {
    const isActive = active === item.id;
    const Icon = item.icon;
    const showPendingContracts =
      item.id === 'contratos' && pendingContractsCount > 0 && metaSettings.notificarContratosPendentes;
    const showComissoesBadge = item.id === 'comissoes' && totalCotasMes > 0;
    const showAtivosBadge = item.id === 'ativos' && cotasMexicanoCount > 0;

    let badgeText: string | undefined = undefined;
    let badgeType: 'contracts' | 'comissoes' | 'ativos' | 'default' = 'default';

    if (showPendingContracts) {
      badgeText = String(pendingContractsCount);
      badgeType = 'contracts';
    } else if (showComissoesBadge) {
      badgeText = `${totalCotasMes} ${totalCotasMes === 1 ? 'cota' : 'cotas'}`;
      badgeType = 'comissoes';
    } else if (showAtivosBadge) {
      badgeText = `${cotasMexicanoCount} ${cotasMexicanoCount === 1 ? 'cota' : 'cotas'}`;
      badgeType = 'ativos';
    } else if (item.badge) {
      badgeText = item.badge;
    }

    return (
      <button
        key={item.id}
        onClick={() => onSelect(item.id)}
        title={collapsed ? `${item.label}${badgeText ? ` (${badgeText})` : ''}` : undefined}
        className={`relative w-full flex items-center ${
          collapsed ? 'justify-center px-0 h-10' : 'gap-2.5 px-3 h-9'
        } rounded-lg text-[13px] transition-colors cursor-pointer ${
          isActive
            ? 'bg-mx-ink-100 text-mx-ink font-semibold'
            : 'text-stone-600 font-medium hover:bg-stone-100 hover:text-stone-900'
        }`}
      >
        {isActive && (
          <span
            className={`absolute ${
              collapsed ? '-left-2 top-2 bottom-2 w-[3px]' : '-left-3 top-1.5 bottom-1.5 w-[3px]'
            } rounded-r-full bg-mx-ink`}
          />
        )}
        <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
        {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
        {!collapsed && badgeText && (
          <span
            className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 tabular-nums ${
              badgeType === 'contracts'
                ? 'text-amber-700 bg-amber-100'
                : badgeType === 'comissoes'
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                : 'text-mx-green bg-mx-green-50'
            }`}
          >
            {badgeText}
          </span>
        )}
        {collapsed && badgeText && (
          <span
            className={`absolute top-2 right-3 w-2 h-2 rounded-full ring-2 ring-white ${
              badgeType === 'contracts'
                ? 'bg-amber-500'
                : badgeType === 'comissoes'
                ? 'bg-emerald-500'
                : 'bg-mx-green'
            }`}
          />
        )}
      </button>
    );
  };

  return (
    <aside
      className={`h-full shrink-0 bg-white border-r border-stone-200/80 flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-[236px]'
      }`}
    >
      {/* Brand & Toggle Header */}
      {!collapsed ? (
        <div className="h-20 px-3 flex items-center justify-between border-b border-stone-100/60 relative">
          {/* Espaçador para garantir centralização matemática da logo */}
          <div className="w-7 shrink-0" />
          <div className="flex-1 flex items-center justify-center">
            <img src={logoMexicano} alt="El Mexicano" className="h-12 w-auto select-none" draggable={false} />
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
              title="Recolher menu"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer lg:hidden shrink-0"
              title="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="h-20 flex flex-col items-center justify-center border-b border-stone-100/60 px-1 gap-1">
          <img src={logoMexicano} alt="El Mexicano" className="h-7 w-auto select-none" draggable={false} />
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Expandir menu"
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Navigation — Apenas os módulos ativos */}
      <nav className={`flex-1 overflow-y-auto hide-scrollbar ${collapsed ? 'px-2' : 'px-3'} pt-2 space-y-0.5`}>
        {NAV_ITEMS.map(renderItem)}

        <div className="my-2.5 h-px bg-stone-100" />

        {renderItem({ id: 'config', label: 'Configurações', icon: Settings })}
      </nav>

      {/* Card de Comissões & Metas — Minimalista no padrão Mexicano */}
      {!collapsed ? (
        <div className="shrink-0 p-3 pt-1">
          <div
            onClick={() => onSelect('comissoes')}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') onSelect('comissoes');
            }}
            className="group relative overflow-hidden rounded-xl bg-[#2B1120] p-3 text-white shadow-xs border border-[#3e1b30] hover:border-[#5a2747] transition-all cursor-pointer select-none"
          >
            {/* Efeito de brilho suave no hover */}
            <div className="pointer-events-none absolute -top-8 -right-8 w-20 h-20 rounded-full bg-white/[0.04] group-hover:bg-white/[0.08] transition-colors blur-lg" />

            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
                  <Target className="w-3.5 h-3.5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-white tracking-tight leading-none block truncate max-w-[105px]">
                    {vendedorLogado}
                  </span>
                  <span className="text-[9px] text-amber-300 font-medium">Comissão Individual</span>
                </div>
              </div>
              {totalCotasMes > 0 ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {totalCotasMes} {totalCotasMes === 1 ? 'cota' : 'cotas'}
                </span>
              ) : (
                <span className="text-[10px] font-medium text-stone-400 tabular-nums">
                  0 cotas
                </span>
              )}
            </div>

            {/* Valor individual e VGV */}
            <div className="my-1.5">
              <div className="flex items-baseline justify-between">
                <div className="text-base font-extrabold text-white tabular-nums tracking-tight">
                  {formatBRL(comissaoTotalVendedor)}
                </div>
                <span className="text-[9px] text-stone-400">comissão acumulada</span>
              </div>
              <div className="text-[10px] text-stone-300/90 leading-snug mt-1 tabular-nums flex items-center justify-between">
                <span>VGV: <strong className="text-white">{formatK(faturamentoAtual)}</strong></span>
                <span className="text-stone-300">Meta: <strong className="text-white">{formatK(metaIndividual)}</strong></span>
              </div>
            </div>

            {/* Barra de Progresso Minimalista */}
            <div className="mt-2.5 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-stone-400 tabular-nums">
                <span>Atingimento da Meta Individual</span>
                <span className="font-bold text-amber-300">{progressPercent}%</span>
              </div>
            </div>

            {/* Rodapé / Link discreto de ação */}
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-stone-300 group-hover:text-white transition-colors">
              <span className="font-medium">Abrir painel de comissões</span>
              <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      ) : (
        /* Versão compacta / ícone quando recolhida */
        <div className="shrink-0 p-3 pt-1 flex justify-center">
          <button
            type="button"
            onClick={() => onSelect('comissoes')}
            className="w-10 h-10 rounded-xl bg-[#2B1120] text-white flex items-center justify-center border border-[#3e1b30] shadow-xs hover:border-[#5a2747] hover:scale-105 transition-all cursor-pointer relative group"
            title={`Comissões: ${formatBRL(comissaoTotalVendedor)} (${totalCotasMes} cotas) • VGV: ${formatK(faturamentoAtual)} (${progressPercent}%)`}
          >
            <Target className="w-4 h-4 text-amber-300" />
            {totalCotasMes > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
