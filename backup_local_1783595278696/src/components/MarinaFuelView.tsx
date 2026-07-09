import React, { useState } from 'react';
import { Droplets, ChevronLeft, ChevronRight, User as UserIcon, Calendar, Check, FileText } from 'lucide-react';
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

  // Filter fuel transactions
  const fuelTransactions = (data?.transacoes || []).filter(t => {
    // Some logic may save it with dataVencimento or dataPagamento, we use the creation or payment date roughly, 
    // but MarinaDashboard saves it with dataVencimento: selectedDate
    return t.categoria === 'Combustível' && t.dataVencimento === selectedDate;
  });

  const totalLiters = fuelTransactions.reduce((acc, t) => {
    // Extrai os litros da descricao "Abastecimento Retorno: 50L a R$9/L..."
    const match = t.descricao.match(/:\s*([0-9.,]+)\s*L/);
    if (match) {
      return acc + parseFloat(match[1].replace(',', '.'));
    }
    return acc;
  }, 0);

  const totalValue = fuelTransactions.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const getEmbarcacao = (id: string) => data?.boats?.find(b => b.id === id);
  const getCliente = (id: string) => data?.clients?.find(c => c.id === id);

  return (
    <div className="w-full h-full flex flex-col bg-slate-100 overflow-hidden relative">
      {/* Date Navigator */}
      <div className="bg-white p-3 shadow-sm z-10 flex items-center justify-between border-b border-slate-200">
        <button onClick={handlePrevDay} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data do Abastecimento</span>
          <span className="text-base font-black text-slate-800 capitalize">{displayDateStr}</span>
        </div>
        <button onClick={handleNextDay} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 subtle-scrollbar pb-24">
        {fuelTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center mt-4">
            <Droplets className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-500">Nenhum abastecimento</h3>
            <p className="text-slate-400 text-xs mt-1">Não há registros de combustível para este dia.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo do Dia */}
            <div className="bg-blue-600 rounded-2xl shadow-md p-5 text-white flex justify-between items-center">
              <div>
                <span className="text-blue-200 text-xs font-bold uppercase tracking-wider block mb-1">Total do Dia</span>
                <span className="text-3xl font-black font-mono">{totalLiters} <span className="text-lg">L</span></span>
              </div>
              <div className="text-right">
                <span className="text-blue-200 text-xs font-bold uppercase tracking-wider block mb-1">Faturamento</span>
                <span className="text-xl font-bold font-mono text-green-300">R$ {totalValue.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            {/* Lista */}
            {fuelTransactions.map(t => {
              const boat = getEmbarcacao(t.embarcacaoId);
              const client = getCliente(t.clienteId);
              
              const isPago = t.status === 'pago';
              const matchLiters = t.descricao.match(/:\s*([0-9.,]+)\s*L/);
              const liters = matchLiters ? matchLiters[1] : '?';
              const isPix = t.descricao.toLowerCase().includes('pix');
              const isCredit = t.descricao.toLowerCase().includes('cartão');

              return (
                <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${isPago ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-lg text-slate-900 leading-none">
                          {boat?.nome || 'Desc.'}
                        </h3>
                        {boat?.numero && (
                          <span className="bg-slate-900 text-white px-2 py-0.5 rounded-md text-xs font-bold font-mono">
                            {boat.numero}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm flex items-center gap-1.5 font-medium">
                        <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{client?.nome || 'Cliente'}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-xl text-blue-600 block">{liters} L</span>
                      <span className="text-sm font-bold text-slate-700">R$ {Number(t.valor).toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Pagamento</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          isPago ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isPago ? 'Pago' : 'Aguardando Admin'}
                        </span>
                        <span className="text-xs font-medium text-slate-600">
                          {isPix ? 'Pix / Dinheiro' : isCredit ? 'Cartão de Crédito' : 'Cobrar Depois'}
                        </span>
                      </div>
                    </div>
                    {t.comprovanteUrl && (
                      <button 
                        onClick={() => setModalComprovante(t.comprovanteUrl)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        Comprovante
                      </button>
                    )}
                  </div>
                  
                  {t.operador && (
                    <div className="mt-3 text-right">
                      <span className="text-[10px] text-slate-400 font-medium">Registrado por: {t.operador}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comprovante Viewer Modal */}
      {modalComprovante && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/90 backdrop-blur-sm animate-in fade-in">
          <div className="p-4 flex justify-between items-center bg-slate-950">
            <h3 className="font-bold text-white text-lg">Comprovante de Abastecimento</h3>
            <button 
              onClick={() => setModalComprovante(null)} 
              className="p-2 bg-slate-800 text-slate-300 rounded-full active:bg-slate-700 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center subtle-scrollbar">
            {modalComprovante.endsWith('.pdf') ? (
              <div className="bg-white p-6 rounded-2xl flex flex-col items-center text-center">
                <FileText className="w-16 h-16 text-slate-400 mb-4" />
                <h4 className="font-bold text-slate-800 mb-2">Comprovante em PDF</h4>
                <a href={modalComprovante} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">
                  Abrir Arquivo Original
                </a>
              </div>
            ) : (
              <img src={modalComprovante} className="w-full max-w-lg rounded-xl shadow-2xl" alt="Comprovante" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
