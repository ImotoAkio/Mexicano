import React, { useMemo, useState } from 'react';
import { TransacaoFinanceira } from '../../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FinanceDashboardProps {
  transacoes: TransacaoFinanceira[];
  isAdmin?: boolean;
  empresaFiltro?: string;
  planosContas?: any[];
  privacyMode?: boolean;
}

export default function FinanceDashboard({
  transacoes,
  isAdmin,
  empresaFiltro,
  planosContas = [],
  privacyMode = false,
}: FinanceDashboardProps) {
  const [projectionDays, setProjectionDays] = useState<15 | 30>(15);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    if (privacyMode) return 'R$ ••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Filter transactions by Company
  const filteredTransacoes = useMemo(() => {
    if (!empresaFiltro || empresaFiltro === 'Todos') return transacoes;
    return transacoes.filter(t => t.empresa === empresaFiltro || (!t.empresa && empresaFiltro === 'Mexicano'));
  }, [transacoes, empresaFiltro]);

  // Core KPIs Calculation
  const { saldo, inadimplencia, aReceberMes, aPagarMes } = useMemo(() => {
    const today = new Date();
    const currentMonthStr = today.toISOString().substring(0, 7); // YYYY-MM
    const todayStr = today.toISOString().substring(0, 10);

    let totalReceitasPagas = 0;
    let totalDespesasPagas = 0;
    let inadimplenciaCalc = 0;
    let aReceberCalc = 0;
    let aPagarCalc = 0;

    filteredTransacoes.forEach(t => {
      // Saldo Consolidado
      if (t.status === 'pago') {
        if (t.tipo === 'receita') totalReceitasPagas += Number(t.valor) || 0;
        else totalDespesasPagas += Number(t.valor) || 0;
      }

      // Inadimplência: Receita Vencida ou Lançada mas com data anterior a hoje
      if (t.tipo === 'receita' && (t.status === 'vencido' || (t.status === 'lancado' && t.dataVencimento < todayStr))) {
        inadimplenciaCalc += Number(t.valor) || 0;
      }

      // A Receber / A Pagar no Mês Atual (Aberto)
      if (t.dataVencimento.startsWith(currentMonthStr) && t.status !== 'pago' && t.status !== 'cancelado') {
        if (t.tipo === 'receita') aReceberCalc += Number(t.valor) || 0;
        if (t.tipo === 'despesa') aPagarCalc += Number(t.valor) || 0;
      }
    });

    return {
      saldo: totalReceitasPagas - totalDespesasPagas,
      inadimplencia: inadimplenciaCalc,
      aReceberMes: aReceberCalc,
      aPagarMes: aPagarCalc
    };
  }, [filteredTransacoes, planosContas]);

  // Projection Chart Data
  const projectionData = useMemo(() => {
    const data: Record<string, { dateLabel: string; entradas: number; saidas: number }> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Pre-fill days array
    for (let i = 0; i <= projectionDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const isoDate = d.toISOString().split('T')[0];
      const shortDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      data[isoDate] = { dateLabel: shortDate, entradas: 0, saidas: 0 };
    }

    const endStr = new Date(today);
    endStr.setDate(endStr.getDate() + projectionDays);
    const endDateISO = endStr.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Map transacoes that fall into the projected window
    filteredTransacoes.forEach(t => {
      if (t.status !== 'pago' && t.status !== 'cancelado') {
        if (t.dataVencimento >= todayStr && t.dataVencimento <= endDateISO) {
          if (data[t.dataVencimento]) {
            if (t.tipo === 'receita') {
              data[t.dataVencimento].entradas += Number(t.valor) || 0;
            } else {
              data[t.dataVencimento].saidas += Number(t.valor) || 0;
            }
          }
        }
      }
    });

    return Object.values(data);
  }, [filteredTransacoes, projectionDays]);

  // Mini-DRE Data Grouping
  const miniDreData = useMemo(() => {
    const today = new Date();
    const currentMonthStr = today.toISOString().substring(0, 7);

    const groups: Record<string, { category: string; type: 'receita' | 'despesa'; total: number; amountPaid: number; transactions: TransacaoFinanceira[] }> = {};

    filteredTransacoes.forEach(t => {
      if (t.dataVencimento.startsWith(currentMonthStr) && t.status !== 'cancelado') {
        const plano = planosContas.find((p: any) => p.id === t.planoContasId);
        const catKey = plano ? plano.descricao : (t.categoria || 'Sem Categoria');
        if (!groups[catKey]) {
          groups[catKey] = {
            category: catKey,
            type: t.tipo,
            total: 0,
            amountPaid: 0,
            transactions: []
          };
        }
        groups[catKey].total += Number(t.valor) || 0;
        if (t.status === 'pago') {
          groups[catKey].amountPaid += Number(t.valor) || 0;
        }
        groups[catKey].transactions.push(t);
      }
    });

    const parsedGroups = Object.values(groups).sort((a, b) => b.total - a.total);
    const dreReceitas = parsedGroups.filter(g => g.type === 'receita');
    const dreDespesas = parsedGroups.filter(g => g.type === 'despesa');

    return { dreReceitas, dreDespesas };
  }, [filteredTransacoes, planosContas]);

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      {/* 1. Cards de Métricas / KPIs Superiores (Estilo Padrão Comercial) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Saldo Consolidado */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Saldo Consolidado</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 ${
                  saldo >= 0
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                    : 'text-rose-700 bg-rose-50 border border-rose-200/60'
                }`}
              >
                {saldo >= 0 ? 'Positivo' : 'Atenção'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-xl font-bold tabular-nums ${saldo >= 0 ? 'text-stone-900' : 'text-rose-600'}`}>
              {formatCurrency(saldo)}
            </div>
            <div className="text-xs text-stone-400 mt-0.5 truncate">
              Saldo líquido liquidado das contas
            </div>
          </div>
        </div>

        {/* A Receber (Mês) */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">A Receber (Mês)</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold rounded-md px-1.5 py-0.5 text-emerald-700 bg-emerald-50 border border-emerald-200/60">
                Entradas
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-emerald-700 tabular-nums">
              {formatCurrency(aReceberMes)}
            </div>
            <div className="text-xs text-stone-400 mt-0.5 truncate">
              Receitas programadas neste mês
            </div>
          </div>
        </div>

        {/* A Pagar (Mês) */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">A Pagar (Mês)</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold rounded-md px-1.5 py-0.5 text-amber-700 bg-amber-50 border border-amber-200/60">
                Saídas
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-amber-700 tabular-nums">
              {formatCurrency(aPagarMes)}
            </div>
            <div className="text-xs text-stone-400 mt-0.5 truncate">
              Despesas programadas neste mês
            </div>
          </div>
        </div>

        {/* Total Inadimplência */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Total Inadimplência</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold rounded-md px-1.5 py-0.5 text-rose-700 bg-rose-50 border border-rose-200/60">
                Vencidos
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-rose-600 tabular-nums">
              {formatCurrency(inadimplencia)}
            </div>
            <div className="text-xs text-stone-400 mt-0.5 truncate">
              Receitas pendentes em atraso
            </div>
          </div>
        </div>

      </div>

      {/* 2. Gráfico: Projeção de Fluxo de Caixa */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-stone-900 tracking-tight">Projeção de Fluxo de Caixa</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Entradas vs Saídas programadas para os próximos dias ({empresaFiltro === 'Todos' ? 'Consolidado' : empresaFiltro})
            </p>
          </div>

          <div className="inline-flex rounded-lg bg-stone-100 p-0.5 border border-stone-200/70 gap-0.5 self-start sm:self-auto">
            {[15, 30].map(days => {
              const active = projectionDays === days;
              return (
                <button
                  key={days}
                  onClick={() => setProjectionDays(days as 15 | 30)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60 font-bold'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {days} Dias
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full h-80 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#78716c' }} dy={10} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#78716c' }}
                tickFormatter={(value) => privacyMode ? '•••' : `R$ ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
              />
              <RechartsTooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e7e5e4',
                  boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
                  backgroundColor: '#ffffff',
                  fontSize: '12px'
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: '16px' }} />
              <Line
                type="monotone"
                dataKey="entradas"
                name="Entradas Previstas"
                stroke="#4f7d32"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }}
                activeDot={{ r: 5, fill: '#4f7d32' }}
              />
              <Line
                type="monotone"
                dataKey="saidas"
                name="Saídas Previstas"
                stroke="#b4402f"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }}
                activeDot={{ r: 5, fill: '#b4402f' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Mini-DRE (Mês Atual) */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900 tracking-tight">Mini-DRE (Mês Atual)</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Demonstrativo de Resultados resumido por categoria / plano de contas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Resultado do Mês:</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                (miniDreData.dreReceitas.reduce((acc, curr) => acc + curr.total, 0) -
                  miniDreData.dreDespesas.reduce((acc, curr) => acc + curr.total, 0)) >= 0
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                  : 'text-rose-700 bg-rose-50 border border-rose-200/60'
              }`}
            >
              {formatCurrency(
                miniDreData.dreReceitas.reduce((acc, curr) => acc + curr.total, 0) -
                miniDreData.dreDespesas.reduce((acc, curr) => acc + curr.total, 0)
              )}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone-100">

          {/* Coluna Receitas */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900">Entradas Operacionais</h3>
                  <span className="text-[11px] text-stone-500">Categorias de faturamento</span>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md tabular-nums">
                {formatCurrency(miniDreData.dreReceitas.reduce((acc, curr) => acc + curr.total, 0))}
              </span>
            </div>

            <div className="space-y-2">
              {miniDreData.dreReceitas.length === 0 && (
                <p className="text-stone-400 text-xs py-4 text-center">Nenhuma receita registrada no mês atual.</p>
              )}
              {miniDreData.dreReceitas.map((group) => {
                const isExpanded = expandedRow === `rec-${group.category}`;
                return (
                  <div key={group.category} className="rounded-lg border border-stone-200/70 bg-stone-50/50 overflow-hidden transition-all">
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : `rec-${group.category}`)}
                      className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-stone-100/70 transition-colors text-left"
                    >
                      <span className="text-xs font-semibold text-stone-800 truncate pr-2">{group.category}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-stone-900 tabular-nums">{formatCurrency(group.total)}</p>
                          <p className="text-[10px] text-stone-400 tabular-nums">{formatCurrency(group.amountPaid)} realizado</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-stone-400" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-400" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-3 pb-2 pt-0.5"
                        >
                          <div className="pt-2 border-t border-stone-200/60 space-y-1.5">
                            {group.transactions.map((t, i) => (
                              <div key={t.id || i} className="flex justify-between items-center text-[11px] py-1 border-b border-stone-100 last:border-0">
                                <span className="text-stone-600 truncate max-w-[220px]" title={t.descricao}>
                                  {t.descricao || 'Sem descrição'}
                                </span>
                                <div className="flex items-center gap-2.5 shrink-0">
                                  <span
                                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                      t.status === 'pago'
                                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                                        : 'text-amber-700 bg-amber-50 border border-amber-200/60'
                                    }`}
                                  >
                                    {t.status}
                                  </span>
                                  <span className="font-semibold text-stone-900 w-20 text-right tabular-nums">
                                    {formatCurrency(Number(t.valor))}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna Despesas */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900">Saídas Operacionais</h3>
                  <span className="text-[11px] text-stone-500">Categorias de despesas</span>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-md tabular-nums">
                {formatCurrency(miniDreData.dreDespesas.reduce((acc, curr) => acc + curr.total, 0))}
              </span>
            </div>

            <div className="space-y-2">
              {miniDreData.dreDespesas.length === 0 && (
                <p className="text-stone-400 text-xs py-4 text-center">Nenhuma despesa registrada no mês atual.</p>
              )}
              {miniDreData.dreDespesas.map((group) => {
                const isExpanded = expandedRow === `desp-${group.category}`;
                return (
                  <div key={group.category} className="rounded-lg border border-stone-200/70 bg-stone-50/50 overflow-hidden transition-all">
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : `desp-${group.category}`)}
                      className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-stone-100/70 transition-colors text-left"
                    >
                      <span className="text-xs font-semibold text-stone-800 truncate pr-2">{group.category}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-stone-900 tabular-nums">{formatCurrency(group.total)}</p>
                          <p className="text-[10px] text-stone-400 tabular-nums">{formatCurrency(group.amountPaid)} realizado</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-stone-400" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-400" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-3 pb-2 pt-0.5"
                        >
                          <div className="pt-2 border-t border-stone-200/60 space-y-1.5">
                            {group.transactions.map((t, i) => (
                              <div key={t.id || i} className="flex justify-between items-center text-[11px] py-1 border-b border-stone-100 last:border-0">
                                <span className="text-stone-600 truncate max-w-[220px]" title={t.descricao}>
                                  {t.descricao || 'Sem descrição'}
                                </span>
                                <div className="flex items-center gap-2.5 shrink-0">
                                  <span
                                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                      t.status === 'pago'
                                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                                        : 'text-amber-700 bg-amber-50 border border-amber-200/60'
                                    }`}
                                  >
                                    {t.status}
                                  </span>
                                  <span className="font-semibold text-stone-900 w-20 text-right tabular-nums">
                                    {formatCurrency(Number(t.valor))}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
