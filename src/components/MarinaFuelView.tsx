import React, { useState } from 'react';
import { Droplets, ChevronLeft, ChevronRight, FileText, User as UserIcon, CheckCircle2, Clock, Info, ChevronDown, ChevronUp, Plus, Loader2, Upload, Ship } from 'lucide-react';
import { Cliente, Embarcacao } from '../types';
import { logAction } from '../db';

interface MarinaFuelViewProps {
  data: {
    transacoes?: any[];
    boats?: Embarcacao[];
    clients?: Cliente[];
    reservations?: any[];
  };
  operadorNome?: string;
  setData?: React.Dispatch<React.SetStateAction<any>>;
  reloadData?: () => void;
  isAdmin?: boolean;
}

export default function MarinaFuelView({ data, operadorNome, setData, reloadData, isAdmin }: MarinaFuelViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [modalComprovante, setModalComprovante] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New Fuel Modal state
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [liters, setLiters] = useState('');
  const [paymentType, setPaymentType] = useState<'pix' | 'credit' | 'admin'>('pix');
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [isUploadingComprovante, setIsUploadingComprovante] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Search Modals state
  const [isBoatSelectOpen, setIsBoatSelectOpen] = useState(false);
  const [boatSearch, setBoatSearch] = useState('');
  const [isClientSelectOpen, setIsClientSelectOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const displayDateStr = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const matchDate = (dateVal?: string | null) => {
    if (!dateVal) return false;
    return dateVal.startsWith(selectedDate);
  };

  // Filter fuel transactions for the selected day
  const fuelTransactions = (data?.transacoes || []).filter(t => {
    const isFuelCategory = 
      t.categoria === 'receita_combustivel' || 
      t.categoria === 'Combustível' || 
      t.categoria === 'combustivel' || 
      (t.descricao && (t.descricao.toLowerCase().includes('abastecimento') || t.descricao.toLowerCase().includes('litros')));
    
    const isMatchingDate = matchDate(t.data) || matchDate(t.dataVencimento) || matchDate(t.dataPagamento) || matchDate(t.createdAt);
    
    return isFuelCategory && isMatchingDate;
  });

  let totalLiters = 0;
  let totalValue = 0;

  fuelTransactions.forEach(t => {
    totalValue += Number(t.valor || 0);
    const match = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
    if (match) {
      totalLiters += parseFloat(match[1].replace(',', '.'));
    }
  });

  const getEmbarcacao = (id: string) => data?.boats?.find(b => b.id === id);
  const getCliente = (id: string) => data?.clients?.find(c => c.id === id);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const handleBoatChange = (boatId: string) => {
    setSelectedBoatId(boatId);
    const boat = getEmbarcacao(boatId);
    if (boat && boat.donos && boat.donos.length > 0) {
      setSelectedClientId(boat.donos[0]);
    } else {
      setSelectedClientId('');
    }
  };

  const handleUploadComprovante = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingComprovante(true);
    const formData = new FormData();
    formData.append('comprovante', file);

    try {
      const res = await fetch('/api/upload/comprovante', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setComprovanteUrl(json.url);
    } catch (err) {
      alert('Erro ao fazer upload do comprovante.');
    } finally {
      setIsUploadingComprovante(false);
    }
  };

  const handleEditFuel = (t: any) => {
    setEditingTransactionId(t.id);
    setSelectedBoatId(t.embarcacaoId || '');
    setSelectedClientId(t.clienteId || '');
    
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
      const res = await fetch(`/api/financeiro/transacoes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
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
    if (!selectedBoatId) {
      alert('Selecione uma embarcação.');
      return;
    }
    if (!selectedClientId) {
      alert('Selecione um cliente/proprietário.');
      return;
    }
    if (!liters || Number(liters) <= 0) {
      alert('Informe os litros corretamente.');
      return;
    }
    if ((paymentType === 'pix' || paymentType === 'credit') && !comprovanteUrl) {
      alert('É obrigatório enviar o comprovante para pagamentos no Pix ou Cartão.');
      return;
    }

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
    
    const existingTransaction = editingTransactionId 
      ? data?.transacoes?.find(t => t.id === editingTransactionId) 
      : null;

    const transacao = {
      id: editingTransactionId || `trx_fuel_${Date.now()}`,
      tipo: existingTransaction?.tipo || 'receita',
      categoria: existingTransaction?.categoria || 'Combustível',
      valor: calculatedValue,
      dataVencimento: existingTransaction?.dataVencimento || selectedDate,
      dataPagamento: paymentStatus === 'pago' ? (existingTransaction?.dataPagamento || selectedDate) : null,
      status: paymentStatus,
      descricao: `Abastecimento: ${litersNum}L a R$${pricePerLiter}/L. Pagamento: ${paymentLabel}`,
      clienteId: selectedClientId,
      embarcacaoId: selectedBoatId,
      operador: operadorNome || 'Operador Marina',
      comprovante: comprovanteUrl || null,
      comprovanteUrl: comprovanteUrl || null,
      createdAt: new Date().toISOString()
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
      if (!json.success) throw new Error(json.message || 'Erro ao salvar abastecimento.');

      if (setData) {
        setData((prev: any) => ({
          ...prev,
          transacoes: [transacao, ...(prev?.transacoes || []).filter((t: any) => t.id !== transacao.id)]
        }));
      }

      await logAction('Abastecimento', `Abasteceu ${litersNum}L. Valor: R$${calculatedValue.toFixed(2)}. Pgto: ${paymentLabel}`, selectedBoatId, operadorNome);

      if (reloadData) {
        reloadData();
      }

      setIsFuelModalOpen(false);
      setEditingTransactionId(null);
      setSelectedBoatId('');
      setSelectedClientId('');
      setLiters('');
      setPaymentType('pix');
      setComprovanteUrl(null);
      alert(editingTransactionId ? 'Abastecimento atualizado com sucesso!' : 'Abastecimento lançado com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar abastecimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBoat = getEmbarcacao(selectedBoatId);
  const possibleClients = selectedBoat?.donos
    ? (data?.clients || []).filter(c => selectedBoat.donos.includes(c.id))
    : (data?.clients || []);

  return (
    <div className="w-full h-full flex flex-col bg-[#F8FAFC] overflow-hidden relative font-sans">
      {/* Date Navigator & Action Bar */}
      <div className="bg-white/80 backdrop-blur-md p-4 shadow-sm z-10 flex flex-wrap items-center justify-between border-b border-slate-200 sticky top-0 gap-3">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevDay} className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Fluxo de Combustível</span>
            <span className="text-lg font-black text-slate-800 capitalize tracking-tight">{displayDateStr}</span>
          </div>
          <button onClick={handleNextDay} className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 cursor-pointer">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => setIsFuelModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer ml-auto"
        >
          <Plus className="w-4 h-4" />
          Abastecer Embarcação
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 subtle-scrollbar pb-28">
        {fuelTransactions.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-10 text-center flex flex-col items-center mt-4 shadow-sm max-w-lg mx-auto">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Droplets className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Nenhum Abastecimento Registrado</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-[280px]">Nenhuma embarcação registrou abastecimento nesta data.</p>
            <button
              onClick={() => setIsFuelModalOpen(true)}
              className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Lançar Abastecimento
            </button>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Painel Resumo Financeiro */}
            <div className="relative overflow-hidden bg-slate-900 rounded-3xl shadow-lg border border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="absolute -left-10 -top-10 w-40 h-40 bg-blue-500 rounded-full opacity-20 blur-3xl mix-blend-screen pointer-events-none"></div>
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-500 rounded-full opacity-10 blur-2xl mix-blend-screen pointer-events-none"></div>
              
              <div className="relative z-10 flex gap-4 items-center">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                  <Droplets className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-0.5">Volume Total</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight">{totalLiters.toFixed(1).replace('.0', '')}</span>
                    <span className="text-blue-400 font-bold text-lg">Litros</span>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 flex flex-col md:items-end">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-0.5">Faturamento Estimado</span>
                <span className="text-2xl md:text-3xl font-black font-mono text-emerald-400 tracking-tight">
                  <span className="text-emerald-400/50 text-xl mr-1">R$</span>
                  {totalValue.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Lista de Transações Acordeão */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 pl-2">Lançamentos do Dia ({fuelTransactions.length})</h3>
              
              {fuelTransactions.map(t => {
                const boat = getEmbarcacao(t.embarcacaoId);
                const client = getCliente(t.clienteId);
                const isExpanded = expandedId === t.id;
                
                const isPago = t.status === 'pago';
                const matchLiters = t.descricao ? (t.descricao.match(/:\s*([0-9.,]+)\s*L/i) || t.descricao.match(/([0-9.,]+)\s*L/i)) : null;
                const litersVal = matchLiters ? matchLiters[1] : '?';
                const isPix = t.descricao?.toLowerCase().includes('pix') || t.descricao?.toLowerCase().includes('dinheiro');
                const isCredit = t.descricao?.toLowerCase().includes('cart') || t.descricao?.toLowerCase().includes('crédito') || t.descricao?.toLowerCase().includes('debito');

                return (
                  <div key={t.id} className={`bg-white rounded-2xl shadow-sm border border-slate-200/80 relative overflow-hidden transition-all duration-300 cursor-pointer ${isExpanded ? 'ring-2 ring-emerald-500/20' : 'hover:shadow-md'}`} onClick={() => toggleExpand(t.id)}>
                    <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors ${isPago ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                    
                    {/* Linha Resumida (Sempre visível) */}
                    <div className="px-4 py-3.5 pl-6 flex items-center justify-between">
                      <div className="flex items-center gap-3 md:gap-4 flex-1 overflow-hidden">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isPago ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                          {isPago ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                        </div>
                        <div className="flex flex-col overflow-hidden pr-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 tracking-tight leading-none truncate">
                              {boat?.nome || 'Embarcação'}
                            </h3>
                            {boat?.numero && (
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border border-slate-200 shrink-0">
                                #{boat.numero}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500 text-xs font-medium mt-1 truncate">
                            {client?.nome || 'Cliente não identificado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-black text-lg text-blue-600 tracking-tight leading-none">
                            {litersVal} <span className="text-sm text-blue-400">L</span>
                          </span>
                          <span className="text-xs font-bold text-slate-400 mt-1">R$ {Number(t.valor || 0).toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full border border-slate-100">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Detalhes (Visível apenas expandido) */}
                    <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`} onClick={(e) => e.stopPropagation()}>
                      <div className="p-4 bg-slate-50/80 border-t border-slate-100 ml-1.5 flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Detalhes do Pagamento</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                              isPago ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isPago ? 'Confirmado' : 'Aguardando Admin'}
                            </span>
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                              {isPix ? 'PIX / Dinheiro' : isCredit ? 'Cartão' : 'Cobrar Depois'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col md:items-end gap-3">
                          {t.comprovanteUrl ? (
                            <button 
                              onClick={() => setModalComprovante(t.comprovanteUrl)}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-sm active:scale-95"
                            >
                              <FileText className="w-4 h-4" />
                              Ver Comprovante
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 px-3 py-2 bg-white rounded-xl border border-slate-200 border-dashed">
                              <Info className="w-3.5 h-3.5" />
                              Sem comprovante
                            </div>
                          )}
                          {t.operador && (
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-right block">Registrado por: {t.operador}</span>
                          )}
                          
                          {isAdmin && (
                            <div className="flex items-center gap-2 mt-2 border-t border-slate-200/60 pt-2 w-full justify-end">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditFuel(t); }}
                                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteFuel(t.id); }}
                                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Novo Abastecimento Direto */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsFuelModalOpen(false)}></div>
          
          <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl relative z-10 animate-slide-up-fast pb-8 md:pb-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 shrink-0 md:hidden"></div>
            
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 leading-none">{editingTransactionId ? 'Editar Abastecimento' : 'Novo Abastecimento'}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">{editingTransactionId ? 'Alterar dados de consumo' : 'Lançar consumo de combustível'}</p>
                </div>
              </div>
              <button onClick={() => {
                setIsFuelModalOpen(false);
                setEditingTransactionId(null);
                setSelectedBoatId('');
                setSelectedClientId('');
                setLiters('');
                setComprovanteUrl(null);
              }} className="p-2 bg-slate-100 text-slate-500 rounded-full active:bg-slate-200 cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveFuelTransaction} className="p-5 space-y-5 overflow-y-auto subtle-scrollbar">
              
              {/* Selecionar Embarcação */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Embarcação *</label>
                <div 
                  onClick={() => setIsBoatSelectOpen(true)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <span className={`text-sm font-bold ${selectedBoatId ? 'text-slate-900' : 'text-slate-400'}`}>
                    {selectedBoatId ? (
                      data?.boats?.find(b => b.id === selectedBoatId) ? (
                        `${data?.boats?.find(b => b.id === selectedBoatId)?.numero ? `#${data?.boats?.find(b => b.id === selectedBoatId)?.numero} - ` : ''}${data?.boats?.find(b => b.id === selectedBoatId)?.nome}`
                      ) : 'Selecionar Embarcação'
                    ) : '-- Selecione a lancha/jet --'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Selecionar Cliente */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Proprietário / Cotista *</label>
                <div 
                  onClick={() => setIsClientSelectOpen(true)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <span className={`text-sm font-bold ${selectedClientId ? 'text-slate-900' : 'text-slate-400'}`}>
                    {selectedClientId ? (
                      possibleClients.find(c => c.id === selectedClientId)?.nome || 'Selecionar Cliente'
                    ) : '-- Selecione o cliente --'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Litros Abastecidos */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Litros Abastecidos (L) *</label>
                <div className="relative">
                  <input 
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    required
                    value={liters}
                    onChange={(e) => setLiters(e.target.value.replace(',', '.'))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    placeholder="0.0"
                  />
                  <span className="absolute right-5 top-3.5 text-slate-400 font-bold text-lg">L</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[0, 50, 100, 150].map(val => (
                    <button 
                      type="button"
                      key={val}
                      onClick={() => setLiters(val.toString())}
                      className="py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs border border-blue-100 hover:bg-blue-100 active:bg-blue-200 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      {val === 0 ? 'Zero' : `+${val}L`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Forma de Cobrança */}
              {Number(liters) > 0 && (
                <div className="space-y-3 pt-1">
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Forma de Pagamento</label>
                  <div className="grid grid-cols-1 gap-2">
                    <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all active:scale-[0.98] ${paymentType === 'pix' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" name="payment" value="pix" checked={paymentType === 'pix'} onChange={() => setPaymentType('pix')} className="sr-only" />
                      <div className="flex-1">
                        <span className="block font-bold text-sm text-slate-900">Pix / Dinheiro</span>
                        <span className="block text-xs text-slate-500 font-medium">R$ 9,00 por litro</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-blue-600">R$ {(Number(liters) * 9).toFixed(2).replace('.', ',')}</span>
                    </label>

                    <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all active:scale-[0.98] ${paymentType === 'credit' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" name="payment" value="credit" checked={paymentType === 'credit'} onChange={() => setPaymentType('credit')} className="sr-only" />
                      <div className="flex-1">
                        <span className="block font-bold text-sm text-slate-900">Cartão de Crédito</span>
                        <span className="block text-xs text-slate-500 font-medium">R$ 10,00 por litro</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-blue-600">R$ {(Number(liters) * 10).toFixed(2).replace('.', ',')}</span>
                    </label>

                    <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all active:scale-[0.98] ${paymentType === 'admin' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" name="payment" value="admin" checked={paymentType === 'admin'} onChange={() => setPaymentType('admin')} className="sr-only" />
                      <div className="flex-1">
                        <span className="block font-bold text-sm text-slate-900">Cobrar Depois (Faturamento Admin)</span>
                        <span className="block text-xs text-slate-500 font-medium">R$ 13,00 por litro</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-blue-600">R$ {(Number(liters) * 13).toFixed(2).replace('.', ',')}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Upload Comprovante */}
              {(paymentType === 'pix' || paymentType === 'credit') && Number(liters) > 0 && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Comprovante de Pagamento *</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={handleUploadComprovante}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={isUploadingComprovante}
                    />
                    <div className={`p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-3 transition-colors ${comprovanteUrl ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                      {isUploadingComprovante ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      ) : comprovanteUrl ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Upload className="w-5 h-5 text-slate-400" />
                      )}
                      <span className={`text-xs font-bold ${comprovanteUrl ? 'text-green-700' : 'text-slate-600'}`}>
                        {isUploadingComprovante ? 'Enviando comprovante...' : comprovanteUrl ? 'Comprovante anexado com sucesso' : 'Toque para selecionar a foto ou PDF'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isUploadingComprovante}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer mt-4"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    {editingTransactionId ? 'Atualizar Abastecimento' : 'Confirmar Abastecimento'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Fotográfico Premium para Comprovantes */}
      {modalComprovante && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 flex justify-between items-center bg-transparent relative z-10">
            <h3 className="font-black tracking-tight text-white text-xl">Comprovante de Abastecimento</h3>
            <button 
              onClick={() => setModalComprovante(null)} 
              className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-90 cursor-pointer backdrop-blur-md"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center subtle-scrollbar relative z-0">
            {modalComprovante.endsWith('.pdf') ? (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl flex flex-col items-center text-center max-w-sm w-full shadow-2xl">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <h4 className="font-bold text-white mb-2 text-lg">Documento em PDF</h4>
                <p className="text-white/60 text-sm mb-8">Este comprovante é um documento PDF e precisa ser aberto em uma nova guia.</p>
                <a href={modalComprovante} target="_blank" rel="noreferrer" className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-500/30 active:scale-95">
                  Visualizar PDF
                </a>
              </div>
            ) : (
              <img src={modalComprovante} className="w-full max-w-lg rounded-3xl shadow-2xl ring-1 ring-white/10" alt="Comprovante" />
            )}
          </div>
        </div>
      )}

      {/* Modal Seleção de Embarcação (Mobile Otimizado) */}
      {isBoatSelectOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="p-4 bg-white border-b border-slate-200 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Selecionar Embarcação</h3>
              <button 
                onClick={() => setIsBoatSelectOpen(false)}
                className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full cursor-pointer transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="relative">
              <input 
                type="text" 
                autoFocus
                placeholder="Buscar por nome ou número..." 
                value={boatSearch}
                onChange={(e) => setBoatSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-shadow outline-none"
              />
              <svg className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 subtle-scrollbar">
            {(data?.boats || []).filter(b => 
              b.nome?.toLowerCase().includes(boatSearch.toLowerCase()) || 
              b.numero?.toLowerCase().includes(boatSearch.toLowerCase())
            ).map(b => (
              <div 
                key={b.id} 
                onClick={() => {
                  handleBoatChange(b.id);
                  setIsBoatSelectOpen(false);
                  setBoatSearch('');
                }}
                className="p-4 border-b border-slate-100 flex items-center justify-between active:bg-blue-50 cursor-pointer transition-colors last:border-0 rounded-xl"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{b.nome}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{b.modelo || 'Sem modelo'}</p>
                </div>
                {b.numero && (
                  <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold font-mono border border-slate-200">
                    #{b.numero}
                  </span>
                )}
              </div>
            ))}
            {(data?.boats || []).filter(b => 
              b.nome?.toLowerCase().includes(boatSearch.toLowerCase()) || 
              b.numero?.toLowerCase().includes(boatSearch.toLowerCase())
            ).length === 0 && (
              <div className="p-8 text-center text-slate-500">Nenhuma embarcação encontrada.</div>
            )}
          </div>
        </div>
      )}

      {/* Modal Seleção de Cliente (Mobile Otimizado) */}
      {isClientSelectOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="p-4 bg-white border-b border-slate-200 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Selecionar Cliente</h3>
              <button 
                onClick={() => setIsClientSelectOpen(false)}
                className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full cursor-pointer transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="relative">
              <input 
                type="text" 
                autoFocus
                placeholder="Buscar por nome..." 
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-shadow outline-none"
              />
              <svg className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 subtle-scrollbar">
            {possibleClients.filter(c => 
              c.nome?.toLowerCase().includes(clientSearch.toLowerCase())
            ).map(c => (
              <div 
                key={c.id} 
                onClick={() => {
                  setSelectedClientId(c.id);
                  setIsClientSelectOpen(false);
                  setClientSearch('');
                }}
                className="p-4 border-b border-slate-100 flex items-center justify-between active:bg-blue-50 cursor-pointer transition-colors last:border-0 rounded-xl"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{c.nome}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{c.cota ? `Cota: ${c.cota}` : 'Proprietário'}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </div>
            ))}
            {possibleClients.filter(c => 
              c.nome?.toLowerCase().includes(clientSearch.toLowerCase())
            ).length === 0 && (
              <div className="p-8 text-center text-slate-500">Nenhum cliente encontrado.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
