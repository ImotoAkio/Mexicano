import React, { useMemo } from 'react';
import { TransacaoFinanceira } from '../../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

interface FinanceDashboardProps {
  transacoes: TransacaoFinanceira[];
}

export default function FinanceDashboard({ transacoes }: FinanceDashboardProps) {
  // Calculando resumos
  const totalReceitas = transacoes
    .filter(t => t.tipo === 'receita' && t.status === 'pago')
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const totalDespesas = transacoes
    .filter(t => t.tipo === 'despesa' && t.status === 'pago')
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const saldo = totalReceitas - totalDespesas;

  const totalInadimplencia = transacoes
    .filter(t => t.tipo === 'receita' && (t.status === 'atrasado' || (t.status === 'pendente' && new Date(t.dataVencimento) < new Date())))
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const pieData = [
    { name: 'Receitas', value: totalReceitas, color: '#10B981' }, // emerald-500
    { name: 'Despesas', value: totalDespesas, color: '#EF4444' }, // red-500
  ];

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

    transacoes.forEach(t => {
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
  }, [transacoes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#2A2D35] p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Total Receitas (Pagas)</h3>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalReceitas)}</p>
          </div>
        </div>

        <div className="bg-[#2A2D35] p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Total Despesas (Pagas)</h3>
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalDespesas)}</p>
          </div>
        </div>

        <div className="bg-[#2A2D35] p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Saldo Atual</h3>
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <p className={`text-3xl font-bold ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(saldo)}
            </p>
          </div>
        </div>

        <div className="bg-[#2A2D35] p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Inadimplência</h3>
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-rose-400">{formatCurrency(totalInadimplencia)}</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#2A2D35] p-6 rounded-xl border border-white/5 shadow-lg lg:col-span-1">
          <h3 className="text-lg font-medium text-white mb-6">Receitas vs Despesas</h3>
          <div className="h-64 w-full" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#1A1C23', borderColor: '#374151', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#2A2D35] p-6 rounded-xl border border-white/5 shadow-lg lg:col-span-2">
          <h3 className="text-lg font-medium text-white mb-6">Fluxo de Caixa (Últimos 6 meses)</h3>
          <div className="h-64 w-full" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis 
                  stroke="#9CA3AF" 
                  tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000) + 'k' : value}`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#1A1C23', borderColor: '#374151', color: '#fff' }}
                  cursor={{ fill: '#374151', opacity: 0.4 }}
                />
                <Legend />
                <Bar dataKey="receitas" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
