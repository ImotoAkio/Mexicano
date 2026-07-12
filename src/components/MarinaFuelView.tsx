import React, { useState } from 'react';
import { Droplets, ChevronLeft, ChevronRight, FileText, User as UserIcon, CheckCircle2, Clock, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Cliente, Embarcacao } from '../types';

interface MarinaFuelViewProps {
  data: {
    transacoes?: any[];
    boats?: Embarcacao[];
    clients?: Cliente[];
  };
}

export default function MarinaFuelView({ data }: MarinaFuelViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [modalComprovante, setModalComprovante] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  // Filter fuel transactions for the selected day
  const fuelTransactions = (data?.transacoes || []).filter(t => 
    (t.categoria === 'receita_combustivel' || t.categoria === 'Combustível' || t.categoria === 'combustivel') && 
    (t.data === selectedDate || t.dataVencimento === selectedDate)
  );

  let totalLiters = 0;
  let totalValue = 0;

  fuelTransactions.forEach(t => {
    totalValue += Number(t.valor);
    const match = t.descricao.match(/:\s*([0-9.,]+)\s*L/);
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

  return (
    <div className="w-full h-full flex flex-col bg-[#F8FAFC] overflow-hidden relative font-sans">
      {/* Date Navigator Premium */}
      <div className="bg-white/80 backdrop-blur-md p-4 shadow-sm z-10 flex items-center justify-between border-b border-slate-200 sticky top-0">
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

      <div className="flex-1 overflow-y-auto p-4 md:p-6 subtle-scrollbar pb-28">
        {fuelTransactions.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-10 text-center flex flex-col items-center mt-4 shadow-sm">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Droplets className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Nenhum Abastecimento</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-[250px]">Nenhuma lancha registrou consumo de combustível neste dia.</p>
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
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 pl-2">Lançamentos do Dia</h3>
              
              {fuelTransactions.map(t => {
                const boat = getEmbarcacao(t.embarcacaoId);
                const client = getCliente(t.clienteId);
                const isExpanded = expandedId === t.id;
                
                const isPago = t.status === 'pago';
                const matchLiters = t.descricao.match(/:\s*([0-9.,]+)\s*L/);
                const liters = matchLiters ? matchLiters[1] : '?';
                const isPix = t.descricao.toLowerCase().includes('pix') || t.descricao.toLowerCase().includes('dinheiro');
                const isCredit = t.descricao.toLowerCase().includes('cart') || t.descricao.toLowerCase().includes('crédito') || t.descricao.toLowerCase().includes('debito') || t.descricao.toLowerCase().includes('débito');

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
                              {boat?.nome || 'Desc.'}
                            </h3>
                            {boat?.numero && (
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border border-slate-200 shrink-0">
                                #{boat.numero}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500 text-xs font-medium mt-1 truncate">
                            {client?.nome || 'Cliente'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-black text-lg text-blue-600 tracking-tight leading-none">
                            {liters} <span className="text-sm text-blue-400">L</span>
                          </span>
                          <span className="text-xs font-bold text-slate-400 mt-1">R$ {Number(t.valor).toFixed(2).replace('.', ',')}</span>
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
    </div>
  );
}
