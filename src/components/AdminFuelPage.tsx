import React, { useState, useMemo } from 'react';
import { 
  Droplets, FileText, Search, Calendar, ChevronLeft, ChevronRight, 
  TrendingUp, Download, Edit2, Trash2, CheckCircle2, Clock, Upload, Loader2, Info 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Cliente, Embarcacao } from '../types';

interface AdminFuelPageProps {
  data: {
    transacoes?: any[];
    boats?: Embarcacao[];
    clients?: Cliente[];
  };
  setData?: React.Dispatch<React.SetStateAction<any>>;
  reloadData?: () => void;
}

export default function AdminFuelPage({ data, setData, reloadData }: AdminFuelPageProps) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Ultimos 30 dias por padrão
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, pix, credit, admin
  
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [modalComprovante, setModalComprovante] = useState<string | null>(null);
  
  // Fuel Edit Modal State
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [liters, setLiters] = useState('');
  const [paymentType, setPaymentType] = useState<'pix' | 'credit' | 'admin'>('pix');
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  
  // Fuel Details Modal
  const [detailsModal, setDetailsModal] = useState<any>(null);

  // Process data for KPIs and Charts
  const fuelTransactions = useMemo(() => {
    const trx = (data?.transacoes || []).filter(t => {
      const isFuelCategory = 
        t.categoria === 'receita_combustivel' || 
        t.categoria === 'Combustível' || 
        t.categoria === 'combustivel' || 
        (t.descricao && (t.descricao.toLowerCase().includes('abastecimento') || t.descricao.toLowerCase().includes('litros')));
      
      if (!isFuelCategory) return false;
      
      const tDate = t.data || t.dataVencimento || t.createdAt?.split('T')[0];
      if (!tDate) return false;
      
      if (tDate < startDate || tDate > endDate) return false;
      
      return true;
    });
    
    // Apply additional filters
    return trx.filter(t => {
      const boat = data?.boats?.find(b => b.id === t.embarcacaoId);
      const client = data?.clients?.find(c => c.id === t.clienteId);
      
      const matchesSearch = 
        boat?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
        
      if (searchTerm && !matchesSearch) return false;
      
      const isPix = t.descricao?.toLowerCase().includes('pix') || t.descricao?.toLowerCase().includes('dinheiro');
      const isCredit = t.descricao?.toLowerCase().includes('cart');
      
      if (paymentFilter === 'pix' && !isPix) return false;
      if (paymentFilter === 'credit' && !isCredit) return false;
      if (paymentFilter === 'admin' && (isPix || isCredit)) return false;
      
      return true;
    }).sort((a, b) => {
      const dateA = a.data || a.dataVencimento || a.createdAt;
      const dateB = b.data || b.dataVencimento || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [data, startDate, endDate, searchTerm, paymentFilter]);

  const { totalLiters, totalRevenue, pixRevenue, creditRevenue, chartData } = useMemo(() => {
    let liters = 0;
    let revenue = 0;
    let pixRev = 0;
    let credRev = 0;
    
    const dailyData: Record<string, number> = {};

    fuelTransactions.forEach(t => {
      const val = Number(t.valor || 0);
      revenue += val;
      
      const isPix = t.descricao?.toLowerCase().includes('pix') || t.descricao?.toLowerCase().includes('dinheiro');
      const isCredit = t.descricao?.toLowerCase().includes('cart');
      
      if (isPix) pixRev += val;
      if (isCredit) credRev += val;

      const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
      let tLiters = 0;
      if (match) {
        tLiters = parseFloat(match[1].replace(',', '.'));
        liters += tLiters;
      }
      
      const dateKey = (t.data || t.dataVencimento || t.createdAt?.split('T')[0] || '').substring(0, 10);
      if (dateKey) {
        if (!dailyData[dateKey]) dailyData[dateKey] = 0;
        dailyData[dateKey] += tLiters;
      }
    });
    
    const chart = Object.keys(dailyData).sort().map(date => ({
      date: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      litros: dailyData[date]
    }));

    return { totalLiters: liters, totalRevenue: revenue, pixRevenue: pixRev, creditRevenue: credRev, chartData: chart };
  }, [fuelTransactions]);

  const handleEditFuel = (t: any) => {
    setEditingTransactionId(t.id);
    setSelectedTransaction(t);
    
    const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
    setLiters(match ? match[1].replace(',', '.') : '');
    
    if (t.descricao?.toLowerCase().includes('cart')) {
      setPaymentType('credit');
    } else if (t.status === 'pendente' || t.descricao?.toLowerCase().includes('cobrar') || t.descricao?.toLowerCase().includes('pós-pago')) {
      setPaymentType('admin');
    } else {
      setPaymentType('pix');
    }
    
    setComprovanteUrl(t.comprovanteUrl || null);
    setIsFuelModalOpen(true);
  };

  const handleDeleteFuel = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento de abastecimento?')) return;
    try {
      const res = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify({ action: 'delete', data: id })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      
      if (setData) {
        setData((prev: any) => ({
          ...prev,
          transacoes: (prev?.transacoes || []).filter((t: any) => t.id !== id)
        }));
      }
      if (reloadData) reloadData();
      alert('Registro excluído com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir registro.');
    }
  };

  const handleSaveFuelTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liters || Number(liters) <= 0) return alert('Informe os litros corretamente.');
    
    setIsSubmitting(true);
    const litersNum = Number(liters);
    let pricePerLiter = 9;
    let paymentStatus = 'pago';
    let paymentLabel = 'Pix/Dinheiro';

    if (paymentType === 'credit') {
      pricePerLiter = 10;
      paymentLabel = 'Cartão de Crédito';
    } else if (paymentType === 'admin') {
      pricePerLiter = 13;
      paymentStatus = 'pendente';
      paymentLabel = 'Pós-pago (Cobrar Cliente)';
    }

    const calculatedValue = litersNum * pricePerLiter;
    const transacao = {
      ...selectedTransaction,
      valor: calculatedValue,
      status: paymentStatus,
      descricao: `Abastecimento: ${litersNum}L a R$${pricePerLiter}/L. Pagamento: ${paymentLabel}`,
      comprovante: comprovanteUrl || null,
      comprovanteUrl: comprovanteUrl || null,
    };

    try {
      const res = await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ action: 'upsert', data: transacao })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Erro ao atualizar.');

      if (setData) {
        setData((prev: any) => ({
          ...prev,
          transacoes: [transacao, ...(prev?.transacoes || []).filter((t: any) => t.id !== transacao.id)]
        }));
      }
      if (reloadData) reloadData();
      setIsFuelModalOpen(false);
      alert('Abastecimento atualizado com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Embarcacao', 'Cliente', 'Litros', 'Valor', 'Status', 'Pagamento'];
    const rows = fuelTransactions.map(t => {
      const boat = data?.boats?.find(b => b.id === t.embarcacaoId)?.nome || 'N/A';
      const client = data?.clients?.find(c => c.id === t.clienteId)?.nome || 'N/A';
      const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
      const liters = match ? match[1] : '0';
      const payment = t.descricao?.toLowerCase().includes('pix') ? 'PIX' : 
                      t.descricao?.toLowerCase().includes('cart') ? 'Cartao' : 'Faturado';
      
      return [
        t.data || t.dataVencimento, 
        boat, 
        client, 
        liters, 
        t.valor, 
        t.status, 
        payment
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `abastecimentos_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      <div className="bg-white border-b border-slate-200 p-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Droplets className="w-6 h-6 text-blue-600" /> Relatório de Abastecimento
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestão de combustível, métricas de consumo e histórico de transações
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase">Período</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-slate-400">até</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-600 uppercase">Pesquisar</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente ou embarcação..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase">Pagamento</label>
            <select 
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Todos os tipos</option>
              <option value="pix">Pix / Dinheiro</option>
              <option value="credit">Cartão de Crédito</option>
              <option value="admin">Faturado (Cobrar)</option>
            </select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg shadow-blue-900/20 p-6 text-white relative overflow-hidden">
            <Droplets className="w-24 h-24 absolute -right-4 -bottom-4 text-white/10" />
            <span className="text-blue-100 text-xs font-bold uppercase tracking-wider block mb-2">Volume Total (Período)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black font-mono tracking-tight">{totalLiters.toFixed(1).replace('.0', '')}</span>
              <span className="text-blue-200 font-bold">Litros</span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-2">Faturamento Bruto</span>
            <div className="flex items-baseline gap-1">
              <span className="text-slate-400 font-bold text-lg">R$</span>
              <span className="text-3xl font-black font-mono text-slate-800 tracking-tight">{totalRevenue.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Receita à vista (Pix)</span>
              <span className="font-mono font-bold text-emerald-600">R$ {pixRevenue.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full mb-3 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${(pixRevenue / (totalRevenue || 1)) * 100}%` }}></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Receita à prazo</span>
              <span className="font-mono font-bold text-amber-600">R$ {(totalRevenue - pixRevenue).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        {/* Gráfico */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Evolução de Consumo
            </h3>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={256} minHeight={256}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="litros" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.litros > 100 ? '#2563eb' : '#60a5fa'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Data Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Data</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Embarcação / Cliente</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Volume</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Pagamento</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fuelTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Nenhum abastecimento encontrado neste período.</td>
                  </tr>
                ) : (
                  fuelTransactions.map(t => {
                    const boat = data?.boats?.find(b => b.id === t.embarcacaoId);
                    const client = data?.clients?.find(c => c.id === t.clienteId);
                    
                    const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
                    const litersVal = match ? match[1] : '?';
                    
                    const isPix = t.descricao?.toLowerCase().includes('pix') || t.descricao?.toLowerCase().includes('dinheiro');
                    const isCredit = t.descricao?.toLowerCase().includes('cart');
                    const isPago = t.status === 'pago';
                    
                    const dateObj = t.data || t.dataVencimento || t.createdAt?.split('T')[0];
                    const dateStr = dateObj ? new Date(dateObj + 'T12:00:00').toLocaleDateString('pt-BR') : '-';

                    return (
                      <tr key={t.id} onClick={() => setDetailsModal(t)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-600">
                          {dateStr}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{boat?.nome || 'N/A'} {boat?.numero ? `#${boat.numero}` : ''}</span>
                            <span className="text-xs text-slate-500 truncate max-w-[200px]">{client?.nome || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-blue-600">{litersVal} L</span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="font-mono text-sm font-medium text-slate-700">R$ {Number(t.valor || 0).toFixed(2).replace('.', ',')}</span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded-md border border-slate-200">
                            {isPix ? 'PIX' : isCredit ? 'Cartão' : 'Faturado'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {isPago ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                              <CheckCircle2 className="w-3 h-3" /> Pago
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">
                              <Clock className="w-3 h-3" /> Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {t.comprovanteUrl && (
                              <button onClick={(e) => { e.stopPropagation(); setModalComprovante(t.comprovanteUrl); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Comprovante">
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleEditFuel(t); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteFuel(t.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Fotográfico Premium para Comprovantes */}
      {modalComprovante && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 flex justify-between items-center bg-transparent relative z-10">
            <h3 className="font-black tracking-tight text-white text-xl">Comprovante de Abastecimento</h3>
            <button 
              onClick={() => setModalComprovante(null)} 
              className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer backdrop-blur-md"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center relative z-0">
            {modalComprovante.endsWith('.pdf') ? (
              <a href={modalComprovante} target="_blank" rel="noreferrer" className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm text-center max-w-sm">
                Visualizar PDF
              </a>
            ) : (
              <img src={modalComprovante} className="w-full max-w-lg rounded-3xl shadow-2xl ring-1 ring-white/10" alt="Comprovante" />
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição (Simplificado) */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Editar Abastecimento</h3>
              <button onClick={() => setIsFuelModalOpen(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1L13 13M1 13L13 1"/>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSaveFuelTransaction} className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Litros Abastecidos (L) *</label>
                <div className="relative">
                  <input 
                    type="text"
                    required
                    value={liters}
                    onChange={(e) => setLiters(e.target.value.replace(',', '.'))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="absolute right-4 top-3.5 text-slate-400 font-bold">L</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Forma de Pagamento</label>
                <select 
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="pix">Pix / Dinheiro (R$ 9,00/L)</option>
                  <option value="credit">Cartão de Crédito (R$ 10,00/L)</option>
                  <option value="admin">Cobrar Depois / Faturado (R$ 13,00/L)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Atualizar Registro</>}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Fuel Details Modal */}
      {detailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Detalhes do Abastecimento
              </h2>
              <button 
                onClick={() => setDetailsModal(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1.5 rounded-lg transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-4">
              {(() => {
                const t = detailsModal;
                const boat = data?.boats?.find(b => b.id === t.embarcacaoId);
                const client = data?.clients?.find(c => c.id === t.clienteId);
                const dateObj = t.data || t.dataVencimento || t.createdAt;
                let dataStr = '-';
                let horaStr = '-';
                if (dateObj) {
                  const d = new Date(dateObj.includes('T') ? dateObj : dateObj + 'T12:00:00');
                  dataStr = d.toLocaleDateString('pt-BR');
                  if (dateObj.includes('T')) {
                    horaStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  }
                }
                const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
                const litersVal = match ? match[1] : '?';
                const marinheiro = t.operador || t.usuario || 'Não registrado';
                const isPago = t.status === 'pago';

                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Data</span>
                        <span className="font-medium text-slate-800">{dataStr} {horaStr !== '-' && <span className="text-slate-500 ml-1">{horaStr}</span>}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Marinheiro/Operador</span>
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          {marinheiro}
                        </span>
                      </div>
                      
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Embarcação</span>
                        <span className="font-bold text-slate-900">{boat?.nome || 'N/A'} {boat?.numero ? `#${boat.numero}` : ''}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cliente</span>
                        <span className="font-medium text-slate-800">{client?.nome || 'N/A'}</span>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <span className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Volume</span>
                        <span className="text-xl font-black font-mono text-blue-700">{litersVal} Litros</span>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <span className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Valor Total</span>
                        <span className="text-xl font-black font-mono text-emerald-700">R$ {Number(t.valor || 0).toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                      <div>
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status do Pagamento</span>
                        <div className="flex items-center gap-2">
                          {isPago ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
                              <Clock className="w-3.5 h-3.5" /> Pendente
                            </span>
                          )}
                          <span className="text-sm font-medium text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                            {(t.descricao?.toLowerCase().includes('pix') || t.descricao?.toLowerCase().includes('dinheiro')) ? 'PIX' : (t.descricao?.toLowerCase().includes('cart') ? 'Cartão' : 'Faturado')}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição / Detalhes</span>
                        <p className="text-sm text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                          {t.descricao || 'Sem descrição'}
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-3">
              {detailsModal?.comprovanteUrl ? (
                <button 
                  onClick={() => {
                    setModalComprovante(detailsModal.comprovanteUrl);
                    setDetailsModal(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors"
                >
                  <FileText className="w-4 h-4" /> Ver Comprovante
                </button>
              ) : (
                <div />
              )}
              <button 
                onClick={() => setDetailsModal(null)}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
