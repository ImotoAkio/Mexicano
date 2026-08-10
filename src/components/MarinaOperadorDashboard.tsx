import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LogOut, 
  Ship, 
  Clock, 
  CheckCircle2, 
  Droplets, 
  ArrowRight, 
  Loader2, 
  Save, 
  Camera, 
  Navigation, 
  Anchor, 
  Image as ImageIcon, 
  Check, 
  User as UserIcon, 
  ClipboardList, 
  Search, 
  X, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Layers,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import Logo from './Logo';
import { io } from 'socket.io-client';
import { logAction } from '../db';

interface MarinaOperadorDashboardProps {
  onLogout: () => void;
  operadorNome?: string;
}

const CHECKLIST_ANGLES = [
  { id: 'proa', label: 'Proa (Frente)', icon: Navigation },
  { id: 'popa', label: 'Popa (Motor/Traseira)', icon: Anchor },
  { id: 'bombordo', label: 'Lateral Esquerda', icon: Camera },
  { id: 'estibordo', label: 'Lateral Direita', icon: Camera },
  { id: 'painel', label: 'Interior / Painel', icon: Ship },
  { id: 'casco', label: 'Casco (Ângulo Inferior)', icon: Layers }
];

const getFormattedDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function MarinaOperadorDashboard({ onLogout, operadorNome }: MarinaOperadorDashboardProps) {
  const [data, setData] = useState<any>({ reservations: [], boats: [], clients: [] });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getFormattedDate(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'hoje' | 'concluidos' | 'todos'>('hoje');

  // Modals State
  const [selectedReserva, setSelectedReserva] = useState<any>(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistMode, setChecklistMode] = useState<'descida' | 'chegada' | 'subida'>('descida');
  const [checklistFotos, setChecklistFotos] = useState<Record<string, string[]>>({});
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fuel Modal State
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [liters, setLiters] = useState('');
  const [paymentType, setPaymentType] = useState<'pix' | 'credit' | 'admin'>('pix');
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/db/pull', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const dbData = await response.json();
        setData(dbData);
      }
    } catch (err) {
      console.error("Erro ao carregar dados operacionais:", err);
      showToast("Erro de conexão ao carregar dados", "warning");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    const socket = io(window.location.origin, {
      auth: { token: localStorage.getItem('admin_token') }
    });

    socket.on('marina_update', (payload: any) => {
      if (!payload?.reservation) {
        fetchData();
        return;
      }
      const { reservation, action } = payload;
      setData((prev: any) => {
        if (!prev) return prev;
        let updatedReservations = [...(prev.reservations || [])];
        if (action === 'delete') {
          updatedReservations = updatedReservations.filter((r: any) => r.id !== reservation.id);
        } else if (action === 'new') {
          const exists = updatedReservations.some((r: any) => r.id === reservation.id);
          if (!exists) updatedReservations.push(reservation);
        } else {
          const idx = updatedReservations.findIndex((r: any) => r.id === reservation.id);
          if (idx !== -1) updatedReservations[idx] = reservation;
          else updatedReservations.push(reservation);
        }
        return { ...prev, reservations: updatedReservations };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Upload photo handler
  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>, angleId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'checklist');

    setUploadingAngle(angleId);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData
      });
      const resData = await response.json();
      if (response.ok && resData.url) {
        setChecklistFotos(prev => ({
          ...prev,
          [angleId]: [...(prev[angleId] || []), resData.url]
        }));
        showToast(`Foto adicionada com sucesso!`, 'success');
      } else {
        showToast("Erro ao fazer upload da foto.", 'warning');
      }
    } catch {
      showToast("Falha no envio da imagem.", 'warning');
    } finally {
      setUploadingAngle(null);
    }
  };

  // Submit checklist
  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReserva) return;
    setIsSubmitting(true);

    try {
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const fotosArray = Object.values(checklistFotos).flat();
      const updatedReserva = { ...selectedReserva };

      if (checklistMode === 'descida') {
        updatedReserva.horaDescida = updatedReserva.horaDescida || now;
        updatedReserva.statusOperacional = 'pronto_na_agua';
        updatedReserva.fotosChecklistDescida = [...(updatedReserva.fotosChecklistDescida || []), ...fotosArray];
      } else if (checklistMode === 'chegada') {
        updatedReserva.horaChegada = updatedReserva.horaChegada || now;
        updatedReserva.statusOperacional = 'retornou';
        updatedReserva.fotosChecklistChegada = [...(updatedReserva.fotosChecklistChegada || []), ...fotosArray];
      } else if (checklistMode === 'subida') {
        updatedReserva.horaSubida = updatedReserva.horaSubida || now;
        updatedReserva.statusOperacional = 'guardado';
        updatedReserva.fotosChecklistSubida = [...(updatedReserva.fotosChecklistSubida || []), ...fotosArray];
      }

      const response = await fetch('/api/db/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          action: 'upsert_reservation',
          reservation: updatedReserva
        })
      });

      if (response.ok) {
        logAction(
          operadorNome || 'Marinheiro',
          'CHECKLIST_CONCLUIDO',
          `Checklist de ${checklistMode.toUpperCase()} finalizado para barco ${updatedReserva.barcoNome || updatedReserva.embarcacaoId}`
        );
        showToast(`Checklist de ${checklistMode} gravado com sucesso!`, 'success');
        setChecklistOpen(false);
        fetchData();
      } else {
        showToast("Erro ao salvar checklist.", 'warning');
      }
    } catch {
      showToast("Falha de conexão ao salvar checklist.", 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open checklist modal
  const openChecklistModal = (reserva: any, mode: 'descida' | 'chegada' | 'subida') => {
    setSelectedReserva(reserva);
    setChecklistMode(mode);
    setChecklistFotos({});
    setChecklistOpen(true);
  };

  // Open fuel modal
  const openFuelModal = (reserva: any) => {
    setSelectedReserva(reserva);
    setLiters('');
    setPaymentType('pix');
    setComprovanteUrl(null);
    setFuelModalOpen(true);
  };

  // Submit fuel
  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReserva || !liters) return;
    setIsSubmitting(true);

    try {
      const litersNum = parseFloat(liters);
      const updatedReserva = {
        ...selectedReserva,
        abastecimentoSolucao: true,
        abastecimentoLitros: litersNum,
        abastecimentoFormaPagamento: paymentType,
        abastecimentoComprovanteUrl: comprovanteUrl || selectedReserva.abastecimentoComprovanteUrl,
        abastecimentoDataHora: new Date().toISOString()
      };

      const response = await fetch('/api/db/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          action: 'upsert_reservation',
          reservation: updatedReserva
        })
      });

      if (response.ok) {
        logAction(
          operadorNome || 'Marinheiro',
          'ABASTECIMENTO_REGISTRADO',
          `Registrado ${litersNum}L (${paymentType}) para barco ${updatedReserva.barcoNome || updatedReserva.embarcacaoId}`
        );
        showToast(`Abastecimento de ${litersNum}L registrado!`, 'success');
        setFuelModalOpen(false);
        fetchData();
      } else {
        showToast("Erro ao salvar abastecimento.", 'warning');
      }
    } catch {
      showToast("Erro ao conectar com o servidor.", 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter reservations
  const filteredReservations = (data.reservations || []).filter((r: any) => {
    const isDateMatch = r.date === selectedDate;
    if (!isDateMatch) return false;

    const boat = (data.boats || []).find((b: any) => b.id === r.embarcacaoId);
    const client = (data.clients || []).find((c: any) => c.id === r.clienteId);
    const query = searchTerm.toLowerCase();

    const matchesSearch = 
      !searchTerm ||
      (boat?.nome || '').toLowerCase().includes(query) ||
      (client?.nome || '').toLowerCase().includes(query) ||
      (boat?.vaga || '').toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (activeTabFilter === 'hoje') {
      return r.statusOperacional !== 'guardado';
    } else if (activeTabFilter === 'concluidos') {
      return r.statusOperacional === 'guardado';
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans pb-12">
      {/* Toast Banner */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 border transition-all ${
          toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' :
          toast.type === 'warning' ? 'bg-amber-500 text-white border-amber-400' :
          'bg-blue-600 text-white border-blue-400'
        }`}>
          <Sparkles className="w-4 h-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Mobile-First */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Logo className="h-7 w-auto text-[#B69D74]" />
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
              <span>Píer Operacional</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 text-[10px] font-bold border border-cyan-800 uppercase">Marinheiro</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Operador: <strong className="text-slate-200">{operadorNome || 'Operador Píer'}</strong></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchData(true)} 
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button 
            onClick={onLogout} 
            className="p-2 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl border border-red-800 transition-colors"
            title="Sair do painel"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Action Toolbar */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
        {/* Date & Quick Status Bar */}
        <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/80 space-y-3 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full"
            />
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por barco, vaga ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 pl-9 pr-8 py-2 rounded-xl text-xs border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-700/60 text-xs font-semibold">
            <button 
              onClick={() => setActiveTabFilter('hoje')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center ${activeTabFilter === 'hoje' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Na Fila / Píer
            </button>
            <button 
              onClick={() => setActiveTabFilter('concluidos')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center ${activeTabFilter === 'concluidos' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Guardados
            </button>
            <button 
              onClick={() => setActiveTabFilter('todos')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center ${activeTabFilter === 'todos' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Todos ({filteredReservations.length})
            </button>
          </div>
        </div>

        {/* Operational Cards */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
            <p className="text-xs font-semibold">Carregando lista do píer...</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="bg-slate-800/40 rounded-2xl p-8 text-center border border-slate-700/50 space-y-2">
            <Ship className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">Nenhum agendamento encontrado</h3>
            <p className="text-xs text-slate-500">Altere a data ou os termos de busca para visualizar os barcos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReservations.map((reserva: any) => {
              const boat = (data.boats || []).find((b: any) => b.id === reserva.embarcacaoId);
              const client = (data.clients || []).find((c: any) => c.id === reserva.clienteId);

              const isPronto = reserva.statusOperacional === 'pronto_na_agua';
              const isRetornou = reserva.statusOperacional === 'retornou';
              const isGuardado = reserva.statusOperacional === 'guardado';

              return (
                <div 
                  key={reserva.id} 
                  className={`bg-slate-800/90 rounded-2xl p-4 border transition-all shadow-md space-y-3 ${
                    isPronto ? 'border-blue-500/60 bg-blue-950/20' :
                    isRetornou ? 'border-amber-500/60 bg-amber-950/20' :
                    isGuardado ? 'border-emerald-500/40 bg-emerald-950/10' :
                    'border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  {/* Boat Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-700/60 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-0.5">
                        {boat?.vaga ? `Vaga: ${boat.vaga}` : 'Vaga N/I'} • {reserva.periodo === 'manha' ? 'Manhã' : reserva.periodo === 'tarde' ? 'Tarde' : 'Dia Inteiro'}
                      </span>
                      <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
                        <Ship className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{boat?.nome || reserva.barcoNome || 'Embarcação'}</span>
                      </h2>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>{client?.nome || reserva.clienteNome || 'Cliente'}</span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shrink-0 ${
                      isPronto ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                      isRetornou ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                      isGuardado ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                      'bg-slate-700/60 text-slate-300 border-slate-600'
                    }`}>
                      {isPronto ? 'Pronto na Água' : isRetornou ? 'Retornou' : isGuardado ? 'Guardado' : 'Agendado'}
                    </span>
                  </div>

                  {/* Timestamps Info */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/40">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Descida</span>
                      <span className="font-mono text-slate-200 font-bold">{reserva.horaDescida || '--:--'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Chegada</span>
                      <span className="font-mono text-slate-200 font-bold">{reserva.horaChegada || '--:--'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Subida</span>
                      <span className="font-mono text-slate-200 font-bold">{reserva.horaSubida || '--:--'}</span>
                    </div>
                  </div>

                  {/* Operational Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {!isPronto && !isRetornou && !isGuardado && (
                      <button
                        onClick={() => openChecklistModal(reserva, 'descida')}
                        className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer col-span-2"
                      >
                        <ArrowDownCircle className="w-4 h-4" />
                        <span>Checklist Descida Píer</span>
                      </button>
                    )}

                    {isPronto && (
                      <button
                        onClick={() => openChecklistModal(reserva, 'chegada')}
                        className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer col-span-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Checklist Chegada Píer</span>
                      </button>
                    )}

                    {isRetornou && (
                      <button
                        onClick={() => openChecklistModal(reserva, 'subida')}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer col-span-2"
                      >
                        <ArrowUpCircle className="w-4 h-4" />
                        <span>Checklist Subida / Vaga</span>
                      </button>
                    )}

                    {/* Secondary Actions */}
                    <button
                      onClick={() => openFuelModal(reserva)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                        reserva.abastecimentoSolucao 
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' 
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
                      }`}
                    >
                      <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{reserva.abastecimentoSolucao ? `${reserva.abastecimentoLitros}L Registrado` : 'Abastecer'}</span>
                    </button>

                    <button
                      onClick={() => openChecklistModal(reserva, isGuardado ? 'subida' : isRetornou ? 'chegada' : 'descida')}
                      className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Camera className="w-3.5 h-3.5 text-slate-400" />
                      <span>Fotos Checklist</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Checklist Modal */}
      {checklistOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>Checklist de {checklistMode.toUpperCase()}</span>
                </h3>
                <p className="text-[11px] text-slate-400">{selectedReserva?.barcoNome || 'Embarcação'}</p>
              </div>
              <button onClick={() => setChecklistOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveChecklist} className="p-4 overflow-y-auto space-y-4 flex-1 subtle-scrollbar">
              <p className="text-xs text-slate-300">
                Tire fotos dos ângulos da embarcação para comprovar o estado no momento da operação:
              </p>

              {/* Angles Grid */}
              <div className="grid grid-cols-2 gap-3">
                {CHECKLIST_ANGLES.map((angle) => {
                  const Icon = angle.icon;
                  const fotos = checklistFotos[angle.id] || [];
                  const isUploaded = fotos.length > 0;
                  const isUploading = uploadingAngle === angle.id;

                  return (
                    <div key={angle.id} className="relative flex flex-col gap-1.5">
                      {fotos.length > 0 && (
                        <div className="flex overflow-x-auto gap-1.5 pb-1 subtle-scrollbar">
                          {fotos.map((url, i) => (
                            <img key={i} src={url} className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" alt="Foto" />
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
                        <div className={`border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1.5 h-24 transition-all ${
                          isUploaded ? 'border-cyan-500/80 bg-cyan-950/30' : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'
                        }`}>
                          {isUploading ? (
                            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                          ) : (
                            <Icon className={`w-5 h-5 ${isUploaded ? 'text-cyan-400' : 'text-slate-400'}`} />
                          )}
                          <span className={`text-[11px] font-bold leading-tight ${isUploaded ? 'text-cyan-300' : 'text-slate-300'}`}>
                            {angle.label}
                          </span>
                          <span className="text-[9px] text-slate-500 font-semibold">
                            {isUploaded ? `${fotos.length} foto(s)` : 'Tocar p/ câmera'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || uploadingAngle !== null}
                className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Finalizar e Salvar Checklist</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Fuel Modal */}
      {fuelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <span>Registrar Abastecimento</span>
              </h3>
              <button onClick={() => setFuelModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFuel} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">Litros de Combustível *</label>
                <input 
                  type="number"
                  step="0.1"
                  required
                  placeholder="Ex: 50.5"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPaymentType('pix')}
                    className={`py-2 rounded-xl border transition-all ${paymentType === 'pix' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                  >
                    PIX
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('credit')}
                    className={`py-2 rounded-xl border transition-all ${paymentType === 'credit' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                  >
                    Cartão
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('admin')}
                    className={`py-2 rounded-xl border transition-all ${paymentType === 'admin' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                  >
                    Faturado
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !liters}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salvar Abastecimento</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
