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
  ChevronRight,
  Shield,
  Volume2,
  LifeBuoy,
  Flame,
  RotateCcw,
  CreditCard,
  QrCode,
  Banknote,
  Building2,
  FileCheck,
  Paperclip,
  Eye,
  Plus,
  PlusCircle,
  Trash2
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
  const [paymentType, setPaymentType] = useState<'pix' | 'credit' | 'debit' | 'dinheiro' | 'admin'>('pix');
  const [fuelComprovanteUrl, setFuelComprovanteUrl] = useState<string | null>(null);
  const [statusCobranca, setStatusCobranca] = useState<'cobrado' | 'pendente'>('pendente');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistMode, setChecklistMode] = useState<'descida' | 'chegada' | 'subida'>('descida');
  // Step Wizard State
  const [currentStep, setCurrentStep] = useState(0);
  const [checklistEquipamentos, setChecklistEquipamentos] = useState({
    som: true,
    boias: true,
    coletes: true,
    extintor: true
  });
  const [checklistObservacoes, setChecklistObservacoes] = useState('');
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
    setCurrentStep(0);
    setChecklistEquipamentos({ som: true, boias: true, coletes: true, extintor: true });
    setChecklistObservacoes('');
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
    setCurrentStep(0);
    setChecklistEquipamentos({ som: true, boias: true, coletes: true, extintor: true });
    setChecklistObservacoes('');
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingAngle(angleId);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
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
        uploadedUrls.push(imgUrl);
      }

      setChecklistFotos(prev => ({ 
        ...prev, 
        [angleId]: [...(prev[angleId] || []), ...uploadedUrls] 
      }));
      showToast(`${uploadedUrls.length} foto(s) adicionada(s)!`, 'success');
    } catch (err) {
      showToast('Erro ao fazer upload da(s) foto(s).', 'warning');
    } finally {
      setUploadingAngle(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = (angleId: string, index: number) => {
    setChecklistFotos(prev => ({
      ...prev,
      [angleId]: (prev[angleId] || []).filter((_, i) => i !== index)
    }));
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
    const boat = getEmbarcacao(alvo.embarcacaoId) || selectedBoatForAvulso;
    const isJet = boat ? (boat.tipo === 'jet' || (boat.nome || '').toLowerCase().includes('jet')) : (alvo.embarcacaoTipo === 'jet');

    const updatedReserva = { 
      ...alvo, 
      horaDescida: horaAtual,
      fotosChecklistDescida: fotosChecklistDescida.length > 0 ? fotosChecklistDescida : alvo.fotosChecklistDescida,
      checklistEquipamentos: isJet ? undefined : checklistEquipamentos,
      checklistObservacoes: checklistObservacoes || alvo.checklistObservacoes || '',
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

  const handleOpenFuelModal = (reserva: any) => {
    setSelectedReserva(reserva);
    const existingLiters = reserva.abastecimentoLitros ?? reserva.litrosAbastecidos ?? '';
    setLiters(existingLiters ? existingLiters.toString() : '');
    setPaymentType(reserva.abastecimentoFormaPagamento || 'pix');
    setFuelComprovanteUrl(reserva.abastecimentoComprovanteUrl || null);
    setStatusCobranca(reserva.abastecimentoStatusCobranca === 'cobrado' ? 'cobrado' : 'pendente');
    setFuelModalOpen(true);
  };

  const handleUploadFuelComprovante = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setFuelComprovanteUrl(imgUrl);
        setStatusCobranca('cobrado');
        showToast('Comprovante anexado!', 'success');
      }
    } catch (err) {
      showToast('Erro ao enviar comprovante.', 'warning');
    } finally {
      setIsUploadingComprovante(false);
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
    
    let precoPorLitro = 9.0;
    if (paymentType === 'credit') precoPorLitro = 10.0;
    if (paymentType === 'admin') precoPorLitro = 13.0;

    const valorTotalCalc = litersNum * precoPorLitro;
    const finalStatusCobranca = litersNum > 0 ? statusCobranca : 'sem_abastecimento';

    const updatedReserva = { 
      ...selectedReserva, 
      horaChegada: selectedReserva.horaChegada || horaAtual,
      statusMarina: selectedReserva.statusMarina === 'guardada' ? 'guardada' : 'chegada',
      statusOperacional: selectedReserva.statusOperacional === 'guardada' ? 'guardada' : 'retornou',
      operadorChegada: selectedReserva.operadorChegada || currentOperator,
      abastecimentoOperador: currentOperator,
      litrosAbastecidos: litersNum > 0 ? litersNum.toString() : '0',
      abastecimentoSolucao: true,
      abastecimentoLitros: litersNum,
      abastecimentoFormaPagamento: paymentType,
      abastecimentoValorTotal: valorTotalCalc,
      abastecimentoStatusCobranca: finalStatusCobranca,
      abastecimentoComprovanteUrl: fuelComprovanteUrl || selectedReserva.abastecimentoComprovanteUrl || null,
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
        
        // Consumir estoque se ainda não foi marcado abastecimento anterior
        if (!selectedReserva.abastecimentoLitros || Number(selectedReserva.abastecimentoLitros) === 0) {
          consumeFuelForEmbarcacao(litersNum, boatName, currentOperator);
        }

        // Criar transação financeira caso esteja cobrado
        if (finalStatusCobranca === 'cobrado') {
          const paymentLabels: Record<string, string> = {
            pix: 'PIX',
            credit: 'Cartão de Crédito',
            debit: 'Cartão de Débito',
            dinheiro: 'Dinheiro',
            admin: 'Faturado Administradora'
          };
          const labelMetodo = paymentLabels[paymentType] || paymentType;

          const transacao = {
            id: `trans_fuel_${Date.now()}`,
            tipo: 'receita',
            categoria: 'Abastecimento Marina',
            valor: valorTotalCalc,
            dataVencimento: new Date().toISOString().split('T')[0],
            dataPagamento: new Date().toISOString().split('T')[0],
            status: 'pago',
            metodoPagamento: paymentType,
            descricao: `Abastecimento Marina (${labelMetodo}): ${litersNum}L a R$${precoPorLitro.toFixed(2)}/L - ${boatName}`,
            clienteId: selectedReserva.clienteId,
            embarcacaoId: selectedReserva.embarcacaoId,
            operador: currentOperator,
            comprovante: fuelComprovanteUrl || null,
            comprovanteUrl: fuelComprovanteUrl || null,
            createdAt: new Date().toISOString()
          };

          await fetch('/api/financeiro/transacoes/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ action: 'upsert', data: transacao })
          }).catch(err => console.error('Erro ao salvar transação financeira:', err));

          setData((prev: any) => ({
            ...prev,
            transacoes: [transacao, ...(prev.transacoes || []).filter((t: any) => t.id !== transacao.id)],
            reservations: prev.reservations.map((r: any) => r.id === updatedReserva.id ? updatedReserva : r)
          }));
        } else {
          setData((prev: any) => ({
            ...prev,
            reservations: prev.reservations.map((r: any) => r.id === updatedReserva.id ? updatedReserva : r)
          }));
        }
      } else {
        setData((prev: any) => ({
          ...prev,
          reservations: prev.reservations.map((r: any) => r.id === updatedReserva.id ? updatedReserva : r)
        }));
      }
      
      await logAction(currentOperator, 'CHEGADA_ABASTECIMENTO', `Registrou ${finalStatusCobranca === 'cobrado' ? 'cobrança' : 'abastecimento'} de ${litersNum}L (${paymentType})`);
      setFuelModalOpen(false);
      showToast('Abastecimento e cobrança salvos com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao salvar abastecimento.', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeRegistrarSubida = async (fotosChecklistSubida: string[], reservaTarget?: any) => {
    const alvo = reservaTarget || selectedReserva;
    if (!alvo) return;
    setIsSubmitting(true);
    
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const boat = getEmbarcacao(alvo.embarcacaoId) || selectedBoatForAvulso;
    const isJet = boat ? (boat.tipo === 'jet' || (boat.nome || '').toLowerCase().includes('jet')) : (alvo.embarcacaoTipo === 'jet');

    const updatedReserva = { 
      ...alvo, 
      horaSubida: horaAtual,
      fotosChecklistSubida: fotosChecklistSubida.length > 0 ? fotosChecklistSubida : alvo.fotosChecklistSubida,
      checklistEquipamentos: isJet ? undefined : checklistEquipamentos,
      checklistObservacoes: checklistObservacoes || alvo.checklistObservacoes || '',
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

  const totalDayReservations = (data?.reservations?.filter((r: any) => (r.data || r.date) === selectedDate) || [])
    .sort((a: any, b: any) => {
      const timeA = getSortTime(a);
      const timeB = getSortTime(b);
      const timeCompare = timeA.localeCompare(timeB);
      if (timeCompare !== 0) return timeCompare;

      const boatA = getEmbarcacao(a.embarcacaoId);
      const boatB = getEmbarcacao(b.embarcacaoId);
      const nameA = (boatA?.nome || a.barcoNome || '').toString();
      const nameB = (boatB?.nome || b.barcoNome || '').toString();
      return nameA.localeCompare(nameB, 'pt-BR', { numeric: true });
    });

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
      const timeA = getSortTime(a);
      const timeB = getSortTime(b);
      const timeCompare = timeA.localeCompare(timeB);
      if (timeCompare !== 0) return timeCompare;

      const boatA = getEmbarcacao(a.embarcacaoId);
      const boatB = getEmbarcacao(b.embarcacaoId);
      const nameA = (boatA?.nome || a.barcoNome || '').toString();
      const nameB = (boatB?.nome || b.barcoNome || '').toString();
      return nameA.localeCompare(nameB, 'pt-BR', { numeric: true });
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
                    
                    const isCobrado = reserva.abastecimentoStatusCobranca === 'cobrado';
                    const pm = reserva.abastecimentoFormaPagamento || 'pix';
                    const unitPrice = pm === 'credit' ? 10 : pm === 'admin' ? 13 : 9;
                    const valor = reserva.abastecimentoValorTotal || (litros * unitPrice);

                    const paymentLabels: Record<string, string> = {
                      pix: 'PIX',
                      credit: 'Crédito',
                      debit: 'Débito',
                      dinheiro: 'Dinheiro',
                      admin: 'Faturado Admin'
                    };

                    return (
                      <div 
                        key={reserva.id} 
                        className={`bg-white border rounded-2xl p-3.5 shadow-xs transition-all ${
                          isCobrado ? 'border-l-4 border-l-blue-600 border-slate-200' : 'border-l-4 border-l-slate-400 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isCobrado 
                                ? 'bg-blue-50 border border-blue-200 text-blue-600' 
                                : 'bg-slate-100 border border-slate-200 text-slate-500'
                            }`}>
                              {isCobrado ? <Check className="w-5 h-5 stroke-[3]" /> : <Clock className="w-4 h-4 stroke-[2.5]" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-slate-900 text-sm leading-tight uppercase">
                                  {boat?.nome || reserva.barcoNome || 'M99'}
                                </h4>
                                <span className="bg-slate-900 text-white font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                                  #{boatNumber}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  isCobrado
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  {isCobrado ? 'COBRADO' : 'PENDENTE'}
                                </span>
                              </div>

                              <p className="text-xs font-bold text-blue-600 uppercase mt-0.5">
                                {client?.nome || reserva.clienteNome || 'Cliente'}
                              </p>

                              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 flex-wrap">
                                <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg font-bold text-slate-700">
                                  💳 {paymentLabels[pm] || pm}
                                </span>
                                
                                {reserva.abastecimentoComprovanteUrl && (
                                  <a
                                    href={reserva.abastecimentoComprovanteUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-lg font-bold hover:underline flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <FileCheck className="w-3 h-3" />
                                    <span>Comprovante</span>
                                  </a>
                                )}

                                <span className="flex items-center gap-1">
                                  <UserIcon className="w-3 h-3 text-slate-400" />
                                  <span>Por: <strong>{reserva.abastecimentoOperador || reserva.operadorChegada || 'Marinheiro'}</strong></span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-blue-600 font-mono block">
                              {litros} L
                            </span>
                            <span className="text-[11px] font-bold text-slate-700 font-mono block">
                              R$ {valor.toFixed(2).replace('.', ',')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenFuelModal(reserva)}
                              className={`mt-2 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                                isCobrado 
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' 
                                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                              }`}
                            >
                              <Droplets className="w-3 h-3" />
                              <span>{isCobrado ? 'Editar' : 'Cobrar'}</span>
                            </button>
                          </div>
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

              {/* Equipamentos & Segurança da Lancha (Apenas para Lanchas) */}
              {(() => {
                const viewBoat = viewChecklistReserva ? getEmbarcacao(viewChecklistReserva.embarcacaoId) : null;
                const viewIsJet = viewBoat 
                  ? (viewBoat.tipo === 'jet' || (viewBoat.nome || '').toLowerCase().includes('jet'))
                  : (viewChecklistReserva?.embarcacaoTipo === 'jet' || (viewChecklistReserva?.barcoNome || '').toLowerCase().includes('jet'));

                if (viewIsJet) {
                  return viewChecklistReserva.checklistObservacoes ? (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 font-medium">
                        <span className="font-bold text-slate-900 block text-[10px] uppercase">Observações do Marinheiro:</span>
                        <p className="mt-0.5">{viewChecklistReserva.checklistObservacoes}</p>
                      </div>
                    </div>
                  ) : null;
                }

                return (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-600" />
                      <span>Segurança & Equipamentos da Lancha</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        viewChecklistReserva.checklistEquipamentos?.som !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <span className="flex items-center gap-1"><Volume2 className="w-3.5 h-3.5" /> Som</span>
                        <span>{viewChecklistReserva.checklistEquipamentos?.som !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        viewChecklistReserva.checklistEquipamentos?.boias !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <span className="flex items-center gap-1"><LifeBuoy className="w-3.5 h-3.5" /> Bóias</span>
                        <span>{viewChecklistReserva.checklistEquipamentos?.boias !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        viewChecklistReserva.checklistEquipamentos?.coletes !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Coletes</span>
                        <span>{viewChecklistReserva.checklistEquipamentos?.coletes !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        viewChecklistReserva.checklistEquipamentos?.extintor !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}>
                        <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> Extintor</span>
                        <span>{viewChecklistReserva.checklistEquipamentos?.extintor !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                      </div>
                    </div>
                    {viewChecklistReserva.checklistObservacoes && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 font-medium mt-1">
                        <span className="font-bold text-slate-900 block text-[10px] uppercase">Observações do Marinheiro:</span>
                        <p className="mt-0.5">{viewChecklistReserva.checklistObservacoes}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
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

      {/* Checklist Sequential Wizard Modal */}
      {checklistOpen && (() => {
        const activeChecklistBoat = selectedReserva ? getEmbarcacao(selectedReserva.embarcacaoId) : selectedBoatForAvulso;
        const activeIsJet = activeChecklistBoat 
          ? (activeChecklistBoat.tipo === 'jet' || (activeChecklistBoat.nome || '').toLowerCase().includes('jet'))
          : (selectedReserva ? (selectedReserva.embarcacaoTipo === 'jet' || (selectedReserva.barcoNome || '').toLowerCase().includes('jet')) : false);

        const totalSteps = activeIsJet ? 7 : 8;
        const maxStepIndex = totalSteps - 1;
        const isReviewStep = currentStep === maxStepIndex;
        const isEquipmentStep = !activeIsJet && currentStep === 6;

        const stepPills = activeIsJet ? [
          { id: 'proa', label: 'Proa' },
          { id: 'popa', label: 'Popa' },
          { id: 'bombordo', label: 'L. Esquerda' },
          { id: 'estibordo', label: 'L. Direita' },
          { id: 'painel', label: 'Painel' },
          { id: 'casco', label: 'Casco' },
          { id: 'revisao', label: 'Revisão' }
        ] : [
          { id: 'proa', label: 'Proa' },
          { id: 'popa', label: 'Popa' },
          { id: 'bombordo', label: 'L. Esquerda' },
          { id: 'estibordo', label: 'L. Direita' },
          { id: 'painel', label: 'Painel' },
          { id: 'casco', label: 'Casco' },
          { id: 'equipamentos', label: 'Equipamentos' },
          { id: 'revisao', label: 'Revisão' }
        ];

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
              
              {/* Modal Header & Step Counter */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                      Checklist {checklistMode.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Passo {currentStep + 1} de {totalSteps}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 truncate">
                    {selectedReserva?.barcoNome || activeChecklistBoat?.nome || 'Embarcação'}
                  </h3>
                </div>

                <button 
                  onClick={() => setChecklistOpen(false)} 
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Bar & Navigation Pills */}
              <div className="bg-slate-100/70 border-b border-slate-200/60 px-4 py-2 space-y-2">
                {/* Progress Line */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                  />
                </div>

                {/* Scrollable Step Pills Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 subtle-scrollbar">
                  {stepPills.map((stepItem, idx) => {
                    const isDone = idx < 6 
                      ? (checklistFotos[stepItem.id] && checklistFotos[stepItem.id].length > 0)
                      : true;
                    const isActive = currentStep === idx;

                    return (
                      <button
                        key={stepItem.id}
                        type="button"
                        onClick={() => setCurrentStep(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                          isActive 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : isDone && idx < 6
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{idx + 1}. {stepItem.label}</span>
                        {isDone && idx < 6 && <Check className="w-3 h-3 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 subtle-scrollbar space-y-5">
                
                {/* STEPS 0..5: Sequential Photo Capture Steps */}
                {currentStep < 6 && (() => {
                  const angle = CHECKLIST_ANGLES[currentStep];
                  const Icon = angle.icon;
                  const fotos = checklistFotos[angle.id] || [];
                  const hasPhoto = fotos.length > 0;
                  const isUploading = uploadingAngle === angle.id;

                  return (
                    <div className="space-y-4">
                      {/* Step Title Header */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3">
                        <div className="p-3 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-600 block">
                            Passo {currentStep + 1} de 6 • Foto de Ângulo
                          </span>
                          <h4 className="font-extrabold text-slate-900 text-sm">Tire a foto: {angle.label}</h4>
                          <p className="text-xs text-slate-500 font-medium">Foque no estado de conservação no píer.</p>
                        </div>
                      </div>

                      {/* Photo Capture or Preview */}
                      {hasPhoto ? (
                        <div className="space-y-3">
                          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 aspect-video flex items-center justify-center">
                            <img 
                              src={fotos[fotos.length - 1]} 
                              className="w-full h-full object-cover" 
                              alt={angle.label} 
                            />
                            <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Foto Capturada & OK</span>
                            </div>
                          </div>

                          {/* Additional Photo Strip if >1 photo */}
                          {fotos.length > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 subtle-scrollbar">
                              {fotos.map((url, i) => (
                                <img key={i} src={url} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" alt="Foto" />
                              ))}
                            </div>
                          )}

                          {/* Retake Button */}
                          <div className="relative">
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment"
                              onChange={(e) => handleUploadPhoto(e, angle.id)}
                              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                              disabled={isUploading}
                            />
                            <button
                              type="button"
                              disabled={isUploading}
                              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                              {isUploading ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin" /> : <RotateCcw className="w-4 h-4 text-slate-500" />}
                              <span>Tirar Foto Novamente / Adicionar Outra</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Camera Trigger Card */
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            onChange={(e) => handleUploadPhoto(e, angle.id)}
                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                            disabled={isUploading}
                          />
                          <div className="border-2 border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer min-h-[220px]">
                            {isUploading ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                <span className="text-xs font-bold text-blue-900">Enviando foto...</span>
                              </div>
                            ) : (
                              <>
                                <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all">
                                  <Camera className="w-7 h-7" />
                                </div>
                                <div>
                                  <span className="font-extrabold text-sm text-blue-950 block">Tocar para Abrir Câmera</span>
                                  <span className="text-xs text-blue-700 font-medium block mt-0.5">Tire a foto de {angle.label}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* STEP Equipment Inspection (Apenas para Lanchas) */}
                {isEquipmentStep && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3">
                      <div className="p-3 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-700 block">
                          Passo 7 de 8 • Inspeção Obrigatória
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm">Equipamentos & Segurança da Lancha</h4>
                        <p className="text-xs text-slate-600 font-medium">Verifique os 4 itens essenciais a bordo antes de liberar:</p>
                      </div>
                    </div>

                    {/* 4 Check Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Item 1: Som */}
                      <div 
                        onClick={() => setChecklistEquipamentos(prev => ({ ...prev, som: !prev.som }))}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                          checklistEquipamentos.som ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${checklistEquipamentos.som ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          <Volume2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">Equipamento de Som</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${checklistEquipamentos.som ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'}`}>
                              {checklistEquipamentos.som ? 'OK / Funcional' : 'Avaria / Ausente'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">Som Bluetooth, alto-falantes e comandos operacionais.</span>
                        </div>
                      </div>

                      {/* Item 2: Bóias */}
                      <div 
                        onClick={() => setChecklistEquipamentos(prev => ({ ...prev, boias: !prev.boias }))}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                          checklistEquipamentos.boias ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${checklistEquipamentos.boias ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          <LifeBuoy className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">Bóias de Salvatagem</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${checklistEquipamentos.boias ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'}`}>
                              {checklistEquipamentos.boias ? 'OK / Presentes' : 'Avaria / Ausente'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">Bóias circulares no suporte com retida de salvatagem.</span>
                        </div>
                      </div>

                      {/* Item 3: Coletes */}
                      <div 
                        onClick={() => setChecklistEquipamentos(prev => ({ ...prev, coletes: !prev.coletes }))}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                          checklistEquipamentos.coletes ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${checklistEquipamentos.coletes ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          <Shield className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">Coletes Salva-vidas</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${checklistEquipamentos.coletes ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'}`}>
                              {checklistEquipamentos.coletes ? 'OK / Completo' : 'Incompleto'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">Coletes em número compatível com a lotação da lancha.</span>
                        </div>
                      </div>

                      {/* Item 4: Extintor */}
                      <div 
                        onClick={() => setChecklistEquipamentos(prev => ({ ...prev, extintor: !prev.extintor }))}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                          checklistEquipamentos.extintor ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${checklistEquipamentos.extintor ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          <Flame className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">Extintor de Incêndio</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${checklistEquipamentos.extintor ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'}`}>
                              {checklistEquipamentos.extintor ? 'OK / Na Validade' : 'Vencido / Baixo'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">Manômetro na faixa verde e lacre de segurança intacto.</span>
                        </div>
                      </div>
                    </div>

                    {/* Observações */}
                    <div className="space-y-1 pt-2">
                      <label className="text-xs font-bold text-slate-700 block">Observações do Marinheiro / Avarias (Opcional)</label>
                      <textarea
                        rows={2}
                        value={checklistObservacoes}
                        onChange={(e) => setChecklistObservacoes(e.target.value)}
                        placeholder="Descreva eventuais avarias ou detalhes observados..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* STEP Final Review & Save */}
                {isReviewStep && (
                  <div className="space-y-5">
                    <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex items-center gap-3">
                      <div className="p-3 bg-blue-600 text-white rounded-xl shrink-0 shadow-md">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-700 block">
                          Passo {totalSteps} de {totalSteps} • Resumo Final
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm">Revisão do Checklist de {checklistMode.toUpperCase()}</h4>
                        <p className="text-xs text-slate-600 font-medium">Confira os dados abaixo antes de concluir:</p>
                      </div>
                    </div>

                    {/* Photos Summary & Extra Photos */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 block">📸 Ângulos Fotográficos:</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {CHECKLIST_ANGLES.map((angle) => {
                          const fotos = checklistFotos[angle.id] || [];
                          const hasPhoto = fotos.length > 0;
                          return (
                            <div key={angle.id} className={`p-2 rounded-xl border flex items-center gap-2 ${hasPhoto ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                              {hasPhoto ? (
                                <img src={fotos[0]} className="w-9 h-9 rounded-lg object-cover border border-emerald-300 shrink-0" alt="Foto" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                  <Camera className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-slate-900 truncate block">{angle.label.split(' ')[0]}</span>
                                <span className={`text-[9px] font-semibold block ${hasPhoto ? 'text-emerald-700' : 'text-slate-400'}`}>
                                  {hasPhoto ? `✓ OK (${fotos.length})` : 'Sem foto'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Extra Photos Container */}
                      <div className="pt-2 border-t border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <PlusCircle className="w-4 h-4 text-blue-600" />
                            <span>Fotografias Adicionais / Extras:</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {(checklistFotos['extras'] || []).length} foto(s) extra(s)
                          </span>
                        </div>

                        {/* Gallery of extra photos */}
                        {(checklistFotos['extras'] || []).length > 0 && (
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                            {(checklistFotos['extras'] || []).map((url, idx) => (
                              <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-300 shadow-xs">
                                <img src={url} alt={`Foto extra ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto('extras', idx)}
                                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity shadow-md cursor-pointer"
                                  title="Remover foto"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Button to add as many extra photos as desired */}
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple
                            onChange={(e) => handleUploadPhoto(e, 'extras')}
                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                            disabled={uploadingAngle !== null}
                          />
                          <button
                            type="button"
                            disabled={uploadingAngle !== null}
                            className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200/90 text-blue-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                          >
                            {uploadingAngle === 'extras' ? (
                              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4 text-blue-600" />
                            )}
                            <span>+ Adicionar Mais Fotografias (Sem Limite)</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Equipment Summary (Apenas para Lanchas) */}
                    {!activeIsJet && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-800 block">🛡️ Equipamentos de Segurança Verificados:</span>
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${checklistEquipamentos.som ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                            <span>🔊 Som</span>
                            <span>{checklistEquipamentos.som ? '✓ OK' : '⚠️ Avaria'}</span>
                          </div>
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${checklistEquipamentos.boias ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                            <span>🛟 Bóias</span>
                            <span>{checklistEquipamentos.boias ? '✓ OK' : '⚠️ Avaria'}</span>
                          </div>
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${checklistEquipamentos.coletes ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                            <span>🦺 Coletes</span>
                            <span>{checklistEquipamentos.coletes ? '✓ OK' : '⚠️ Avaria'}</span>
                          </div>
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${checklistEquipamentos.extintor ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                            <span>🧯 Extintor</span>
                            <span>{checklistEquipamentos.extintor ? '✓ OK' : '⚠️ Avaria'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Observações do Marinheiro para Jet Ski */}
                    {activeIsJet && (
                      <div className="space-y-1 pt-1">
                        <label className="text-xs font-bold text-slate-700 block">Observações do Marinheiro / Avarias (Opcional)</label>
                        <textarea
                          rows={2}
                          value={checklistObservacoes}
                          onChange={(e) => setChecklistObservacoes(e.target.value)}
                          placeholder="Descreva eventuais avarias ou detalhes observados..."
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Final Submit Button */}
                    <button
                      type="button"
                      disabled={isSubmitting || uploadingAngle !== null}
                      onClick={() => {
                        const allUploaded = Object.values(checklistFotos).flat();
                        if (checklistMode === 'descida') executeRegistrarDescida(allUploaded);
                        else if (checklistMode === 'subida') executeRegistrarSubida(allUploaded);
                      }}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer disabled:opacity-50 mt-4"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      <span>Finalizar e Salvar Checklist</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Footer Step Controls */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                {currentStep < maxStepIndex ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => Math.min(maxStepIndex, prev + 1))}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    <span>Próximo Passo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : null}
              </div>

            </div>
          </div>
        );
      })()}

      {/* Fuel Modal */}
      {fuelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl my-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  <span>Cobrança de Combustível</span>
                </h3>
                {selectedReserva && (
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {selectedReserva.barcoNome || getEmbarcacao(selectedReserva.embarcacaoId)?.nome} • {selectedReserva.clienteNome || getCliente(selectedReserva.clienteId)?.nome}
                  </p>
                )}
              </div>
              <button onClick={() => setFuelModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmFuelAndRegisterArrival} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Quantidade em Litros */}
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

              {Number(liters) > 0 && (
                <>
                  {/* Status da Cobrança / Alternador de Modo */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 block">Status do Pagamento</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setStatusCobranca('pendente')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          statusCobranca === 'pendente'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pendente</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusCobranca('cobrado')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          statusCobranca === 'cobrado'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-blue-600'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cobrar Agora</span>
                      </button>
                    </div>
                  </div>

                  {/* MODO PENDENTE: Exibe apenas resumo simples sem formas de pagamento/comprovante */}
                  {statusCobranca === 'pendente' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Cobrança será mantida <strong>pendente</strong>.</span>
                      </div>
                      <span className="font-bold font-mono text-slate-900 shrink-0">
                        R$ {(Number(liters) * 9).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )}

                  {/* MODO COBRAR AGORA: Exibe formas de pagamento, total e anexo de comprovante */}
                  {statusCobranca === 'cobrado' && (
                    <>
                      {/* Forma de Pagamento */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-700 block">Forma de Pagamento *</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'pix', label: 'PIX', icon: QrCode, price: 'R$ 9,00/L' },
                            { id: 'credit', label: 'Crédito', icon: CreditCard, price: 'R$ 10,00/L' },
                            { id: 'debit', label: 'Débito', icon: CreditCard, price: 'R$ 9,00/L' },
                            { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, price: 'R$ 9,00/L' },
                            { id: 'admin', label: 'Administradora', icon: Building2, price: 'R$ 13,00/L' },
                          ].map((item) => {
                            const IconComponent = item.icon;
                            const isSelected = paymentType === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setPaymentType(item.id as any)}
                                className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-900 font-bold'
                                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 font-medium'
                                }`}
                              >
                                <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs block truncate">{item.label}</span>
                                  <span className="text-[10px] text-slate-500 font-normal block">{item.price}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Resumo do Valor Total */}
                      <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total a Cobrar</span>
                          <span className="text-xs text-blue-300 font-medium">
                            {Number(liters)}L x R$ {
                              (paymentType === 'credit' ? 10 : paymentType === 'admin' ? 13 : 9).toFixed(2)
                            }/L
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-emerald-400 font-mono block">
                            R$ {(Number(liters) * (paymentType === 'credit' ? 10 : paymentType === 'admin' ? 13 : 9)).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>

                      {/* Anexar Comprovante */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                          <span>Anexar Comprovante</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Opcional / Recomendado)</span>
                        </label>

                        {fuelComprovanteUrl ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                <FileCheck className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-900 block truncate">Comprovante Anexado</span>
                                <a
                                  href={fuelComprovanteUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-blue-600 underline font-medium hover:text-blue-800 flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Visualizar Arquivo</span>
                                </a>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFuelComprovanteUrl(null)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                              title="Remover comprovante"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
                            {isUploadingComprovante ? (
                              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                            ) : (
                              <Paperclip className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="text-xs font-bold text-slate-700">
                              {isUploadingComprovante ? 'Enviando arquivo...' : 'Clique para tirar foto ou selecionar comprovante'}
                            </span>
                            <span className="text-[10px] text-slate-400">JPG, PNG ou PDF</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={handleUploadFuelComprovante}
                              disabled={isUploadingComprovante}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isUploadingComprovante}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 mt-2"
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
