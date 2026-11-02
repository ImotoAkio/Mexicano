import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  MoreHorizontal,
  UserPlus,
  CalendarCheck,
  Send,
  FileSignature,
  Users,
  CalendarClock,
  Ticket,
  Ship,
  Anchor,
  Waves,
  Fuel,
  KeyRound,
  Star,
  Maximize2,
  Paperclip,
  Mic,
  ArrowUp,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowRightLeft,
  DollarSign,
  Target,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  SlidersHorizontal,
  ChevronDown,
  X,
} from 'lucide-react';
import { useComercialSettings } from './ComercialSettingsModal';
import { Cliente, Embarcacao, VendaComercial, ConfigMotorComissoes, LeadComercial } from '../../types';
import { clientDB, boatDB, reservationDB, onDbUpdate } from '../../db';
import {
  calculateEstoqueCotasConsolidado,
  getBoatEstoqueResumo,
  getBoatTotalCotas,
} from '../../utils/cotaUtils';
import { formatBoatName, isInternalMexicano } from '../../utils/constants';
import {
  DEFAULT_MOTOR_COMISSOES_CONFIG,
  calculateComissoesResumo,
  getCurrentMonthKey,
} from '../../utils/comissaoUtils';
import {
  DashboardPeriodInfo,
  computePeriodInfo,
  isDateInRange,
  calculateDelta,
} from './comercialDateUtils';

/* ───────────────────────── Shared Card ───────────────────────── */

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={`bg-white rounded-2xl border border-stone-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[13px] font-semibold text-stone-900 tracking-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>}
      </div>
      {action ?? (
        <button className="w-7 h-7 -mr-1.5 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function Delta({ value, positive }: { value: string; positive: boolean }) {
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
        positive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
      }`}
    >
      <Icon className="w-3 h-3" />
      {value}
    </span>
  );
}

/* ───────────────────────── KPI cards de Topo ───────────────────────── */

interface KpiRowProps {
  periodInfo?: DashboardPeriodInfo;
  periodLabel?: string;
  vendas?: VendaComercial[];
  leads?: LeadComercial[];
  propostas?: any[];
}

export function KpiRow({
  periodInfo,
  periodLabel = 'Últimos 30 dias',
  vendas = [],
  leads,
  propostas,
}: KpiRowProps) {
  const [settings] = useComercialSettings();
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll());
  const [reservas, setReservas] = useState(() => reservationDB.getAll());
  const [internalLeads, setInternalLeads] = useState<LeadComercial[]>([]);
  const [internalPropostas, setInternalPropostas] = useState<any[]>([]);

  // Período ativo
  const activePeriod = useMemo(() => {
    return periodInfo || computePeriodInfo('30d');
  }, [periodInfo]);

  useEffect(() => {
    const syncData = () => {
      setClients([...clientDB.getAll()]);
      setReservas([...reservationDB.getAll()]);
    };

    syncData();
    const unsub = onDbUpdate(syncData);

    const token = localStorage.getItem('admin_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    if (!leads) {
      fetch('/api/leads', { headers })
        .then(res => (res.ok ? res.json() : []))
        .then(data => {
          if (Array.isArray(data)) setInternalLeads(data);
        })
        .catch(() => {});
    }

    if (!propostas) {
      fetch('/api/comercial/propostas', { headers })
        .then(res => (res.ok ? res.json() : {}))
        .then(data => {
          if (Array.isArray(data.propostas)) setInternalPropostas(data.propostas);
        })
        .catch(() => {});
    }

    return () => unsub();
  }, [leads, propostas]);

  const leadsList = leads || internalLeads;
  const propostasList = propostas || internalPropostas;

  // 1. Leads no período atual vs anterior
  const currLeads = useMemo(() => {
    const inRange = leadsList.filter(l => isDateInRange(l.createdAt, activePeriod.startDate, activePeriod.endDate));
    return inRange.length;
  }, [leadsList, activePeriod]);

  const prevLeads = useMemo(() => {
    return leadsList.filter(l => isDateInRange(l.createdAt, activePeriod.prevStartDate, activePeriod.prevEndDate)).length;
  }, [leadsList, activePeriod]);

  const deltaLeads = useMemo(() => calculateDelta(currLeads, prevLeads), [currLeads, prevLeads]);

  // 2. Visitas / Sea Trials no período atual vs anterior
  const isSeaTrialOrVisit = (r: any) => {
    if (r.origem === 'comercial' || r.finalidadeComercial === 'sea_trial') return true;
    const obs = String(r.observacoes || '').toLowerCase();
    return obs.includes('sea trial') || obs.includes('test drive') || obs.includes('visita');
  };

  const currVisitas = useMemo(() => {
    const fromReservas = reservas.filter(r => isSeaTrialOrVisit(r) && isDateInRange(r.data, activePeriod.startDate, activePeriod.endDate)).length;
    const fromLeads = leadsList.filter(
      l =>
        (l.etapaFunil === 'visita_agendada' || Boolean(l.dataVisitaAgendada)) &&
        isDateInRange(l.dataVisitaAgendada || l.updatedAt || l.createdAt, activePeriod.startDate, activePeriod.endDate)
    ).length;
    return fromReservas + fromLeads;
  }, [reservas, leadsList, activePeriod]);

  const prevVisitas = useMemo(() => {
    const fromReservas = reservas.filter(r => isSeaTrialOrVisit(r) && isDateInRange(r.data, activePeriod.prevStartDate, activePeriod.prevEndDate)).length;
    const fromLeads = leadsList.filter(
      l =>
        (l.etapaFunil === 'visita_agendada' || Boolean(l.dataVisitaAgendada)) &&
        isDateInRange(l.dataVisitaAgendada || l.updatedAt || l.createdAt, activePeriod.prevStartDate, activePeriod.prevEndDate)
    ).length;
    return fromReservas + fromLeads;
  }, [reservas, leadsList, activePeriod]);

  const deltaVisitas = useMemo(() => calculateDelta(currVisitas, prevVisitas), [currVisitas, prevVisitas]);

  // 3. Propostas Enviadas no período atual vs anterior
  const currPropostas = useMemo(() => {
    const fromProps = propostasList.filter(p =>
      isDateInRange(p.createdAt || p.dataEmissao || p.dataCriacao, activePeriod.startDate, activePeriod.endDate)
    ).length;
    const fromVendasEmProposta = vendas.filter(
      v => v.status === 'ativa' && isDateInRange(v.createdAt, activePeriod.startDate, activePeriod.endDate)
    ).length;
    return fromProps + fromVendasEmProposta;
  }, [propostasList, vendas, activePeriod]);

  const prevPropostas = useMemo(() => {
    const fromProps = propostasList.filter(p =>
      isDateInRange(p.createdAt || p.dataEmissao || p.dataCriacao, activePeriod.prevStartDate, activePeriod.prevEndDate)
    ).length;
    const fromVendasEmProposta = vendas.filter(
      v => v.status === 'ativa' && isDateInRange(v.createdAt, activePeriod.prevStartDate, activePeriod.prevEndDate)
    ).length;
    return fromProps + fromVendasEmProposta;
  }, [propostasList, vendas, activePeriod]);

  const deltaPropostas = useMemo(() => calculateDelta(currPropostas, prevPropostas), [currPropostas, prevPropostas]);

  // 4. Contratos Fechados no período atual vs anterior
  const currContratos = useMemo(() => {
    return vendas.filter(
      v => v.status !== 'cancelada' && isDateInRange(v.dataVenda || v.createdAt, activePeriod.startDate, activePeriod.endDate)
    ).length;
  }, [vendas, activePeriod]);

  const prevContratos = useMemo(() => {
    return vendas.filter(
      v => v.status !== 'cancelada' && isDateInRange(v.dataVenda || v.createdAt, activePeriod.prevStartDate, activePeriod.prevEndDate)
    ).length;
  }, [vendas, activePeriod]);

  const deltaContratos = useMemo(() => calculateDelta(currContratos, prevContratos), [currContratos, prevContratos]);

  // Metas configuradas pelo usuário ou padrões do sistema
  const metaLeads = settings.metaNovosLeads || 100;
  const metaVisitas = settings.metaVisitas || 30;
  const metaPropostas = settings.metaPropostas || 50;
  const metaContratos = settings.metaNovosContratos || 20;

  const leadsPct = Math.min(100, Math.round((currLeads / Math.max(1, metaLeads)) * 100));
  const visitasPct = Math.min(100, Math.round((currVisitas / Math.max(1, metaVisitas)) * 100));
  const propostasPct = Math.min(100, Math.round((currPropostas / Math.max(1, metaPropostas)) * 100));
  const contratosPct = Math.min(100, Math.round((currContratos / Math.max(1, metaContratos)) * 100));

  const kpis = [
    {
      id: 'leads',
      label: 'Novos Leads',
      sublabel: 'Contatos captados',
      value: currLeads.toLocaleString('pt-BR'),
      delta: deltaLeads.value,
      positive: deltaLeads.positive,
      prev: prevLeads.toLocaleString('pt-BR'),
      metaLabel: `Meta: ${metaLeads.toLocaleString('pt-BR')} (${leadsPct}%)`,
      progress: leadsPct,
      icon: UserPlus,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'visitas',
      label: 'Visitas / Test Drives Agendados',
      sublabel: 'Experiências na Marina',
      value: currVisitas.toLocaleString('pt-BR'),
      delta: deltaVisitas.value,
      positive: deltaVisitas.positive,
      prev: prevVisitas.toLocaleString('pt-BR'),
      metaLabel: `Meta: ${metaVisitas.toLocaleString('pt-BR')} (${visitasPct}%)`,
      progress: visitasPct,
      icon: CalendarCheck,
      color: 'from-amber-500 to-orange-600',
    },
    {
      id: 'propostas',
      label: 'Propostas Enviadas',
      sublabel: 'Simulações geradas',
      value: currPropostas.toLocaleString('pt-BR'),
      delta: deltaPropostas.value,
      positive: deltaPropostas.positive,
      prev: prevPropostas.toLocaleString('pt-BR'),
      metaLabel: `Meta: ${metaPropostas.toLocaleString('pt-BR')} (${propostasPct}%)`,
      progress: propostasPct,
      icon: Send,
      color: 'from-violet-500 to-purple-600',
    },
    {
      id: 'contratos',
      label: 'Contratos Fechados',
      sublabel: 'Cotas comercializadas',
      value: currContratos.toLocaleString('pt-BR'),
      delta: deltaContratos.value,
      positive: deltaContratos.positive,
      prev: prevContratos.toLocaleString('pt-BR'),
      metaLabel: `Meta: ${metaContratos.toLocaleString('pt-BR')} (${contratosPct}%)`,
      progress: contratosPct,
      icon: FileSignature,
      color: 'from-emerald-500 to-teal-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map(k => {
        const Icon = k.icon;
        return (
          <Card key={k.id} className="p-4 relative overflow-hidden group hover:border-stone-300 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] font-semibold text-stone-800 tracking-tight block">
                  {k.label}
                </span>
                <span className="text-[10px] text-stone-400 font-normal">{k.sublabel}</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 group-hover:bg-[#2B1120] group-hover:text-white transition-colors">
                <Icon className="w-4 h-4" strokeWidth={2} />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2 flex-wrap">
              <span className="text-[26px] leading-none font-bold text-stone-900 tabular-nums tracking-tight">
                {k.value}
              </span>
              <Delta value={k.delta} positive={k.positive} />
            </div>

            <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-stone-600 tabular-nums">{k.metaLabel}</span>
                <span className="text-stone-400 tabular-nums text-[10px]">vs. {k.prev} ant.</span>
              </div>
              <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2B1120] transition-all duration-500"
                  style={{ width: `${k.progress}%` }}
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Revenue & VGV Card + Estoque de Cotas ───────────────────────── */

function generateRevenueTimeline(
  vendas: VendaComercial[],
  periodInfo: DashboardPeriodInfo,
  isVendedorScope: boolean,
  currentName: string
) {
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const startTime = periodInfo.startDate.getTime();
  const endTime = periodInfo.endDate.getTime();
  const totalDuration = Math.max(1, endTime - startTime);

  const prevStartTime = periodInfo.prevStartDate.getTime();
  const prevEndTime = periodInfo.prevEndDate.getTime();
  const prevDuration = Math.max(1, prevEndTime - prevStartTime);

  const filterVenda = (v: VendaComercial) => {
    if (v.status === 'cancelada') return false;
    if (!isVendedorScope) return true;
    if (!currentName) return true;
    return (v.vendedorNome || '').toLowerCase().includes(currentName);
  };

  const currentVendas = vendas.filter(v => filterVenda(v) && isDateInRange(v.dataVenda || v.createdAt, periodInfo.startDate, periodInfo.endDate));
  const prevVendas = vendas.filter(v => filterVenda(v) && isDateInRange(v.dataVenda || v.createdAt, periodInfo.prevStartDate, periodInfo.prevEndDate));

  const pointsCount = 7;
  const timeline = [];

  for (let i = 0; i < pointsCount; i++) {
    const fraction = (i + 1) / pointsCount;
    const pointTime = new Date(startTime + fraction * totalDuration);
    const prevPointTime = new Date(prevStartTime + fraction * prevDuration);

    const dLabel = `${pointTime.getDate()} ${meses[pointTime.getMonth()]}`;

    const currSum = currentVendas
      .filter(v => {
        const t = new Date(v.dataVenda || v.createdAt).getTime();
        return t <= pointTime.getTime();
      })
      .reduce((sum, v) => sum + (Number(v.valorTotal) || 0), 0);

    const prevSum = prevVendas
      .filter(v => {
        const t = new Date(v.dataVenda || v.createdAt).getTime();
        return t <= prevPointTime.getTime();
      })
      .reduce((sum, v) => sum + (Number(v.valorTotal) || 0), 0);

    timeline.push({
      d: dLabel,
      atual: currSum,
      anterior: prevSum,
      desc: currSum > 0 ? `VGV acumulado até ${dLabel}` : 'Sem fechamentos neste marco',
    });
  }

  return timeline;
}

function RevenueTooltip({ active, payload, label, hideValues }: any) {
  if (!active || !payload?.length) return null;
  const atual = payload.find((p: any) => p.dataKey === 'atual')?.value ?? 0;
  const anterior = payload.find((p: any) => p.dataKey === 'anterior')?.value ?? 0;
  const item = payload[0]?.payload;
  const fmt = (n: number) =>
    hideValues
      ? 'R$ ••••••'
      : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <div className="rounded-xl bg-stone-900 text-white shadow-xl px-3.5 py-2.5 text-[11px] border border-stone-800">
      <div className="flex items-center justify-between gap-3 mb-1.5 border-b border-stone-800 pb-1">
        <p className="font-bold text-stone-200">{label}</p>
        {item?.desc && <span className="text-[10px] text-stone-400 truncate max-w-[140px]">{item.desc}</span>}
      </div>
      <p className="flex items-center justify-between gap-3 text-stone-300">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-emerald-400" />
          VGV Período Atual:
        </span>
        <span className="font-bold text-white tabular-nums">{fmt(atual)}</span>
      </p>
      <p className="flex items-center justify-between gap-3 text-stone-400 mt-0.5">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-stone-500" />
          Período Anterior:
        </span>
        <span className="font-medium tabular-nums">{fmt(anterior)}</span>
      </p>
    </div>
  );
}

interface RevenueCardProps {
  periodInfo?: DashboardPeriodInfo;
  vendas?: VendaComercial[];
  operadorNome?: string;
}

export function RevenueCard({ periodInfo, vendas = [], operadorNome }: RevenueCardProps) {
  const [settings] = useComercialSettings();
  const hide = settings.ocultarValoresDashboard;

  // Visualização: 'equipe' ou 'vendedor'
  const [viewScope, setViewScope] = useState<'equipe' | 'vendedor'>('equipe');

  // Período ativo
  const activePeriod = useMemo(() => {
    return periodInfo || computePeriodInfo('30d');
  }, [periodInfo]);

  // Dados de estoque em tempo real
  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll());
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll());

  useEffect(() => {
    const syncStores = () => {
      setBoats([...boatDB.getAll()]);
      setClients([...clientDB.getAll()]);
    };
    syncStores();
    return onDbUpdate(syncStores);
  }, []);

  // Consolidado do Estoque de Cotas (4 categorias solicitadas pelo usuário)
  const estoqueConsolidado = useMemo(() => {
    return calculateEstoqueCotasConsolidado(boats, clients, vendas);
  }, [boats, clients, vendas]);

  // VGV real do período a partir de vendas registradas (sem mocks!)
  const realVgvEquipe = useMemo(() => {
    return vendas
      .filter(v => v.status !== 'cancelada' && isDateInRange(v.dataVenda || v.createdAt, activePeriod.startDate, activePeriod.endDate))
      .reduce((sum, v) => sum + (Number(v.valorTotal) || 0), 0);
  }, [vendas, activePeriod]);

  // VGV real do vendedor logado no período
  const realVgvVendedor = useMemo(() => {
    const currentName = (operadorNome || settings.nome || '').toLowerCase().trim();
    return vendas
      .filter(v => {
        if (v.status === 'cancelada') return false;
        if (!isDateInRange(v.dataVenda || v.createdAt, activePeriod.startDate, activePeriod.endDate)) return false;
        if (!currentName) return true;
        return (v.vendedorNome || '').toLowerCase().includes(currentName);
      })
      .reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);
  }, [vendas, operadorNome, settings.nome, activePeriod]);

  // VGV do período anterior para cálculo exato de delta
  const prevVgv = useMemo(() => {
    const currentName = (operadorNome || settings.nome || '').toLowerCase().trim();
    return vendas
      .filter(v => {
        if (v.status === 'cancelada') return false;
        if (!isDateInRange(v.dataVenda || v.createdAt, activePeriod.prevStartDate, activePeriod.prevEndDate)) return false;
        if (isVendedorScope && currentName) {
          return (v.vendedorNome || '').toLowerCase().includes(currentName);
        }
        return true;
      })
      .reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);
  }, [vendas, operadorNome, settings.nome, isVendedorScope, activePeriod]);

  // Valores ativos conforme escopo
  const isVendedorScope = viewScope === 'vendedor';
  const faturamentoAtual = isVendedorScope ? realVgvVendedor : realVgvEquipe;
  const meta = isVendedorScope
    ? settings.metaIndividualVendedor || 250000
    : settings.metaMensalFaturamento || 600000;
  const pct = Math.min(100, Math.round((faturamentoAtual / Math.max(1, meta)) * 100));

  const vgvDelta = useMemo(() => {
    return calculateDelta(faturamentoAtual, prevVgv);
  }, [faturamentoAtual, prevVgv]);

  // Projeção proporcional do fim do período baseada no tempo decorrido
  const projecaoMes = useMemo(() => {
    const now = new Date();
    const start = activePeriod.startDate.getTime();
    const end = activePeriod.endDate.getTime();
    const current = Math.min(Math.max(now.getTime(), start), end);
    const elapsed = current - start;
    const total = end - start;
    if (elapsed <= 0 || faturamentoAtual === 0) return 0;
    const ratio = total / elapsed;
    return Math.round(faturamentoAtual * ratio);
  }, [faturamentoAtual, activePeriod]);

  const revenueTimeline = useMemo(() => {
    return generateRevenueTimeline(
      vendas,
      activePeriod,
      isVendedorScope,
      (operadorNome || settings.nome || '').toLowerCase().trim()
    );
  }, [vendas, activePeriod, isVendedorScope, operadorNome, settings.nome]);

  const maxTimelineVal = useMemo(() => {
    const peak = Math.max(
      ...revenueTimeline.map(t => Math.max(t.atual, t.anterior)),
      faturamentoAtual,
      prevVgv,
      0
    );
    return peak > 0 ? peak : meta;
  }, [revenueTimeline, faturamentoAtual, prevVgv, meta]);

  const yTicks = useMemo(() => {
    if (maxTimelineVal === 0) return [0, 50000, 100000, 200000];
    const step = maxTimelineVal / 3;
    return [0, Math.round(step), Math.round(step * 2), Math.round(maxTimelineVal * 1.1)];
  }, [maxTimelineVal]);

  const formatBRL = (val: number) => {
    if (hide) return 'R$ ••••••';
    return `R$ ${(Number(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatCompactBRL = (val: number) => {
    if (hide) return 'R$ ••••••';
    if (val >= 1000000) {
      return `R$ ${(val / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
    }
    if (val >= 1000) {
      return `R$ ${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
    }
    return `R$ ${val.toLocaleString('pt-BR')}`;
  };

  return (
    <Card className="p-5 space-y-6">
      {/* ─── 1. GRÁFICO DE RECEITA E VGV ─── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                Receita & VGV (Valor Geral de Vendas)
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                {isVendedorScope ? 'Meu Desempenho' : 'Equipe Comercial'}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Evolução temporal das vendas realizadas vs. meta financeira do período ({activePeriod.label})
            </p>
          </div>

          {/* Seletor Equipe vs Vendedor */}
          <div className="inline-flex rounded-xl bg-stone-100 p-0.5 border border-stone-200/80 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setViewScope('equipe')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                !isVendedorScope ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Equipe Geral
            </button>
            <button
              type="button"
              onClick={() => setViewScope('vendedor')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                isVendedorScope ? 'bg-[#2B1120] text-white shadow-xs' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Meu VGV ({operadorNome ? operadorNome.split(' ')[0] : 'Vendedor'})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,250px)_1fr] gap-6 items-center">
          <div className="flex flex-col justify-between h-full space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                {isVendedorScope ? 'VGV Individual Realizado' : 'VGV Total da Equipe'}
              </p>
              <p className="text-[32px] leading-tight font-extrabold text-stone-900 tracking-tight tabular-nums mt-1">
                {formatBRL(faturamentoAtual)}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Delta value={vgvDelta.value} positive={vgvDelta.positive} />
                <span className="text-[11px] text-stone-400">vs. período anterior ({formatBRL(prevVgv)})</span>
              </div>
            </div>

            <div className="rounded-xl bg-stone-50/80 border border-stone-200/70 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-500 font-medium">Meta: {formatCompactBRL(meta)}</span>
                <span className="font-extrabold text-[#2B1120] tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 w-full bg-stone-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2B1120] via-stone-800 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-500 pt-0.5">
                <span>Ritmo do período</span>
                <span className="font-semibold text-stone-700">
                  Projeção: {formatCompactBRL(projecaoMes)}
                </span>
              </div>
            </div>
          </div>

          <div className="h-[180px] -mr-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTimeline} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="vgvFillGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2B1120" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#2B1120" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f3eeea" />
                <XAxis
                  dataKey="d"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#a8a09b' }}
                  interval={1}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#a8a09b' }}
                  tickFormatter={v => (hide ? '•••' : v === 0 ? '0' : `${Math.round(v / 1000)}K`)}
                  ticks={yTicks}
                />
                <Tooltip content={<RevenueTooltip hideValues={hide} />} cursor={{ stroke: '#2B1120', strokeDasharray: '3 3' }} />
                <Area
                  type="monotone"
                  dataKey="anterior"
                  stroke="#d6cdc8"
                  strokeDasharray="4 4"
                  strokeWidth={1.75}
                  fill="none"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="atual"
                  stroke="#2B1120"
                  strokeWidth={2.5}
                  fill="url(#vgvFillGradient)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#2B1120' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── 2. STATUS DO ESTOQUE DE COTAS (Substitui carteira genérica) ─── */}
      <div className="pt-5 border-t border-stone-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                Status do Estoque de Cotas da Frota
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Tempo Real
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Posição consolidada de todas as cotas náuticas comercializadas e em estoque
            </p>
          </div>

          <div className="text-[11px] font-semibold text-stone-600 bg-stone-50 px-3 py-1 rounded-xl border border-stone-200/70 tabular-nums">
            Frota: <span className="font-bold text-stone-900">{estoqueConsolidado.totalCotasFrota} cotas</span> em{' '}
            <span className="font-bold text-stone-900">{estoqueConsolidado.embarcacoesCount} embarcações</span> •{' '}
            <span className="text-emerald-700">{estoqueConsolidado.percentualOcupacao}% ocupada</span>
          </div>
        </div>

        {/* Barra Segmentada de Distribuição Visual do Estoque */}
        <div className="space-y-1.5 mb-4">
          <div className="h-3 w-full rounded-full bg-stone-100 overflow-hidden flex gap-0.5 p-0.5 border border-stone-200/60 shadow-inner">
            {/* Disponíveis Mexicano */}
            <div
              className="h-full rounded-l-full bg-emerald-500 transition-all duration-500 hover:brightness-105"
              style={{ width: `${estoqueConsolidado.percentualDisponivel}%` }}
              title={`Disponíveis (Mexicano): ${estoqueConsolidado.cotasDisponiveisMexicano} cotas (${estoqueConsolidado.percentualDisponivel}%)`}
            />
            {/* Reservadas */}
            <div
              className="h-full bg-amber-500 transition-all duration-500 hover:brightness-105"
              style={{ width: `${estoqueConsolidado.percentualReservadas}%` }}
              title={`Reservadas (Em negociação): ${estoqueConsolidado.cotasReservadas} cotas (${estoqueConsolidado.percentualReservadas}%)`}
            />
            {/* Repasse */}
            <div
              className="h-full bg-violet-500 transition-all duration-500 hover:brightness-105"
              style={{ width: `${estoqueConsolidado.percentualRepasse}%` }}
              title={`Cotas de Repasse (Revenda): ${estoqueConsolidado.cotasRepasse} cotas (${estoqueConsolidado.percentualRepasse}%)`}
            />
            {/* Vendidas */}
            <div
              className="h-full rounded-r-full bg-[#2B1120] transition-all duration-500 hover:brightness-105"
              style={{ width: `${estoqueConsolidado.percentualVendidas}%` }}
              title={`Cotas Vendidas (Titulares externos): ${estoqueConsolidado.cotasVendidas} cotas (${estoqueConsolidado.percentualVendidas}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium px-0.5">
            <span>Distribuição proporcional do estoque náutico</span>
            <span>{estoqueConsolidado.totalCotasFrota} cotas mapeadas</span>
          </div>
        </div>

        {/* 4 Cards de Indicadores Visuais Conforme Solicitado */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. Cotas Disponíveis (Titular: Mexicano) */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 space-y-1 hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Disponíveis
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-extrabold text-emerald-950 tabular-nums leading-none">
                {estoqueConsolidado.cotasDisponiveisMexicano}
              </span>
              <span className="text-[11px] font-bold text-emerald-700">
                ({estoqueConsolidado.percentualDisponivel}%)
              </span>
            </div>
            <p className="text-[11px] font-semibold text-stone-700">Titular: Mexicano</p>
            <p className="text-[10px] text-stone-500">Pronta-entrega para venda imediata</p>
          </div>

          {/* 2. Cotas Reservadas (Em negociação) */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 space-y-1 hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                Reservadas
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-extrabold text-amber-950 tabular-nums leading-none">
                {estoqueConsolidado.cotasReservadas}
              </span>
              <span className="text-[11px] font-bold text-amber-700">
                ({estoqueConsolidado.percentualReservadas}%)
              </span>
            </div>
            <p className="text-[11px] font-semibold text-stone-700">Em negociação</p>
            <p className="text-[10px] text-stone-500">Propostas ativas e contratos pendentes</p>
          </div>

          {/* 3. Cotas de Repasse (Revenda) */}
          <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-3 space-y-1 hover:border-violet-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-violet-800 uppercase tracking-wider">
                Repasse
              </span>
              <span className="w-2 h-2 rounded-full bg-violet-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-extrabold text-violet-950 tabular-nums leading-none">
                {estoqueConsolidado.cotasRepasse}
              </span>
              <span className="text-[11px] font-bold text-violet-700">
                ({estoqueConsolidado.percentualRepasse}%)
              </span>
            </div>
            <p className="text-[11px] font-semibold text-stone-700">Revenda de Cotistas</p>
            <p className="text-[10px] text-stone-500">Oportunidades de repasse na base</p>
          </div>

          {/* 4. Cotas Vendidas (Titulares externos) */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 space-y-1 hover:border-stone-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">
                Vendidas
              </span>
              <span className="w-2 h-2 rounded-full bg-[#2B1120]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] font-extrabold text-stone-900 tabular-nums leading-none">
                {estoqueConsolidado.cotasVendidas}
              </span>
              <span className="text-[11px] font-bold text-stone-600">
                ({estoqueConsolidado.percentualVendidas}%)
              </span>
            </div>
            <p className="text-[11px] font-semibold text-stone-700">Titulares externos</p>
            <p className="text-[10px] text-stone-500">Contratos assinados e ativos</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ───────────────────────── Ranking de Embarcações / Planos Mais Vendidos ───────────────────────── */

interface TopPlansCardProps {
  periodInfo?: DashboardPeriodInfo;
  vendas?: VendaComercial[];
  onSelectBoat?: (boatId: string) => void;
}

export function TopPlansCard({ periodInfo, vendas = [], onSelectBoat }: TopPlansCardProps) {
  const [settings] = useComercialSettings();
  const isCompact = settings.densidadeTabelas === 'compacta';
  const hide = settings.ocultarValoresDashboard;
  const rowPy = isCompact ? 'py-2' : 'py-3.5';

  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll());
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll());
  const [sortBy, setSortBy] = useState<'cotas' | 'vgv' | 'ticket'>('cotas');

  useEffect(() => {
    const sync = () => {
      setBoats([...boatDB.getAll()]);
      setClients([...clientDB.getAll()]);
    };
    sync();
    return onDbUpdate(sync);
  }, []);

  // Consolidação dinâmica do ranking de embarcações por saída
  const rankingList = useMemo(() => {
    return boats
      .map(boat => {
        const boatId = boat.id;
        const totalCotas = getBoatTotalCotas(boat);
        const estoque = getBoatEstoqueResumo(boatId, clients, boat);

        // Vendas desta embarcação no período (se especificado) ou total ativo
        const boatVendas = vendas.filter(v => {
          if (v.embarcacaoId !== boatId || v.status === 'cancelada') return false;
          if (periodInfo) {
            return isDateInRange(v.dataVenda || v.createdAt, periodInfo.startDate, periodInfo.endDate);
          }
          return true;
        });

        // Contagem de cotas vendidas (prioriza vendas registradas ou cotistas ativos)
        const cotasVendidas = Math.max(boatVendas.length, estoque.cotasVendidas);

        // VGV gerado (soma real das vendas ou valor cadastrado por cota na embarcação)
        let vgvGerado = boatVendas.reduce((sum, v) => sum + (Number(v.valorTotal) || 0), 0);
        if (vgvGerado === 0 && cotasVendidas > 0) {
          const quotaVal = Number(boat.valorCota) || 0;
          vgvGerado = cotasVendidas * quotaVal;
        }

        // Ticket médio real
        const ticketMedio = cotasVendidas > 0 ? Math.round(vgvGerado / cotasVendidas) : (Number(boat.valorCota) || 0);
        const taxaAbsorcao = Math.min(100, Math.round((cotasVendidas / Math.max(1, totalCotas)) * 100));

        return {
          id: boat.id,
          nome: formatBoatName(boat.nome),
          modelo: boat.modelo || (boat.tipo === 'lancha' ? 'Lancha Cabinada' : 'Jet Ski'),
          tipo: boat.tipo,
          totalCotas,
          cotasVendidas,
          cotasDisponiveis: estoque.cotasDisponiveis,
          vgvGerado,
          ticketMedio,
          taxaAbsorcao,
        };
      })
      .sort((a, b) => {
        if (sortBy === 'vgv') return b.vgvGerado - a.vgvGerado;
        if (sortBy === 'ticket') return b.ticketMedio - a.ticketMedio;
        return b.cotasVendidas - a.cotasVendidas || b.vgvGerado - a.vgvGerado;
      });
  }, [boats, clients, vendas, sortBy, periodInfo]);

  const formatBRL = (val: number) => {
    if (hide) return 'R$ ••••••';
    return `R$ ${(Number(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-stone-900 tracking-tight">
            Ranking de Embarcações / Planos Mais Vendidos
          </h3>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Embarcações com maior volume de saída, cotas comercializadas, VGV e ticket médio
          </p>
        </div>

        {/* Critério de Ordenação */}
        <div className="inline-flex rounded-xl bg-stone-100 p-0.5 border border-stone-200/80 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setSortBy('cotas')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              sortBy === 'cotas' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Mais Cotas
          </button>
          <button
            type="button"
            onClick={() => setSortBy('vgv')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              sortBy === 'vgv' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Maior VGV
          </button>
          <button
            type="button"
            onClick={() => setSortBy('ticket')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              sortBy === 'ticket' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Ticket Médio
          </button>
        </div>
      </div>

      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[620px] text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-stone-400 border-y border-stone-100 bg-stone-50/60">
              <th className="text-center font-bold py-2.5 pl-5 w-12">#</th>
              <th className="text-left font-bold py-2.5">Embarcação</th>
              <th className="text-right font-bold py-2.5">Cotas Vendidas</th>
              <th className="text-right font-bold py-2.5">Receita Gerada (VGV)</th>
              <th className="text-right font-bold py-2.5">Ticket Médio</th>
              <th className="text-right font-bold py-2.5 pr-5">Status do Estoque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rankingList.map((item, idx) => {
              const rank = idx + 1;
              const isTop1 = rank === 1;
              const isTop3 = rank <= 3;
              const isJet = item.tipo === 'jet';

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectBoat && onSelectBoat(item.id)}
                  className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                >
                  {/* Posição com destaque */}
                  <td className={`${rowPy} pl-5 text-center`}>
                    {isTop1 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[11px] shadow-xs">
                        1º
                      </span>
                    ) : isTop3 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-200/80 text-stone-800 font-bold text-[11px]">
                        {rank}º
                      </span>
                    ) : (
                      <span className="text-stone-400 font-semibold tabular-nums text-xs">{rank}º</span>
                    )}
                  </td>

                  {/* Embarcação e Modelo */}
                  <td className={rowPy}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isJet ? 'bg-cyan-50 text-cyan-700' : 'bg-[#2B1120]/10 text-[#2B1120]'
                        }`}
                      >
                        {isJet ? <Waves className="w-4 h-4" /> : <Ship className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-stone-900 truncate group-hover:text-[#2B1120] transition-colors">
                          {item.nome}
                        </p>
                        <p className="text-[10px] text-stone-400 truncate">
                          {item.modelo} • {item.totalCotas} cotas totais
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Cotas Comercializadas com barra de absorção */}
                  <td className={`${rowPy} text-right`}>
                    <div className="inline-flex flex-col items-end gap-1">
                      <span className="font-bold text-stone-900 tabular-nums">
                        {item.cotasVendidas} {item.cotasVendidas === 1 ? 'cota' : 'cotas'}
                      </span>
                      <div className="w-16 h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${item.taxaAbsorcao}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Receita Gerada */}
                  <td className={`${rowPy} text-right`}>
                    <span className="inline-block rounded-md bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 tabular-nums border border-emerald-200/60">
                      {formatBRL(item.vgvGerado)}
                    </span>
                  </td>

                  {/* Ticket Médio */}
                  <td className={`${rowPy} text-right font-semibold text-stone-800 tabular-nums`}>
                    {formatBRL(item.ticketMedio)}
                  </td>

                  {/* Status do Estoque */}
                  <td className={`${rowPy} pr-5 text-right`}>
                    {item.cotasDisponiveis === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-500">
                        100% Vendida
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.cotasDisponiveis} {item.cotasDisponiveis === 1 ? 'disponível' : 'disponíveis'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ───────────────────────── Most active day ───────────────────────── */

export function ActiveDayCard({ periodInfo }: { periodInfo?: DashboardPeriodInfo } = {}) {
  const [resList, setResList] = useState(() => reservationDB.getAll());

  useEffect(() => {
    const sync = () => setResList([...reservationDB.getAll()]);
    sync();
    return onDbUpdate(sync);
  }, []);

  const daysData = useMemo(() => {
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // 0: Dom, 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sáb

    // Filtrar pelo período se houver dados correspondentes; caso contrário, usa toda a base de reservas para volume confiável
    const filtered = periodInfo
      ? resList.filter(r => isDateInRange(r.data, periodInfo.startDate, periodInfo.endDate))
      : resList;

    const source = filtered.length > 0 ? filtered : resList;

    source.forEach(r => {
      if (!r.data) return;
      const d = new Date(`${r.data}T12:00:00`);
      if (!isNaN(d.getTime())) {
        dayCounts[d.getDay()]++;
      }
    });

    const maxVal = Math.max(...dayCounts, 1);
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return dayNames.map((d, idx) => {
      const count = dayCounts[idx];
      const isPeak = count === maxVal && count > 0;
      return {
        d,
        count,
        v: count === 0 ? 8 : Math.max(12, Math.round((count / maxVal) * 100)),
        peak: isPeak ? String(count) : undefined,
      };
    });
  }, [resList, periodInfo]);

  return (
    <Card className="p-5">
      <CardHeader
        title="Dia com mais atendimentos & saídas"
        subtitle="Distribuição semanal de embarques e agendamentos"
      />
      <div className="mt-4 h-[150px] flex items-end gap-2.5">
        {daysData.map(day => (
          <div key={day.d} className="flex-1 h-full flex flex-col items-center justify-end gap-2">
            {day.peak && <span className="text-[12px] font-semibold text-stone-900 tabular-nums">{day.peak}</span>}
            <div
              className={`w-full rounded-lg ${
                day.peak
                  ? 'bg-gradient-to-b from-[#4a1f39] to-[#2B1120] shadow-[0_6px_14px_-6px_rgba(43,17,32,0.7)]'
                  : 'bg-stone-100 hover:bg-stone-200 transition-colors'
              }`}
              style={{ height: `${day.v * 0.78}%` }}
              title={`${day.d}: ${day.count} agendamentos`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2.5">
        {daysData.map(day => (
          <span
            key={day.d}
            className={`flex-1 text-center text-[11px] ${day.peak ? 'text-[#2B1120] font-bold' : 'text-stone-400'}`}
          >
            {day.d}
          </span>
        ))}
      </div>
    </Card>
  );
}

/* ───────────────────────── Conversion gauge ───────────────────────── */

interface ConversionGaugeCardProps {
  value?: number;
  periodInfo?: DashboardPeriodInfo;
  leads?: LeadComercial[];
  vendas?: VendaComercial[];
}

export function ConversionGaugeCard({
  value: customValue,
  periodInfo,
  leads = [],
  vendas = [],
}: ConversionGaugeCardProps = {}) {
  const [internalLeads, setInternalLeads] = useState<LeadComercial[]>([]);
  const [internalVendas, setInternalVendas] = useState<VendaComercial[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    if (leads.length === 0) {
      fetch('/api/leads', { headers })
        .then(res => (res.ok ? res.json() : []))
        .then(data => {
          if (Array.isArray(data)) setInternalLeads(data);
        })
        .catch(() => {});
    }

    if (vendas.length === 0) {
      fetch('/api/comercial/vendas', { headers })
        .then(res => (res.ok ? res.json() : {}))
        .then(data => {
          if (Array.isArray(data.vendas)) setInternalVendas(data.vendas);
        })
        .catch(() => {});
    }
  }, [leads.length, vendas.length]);

  const activeLeads = leads.length > 0 ? leads : internalLeads;
  const activeVendas = vendas.length > 0 ? vendas : internalVendas;

  // Filtrar leads e vendas no período (ou base geral se período tiver poucos dados)
  const leadsInPeriod = useMemo(() => {
    if (!periodInfo) return activeLeads;
    const inRange = activeLeads.filter(l => isDateInRange(l.createdAt, periodInfo.startDate, periodInfo.endDate));
    return inRange.length > 0 ? inRange : activeLeads;
  }, [activeLeads, periodInfo]);

  const vendasInPeriod = useMemo(() => {
    const valid = activeVendas.filter(v => v.status !== 'cancelada');
    if (!periodInfo) return valid;
    const inRange = valid.filter(v => isDateInRange(v.dataVenda || v.createdAt, periodInfo.startDate, periodInfo.endDate));
    return inRange.length > 0 ? inRange : valid;
  }, [activeVendas, periodInfo]);

  const totalLeads = leadsInPeriod.length;
  const totalConversoes = vendasInPeriod.length;

  const calculatedValue = customValue !== undefined 
    ? customValue 
    : totalLeads > 0 
      ? Math.min(100, Math.round((totalConversoes / totalLeads) * 100)) 
      : 0;

  const value = calculatedValue;
  const ticks = 48;
  const cx = 110;
  const cy = 104;
  const rOuter = 96;
  const rInner = 74;
  const filled = Math.round((value / 100) * ticks);

  const statusSubtitle = totalLeads === 0
    ? 'Aguardando captação de leads'
    : value >= 15
    ? `Conversão excelente (${totalConversoes} de ${totalLeads} cotas)`
    : `${totalConversoes} vendas de ${totalLeads} oportunidades`;

  return (
    <Card className="p-5">
      <CardHeader
        title="Taxa de conversão de cotas"
        subtitle="Relação entre novos contatos e vendas fechadas"
      />
      <div className="relative mt-2 flex justify-center">
        <svg viewBox="0 0 220 112" className="w-full max-w-[240px]">
          {Array.from({ length: ticks }).map((_, i) => {
            const angle = Math.PI - (i / (ticks - 1)) * Math.PI;
            const x1 = cx + rInner * Math.cos(angle);
            const y1 = cy - rInner * Math.sin(angle);
            const x2 = cx + rOuter * Math.cos(angle);
            const y2 = cy - rOuter * Math.sin(angle);
            const on = i < filled;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={on ? (i / filled < 0.5 ? '#10b981' : '#059669') : '#ece5e0'}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-[30px] leading-none font-bold text-stone-900 tabular-nums tracking-tight">{value}%</span>
          <span className="mt-1 text-[11px] text-stone-400">{statusSubtitle}</span>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <button className="h-7 px-3 rounded-lg border border-stone-200 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer">
          Ver funil detalhado
        </button>
      </div>
    </Card>
  );
}

/* ───────────────────────── AI assistant ───────────────────────── */

export function AiAssistantCard() {
  return (
    <Card className="p-5 flex flex-col">
      <CardHeader
        title="Assistente Comercial IA"
        action={
          <button className="w-7 h-7 -mr-1.5 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        }
      />
      <div className="flex-1 min-h-[140px] flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 translate-y-6 scale-x-110 rounded-full bg-[#2B1120]/30 blur-xl" />
          <div
            className="relative w-16 h-16 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, #ffffff 0%, #ead8df 10%, #a07888 32%, #5a2f42 64%, #2b1120 100%)',
              boxShadow: 'inset -6px -8px 16px rgba(26,9,19,0.4), 0 10px 24px -8px rgba(43,17,32,0.6)',
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 h-10 pl-3 pr-1.5 rounded-full border border-stone-200 bg-stone-50/60">
        <Paperclip className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <span className="flex-1 text-[12px] text-stone-400 truncate">Pergunte sobre estoque de cotas ou metas…</span>
        <Mic className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <button className="w-7 h-7 rounded-full bg-[#2B1120] hover:bg-[#3e1b30] text-white flex items-center justify-center transition-colors cursor-pointer">
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  );
}

/* ───────────────────────── Widget Flutuante de Comissão do Vendedor ───────────────────────── */

interface SellerCommissionFloatingWidgetProps {
  operadorNome?: string;
  vendas?: VendaComercial[];
  onOpenComissoes: () => void;
}

export function SellerCommissionFloatingWidget({
  operadorNome,
  vendas = [],
  onOpenComissoes,
}: SellerCommissionFloatingWidgetProps) {
  const [settings] = useComercialSettings();
  const [collapsed, setCollapsed] = useState(false);
  const hide = settings.ocultarValoresDashboard;

  const currentMonthKey = getCurrentMonthKey();
  const comissoesConfig = useMemo(() => {
    try {
      const saved = localStorage.getItem('comercial_motor_comissoes_config');
      if (saved) return { ...DEFAULT_MOTOR_COMISSOES_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_MOTOR_COMISSOES_CONFIG;
  }, []);

  const resumo = useMemo(() => {
    return calculateComissoesResumo(vendas, comissoesConfig, currentMonthKey);
  }, [vendas, comissoesConfig, currentMonthKey]);

  const vendedorNome = operadorNome || settings.nome || 'Consultor Comercial';
  const metaIndividual = settings.metaIndividualVendedor || 250000;
  const faturamentoReal = resumo.faturamentoRealMes;
  const comissaoTotal = resumo.totalVariavelPorVendedor;
  const totalCotas = resumo.totalCotasMes;
  const progressPercent = Math.min(100, Math.round((faturamentoReal / metaIndividual) * 100));

  const formatBRL = (val: number) => {
    if (hide) return 'R$ ••••••';
    return `R$ ${(Number(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatK = (val: number) => {
    if (hide) return 'R$ ••••';
    return `R$ ${(Number(val) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}K`;
  };

  return (
    <aside
      aria-label="Resumo Rápido de Comissão do Vendedor"
      className="fixed bottom-4 right-4 z-40 max-w-sm w-[calc(100vw-32px)] sm:w-80 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
    >
      <div className="bg-[#2B1120] text-white rounded-2xl shadow-[0_16px_36px_rgba(43,17,32,0.45)] border border-[#441d34] overflow-hidden">
        {/* Cabeçalho do Widget */}
        <div className="px-3.5 py-2.5 bg-black/20 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-xs">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight leading-none truncate max-w-[150px]">
                {vendedorNome}
              </p>
              <p className="text-[10px] text-amber-300/80 font-medium">Meta & Comissão do Mês</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={collapsed ? 'Expandir' : 'Recolher'}
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Conteúdo Expansível */}
        {!collapsed && (
          <div className="p-3.5 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-[10px] text-stone-300 uppercase font-semibold tracking-wider">
                  Comissão Acumulada
                </p>
                <p className="text-xl font-black text-white tabular-nums tracking-tight">
                  {formatBRL(comissaoTotal)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tabular-nums">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {totalCotas} {totalCotas === 1 ? 'cota' : 'cotas'}
              </span>
            </div>

            <div className="space-y-1 pt-1 border-t border-white/10 text-[11px] text-stone-300">
              <div className="flex items-center justify-between tabular-nums">
                <span>VGV Realizado: <strong className="text-white">{formatK(faturamentoReal)}</strong></span>
                <span>Meta: <strong className="text-stone-300">{formatK(metaIndividual)}</strong></span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-400 tabular-nums pt-0.5">
                <span>Progresso da meta individual</span>
                <span className="font-bold text-amber-300">{progressPercent}%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenComissoes}
              className="w-full h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/15 shadow-xs"
            >
              <span>Ver Extrato de Comissões</span>
              <ArrowRight className="w-3 h-3 text-stone-300" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

