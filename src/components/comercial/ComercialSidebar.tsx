import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  FileText,
  Users,
  Ship,
  FileSignature,
  DollarSign,
  Wallet,
  ChevronDown,
  BarChart3,
  Megaphone,
  Settings,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Target,
  X,
} from 'lucide-react';
import logoMexicano from '../../assets/images/logo_mexicano_trim.png';
import { clientDB, onDbUpdate } from '../../db';
import { loadComercialSettings, ComercialSettings } from './ComercialSettingsModal';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const MAIN_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'vendas', label: 'Vendas', icon: DollarSign },
  { id: 'leads', label: 'Leads', icon: UserPlus, badge: '46' },
  { id: 'propostas', label: 'Propostas', icon: FileText },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'embarcacoes', label: 'Embarcações', icon: Ship },
  { id: 'contratos', label: 'Contratos', icon: FileSignature },
];

const FINANCE_CHILDREN = [
  { id: 'comissoes', label: 'Comissões' },
  { id: 'recebimentos', label: 'Recebimentos' },
  { id: 'relatorios', label: 'Relatórios' },
];

const SECONDARY_NAV: NavItem[] = [
  { id: 'analises', label: 'Análises', icon: BarChart3 },
  { id: 'campanhas', label: 'Campanhas', icon: Megaphone },
];

interface ComercialSidebarProps {
  active: string;
  onSelect: (id: string) => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function ComercialSidebar({
  active,
  onSelect,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: ComercialSidebarProps) {
  const [financeOpen, setFinanceOpen] = useState(true);
  const [metaSettings, setMetaSettings] = useState<ComercialSettings>(() => loadComercialSettings());

  useEffect(() => {
    const handleSettingsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setMetaSettings(customEvent.detail);
      }
    };
    window.addEventListener('comercial-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('comercial-settings-updated', handleSettingsUpdate);
  }, []);

  const metaTarget = metaSettings.metaMensalFaturamento || 600000;
  const faturamentoAtual = metaSettings.faturamentoAtual || 486200;
  const progressPercent = Math.min(100, Math.round((faturamentoAtual / metaTarget) * 100));

  const formatK = (val: number) => {
    const k = val / 1000;
    return `R$ ${k.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}K`;
  };

  const [pendingContractsCount, setPendingContractsCount] = useState(() => {
    try {
      return clientDB.getAll().filter(c => c.statusContrato === 'pendente').length;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const updateCount = () => {
      try {
        setPendingContractsCount(clientDB.getAll().filter(c => c.statusContrato === 'pendente').length);
      } catch {
        setPendingContractsCount(0);
      }
    };
    updateCount();
    return onDbUpdate(updateCount);
  }, []);

  const renderItem = (item: NavItem) => {
    const isActive = active === item.id;
    const Icon = item.icon;
    const badgeText = item.id === 'contratos' && pendingContractsCount > 0 ? String(pendingContractsCount) : item.badge;
    const isPendingContractsBadge = item.id === 'contratos' && pendingContractsCount > 0;

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
          <span className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 tabular-nums ${
            isPendingContractsBadge
              ? 'text-amber-700 bg-amber-100'
              : 'text-mx-green bg-mx-green-50'
          }`}>
            {badgeText}
          </span>
        )}
        {collapsed && badgeText && (
          <span className={`absolute top-2 right-3 w-2 h-2 rounded-full ring-2 ring-white ${
            isPendingContractsBadge ? 'bg-amber-500' : 'bg-mx-green'
          }`} />
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

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto hide-scrollbar ${collapsed ? 'px-2' : 'px-3'} pt-2 space-y-0.5`}>
        {MAIN_NAV.map(renderItem)}

        <div className="my-2.5 h-px bg-stone-100" />

        {/* Grupo Finanças */}
        {!collapsed ? (
          <>
            <button
              onClick={() => setFinanceOpen(v => !v)}
              className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
            >
              <Wallet className="w-4 h-4" strokeWidth={1.75} />
              <span className="flex-1 text-left">Finanças</span>
              <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${financeOpen ? '' : '-rotate-90'}`} />
            </button>
            {financeOpen && (
              <div className="pl-[38px] space-y-0.5 pb-1">
                {FINANCE_CHILDREN.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c.id)}
                    className={`w-full text-left h-8 px-2 rounded-md text-[13px] transition-colors cursor-pointer ${
                      active === c.id ? 'text-mx-ink font-semibold' : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => onSelect('comissoes')}
            title="Finanças (Comissões, Recebimentos, Relatórios)"
            className={`w-full flex items-center justify-center h-10 rounded-lg text-[13px] transition-colors cursor-pointer ${
              ['comissoes', 'recebimentos', 'relatorios'].includes(active)
                ? 'bg-mx-ink-100 text-mx-ink font-semibold'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <Wallet className="w-4 h-4" strokeWidth={1.75} />
          </button>
        )}

        {SECONDARY_NAV.map(renderItem)}

        <div className="my-2.5 h-px bg-stone-100" />

        {renderItem({ id: 'config', label: 'Configurações', icon: Settings })}
        {renderItem({ id: 'ajuda', label: 'Ajuda e suporte', icon: HelpCircle })}
      </nav>

      {/* Card de Meta — Fixo na base da sidebar */}
      {!collapsed ? (
        <div className="shrink-0 p-3 pt-1">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#2152ff] via-[#1a3ec9] to-[#0d1e66] p-4 text-white shadow-lg">
            {/* Micro-dot pattern da imagem de referência */}
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.45) 1px, transparent 1px)',
                backgroundSize: '8px 8px',
              }}
            />

            <div className="relative">
              {/* Ícone squircle branco com sombra */}
              <div className="w-9 h-9 rounded-xl bg-white shadow-md flex items-center justify-center text-blue-600 mb-3">
                <Target className="w-5 h-5" strokeWidth={2.25} />
              </div>

              <h4 className="text-[13px] font-bold text-white tracking-tight">
                Meta do Mês!
              </h4>
              <p className="text-[11px] text-blue-100/80 leading-snug mt-1">
                {formatK(faturamentoAtual)} de {formatK(metaTarget)} atingidos neste mês.
              </p>

              {/* Barra de progresso */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-semibold text-white/90">
                  <span>Progresso</span>
                  <span className="text-blue-200">{progressPercent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-300 via-white to-blue-200 shadow-xs transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Botão de ação */}
              <button
                onClick={() => onSelect('config')}
                className="mt-3.5 w-full h-8 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-[11px] shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center"
              >
                Configurar metas
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Versão compacta / ícone quando recolhida */
        <div className="shrink-0 p-3 pt-1 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#2152ff] via-[#1a3ec9] to-[#0d1e66] text-white flex items-center justify-center shadow-md hover:scale-105 transition-all cursor-pointer relative group"
            title={`Meta Comercial: ${formatK(faturamentoAtual)} (${progressPercent}% atingida) — Clique para expandir`}
          >
            <Target className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          </button>
        </div>
      )}
    </aside>
  );
}
