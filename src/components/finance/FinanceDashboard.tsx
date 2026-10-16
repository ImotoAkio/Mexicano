import React, { useMemo, useState } from 'react';
import { TransacaoFinanceira } from '../../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FinanceDashboardProps {
  transacoes: TransacaoFinanceira[];
  isAdmin?: boolean;
  empresaFiltro?: string;
  planosContas?: any[];
}

export default function FinanceDashboard({ transacoes, isAdmin, empresaFiltro, planosContas = [] }: FinanceDashboardProps) {
  const [projectionDays, setProjectionDays] = useState<15 | 30>(15);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
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
        if (t.tipo === 'receita') totalReceitasPagas += Number(t.valor);
        else totalDespesasPagas += Number(t.valor);
      }

      // Inadimplência: Receita Vencida ou Lançada mas com data anterior a hoje
      if (t.tipo === 'receita' && (t.status === 'vencido' || (t.status === 'lancado' && t.dataVencimento < todayStr))) {
        inadimplenciaCalc += Number(t.valor);
      }

      // A Receber / A Pagar no Mês Atual (Aberto)
      if (t.dataVencimento.startsWith(currentMonthStr) && t.status !== 'pago' && t.status !== 'cancelado') {
        if (t.tipo === 'receita') aReceberCalc += Number(t.valor);
        if (t.tipo === 'despesa') aPagarCalc += Number(t.valor);
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
              data[t.dataVencimento].entradas += Number(t.valor);
            } else {
              data[t.dataVencimento].saidas += Number(t.valor);
            }
          }
        }
      }
    });

    return Object.values(data);
  }, [filteredTransacoes, projectionDays]);

  // Mini-DRE Data Grouping (All historical or current month? Let's use current month closed/expected)
  const miniDreData = useMemo(() => {
    const today = new Date();
    const currentMonthStr = today.toISOString().substring(0, 7);

    // Group by category for the current month
    const groups: Record<string, { category: string; type: 'receita' | 'despesa'; total: number; amountPaid: number; transactions: TransacaoFinanceira[] }> = {};

    filteredTransacoes.forEach(t => {
      // Only include current month transactions
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
        groups[catKey].total += Number(t.valor);
        if (t.status === 'pago') {
          groups[catKey].amountPaid += Number(t.valor);
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
    <div className="space-y-6 animate-fade-in relative max-w-7xl mx-auto w-full">
      {/* 1. KPIs Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Consolidado */}
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[14px] font-medium text-[#86868b]">Saldo Consolidado</h3>
            <div className="w-8 h-8 rounded-full bg-[#10b981]/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#10b981]" />
            </div>
          </div>
          <div>
            <p className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight leading-none mb-1">
              {formatCurrency(saldo)}
            </p>
            <p className="text-[12px] font-medium text-[#86868b]">Saldo líquido pago das contas</p>
          </div>
        </div>

        {/* Inadimplência */}
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[14px] font-medium text-[#86868b]">Total Inadimplência</h3>
            <div className="w-8 h-8 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-[#ef4444]" />
            </div>
          </div>
          <div>
            <p className="text-[28px] font-semibold text-[#ef4444] tracking-tight leading-none mb-1">
              {formatCurrency(inadimplencia)}
            </p>
            <p className="text-[12px] font-medium text-[#86868b]">Receitas em atraso</p>
          </div>
        </div>

        {/* A Receber no Mês */}
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[14px] font-medium text-[#86868b]">A Receber (Mês)</h3>
            <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#0071e3]" />
            </div>
          </div>
          <div>
            <p className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight leading-none mb-1">
              {formatCurrency(aReceberMes)}
            </p>
            <p className="text-[12px] font-medium text-[#86868b]">Valores esperados este mês</p>
          </div>
        </div>

        {/* A Pagar no Mês */}
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[14px] font-medium text-[#86868b]">A Pagar (Mês)</h3>
            <div className="w-8 h-8 rounded-full bg-[#f59e0b]/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-[#f59e0b]" />
            </div>
          </div>
          <div>
            <p className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight leading-none mb-1">
              {formatCurrency(aPagarMes)}
            </p>
            <p className="text-[12px] font-medium text-[#86868b]">Despesas programadas este mês</p>
          </div>
        </div>
      </div>

      {/* 2. Gráfico: Projeção de Fluxo de Caixa */}
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-[18px] font-semibold text-[#1d1d1f]">Projeção de Fluxo de Caixa</h2>
            <p className="text-[13px] font-medium text-[#86868b]">Entradas vs Saídas programadas para os próximos dias</p>
          </div>

          <div className="flex bg-[#e5e5ea]/50 p-1 rounded-full">
            {[15, 30].map(days => {
              const active = projectionDays === days;
              return (
                <button
                  key={days}
                  onClick={() => setProjectionDays(days as 15 | 30)}
                  className={`relative z-10 px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors cursor-pointer ${
                    active ? 'text-[#1d1d1f]' : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="projectionDaysToggle"
                      className="absolute inset-0 bg-white rounded-full shadow-sm border border-black/[0.04]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  {days} Dias
                </button>
              )
            })}
          </div>
        </div>

        <div className="w-full h-72 min-w-0 min-h-[288px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}>
            <LineChart data={projectionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5ea" />
              <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#86868b' }} dy={10} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#86868b' }}
                tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000) + 'k' : value}`}
              />
              <RechartsTooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13, paddingTop: '10px' }} />
              <Line type="monotone" dataKey="entradas" name="Entradas Previstas" stroke="#10b981" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="saidas" name="Saídas Previstas" stroke="#ef4444" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Mini-DRE */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 pb-4 border-b border-black/[0.05]">
          <h2 className="text-[18px] font-semibold text-[#1d1d1f]">Mini-DRE (Mês Atual)</h2>
          <p className="text-[13px] font-medium text-[#86868b]">Análise de Receitas e Despesas por Categoria / Plano de Contas</p>
        </div>

        <div className="p-0 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-black/[0.05]">

          {/* Coluna Receitas */}
          <div className="flex-1 p-6 bg-[#10b981]/5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[15px] font-semibold text-[#008f5d]">Entradas Operacionais</h3>
              <p className="text-[16px] font-bold text-[#008f5d]">
                {formatCurrency(miniDreData.dreReceitas.reduce((acc, curr) => acc + curr.total, 0))}
              </p>
            </div>

            <div className="space-y-3">
              {miniDreData.dreReceitas.length === 0 && (
                <p className="text-[#86868b] text-[13px]">Nenhuma receita no mês atual.</p>
              )}
              {miniDreData.dreReceitas.map((group) => {
                const isExpanded = expandedRow === `rec-${group.category}`;
                return (
                  <div key={group.category} className="bg-white rounded-xl border border-black/[0.05] overflow-hidden">
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : `rec-${group.category}`)}
                      className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-black/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#10b981]/10 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-[#10b981]" />
                        </div>
                        <span className="text-[14px] font-medium text-[#1d1d1f]">{group.category}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[14px] font-semibold text-[#1d1d1f]">{formatCurrency(group.total)}</p>
                          <p className="text-[11px] text-[#86868b]">{formatCurrency(group.amountPaid)} realizado</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#86868b]" /> : <ChevronDown className="w-4 h-4 text-[#86868b]" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 pt-1"
                        >
                          <div className="pt-3 border-t border-black/[0.05] space-y-2">
                            {group.transactions.map((t, i) => (
                              <div key={t.id || i} className="flex justify-between items-center text-[13px]">
                                <span className="text-[#86868b] truncate max-w-[200px]" title={t.descricao}>
                                  {t.descricao}
                                </span>
                                <div className="flex items-center gap-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold ${t.status === 'pago' ? 'bg-[#10b981]/15 text-[#008f5d]' : 'bg-[#f59e0b]/15 text-[#b45309]'}`}>
                                    {t.status}
                                  </span>
                                  <span className="font-medium text-[#1d1d1f] w-24 text-right">
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
          <div className="flex-1 p-6 bg-[#ef4444]/5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[15px] font-semibold text-[#e30000]">Saídas Operacionais</h3>
              <p className="text-[16px] font-bold text-[#e30000]">
                {formatCurrency(miniDreData.dreDespesas.reduce((acc, curr) => acc + curr.total, 0))}
              </p>
            </div>

            <div className="space-y-3">
              {miniDreData.dreDespesas.length === 0 && (
                <p className="text-[#86868b] text-[13px]">Nenhuma despesa no mês atual.</p>
              )}
              {miniDreData.dreDespesas.map((group) => {
                const isExpanded = expandedRow === `desp-${group.category}`;
                return (
                  <div key={group.category} className="bg-white rounded-xl border border-black/[0.05] overflow-hidden">
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : `desp-${group.category}`)}
                      className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-black/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
                          <TrendingDown className="w-4 h-4 text-[#ef4444]" />
                        </div>
                        <span className="text-[14px] font-medium text-[#1d1d1f]">{group.category}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[14px] font-semibold text-[#1d1d1f]">{formatCurrency(group.total)}</p>
                          <p className="text-[11px] text-[#86868b]">{formatCurrency(group.amountPaid)} realizado</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#86868b]" /> : <ChevronDown className="w-4 h-4 text-[#86868b]" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 pt-1"
                        >
                          <div className="pt-3 border-t border-black/[0.05] space-y-2">
                            {group.transactions.map((t, i) => (
                              <div key={t.id || i} className="flex justify-between items-center text-[13px]">
                                <span className="text-[#86868b] truncate max-w-[200px]" title={t.descricao}>
                                  {t.descricao}
                                </span>
                                <div className="flex items-center gap-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold ${t.status === 'pago' ? 'bg-[#10b981]/15 text-[#008f5d]' : 'bg-[#f59e0b]/15 text-[#b45309]'}`}>
                                    {t.status}
                                  </span>
                                  <span className="font-medium text-[#1d1d1f] w-24 text-right">
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