import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getBoatCode } from '../utils/boatUtils';
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
  Trash2,
  Info,
  Play
} from 'lucide-react';
import Logo from './Logo';
import { io } from 'socket.io-client';
import { logAction } from '../db';
import { consumeFuelForEmbarcacao, getFuelInventory } from '../utils/fuelInventory';
import { OperationsTab } from './MarinaOperador/OperationsTab';
import { ChecklistsTab } from './MarinaOperador/ChecklistsTab';
import { FuelRecordsTab } from './MarinaOperador/FuelRecordsTab';
import { ChecklistCaptureModal } from './MarinaOperador/ChecklistCaptureModal';
import { FuelRegistrationModal } from './MarinaOperador/FuelRegistrationModal';
import { AvulsoChecklistModal } from './MarinaOperador/AvulsoChecklistModal';
import { ViewChecklistModal } from './MarinaOperador/ViewChecklistModal';
import { PerfilTab } from './MarinaOperador/PerfilTab';

// Jet Ski Reference Images
import refJetFrente from '../assets/images/checklist/jet/frente.svg';
import refJetTras from '../assets/images/checklist/jet/tras.svg';
import refJetEsquerda from '../assets/images/checklist/jet/esquerda.svg';
import refJetDireita from '../assets/images/checklist/jet/direita.svg';
import refJetPainel from '../assets/images/checklist/jet/painel.svg';
import refJetCasco from '../assets/images/checklist/jet/casco.svg';

interface MarinaOperadorDashboardProps {
  onLogout: () => void;
  operadorNome?: string;
}

interface ChecklistAngle {
  id: string;
  label: string;
  shortLabel: string;
  icon: any;
  refImage?: string;
  tip: string;
  instruction: string;
  focus: string;
}

const CHECKLIST_ANGLES_JET: ChecklistAngle[] = [
  { 
    id: 'proa', 
    label: 'Proa (Frente do Jet)', 
    shortLabel: 'Proa',
    icon: Navigation, 
    refImage: refJetFrente,
    tip: 'Frente do Jet Ski',
    instruction: 'Posicione-se em frente ao Jet Ski enquadrando o bico frontal, espelhos e guidão.',
    focus: 'Bico frontal, espelhos retrovisores, capô e guidão'
  },
  { 
    id: 'popa', 
    label: 'Popa (Traseira / Turbina)', 
    shortLabel: 'Popa',
    icon: Anchor, 
    refImage: refJetTras,
    tip: 'Traseira / Turbina',
    instruction: 'Posicione-se atrás do Jet enquadrando o hidrojato/turbina, cinta e degrau de reembarque.',
    focus: 'Turbina, bocal direcionador, degrau de reembarque e casco traseiro'
  },
  { 
    id: 'bombordo', 
    label: 'Lateral Esquerda (Bombordo)', 
    shortLabel: 'L. Esquerda',
    icon: Camera, 
    refImage: refJetEsquerda,
    tip: 'Costado Esquerdo',
    instruction: 'Enquadre toda a lateral esquerda do Jet Ski da proa até a popa.',
    focus: 'Costado de bombordo, friso emborrachado e adesivos laterais'
  },
  { 
    id: 'estibordo', 
    label: 'Lateral Direita (Boreste)', 
    shortLabel: 'L. Direita',
    icon: Camera, 
    refImage: refJetDireita,
    tip: 'Costado Direito',
    instruction: 'Enquadre toda a lateral direita do Jet Ski da proa até a popa.',
    focus: 'Costado de boreste, friso emborrachado e acabamentos'
  },
  { 
    id: 'painel', 
    label: 'Painel & Guidão do Jet', 
    shortLabel: 'Painel',
    icon: Ship, 
    refImage: refJetPainel,
    tip: 'Display e Guidão',
    instruction: 'Enquadre o painel digital, manoplas, gatilhos de acelerador/reverso (IBR) e assento.',
    focus: 'Painel digital, manoplas, gatilho do acelerador/IBR e estofado do banco'
  },
  { 
    id: 'casco', 
    label: 'Casco (Fundo do Jet)', 
    shortLabel: 'Casco',
    icon: Layers, 
    refImage: refJetCasco,
    tip: 'Fundo / Grelha',
    instruction: 'Tire uma foto do fundo do casco e da grelha de captação de água da turbina.',
    focus: 'Grelha de admissão, placa de fundo, quilha e gelcoat inferior'
  }
];

const CHECKLIST_ANGLES_LANCHA: ChecklistAngle[] = [
  { 
    id: 'proa', 
    label: 'Proa (Frente da Lancha)', 
    shortLabel: 'Proa',
    icon: Navigation, 
    tip: 'Frente da Lancha',
    instruction: 'Posicione-se em frente à lancha enquadrando o bico, púlpito de proa, âncora e guarda-mancebo.',
    focus: 'Bico, guarda-mancebo em inox, âncora/guincho elétrico e solário de proa'
  },
  { 
    id: 'popa', 
    label: 'Popa (Motores / Plataforma)', 
    shortLabel: 'Popa',
    icon: Anchor, 
    tip: 'Popa & Motores',
    instruction: 'Posicione-se atrás da lancha enquadrando os motores, plataforma de teca, escada e espaço gourmet.',
    focus: 'Motores de popa / rabeta, plataforma de teca, escada retrátil e espaço gourmet'
  },
  { 
    id: 'bombordo', 
    label: 'Lateral Esquerda (Bombordo)', 
    shortLabel: 'L. Esquerda',
    icon: Camera, 
    tip: 'Costado de Bombordo',
    instruction: 'Enquadre todo o costado esquerdo da lancha da proa até a popa.',
    focus: 'Costado de bombordo, friso de proteção, vigias/janelas e defensas'
  },
  { 
    id: 'estibordo', 
    label: 'Lateral Direita (Boreste)', 
    shortLabel: 'L. Direita',
    icon: Camera, 
    tip: 'Costado de Boreste',
    instruction: 'Enquadre todo o costado direito da lancha da proa até a popa.',
    focus: 'Costado de boreste, frisos, linha d’água e costado'
  },
  { 
    id: 'painel', 
    label: 'Cockpit & Posto de Comando', 
    shortLabel: 'Painel',
    icon: Ship, 
    tip: 'Painel & Comando',
    instruction: 'Enquadre o posto de comando, volante náutico, telas/relógios, manetes e bancos.',
    focus: 'Volante esportivo, GPS/relógios, manete de aceleração, comandos e estofados'
  },
  { 
    id: 'casco', 
    label: 'Casco (Fundo em V da Lancha)', 
    shortLabel: 'Casco',
    icon: Layers, 
    tip: 'Quilha e Fundo',
    instruction: 'Tire uma foto do fundo do casco em V, quilha e linha d’água para verificar integridade.',
    focus: 'Quilha central, redans/hidrofólios, gelcoat do fundo e linha d’água'
  }
];

// Fallback compatibility alias
const CHECKLIST_ANGLES = CHECKLIST_ANGLES_LANCHA;

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
  const [activeTab, setActiveTab] = useState<'operacao' | 'checklists' | 'abastecimentos' | 'perfil'>('operacao');
  const [filterType, setFilterType] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyConfirmed, setShowOnlyConfirmed] = useState(false);
  const [sortOrder, setSortOrder] = useState<'hora' | 'az'>('hora');
  
  
  // --- NOVOS MÓDULOS DE ESTADO ---
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [fuelReservaTarget, setFuelReservaTarget] = useState<any>(null);
  const [fuelEmbarcacaoTarget, setFuelEmbarcacaoTarget] = useState<any>(null);

  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [captureModalTipo, setCaptureModalTipo] = useState<'descida' | 'subida' | 'saida' | 'retorno' | 'avulso'>('descida');
  const [captureReservaTarget, setCaptureReservaTarget] = useState<any>(null);
  const [captureEmbarcacaoTarget, setCaptureEmbarcacaoTarget] = useState<any>(null);

  const [isAvulsoModalOpen, setIsAvulsoModalOpen] = useState(false);
  const [selectedViewReserva, setSelectedViewReserva] = useState<any>(null);

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [unreadUpdateMessage, setUnreadUpdateMessage] = useState<string | null>(null);
  const currentUser = { nome: operadorNome || 'Operador' };

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

  const getEmbarcacao = (id: string) => data?.boats?.find((b: any) => b.id === id);
  const getCliente = (id: string) => data?.clients?.find((c: any) => c.id === id);

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
      setIsSocketConnected(true);
      fetchData();
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    socket.on('marina_update', (payload: any) => {
      const reservationData = payload?.reservation || payload?.data;
      if (!reservationData || (payload.type && payload.type !== 'reservations')) {
        setUnreadUpdateMessage('Atualização recebida no sistema!');
        fetchData();
        return;
      }

      const reservation = reservationData;
      const { action } = payload;

      console.log('--- Socket Update Received ---');
      console.log('Action:', action);
      console.log('Incoming Payload:', payload);

      setData((prev: any) => {
        if (!prev) {
          console.log('No previous data in state, skipping update');
          return prev;
        }
        let updatedReservations = [...(prev.reservations || [])];

        let preUpdateTarget = null;
        if (action === 'delete') {
          updatedReservations = updatedReservations.filter((r: any) => r.id !== reservation.id);
        } else if (action === 'new') {
          const exists = updatedReservations.some((r: any) => r.id === reservation.id);
          if (!exists) updatedReservations.push(reservation);
        } else {
          const idx = updatedReservations.findIndex((r: any) => r.id === reservation.id);
          if (idx >= 0) {
            preUpdateTarget = { ...updatedReservations[idx] };
            updatedReservations[idx] = { ...updatedReservations[idx], ...reservation };
          } else {
            updatedReservations.push(reservation);
          }
        }

        console.log('Target Content BEFORE update:', preUpdateTarget);
        console.log('Target Content AFTER update:', updatedReservations.find((r:any) => r.id === reservation.id));
        console.log('------------------------------');

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
      setUnreadUpdateMessage(info.msg);

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

    const handleOpenChecklistDescida = (reserva: any) => {
    setCaptureReservaTarget(reserva);
    setCaptureEmbarcacaoTarget(getEmbarcacao(reserva.embarcacaoId));
    setCaptureModalTipo('descida');
    setIsCaptureModalOpen(true);
  };

  const handleOpenChecklistSubida = (reserva: any) => {
    setCaptureReservaTarget(reserva);
    setCaptureEmbarcacaoTarget(getEmbarcacao(reserva.embarcacaoId));
    setCaptureModalTipo('subida');
    setIsCaptureModalOpen(true);
  };

  const handleMarcarSaida = async (reserva: any) => {
    if (!window.confirm('Confirma a marcação de saída para a água?')) return;
    const boat = getEmbarcacao(reserva.embarcacaoId);
    if (!boat) return;

    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updatedReserva = {
      ...reserva,
      horaSaida: horaAtual,
      statusMarina: 'navegando',
      statusOperacional: 'navegando'
    };

    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
      });
      await logAction(currentUser.nome, 'MARCAR_SAIDA', `Embarcação ${getBoatCode(boat)} marcou saída ${horaAtual}`);
      showToast('Saída registrada com sucesso', 'success');
    } catch (err) {
      showToast('Erro ao marcar saída', 'warning');
    }
  };

  const handleChegadaEAbastecimento = async (reserva: any) => {
    if (!window.confirm('Embarcação retornou. Deseja realizar checklist de chegada/subida?')) return;

    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updatedReserva = {
      ...reserva,
      horaChegada: horaAtual,
      statusMarina: 'chegada',
      statusOperacional: 'retornou'
    };

    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
      });
      showToast('Retorno registrado. Preencha o checklist de subida e/ou informe o combustível.', 'info');
      handleOpenChecklistSubida(updatedReserva);
    } catch (err) {
      showToast('Erro ao marcar chegada.', 'warning');
    }
  };

  const handleCaptureModalSuccess = async (data: any) => {
    // Process new checklist data (descida/subida/avulso)
    const target = captureReservaTarget;
    let updatedReserva = target ? { ...target } : {};

    if (captureModalTipo === 'descida') {
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        updatedReserva.horaDescida = horaAtual;
        updatedReserva.statusMarina = 'pronta'; // na água pronta para sair
        updatedReserva.fotosChecklistDescida = Object.values(data.fotos).concat(data.fotosExtras);
        updatedReserva.checklistEquipamentos = data.itensSeguranca;
        updatedReserva.checklistObservacoes = data.observacoes;
    } else if (captureModalTipo === 'subida') {
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        updatedReserva.horaSubida = horaAtual;
        updatedReserva.statusMarina = 'guardada';
        updatedReserva.statusOperacional = 'guardado';
        updatedReserva.fotosChecklistSubida = Object.values(data.fotos).concat(data.fotosExtras);
        updatedReserva.operadorSubida = currentUser.nome;
    } else {
        // Para avulsos ou outros modos que não exigem lógica prévia
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        updatedReserva.horaManual = horaAtual;
        updatedReserva.fotosAvulsas = Object.values(data.fotos).concat(data.fotosExtras);
    }

    try {
      if (target) {
        await fetch('/api/db/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
          body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
        });
      }

      setIsCaptureModalOpen(false);
      showToast(`Checklist de ${captureModalTipo} salvo com sucesso!`, 'success');
    } catch (err) {
      showToast('Erro ao salvar checklist.', 'warning');
    }
  };

  const handleFuelConfirm = async (fuelData: any) => {
    if (!fuelReservaTarget) return;

    const boat = fuelEmbarcacaoTarget;
    const priceMap: any = { pix: 9, dinheiro: 9, credit: 10, debit: 9, admin: 13 };
    const price = priceMap[fuelData.paymentType] || 9;

    const updatedReserva = {
      ...fuelReservaTarget,
      abastecimentoLitros: fuelData.liters,
      abastecimentoFormaPagamento: fuelData.paymentType,
      abastecimentoStatusCobranca: fuelData.statusCobranca,
      abastecimentoValorTotal: (fuelData.liters * price).toString(),
      abastecimentoComprovanteUrl: fuelData.comprovanteUrl || null,
      abastecimentoOperador: currentUser.nome
    };

    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
      });

      // Criar transação financeira se for cobrado
      if (fuelData.statusCobranca === 'cobrado') {
        const transacao = {
            id: `trans_fuel_${Date.now()}`,
            tipo: 'receita',
            categoria: 'Abastecimento Marina',
            valor: fuelData.liters * price,
            dataVencimento: new Date().toISOString().split('T')[0],
            dataPagamento: new Date().toISOString().split('T')[0],
            status: 'pago',
            metodoPagamento: fuelData.paymentType,
            descricao: `Abastecimento Marina: ${fuelData.liters}L a R$${price.toFixed(2)}/L - ${boat?.nome || 'Desc'}`,
            clienteId: fuelReservaTarget.clienteId,
            embarcacaoId: fuelReservaTarget.embarcacaoId,
            operador: currentUser.nome,
            comprovanteUrl: fuelData.comprovanteUrl || null,
            createdAt: new Date().toISOString()
        };
        await fetch('/api/financeiro/transacoes/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
            body: JSON.stringify({ action: 'upsert', data: transacao })
        }).catch(() => null);
      }

      setIsFuelModalOpen(false);
      showToast('Abastecimento salvo com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao salvar abastecimento.', 'warning');
      throw err;
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

    if (showOnlyConfirmed) {
      filtered = filtered.filter((r: any) => !r.horaDescida && (r.status === 'confirmado' || r.statusMarina === 'confirmada'));
    }

    filtered.sort((a: any, b: any) => {
      const timeA = getSortTime(a);
      const timeB = getSortTime(b);
      const boatA = getEmbarcacao(a.embarcacaoId);
      const boatB = getEmbarcacao(b.embarcacaoId);
      const nameA = (boatA?.nome || a.barcoNome || '').toString();
      const nameB = (boatB?.nome || b.barcoNome || '').toString();

      if (sortOrder === 'hora') {
        const timeCompare = timeA.localeCompare(timeB);
        if (timeCompare !== 0) return timeCompare;
        return nameA.localeCompare(nameB, 'pt-BR', { numeric: true });
      } else {
        const nameCompare = nameA.localeCompare(nameB, 'pt-BR', { numeric: true });
        if (nameCompare !== 0) return nameCompare;
        return timeA.localeCompare(timeB);
      }
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
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans pb-20 relative">

      {/* Floating Notification Blob */}
      {unreadUpdateMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9000] animate-in fade-in slide-in-from-top-4 duration-300">
          <button
            onClick={() => {
              setUnreadUpdateMessage(null);
              fetchData();
            }}
            className="bg-blue-600 text-white shadow-xl shadow-blue-500/30 px-5 py-2.5 rounded-full flex items-center gap-2 font-bold text-sm tracking-wide active:scale-95 transition-transform border-2 border-white/20"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
            {unreadUpdateMessage}
          </button>
        </div>
      )}

      {/* Conteúdo da Aba Selecionada */}
      {activeTab === 'operacao' && (
        <OperationsTab
          reservasDoDia={reservasDoDia}
          getEmbarcacao={getEmbarcacao}
          getCliente={getCliente}
          selectedDate={selectedDate}
          formatDisplayDate={formatDisplayDate}
          onChecklistDescida={handleOpenChecklistDescida}
          onMarcarSaida={handleMarcarSaida}
          onChegadaEAbastecimento={handleChegadaEAbastecimento}
          onChecklistSubida={handleOpenChecklistSubida}
          showOnlyConfirmed={showOnlyConfirmed}
          setShowOnlyConfirmed={setShowOnlyConfirmed}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      )}

      {activeTab === 'checklists' && (
        <ChecklistsTab
          totalDayReservations={reservasDoDia}
          getEmbarcacao={getEmbarcacao}
          getCliente={getCliente}
          onOpenAvulsoModal={() => setIsAvulsoModalOpen(true)}
          onViewChecklist={(reserva) => setSelectedViewReserva(reserva)}
        />
      )}

      {activeTab === 'abastecimentos' && (
        <FuelRecordsTab
          totalDayReservations={reservasDoDia}
          getEmbarcacao={getEmbarcacao}
          getCliente={getCliente}
          handleOpenFuelModal={(reserva) => {
            setFuelReservaTarget(reserva);
            setFuelEmbarcacaoTarget(getEmbarcacao(reserva.embarcacaoId));
            setIsFuelModalOpen(true);
          }}
        />
      )}

      {activeTab === 'perfil' && (
        <PerfilTab
          operadorNome={currentUser.nome}
          isSocketConnected={isSocketConnected}
          onLogout={() => {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_username');
            localStorage.removeItem('admin_role');
            localStorage.removeItem('admin_name');
            onLogout();
          }}
          showToast={showToast}
        />
      )}

      {/* Navegação por Abas Principais (Bottom Bar) */}
      <div className="bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around fixed bottom-0 w-full z-40 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.1)] pb-safe">
        <button
          onClick={() => setActiveTab('operacao')}
          className={`flex-1 pt-2 pb-1 px-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'operacao'
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <Play className={`w-6 h-6 ${activeTab === 'operacao' ? 'fill-current' : ''}`} />
            <span className="absolute -top-2 -right-3 bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {reservasDoDia.length}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Operação</span>
        </button>

        <button
          onClick={() => setActiveTab('checklists')}
          className={`flex-1 pt-2 pb-1 px-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'checklists'
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <ClipboardList className={`w-6 h-6`} />
          <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Checklists</span>
        </button>

        <button
          onClick={() => setActiveTab('abastecimentos')}
          className={`flex-1 pt-2 pb-1 px-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'abastecimentos'
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <Droplets className={`w-6 h-6 ${activeTab === 'abastecimentos' ? 'fill-current' : ''}`} />
            <span className="absolute -top-2 -right-3 bg-cyan-100 text-cyan-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {reservasDoDia.filter((r: any) => Number(r.abastecimentoLitros || r.litrosAbastecidos) > 0).length}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Combustível</span>
        </button>

        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex-1 pt-2 pb-1 px-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'perfil'
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <UserIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Perfil</span>
        </button>
      </div>

      {/* Modal Single-Screen de Captura de Fotos e Checklist */}
      <ChecklistCaptureModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
        tipo={captureModalTipo}
        reservaTarget={captureReservaTarget}
        embarcacaoTarget={captureEmbarcacaoTarget}
        onSuccess={handleCaptureModalSuccess}
      />

      {/* Modal de Registro e Tratamento de Combustível Touch-First */}
      <FuelRegistrationModal
        isOpen={isFuelModalOpen}
        onClose={() => {
          setIsFuelModalOpen(false);
          setFuelReservaTarget(null);
          setFuelEmbarcacaoTarget(null);
        }}
        reservaTarget={fuelReservaTarget}
        embarcacaoTarget={fuelEmbarcacaoTarget}
        onConfirm={handleFuelConfirm}
      />

      {/* Modal de Checklist Avulso */}
      <AvulsoChecklistModal
        isOpen={isAvulsoModalOpen}
        onClose={() => setIsAvulsoModalOpen(false)}
        data={data}
        getCliente={getCliente}
        onConfirm={(boat, mode) => {
          setIsAvulsoModalOpen(false);
          setCaptureEmbarcacaoTarget(boat);
          setCaptureReservaTarget(null);
          setCaptureModalTipo(mode);
          setIsCaptureModalOpen(true);
        }}
      />

      {/* Modal de Visualização de Checklist */}
      <ViewChecklistModal
        reserva={selectedViewReserva}
        getEmbarcacao={getEmbarcacao}
        getCliente={getCliente}
        onClose={() => setSelectedViewReserva(null)}
        onOpenChecklistForDescida={(reserva) => {
          handleOpenChecklistDescida(reserva);
        }}
        onOpenChecklistForSubida={(reserva) => {
          handleOpenChecklistSubida(reserva);
        }}
      />
    </div>
  );
};
