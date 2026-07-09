import React, { useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, CheckCircle2, Ship, User as UserIcon, AlertTriangle } from 'lucide-react';
import { Cliente, Embarcacao, Reserva } from '../types';

interface MarinaChecklistsViewProps {
  data: {
    reservations?: Reserva[];
    boats?: Embarcacao[];
    clients?: Cliente[];
  };
}

export default function MarinaChecklistsView({ data }: MarinaChecklistsViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [modalPhotos, setModalPhotos] = useState<{ title: string; photos: string[] } | null>(null);

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

  // Filter checklists
  const checklistsDoDia = (data?.reservations || []).filter(r => {
    return r.data === selectedDate && 
      (r.fotosChecklistSaida?.length > 0 || r.fotosChecklistChegada?.length > 0);
  });

  const getEmbarcacao = (id: string) => data?.boats?.find(b => b.id === id);
  const getCliente = (id: string) => data?.clients?.find(c => c.id === id);

  return (
    <div className="w-full h-full flex flex-col bg-slate-100 overflow-hidden relative">
      {/* Date Navigator (Header inside view) */}
      <div className="bg-white p-3 shadow-sm z-10 flex items-center justify-between border-b border-slate-200">
        <button onClick={handlePrevDay} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data do Checklist</span>
          <span className="text-base font-black text-slate-800 capitalize">{displayDateStr}</span>
        </div>
        <button onClick={handleNextDay} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 subtle-scrollbar pb-24">
        {checklistsDoDia.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center mt-4">
            <Camera className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-500">Nenhum checklist</h3>
            <p className="text-slate-400 text-xs mt-1">Nenhum registro fotográfico foi feito neste dia.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {checklistsDoDia.map(reserva => {
              const boat = getEmbarcacao(reserva.embarcacaoId);
              const client = getCliente(reserva.clienteId);
              
              return (
                <div key={reserva.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                  <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
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
                        <span className="truncate max-w-[200px]">{client?.nome || 'Cliente'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {reserva.fotosChecklistSaida && reserva.fotosChecklistSaida.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                            <Ship className="w-3 h-3"/> Descida (Pier)
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{reserva.horaSaida || reserva.horaDescida}</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto subtle-scrollbar pb-2">
                          {reserva.fotosChecklistSaida.map((url: string, i: number) => (
                            <img 
                              key={i} 
                              src={url} 
                              alt="Descida" 
                              className="h-20 w-20 object-cover rounded-xl border border-slate-200 cursor-pointer active:opacity-70 transition-opacity" 
                              onClick={() => setModalPhotos({ title: `Descida - ${boat?.nome}`, photos: reserva.fotosChecklistSaida! })}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {reserva.fotosChecklistChegada && reserva.fotosChecklistChegada.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500"/> Chegada
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{reserva.horaChegada}</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto subtle-scrollbar pb-2">
                          {reserva.fotosChecklistChegada.map((url, i) => (
                            <img 
                              key={i} 
                              src={url} 
                              alt="Chegada" 
                              className="h-20 w-20 object-cover rounded-xl border border-slate-200 cursor-pointer active:opacity-70 transition-opacity" 
                              onClick={() => setModalPhotos({ title: `Chegada - ${boat?.nome}`, photos: reserva.fotosChecklistChegada! })}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Photo Viewer Modal */}
      {modalPhotos && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/90 backdrop-blur-sm animate-in fade-in">
          <div className="p-4 flex justify-between items-center bg-slate-950">
            <h3 className="font-bold text-white text-lg">{modalPhotos.title}</h3>
            <button 
              onClick={() => setModalPhotos(null)} 
              className="p-2 bg-slate-800 text-slate-300 rounded-full active:bg-slate-700 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col items-center subtle-scrollbar">
            {modalPhotos.photos.map((url, i) => (
              <img key={i} src={url} className="w-full max-w-lg rounded-xl shadow-2xl" alt="Checklist Full" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
