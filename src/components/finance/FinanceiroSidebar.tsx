import React, { useState, useMemo, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  CalendarClock,
  Receipt,
  FileSearch,
  Droplets,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Wallet,
  AlertCircle,
  CalendarDays,
  ClipboardList
} from 'lucide-react';
import logoMexicano from '../../assets/images/logo_mexicano_trim.png';
import { TransacaoFinanceira } from '../../types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeType?: 'warning' | 'error' | 'info';
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'gestao',
    label: 'Gestão & Fluxo',
    items: [
      { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
      { id: 'lancamentos', label: 'Lançamentos', icon: FileText },
      { id: 'fluxo', label: 'Fluxo de Caixa', icon: TrendingUp },
    ],
  },
  {
    id: 'recebiveis',
    label: 'Recebíveis & Cobrança',
    items: [
      { id: 'parcelas', label: 'Gestão de Parcelas', icon: CalendarClock },
      { id: 'boletos', label: 'Boletos & Cobrança', icon: Receipt },
    ],
  },
  {
    id: 'operacao',
    label: 'Reservas & Operação',
    items: [
      { id: 'reservas', label: 'Consulta de Reservas', icon: CalendarDays },
      { id: 'agendamentos_relatorios', label: 'Relatórios & Agendamentos', icon: ClipboardList },
      { id: 'combustivel', label: 'Combustível', icon: Droplets },
    ],
  },
  {
    id: 'controladoria',
    label: 'Controladoria & Sistema',
    items: [
      { id: 'relatorios', label: 'Relatórios & DRE', icon: FileSearch },
      { id: 'cadastros', label: 'Cadastros', icon: Settings },
    ],
  },
];

interface FinanceiroSidebarProps {
  active: string;
  onSelect: (id: string) => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  privacyMode?: boolean;
  empresaFiltro?: string;
}

export default function FinanceiroSidebar({
  active,
  onSelect,
  onClose,
  collapsed = false,
  onToggleCollapse,
  privacyMode = false,
  empresaFiltro = 'Todos',
}: FinanceiroSidebarProps) {
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);

  const fetchTransacoes = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;
      const res = await fetch('/api/financeiro/transacoes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTransacoes(data);
        }
      }
    } catch {
      // Falha silenciosa em background
    }
  };

  useEffect(() => {
    fetchTransacoes();

    const handleUpdate = () => {
      fetchTransacoes();
    };

    window.addEventListener('finance_updated', handleUpdate);
    window.addEventListener('db_updated', handleUpdate);
    window.addEventListener('db_synced', handleUpdate);

    const socket = io('/', {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
    });

    socket.on('finance_update', handleUpdate);

    return () => {
      window.removeEventListener('finance_updated', handleUpdate);
      window.removeEventListener('db_updated', handleUpdate);
      window.removeEventListener('db_synced', handleUpdate);
      socket.disconnect();
    };
  }, []);

  // Filter transactions by selected company for sidebar summary
  const filtered = useMemo(() => {
    if (!empresaFiltro || empresaFiltro === 'Todos') return transacoes;
    return transacoes.filter(t => t.empresa === empresaFiltro || (!t.empresa && empresaFiltro === 'Mexicano'));
  }, [transacoes, empresaFiltro]);

  // Compute metrics for the sidebar
  const { saldo, vencidosCount, inadimplencia } = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    let totalReceitasPagas = 0;
    let totalDespesasPagas = 0;
    let countVencidos = 0;
    let totalInadimplente = 0;

    filtered.forEach(t => {
      if (t.status === 'pago') {
        if (t.tipo === 'receita') totalReceitasPagas += Number(t.valor) || 0;
        else totalDespesasPagas += Number(t.valor) || 0;
      }
      if (t.tipo === 'receita' && (t.status === 'vencido' || (t.status === 'lancado' && t.dataVencimento < todayStr))) {
        countVencidos++;
        totalInadimplente += Number(t.valor) || 0;
      }
    });

    return {
      saldo: totalReceitasPagas - totalDespesasPagas,
      vencidosCount: countVencidos,
      inadimplencia: totalInadimplente,
    };
  }, [filtered]);

  const formatCurrency = (val: number) => {
    if (privacyMode) return 'R$ ••••';
    return `R$ ${(Number(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderItem = (item: NavItem) => {
    const isActive = active === item.id;
    const Icon = item.icon;

    // Badges dinâmicos
    let badgeText: string | undefined = undefined;
    let badgeColorClass = 'text-stone-600 bg-stone-100';

    if (item.id === 'lancamentos' && vencidosCount > 0) {
      badgeText = `${vencidosCount}`;
      badgeColorClass = 'text-rose-700 bg-rose-50 border border-rose-200/60';
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
          <span className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 tabular-nums ${badgeColorClass}`}>
            {badgeText}
          </span>
        )}
        {collapsed && badgeText && (
          <span className="absolute top-2 right-3 w-2 h-2 rounded-full ring-2 ring-white bg-rose-500" />
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
              className="w-6 h-6 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Expandir menu"
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Navigation List com Subgrupos */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={group.id} className="space-y-1">
            {!collapsed ? (
              <div className="px-3 pt-1 pb-0.5 text-[10px] uppercase font-bold tracking-wider text-stone-400 select-none">
                {group.label}
              </div>
            ) : (
              groupIdx > 0 && <div className="w-6 h-px bg-stone-200/80 mx-auto my-2" />
            )}

            <div className="space-y-0.5">
              {group.items.map(renderItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Live Liquidity Widget */}
      <div className="p-3 border-t border-stone-100/80">
        {!collapsed ? (
          <div className="rounded-xl bg-stone-50/80 border border-stone-200/70 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-stone-400" />
                Saldo em Caixa
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  saldo >= 0 ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60' : 'text-rose-700 bg-rose-50 border border-rose-200/60'
                }`}
              >
                {saldo >= 0 ? 'Positivo' : 'Atenção'}
              </span>
            </div>
            <div>
              <div className="text-sm font-bold text-stone-900 tabular-nums">
                {formatCurrency(saldo)}
              </div>
              <div className="text-[10px] text-stone-400 mt-0.5 truncate">
                {empresaFiltro === 'Todos' ? 'Todas as contas integradas' : empresaFiltro}
              </div>
            </div>
            {vencidosCount > 0 && (
              <div className="pt-1.5 border-t border-stone-200/60 flex items-center justify-between text-[10px]">
                <span className="text-stone-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  Inadimplência
                </span>
                <span className="font-semibold text-rose-600 tabular-nums">
                  {formatCurrency(inadimplencia)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div
            title={`Saldo Consolidado: ${formatCurrency(saldo)}`}
            className="w-10 h-10 mx-auto rounded-lg bg-stone-50 border border-stone-200/80 flex items-center justify-center text-stone-600 cursor-pointer hover:bg-stone-100"
            onClick={() => onSelect('dashboard')}
          >
            <Wallet className="w-4 h-4 text-stone-600" />
          </div>
        )}
      </div>
    </aside>
  );
}
