import React, { useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, CheckCircle2, Ship, User as UserIcon, Droplets, MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react';
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

  const checklistsDoDia = (data?.reservations || []).filter(r => {
    return r.data === selectedDate && 
      (r.fotosChecklistSaida?.length > 0 || r.fotosChecklistDescida?.length > 0 || r.fotosChecklistChegada?.length > 0 || r.litrosAbastecidos > 0);
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
    <div className="w-full h-full flex flex-col bg-slate-50 overflow-hidden relative font-sans">
      {/* Date Navigator Premium */}
      <div className="bg-white/80 backdrop-blur-md p-4 shadow-sm z-10 flex items-center justify-between border-b border-slate-200 sticky top-0">
        <button onClick={handlePrevDay} className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 cursor-pointer">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Operações do Dia</span>
          <span className="text-lg font-black text-slate-800 capitalize tracking-tight">{displayDateStr}</span>
        </div>
        <button onClick={handleNextDay} className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 cursor-pointer">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 subtle-scrollbar pb-28">
        {checklistsDoDia.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-10 text-center flex flex-col items-center mt-4 shadow-sm">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Camera className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Nenhum Registro</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-[250px]">As descidas, chegadas e abastecimentos de hoje aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {checklistsDoDia.map(reserva => {
              const boat = getEmbarcacao(reserva.embarcacaoId);
              const client = getCliente(reserva.clienteId);
              const hasDescida = reserva.fotosChecklistDescida?.length > 0 || reserva.fotosChecklistSaida?.length > 0;
              const hasChegada = reserva.fotosChecklistChegada?.length > 0;
              const hasFuel = (reserva.litrosAbastecidos ?? 0) > 0;
              const isExpanded = expandedId === reserva.id;
              
              return (
                <div key={reserva.id} className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200/80 overflow-hidden relative cursor-pointer ${isExpanded ? 'ring-2 ring-blue-500/20' : ''}`} onClick={() => toggleExpand(reserva.id)}>
                  
                  {/* Card Header Minimalista */}
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <Ship className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 tracking-tight leading-none">
                            {boat?.nome || 'Desc.'}
                          </h3>
                          {boat?.numero && (
                            <span className="bg-slate-800 text-white px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider">
                              #{boat.numero}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 text-xs font-medium mt-1 truncate max-w-[150px] sm:max-w-[300px]">
                          {client?.nome || 'Cliente'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-5">
                      {/* Ícones de Status */}
                      <div className="flex items-center gap-1.5 md:gap-2 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${hasDescida ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400 opacity-30'} transition-colors`} title="Descida (Pier)">
                          <Ship className="w-3.5 h-3.5" />
                        </div>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${hasChegada ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400 opacity-30'} transition-colors`} title="Retorno/Chegada">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${hasFuel ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-400 opacity-30'} transition-colors`} title="Abastecimento">
                          <Droplets className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <div className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-100 rounded-full">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Linha do Tempo da Operação (Exibida apenas quando expandido) */}
                  <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100 border-t border-slate-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-5 flex flex-col gap-6 relative bg-slate-50/50">
                      {/* Linha conectora de timeline */}
                      {(hasDescida && hasChegada) && (
                        <div className="absolute left-9 top-8 bottom-8 w-[2px] bg-slate-200 -z-0"></div>
                      )}

                      {/* Step 1: Descida */}
                      {hasDescida && (
                        <div className="relative z-10 flex gap-4" onClick={(e) => e.stopPropagation()}>
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border-[3px] border-slate-50 shadow-sm">
                            <Ship className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black uppercase text-blue-600 tracking-wider">Descida (Pier)</span>
                              <span className="text-[11px] text-slate-500 font-mono font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"><Clock className="w-3 h-3"/> {reserva.horaDescida || reserva.horaSaida}</span>
                            </div>
                            <div className="flex gap-2.5 overflow-x-auto subtle-scrollbar pb-2">
                              {(reserva.fotosChecklistDescida || reserva.fotosChecklistSaida || []).map((url: string, i: number) => (
                                <img 
                                  key={i} 
                                  src={url} 
                                  alt="Descida" 
                                  className="h-20 w-20 md:h-24 md:w-24 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80 hover:scale-[1.03] active:scale-95 transition-all shadow-sm shrink-0" 
                                  onClick={() => setModalPhotos({ title: `Descida - ${boat?.nome}`, photos: reserva.fotosChecklistDescida || reserva.fotosChecklistSaida || [] })}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Chegada */}
                      {hasChegada && (
                        <div className="relative z-10 flex gap-4" onClick={(e) => e.stopPropagation()}>
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border-[3px] border-slate-50 shadow-sm">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">Retorno à Marina</span>
                              <span className="text-[11px] text-slate-500 font-mono font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"><Clock className="w-3 h-3"/> {reserva.horaChegada}</span>
                            </div>
                            <div className="flex gap-2.5 overflow-x-auto subtle-scrollbar pb-2">
                              {reserva.fotosChecklistChegada.map((url, i) => (
                                <img 
                                  key={i} 
                                  src={url} 
                                  alt="Chegada" 
                                  className="h-20 w-20 md:h-24 md:w-24 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80 hover:scale-[1.03] active:scale-95 transition-all shadow-sm shrink-0" 
                                  onClick={() => setModalPhotos({ title: `Chegada - ${boat?.nome}`, photos: reserva.fotosChecklistChegada! })}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Combustível (Integração) */}
                      {hasFuel && (
                        <div className="relative z-10 flex gap-4 mt-1" onClick={(e) => e.stopPropagation()}>
                           <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border-[3px] border-slate-50 shadow-sm">
                            <Droplets className="w-4 h-4 text-orange-600" />
                          </div>
                          <div className="flex-1 bg-gradient-to-r from-orange-50 to-amber-50/50 rounded-xl border border-orange-100 p-4 flex items-center justify-between shadow-sm">
                            <div>
                              <span className="text-[10px] font-black uppercase text-orange-600/80 tracking-widest block mb-1">Abastecimento Registrado</span>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-orange-700 font-mono leading-none">{reserva.litrosAbastecidos}</span>
                                <span className="text-sm font-bold text-orange-600/70">Litros</span>
                              </div>
                            </div>
                            <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm text-orange-500 border border-orange-100/50">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Fotográfico */}
      {modalPhotos && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 flex justify-between items-center bg-transparent relative z-10">
            <h3 className="font-black tracking-tight text-white text-xl">{modalPhotos.title}</h3>
            <button 
              onClick={() => setModalPhotos(null)} 
              className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-90 cursor-pointer backdrop-blur-md"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-12 space-y-6 flex flex-col items-center subtle-scrollbar relative z-0">
            {modalPhotos.photos.map((url, i) => (
              <img key={i} src={url} className="w-full max-w-2xl rounded-2xl shadow-2xl ring-1 ring-white/10" alt="Checklist Full" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
