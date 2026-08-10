import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogOut, Ship, Clock, CheckCircle2, Droplets, ArrowRight, Loader2, Save, Camera, Navigation, Anchor, Image as ImageIcon, Check, ChevronLeft, ChevronRight, User as UserIcon, ClipboardList, Zap, Bell, Search, X, SortAsc, Layers, Truck, Shield, Home, Menu } from 'lucide-react';
import Logo from './Logo';
import { io } from 'socket.io-client';
import { logAction } from '../db';
import MarinaChecklistsView from './MarinaChecklistsView';
import MarinaFuelView from './MarinaFuelView';
import MarinaTanksView from './MarinaTanksView';

interface MarinaDashboardProps {
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

export default function MarinaDashboard({ onLogout, operadorNome }: MarinaDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Date state
  const [selectedDate, setSelectedDate] = useState<string>(getFormattedDate(new Date()));
  
  // Fuel Modal state
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState<any>(null);
  const [liters, setLiters] = useState('');
  const [paymentType, setPaymentType] = useState<'pix' | 'credit' | 'admin'>('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Checklist state
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistMode, setChecklistMode] = useState<'descida' | 'chegada' | 'subida'>('descida');
  const [checklistFotos, setChecklistFotos] = useState<Record<string, string[]>>({});
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<'agendadas' | 'confirmadas' | 'prontas' | 'retornaram' | 'todas'>('agendadas');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'hora_saida' | 'alfabetica'>('hora_saida');
  const [tempFuelData, setTempFuelData] = useState<{liters: number, paymentType: string, comprovanteUrl: string | null} | null>(null);
  
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [isUploadingComprovante, setIsUploadingComprovante] = useState(false);
  
  // Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsReserva, setDetailsReserva] = useState<any>(null);

  // Bottom Navigation Tab & Sidebar state
  const [activeTab, setActiveTab] = useState<'home' | 'operacao' | 'checklists' | 'combustivel' | 'tanques'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Toast notification state
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

  useEffect(() => {
    fetchData(true);

    const socket = io(window.location.origin, {
      auth: { token: localStorage.getItem('admin_token') }
    });
    
    socket.on('marina_update', (payload: any) => {
      if (!payload?.reservation) {
        // Fallback: se não veio payload, faz fetch completo (compatibilidade)
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
          // Nova reserva — adiciona se não existir
          const exists = updatedReservations.some((r: any) => r.id === reservation.id);
          if (!exists) {
            updatedReservations.push(reservation);
          }
        } else {
          // upsert / checkin / cancel — merge parcial nos dados existentes
          const idx = updatedReservations.findIndex((r: any) => r.id === reservation.id);
          if (idx >= 0) {
            updatedReservations[idx] = { ...updatedReservations[idx], ...reservation };
          } else {
            updatedReservations.push(reservation);
          }
        }

        return { ...prev, reservations: updatedReservations };
      });

      // Gerar mensagem de notificação
      const boat = dataRef.current?.boats?.find((b: any) => b.id === reservation.embarcacaoId);
      const boatLabel = boat?.nome || reservation.embarcacaoId || 'Embarcação';

      const messages: Record<string, { msg: string; type: 'info' | 'success' | 'warning' }> = {
        new:     { msg: `Nova reserva: ${boatLabel}`, type: 'info' },
        checkin: { msg: `Check-in confirmado: ${boatLabel}`, type: 'success' },
        cancel:  { msg: `Reserva cancelada: ${boatLabel}`, type: 'warning' },
        upsert:  { msg: `Reserva atualizada: ${boatLabel}`, type: 'info' },
        delete:  { msg: `Reserva removida`, type: 'warning' },
      };

      const info = messages[action] || { msg: 'Atualização recebida', type: 'info' as const };
      showToast(info.msg, info.type);
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchData = async (isInitial = false) => {
    if (isInitial || !data) setLoading(true);
    try {
      const res = await fetch('/api/db/pull', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (!res.ok) throw new Error('Falha ao obter dados.');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      if (isInitial || !data) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const openChecklistForDescida = (reserva: any) => {
    setSelectedReserva(reserva);
    setChecklistMode('descida');
    setChecklistFotos({});
    setChecklistOpen(true);
  };

  const openChecklistForSubida = (reserva: any) => {
    if (!reserva.horaChegada && reserva.statusMarina !== 'chegada') {
      alert('O checklist de subida só pode ser realizado na aba Retornaram, após o abastecimento da embarcação.');
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
      if (!json.success) throw new Error(json.message);

      setChecklistFotos(prev => ({ ...prev, [angleId]: [...(prev[angleId] || []), json.imageUrl] }));
    } catch (err) {
      alert('Erro ao fazer upload da foto.');
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
      if (!json.success) throw new Error(json.message);

      setComprovanteUrl(json.url);
    } catch (err) {
      alert('Erro ao fazer upload do comprovante.');
    } finally {
      setIsUploadingComprovante(false);
    }
  };

  const proceedChecklist = () => {
    const fotosArray = Object.values(checklistFotos).flat();
    
    if (checklistMode === 'descida') {
      executeRegistrarDescida(fotosArray);
    } else if (checklistMode === 'subida') {
      executeRegistrarSubida(fotosArray);
    }
  };

  const executeRegistrarDescida = async (fotosChecklistDescida: string[], reservaTarget?: any) => {
    const alvo = reservaTarget || selectedReserva;
    if (!alvo) return;
    
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updatedReserva = { 
      ...alvo, 
      horaDescida: horaAtual,
      fotosChecklistDescida,
      statusMarina: 'pier',
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
      await logAction('Descida', 'Registrou descida com checklist', alvo.embarcacaoId, operadorNome);
      setChecklistOpen(false);
    } catch (err) {
      alert('Erro ao salvar descida.');
    }
  };

  const executeMarcarSaida = async (reserva: any) => {
    if (!confirm("Confirmar a saída efetiva da embarcação do pier?")) return;
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updatedReserva = { 
      ...reserva, 
      horaSaida: horaAtual, 
      statusMarina: 'saida',
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
      await logAction('Saída', 'Marcou saída da embarcação', reserva.embarcacaoId, operadorNome);
    } catch (err) {
      alert('Erro ao marcar saída.');
    }
  };

  const handleConfirmFuelAndRegisterArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReserva) return;
    if (!liters || Number(liters) < 0) {
      alert('Preencha os litros corretamente.');
      return;
    }
    if ((paymentType === 'pix' || paymentType === 'credit') && Number(liters) > 0 && !comprovanteUrl) {
      alert('É obrigatório enviar o comprovante para pagamentos realizados na hora.');
      return;
    }

    setIsSubmitting(true);
    
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const litersNum = Number(liters);
    const updatedReserva = { 
      ...selectedReserva, 
      horaChegada: horaAtual,
      statusMarina: 'chegada',
      operadorChegada: operadorNome || 'Operador',
      litrosAbastecidos: litersNum > 0 ? litersNum.toString() : '0'
    };
    
    const pType = paymentType;
    let pricePerLiter = 9;
    let paymentStatus = 'pago';
    let paymentLabel = 'Pix/Dinheiro';

    if (pType === 'credit') {
      pricePerLiter = 10;
      paymentLabel = 'Cartão de Crédito';
    } else if (pType === 'admin') {
      pricePerLiter = 13;
      paymentStatus = 'pendente';
      paymentLabel = 'Pós-pago (Cobrar Cliente)';
    }

    const totalValue = litersNum * pricePerLiter;
    
    const transacao = {
      id: `trx_fuel_${Date.now()}`,
      tipo: 'receita',
      categoria: 'Combustível',
      valor: totalValue,
      dataVencimento: selectedDate,
      dataPagamento: paymentStatus === 'pago' ? selectedDate : null,
      status: paymentStatus,
      descricao: `Abastecimento Retorno: ${litersNum}L a R$${pricePerLiter}/L. Pagamento: ${paymentLabel}`,
      clienteId: selectedReserva.clienteId,
      embarcacaoId: selectedReserva.embarcacaoId,
      operador: operadorNome || 'Operador',
      comprovante: comprovanteUrl || null,
      comprovanteUrl: comprovanteUrl || null,
      createdAt: new Date().toISOString()
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
        await fetch('/api/financeiro/transacoes/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ action: 'upsert', data: transacao })
        });
      }

      setData((prev: any) => ({
        ...prev,
        reservations: prev.reservations.map((r: any) => r.id === updatedReserva.id ? updatedReserva : r)
      }));
      
      await logAction('Chegada', `Marcou chegada e abastecimento de ${litersNum}L`, updatedReserva.embarcacaoId, operadorNome);

      setFuelModalOpen(false);
      alert('Chegada e abastecimento registrados com sucesso!');
    } catch (err) {
      alert('Erro ao salvar chegada.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeRegistrarSubida = async (fotosChecklistSubida: string[], reservaTarget?: any) => {
    const alvo = reservaTarget || selectedReserva;
    if (!alvo) return;
    if (!alvo.horaChegada && alvo.statusMarina !== 'chegada') {
      alert('A subida só pode ser registrada na aba Retornaram, após o abastecimento da embarcação.');
      return;
    }
    setIsSubmitting(true);
    
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updatedReserva = { 
      ...alvo, 
      horaSubida: horaAtual,
      fotosChecklistSubida,
      statusMarina: 'guardada',
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
      
      await logAction('Subida', 'Registrou subida com checklist', alvo.embarcacaoId, operadorNome);

      setChecklistOpen(false);
      alert('Subida e checklist registrados com sucesso!');
    } catch (err) {
      alert('Erro ao salvar subida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-white flex-col gap-4">
        <p className="text-red-400">{error}</p>
        <button onClick={onLogout} className="px-4 py-2 bg-slate-800 rounded-lg">Sair</button>
      </div>
    );
  }

  const getEmbarcacao = (id: string) => data?.boats?.find((b: any) => b.id === id);
  const getCliente = (id: string) => data?.clients?.find((c: any) => c.id === id);

  const getFilteredReservations = () => {
    if (!data?.reservations) return [];
    
    let filtered = data.reservations.filter((r: any) => r.data === selectedDate);
    
    if (filterType === 'agendadas') {
      filtered = filtered.filter((r: any) => !r.horaDescida && r.status === 'agendado');
    } else if (filterType === 'confirmadas') {
      filtered = filtered.filter((r: any) => !r.horaDescida && r.status === 'confirmado');
    } else if (filterType === 'prontas') {
      filtered = filtered.filter((r: any) => 
        r.horaDescida && 
        r.statusMarina !== 'chegada' && 
        r.statusMarina !== 'guardada' &&
        !r.horaSubida &&
        r.status !== 'cancelado'
      );
    } else if (filterType === 'retornaram') {
      filtered = filtered.filter((r: any) => 
        r.status === 'cancelado' || 
        r.statusMarina === 'chegada' || 
        r.statusMarina === 'guardada' ||
        r.horaSubida
      );
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((r: any) => {
        const boat = getEmbarcacao(r.embarcacaoId);
        const client = getCliente(r.clienteId);
        const boatName = (boat?.nome || '').toLowerCase();
        const boatNum = (boat?.numero || '').toString().toLowerCase();
        const clientName = (client?.nome || '').toLowerCase();
        const obs = (r.observacoes || '').toLowerCase();
        return boatName.includes(q) || boatNum.includes(q) || clientName.includes(q) || obs.includes(q);
      });
    }

    filtered.sort((a: any, b: any) => {
      if (sortBy === 'alfabetica') {
        const boatA = getEmbarcacao(a.embarcacaoId);
        const boatB = getEmbarcacao(b.embarcacaoId);
        const nameA = boatA?.nome || '';
        const nameB = boatB?.nome || '';
        return nameA.localeCompare(nameB, 'pt-BR');
      } else {
        const timeA = a.previsaoSaida || a.horaDescida || a.horaSaida || '99:99';
        const timeB = b.previsaoSaida || b.horaDescida || b.horaSaida || '99:99';
        return timeA.localeCompare(timeB);
      }
    });
    
    return filtered;
  };

  const reservasDoDia = getFilteredReservations();
  const totalDayReservations = data?.reservations?.filter((r: any) => r.data === selectedDate) || [];
  const countAgendadas = totalDayReservations.filter((r: any) => !r.horaDescida && r.status === 'agendado').length;
  const countConfirmadas = totalDayReservations.filter((r: any) => !r.horaDescida && r.status === 'confirmado').length;
  const countProntas = totalDayReservations.filter((r: any) => r.horaDescida && r.statusMarina !== 'chegada' && r.statusMarina !== 'guardada' && !r.horaSubida && r.status !== 'cancelado').length;
  const countRetornaram = totalDayReservations.filter((r: any) => r.status === 'cancelado' || r.statusMarina === 'chegada' || r.statusMarina === 'guardada' || r.horaSubida).length;
  const countTodas = totalDayReservations.length;
  const displayDateStr = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <div className="min-h-screen w-full flex bg-[#f4f5f7] font-sans text-slate-800">
      
      {/* Sidebar - Light Theme Executiva (Desktop & Tablet) */}
      <aside className={`bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 transition-all duration-300 overflow-hidden z-30 shrink-0 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="min-h-[4.5rem] flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <Logo className="h-7 w-auto text-[#B69D74] shrink-0" />
            {isSidebarOpen && (
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm text-slate-900 tracking-tight leading-none truncate">Marina ERP</h1>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block mt-0.5">Painel Gerencial</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors hidden sm:block cursor-pointer"
            title={isSidebarOpen ? "Recolher Menu" : "Expandir Menu"}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6 subtle-scrollbar">
          <div>
            {isSidebarOpen && <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Visão Geral</p>}
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('home')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all text-xs font-bold cursor-pointer ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'home' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                title="Visão Geral"
              >
                <Home className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Visão Geral</span>}
              </button>
            </nav>
          </div>

          <div>
            {isSidebarOpen && <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Operação do Píer</p>}
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('operacao')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all text-xs font-bold cursor-pointer ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'operacao' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                title="Fila do Píer"
              >
                <Ship className="w-4 h-4 shrink-0" />
                {isSidebarOpen && (
                  <div className="flex items-center justify-between w-full">
                    <span>Fila do Píer</span>
                    <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-600 rounded-full text-[10px]">{countTodas}</span>
                  </div>
                )}
              </button>

              <button 
                onClick={() => setActiveTab('checklists')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all text-xs font-bold cursor-pointer ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'checklists' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                title="Auditoria de Checklists"
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Auditoria Checklists</span>}
              </button>
            </nav>
          </div>

          <div>
            {isSidebarOpen && <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Insumos & Combustível</p>}
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('combustivel')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all text-xs font-bold cursor-pointer ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'combustivel' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                title="Vendas de Combustível"
              >
                <Droplets className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Abastecimentos</span>}
              </button>

              <button 
                onClick={() => setActiveTab('tanques')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all text-xs font-bold cursor-pointer ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'tanques' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                title="Estoque de Tanques"
              >
                <Truck className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Estoque de Tanques</span>}
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {isSidebarOpen && (
              <div className="min-w-0 flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {(operadorNome || 'Gerente').substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate leading-none">{operadorNome || 'Gerente'}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">Gerente de Marina</p>
                </div>
              </div>
            )}
            <button 
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Area Principal com Topbar Executiva */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Topbar Superior Executiva */}
        <header className="bg-white border-b border-slate-200 min-h-[4.5rem] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors sm:hidden cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base text-slate-900 tracking-tight">
                  {activeTab === 'home' && 'Visão Geral Executiva'}
                  {activeTab === 'operacao' && 'Operação & Fila do Píer'}
                  {activeTab === 'checklists' && 'Auditoria de Checklists & Fotos'}
                  {activeTab === 'combustivel' && 'Lançamentos de Abastecimento'}
                  {activeTab === 'tanques' && 'Estoque & Tanques da Marina'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold uppercase tracking-wider hidden sm:inline-block">
                  Gerente de Marina
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Controle centralizado da marina, frota na água e suprimentos
              </p>
            </div>
          </div>

          {/* Controls: Date Navigator & Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
              <button onClick={handlePrevDay} className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white transition-all cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-bold text-slate-700 capitalize">{displayDateStr}</span>
              <button onClick={handleNextDay} className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white transition-all cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body com Scroll Interno */}
        <main className="flex-1 overflow-y-auto subtle-scrollbar p-3 sm:p-6 bg-[#f4f5f7]">
          
          {/* ABA HOME: VISÃO GERAL EXECUTIVA */}
          {activeTab === 'home' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Banner Executivo */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
                <div className="space-y-1.5 z-10">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Painel Gerencial
                    </span>
                    <span className="text-xs font-medium text-slate-300">{displayDateStr}</span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Bem-vindo, {operadorNome || 'Gerente'}!</h2>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    Painel administrativo em tempo real para monitorar a operação do píer, conferir checklists fotográficos dos marinheiros e controlar o estoque de combustível da marina.
                  </p>
                </div>
                <div className="flex items-center gap-2 z-10">
                  <button 
                    onClick={() => setActiveTab('operacao')}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Ship className="w-4 h-4" />
                    <span>Ver Fila do Píer</span>
                  </button>
                </div>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Na Água Agora</span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Anchor className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-slate-900">{countProntas}</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Embarcações</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">Barcos prontos no píer / em água</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Agendados no Dia</span>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-slate-900">{countAgendadas + countConfirmadas}</span>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Agendamentos</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">Na fila para descida na data</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Retornaram / Concluídos</span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-slate-900">{countRetornaram}</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Finalizados</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">Barcos que retornaram e foram guardados</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Operações Totais</span>
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <Ship className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-slate-900">{countTodas}</span>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">No Dia</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">Movimentações programadas hoje</p>
                </div>
              </div>

              {/* Quick Shortcuts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tanques de Combustível Summary Widget */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-blue-600" />
                      <h3 className="font-extrabold text-base text-slate-900">Estoque dos Tanques da Marina</h3>
                    </div>
                    <button 
                      onClick={() => setActiveTab('tanques')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Gerenciar Tanques</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gasolina Podium</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-slate-900 font-mono">7.650 L</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">76%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '76%' }} />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Diesel Náutico</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-slate-900 font-mono">4.200 L</span>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">42%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: '42%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Auditoria de Checklists Summary Widget */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-blue-600" />
                      <h3 className="font-extrabold text-base text-slate-900">Auditoria & Registros Fotográficos</h3>
                    </div>
                    <button 
                      onClick={() => setActiveTab('checklists')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver Checklists</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 text-slate-700 text-xs">
                    <div className="flex items-center gap-2 text-blue-900 font-bold">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>Ângulo do Casco & Inspeção Inferior Ativados</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Os marinheiros estão registrando fotos nos 6 ângulos (Proa, Popa, Lateral Esquerda, Lateral Direita, Painel e Casco) em cada descida e subida.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        {activeTab === 'operacao' && (
          <div className="w-full p-2 space-y-3 pb-24">
            {/* Date Navigator */}
            <div className="flex items-center justify-between bg-white rounded-xl p-1 shadow-sm mb-2 border border-slate-200">
              <button onClick={handlePrevDay} className="p-2 text-slate-400 active:text-white active:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center justify-center font-medium">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Operações</span>
                <span className="text-sm font-bold text-slate-700 capitalize">{displayDateStr}</span>
              </div>
              <button onClick={handleNextDay} className="p-2 text-slate-400 active:text-white active:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Pesquisar por barco, vaga ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                    title="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort selector buttons */}
              <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0 items-center justify-between sm:justify-start gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 hidden xs:inline">Ordenar:</span>
                <button
                  onClick={() => setSortBy('hora_saida')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${sortBy === 'hora_saida' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'}`}
                  title="Ordenar por Hora Prevista de Saída"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Hora Saída</span>
                </button>
                <button
                  onClick={() => setSortBy('alfabetica')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${sortBy === 'alfabetica' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'}`}
                  title="Ordenar Alfabeticamente"
                >
                  <SortAsc className="w-3.5 h-3.5" />
                  <span>Alfabética</span>
                </button>
              </div>
            </div>

            {/* Status Filter Tabs with Badge Counts */}
            <div className="flex bg-white shadow-sm border border-slate-200 rounded-xl p-1 gap-1 overflow-x-auto subtle-scrollbar mb-4">
              {[
                { id: 'agendadas', label: 'Agendadas', count: countAgendadas },
                { id: 'confirmadas', label: 'Confirmadas', count: countConfirmadas },
                { id: 'prontas', label: 'Prontas', count: countProntas },
                { id: 'retornaram', label: 'Retornaram', count: countRetornaram },
                { id: 'todas', label: 'Todas', count: countTodas }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setFilterType(t.id as any)}
                  className={`flex-1 min-w-[75px] py-2 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${filterType === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <span>{t.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${filterType === t.id ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {reservasDoDia.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center mt-4 mx-2">
            <Ship className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-500">Nenhum agendamento encontrado</h3>
            <p className="text-slate-400 text-xs mt-1">
              {searchTerm ? `Nenhum resultado para "${searchTerm}".` : 'Não há registros nesta categoria.'}
            </p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          reservasDoDia.map((reserva: any) => {
            const boat = getEmbarcacao(reserva.embarcacaoId);
            const client = getCliente(reserva.clienteId);
            const isSaida = !!reserva.horaSaida;
            const isChegada = !!reserva.horaChegada;

            return (
              <div key={reserva.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 relative overflow-hidden active:bg-slate-50 transition-colors">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${isChegada ? 'bg-green-500' : isSaida ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-xl text-slate-900 leading-none">
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
                      <span className="truncate max-w-[180px]">{client?.nome || 'Cliente'}</span>
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${reserva.status === 'confirmado' ? 'bg-green-100 text-green-700' : reserva.status === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {reserva.status}
                  </div>
                </div>

                <div 
                  className="cursor-pointer active:opacity-70 transition-opacity"
                  onClick={() => {
                    setDetailsReserva(reserva);
                    setDetailsModalOpen(true);
                  }}
                >
                  <div className="flex bg-slate-50 rounded-xl p-3 mb-4 gap-3 border border-slate-100 relative group">
                    <div className="absolute right-2 top-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Prev. Saída</span>
                      <div className={`font-mono font-bold text-base ${reserva.previsaoSaida ? 'text-slate-700' : 'text-slate-400 text-sm'}`}>
                        {reserva.previsaoSaida ? reserva.previsaoSaida : 'Não informada'}
                      </div>
                    </div>
                    <div className="w-px bg-slate-200"></div>
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Prev. Chegada</span>
                      <div className={`font-mono font-bold text-base ${reserva.previsaoChegada ? 'text-slate-700' : 'text-slate-400 text-sm'}`}>
                        {reserva.previsaoChegada ? reserva.previsaoChegada : 'Não informada'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Reais */}
                  {(reserva.horaDescida || reserva.horaSaida || reserva.horaChegada) && (
                    <div className="flex bg-blue-50/50 rounded-xl p-3 mb-4 gap-2 border border-blue-100/50 text-[10px] text-blue-800 font-medium overflow-x-auto subtle-scrollbar">
                      {reserva.horaDescida && (
                        <div className="whitespace-nowrap flex items-center gap-1 font-mono">
                          <ArrowRight className="w-3 h-3 text-blue-500"/> Pier: {reserva.horaDescida}
                        </div>
                      )}
                      {reserva.horaSaida && (
                        <>
                          <div className="w-px bg-blue-200 shrink-0"></div>
                          <div className="whitespace-nowrap flex items-center gap-1 font-mono">
                            <Navigation className="w-3 h-3 text-blue-500"/> Mar: {reserva.horaSaida}
                          </div>
                        </>
                      )}
                      {reserva.horaChegada && (
                        <>
                          <div className="w-px bg-blue-200 shrink-0"></div>
                          <div className="whitespace-nowrap flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3 h-3 text-blue-500"/> Chegou: {reserva.horaChegada}
                          </div>
                        </>
                      )}
                      {reserva.horaSubida && (
                        <>
                          <div className="w-px bg-blue-200 shrink-0"></div>
                          <div className="whitespace-nowrap flex items-center gap-1 font-mono">
                            <ClipboardList className="w-3 h-3 text-blue-500"/> Subiu: {reserva.horaSubida}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Botões Grandes e Tap-friendly */}
                {reserva.status !== 'cancelado' && !reserva.horaDescida && (
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (confirm("Confirmar descida rápida sem fotos?")) {
                          executeRegistrarDescida([], reserva);
                        }
                      }}
                      className="w-1/3 py-3 bg-amber-100 active:bg-amber-200 text-amber-700 rounded-xl font-black text-[10px] uppercase tracking-wide flex flex-col items-center justify-center gap-1 transition-colors shadow-sm"
                    >
                      <Zap className="w-5 h-5" />
                      Rápida
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openChecklistForDescida(reserva); }}
                      className="w-2/3 py-3 bg-amber-500 active:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                      <Camera className="w-5 h-5" />
                      Checklist Saída
                    </button>
                  </div>
                )}

                {reserva.status !== 'cancelado' && reserva.horaDescida && !reserva.horaSaida && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); executeMarcarSaida(reserva); }}
                    className="w-full py-4 bg-blue-600 active:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Navigation className="w-5 h-5" />
                    Marcar Saída
                  </button>
                )}

                {reserva.status !== 'cancelado' && reserva.horaSaida && !reserva.horaChegada && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); openFuelForChegada(reserva); }}
                    className="w-full py-4 bg-slate-900 active:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Droplets className="w-5 h-5" />
                    Registrar Chegada
                  </button>
                )}

                {filterType === 'retornaram' && reserva.status !== 'cancelado' && (reserva.horaChegada || reserva.statusMarina === 'chegada') && !reserva.horaSubida && (
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (confirm("Confirmar subida rápida sem fotos?")) {
                          executeRegistrarSubida([], reserva);
                        }
                      }}
                      className="w-1/3 py-3 bg-slate-100 active:bg-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-wide flex flex-col items-center justify-center gap-1 transition-colors shadow-sm"
                    >
                      <Zap className="w-5 h-5" />
                      Rápida
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openChecklistForSubida(reserva); }}
                      className="w-2/3 py-3 bg-slate-800 active:bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                      <ClipboardList className="w-5 h-5" />
                      Subir / Checklist
                    </button>
                  </div>
                )}

                {reserva.status !== 'cancelado' && reserva.horaSubida && (
                  <div className="w-full py-3 bg-green-50 text-green-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-green-200">
                    <CheckCircle2 className="w-5 h-5" />
                    Guardada e Finalizada
                  </div>
                )}
              </div>
            );
          })
        )}
          </div>
        )}

        {activeTab === 'checklists' && (
          <MarinaChecklistsView 
            data={data} 
            operadorNome={operadorNome}
            setData={setData}
          />
        )}

        {activeTab === 'combustivel' && (
          <MarinaFuelView 
            data={data} 
            operadorNome={operadorNome}
            setData={setData}
            reloadData={fetchData}
          />
        )}

        {activeTab === 'tanques' && (
          <MarinaTanksView 
            operadorNome={operadorNome}
            showToast={showToast}
          />
        )}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm animate-toast-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-xl ${
            toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-700/50 text-emerald-100' :
            toast.type === 'warning' ? 'bg-amber-950/90 border-amber-700/50 text-amber-100' :
            'bg-slate-950/90 border-blue-700/50 text-blue-100'
          }`}>
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              toast.type === 'success' ? 'bg-emerald-500/20' :
              toast.type === 'warning' ? 'bg-amber-500/20' :
              'bg-blue-500/20'
            }`}>
              <Bell className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)} className="shrink-0 text-white/50 hover:text-white/80 text-lg font-bold leading-none cursor-pointer">×</button>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar (Mobile Only) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-[40] safe-area-bottom">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-1">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors cursor-pointer ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Home className={`w-5 h-5 ${activeTab === 'home' ? 'fill-blue-100' : ''}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Início</span>
          </button>
          <button 
            onClick={() => setActiveTab('operacao')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors cursor-pointer ${activeTab === 'operacao' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Ship className={`w-5 h-5 ${activeTab === 'operacao' ? 'fill-blue-100' : ''}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Fila</span>
          </button>
          <button 
            onClick={() => setActiveTab('checklists')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors cursor-pointer ${activeTab === 'checklists' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <ClipboardList className={`w-5 h-5 ${activeTab === 'checklists' ? 'fill-blue-100' : ''}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Checklist</span>
          </button>
          <button 
            onClick={() => setActiveTab('combustivel')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors cursor-pointer ${activeTab === 'combustivel' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Droplets className={`w-5 h-5 ${activeTab === 'combustivel' ? 'fill-blue-100' : ''}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Posto</span>
          </button>
          <button 
            onClick={() => setActiveTab('tanques')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors cursor-pointer ${activeTab === 'tanques' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Truck className={`w-5 h-5 ${activeTab === 'tanques' ? 'fill-blue-100' : ''}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Tanques</span>
          </button>
        </div>
      </div>

      {/* Styles for Bottom Sheets */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up-fast {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, -1rem); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-toast-in {
          animation: toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Checklist Bottom Sheet Modal */}
      {checklistOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setChecklistOpen(false)}></div>
          
          <div className="bg-white w-full rounded-t-3xl shadow-2xl relative z-10 animate-slide-up-fast pb-8 max-h-[90vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 shrink-0"></div>
            
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${checklistMode === 'descida' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-800'}`}>
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 leading-none capitalize">
                    Checklist de {checklistMode}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Fotos do estado da embarcação</p>
                </div>
              </div>
              <button onClick={() => setChecklistOpen(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full active:bg-slate-200">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <p className="text-sm text-slate-600 mb-2">Tire fotos dos ângulos abaixo. Isso não é obrigatório, mas ajuda a comprovar o estado do barco.</p>
              
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
                        {/* Hidden File Input */}
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
                            {isUploaded && <span className="block text-[10px] text-blue-600 font-medium mt-0.5">Adicionar +</span>}
                            {!isUploaded && !isUploading && (
                              <span className="block text-[10px] text-slate-400 mt-0.5">Tocar p/ Câmera</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 pt-2 border-t border-slate-100 shrink-0 space-y-3 mt-auto">
              <button 
                onClick={proceedChecklist}
                className={`w-full py-4 text-white rounded-2xl font-black text-base uppercase tracking-wide flex items-center justify-center gap-2 transition-colors shadow-md ${
                  Object.keys(checklistFotos).length > 0
                    ? 'bg-green-600 active:bg-green-700'
                    : 'bg-slate-900 active:bg-slate-800'
                }`}
              >
                {Object.keys(checklistFotos).length > 0 ? (
                  <>
                    <Check className="w-5 h-5" />
                    Finalizar c/ Fotos
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    Pular e Continuar
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Fuel Bottom Sheet Modal */}
      {fuelModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setFuelModalOpen(false)}></div>
          
          <div className="bg-white w-full rounded-t-3xl shadow-2xl relative z-10 animate-slide-up-fast pb-8">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1"></div>
            
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 leading-none">Abastecimento</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Registrar combustível e retorno</p>
                </div>
              </div>
              <button onClick={() => setFuelModalOpen(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full active:bg-slate-200">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleConfirmFuelAndRegisterArrival} className="p-5 space-y-6">
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">Litros Abastecidos (L)</label>
                <div className="relative">
                  <input 
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    required
                    value={liters}
                    onChange={(e) => setLiters(e.target.value.replace(',', '.'))}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    placeholder="0.0"
                    autoFocus
                  />
                  <span className="absolute right-5 top-4 text-slate-400 font-bold text-xl">L</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[0, 50, 100, 150].map(val => (
                    <button 
                      type="button"
                      key={val}
                      onClick={() => setLiters(val.toString())}
                      className="py-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs border border-blue-100 hover:bg-blue-100 active:bg-blue-200 transition-colors flex items-center justify-center"
                    >
                      {val === 0 ? 'Zero' : `+${val}L`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 font-medium">Toque nos botões ou digite os litros manualmente.</p>
              </div>

              {Number(liters) > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 block">Forma de Cobrança</label>
                  <div className="grid grid-cols-1 gap-2">
                    <label className={`flex items-center p-3 border rounded-2xl cursor-pointer transition-all active:scale-[0.98] ${paymentType === 'pix' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" name="payment" value="pix" checked={paymentType === 'pix'} onChange={() => setPaymentType('pix')} className="sr-only" />
                      <div className="flex-1">
                        <span className="block font-bold text-sm text-slate-900">Pix / Dinheiro</span>
                        <span className="block text-xs text-slate-500 font-medium mt-0.5">R$ 9,00/L (Recebido agora)</span>
                      </div>
                    </label>
                    <label className={`flex items-center p-3 border rounded-2xl cursor-pointer transition-all active:scale-[0.98] ${paymentType === 'credit' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" name="payment" value="credit" checked={paymentType === 'credit'} onChange={() => setPaymentType('credit')} className="sr-only" />
                      <div className="flex-1">
                        <span className="block font-bold text-sm text-slate-900">Cartão de Crédito</span>
                        <span className="block text-xs text-slate-500 font-medium mt-0.5">R$ 10,00/L (Recebido agora)</span>
                      </div>
                    </label>
                    <label className={`flex items-center p-3 border rounded-2xl cursor-pointer transition-all active:scale-[0.98] ${paymentType === 'admin' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" name="payment" value="admin" checked={paymentType === 'admin'} onChange={() => setPaymentType('admin')} className="sr-only" />
                      <div className="flex-1">
                        <span className="block font-bold text-sm text-amber-900">Cobrar Depois</span>
                        <span className="block text-xs text-amber-700 font-medium mt-0.5">R$ 13,00/L (Faturado pelo Admin)</span>
                      </div>
                    </label>
                  </div>
                  
                  <div className="mt-2 p-4 bg-slate-900 rounded-2xl text-white flex justify-between items-center shadow-inner">
                    <span className="text-sm font-bold text-slate-300">Total a lançar:</span>
                    <span className="font-black text-2xl font-mono text-[#B69D74]">
                      R$ {(Number(liters) * (paymentType === 'pix' ? 9 : paymentType === 'credit' ? 10 : 13)).toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  {(paymentType === 'pix' || paymentType === 'credit') && (
                    <div className="mt-4 p-4 border border-slate-200 rounded-2xl bg-white space-y-3">
                      <label className="text-sm font-bold text-slate-700 block">Comprovante de Pagamento *</label>
                      
                      {comprovanteUrl ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200">
                          {comprovanteUrl.endsWith('.pdf') ? (
                            <div className="flex items-center justify-center p-6 bg-slate-50">
                              <span className="text-sm font-medium text-slate-500">PDF Anexado</span>
                            </div>
                          ) : (
                            <img src={comprovanteUrl} alt="Comprovante" className="w-full h-32 object-cover" />
                          )}
                          <button 
                            type="button"
                            onClick={() => setComprovanteUrl(null)}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-500 shadow-sm"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input 
                            type="file" 
                            accept="image/*,application/pdf"
                            capture="environment"
                            onChange={handleUploadComprovante}
                            className="hidden"
                            id="comprovante-upload"
                          />
                          <label 
                            htmlFor="comprovante-upload"
                            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-700 hover:border-slate-400 cursor-pointer transition-colors active:bg-slate-50"
                          >
                            {isUploadingComprovante ? (
                              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            ) : (
                              <>
                                <Camera className="w-6 h-6" />
                                <span className="text-xs font-bold uppercase tracking-wider">Tirar Foto ou Anexar</span>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                {Number(liters) === 0 ? (
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-base uppercase tracking-wide flex items-center justify-center gap-2 active:bg-slate-800 disabled:opacity-70 transition-colors shadow-md"
                  >
                    <ArrowRight className="w-5 h-5" />
                    Avançar p/ Chegada (Sem Fuel)
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-base uppercase tracking-wide flex items-center justify-center gap-2 active:bg-blue-700 disabled:opacity-70 transition-colors shadow-md"
                  >
                    <ArrowRight className="w-5 h-5" />
                    Ir para Checklist
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModalOpen && detailsReserva && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setDetailsModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Detalhes da Reserva</h3>
              <button onClick={() => setDetailsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            
            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-6 subtle-scrollbar">
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black text-2xl text-slate-900 leading-none">
                    {data?.boats?.find((b: any) => b.id === detailsReserva.embarcacaoId)?.nome || 'Embarcação'}
                  </h3>
                  {data?.boats?.find((b: any) => b.id === detailsReserva.embarcacaoId)?.numero && (
                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded-md text-xs font-bold font-mono">
                      {data?.boats?.find((b: any) => b.id === detailsReserva.embarcacaoId)?.numero}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm font-medium">
                  {data?.clients?.find((c: any) => c.id === detailsReserva.clienteId)?.nome || 'Cliente'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Status Geral</span>
                  <span className="font-semibold text-slate-800 capitalize">{detailsReserva.status}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Status Marina</span>
                  <span className="font-semibold text-slate-800 capitalize">{detailsReserva.statusMarina || 'Agendado'}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Horários</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 border border-slate-100 rounded-lg">
                    <span className="text-sm font-medium text-slate-600">Prev. Saída</span>
                    <span className={`font-mono font-bold ${detailsReserva.previsaoSaida ? 'text-slate-800' : 'text-slate-400 text-xs'}`}>
                      {detailsReserva.previsaoSaida || 'Não informada'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 border border-slate-100 rounded-lg">
                    <span className="text-sm font-medium text-slate-600">Prev. Chegada</span>
                    <span className={`font-mono font-bold ${detailsReserva.previsaoChegada ? 'text-slate-800' : 'text-slate-400 text-xs'}`}>
                      {detailsReserva.previsaoChegada || 'Não informada'}
                    </span>
                  </div>
                  {detailsReserva.horaDescida && (
                    <div className="flex justify-between items-center p-3 border border-amber-100 bg-amber-50 rounded-lg">
                      <span className="text-sm font-medium text-amber-700">Descida (Pier)</span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-amber-800 block">{detailsReserva.horaDescida}</span>
                        {detailsReserva.operadorDescida && <span className="text-[10px] text-amber-600/70 font-bold uppercase">{detailsReserva.operadorDescida}</span>}
                      </div>
                    </div>
                  )}
                  {detailsReserva.horaSaida && (
                    <div className="flex justify-between items-center p-3 border border-blue-100 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-700">Saída Efetiva</span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-blue-800 block">{detailsReserva.horaSaida}</span>
                        {detailsReserva.operadorSaida && <span className="text-[10px] text-blue-600/70 font-bold uppercase">{detailsReserva.operadorSaida}</span>}
                      </div>
                    </div>
                  )}
                  {detailsReserva.horaChegada && (
                    <div className="flex justify-between items-center p-3 border border-green-100 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-700">Chegada Efetiva</span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-green-800 block">{detailsReserva.horaChegada}</span>
                        {detailsReserva.operadorChegada && <span className="text-[10px] text-green-600/70 font-bold uppercase">{detailsReserva.operadorChegada}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Observações / Detalhes</h4>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {detailsReserva.observações || 'Nenhuma observação.'}
                </div>
              </div>

              {((parseFotos(detailsReserva.fotosChecklistDescida).concat(parseFotos(detailsReserva.fotosChecklistSaida))).length > 0 || parseFotos(detailsReserva.fotosChecklistChegada).length > 0 || parseFotos(detailsReserva.fotosChecklistSubida).length > 0) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Galeria de Fotos</h4>
                  {parseFotos(detailsReserva.fotosChecklistDescida || detailsReserva.fotosChecklistSaida).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Checklist de Descida</p>
                      <div className="flex gap-2 overflow-x-auto subtle-scrollbar pb-2">
                        {parseFotos(detailsReserva.fotosChecklistDescida || detailsReserva.fotosChecklistSaida).map((url: string, i: number) => (
                          <img key={`d_${i}`} src={url} alt="Descida" className="h-20 w-20 object-cover rounded-lg border border-slate-200 cursor-pointer" onClick={() => window.open(url, '_blank')}/>
                        ))}
                      </div>
                    </div>
                  )}
                  {parseFotos(detailsReserva.fotosChecklistChegada).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Checklist de Chegada</p>
                      <div className="flex gap-2 overflow-x-auto subtle-scrollbar pb-2">
                        {parseFotos(detailsReserva.fotosChecklistChegada).map((url: string, i: number) => (
                          <img key={`c_${i}`} src={url} alt="Chegada" className="h-20 w-20 object-cover rounded-lg border border-slate-200 cursor-pointer" onClick={() => window.open(url, '_blank')}/>
                        ))}
                      </div>
                    </div>
                  )}
                  {parseFotos(detailsReserva.fotosChecklistSubida).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">Checklist de Subida</p>
                      <div className="flex gap-2 overflow-x-auto subtle-scrollbar pb-2">
                        {parseFotos(detailsReserva.fotosChecklistSubida).map((url: string, i: number) => (
                          <img key={`s_${i}`} src={url} alt="Subida" className="h-20 w-20 object-cover rounded-lg border border-slate-200 cursor-pointer" onClick={() => window.open(url, '_blank')}/>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-5 border-t border-slate-100">
              <button 
                onClick={() => setDetailsModalOpen(false)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors active:bg-slate-800"
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
