import React, { useState, useMemo } from 'react';
import { 
  Droplets, FileText, Search, Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, SlidersHorizontal,
  TrendingUp, Download, Edit2, Trash2, CheckCircle2, Clock, Upload, Loader2, Info, User as UserIcon, Building2,
  DollarSign, Filter, Paperclip, Eye, X, Check, CreditCard, QrCode, Banknote, FileCheck, ArrowUpRight, ShieldCheck, AlertCircle, RefreshCw
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
    reservations?: any[];
  };
  setData?: React.Dispatch<React.SetStateAction<any>>;
  reloadData?: () => void;
}

export default function AdminFuelPage({ data, setData, reloadData }: AdminFuelPageProps) {
  // Atalhos de Período Padrão (Últimos 30 dias)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filtros Avançados & Painel Retrátil
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [boatFilter, setBoatFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all'); // all, pix, credit, debit, dinheiro, admin
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, cobrado, pendente
  const [originFilter, setOriginFilter] = useState<string>('all'); // all, marina, direto

  const activeFilterCount = (boatFilter !== 'all' ? 1 : 0) + 
    (clientFilter !== 'all' ? 1 : 0) + 
    (statusFilter !== 'all' ? 1 : 0) + 
    (paymentFilter !== 'all' ? 1 : 0) + 
    (originFilter !== 'all' ? 1 : 0) + 
    (searchTerm.trim() ? 1 : 0);

  const handleResetFilters = () => {
    setBoatFilter('all');
    setClientFilter('all');
    setStatusFilter('all');
    setPaymentFilter('all');
    setOriginFilter('all');
    setSearchTerm('');
  };

  // Modais e Estados
  const [modalComprovante, setModalComprovante] = useState<string | null>(null);
  const [detailsModal, setDetailsModal] = useState<any>(null);

  // Modal de Edição Geral
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [liters, setLiters] = useState('');
  const [paymentType, setPaymentType] = useState<'pix' | 'credit' | 'debit' | 'dinheiro' | 'admin'>('pix');
  const [statusCobrancaModal, setStatusCobrancaModal] = useState<'cobrado' | 'pendente'>('cobrado');
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingComprovante, setIsUploadingComprovante] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  // Modal de Baixa de Cobrança (Pendente -> Cobrado)
  const [isBaixaModalOpen, setIsBaixaModalOpen] = useState(false);
  const [baixaTransaction, setBaixaTransaction] = useState<any>(null);
  const [baixaPaymentType, setBaixaPaymentType] = useState<'pix' | 'credit' | 'debit' | 'dinheiro' | 'admin'>('pix');
  const [baixaComprovanteUrl, setBaixaComprovanteUrl] = useState<string | null>(null);

  // Upload de Comprovante generico
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingComprovante(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload/comprovante', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        callback(data.url);
      } else {
        alert(data.message || 'Erro ao enviar comprovante.');
      }
    } catch (err: any) {
      alert('Erro na conexão ao enviar comprovante.');
    } finally {
      setIsUploadingComprovante(false);
    }
  };

  // Consolidação Profunda dos Dados de Abastecimento
  const fuelTransactions = useMemo(() => {
    // 1. Transações financeiras diretas de combustível
    const directTrx = (data?.transacoes || []).filter(t => {
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
    }).map(t => {
      const isCobrado = t.status === 'pago' || t.status === 'cobrado';
      return {
        ...t,
        statusCobranca: isCobrado ? 'cobrado' : 'pendente',
        isFromReservation: false
      };
    });

    // 2. Registros de abastecimento realizados nas reservas da marina (píer)
    const reservationTrx = (data?.reservations || [])
      .filter((r: any) => {
        const litros = Number(r.abastecimentoLitros || r.litrosAbastecidos) || 0;
        if (litros <= 0) return false;
        const rDate = r.data || r.abastecimentoDataHora?.split('T')[0] || r.horaChegada;
        if (!rDate) return false;
        if (rDate < startDate || rDate > endDate) return false;
        return true;
      })
      .map((r: any) => {
        const litros = Number(r.abastecimentoLitros || r.litrosAbastecidos) || 0;
        const isCobrado = r.abastecimentoStatusCobranca === 'cobrado';
        const formaPagto = r.abastecimentoFormaPagamento || (isCobrado ? 'pix' : 'pendente');
        
        let precoLitro = 9;
        if (formaPagto === 'credit') precoLitro = 10;
        if (formaPagto === 'admin') precoLitro = 13;
        
        const valorTotal = r.abastecimentoValorTotal || (litros * precoLitro);

        return {
          id: `res_fuel_${r.id}`,
          reservaId: r.id,
          tipo: 'receita',
          categoria: 'receita_combustivel',
          descricao: `Abastecimento Marina (Píer): ${litros}L a R$${precoLitro.toFixed(2)}/L`,
          valor: valorTotal,
          litrosAbastecidos: litros,
          status: isCobrado ? 'pago' : 'pendente',
          statusCobranca: isCobrado ? 'cobrado' : 'pendente',
          metodoPagamento: formaPagto,
          data: r.data || startDate,
          clienteId: r.clienteId,
          embarcacaoId: r.embarcacaoId,
          comprovanteUrl: r.abastecimentoComprovanteUrl,
          operador: r.abastecimentoOperador || r.operadorChegada || 'Marinheiro',
          isFromReservation: true,
          reservationRef: r
        };
      });

    // 3. Mesclar e desduplicar lançamentos salvos
    const combined = [
      ...directTrx,
      ...reservationTrx.filter(rf => {
        const isAlreadySaved = directTrx.some(dt => {
          if (dt.reservaId && dt.reservaId === rf.reservaId) return true;
          const dtDate = dt.data || dt.dataVencimento || dt.dataPagamento || dt.createdAt?.split('T')[0];
          return dt.embarcacaoId === rf.embarcacaoId && dtDate === rf.data;
        });
        return !isAlreadySaved;
      })
    ];

    // 4. Aplicar Filtros Profundos
    return combined.filter(t => {
      const boat = data?.boats?.find(b => b.id === t.embarcacaoId);
      const client = data?.clients?.find(c => c.id === t.clienteId);
      
      // Filtro por Embarcação
      if (boatFilter !== 'all' && t.embarcacaoId !== boatFilter) return false;

      // Filtro por Cliente
      if (clientFilter !== 'all' && t.clienteId !== clientFilter) return false;

      // Filtro de Busca Livre
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        boat?.nome?.toLowerCase().includes(searchLower) ||
        boat?.numero?.toString().includes(searchLower) ||
        client?.nome?.toLowerCase().includes(searchLower) ||
        t.operador?.toLowerCase().includes(searchLower) ||
        t.descricao?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
      
      // Filtro de Status de Cobrança
      const isCobrado = t.statusCobranca === 'cobrado' || t.status === 'pago';
      if (statusFilter === 'cobrado' && !isCobrado) return false;
      if (statusFilter === 'pendente' && isCobrado) return false;

      // Filtro de Forma de Pagamento
      if (paymentFilter !== 'all') {
        const pMethod = (t.metodoPagamento || '').toLowerCase();
        const desc = (t.descricao || '').toLowerCase();
        if (paymentFilter === 'pix' && !(pMethod === 'pix' || pMethod === 'dinheiro' || desc.includes('pix') || desc.includes('dinheiro'))) return false;
        if (paymentFilter === 'credit' && !(pMethod === 'credit' || desc.includes('cartão') || desc.includes('credito') || desc.includes('credit'))) return false;
        if (paymentFilter === 'debit' && !(pMethod === 'debit' || desc.includes('débito') || desc.includes('debito'))) return false;
        if (paymentFilter === 'admin' && !(pMethod === 'admin' || desc.includes('admin') || desc.includes('faturado'))) return false;
      }

      // Filtro de Origem
      if (originFilter === 'marina' && !t.isFromReservation) return false;
      if (originFilter === 'direto' && t.isFromReservation) return false;

      return true;
    }).sort((a, b) => {
      const dateA = a.data || a.dataVencimento || a.createdAt;
      const dateB = b.data || b.dataVencimento || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [data, startDate, endDate, searchTerm, boatFilter, clientFilter, statusFilter, paymentFilter, originFilter]);

  // KPIs Financeiros e Gráficos
  const { totalLiters, totalRevenue, cobradoRevenue, pendenteRevenue, chartData } = useMemo(() => {
    let liters = 0;
    let revenue = 0;
    let cobradoRev = 0;
    let pendenteRev = 0;
    
    const dailyData: Record<string, number> = {};

    fuelTransactions.forEach(t => {
      const val = Number(t.valor || 0);
      revenue += val;

      const isCobrado = t.statusCobranca === 'cobrado' || t.status === 'pago';
      if (isCobrado) {
        cobradoRev += val;
      } else {
        pendenteRev += val;
      }

      let tLiters = Number(t.litrosAbastecidos) || 0;
      if (tLiters <= 0 && t.descricao) {
        const match = t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i);
        if (match) {
          tLiters = parseFloat(match[1].replace(',', '.'));
        }
      }
      liters += tLiters;

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

    return { 
      totalLiters: liters, 
      totalRevenue: revenue, 
      cobradoRevenue: cobradoRev, 
      pendenteRevenue: pendenteRev, 
      chartData: chart 
    };
  }, [fuelTransactions]);

  // Abrir Modal para Dar Baixa / Liquidar Cobrança Pendente
  const handleOpenBaixaModal = (t: any) => {
    setBaixaTransaction(t);
    setBaixaPaymentType(t.metodoPagamento && t.metodoPagamento !== 'Pendente' ? t.metodoPagamento : 'pix');
    setBaixaComprovanteUrl(t.comprovanteUrl || null);
    setIsBaixaModalOpen(true);
  };

  // Confirmar Baixa de Cobrança Pendente
  const handleConfirmBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baixaTransaction) return;

    setIsSubmitting(true);
    const t = baixaTransaction;

    let pricePerLiter = 9;
    if (baixaPaymentType === 'credit') pricePerLiter = 10;
    if (baixaPaymentType === 'admin') pricePerLiter = 13;

    const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
    const litrosNum = match ? parseFloat(match[1].replace(',', '.')) : (t.litrosAbastecidos || t.reservationRef?.abastecimentoLitros || 0);
    const calculatedValue = litrosNum > 0 ? (litrosNum * pricePerLiter) : t.valor;

    const boat = data?.boats?.find(b => b.id === t.embarcacaoId);
    const boatName = boat?.nome || 'Embarcação';

    const transacaoAtualizada = {
      id: t.isFromReservation ? `trx_fuel_${t.reservaId || Date.now()}` : t.id,
      reservaId: t.reservaId || t.reservationRef?.id || null,
      tipo: 'receita',
      categoria: 'Combustível',
      valor: calculatedValue,
      data: t.data || endDate,
      dataVencimento: t.data || endDate,
      dataPagamento: new Date().toISOString().split('T')[0],
      status: 'pago',
      metodoPagamento: baixaPaymentType,
      descricao: `Abastecimento (${boatName}): ${litrosNum}L a R$${pricePerLiter.toFixed(2)}/L [Baixa realizada no Financeiro]`,
      clienteId: t.clienteId,
      embarcacaoId: t.embarcacaoId,
      comprovanteUrl: baixaComprovanteUrl,
      operador: t.operador || 'Financeiro',
      createdAt: t.createdAt || new Date().toISOString()
    };

    try {
      // 1. Salva ou atualiza a transação financeira
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ action: 'upsert', data: transacaoAtualizada })
      });

      // 2. Se veio de uma reserva, atualiza também a reserva para status cobrado
      if (t.reservationRef) {
        const updatedReserva = {
          ...t.reservationRef,
          abastecimentoStatusCobranca: 'cobrado',
          abastecimentoFormaPagamento: baixaPaymentType,
          abastecimentoComprovanteUrl: baixaComprovanteUrl || t.reservationRef.abastecimentoComprovanteUrl,
          abastecimentoValorTotal: calculatedValue
        };
        await fetch('/api/db/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
        });
      }

      alert('Baixa de cobrança registrada com sucesso!');
      setIsBaixaModalOpen(false);
      if (reloadData) reloadData();
    } catch (err: any) {
      alert('Erro ao registrar baixa de cobrança.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enviar Lançamento para a Administradora (Faturado a R$ 13/L)
  const handleSendToAdmin = async (t: any) => {
    const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
    const litrosNum = match ? parseFloat(match[1].replace(',', '.')) : (t.litrosAbastecidos || t.reservationRef?.abastecimentoLitros || 0);

    if (litrosNum <= 0) return alert('Quantidade de litros inválida.');

    const pricePerLiter = 13.0;
    const totalValue = litrosNum * pricePerLiter;
    const boat = data?.boats?.find(b => b.id === t.embarcacaoId);
    const boatName = boat?.nome || 'Embarcação';
    const dateStr = t.data || t.dataVencimento || endDate;

    if (!window.confirm(`Confirmar envio de ${litrosNum}L (${boatName}) para a Administradora a R$ 13,00/L?\nValor Total: R$ ${totalValue.toFixed(2)}`)) {
      return;
    }

    setIsSubmitting(true);
    const transacao = {
      id: t.isFromReservation ? `trx_fuel_${t.reservaId || Date.now()}` : t.id,
      reservaId: t.reservaId || t.reservationRef?.id || null,
      tipo: 'receita',
      categoria: 'Combustível',
      valor: totalValue,
      data: dateStr,
      dataVencimento: dateStr,
      dataPagamento: null,
      status: 'pendente',
      metodoPagamento: 'admin',
      descricao: `Abastecimento Faturado Administradora: ${litrosNum}L a R$13,00/L`,
      clienteId: t.clienteId,
      embarcacaoId: t.embarcacaoId,
      operador: t.operador || 'Admin',
      createdAt: new Date().toISOString()
    };

    try {
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ action: 'upsert', data: transacao })
      });

      if (t.reservationRef) {
        const updatedReserva = {
          ...t.reservationRef,
          abastecimentoStatusCobranca: 'cobrado',
          abastecimentoFormaPagamento: 'admin',
          abastecimentoValorTotal: totalValue
        };
        await fetch('/api/db/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
        });
      }

      alert('Abastecimento enviado para a Administradora com sucesso!');
      if (reloadData) reloadData();
    } catch (err: any) {
      alert('Erro ao enviar abastecimento para a administradora.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Editar Abastecimento Existente
  const handleEditFuel = (t: any) => {
    setSelectedTransaction(t);
    const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
    setLiters(match ? match[1].replace(',', '.') : (t.litrosAbastecidos ? t.litrosAbastecidos.toString() : ''));
    
    const pMethod = (t.metodoPagamento || '').toLowerCase();
    if (pMethod === 'credit') setPaymentType('credit');
    else if (pMethod === 'debit') setPaymentType('debit');
    else if (pMethod === 'dinheiro') setPaymentType('dinheiro');
    else if (pMethod === 'admin') setPaymentType('admin');
    else setPaymentType('pix');

    setStatusCobrancaModal(t.statusCobranca === 'cobrado' || t.status === 'pago' ? 'cobrado' : 'pendente');
    setComprovanteUrl(t.comprovanteUrl || null);
    setIsFuelModalOpen(true);
  };

  // Salvar Edição de Abastecimento
  const handleSaveFuelTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liters || Number(liters) <= 0) return alert('Informe os litros corretamente.');
    
    setIsSubmitting(true);
    const litersNum = Number(liters);
    let pricePerLiter = 9;
    if (paymentType === 'credit') pricePerLiter = 10;
    if (paymentType === 'admin') pricePerLiter = 13;

    const isPago = statusCobrancaModal === 'cobrado';
    const calculatedValue = litersNum * pricePerLiter;

    const transacao = {
      ...selectedTransaction,
      valor: calculatedValue,
      status: isPago ? 'pago' : 'pendente',
      metodoPagamento: paymentType,
      descricao: `Abastecimento: ${litersNum}L a R$${pricePerLiter.toFixed(2)}/L (${paymentType.toUpperCase()})`,
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

      if (selectedTransaction?.reservationRef) {
        const updatedReserva = {
          ...selectedTransaction.reservationRef,
          abastecimentoLitros: litersNum,
          abastecimentoStatusCobranca: statusCobrancaModal,
          abastecimentoFormaPagamento: paymentType,
          abastecimentoComprovanteUrl: comprovanteUrl,
          abastecimentoValorTotal: calculatedValue
        };
        await fetch('/api/db/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
        });
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

  // Excluir Lançamento
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
      
      if (reloadData) reloadData();
      alert('Registro excluído com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir registro.');
    }
  };

  // Exportar Relatório em CSV
  const exportToCSV = () => {
    const headers = ['Data', 'Embarcacao', 'Cliente', 'Litros', 'Valor_Total', 'Forma_Pagamento', 'Status_Cobranca', 'Operador'];
    const rows = fuelTransactions.map(t => {
      const boat = data?.boats?.find(b => b.id === t.embarcacaoId)?.nome || 'N/A';
      const client = data?.clients?.find(c => c.id === t.clienteId)?.nome || 'N/A';
      const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
      const litersVal = match ? match[1] : (t.litrosAbastecidos || '0');
      
      return [
        t.data || t.dataVencimento, 
        `"${boat}"`, 
        `"${client}"`, 
        litersVal, 
        t.valor, 
        t.metodoPagamento || 'Pendente', 
        t.statusCobranca || t.status, 
        `"${t.operador || 'Marinheiro'}"`
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `abastecimentos_financeiro_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      
      {/* Top Bar Header */}
      <div className="bg-white border-b border-slate-200 p-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span>Lançamento & Controle de Combustível</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Acompanhamento financeiro de abastecimentos, cobranças pendentes, relatórios e baixas
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          {reloadData && (
            <button 
              onClick={reloadData} 
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              title="Atualizar Dados"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          )}
          <button 
            onClick={exportToCSV} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Barra Retrátil de Filtros Avançados */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden transition-all">
          
          {/* Header do Painel Retrátil */}
          <div 
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="p-4 bg-white hover:bg-slate-50 flex items-center justify-between cursor-pointer border-b border-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                activeFilterCount > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800">Filtros & Pesquisa Avançada</h3>
                  {activeFilterCount > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                      {activeFilterCount} {activeFilterCount === 1 ? 'filtro ativo' : 'filtros ativos'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {isFiltersOpen 
                    ? 'Clique para recolher o painel de filtros' 
                    : `Período: ${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} até ${new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')} • Clique para expandir`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleResetFilters(); }}
                  className="text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 border border-slate-200 transition-all cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}
              <button
                type="button"
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {isFiltersOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Conteúdo Expansível de Filtros */}
          {isFiltersOpen && (
            <div className="p-5 bg-slate-50/50 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                
                {/* Período de Seleção (Data Inicial e Final) */}
                <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Período de Seleção</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                    />
                    <span className="text-slate-400 font-bold text-xs">até</span>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                    />
                  </div>
                </div>

                {/* Embarcação */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Embarcação</label>
                  <select 
                    value={boatFilter}
                    onChange={(e) => setBoatFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                  >
                    <option value="all">Todas as Embarcações</option>
                    {[...(data?.boats || [])].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.nome} {b.numero ? `#${b.numero}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cliente */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cliente</label>
                  <select 
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                  >
                    <option value="all">Todos os Clientes</option>
                    {[...(data?.clients || [])].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status da Cobrança */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status da Cobrança</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="cobrado">✓ Cobrados / Pagos</option>
                    <option value="pendente">⏳ Pendentes de Cobrança</option>
                  </select>
                </div>

                {/* Forma de Pagamento */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Forma de Pagamento</label>
                  <select 
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                  >
                    <option value="all">Todas as Formas</option>
                    <option value="pix">PIX / Dinheiro</option>
                    <option value="credit">Cartão de Crédito</option>
                    <option value="debit">Cartão de Débito</option>
                    <option value="admin">Administradora (Faturado)</option>
                  </select>
                </div>

                {/* Origem Lançamento */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Origem do Lançamento</label>
                  <select 
                    value={originFilter}
                    onChange={(e) => setOriginFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                  >
                    <option value="all">Todas as Origens</option>
                    <option value="marina">Marina (Píer / Reservas)</option>
                    <option value="direto">Lançamentos Financeiros</option>
                  </select>
                </div>

                {/* Pesquisa Geral */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Busca por Texto</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Pesquisar por cliente, barco, operador..." 
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                    />
                  </div>
                </div>

              </div>

              {/* Botões de Ação do Painel */}
              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <div className="text-slate-500 font-medium">
                  Exibindo resultados baseados em <strong>{fuelTransactions.length}</strong> abastecimentos encontrados.
                </div>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Limpar Filtros
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFiltersOpen(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Aplicar & Recolher
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Cards de KPIs Financeiros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Faturamento Total */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <DollarSign className="w-20 h-20 absolute -right-4 -bottom-4 text-white/5 pointer-events-none" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Faturamento Total</span>
              <span className="text-2xl font-black font-mono tracking-tight text-white block">
                R$ {totalRevenue.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Transações no período:</span>
              <strong className="text-white font-bold">{fuelTransactions.length}</strong>
            </div>
          </div>

          {/* Card 2: Volume Total (Litros) */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <Droplets className="w-20 h-20 absolute -right-4 -bottom-4 text-white/10 pointer-events-none" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100 block mb-1">Volume Total Abastecido</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono tracking-tight text-white">{totalLiters.toFixed(1).replace('.0', '')}</span>
                <span className="text-xs font-bold text-blue-100">Litros</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-500/40 flex items-center justify-between text-xs text-blue-100 font-medium">
              <span>Média por abastecimento:</span>
              <strong className="text-white font-bold">{fuelTransactions.length > 0 ? (totalLiters / fuelTransactions.length).toFixed(1) : 0} L</strong>
            </div>
          </div>

          {/* Card 3: Valor Cobrado / Liquidado */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Valor Cobrado / Liquidado</span>
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              </div>
              <span className="text-2xl font-black font-mono tracking-tight text-blue-600 block">
                R$ {cobradoRevenue.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${totalRevenue > 0 ? (cobradoRevenue / totalRevenue) * 100 : 0}%` }}></div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 block text-right">
                {totalRevenue > 0 ? ((cobradoRevenue / totalRevenue) * 100).toFixed(0) : 0}% do faturamento
              </span>
            </div>
          </div>

          {/* Card 4: Valor Pendente de Cobrança */}
          <div className={`rounded-2xl border p-5 shadow-xs flex flex-col justify-between ${
            pendenteRevenue > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Pendentes de Cobrança</span>
                {pendenteRevenue > 0 && <AlertCircle className="w-4 h-4 text-amber-600" />}
              </div>
              <span className="text-2xl font-black font-mono tracking-tight text-amber-700 block">
                R$ {pendenteRevenue.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-amber-200/50 flex items-center justify-between text-xs">
              <span className="text-amber-800 font-medium text-[11px]">Itens a receber:</span>
              <strong className="text-amber-900 font-bold">
                {fuelTransactions.filter(t => t.statusCobranca === 'pendente').length} lançamentos
              </strong>
            </div>
          </div>

        </div>

        {/* Gráfico Evolutivo Diário em Litros */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Consumo Diário de Combustível (Litros)</span>
            </h3>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={200} minHeight={200}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Bar dataKey="litros" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.litros > 100 ? '#1d4ed8' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tabela Principal de Lançamentos */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">Lançamentos de Abastecimento</h3>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {fuelTransactions.length} encontrados
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Data / Hora</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Embarcação / Cliente</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Origem / Operador</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Volume</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Valor Total</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Forma Pagto</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status Cobrança</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Comprovante</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Ações Financeiras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {fuelTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400 font-medium">
                      Nenhum abastecimento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  fuelTransactions.map(t => {
                    const boat = data?.boats?.find(b => b.id === t.embarcacaoId);
                    const client = data?.clients?.find(c => c.id === t.clienteId);
                    
                    const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
                    const litersVal = match ? match[1] : (t.litrosAbastecidos ? t.litrosAbastecidos.toString() : '?');
                    
                    const isCobrado = t.statusCobranca === 'cobrado' || t.status === 'pago';
                    const dateObj = t.data || t.dataVencimento || t.createdAt?.split('T')[0];
                    const dateStr = dateObj ? new Date(dateObj.includes('T') ? dateObj : dateObj + 'T12:00:00').toLocaleDateString('pt-BR') : '-';

                    return (
                      <tr 
                        key={t.id} 
                        onClick={() => setDetailsModal(t)} 
                        className={`transition-colors cursor-pointer ${
                          isCobrado ? 'hover:bg-slate-50/80' : 'bg-amber-50/30 hover:bg-amber-50/60'
                        }`}
                      >
                        {/* Data */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-600">
                          {dateStr}
                        </td>

                        {/* Embarcação & Cliente */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-xs">
                              {boat?.nome || 'Embarcação N/A'} {boat?.numero ? `#${boat.numero}` : ''}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium truncate max-w-[180px]">
                              {client?.nome || 'Cliente N/A'}
                            </span>
                          </div>
                        </td>

                        {/* Origem / Operador */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              {t.isFromReservation ? 'Marina (Píer)' : 'Lançamento Direct'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {t.operador || 'Marinheiro'}
                            </span>
                          </div>
                        </td>

                        {/* Volume */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-blue-600 text-sm">{litersVal} L</span>
                        </td>

                        {/* Valor Total */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            R$ {Number(t.valor || 0).toFixed(2).replace('.', ',')}
                          </span>
                        </td>

                        {/* Forma de Pagamento */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            t.metodoPagamento === 'admin' 
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : t.metodoPagamento === 'credit'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : t.metodoPagamento === 'debit'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : t.metodoPagamento === 'dinheiro'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : t.metodoPagamento === 'pix'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {t.metodoPagamento === 'admin' ? 'Faturado Admin' : (t.metodoPagamento || 'Pendente').toUpperCase()}
                          </span>
                        </td>

                        {/* Status Cobrança */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {isCobrado ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-blue-600" /> COBRADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full">
                              <Clock className="w-3 h-3 text-amber-600" /> PENDENTE
                            </span>
                          )}
                        </td>

                        {/* Comprovante */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {t.comprovanteUrl ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setModalComprovante(t.comprovanteUrl); }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                              title="Ver Comprovante Anexado"
                            >
                              <FileText className="w-3.5 h-3.5" /> Ver Anexo
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-normal">Sem anexo</span>
                          )}
                        </td>

                        {/* Ações Financeiras */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {!isCobrado && (
                              <button
                                type="button"
                                onClick={() => handleOpenBaixaModal(t)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                title="Dar Baixa / Receber Cobrança"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> Dar Baixa
                              </button>
                            )}

                            {t.metodoPagamento !== 'admin' && (
                              <button
                                type="button"
                                onClick={() => handleSendToAdmin(t)}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                                title="Faturar para a Administradora (R$ 13/L)"
                              >
                                <Building2 className="w-3 h-3" /> Faturar
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleEditFuel(t)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar Abastecimento"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteFuel(t.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir Registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL DE BAIXA DE COBRANÇA (PENDENTE -> COBRADO) */}
      {isBaixaModalOpen && baixaTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Liquidar / Dar Baixa em Cobrança</h3>
              </div>
              <button onClick={() => setIsBaixaModalOpen(false)} className="p-1 text-white/80 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmBaixa} className="p-5 space-y-4">
              
              {/* Resumo da Embarcação / Litros */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Embarcação / Cliente</span>
                  <span className="font-bold text-slate-900 block">
                    {data?.boats?.find(b => b.id === baixaTransaction.embarcacaoId)?.nome || 'Embarcação'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Volume</span>
                  <span className="font-mono font-bold text-blue-600 text-sm block">
                    {baixaTransaction.litrosAbastecidos || '?'} Litros
                  </span>
                </div>
              </div>

              {/* Forma de Pagamento para Baixa */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Selecione a Forma de Pagamento Realizada *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'pix', label: 'PIX', price: 'R$ 9,00/L', icon: QrCode },
                    { id: 'credit', label: 'Crédito', price: 'R$ 10,00/L', icon: CreditCard },
                    { id: 'debit', label: 'Débito', price: 'R$ 9,00/L', icon: CreditCard },
                    { id: 'dinheiro', label: 'Dinheiro', price: 'R$ 9,00/L', icon: Banknote },
                    { id: 'admin', label: 'Administradora', price: 'R$ 13,00/L', icon: Building2 },
                  ].map(item => {
                    const IconComp = item.icon;
                    const isSel = baixaPaymentType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBaixaPaymentType(item.id as any)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSel
                            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-900 font-bold'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${isSel ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs block truncate">{item.label}</span>
                          <span className="text-[10px] text-slate-500 block font-normal">{item.price}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total Calculado */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Total a Receber</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  R$ {((Number(baixaTransaction.litrosAbastecidos || 0) || 1) * (baixaPaymentType === 'credit' ? 10 : baixaPaymentType === 'admin' ? 13 : 9)).toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* Upload de Comprovante de Pagamento */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                  <span>Anexar Comprovante do Cliente</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                </label>

                {baixaComprovanteUrl ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-800">Comprovante Anexado</span>
                    </div>
                    <button type="button" onClick={() => setBaixaComprovanteUrl(null)} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all">
                    {isUploadingComprovante ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin" /> : <Paperclip className="w-4 h-4 text-slate-400" />}
                    <span className="text-xs font-bold text-slate-700">
                      {isUploadingComprovante ? 'Enviando...' : 'Clique para anexar comprovante'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleUploadFile(e, (url) => setBaixaComprovanteUrl(url))}
                      disabled={isUploadingComprovante}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                <span>Confirmar Recebimento & Baixar</span>
              </button>

            </form>
          </div>
        </div>
      )}

      {/* MODAL FOTOGRÁFICO DE COMPROVANTE */}
      {modalComprovante && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 flex justify-between items-center bg-transparent relative z-10">
            <h3 className="font-black tracking-tight text-white text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Comprovante de Abastecimento
            </h3>
            <button 
              onClick={() => setModalComprovante(null)} 
              className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center relative z-0">
            {modalComprovante.endsWith('.pdf') ? (
              <a href={modalComprovante} target="_blank" rel="noreferrer" className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm text-center max-w-sm">
                Visualizar PDF em nova aba
              </a>
            ) : (
              <img src={modalComprovante} className="w-full max-w-lg rounded-3xl shadow-2xl ring-1 ring-white/10" alt="Comprovante" />
            )}
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO GERAL */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Editar Lançamento</h3>
              <button onClick={() => setIsFuelModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveFuelTransaction} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Litros Abastecidos (L) *</label>
                <div className="relative">
                  <input 
                    type="text"
                    required
                    value={liters}
                    onChange={(e) => setLiters(e.target.value.replace(',', '.'))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="absolute right-4 top-3 text-slate-400 font-bold">L</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Status da Cobrança</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusCobrancaModal('cobrado')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      statusCobrancaModal === 'cobrado' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Cobrado
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusCobrancaModal('pendente')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      statusCobrancaModal === 'pendente' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Clock className="w-4 h-4" /> Pendente
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Forma de Pagamento</label>
                <select 
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="pix">Pix (R$ 9,00/L)</option>
                  <option value="credit">Cartão de Crédito (R$ 10,00/L)</option>
                  <option value="debit">Cartão de Débito (R$ 9,00/L)</option>
                  <option value="dinheiro">Dinheiro (R$ 9,00/L)</option>
                  <option value="admin">Administradora (R$ 13,00/L)</option>
                </select>
              </div>

              {/* Comprovante */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Comprovante</label>
                {comprovanteUrl ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 truncate">Comprovante Anexado</span>
                    <button type="button" onClick={() => setComprovanteUrl(null)} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 rounded-xl p-2.5 flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    <span>{isUploadingComprovante ? 'Enviando...' : 'Anexar Comprovante'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleUploadFile(e, (url) => setComprovanteUrl(url))}
                      disabled={isUploadingComprovante}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Atualizar Registro</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHADO DO ABASTECIMENTO */}
      {detailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Detalhes do Abastecimento
              </h2>
              <button 
                onClick={() => setDetailsModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-4 text-xs">
              {(() => {
                const t = detailsModal;
                const boat = data?.boats?.find(b => b.id === t.embarcacaoId);
                const client = data?.clients?.find(c => c.id === t.clienteId);
                const dateObj = t.data || t.dataVencimento || t.createdAt;
                let dataStr = '-';
                if (dateObj) {
                  const d = new Date(dateObj.includes('T') ? dateObj : dateObj + 'T12:00:00');
                  dataStr = d.toLocaleDateString('pt-BR');
                }
                const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
                const litersVal = match ? match[1] : (t.litrosAbastecidos || '?');
                const isCobrado = t.statusCobranca === 'cobrado' || t.status === 'pago';

                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Data</span>
                        <span className="font-bold text-slate-800">{dataStr}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Operador / Marinheiro</span>
                        <span className="font-bold text-slate-800">{t.operador || 'Marinheiro'}</span>
                      </div>
                      
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Embarcação</span>
                        <span className="font-bold text-slate-900">{boat?.nome || 'N/A'} {boat?.numero ? `#${boat.numero}` : ''}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Cliente</span>
                        <span className="font-bold text-slate-800">{client?.nome || 'N/A'}</span>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Volume</span>
                        <span className="text-lg font-black font-mono text-blue-700">{litersVal} Litros</span>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Valor Total</span>
                        <span className="text-lg font-black font-mono text-emerald-700">R$ {Number(t.valor || 0).toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col gap-2">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status da Cobrança</span>
                        <div className="flex items-center gap-2">
                          {isCobrado ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-blue-600" /> COBRADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 text-amber-600" /> PENDENTE
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {(t.metodoPagamento || 'Pendente').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição / Observações</span>
                        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                          {t.descricao || 'Sem observações.'}
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
                  className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-slate-700 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> Ver Comprovante
                </button>
              ) : (
                <div />
              )}
              <button 
                onClick={() => setDetailsModal(null)}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors"
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
