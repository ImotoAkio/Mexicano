import React, { useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, CheckCircle2, Ship, User as UserIcon, Droplets, MapPin, Clock, ChevronDown, ChevronUp, Plus, Navigation, Anchor, Loader2, ArrowRight, Check, ArrowUpCircle } from 'lucide-react';
import { Cliente, Embarcacao, Reserva } from '../types';
import { logAction } from '../db';

const CHECKLIST_ANGLES = [
  { id: 'proa', label: 'Proa (Frente)', icon: Navigation },
  { id: 'popa', label: 'Popa (Motor/Traseira)', icon: Anchor },
  { id: 'bombordo', label: 'Lateral Esquerda', icon: Camera },
  { id: 'estibordo', label: 'Lateral Direita', icon: Camera },
  { id: 'painel', label: 'Interior / Painel', icon: Ship }
];

interface MarinaChecklistsViewProps {
  data: {
    reservations?: Reserva[];
    boats?: Embarcacao[];
    clients?: Cliente[];
  };
  operadorNome?: string;
  setData?: React.Dispatch<React.SetStateAction<any>>;
  reloadData?: () => void;
  isAdmin?: boolean;
}

export default function MarinaChecklistsView({ data, operadorNome, setData, reloadData, isAdmin }: MarinaChecklistsViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [modalPhotos, setModalPhotos] = useState<{ title: string; photos: string[] } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New Checklist Modal state
  const [isNewChecklistOpen, setIsNewChecklistOpen] = useState(false);
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [checklistMode, setChecklistMode] = useState<'descida' | 'chegada' | 'subida'>('descida');
  const [checklistFotos, setChecklistFotos] = useState<Record<string, string[]>>({});
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const checklistsDoDia = (data?.reservations || []).filter(r => {
    return r.data === selectedDate && r.status !== 'cancelado';
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

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>, angleId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAngle(angleId);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload/checklist-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setChecklistFotos(prev => ({ ...prev, [angleId]: [...(prev[angleId] || []), json.imageUrl] }));
    } catch (err) {
      alert('Erro ao fazer upload da foto.');
    } finally {
      setUploadingAngle(null);
    }
  };

  const handleUpdateChecklistTime = async (reservaId: string, field: 'horaDescida' | 'horaChegada' | 'horaSubida' | 'horaSaida', newValue: string) => {
    const reserva = data?.reservations?.find(r => r.id === reservaId);
    if (!reserva) return;
    
    const updated = { ...reserva, [field]: newValue };
    
    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updated })
      });
      
      if (setData) {
        setData((prev: any) => ({
          ...prev,
          reservations: (prev.reservations || []).map((r: any) => r.id === reservaId ? updated : r)
        }));
      }
      alert('Horário atualizado com sucesso!');
    } catch (err) {
      alert('Erro ao atualizar horário.');
    }
  };

  const handleClearChecklist = async (reservaId: string, type: 'descida' | 'chegada' | 'subida') => {
    if (!window.confirm(`Tem certeza que deseja apagar o registro de ${type}?`)) return;
    
    const reserva = data?.reservations?.find(r => r.id === reservaId);
    if (!reserva) return;
    
    const updated = { ...reserva };
    if (type === 'descida') {
      updated.horaDescida = '';
      updated.horaSaida = '';
      updated.fotosChecklistDescida = [];
      updated.fotosChecklistSaida = [];
      if (updated.statusMarina === 'pier') updated.statusMarina = 'agendado';
    } else if (type === 'chegada') {
      updated.horaChegada = '';
      updated.fotosChecklistChegada = [];
      if (updated.statusMarina === 'chegada') updated.statusMarina = 'pier';
    } else if (type === 'subida') {
      updated.horaSubida = '';
      updated.fotosChecklistSubida = [];
      if (updated.statusMarina === 'guardada') updated.statusMarina = 'chegada';
    }
    
    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updated })
      });
      
      if (setData) {
        setData((prev: any) => ({
          ...prev,
          reservations: (prev.reservations || []).map((r: any) => r.id === reservaId ? updated : r)
        }));
      }
      alert('Checklist excluído com sucesso!');
    } catch (err) {
      alert('Erro ao excluir checklist.');
    }
  };

  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoatId || !selectedClientId) {
      alert('Selecione a embarcação e o cliente.');
      return;
    }

    setIsSubmitting(true);
    const fotosArray = Object.values(checklistFotos).flat();
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Check if there is an existing reservation for this boat today
    let reservaToUpdate = data?.reservations?.find(r => r.embarcacaoId === selectedBoatId && r.data === selectedDate);
    
    let updatedReserva: any = {};
    if (reservaToUpdate) {
      updatedReserva = { ...reservaToUpdate };
    } else {
      // Create new standalone reservation
      updatedReserva = {
        id: `res_chk_${Date.now()}`,
        clienteId: selectedClientId,
        embarcacaoId: selectedBoatId,
        data: selectedDate,
        status: 'confirmado',
        statusMarina: 'agendado',
        fotosChecklistDescida: [],
        fotosChecklistChegada: [],
        fotosChecklistSubida: [],
        litrosAbastecidos: 0,
        createdAt: new Date().toISOString()
      };
    }

    if (checklistMode === 'descida') {
      updatedReserva.horaDescida = horaAtual;
      updatedReserva.fotosChecklistDescida = [...(updatedReserva.fotosChecklistDescida || []), ...fotosArray];
      updatedReserva.statusMarina = 'pier';
      updatedReserva.operadorDescida = operadorNome || 'Operador';
    } else if (checklistMode === 'chegada') {
      updatedReserva.horaChegada = horaAtual;
      updatedReserva.fotosChecklistChegada = [...(updatedReserva.fotosChecklistChegada || []), ...fotosArray];
      updatedReserva.statusMarina = 'chegada';
      updatedReserva.operadorChegada = operadorNome || 'Operador';
    } else if (checklistMode === 'subida') {
      updatedReserva.horaSubida = horaAtual;
      updatedReserva.fotosChecklistSubida = [...(updatedReserva.fotosChecklistSubida || []), ...fotosArray];
      updatedReserva.statusMarina = 'guardada';
      updatedReserva.operadorSubida = operadorNome || 'Operador';
    }

    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
      });
      
      if (setData) {
        setData((prev: any) => {
          const exists = prev.reservations?.some((r: any) => r.id === updatedReserva.id);
          let newReservations = prev.reservations || [];
          if (exists) {
            newReservations = newReservations.map((r: any) => r.id === updatedReserva.id ? updatedReserva : r);
          } else {
            newReservations = [...newReservations, updatedReserva];
          }
          return { ...prev, reservations: newReservations };
        });
      }

      await logAction(`Checklist ${checklistMode === 'descida' ? 'Descida' : checklistMode === 'chegada' ? 'Chegada' : 'Subida'}`, `Checklist salvo avulso.`, selectedBoatId, operadorNome);
      
      setIsNewChecklistOpen(false);
      alert('Checklist salvo com sucesso!');
    } catch (err) {
      alert('Erro ao salvar checklist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBoat = getEmbarcacao(selectedBoatId);
  const possibleClients = selectedBoat?.donos
    ? (data?.clients || []).filter(c => selectedBoat.donos.includes(c.id))
    : (data?.clients || []);

  const parseFotos = (fotosStr: any): string[] => {
    if (!fotosStr) return [];
    if (Array.isArray(fotosStr)) return fotosStr;
    if (typeof fotosStr !== 'string') return [];
    try {
      const parsed = JSON.parse(fotosStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return fotosStr.split(',').filter((f: string) => f.trim().length > 0);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 overflow-hidden relative font-sans">
      {/* Date Navigator Premium */}
      <div className="bg-white/80 backdrop-blur-md p-4 shadow-sm z-10 flex flex-wrap items-center justify-between border-b border-slate-200 sticky top-0 gap-3">
        <div className="flex items-center gap-2">
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

        <button
          onClick={() => {
            setIsNewChecklistOpen(true);
            setSelectedBoatId('');
            setSelectedClientId('');
            setChecklistFotos({});
            setChecklistMode('descida');
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer ml-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Checklist
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
              const descidaFotos = parseFotos(reserva.fotosChecklistDescida).length > 0 ? parseFotos(reserva.fotosChecklistDescida) : parseFotos(reserva.fotosChecklistSaida);
              const chegadaFotos = parseFotos(reserva.fotosChecklistChegada);
              const subidaPhotos = parseFotos(reserva.fotosChecklistSubida);
              
              const hasDescida = descidaFotos.length > 0;
              const hasChegada = chegadaFotos.length > 0;
              const hasSubida = subidaPhotos.length > 0;
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
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${hasSubida ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400 opacity-30'} transition-colors`} title="Subida (Guardada)">
                          <ArrowUpCircle className="w-3.5 h-3.5" />
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
                      {(hasDescida && (hasChegada || hasFuel || hasSubida)) && (
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
                              <div className="flex items-center gap-2">
                                {reserva.operadorDescida && (
                                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" title={`Operador: ${reserva.operadorDescida}`}>
                                    <UserIcon className="w-3 h-3"/>
                                    <span className="max-w-[80px] truncate">{reserva.operadorDescida}</span>
                                  </span>
                                )}
                                {isAdmin ? (
                                  <input 
                                    type="time" 
                                    value={reserva.horaDescida || reserva.horaSaida || ''}
                                    onChange={(e) => handleUpdateChecklistTime(reserva.id, 'horaDescida', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[11px] text-slate-700 font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                ) : (
                                  <span className="text-[11px] text-slate-500 font-mono font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                    <Clock className="w-3 h-3"/> {reserva.horaDescida || reserva.horaSaida}
                                  </span>
                                )}
                                {isAdmin && (
                                  <button onClick={(e) => { e.stopPropagation(); handleClearChecklist(reserva.id, 'descida'); }} className="text-red-500 hover:text-red-700 text-xs font-bold" title="Excluir Registro">Excluir</button>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2.5 overflow-x-auto subtle-scrollbar pb-2">
                              {descidaFotos.map((url: string, i: number) => (
                                <img 
                                  key={i} 
                                  src={url} 
                                  alt="Descida" 
                                  className="h-20 w-20 md:h-24 md:w-24 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80 hover:scale-[1.03] active:scale-95 transition-all shadow-sm shrink-0" 
                                  onClick={() => setModalPhotos({ title: `Descida - ${boat?.nome}`, photos: descidaFotos })}
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
                              <div className="flex items-center gap-2">
                                {reserva.operadorChegada && (
                                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" title={`Operador: ${reserva.operadorChegada}`}>
                                    <UserIcon className="w-3 h-3"/>
                                    <span className="max-w-[80px] truncate">{reserva.operadorChegada}</span>
                                  </span>
                                )}
                                {isAdmin ? (
                                  <input 
                                    type="time" 
                                    value={reserva.horaChegada || ''}
                                    onChange={(e) => handleUpdateChecklistTime(reserva.id, 'horaChegada', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[11px] text-slate-700 font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                ) : (
                                  <span className="text-[11px] text-slate-500 font-mono font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                    <Clock className="w-3 h-3"/> {reserva.horaChegada}
                                  </span>
                                )}
                                {isAdmin && (
                                  <button onClick={(e) => { e.stopPropagation(); handleClearChecklist(reserva.id, 'chegada'); }} className="text-red-500 hover:text-red-700 text-xs font-bold" title="Excluir Registro">Excluir</button>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2.5 overflow-x-auto subtle-scrollbar pb-2">
                              {chegadaFotos.map((url: string, i: number) => (
                                <img 
                                  key={i} 
                                  src={url} 
                                  alt="Chegada" 
                                  className="h-20 w-20 md:h-24 md:w-24 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80 hover:scale-[1.03] active:scale-95 transition-all shadow-sm shrink-0" 
                                  onClick={() => setModalPhotos({ title: `Chegada - ${boat?.nome}`, photos: chegadaFotos })}
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
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase text-orange-600/80 tracking-widest block">Abastecimento Registrado</span>
                                {reserva.operadorChegada && (
                                  <span className="text-[10px] text-orange-700/70 font-medium flex items-center gap-1 px-1.5 py-0.5 bg-orange-100/50 rounded-md" title={`Registrado por: ${reserva.operadorChegada}`}>
                                    <UserIcon className="w-3 h-3"/>
                                    <span className="max-w-[70px] truncate">{reserva.operadorChegada}</span>
                                  </span>
                                )}
                                {reserva.horaChegada && (
                                  <span className="text-[10px] text-orange-700/70 font-medium flex items-center gap-1 px-1.5 py-0.5 bg-orange-100/50 rounded-md">
                                    <Clock className="w-3 h-3"/> {reserva.horaChegada}
                                  </span>
                                )}
                              </div>
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

                      {/* Step 4: Subida */}
                      {hasSubida && (
                        <div className="relative z-10 flex gap-4" onClick={(e) => e.stopPropagation()}>
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border-[3px] border-slate-50 shadow-sm">
                            <ArrowUpCircle className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Subida (Guardada)</span>
                              <div className="flex items-center gap-2">
                                {reserva.operadorSubida && (
                                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" title={`Operador: ${reserva.operadorSubida}`}>
                                    <UserIcon className="w-3 h-3"/>
                                    <span className="max-w-[80px] truncate">{reserva.operadorSubida}</span>
                                  </span>
                                )}
                                {isAdmin ? (
                                  <input 
                                    type="time" 
                                    value={reserva.horaSubida || ''}
                                    onChange={(e) => handleUpdateChecklistTime(reserva.id, 'horaSubida', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[11px] text-slate-700 font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                ) : (
                                  <span className="text-[11px] text-slate-500 font-mono font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                    <Clock className="w-3 h-3"/> {reserva.horaSubida}
                                  </span>
                                )}
                                {isAdmin && (
                                  <button onClick={(e) => { e.stopPropagation(); handleClearChecklist(reserva.id, 'subida'); }} className="text-red-500 hover:text-red-700 text-xs font-bold" title="Excluir Registro">Excluir</button>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2.5 overflow-x-auto subtle-scrollbar pb-2">
                              {subidaPhotos.map((url: string, i: number) => (
                                <img 
                                  key={i} 
                                  src={url} 
                                  alt="Subida" 
                                  className="h-20 w-20 md:h-24 md:w-24 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80 hover:scale-[1.03] active:scale-95 transition-all shadow-sm shrink-0" 
                                  onClick={() => setModalPhotos({ title: `Subida - ${boat?.nome}`, photos: subidaPhotos })}
                                />
                              ))}
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

      {/* Modal Novo Checklist Avulso */}
      {isNewChecklistOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsNewChecklistOpen(false)}></div>
          
          <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl relative z-10 animate-slide-up-fast pb-8 md:pb-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 shrink-0 md:hidden"></div>
            
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 leading-none">Novo Checklist</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Registrar fotos e movimento</p>
                </div>
              </div>
              <button onClick={() => setIsNewChecklistOpen(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full active:bg-slate-200 cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveChecklist} className="p-5 space-y-5 overflow-y-auto subtle-scrollbar">
              
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

              {/* Tipo de Checklist */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Tipo de Movimento *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'descida', label: 'Descida' },
                    { id: 'chegada', label: 'Chegada' },
                    { id: 'subida', label: 'Subida' }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setChecklistMode(type.id as any)}
                      className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border ${
                        checklistMode === type.id 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Câmera / Fotos */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Fotos do Estado da Embarcação</label>
                <div className="grid grid-cols-2 gap-3">
                  {CHECKLIST_ANGLES.map(angle => {
                    const Icon = angle.icon;
                    const fotos = checklistFotos[angle.id] || [];
                    const isUploaded = fotos.length > 0;
                    const isUploading = uploadingAngle === angle.id;

                    return (
                      <div key={angle.id} className="relative flex flex-col gap-2">
                        {fotos.length > 0 && (
                          <div className="flex overflow-x-auto gap-2 pb-1 subtle-scrollbar">
                            {fotos.map((url, i) => (
                              <img key={i} src={url} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" alt="Miniatura" />
                            ))}
                          </div>
                        )}
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            onChange={(e) => handleUploadPhoto(e, angle.id)}
                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                            disabled={isUploading}
                          />
                          
                          <div className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 h-24 transition-colors ${
                            isUploaded 
                              ? 'border-blue-200 bg-blue-50 active:bg-blue-100' 
                              : 'border-slate-200 bg-slate-50 active:bg-slate-100'
                          }`}>
                            {isUploading ? (
                              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            ) : (
                              <Icon className={`w-6 h-6 ${isUploaded ? 'text-blue-500' : 'text-slate-400'}`} />
                            )}
                            
                            <div>
                              <span className={`block text-[11px] font-bold leading-tight ${isUploaded ? 'text-blue-700' : 'text-slate-700'}`}>
                                {isUploaded ? `${angle.label} (${fotos.length})` : angle.label}
                              </span>
                              {isUploaded && <span className="text-[10px] text-blue-600 font-medium">Toque para mais</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || uploadingAngle !== null}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer mt-4"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Salvar Checklist
                  </>
                )}
              </button>
            </form>
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
