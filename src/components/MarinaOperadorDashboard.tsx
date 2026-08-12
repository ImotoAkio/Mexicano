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
  Check, 
  User as UserIcon, 
  ClipboardList, 
  Search, 
  X, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Logo from './Logo';
import { io } from 'socket.io-client';
import { logAction } from '../db';
import { consumeFuelForEmbarcacao, getFuelInventory } from '../utils/fuelInventory';

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

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const yyyy = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10) - 1;
  const dd = parseInt(parts[2], 10);
  const d = new Date(yyyy, mm, dd);
  const months = ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Mai.', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.'];
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${dayStr} De ${months[d.getMonth()]}`;
};

export default function MarinaOperadorDashboard({ onLogout, operadorNome }: MarinaOperadorDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedDate, setSelectedDate] = useState<string>(getFormattedDate(new Date()));
  
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState<any>(null);
  const [liters, setLiters] = useState('');
  const [paymentType, setPaymentType] = useState<'pix' | 'credit' | 'admin'>('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistMode, setChecklistMode] = useState<'descida' | 'chegada' | 'subida'>('descida');
  const [checklistFotos, setChecklistFotos] = useState<Record<string, string[]>>({});
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null);

  // Consulta e realização avulsa de checklists
  const [viewChecklistReserva, setViewChecklistReserva] = useState<any>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  const [avulsoModalOpen, setAvulsoModalOpen] = useState(false);
  const [avulsoSearchTerm, setAvulsoSearchTerm] = useState('');
  const [selectedBoatForAvulso, setSelectedBoatForAvulso] = useState<any>(null);
  const [avulsoMode, setAvulsoMode] = useState<'descida' | 'subida'>('descida');

  const [activeTab, setActiveTab] = useState<'operacao' | 'checklists' | 'combustivel'>('operacao');
  const [filterType, setFilterType] = useState<'agendadas' | 'confirmadas' | 'prontas' | 'retornaram'>('agendadas');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [isUploadingComprovante, setIsUploadingComprovante] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const dataRef = useRef<any>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const fetchData = async (isInitial = false) => {
    if (isInitial || !data) setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        onLogout();
        return;
      }
      const res = await fetch('/api/db/pull', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        showToast("Sessão expirada ou sem acesso. Faça login novamente.", "warning");
        onLogout();
        return;
      }
      if (!res.ok) throw new Error('Falha ao obter dados operacionais.');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      if (isInitial || !data) setError(err.message);
      showToast("Erro ao conectar ao servidor.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    const socket = io(window.location.origin, {
      auth: { token: localStorage.getItem('admin_token') }
    });
    
    socket.on('connect', () => {
      fetchData();
    });

    socket.on('marina_update', (payload: any) => {
      const reservationData = payload?.reservation || payload?.data;
      if (!reservationData || (payload.type && payload.type !== 'reservations')) {
        fetchData();
        return;
      }

      const reservation = reservationData;
      const { action } = payload;

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
          if (idx >= 0) {
            updatedReservations[idx] = { ...updatedReservations[idx], ...reservation };
          } else {
            updatedReservations.push(reservation);
          }
        }

        return { ...prev, reservations: updatedReservations };
      });

      const boat = dataRef.current?.boats?.find((b: any) => b.id === reservation.embarcacaoId);
      const boatLabel = boat?.nome || reservation.embarcacaoId || 'Embarcação';

      const messages: Record<string, { msg: string; type: 'info' | 'success' | 'warning' }> = {
        new:     { msg: `Nova descida agendada: ${boatLabel}`, type: 'info' },
        checkin: { msg: `Operação realizada: ${boatLabel}`, type: 'success' },
        cancel:  { msg: `Agendamento cancelado: ${boatLabel}`, type: 'warning' },
        upsert:  { msg: `Atualização: ${boatLabel}`, type: 'info' },
        delete:  { msg: `Reserva removida`, type: 'warning' },
      };

      const info = messages[action] || { msg: 'Atualização no píer recebida', type: 'info' as const };
      showToast(info.msg, info.type);

      // Reproduz efeito sonoro (bip sonoro via Web Audio API)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (err) {
        console.warn('Audio notification failed:', err);
      }
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(getFormattedDate(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(getFormattedDate(d));
  };

  const getEmbarcacao = (id: string) => data?.boats?.find((b: any) => b.id === id);
  const getCliente = (id: string) => data?.clients?.find((c: any) => c.id === id);

  const openChecklistForDescida = (reserva: any) => {
    setSelectedReserva(reserva);
    setChecklistMode('descida');
    setChecklistFotos({});
    setChecklistOpen(true);
  };

  const openChecklistForSubida = (reserva: any) => {
    if (!reserva.horaChegada && reserva.statusMarina !== 'chegada') {
      alert('O checklist de subida só pode ser realizado após a chegada da embarcação ao píer.');
      return;
    }
    setSelectedReserva(reserva);
    setChecklistMode('subida');
    setChecklistFotos({});
    setChecklistOpen(true);
  };

  const openFuelForChegada = (reserva: any) => {
    setSelectedReserva(reserva);
    setLiters('');
    setPaymentType('pix');
    setComprovanteUrl(null);
    setFuelModalOpen(true);
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
      if (!json.url && !json.imageUrl) throw new Error(json.message || 'Erro upload');

      const imgUrl = json.url || json.imageUrl;
      setChecklistFotos(prev => ({ ...prev, [angleId]: [...(prev[angleId] || []), imgUrl] }));
      showToast(`Foto (${angleId}) adicionada!`, 'success');
    } catch (err) {
      showToast('Erro ao fazer upload da foto.', 'warning');
    } finally {
      setUploadingAngle(null);
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
      const imgUrl = json.url || json.imageUrl;
      if (imgUrl) {
        setComprovanteUrl(imgUrl);
        showToast('Comprovante anexado!', 'success');
      }
    } catch (err) {
      showToast('Erro ao enviar comprovante.', 'warning');
    } finally {
      setIsUploadingComprovante(false);
    }
  };

  const executeRegistrarDescida = async (fotosChecklistDescida: string[], reservaTarget?: any) => {
    const alvo = reservaTarget || selectedReserva;
    if (!alvo) return;
    setIsSubmitting(true);
    
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updatedReserva = { 
      ...alvo, 
      horaDescida: horaAtual,
      fotosChecklistDescida: fotosChecklistDescida.length > 0 ? fotosChecklistDescida : alvo.fotosChecklistDescida,
      statusMarina: 'pronta',
      statusOperacional: 'pronto_na_agua',
      operadorDescida: operadorNome || 'Operador'
    };
    
    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
      });

      setData((prev: any) => ({
        ...prev,
        reservations: prev.reservations.map((r: any) => r.id === alvo.id ? updatedReserva : r)
      }));

      await logAction(operadorNome || 'Operador', 'DESCIDA_PIER', `Registrou descida de ${alvo.barcoNome || 'embarcação'}`);
      setChecklistOpen(false);
      showToast('Descida e checklist salvos com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao salvar descida.', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeMarcarSaida = async (reserva: any) => {
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updatedReserva = { 
      ...reserva, 
      horaSaida: horaAtual,
      statusMarina: 'saida',
      statusOperacional: 'navegando',
      operadorSaida: operadorNome || 'Operador'
    };
    
    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
      });

      setData((prev: any) => ({
        ...prev,
        reservations: prev.reservations.map((r: any) => r.id === reserva.id ? updatedReserva : r)
      }));
      await logAction(operadorNome || 'Operador', 'SAIDA_MAR', `Marcou saída para o mar de ${reserva.barcoNome || 'embarcação'}`);
      showToast('Saída para o mar registrada!', 'success');
    } catch (err) {
      showToast('Erro ao marcar saída.', 'warning');
    }
  };

  const handleConfirmFuelAndRegisterArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReserva) return;
    const litersNum = Number(liters) || 0;
    
    if (litersNum < 0) {
      showToast('Preencha os litros corretamente.', 'warning');
      return;
    }

    setIsSubmitting(true);
    
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const currentOperator = operadorNome || localStorage.getItem('user_name') || localStorage.getItem('usuario_nome') || 'Marinheiro';
    const updatedReserva = { 
      ...selectedReserva, 
      horaChegada: horaAtual,
      statusMarina: 'chegada',
      statusOperacional: 'retornou',
      operadorChegada: currentOperator,
      abastecimentoOperador: currentOperator,
      litrosAbastecidos: litersNum > 0 ? litersNum.toString() : '0',
      abastecimentoSolucao: true,
      abastecimentoLitros: litersNum,
      abastecimentoStatusCobranca: litersNum > 0 ? 'pendente' : 'sem_abastecimento',
      abastecimentoDataHora: new Date().toISOString()
    };
    
    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
      });

      if (litersNum > 0) {
        const boatName = selectedReserva.barcoNome || getEmbarcacao(selectedReserva.embarcacaoId)?.nome || 'Embarcação';
        consumeFuelForEmbarcacao(litersNum, boatName, operadorNome || 'Marinheiro');
      }

      setData((prev: any) => ({
        ...prev,
        reservations: prev.reservations.map((r: any) => r.id === updatedReserva.id ? updatedReserva : r)
      }));
      
      await logAction(operadorNome || 'Operador', 'CHEGADA_ABASTECIMENTO', `Registrou chegada e ${litersNum}L de combustível`);
      setFuelModalOpen(false);
      showToast('Chegada e abastecimento salvos com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao salvar chegada.', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeRegistrarSubida = async (fotosChecklistSubida: string[], reservaTarget?: any) => {
    const alvo = reservaTarget || selectedReserva;
    if (!alvo) return;
    setIsSubmitting(true);
    
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updatedReserva = { 
      ...alvo, 
      horaSubida: horaAtual,
      fotosChecklistSubida: fotosChecklistSubida.length > 0 ? fotosChecklistSubida : alvo.fotosChecklistSubida,
      statusMarina: 'guardada',
      statusOperacional: 'guardado',
      operadorSubida: operadorNome || 'Operador'
    };
    
    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
      });

      setData((prev: any) => ({
        ...prev,
        reservations: prev.reservations.map((r: any) => r.id === alvo.id ? updatedReserva : r)
      }));
      
      await logAction(operadorNome || 'Operador', 'SUBIDA_GUARDADO', `Registrou subida e recolhimento de ${alvo.barcoNome || 'embarcação'}`);
      setChecklistOpen(false);
      showToast('Subida e checklist final salvos com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao salvar subida.', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalDayReservations = data?.reservations?.filter((r: any) => (r.data || r.date) === selectedDate) || [];

  const getFilteredReservations = () => {
    if (!data?.reservations) return [];
    
    let filtered = data.reservations.filter((r: any) => {
      const d = r.data || r.date;
      return d === selectedDate;
    });
    
    if (filterType === 'agendadas') {
      filtered = filtered.filter((r: any) => !r.horaDescida && r.statusMarina !== 'guardada' && r.statusOperacional !== 'guardado' && r.status !== 'confirmado' && r.statusMarina !== 'confirmada');
    } else if (filterType === 'confirmadas') {
      filtered = filtered.filter((r: any) => !r.horaDescida && (r.status === 'confirmado' || r.statusMarina === 'confirmada'));
    } else if (filterType === 'prontas') {
      filtered = filtered.filter((r: any) => 
        r.horaDescida && 
        r.statusMarina !== 'chegada' && 
        r.statusMarina !== 'guardada' &&
        r.statusOperacional !== 'guardado' &&
        !r.horaSubida
      );
    } else if (filterType === 'retornaram') {
      filtered = filtered.filter((r: any) => 
        r.statusMarina === 'chegada' || 
        r.statusMarina === 'guardada' ||
        r.statusOperacional === 'retornou' ||
        r.statusOperacional === 'guardado' ||
        r.horaSubida
      );
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((r: any) => {
        const boat = getEmbarcacao(r.embarcacaoId);
        const client = getCliente(r.clienteId);
        const boatName = (boat?.nome || r.barcoNome || '').toLowerCase();
        const boatNum = (boat?.numero || '').toString().toLowerCase();
        const clientName = (client?.nome || r.clienteNome || '').toLowerCase();
        return boatName.includes(q) || boatNum.includes(q) || clientName.includes(q);
      });
    }

    filtered.sort((a: any, b: any) => {
      const timeA = a.previsaoSaida || a.horaDescida || '99:99';
      const timeB = b.previsaoSaida || b.horaDescida || '99:99';
      return timeA.localeCompare(timeB);
    });
    
    return filtered;
  };

  const reservasDoDia = getFilteredReservations();
  const descidasCount = totalDayReservations.filter((r: any) => r.horaDescida || r.statusMarina === 'pronta').length;

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#070B18] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans pb-20">
      {/* Toast Floating */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-xl text-xs font-bold flex items-center gap-2 border transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
          toast.type === 'warning' ? 'bg-amber-600 text-white border-amber-500' :
          'bg-blue-600 text-white border-blue-500'
        }`}>
          <Sparkles className="w-4 h-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Dark Theme matching original design */}
      <header className="bg-[#070B18] text-white px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Logo className="h-6 w-auto text-[#B69D74]" />
          <div>
            <h1 className="font-black text-sm text-white tracking-wide uppercase leading-tight">
              OPERAÇÃO MARINA
            </h1>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">
              {descidasCount} descida(s) no dia
            </p>
          </div>
        </div>

        <button 
          onClick={onLogout} 
          className="w-9 h-9 flex items-center justify-center bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg border border-red-800/80 transition-colors cursor-pointer"
          title="Sair do sistema"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Sub-header Date Navigator Bar */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-4 flex items-center justify-between shadow-xs">
        <button onClick={handlePrevDay} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            {activeTab === 'operacao' ? 'OPERAÇÕES' : activeTab === 'checklists' ? 'OPERAÇÕES DO DIA' : 'FLUXO DE COMBUSTÍVEL'}
          </span>
          <h2 className="text-base font-black text-slate-900 leading-tight">
            {formatDisplayDate(selectedDate)}
          </h2>
        </div>

        <button onClick={handleNextDay} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Segmented Filter Bar for PAINEL (Operação) */}
      {activeTab === 'operacao' && (
        <div className="bg-white px-3 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider overflow-x-auto no-scrollbar gap-1">
          <button 
            onClick={() => setFilterType('agendadas')}
            className={`py-2 px-5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              filterType === 'agendadas' 
                ? 'bg-blue-600 text-white shadow-sm font-black' 
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            AGENDADAS
          </button>

          <button 
            onClick={() => setFilterType('confirmadas')}
            className={`py-2 px-5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              filterType === 'confirmadas' 
                ? 'bg-blue-600 text-white shadow-sm font-black' 
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            CONFIRMADAS
          </button>

          <button 
            onClick={() => setFilterType('prontas')}
            className={`py-2 px-5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              filterType === 'prontas' 
                ? 'bg-blue-600 text-white shadow-sm font-black' 
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            PRONTAS
          </button>

          <button 
            onClick={() => setFilterType('retornaram')}
            className={`py-2 px-5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              filterType === 'retornaram' 
                ? 'bg-blue-600 text-white shadow-sm font-black' 
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            RETORNARAM
          </button>
        </div>
      )}

      {/* Tab 1: PAINEL / OPERAÇÃO */}
      {activeTab === 'operacao' && (
        <main className="flex-1 p-4 max-w-7xl mx-auto w-full space-y-3 pb-24">
          {reservasDoDia.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
              <Ship className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
              <h3 className="text-base font-bold text-slate-700">Nenhum agendamento encontrado</h3>
              <p className="text-xs text-slate-500">Nenhum registro nesta categoria para {formatDisplayDate(selectedDate)}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservasDoDia.map((reserva: any) => {
                const boat = getEmbarcacao(reserva.embarcacaoId);
                const client = getCliente(reserva.clienteId);

                const isGuardado = reserva.statusMarina === 'guardada' || reserva.statusOperacional === 'guardado';
                const isChegada = reserva.statusMarina === 'chegada' || reserva.statusOperacional === 'retornou';
                const isPronto = reserva.statusMarina === 'pronta' || reserva.statusOperacional === 'pronto_na_agua' || (reserva.horaDescida && !reserva.horaSubida && !isGuardado && !isChegada);
                const isSaidaMar = !!reserva.horaSaida;
                const isConfirmado = !isGuardado && !isChegada && !isPronto && (reserva.status === 'confirmado' || reserva.statusMarina === 'confirmada');

                const boatNumber = boat?.numero || boat?.nome?.match(/\d+/)?.[0] || '58';

                return (
                  <div 
                    key={reserva.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden space-y-3"
                  >
                    {/* Left vertical status indicator */}
                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                      isGuardado ? 'bg-emerald-500' : isChegada ? 'bg-amber-500' : isPronto ? 'bg-cyan-500' : isConfirmado ? 'bg-indigo-500' : 'bg-blue-600'
                    }`} />

                    {/* Card Header */}
                    <div className="pl-1 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-slate-900 text-base leading-tight uppercase">
                            {boat?.nome || reserva.barcoNome || 'Embarcação'}
                          </h3>
                          {boatNumber && (
                            <span className="bg-slate-900 text-white font-mono text-xs px-2 py-0.5 rounded font-bold">
                              {boatNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1 mt-1">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[240px]">{client?.nome || reserva.clienteNome || 'Cliente'}</span>
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                        isGuardado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        isChegada ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        isPronto ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                        isConfirmado ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {isGuardado ? 'Guardado' : isChegada ? 'Chegou Píer' : isPronto ? 'Na Água' : isConfirmado ? 'Confirmado' : 'Agendado'}
                      </span>
                    </div>

                    {/* Prev Saida & Prev Chegada Box */}
                    <div className="pl-1">
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PREV. SAÍDA</span>
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            {reserva.previsaoSaida || 'Não informada'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PREV. CHEGADA</span>
                            <span className="font-mono text-xs font-semibold text-slate-700">
                              {reserva.previsaoChegada || 'Não informada'}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 ml-1" />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pl-1 space-y-2 pt-1">
                      {!isPronto && !isChegada && !isGuardado && (
                        <button
                          onClick={() => openChecklistForDescida(reserva)}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
                        >
                          <ArrowDownCircle className="w-4 h-4" />
                          <span>Checklist Descida Píer</span>
                        </button>
                      )}

                      {isPronto && !isSaidaMar && (
                        <button
                          onClick={() => executeMarcarSaida(reserva)}
                          className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
                        >
                          <Navigation className="w-4 h-4" />
                          <span>Marcar Saída</span>
                        </button>
                      )}

                      {isPronto && (
                        <button
                          onClick={() => openFuelForChegada(reserva)}
                          className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
                        >
                          <Anchor className="w-4 h-4" />
                          <span>Registrar Chegada & Abastecer</span>
                        </button>
                      )}

                      {isChegada && (
                        <button
                          onClick={() => openChecklistForSubida(reserva)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                          <span>Checklist Subida / Vaga</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* Tab 2: CHECKLISTS */}
      {activeTab === 'checklists' && (
        <main className="flex-1 p-4 max-w-7xl mx-auto w-full pb-24 space-y-3">
          {/* Top Control Bar with Search Select Button */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                <span>CONSULTA DE CHECKLISTS</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Toque em qualquer embarcação para consultar ou realizar fotos do checklist
              </p>
            </div>

            <button
              onClick={() => {
                setAvulsoSearchTerm('');
                setSelectedBoatForAvulso(null);
                setAvulsoModalOpen(true);
              }}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer shrink-0"
            >
              <Camera className="w-4 h-4" />
              <span>+ Realizar Checklist</span>
            </button>
          </div>

          {/* List of Reservations / Checklists */}
          {totalDayReservations.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
              <h3 className="text-base font-bold text-slate-700">Nenhum agendamento hoje</h3>
              <p className="text-xs text-slate-500">
                Você pode clicar no botão "+ Realizar Checklist" acima para selecionar qualquer embarcação da marina.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {totalDayReservations.map((reserva: any) => {
                const boat = getEmbarcacao(reserva.embarcacaoId);
                const client = getCliente(reserva.clienteId);
                const boatNumber = boat?.numero || boat?.nome?.match(/\d+/)?.[0] || '99';
                const hasDescidaFotos = (reserva.fotosChecklistDescida?.length || 0) > 0;
                const hasSubidaFotos = (reserva.fotosChecklistSubida?.length || 0) > 0;

                return (
                  <div 
                    key={reserva.id} 
                    onClick={() => setViewChecklistReserva(reserva)}
                    className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-4 shadow-xs flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Ship className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-slate-900 text-sm leading-tight uppercase">
                            {boat?.nome || reserva.barcoNome || 'M99'}
                          </h3>
                          <span className="bg-slate-900 text-white font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                            #{boatNumber}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-blue-600 uppercase mt-0.5">
                          {client?.nome || reserva.clienteNome || 'AKIO'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                        <div title="Descida" className={`w-6 h-6 rounded-lg flex items-center justify-center ${hasDescidaFotos ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                        <div title="Chegada/Subida" className={`w-6 h-6 rounded-lg flex items-center justify-center ${hasSubidaFotos ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div title="Abastecimento" className={`w-6 h-6 rounded-lg flex items-center justify-center ${reserva.abastecimentoLitros > 0 ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                          <Droplets className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* Tab 3: COMBUSTÍVEL */}
      {activeTab === 'combustivel' && (
        <main className="flex-1 p-4 max-w-7xl mx-auto w-full pb-24 space-y-4">
          {/* KPI Summary Card matching Screenshot 3 */}
          <div className="bg-[#0A1024] rounded-2xl p-5 text-white flex items-center justify-between shadow-md border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">VOLUME TOTAL</span>
                <p className="text-xl font-black text-white">
                  {totalDayReservations.reduce((sum: number, r: any) => sum + (Number(r.abastecimentoLitros || r.litrosAbastecidos) || 0), 0)} <span className="text-blue-400">Litros</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">FATURAMENTO ESTIMADO</span>
              <p className="text-xl font-black text-emerald-400 font-mono">
                R$ {(totalDayReservations.reduce((sum: number, r: any) => sum + (Number(r.abastecimentoLitros || r.litrosAbastecidos) || 0), 0) * 9).toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          {/* Lançamentos do Dia */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">LANÇAMENTOS DO DIA</h3>

            {totalDayReservations.filter((r: any) => Number(r.abastecimentoLitros || r.litrosAbastecidos) > 0).length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm space-y-2">
                <Droplets className="w-10 h-10 text-slate-300 mx-auto stroke-1" />
                <p className="text-xs text-slate-500 font-medium">Nenhum abastecimento registrado hoje.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {totalDayReservations
                  .filter((r: any) => Number(r.abastecimentoLitros || r.litrosAbastecidos) > 0)
                  .map((reserva: any) => {
                    const boat = getEmbarcacao(reserva.embarcacaoId);
                    const client = getCliente(reserva.clienteId);
                    const boatNumber = boat?.numero || boat?.nome?.match(/\d+/)?.[0] || '99';
                    const litros = Number(reserva.abastecimentoLitros || reserva.litrosAbastecidos) || 0;
                    const valor = litros * 9;

                    return (
                      <div key={reserva.id} className="border-l-4 border-l-emerald-500 bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                            <Check className="w-5 h-5 stroke-[3]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-slate-900 text-sm leading-tight uppercase">
                                {boat?.nome || reserva.barcoNome || 'M99'}
                              </h4>
                              <span className="bg-slate-900 text-white font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                                #{boatNumber}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-blue-600 uppercase mt-0.5">
                              {client?.nome || reserva.clienteNome || 'AKIO'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                              <UserIcon className="w-3 h-3 text-slate-400" />
                              <span>Lançado por: <strong className="text-slate-600 font-semibold">{reserva.abastecimentoOperador || reserva.operadorChegada || 'Marinheiro'}</strong></span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <span className="text-sm font-black text-blue-600 font-mono block">
                              {litros} L
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 font-mono block">
                              R$ {valor.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </main>
      )}

      {/* Bottom Navigation Bar matching Screenshot 1, 2, and 3 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-6 py-2.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('operacao')}
          className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeTab === 'operacao' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Ship className="w-5 h-5" />
          <span className={`text-[10px] uppercase tracking-wider ${activeTab === 'operacao' ? 'font-black' : 'font-semibold'}`}>PAINEL</span>
        </button>

        <button
          onClick={() => setActiveTab('checklists')}
          className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeTab === 'checklists' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className={`text-[10px] uppercase tracking-wider ${activeTab === 'checklists' ? 'font-black' : 'font-semibold'}`}>CHECKLISTS</span>
        </button>

        <button
          onClick={() => setActiveTab('combustivel')}
          className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeTab === 'combustivel' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Droplets className="w-5 h-5" />
          <span className={`text-[10px] uppercase tracking-wider ${activeTab === 'combustivel' ? 'font-black' : 'font-semibold'}`}>COMBUSTÍVEL</span>
        </button>
      </nav>

      {/* View Checklist Details Modal */}
      {viewChecklistReserva && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 text-base uppercase">
                    {viewChecklistReserva.barcoNome || getEmbarcacao(viewChecklistReserva.embarcacaoId)?.nome || 'Embarcação'}
                  </h3>
                  <span className="bg-slate-900 text-white font-mono text-xs px-2 py-0.5 rounded font-bold">
                    #{getEmbarcacao(viewChecklistReserva.embarcacaoId)?.numero || '58'}
                  </span>
                </div>
                <p className="text-xs text-blue-600 font-bold uppercase mt-0.5">
                  {getCliente(viewChecklistReserva.clienteId)?.nome || viewChecklistReserva.clienteNome || 'Cliente'}
                </p>
              </div>
              <button onClick={() => setViewChecklistReserva(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: Photos and Details */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 subtle-scrollbar text-xs">
              {/* Horários */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Hora Descida</span>
                  <span className="font-bold text-slate-800">{viewChecklistReserva.horaDescida || '--:--'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Hora Subida</span>
                  <span className="font-bold text-slate-800">{viewChecklistReserva.horaSubida || '--:--'}</span>
                </div>
              </div>

              {/* Fotos de Descida */}
              <div className="space-y-2">
                <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Fotos Checklist Descida</span>
                  <span className="text-slate-400 font-mono font-bold">
                    {(viewChecklistReserva.fotosChecklistDescida?.length || 0)} foto(s)
                  </span>
                </h4>
                {(viewChecklistReserva.fotosChecklistDescida?.length || 0) === 0 ? (
                  <p className="text-slate-400 italic text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                    Nenhuma foto gravada na descida.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {viewChecklistReserva.fotosChecklistDescida.map((url: string, idx: number) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-pointer" onClick={() => setZoomedPhoto(url)}>
                        <img src={url} alt={`Descida ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fotos de Subida */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Fotos Checklist Subida</span>
                  <span className="text-slate-400 font-mono font-bold">
                    {(viewChecklistReserva.fotosChecklistSubida?.length || 0)} foto(s)
                  </span>
                </h4>
                {(viewChecklistReserva.fotosChecklistSubida?.length || 0) === 0 ? (
                  <p className="text-slate-400 italic text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                    Nenhuma foto gravada na subida.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {viewChecklistReserva.fotosChecklistSubida.map((url: string, idx: number) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-pointer" onClick={() => setZoomedPhoto(url)}>
                        <img src={url} alt={`Subida ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
              <button 
                onClick={() => {
                  const target = viewChecklistReserva;
                  setViewChecklistReserva(null);
                  openChecklistForDescida(target);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
              >
                Checklist Descida
              </button>
              <button 
                onClick={() => {
                  const target = viewChecklistReserva;
                  setViewChecklistReserva(null);
                  openChecklistForSubida(target);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
              >
                Checklist Subida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Selecionar Qualquer Embarcação com Busca */}
      {avulsoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Realizar Checklist de Embarcação</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Busque e selecione qualquer barco da marina</p>
              </div>
              <button onClick={() => setAvulsoModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 subtle-scrollbar text-xs">
              {/* Input de Busca */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Pesquisar Embarcação</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Digite nome, vaga ou número (#)..."
                    value={avulsoSearchTerm}
                    onChange={(e) => setAvulsoSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  {avulsoSearchTerm && (
                    <button onClick={() => setAvulsoSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista Selecionável de Embarcações */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto subtle-scrollbar border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                {(data?.boats || [])
                  .filter((b: any) => {
                    if (!avulsoSearchTerm.trim()) return true;
                    const q = avulsoSearchTerm.trim().toLowerCase();
                    return (b.nome || '').toLowerCase().includes(q) || (b.numero || '').toString().toLowerCase().includes(q) || (b.vaga || '').toLowerCase().includes(q);
                  })
                  .map((b: any) => {
                    const isSelected = selectedBoatForAvulso?.id === b.id;
                    const client = getCliente(b.clienteId);
                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBoatForAvulso(b)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs' 
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Ship className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs uppercase">{b.nome}</span>
                              {b.numero && (
                                <span className="bg-slate-900 text-white font-mono text-[9px] px-1.5 py-0.2 rounded font-bold">
                                  #{b.numero}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block">Cliente: {client?.nome || 'Não informado'}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 stroke-[3]" />}
                      </div>
                    );
                  })}
              </div>

              {/* Seleção do Tipo de Checklist */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 block">Tipo de Checklist</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAvulsoMode('descida')}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      avulsoMode === 'descida' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <ArrowDownCircle className="w-4 h-4" />
                    <span>Descida / Píer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvulsoMode('subida')}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      avulsoMode === 'subida' 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>Subida / Vaga</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Submit Button */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => {
                  if (!selectedBoatForAvulso) {
                    showToast('Selecione uma embarcação para continuar.', 'warning');
                    return;
                  }
                  const existing = (data?.reservations || []).find((r: any) => 
                    r.embarcacaoId === selectedBoatForAvulso.id && (r.data === selectedDate || r.date === selectedDate)
                  );
                  const targetReserva = existing || {
                    id: `avulso_${selectedBoatForAvulso.id}_${Date.now()}`,
                    embarcacaoId: selectedBoatForAvulso.id,
                    barcoNome: selectedBoatForAvulso.nome,
                    clienteId: selectedBoatForAvulso.clienteId,
                    clienteNome: getCliente(selectedBoatForAvulso.clienteId)?.nome || 'Cliente',
                    data: selectedDate,
                    date: selectedDate,
                    statusMarina: avulsoMode === 'descida' ? 'agendada' : 'chegada',
                    statusOperacional: avulsoMode === 'descida' ? 'agendada' : 'retornou'
                  };
                  setSelectedReserva(targetReserva);
                  setChecklistMode(avulsoMode);
                  setChecklistFotos({});
                  setAvulsoModalOpen(false);
                  setChecklistOpen(true);
                }}
                disabled={!selectedBoatForAvulso}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>Iniciar Fotos do Checklist</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomedPhoto(null)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={zoomedPhoto} alt="Foto Ampliada" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
            <button onClick={() => setZoomedPhoto(null)} className="absolute top-2 right-2 p-2 bg-slate-900/80 text-white rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Checklist Camera Form Modal */}
      {checklistOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Checklist de {checklistMode.toUpperCase()}</span>
                </h3>
                <p className="text-[11px] text-slate-500">{selectedReserva?.barcoNome || 'Embarcação'}</p>
              </div>
              <button onClick={() => setChecklistOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={(e) => {
              e.preventDefault();
              const allUploaded = Object.values(checklistFotos).flat();
              if (checklistMode === 'descida') executeRegistrarDescida(allUploaded);
              else if (checklistMode === 'subida') executeRegistrarSubida(allUploaded);
            }} className="p-4 overflow-y-auto space-y-4 flex-1 subtle-scrollbar">
              <p className="text-xs text-slate-600">
                Tire fotos dos 6 ângulos para comprovar o estado da embarcação no píer:
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
                            <img key={i} src={url} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" alt="Foto" />
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
                          isUploaded ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}>
                          {isUploading ? (
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          ) : (
                            <Icon className={`w-5 h-5 ${isUploaded ? 'text-blue-600' : 'text-slate-400'}`} />
                          )}
                          <span className={`text-[11px] font-bold leading-tight ${isUploaded ? 'text-blue-900' : 'text-slate-700'}`}>
                            {angle.label}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
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
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-blue-600" />
                <span>Registrar Chegada & Abastecimento</span>
              </h3>
              <button onClick={() => setFuelModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmFuelAndRegisterArrival} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 block">Litros de Combustível *</label>
                  <span className="text-[10px] text-slate-400">Atalhos rápidos:</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setLiters('20')}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-200 transition-all cursor-pointer text-center"
                  >
                    20L
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiters('50')}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-200 transition-all cursor-pointer text-center"
                  >
                    50L
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiters('100')}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-200 transition-all cursor-pointer text-center"
                  >
                    100L
                  </button>
                </div>

                <input 
                  type="number"
                  step="0.1"
                  placeholder="0 para não abastecer"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>



              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salvar Chegada & Abastecimento</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
