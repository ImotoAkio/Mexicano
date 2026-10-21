import React from 'react';
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
} from 'lucide-react';
import { useComercialSettings } from './ComercialSettingsModal';

/* ───────────────────────── Shared ───────────────────────── */

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={`bg-white rounded-2xl border border-stone-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-[13px] font-semibold text-stone-900">{title}</h3>
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
        positive ? 'bg-mx-green-50 text-mx-green' : 'bg-mx-red-50 text-mx-red'
      }`}
    >
      <Icon className="w-3 h-3" />
      {value}
    </span>
  );
}

/* ───────────────────────── KPI cards ───────────────────────── */

export function KpiRow() {
  const [settings] = useComercialSettings();

  const leadsAtual = 1284;
  const contratosAtual = 64;
  const metaLeads = settings.metaNovosLeads || 1284;
  const metaContratos = settings.metaNovosContratos || 64;

  const leadsPct = Math.min(100, Math.round((leadsAtual / Math.max(1, metaLeads)) * 100));
  const contratosPct = Math.min(100, Math.round((contratosAtual / Math.max(1, metaContratos)) * 100));

  const kpis = [
    {
      label: 'Novos leads',
      value: leadsAtual.toLocaleString('pt-BR'),
      delta: '15,5%',
      positive: true,
      prev: '1.112',
      metaLabel: `Meta: ${metaLeads.toLocaleString('pt-BR')} (${leadsPct}%)`,
      progress: leadsPct,
      icon: UserPlus,
    },
    {
      label: 'Visitas agendadas',
      value: '326',
      delta: '8,4%',
      positive: true,
      prev: '301',
      icon: CalendarCheck,
    },
    {
      label: 'Propostas enviadas',
      value: '148',
      delta: '10,5%',
      positive: false,
      prev: '165',
      icon: Send,
    },
    {
      label: 'Contratos fechados',
      value: contratosAtual.toLocaleString('pt-BR'),
      delta: '4,4%',
      positive: true,
      prev: '61',
      metaLabel: `Meta: ${metaContratos.toLocaleString('pt-BR')} (${contratosPct}%)`,
      progress: contratosPct,
      icon: FileSignature,
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map(k => {
        const Icon = k.icon;
        return (
          <Card key={k.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-stone-700">{k.label}</span>
              <Icon className="w-4 h-4 text-mx-ink" strokeWidth={2} />
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[26px] leading-none font-semibold text-stone-900 tabular-nums tracking-tight">{k.value}</span>
              <Delta value={k.delta} positive={k.positive} />
            </div>
            {k.metaLabel ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="font-medium text-stone-600">{k.metaLabel}</span>
                  <span className="text-stone-400">vs. {k.prev}</span>
                </div>
                <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-mx-ink rounded-full transition-all duration-300"
                    style={{ width: `${k.progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-stone-400">
                vs. <span className="tabular-nums">{k.prev}</span> no período anterior
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Revenue ───────────────────────── */

const REVENUE = [
  { d: '1 out', atual: 8200, anterior: 6100 },
  { d: '2 out', atual: 9400, anterior: 6800 },
  { d: '3 out', atual: 8800, anterior: 7200 },
  { d: '4 out', atual: 11200, anterior: 7900 },
  { d: '5 out', atual: 12600, anterior: 8400 },
  { d: '6 out', atual: 9600, anterior: 7600 },
  { d: '7 out', atual: 10200, anterior: 6900 },
  { d: '8 out', atual: 9100, anterior: 7400 },
  { d: '9 out', atual: 8300, anterior: 6200 },
  { d: '10 out', atual: 10800, anterior: 5563 },
  { d: '11 out', atual: 12324, anterior: 7100 },
  { d: '12 out', atual: 13600, anterior: 8300 },
  { d: '13 out', atual: 12100, anterior: 7900 },
  { d: '14 out', atual: 14200, anterior: 8800 },
];

function RevenueTooltip({ active, payload, label, hideValues }: any) {
  if (!active || !payload?.length) return null;
  const atual = payload.find((p: any) => p.dataKey === 'atual')?.value ?? 0;
  const anterior = payload.find((p: any) => p.dataKey === 'anterior')?.value ?? 0;
  const fmt = (n: number) =>
    hideValues
      ? 'R$ •••••'
      : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  return (
    <div className="rounded-lg bg-white border border-stone-200 shadow-lg px-3 py-2 text-[11px]">
      <p className="font-semibold text-stone-900 mb-1">{label} 2026</p>
      <p className="flex items-center gap-1.5 text-stone-600">
        <span className="w-2 h-2 rounded-sm bg-mx-ink" />
        <span className="font-semibold text-stone-900 tabular-nums">{fmt(atual)}</span> este mês
      </p>
      <p className="flex items-center gap-1.5 text-stone-600">
        <span className="w-2 h-2 rounded-sm bg-stone-300" />
        <span className="font-semibold text-stone-900 tabular-nums">{fmt(anterior)}</span> mês anterior
      </p>
    </div>
  );
}

const SEGMENTS = [
  { label: 'Cotistas', value: '284', icon: Users, color: 'bg-mx-ink', text: 'text-mx-ink' },
  { label: 'Mensalistas', value: '143', icon: CalendarClock, color: 'bg-mx-green-400', text: 'text-mx-green-400' },
  { label: 'Avulsos', value: '56', icon: Ticket, color: 'bg-mx-red-400', text: 'text-mx-red-400' },
];

export function RevenueCard() {
  const [settings] = useComercialSettings();
  const hide = settings.ocultarValoresDashboard;
  const faturamento = settings.faturamentoAtual || 486200;
  const meta = settings.metaMensalFaturamento || 600000;
  const pct = Math.min(100, Math.round((faturamento / Math.max(1, meta)) * 100));

  const formatCompactBRL = (val: number) => {
    if (hide) return 'R$ ••••••';
    if (val >= 1000) {
      return `R$ ${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
    }
    return `R$ ${val.toLocaleString('pt-BR')}`;
  };

  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_1fr] gap-4">
        <div className="flex flex-col">
          <h3 className="text-[13px] font-semibold text-stone-900">Receita total</h3>
          <div className="mt-auto pt-6 md:pt-0">
            <p className="text-[32px] leading-none font-semibold text-stone-900 tracking-tight tabular-nums">
              {formatCompactBRL(faturamento)}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-stone-400">
              <Delta value="24,4%" positive /> vs. período anterior
            </p>
            <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-500 font-medium">Meta: {formatCompactBRL(meta)}</span>
                <span className="font-bold text-stone-800 tabular-nums">{pct}%</span>
              </div>
              <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-mx-ink rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="h-[150px] -mr-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REVENUE} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2b1120" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#2b1120" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f3eeea" />
              <XAxis
                dataKey="d"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#a8a09b' }}
                interval={3}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#a8a09b' }}
                tickFormatter={v => (hide ? '•••' : v === 0 ? '0' : `${v / 1000}K`)}
                ticks={[0, 5000, 10000, 15000]}
              />
              <Tooltip content={<RevenueTooltip hideValues={hide} />} cursor={{ stroke: '#d6cdc8', strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="anterior" stroke="#d6cdc8" strokeDasharray="4 4" strokeWidth={1.5} fill="none" dot={false} />
              <Area type="monotone" dataKey="atual" stroke="#2b1120" strokeWidth={2} fill="url(#revFill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-stone-200/80 p-4">
        <CardHeader title="Carteira de clientes" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          {SEGMENTS.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label}>
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${s.text}`} />
                  <span className="text-[20px] font-semibold text-stone-900 tabular-nums leading-none">{s.value}</span>
                </div>
                <p className="mt-1 text-[11px] text-stone-400">{s.label}</p>
                <div className={`mt-2 h-1.5 rounded-full ${s.color}`} />
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/* ───────────────────────── Top plans table ───────────────────────── */

const PLANS = [
  { id: '#C3009', name: 'Cota Lancha Focker 272', icon: Ship, sold: '42 vendas', revenue: 'R$ 124.639', rating: '5,0' },
  { id: '#V3001', name: 'Vaga Molhada até 30 pés', icon: Anchor, sold: '38 vendas', revenue: 'R$ 92.562', rating: '4,8' },
  { id: '#V3004', name: 'Vaga Seca Jet Ski', icon: Waves, sold: '31 vendas', revenue: 'R$ 74.048', rating: '4,7' },
  { id: '#M3002', name: 'Plano Marinheiro Mensal', icon: KeyRound, sold: '27 vendas', revenue: 'R$ 62.820', rating: '4,5' },
  { id: '#P3002', name: 'Pacote Combustível Premium', icon: Fuel, sold: '22 vendas', revenue: 'R$ 48.724', rating: '4,5' },
];

export function TopPlansCard() {
  const [settings] = useComercialSettings();
  const isCompact = settings.densidadeTabelas === 'compacta';
  const hide = settings.ocultarValoresDashboard;
  const rowPy = isCompact ? 'py-1.5' : 'py-3';

  return (
    <Card className="p-5">
      <CardHeader title="Planos mais vendidos" />
      <div className="mt-3 -mx-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-stone-400 border-y border-stone-100 bg-stone-50/60">
              <th className="text-left font-medium py-2 pl-5 w-20">ID</th>
              <th className="text-left font-medium py-2">Plano</th>
              <th className="text-right font-medium py-2">Vendidos</th>
              <th className="text-right font-medium py-2">Receita</th>
              <th className="text-right font-medium py-2 pr-5">Avaliação</th>
            </tr>
          </thead>
          <tbody>
            {PLANS.map(p => {
              const Icon = p.icon;
              return (
                <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/70 transition-colors">
                  <td className={`${rowPy} pl-5 text-stone-500 tabular-nums`}>{p.id}</td>
                  <td className={rowPy}>
                    <div className="flex items-center gap-2.5">
                      <span className={`${isCompact ? 'w-6 h-6' : 'w-7 h-7'} rounded-lg bg-stone-100 flex items-center justify-center text-stone-700`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-medium text-stone-800 truncate">{p.name}</span>
                    </div>
                  </td>
                  <td className={`${rowPy} text-right text-stone-500 tabular-nums`}>{p.sold}</td>
                  <td className={`${rowPy} text-right`}>
                    <span className="inline-block rounded-md bg-mx-green-50 text-mx-green font-semibold px-1.5 py-0.5 tabular-nums">
                      {hide ? 'R$ ••••••' : p.revenue}
                    </span>
                  </td>
                  <td className={`${rowPy} pr-5 text-right text-stone-500 tabular-nums`}>
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> ({p.rating})
                    </span>
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

const DAYS = [
  { d: 'Dom', v: 62 },
  { d: 'Seg', v: 38 },
  { d: 'Ter', v: 44 },
  { d: 'Qua', v: 52 },
  { d: 'Qui', v: 34 },
  { d: 'Sex', v: 58 },
  { d: 'Sáb', v: 100, peak: '186' },
];

export function ActiveDayCard() {
  return (
    <Card className="p-5">
      <CardHeader title="Dia com mais atendimentos" />
      <div className="mt-4 h-[150px] flex items-end gap-2.5">
        {DAYS.map(day => (
          <div key={day.d} className="flex-1 h-full flex flex-col items-center justify-end gap-2">
            {day.peak && <span className="text-[12px] font-semibold text-stone-900 tabular-nums">{day.peak}</span>}
            <div
              className={`w-full rounded-lg ${
                day.peak
                  ? 'bg-gradient-to-b from-mx-ink-500 to-mx-ink shadow-[0_6px_14px_-6px_rgba(43,17,32,0.7)]'
                  : 'bg-stone-100'
              }`}
              style={{ height: `${day.v * 0.78}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2.5">
        {DAYS.map(day => (
          <span
            key={day.d}
            className={`flex-1 text-center text-[11px] ${day.peak ? 'text-mx-ink font-semibold' : 'text-stone-400'}`}
          >
            {day.d}
          </span>
        ))}
      </div>
    </Card>
  );
}

/* ───────────────────────── Conversion gauge ───────────────────────── */

export function ConversionGaugeCard() {
  const value = 68;
  const ticks = 48;
  const cx = 110;
  const cy = 104;
  const rOuter = 96;
  const rInner = 74;
  const filled = Math.round((value / 100) * ticks);

  return (
    <Card className="p-5">
      <CardHeader title="Taxa de conversão" />
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
                stroke={on ? (i / filled < 0.5 ? '#4f7d32' : '#6a9449') : '#ece5e0'}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-[30px] leading-none font-semibold text-stone-900 tabular-nums tracking-tight">{value}%</span>
          <span className="mt-1 text-[11px] text-stone-400">Acima da meta de 60%</span>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <button className="h-7 px-3 rounded-lg border border-stone-200 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer">
          Ver detalhes
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
        title="Assistente IA"
        action={
          <button className="w-7 h-7 -mr-1.5 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        }
      />
      <div className="flex-1 min-h-[140px] flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 translate-y-6 scale-x-110 rounded-full bg-mx-ink-500/30 blur-xl" />
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
        <span className="flex-1 text-[12px] text-stone-400 truncate">Pergunte sobre suas vendas…</span>
        <Mic className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <button className="w-7 h-7 rounded-full bg-mx-ink hover:bg-mx-ink-700 text-white flex items-center justify-center transition-colors cursor-pointer">
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  );
}
