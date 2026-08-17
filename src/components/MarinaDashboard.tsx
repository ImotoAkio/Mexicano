import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LogOut, Ship, Clock, CheckCircle2, Droplets, ArrowRight, Loader2, Save, Camera, Navigation, Anchor, Image as ImageIcon, Check, ChevronLeft, ChevronRight, User as UserIcon, ClipboardList, Zap, Bell, Search, X, SortAsc, Layers, Truck, Shield, Home, Menu, LayoutGrid, Kanban, ArrowUpCircle, ArrowDownCircle, TrendingUp, CalendarDays, Settings, Volume2, LifeBuoy, Flame, Calendar } from 'lucide-react';
import Logo from './Logo';
import { io } from 'socket.io-client';
import { logAction } from '../db';
import MarinaChecklistsView from './MarinaChecklistsView';
import MarinaFuelView from './MarinaFuelView';
import MarinaTanksView from './MarinaTanksView';
import BoatPage from './BoatPage';
import FinanceSchedulesPage from './FinanceSchedulesPage';
import SettingsPage from './SettingsPage';
import ControleFolgasPage from './ControleFolgasPage';
import { getFuelInventory } from '../utils/fuelInventory';
import { ZoomableImage } from './ZoomableImage';

interface MarinaDashboardProps {
  onLogout: () => void;
  operadorNome?: string;
}

const CHECKLIST_ANGLES = [
  { id: 'painel', label: 'Painel', icon: Ship },
  { id: 'lateral_direita', label: 'Lateral Direita', icon: Camera },
  { id: 'lateral_esquerda', label: 'Lateral Esquerda', icon: Camera },
  { id: 'casco', label: 'Casco', icon: Layers },
  { id: 'superior', label: 'Superior', icon: ArrowUpCircle },
  { id: 'frontal_45_dir', label: '45° Frontal Direita', icon: Camera },
  { id: 'frontal_45_esq', label: '45° Frontal Esquerda', icon: Camera },
  { id: 'traseira_45_dir', label: '45° Traseira Direita', icon: Camera },
  { id: 'traseira_45_esq', label: '45° Traseira Esquerda', icon: Camera },
  { id: 'traseira_inf', label: 'Traseira Inferior', icon: ArrowDownCircle }
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
  const [lightbox, setLightbox] = useState<{ currentIndex: number, urls: string[], title: string } | null>(null);
  const [checklistObservacoes, setChecklistObservacoes] = useState('');
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<'agendadas' | 'confirmadas' | 'prontas' | 'retornaram' | 'todas' | 'agendados' | 'nopier' | 'navegando'>('agendadas');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'hora_saida' | 'alfabetica'>('hora_saida');
  const [tempFuelData, setTempFuelData] = useState<{liters: number, paymentType: string, comprovanteUrl: string | null} | null>(null);
  
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [isUploadingComprovante, setIsUploadingComprovante] = useState(false);
  
  // Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsReserva, setDetailsReserva] = useState<any>(null);

  // Bottom Navigation Tab & Sidebar state
  const [activeTab, setActiveTab] = useState<'home' | 'operacao' | 'checklists' | 'combustivel' | 'tanques' | 'embarcacoes' | 'agendamentos' | 'folgas' | 'configuracoes'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');

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

    const token = localStorage.getItem('admin_token');
    if (!token || token === 'null' || token === 'undefined') return;

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5
    });
    
    socket.on('connect', () => {
      fetchData();
    });

    socket.on('marina_update', (payload: any) => {
      const reservationData = payload?.reservation || payload?.data;
      if (!reservationData || (payload.type && payload.type !== 'reservations')) {
        // Fallback: se não veio payload ou não é reserva, faz fetch completo
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

  // Calculo de movimentacao semanal real para o grafico SVG (Hook antes de retornos condicionais)
  const chartDays = useMemo(() => {
    const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    return dayLabels.map((dayName, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const dateStr = d.toISOString().split('T')[0];
      const count = (data?.reservations || []).filter((r: any) => r.data === dateStr && r.status !== 'cancelado').length;
      return { dayName, dateStr, count };
    });
  }, [data?.reservations]);

  const chartPoints = useMemo(() => {
    const maxVal = Math.max(5, ...chartDays.map(d => d.count));
    const width = 500;
    const paddingX = 40;
    const stepX = (width - 2 * paddingX) / (chartDays.length - 1);

    return chartDays.map((d, i) => {
      const x = Math.round(paddingX + i * stepX);
      const y = Math.round(115 - (d.count / maxVal) * 85);
      return { ...d, x, y };
    });
  }, [chartDays]);

  const chartPathD = useMemo(() => {
    if (chartPoints.length === 0) return '';
    let d = `M ${chartPoints[0].x},${chartPoints[0].y}`;
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p0 = chartPoints[i];
      const p1 = chartPoints[i + 1];
      const dx = (p1.x - p0.x) / 2.5;
      d += ` C ${p0.x + dx},${p0.y} ${p1.x - dx},${p1.y} ${p1.x},${p1.y}`;
    }
    return d;
  }, [chartPoints]);

  const chartFillD = useMemo(() => {
    if (!chartPathD || chartPoints.length === 0) return '';
    const firstX = chartPoints[0].x;
    const lastX = chartPoints[chartPoints.length - 1].x;
    return `${chartPathD} L ${lastX},135 L ${firstX},135 Z`;
  }, [chartPathD, chartPoints]);

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
    setChecklistObservacoes('');
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
    setChecklistObservacoes('');
    setChecklistOpen(true);
  };

  const openFuelForChegada = (reserva: any) => {
    setSelectedReserva(reserva);
    setLiters(reserva.abastecimentoLitros || reserva.litrosAbastecidos || '');
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
      fotosChecklistDescida: fotosChecklistDescida.length > 0 ? fotosChecklistDescida : alvo.fotosChecklistDescida,
      observacoesChecklistDescida: checklistObservacoes || alvo.observacoesChecklistDescida,
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
    const litersNum = Number(liters) || 0;
    const currentOperator = operadorNome || localStorage.getItem('user_name') || localStorage.getItem('usuario_nome') || 'Marinheiro';
    
    const updatedReserva = { 
      ...selectedReserva, 
      horaChegada: selectedReserva.horaChegada || horaAtual,
      statusMarina: selectedReserva.statusMarina || 'chegada',
      operadorChegada: selectedReserva.operadorChegada || currentOperator,
      abastecimentoOperador: currentOperator,
      litrosAbastecidos: litersNum > 0 ? litersNum.toString() : (selectedReserva.litrosAbastecidos || '0'),
      abastecimentoLitros: litersNum > 0 ? litersNum : (selectedReserva.abastecimentoLitros || 0),
      abastecimentoStatusCobranca: litersNum > 0 ? 'pendente' : (selectedReserva.abastecimentoStatusCobranca || 'sem_abastecimento'),
      abastecimentoDataHora: selectedReserva.abastecimentoDataHora || new Date().toISOString()
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
        const { consumeFuelForEmbarcacao } = await import('../utils/fuelInventory');
        const boatName = selectedReserva.barcoNome || getEmbarcacao(selectedReserva.embarcacaoId)?.nome || 'Embarcação';
        consumeFuelForEmbarcacao(litersNum, boatName, currentOperator);
      }

      setData((prev: any) => ({
        ...prev,
        reservations: prev.reservations.map((r: any) => r.id === updatedReserva.id ? updatedReserva : r)
      }));
      
      await logAction('Chegada', `Marcou chegada e abastecimento de ${litersNum}L (Pendente de cobrança pelo gerente)`, updatedReserva.embarcacaoId, currentOperator);

      setFuelModalOpen(false);
      alert('Chegada e abastecimento salvos com sucesso! O lançamento ficou PENDENTE para cobrança pelo gerente.');
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
      fotosChecklistSubida: fotosChecklistSubida.length > 0 ? fotosChecklistSubida : alvo.fotosChecklistSubida,
      observacoesChecklistSubida: checklistObservacoes || alvo.observacoesChecklistSubida,
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

  const getEmbarcacao = (id: string) => data?.boats?.find((b: any) => b.id === id);
  const getCliente = (id: string) => data?.clients?.find((c: any) => c.id === id);

  const filterBySearch = (list: any[]) => {
    if (!searchTerm.trim()) return list;
    const q = searchTerm.trim().toLowerCase();
    return list.filter((r: any) => {
      const boat = getEmbarcacao(r.embarcacaoId);
      const client = getCliente(r.clienteId);
      const boatName = (boat?.nome || r.barcoNome || '').toLowerCase();
      const boatNum = (boat?.numero || '').toString().toLowerCase();
      const boatVaga = (boat?.vaga || '').toString().toLowerCase();
      const clientName = (client?.nome || r.clienteNome || '').toLowerCase();
      const obs = (r.observacoes || '').toLowerCase();
      return boatName.includes(q) || boatNum.includes(q) || boatVaga.includes(q) || clientName.includes(q) || obs.includes(q);
    });
  };

  const getSortTime = (reserva: any): string => {
    const raw = reserva.previsaoSaida || reserva.horaSaida || reserva.horaDescida;
    if (raw && typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed && trimmed !== 'Não informada' && trimmed !== 'Sem previsão' && trimmed !== '--:--') {
        const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
        if (match) {
          const hh = match[1].padStart(2, '0');
          const mm = match[2];
          return `${hh}:${mm}`;
        }
        return trimmed;
      }
    }
    return '99:99';
  };

  const sortReservations = (list: any[]) => {
    return [...list].sort((a: any, b: any) => {
      if (sortBy === 'alfabetica') {
        const boatA = getEmbarcacao(a.embarcacaoId);
        const boatB = getEmbarcacao(b.embarcacaoId);
        const nameA = boatA?.nome || a.barcoNome || '';
        const nameB = boatB?.nome || b.barcoNome || '';
        return nameA.localeCompare(nameB, 'pt-BR', { numeric: true });
      } else {
        const timeA = getSortTime(a);
        const timeB = getSortTime(b);
        const timeCompare = timeA.localeCompare(timeB);
        if (timeCompare !== 0) return timeCompare;

        const boatA = getEmbarcacao(a.embarcacaoId);
        const boatB = getEmbarcacao(b.embarcacaoId);
        const nameA = (boatA?.nome || a.barcoNome || '').toString();
        const nameB = (boatB?.nome || b.barcoNome || '').toString();
        return nameA.localeCompare(nameB, 'pt-BR', { numeric: true });
      }
    });
  };

  const totalDayReservations = data?.reservations?.filter((r: any) => r.data === selectedDate) || [];
  const searchedDayReservations = sortReservations(filterBySearch(totalDayReservations));

  const kanbanAgendados = searchedDayReservations.filter((r: any) => !r.horaDescida && !r.horaSaida && !r.horaChegada && !r.horaSubida && r.status !== 'cancelado');
  const kanbanNoPier = searchedDayReservations.filter((r: any) => r.horaDescida && !r.horaSaida && r.statusMarina !== 'saida' && r.statusOperacional !== 'navegando' && !r.horaChegada && r.statusMarina !== 'chegada' && !r.horaSubida && r.statusMarina !== 'guardada' && r.status !== 'cancelado');
  const kanbanNavegando = searchedDayReservations.filter((r: any) => (r.horaSaida || r.statusMarina === 'saida' || r.statusOperacional === 'navegando') && !r.horaChegada && r.statusMarina !== 'chegada' && !r.horaSubida && r.statusMarina !== 'guardada' && r.status !== 'cancelado');
  const kanbanRetornaram = searchedDayReservations.filter((r: any) => (r.horaChegada || r.statusMarina === 'chegada' || r.statusOperacional === 'retornou') && !r.horaSubida && r.statusMarina !== 'guardada' && r.status !== 'cancelado');

  const countAgendadosConfirmados = totalDayReservations.filter((r: any) => !r.horaDescida && !r.horaSaida && !r.horaChegada && !r.horaSubida && r.status !== 'cancelado').length;
  const countNoPier = totalDayReservations.filter((r: any) => r.horaDescida && !r.horaSaida && r.statusMarina !== 'saida' && r.statusOperacional !== 'navegando' && !r.horaChegada && r.statusMarina !== 'chegada' && !r.horaSubida && r.statusMarina !== 'guardada' && r.status !== 'cancelado').length;
  const countNavegando = totalDayReservations.filter((r: any) => (r.horaSaida || r.statusMarina === 'saida' || r.statusOperacional === 'navegando') && !r.horaChegada && r.statusMarina !== 'chegada' && !r.horaSubida && r.statusMarina !== 'guardada' && r.status !== 'cancelado').length;
  const countRetornaram = totalDayReservations.filter((r: any) => (r.horaChegada || r.statusMarina === 'chegada' || r.statusOperacional === 'retornou') && !r.horaSubida && r.statusMarina !== 'guardada' && r.status !== 'cancelado').length;
  const countTodas = totalDayReservations.length;

  // Auto-navegação para a aba com correspondência no modo Lista ao pesquisar
  useEffect(() => {
    const query = searchTerm.trim();
    if (!query || searchedDayReservations.length === 0) return;

    const inAgendados = kanbanAgendados.length > 0;
    const inNoPier = kanbanNoPier.length > 0;
    const inNavegando = kanbanNavegando.length > 0;
    const inRetornaram = kanbanRetornaram.length > 0;

    // Se a aba atual já contém resultados da busca, mantém nela
    const currentHasResults = 
      (filterType === 'agendadas' || filterType === 'agendados') ? inAgendados :
      (filterType === 'nopier' || filterType === 'prontas') ? inNoPier :
      (filterType === 'navegando') ? inNavegando :
      (filterType === 'retornaram') ? inRetornaram :
      (filterType === 'todas') ? true : false;

    if (currentHasResults) return;

    // Caso a aba atual não tenha resultados, navega automaticamente para a aba correspondente
    const matchingTabs: Array<'agendadas' | 'nopier' | 'navegando' | 'retornaram'> = [];
    if (inAgendados) matchingTabs.push('agendadas');
    if (inNoPier) matchingTabs.push('nopier');
    if (inNavegando) matchingTabs.push('navegando');
    if (inRetornaram) matchingTabs.push('retornaram');

    if (matchingTabs.length === 1) {
      setFilterType(matchingTabs[0]);
    } else if (matchingTabs.length > 1) {
      setFilterType('todas');
    }
  }, [searchTerm, kanbanAgendados.length, kanbanNoPier.length, kanbanNavegando.length, kanbanRetornaram.length]);

  const getFilteredReservations = () => {
    if (filterType === 'agendadas' || filterType === 'agendados') {
      return kanbanAgendados;
    } else if (filterType === 'nopier' || filterType === 'prontas') {
      return kanbanNoPier;
    } else if (filterType === 'navegando') {
      return kanbanNavegando;
    } else if (filterType === 'retornaram') {
      return kanbanRetornaram;
    }
    return searchedDayReservations;
  };

  const reservasDoDia = getFilteredReservations();
  const displayDateStr = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  // Dados reais de estoque do módulo de tanques (fuelInventory)
  const fuelInventory = getFuelInventory();
  const tanqueLitros = fuelInventory.tanquePrincipalLitros || 0;
  const tanqueCapacidade = fuelInventory.tanqueCapacidadeMaxima || 10000;
  const tanquePct = Math.min(100, Math.round((tanqueLitros / tanqueCapacidade) * 100));

  const galoesQtd = fuelInventory.galoesPierQuantidade || 0;
  const galaoParcial = fuelInventory.galaoParcialLitros || 0;
  const totalLitrosGaloes = (galoesQtd * (fuelInventory.galoesCapacidadeLitros || 20)) + galaoParcial;

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

  return (
    <div className="min-h-screen w-full flex bg-[#f4f5f7] font-sans text-slate-800">
      
      {/* Sidebar - Light Theme Executiva (Desktop & Tablet) */}
      <aside className={`hidden sm:flex bg-white border-r border-slate-200 flex-col h-screen sticky top-0 transition-all duration-300 overflow-hidden z-30 shrink-0 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="min-h-[4.5rem] flex items-center justify-between px-3 border-b border-slate-100">
          <div className="flex items-center min-w-0 flex-1 justify-center py-2">
            <Logo className="h-10 w-full text-[#B69D74]" editable={true} />
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors hidden sm:block cursor-pointer shrink-0 ml-1"
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
                onClick={() => setActiveTab('embarcacoes')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all text-xs font-bold cursor-pointer ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'embarcacoes' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                title="Lista de Embarcações"
              >
                <Anchor className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Embarcações</span>}
              </button>

              <button 
                onClick={() => setActiveTab('checklists')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all text-xs font-bold cursor-pointer ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'checklists' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                title="Auditoria de Checklists"
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Auditoria Checklists</span>}
              </button>

              <button 
                onClick={() => setActiveTab('agendamentos')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all text-xs font-bold cursor-pointer ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'agendamentos' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                title="Consulta de Agendamentos"
              >
                <CalendarDays className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Consulta Agendamentos</span>}
              </button>

              <button 
                onClick={() => setActiveTab('folgas')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all text-xs font-bold cursor-pointer ${isSidebarOpen ? 'space-x-3' : 'justify-center'} ${activeTab === 'folgas' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                title="Controle de Folgas"
              >
                <Calendar className="w-4 h-4 shrink-0" />
                {isSidebarOpen && <span>Controle de Folgas</span>}
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

        {/* Sidebar Footer User Info & Action Buttons */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'flex-col gap-2 justify-center'}`}>
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
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setActiveTab('configuracoes')}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'configuracoes' 
                    ? 'text-blue-600 bg-blue-100/80 font-bold shadow-xs' 
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                }`}
                title="Configurações do Sistema"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button 
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Sair do sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Area Principal */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Mobile Header Bar (Exibido apenas em telas menores que sm) */}
        <div className="sm:hidden px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-32 text-[#B69D74]" editable={true} />
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setActiveTab('configuracoes')}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'configuracoes' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="Configurações"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body com Scroll Interno */}
        <main className="flex-1 overflow-y-auto subtle-scrollbar p-3 sm:p-6 bg-[#f4f5f7] pb-24 sm:pb-6">
          
          {/* ABA HOME: VISÃO GERAL EXECUTIVA & RELATÓRIOS */}
          {activeTab === 'home' && (
            <div className="space-y-6 max-w-7xl mx-auto pb-10">
              
              {/* Header Executivo & Controles de Período */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Painel Gerencial Marina
                    </span>
                    <span className="text-xs font-semibold text-slate-400">• {displayDateStr}</span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                    Controle Operacional & Analytics
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Visão consolidada do fluxo do píer, ocupação de vagas, estoque de combustível e histórico de relatórios.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => setActiveTab('operacao')}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Ship className="w-4 h-4" />
                    <span>Fila do Píer</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('combustivel')}
                    className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Droplets className="w-4 h-4 text-amber-400" />
                    <span>Combustível</span>
                  </button>
                </div>
              </div>

              {/* Metric Cards Grid - Estilo Analytics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Agendamentos Hoje</span>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">{countAgendadosConfirmados}</span>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" />
                        <span>Confirmadas</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Total de descidas agendadas no dia</p>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">No Píer Prontas</span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
                      <Anchor className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">{countNoPier}</span>
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        Na água
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Barcos prontos à espera do cliente</p>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Navegando no Rio</span>
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold border border-sky-100">
                      <Navigation className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">{countNavegando}</span>
                      <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                        Em rio
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Barcos navegando no rio</p>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total Embarcações</span>
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
                      <Ship className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">{data?.boats?.length || 0}</span>
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Cadastradas
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Total de barcos sob gestão da marina</p>
                  </div>
                </div>
              </div>

              {/* Analytics Section: Gráficos de Tendência & Desempenho Operacional */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Movement Graph Card (Dynamic SVG Line Chart) */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">Movimentação Operacional no Píer</h3>
                      <p className="text-xs text-slate-400">Fluxo semanal de descidas e saídas de embarcações</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                        Semana Atual
                      </span>
                    </div>
                  </div>

                  {/* Dynamic SVG Area Chart */}
                  <div className="w-full pt-4 pb-2">
                    <div className="relative h-48 w-full">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="40" y1="30" x2="460" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="40" y1="70" x2="460" y2="70" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="40" y1="110" x2="460" y2="110" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />

                        {/* Smooth trend path passing exactly through every point */}
                        {chartFillD && (
                          <path
                            d={chartFillD}
                            fill="url(#chartGradient)"
                          />
                        )}
                        {chartPathD && (
                          <path
                            d={chartPathD}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Data Points - Exactly Aligned to Curve (x, y) */}
                        {chartPoints.map((pt, idx) => (
                          <g key={idx} className="group cursor-pointer">
                            {/* Number badge label above point */}
                            <text
                              x={pt.x}
                              y={pt.y - 10}
                              textAnchor="middle"
                              className="text-[11px] font-black fill-blue-700"
                            >
                              {pt.count}
                            </text>
                            {/* Circle indicator */}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="5.5"
                              fill="#2563eb"
                              stroke="#ffffff"
                              strokeWidth="2.5"
                              className="transition-transform group-hover:scale-125"
                            />
                          </g>
                        ))}
                      </svg>
                    </div>

                    {/* X Axis Labels */}
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 pt-2 border-t border-slate-100 px-4">
                      {chartDays.map((d, i) => (
                        <span key={i} className="text-center w-8">{d.dayName}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Efficiency Gauge Ring Card (Radial Gauge) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">Eficiência Operacional</h3>
                      <p className="text-xs text-slate-400">Conformidade de Checklists & Atendimento</p>
                    </div>
                  </div>

                  {/* SVG Semi-Circle / Gauge Ring */}
                  <div className="flex flex-col items-center justify-center my-auto py-2">
                    <div className="relative w-44 h-32 flex items-center justify-center">
                      <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 100 100">
                        {/* Background track */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke="#f1f5f9"
                          strokeWidth="10"
                          strokeDasharray="251.2"
                          strokeDashoffset="62.8"
                          strokeLinecap="round"
                        />
                        {/* Active progress track */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth="10"
                          strokeDasharray="251.2"
                          strokeDashoffset="80"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                        <span className="text-3xl font-black text-slate-900 font-mono">98%</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conformidade</span>
                      </div>
                    </div>
                    <div className="w-full bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center mt-2">
                      <p className="text-xs text-emerald-800 font-bold">100% dos Checklists em Dia</p>
                      <p className="text-[10px] text-emerald-600 font-medium">Fotos de 6 ângulos registradas antes da descida</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Control Section: Relatórios de Tanques & Tabela de Atividades Recentes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Tanques de Combustível Controls - Real Inventory Data */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-blue-600" />
                      <h3 className="font-extrabold text-base text-slate-900">Estoque dos Tanques</h3>
                    </div>
                    <button 
                      onClick={() => setActiveTab('tanques')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Gerenciar</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Tanque Principal */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tanque Principal</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          tanquePct <= 20 ? 'bg-rose-50 text-rose-700' :
                          tanquePct <= 40 ? 'bg-amber-50 text-amber-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {tanquePct}%
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          {tanqueLitros.toLocaleString('pt-BR')} L
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Cap: {tanqueCapacidade.toLocaleString('pt-BR')}L
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            tanquePct <= 20 ? 'bg-rose-500' :
                            tanquePct <= 40 ? 'bg-amber-500' :
                            'bg-emerald-500'
                          }`} 
                          style={{ width: `${tanquePct}%` }} 
                        />
                      </div>
                    </div>

                    {/* Galões no Píer */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Galões no Píer</span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          {galoesQtd} {galoesQtd === 1 ? 'galão cheio' : 'galões cheios'}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          {totalLitrosGaloes.toLocaleString('pt-BR')} L
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {galaoParcial > 0 ? `+ ${galaoParcial}L parcial` : 'Píer pronto'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all" 
                          style={{ width: `${Math.min(100, Math.round((totalLitrosGaloes / 200) * 100))}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabela de Atividades Recentes do Píer */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">Relatório de Operações no Píer</h3>
                      <p className="text-xs text-slate-400">Últimas movimentações registradas na data</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('operacao')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver Fila Completa</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400">
                          <th className="pb-2">Embarcação</th>
                          <th className="pb-2">Cliente</th>
                          <th className="pb-2">Estágio Atual</th>
                          <th className="pb-2">Prev. Saída</th>
                          <th className="pb-2 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-medium">
                        {(totalDayReservations.slice(0, 5) || []).map((r: any) => {
                          const boat = getEmbarcacao(r.embarcacaoId);
                          const client = getCliente(r.clienteId);
                          const isSaida = !!r.horaSaida;
                          const isChegada = !!r.horaChegada;
                          const isSubida = !!r.horaSubida;
                          const isDescida = !!r.horaDescida;
                          const isConfirmado = r.status === 'confirmado' || r.statusMarina === 'confirmada';

                          return (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 font-bold text-slate-900">
                                {boat?.nome || 'Embarcação'}
                              </td>
                              <td className="py-2.5 text-slate-600">
                                {client?.nome || 'Cliente'}
                              </td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                  isSubida ? 'bg-emerald-50 text-emerald-700' :
                                  isChegada ? 'bg-teal-50 text-teal-700' :
                                  isSaida ? 'bg-sky-50 text-sky-700' :
                                  isDescida ? 'bg-blue-50 text-blue-700' :
                                  isConfirmado ? 'bg-emerald-50 text-emerald-800' :
                                  'bg-amber-50 text-amber-800'
                                }`}>
                                  {isSubida ? 'Guardada' : isChegada ? 'Retornou' : isSaida ? 'Navegando' : isDescida ? 'No Píer' : isConfirmado ? 'Confirmado' : 'Agendado'}
                                </span>
                              </td>
                              <td className="py-2.5 font-mono text-slate-500">
                                {r.previsaoSaida || '--:--'}
                              </td>
                              <td className="py-2.5 text-right">
                                <button 
                                  onClick={() => setActiveTab('operacao')}
                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                                >
                                  Ver no Píer
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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

              {/* View Mode Switcher: Kanban vs Lista */}
              <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0 items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 hidden sm:inline">Visão:</span>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'kanban' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                  title="Quadro Kanban (Estágios Lado a Lado)"
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span>Kanban</span>
                </button>
                <button
                  onClick={() => setViewMode('lista')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'lista' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                  title="Lista em Fila"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Lista</span>
                </button>
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

            {/* Status Filter Tabs with Badge Counts (Only visible in Lista view) */}
            {viewMode === 'lista' && (
              <div className="flex bg-white shadow-sm border border-slate-200 rounded-xl p-1 gap-1 overflow-x-auto subtle-scrollbar mb-4">
                {[
                  { id: 'agendadas', label: 'Agendados / Confirmados', count: searchTerm ? kanbanAgendados.length : countAgendadosConfirmados, hasResults: kanbanAgendados.length > 0 },
                  { id: 'nopier', label: 'No Píer', count: searchTerm ? kanbanNoPier.length : countNoPier, hasResults: kanbanNoPier.length > 0 },
                  { id: 'navegando', label: 'Navegando', count: searchTerm ? kanbanNavegando.length : countNavegando, hasResults: kanbanNavegando.length > 0 },
                  { id: 'retornaram', label: 'Retornaram', count: searchTerm ? kanbanRetornaram.length : countRetornaram, hasResults: kanbanRetornaram.length > 0 },
                  { id: 'todas', label: 'Todas', count: searchTerm ? searchedDayReservations.length : countTodas, hasResults: searchedDayReservations.length > 0 }
                ].map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setFilterType(t.id as any)}
                    className={`flex-1 min-w-[75px] py-2 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                      filterType === t.id 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : searchTerm && t.hasResults
                          ? 'text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200'
                          : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      filterType === t.id 
                        ? 'bg-white/25 text-white' 
                        : searchTerm && t.hasResults
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* VISÃO KANBAN: QUADRO POR ESTÁGIOS */}
            {viewMode === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                
                {/* Coluna 1: Agendados / Confirmados */}
                <div className="bg-amber-50/40 rounded-2xl p-3 border border-amber-200/60 space-y-3 flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between px-1">
                    <span className="font-extrabold text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span>Agendados / Confirmados</span>
                    </span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-extrabold rounded-full text-[10px]">
                      {kanbanAgendados.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {kanbanAgendados.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                        <p className="text-xs">{searchTerm ? 'Nenhum resultado' : 'Nenhum agendamento'}</p>
                      </div>
                    ) : (
                      kanbanAgendados.map((reserva: any) => {
                        const barco = getEmbarcacao(reserva.embarcacaoId);
                        const cliente = getCliente(reserva.clienteId);
                        const isConfirmado = reserva.status === 'confirmado' || reserva.statusMarina === 'confirmada';
                        return (
                          <div key={reserva.id} className={`bg-white p-3.5 rounded-xl border shadow-xs hover:shadow-md transition-all space-y-2 ${isConfirmado ? 'border-emerald-200 hover:border-emerald-300' : 'border-amber-100'}`}>
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                <span className="font-extrabold text-sm text-slate-900 block leading-tight">{barco?.nome || reserva.barcoNome || 'Embarcação'}</span>
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border inline-flex items-center gap-1 ${
                                    isConfirmado 
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80' 
                                      : 'bg-amber-50 text-amber-800 border-amber-200/80'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isConfirmado ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    {isConfirmado ? 'Confirmado' : 'Agendado'}
                                  </span>
                                </div>
                              </div>
                              {reserva.previsaoSaida ? (
                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md shrink-0">
                                  {reserva.previsaoSaida}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md shrink-0" title="Horário não informado">
                                  --:--
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Cliente: {cliente?.nome || reserva.clienteNome || 'Cliente'}</p>
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                              <span className="text-slate-400 font-medium">Vaga: {barco?.vaga || 'N/A'}</span>
                              <button
                                onClick={() => {
                                  setSelectedReserva(reserva);
                                  setChecklistFotos({});
                                  setChecklistObservacoes('');
                                  setChecklistMode('descida');
                                  setChecklistOpen(true);
                                }}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer shadow-2xs"
                              >
                                Baixar Barco
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Coluna 2: No Píer */}
                <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-200/60 space-y-3 flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between px-1">
                    <span className="font-extrabold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span>No Píer</span>
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-extrabold rounded-full text-[10px]">
                      {kanbanNoPier.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {kanbanNoPier.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                        <p className="text-xs">{searchTerm ? 'Nenhum resultado' : 'Nenhuma embarcação no píer'}</p>
                      </div>
                    ) : (
                      kanbanNoPier.map((reserva: any) => {
                        const barco = getEmbarcacao(reserva.embarcacaoId);
                        const cliente = getCliente(reserva.clienteId);
                        return (
                          <div key={reserva.id} className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-xs hover:shadow-md transition-all space-y-2">
                            <div className="flex items-start justify-between">
                              <span className="font-extrabold text-sm text-slate-900">{barco?.nome || reserva.barcoNome || 'Embarcação'}</span>
                              <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                                {reserva.horaDescida}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Cliente: {cliente?.nome || reserva.clienteNome || 'Cliente'}</p>
                            <div className="flex items-center justify-between gap-1 text-[11px] pt-1 border-t border-slate-100">
                              <button
                                onClick={() => executeMarcarSaida(reserva)}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                              >
                                Saída / Navegar
                              </button>
                              <button
                                onClick={() => openFuelForChegada(reserva)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                              >
                                Abastecer / Chegada
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Coluna 3: Navegando */}
                <div className="bg-sky-50/50 rounded-2xl p-3 border border-sky-200/60 space-y-3 flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between px-1">
                    <span className="font-extrabold text-xs text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                      <span>Navegando</span>
                    </span>
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-extrabold rounded-full text-[10px]">
                      {kanbanNavegando.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {kanbanNavegando.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                        <p className="text-xs">{searchTerm ? 'Nenhum resultado' : 'Nenhuma embarcação navegando'}</p>
                      </div>
                    ) : (
                      kanbanNavegando.map((reserva: any) => {
                        const barco = getEmbarcacao(reserva.embarcacaoId);
                        const cliente = getCliente(reserva.clienteId);
                        return (
                          <div key={reserva.id} className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-xs hover:shadow-md transition-all space-y-2">
                            <div className="flex items-start justify-between">
                              <span className="font-extrabold text-sm text-slate-900">{barco?.nome || reserva.barcoNome || 'Embarcação'}</span>
                              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${reserva.horaSaida ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-400'}`}>
                                {reserva.horaSaida || '--:--'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Cliente: {cliente?.nome || reserva.clienteNome || 'Cliente'}</p>
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                              <span className="text-sky-700 font-bold">Em Navegação</span>
                              <button
                                onClick={() => openFuelForChegada(reserva)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                              >
                                Abastecer / Chegada
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Coluna 4: Retornaram */}
                <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-200/60 space-y-3 flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between px-1">
                    <span className="font-extrabold text-xs text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>Retornaram</span>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold rounded-full text-[10px]">
                      {kanbanRetornaram.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {kanbanRetornaram.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                        <p className="text-xs">{searchTerm ? 'Nenhum resultado' : 'Nenhuma embarcação retornada'}</p>
                      </div>
                    ) : (
                      kanbanRetornaram.map((reserva: any) => {
                        const barco = getEmbarcacao(reserva.embarcacaoId);
                        const cliente = getCliente(reserva.clienteId);
                        const litros = reserva.abastecimentoLitros || reserva.litrosAbastecidos;
                        return (
                          <div key={reserva.id} className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-xs hover:shadow-md transition-all space-y-2">
                            <div className="flex items-start justify-between">
                              <span className="font-extrabold text-sm text-slate-900">{barco?.nome || reserva.barcoNome || 'Embarcação'}</span>
                              <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                                {reserva.horaChegada || 'Chegou'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Cliente: {cliente?.nome || reserva.clienteNome || 'Cliente'}</p>
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                              <span className="text-emerald-700 font-bold">{litros ? `${litros}L Abastecido` : 'Retornado'}</span>
                              <button
                                onClick={() => {
                                  setSelectedReserva(reserva);
                                  setChecklistFotos({});
                                  setChecklistMode('subida');
                                  setChecklistOpen(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                              >
                                Subir Barco
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* VISÃO LISTA (Apenas exibida no modo 'lista') */}
            {viewMode === 'lista' && (
              <>
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
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100 mb-6">
                    {/* Table Header - Visible on Desktop/Tablet */}
                    <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 bg-slate-50/90 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 items-center">
                      <div className="col-span-4 lg:col-span-3">Embarcação & Cliente</div>
                      <div className="col-span-3 lg:col-span-3">Horários Previstos</div>
                      <div className="col-span-2 lg:col-span-3">Estágio & Horários Reais</div>
                      <div className="col-span-3 lg:col-span-3 text-right">Operações & Ações</div>
                    </div>

                    {/* List Rows */}
                    {reservasDoDia.map((reserva: any) => {
                      const boat = getEmbarcacao(reserva.embarcacaoId);
                      const client = getCliente(reserva.clienteId);
                      const isSaida = !!reserva.horaSaida;
                      const isChegada = !!reserva.horaChegada;
                      const isSubida = !!reserva.horaSubida;
                      const isConfirmado = reserva.status === 'confirmado' || reserva.statusMarina === 'confirmada';

                      return (
                        <div 
                          key={reserva.id} 
                          className="p-3 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:grid md:grid-cols-12 gap-3 items-start md:items-center relative group cursor-pointer"
                          onClick={() => {
                            setDetailsReserva(reserva);
                            setDetailsModalOpen(true);
                          }}
                        >
                          {/* Left accent bar */}
                          <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                            isSubida ? 'bg-emerald-500' : 
                            isChegada ? 'bg-teal-500' : 
                            isSaida ? 'bg-sky-500' : 
                            reserva.horaDescida ? 'bg-blue-500' : 
                            isConfirmado ? 'bg-emerald-500' :
                            'bg-amber-500'
                          }`} />

                          {/* Col 1: Embarcação & Cliente */}
                          <div className="md:col-span-4 lg:col-span-3 min-w-0 pl-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                                {boat?.nome || 'Embarcação'}
                              </span>
                              {boat?.numero && (
                                <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
                                  {boat.numero}
                                </span>
                              )}
                              {boat?.vaga && (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  Vaga {boat.vaga}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[200px]">{client?.nome || 'Cliente'}</span>
                            </div>
                          </div>

                          {/* Col 2: Horários Previstos */}
                          <div className="md:col-span-3 lg:col-span-3">
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg text-slate-700">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Saída:</span>
                                <span className={`font-mono font-bold ${reserva.previsaoSaida ? 'text-slate-700' : 'text-slate-400'}`}>{reserva.previsaoSaida || '--:--'}</span>
                              </div>
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg text-slate-700">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Chegada:</span>
                                <span className={`font-mono font-bold ${reserva.previsaoChegada ? 'text-slate-700' : 'text-slate-400'}`}>{reserva.previsaoChegada || '--:--'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Col 3: Estágio & Horários Reais */}
                          <div className="md:col-span-2 lg:col-span-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                  isSubida ? 'bg-emerald-100 text-emerald-800' :
                                  isChegada ? 'bg-teal-100 text-teal-800' :
                                  isSaida ? 'bg-sky-100 text-sky-800' :
                                  reserva.horaDescida ? 'bg-blue-100 text-blue-800' :
                                  reserva.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                                  isConfirmado ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    isSubida ? 'bg-emerald-500' :
                                    isChegada ? 'bg-teal-500' :
                                    isSaida ? 'bg-sky-500' :
                                    reserva.horaDescida ? 'bg-blue-500' :
                                    reserva.status === 'cancelado' ? 'bg-red-500' :
                                    isConfirmado ? 'bg-emerald-500' :
                                    'bg-amber-500'
                                  }`} />
                                  {isSubida ? 'Guardada' :
                                   isChegada ? 'Retornou' :
                                   isSaida ? 'Navegando' :
                                   reserva.horaDescida ? 'No Píer' :
                                   reserva.status === 'cancelado' ? 'Cancelado' :
                                   isConfirmado ? 'Confirmado' :
                                   'Agendado'}
                                </span>
                              </div>

                              {(reserva.horaDescida || reserva.horaSaida || reserva.horaChegada || reserva.horaSubida) && (
                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                                  {reserva.horaDescida && <span>Píer: <b>{reserva.horaDescida}</b></span>}
                                  {reserva.horaSaida && <span>• Mar: <b>{reserva.horaSaida}</b></span>}
                                  {reserva.horaChegada && <span>• Chegou: <b>{reserva.horaChegada}</b></span>}
                                  {reserva.horaSubida && <span>• Subiu: <b>{reserva.horaSubida}</b></span>}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Col 4: Operações & Ações */}
                          <div 
                            className="md:col-span-3 lg:col-span-3 w-full md:w-auto flex items-center justify-start md:justify-end gap-1.5 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Agendado / Não Desceu */}
                            {reserva.status !== 'cancelado' && !reserva.horaDescida && (
                              <>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (confirm("Confirmar descida rápida sem fotos?")) {
                                      executeRegistrarDescida([], reserva);
                                    }
                                  }}
                                  title="Descida Rápida (sem fotos)"
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Rápida</span>
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); openChecklistForDescida(reserva); }}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>Checklist Saída</span>
                                </button>
                              </>
                            )}

                            {/* No Píer */}
                            {reserva.status !== 'cancelado' && reserva.horaDescida && !reserva.horaSaida && (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); executeMarcarSaida(reserva); }}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  <span>Marcar Saída</span>
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); openFuelForChegada(reserva); }}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                >
                                  <Droplets className="w-3.5 h-3.5" />
                                  <span>Abastecer</span>
                                </button>
                              </>
                            )}

                            {/* Navegando */}
                            {reserva.status !== 'cancelado' && reserva.horaSaida && !reserva.horaChegada && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); openFuelForChegada(reserva); }}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              >
                                <Droplets className="w-3.5 h-3.5" />
                                <span>Registrar Chegada</span>
                              </button>
                            )}

                            {/* Retornaram */}
                            {reserva.status !== 'cancelado' && (reserva.horaChegada || reserva.statusMarina === 'chegada') && !reserva.horaSubida && (
                              <>
                                {Number(reserva.abastecimentoLitros || reserva.litrosAbastecidos) > 0 && (
                                  <span className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-lg text-xs font-bold flex items-center gap-1">
                                    <Droplets className="w-3 h-3 text-amber-600" />
                                    <span>{reserva.abastecimentoLitros || reserva.litrosAbastecidos}L</span>
                                  </span>
                                )}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); openChecklistForSubida(reserva); }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>Checklist Subida</span>
                                </button>
                              </>
                            )}

                            {/* Subiu / Guardada */}
                            {reserva.status !== 'cancelado' && reserva.horaSubida && (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Guardada</span>
                              </span>
                            )}

                            {/* Details Modal Trigger Arrow */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailsReserva(reserva);
                                setDetailsModalOpen(true);
                              }}
                              title="Ver Detalhes"
                              className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer ml-1"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
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

        {activeTab === 'embarcacoes' && (
          <div className="max-w-7xl mx-auto">
            <BoatPage showWhatsAppMapping={false} />
          </div>
        )}

        {activeTab === 'agendamentos' && (
          <div className="max-w-7xl mx-auto">
            <FinanceSchedulesPage />
          </div>
        )}

        {activeTab === 'folgas' && (
          <div className="max-w-7xl mx-auto">
            <ControleFolgasPage />
          </div>
        )}

        {activeTab === 'configuracoes' && (
          <div className="max-w-7xl mx-auto">
            <SettingsPage operadorNome={operadorNome} showToast={showToast} />
          </div>
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

            <div className="px-5 pb-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Detalhes / Observações</label>
              <textarea
                value={checklistObservacoes}
                onChange={(e) => setChecklistObservacoes(e.target.value)}
                placeholder="Alguma avaria, item faltando, ou observação importante?"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none min-h-[80px]"
              />
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
                        <span className="block font-bold text-sm text-amber-900">Enviar para a Administradora</span>
                        <span className="block text-xs text-amber-700 font-medium mt-0.5">R$ 13,00/L (Faturado Pós-pago)</span>
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
                          <img key={`d_${i}`} src={url} alt="Descida" className="h-20 w-20 object-cover rounded-lg border border-slate-200 cursor-pointer transition-transform hover:scale-105" onClick={() => setLightbox({ currentIndex: i, urls: parseFotos(detailsReserva.fotosChecklistDescida || detailsReserva.fotosChecklistSaida), title: 'Checklist de Descida' })}/>
                        ))}
                      </div>
                    </div>
                  )}
                  {parseFotos(detailsReserva.fotosChecklistChegada).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Checklist de Chegada</p>
                      <div className="flex gap-2 overflow-x-auto subtle-scrollbar pb-2">
                        {parseFotos(detailsReserva.fotosChecklistChegada).map((url: string, i: number) => (
                          <img key={`c_${i}`} src={url} alt="Chegada" className="h-20 w-20 object-cover rounded-lg border border-slate-200 cursor-pointer transition-transform hover:scale-105" onClick={() => setLightbox({ currentIndex: i, urls: parseFotos(detailsReserva.fotosChecklistChegada), title: 'Checklist de Chegada' })}/>
                        ))}
                      </div>
                    </div>
                  )}
                  {parseFotos(detailsReserva.fotosChecklistSubida).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">Checklist de Subida</p>
                      <div className="flex gap-2 overflow-x-auto subtle-scrollbar pb-2">
                        {parseFotos(detailsReserva.fotosChecklistSubida).map((url: string, i: number) => (
                          <img key={`s_${i}`} src={url} alt="Subida" className="h-20 w-20 object-cover rounded-lg border border-slate-200 cursor-pointer transition-transform hover:scale-105" onClick={() => setLightbox({ currentIndex: i, urls: parseFotos(detailsReserva.fotosChecklistSubida), title: 'Checklist de Subida' })}/>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Equipamentos & Segurança da Lancha (Apenas para Lanchas) */}
              {(() => {
                const boat = getEmbarcacao(detailsReserva.embarcacaoId);
                const isJet = boat 
                  ? (boat.tipo === 'jet' || (boat.nome || '').toLowerCase().includes('jet'))
                  : ((detailsReserva as any)?.embarcacaoTipo === 'jet' || ((detailsReserva as any)?.barcoNome || (detailsReserva as any)?.embarcacaoNome || '').toLowerCase().includes('jet'));

                if (isJet) {
                  return detailsReserva.checklistObservacoes ? (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
                        <span className="font-bold text-slate-900 block text-[10px] uppercase">Observações do Marinheiro:</span>
                        <p>{detailsReserva.checklistObservacoes}</p>
                      </div>
                    </div>
                  ) : null;
                }

                return (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-600" />
                      <span>Segurança & Equipamentos da Lancha</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        detailsReserva.checklistEquipamentos?.som !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <span className="flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5" /> Som</span>
                        <span>{detailsReserva.checklistEquipamentos?.som !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        detailsReserva.checklistEquipamentos?.boias !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <span className="flex items-center gap-1.5"><LifeBuoy className="w-3.5 h-3.5" /> Bóias</span>
                        <span>{detailsReserva.checklistEquipamentos?.boias !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        detailsReserva.checklistEquipamentos?.coletes !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Coletes</span>
                        <span>{detailsReserva.checklistEquipamentos?.coletes !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        detailsReserva.checklistEquipamentos?.extintor !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> Extintor</span>
                        <span>{detailsReserva.checklistEquipamentos?.extintor !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                      </div>
                    </div>
                    {detailsReserva.checklistObservacoes && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium mt-1">
                        <span className="font-bold text-slate-900 block text-[10px] uppercase">Observações do Marinheiro:</span>
                        <p>{detailsReserva.checklistObservacoes}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
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

      {/* Lightbox Modal */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 flex items-center justify-center animate-fade-in backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
            <button onClick={() => setLightbox(null)} className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer backdrop-blur-md">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setLightbox(prev => prev ? { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) } : null) }}
            className={`absolute left-4 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer z-10 backdrop-blur-md ${lightbox.currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={lightbox.currentIndex === 0}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <div className="w-full max-w-5xl h-full max-h-[85vh] flex flex-col items-center justify-center p-4" onClick={e => e.stopPropagation()}>
             <div className="flex-1 w-full relative min-h-[300px] bg-slate-900/50 rounded-lg overflow-hidden border border-white/10">
               <ZoomableImage 
                 src={lightbox.urls[lightbox.currentIndex]} 
                 alt="Zoomed" 
                 className="max-w-full max-h-[70vh] object-contain" 
               />
             </div>
             <div className="mt-6 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 w-full max-w-2xl shadow-xl flex items-center justify-between text-slate-200">
               <div>
                 <h4 className="font-bold text-white uppercase tracking-wider text-sm">{lightbox.title}</h4>
               </div>
               <div className="text-xs font-bold text-slate-500 bg-slate-800 px-3 py-1.5 rounded-full">
                 {lightbox.currentIndex + 1} / {lightbox.urls.length}
               </div>
             </div>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); setLightbox(prev => prev ? { ...prev, currentIndex: Math.min(prev.urls.length - 1, prev.currentIndex + 1) } : null) }}
            className={`absolute right-4 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer z-10 backdrop-blur-md ${lightbox.currentIndex === lightbox.urls.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={lightbox.currentIndex === lightbox.urls.length - 1}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}

    </div>
  );
}
