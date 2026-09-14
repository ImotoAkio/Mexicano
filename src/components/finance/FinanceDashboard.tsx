import React, { useMemo, useRef, useState } from 'react';
import { TransacaoFinanceira } from '../../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, CalendarClock, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

interface FinanceDashboardProps {
  transacoes: TransacaoFinanceira[];
  isAdmin?: boolean;
  empresaFiltro?: string;
}

export default function FinanceDashboard({ transacoes, isAdmin, empresaFiltro }: FinanceDashboardProps) {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Consider company filter for the dashboard itself if needed,
  // but if it's 'Todos', we use all.
  const filteredTransacoes = useMemo(() => {
    if (!empresaFiltro || empresaFiltro === 'Todos') return transacoes;
    return transacoes.filter(t => t.empresa === empresaFiltro || (!t.empresa && empresaFiltro === 'Mexicano'));
  }, [transacoes, empresaFiltro]);

  // Calculando resumos
  const totalReceitas = filteredTransacoes
    .filter(t => t.tipo === 'receita' && t.status === 'pago')
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const totalDespesas = filteredTransacoes
    .filter(t => t.tipo === 'despesa' && t.status === 'pago')
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const saldo = totalReceitas - totalDespesas;

  const totalInadimplencia = filteredTransacoes
    .filter(t => t.tipo === 'receita' && (t.status === 'vencido' || (t.status === 'lancado' && t.dataVencimento < todayStr)))
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const provisaoFuturaReceitas = filteredTransacoes
    .filter(t => t.tipo === 'receita' && t.status === 'lancado' && t.dataVencimento >= todayStr)
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const defaultPieData = [
    { name: 'Receitas', value: totalReceitas, color: '#10B981' }, // emerald-500
    { name: 'Despesas', value: totalDespesas, color: '#EF4444' }, // red-500
  ];

  const showComparatives = isAdmin && (!empresaFiltro || empresaFiltro === 'Todos');

  const receitasByCompany = useMemo(() => {
    const data: Record<string, {name: string, value: number, fill: string}> = {};
    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];
    let cIdx = 0;
    filteredTransacoes.forEach(t => {
      if (t.tipo === 'receita' && t.status === 'pago') {
        const emp = t.empresa || 'Não Informada';
        if (!data[emp]) {
          data[emp] = { name: emp, value: 0, fill: colors[cIdx % colors.length] };
          cIdx++;
        }
        data[emp].value += Number(t.valor);
      }
    });
    return Object.values(data);
  }, [filteredTransacoes]);

  // Agrupamento por mês (últimos 6 meses)
  const barData = useMemo(() => {
    const data: Record<string, { name: string, receitas: number, despesas: number }> = {};
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      data[key] = {
        name: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        receitas: 0,
        despesas: 0
      };
    }

    filteredTransacoes.forEach(t => {
      if (t.status !== 'pago') return;
      const tDate = t.dataPagamento ? t.dataPagamento.substring(0, 7) : t.dataVencimento.substring(0, 7);
      if (data[tDate]) {
        if (t.tipo === 'receita') {
          data[tDate].receitas += Number(t.valor);
        } else {
          data[tDate].despesas += Number(t.valor);
        }
      }
    });

    return Object.values(data);
  }, [filteredTransacoes]);

  // Futuro bar data
  const futureBarData = useMemo(() => {
    const data: Record<string, { name: string, previsto: number }> = {};
    const today = new Date();

    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      data[key] = {
        name: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        previsto: 0
      };
    }

    filteredTransacoes.forEach(t => {
      if (t.tipo === 'receita' && t.status === 'lancado' && t.dataVencimento >= todayStr) {
        const tDate = t.dataVencimento.substring(0, 7);
        if (data[tDate]) {
          data[tDate].previsto += Number(t.valor);
        }
      }
    });
    return Object.values(data);
  }, [filteredTransacoes, todayStr]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await toPng(dashboardRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const doc = new jsPDF('l', 'mm', 'a4'); // landscape
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      const imgProps = doc.getImageProperties(canvas);
      const imgRatio = imgProps.width / imgProps.height;
      const pdfRatio = pdfWidth / pdfHeight;

      let drawWidth = pdfWidth;
      let drawHeight = pdfWidth / imgRatio;

      if (pdfRatio < imgRatio) {
        drawHeight = pdfWidth / imgRatio;
      } else {
        drawWidth = pdfHeight * imgRatio;
        drawHeight = pdfHeight;
      }

      doc.addImage(canvas, 'PNG', 0, 0, drawWidth, drawHeight);
      doc.save(`Dashboard_Financeiro_${todayStr}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Falha ao exportar dashboard.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex justify-end mb-4">
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exportando...' : 'Exportar Relatório Consolidado'}
        </button>
      </div>

      <div ref={dashboardRef} className="space-y-6 pt-2 pb-4 px-2 rounded-xl" style={{ backgroundColor: isExporting ? '#ffffff' : 'transparent' }}>
        {isExporting && (
           <div className="text-center pb-4 text-slate-800 font-bold text-xl">
             Relatório Consolidado - Dashboard Financeiro
           </div>
        )}

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-500 font-medium text-sm">Transações (Pagas)</h3>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalReceitas)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-500 font-medium text-sm">Despesas (Pagas)</h3>
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalDespesas)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-500 font-medium text-sm">Saldo Atual</h3>
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(saldo)}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-500 font-medium text-sm">Inadimplência</h3>
                <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-rose-400">{formatCurrency(totalInadimplencia)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-500 font-medium text-sm">Provisão Futura</h3>
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-cyan-400">{formatCurrency(provisaoFuturaReceitas)}</p>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shadow-lg lg:col-span-1">
            <h3 className="text-lg font-medium text-slate-800 mb-6">
              {showComparatives ? 'Receitas por Empresa' : 'Receitas vs Despesas'}
            </h3>
            <div className="h-64 w-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={showComparatives ? (receitasByCompany.length > 0 ? receitasByCompany : [{ name: 'Sem Dados', value: 1, fill: '#6B7280' }]) : defaultPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(showComparatives ? (receitasByCompany.length > 0 ? receitasByCompany : [{ name: 'Sem Dados', value: 1, fill: '#6B7280' }]) : defaultPieData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry as any).fill || (entry as any).color || '#10B981'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shadow-lg lg:col-span-2">
            <h3 className="text-lg font-medium text-slate-800 mb-6">Fluxo de Caixa Realizado (Últimos 6 meses)</h3>
            <div className="h-64 w-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" />
                  <YAxis
                    stroke="#64748B"
                    tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000) + 'k' : value}`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a' }}
                    cursor={{ fill: '#374151', opacity: 0.4 }}
                  />
                  <Legend />
                  <Bar dataKey="receitas" name="Receitas Realizadas" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas Realizadas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New row for Provisão Futura */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shadow-lg lg:col-span-3">
            <h3 className="text-lg font-medium text-slate-800 mb-6">Previsão e Provisão Futura de Parcelas (Próximos 6 meses)</h3>
            <div className="h-64 w-full" style={{ minWidth: 0 }}>
               <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={futureBarData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" />
                  <YAxis
                    stroke="#64748B"
                    tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000) + 'k' : value}`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a' }}
                    cursor={{ fill: '#374151', opacity: 0.4 }}
                  />
                  <Legend />
                  <Bar dataKey="previsto" name="Provisão/Previsto (Receitas)" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
