import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getBoatCode, matchesBoatSearch } from '../utils/boatUtils';
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
  Play,
  Bell,
  Calendar
} from 'lucide-react';
import Logo from './Logo';
import { io } from 'socket.io-client';
import { logAction } from '../db';
import { consumeFuelForEmbarcacao, getFuelInventory } from '../utils/fuelInventory';
import { getFuelPrice } from '../utils/constants';
import { OperationsTab } from './MarinaOperador/OperationsTab';
import { ChecklistsTab } from './MarinaOperador/ChecklistsTab';
import { FuelRecordsTab } from './MarinaOperador/FuelRecordsTab';
import { ChecklistCaptureModal } from './MarinaOperador/ChecklistCaptureModal';
import { FuelRegistrationModal } from './MarinaOperador/FuelRegistrationModal';
import { AvulsoChecklistModal } from './MarinaOperador/AvulsoChecklistModal';
import { AvulsoFuelSelectorModal } from './MarinaOperador/AvulsoFuelSelectorModal';
import { ViewChecklistModal } from './MarinaOperador/ViewChecklistModal';
import { PerfilTab } from './MarinaOperador/PerfilTab';
import { NotificationDrawer } from './MarinaOperador/NotificationDrawer';
import { NotificationBanner } from './MarinaOperador/NotificationBanner';
import logoMarinaSrc from '../../logos/logo_marina.svg';
import {
  MarinaNotificationItem,
  addStoredNotification,
  getStoredNotifications,
  getUnreadNotificationsCount,
  initAudioUnlock,
  getStrictBoatCode
} from '../utils/marinaNotifications';
import AdicionarFilaModal from './AdicionarFilaModal';

// Jet Ski Reference Images
// import refJetFrente from '../assets/images/checklist/jet/frente.svg';
// import refJetTras from '../assets/images/checklist/jet/tras.svg';
// import refJetEsquerda from '../assets/images/checklist/jet/esquerda.svg';
// import refJetDireita from '../assets/images/checklist/jet/direita.svg';
// import refJetPainel from '../assets/images/checklist/jet/painel.svg';
// import refJetCasco from '../assets/images/checklist/jet/casco.svg';

interface MarinaOperadorDashboardProps {
  onLogout: () => void;
  operadorNome?: string;
}

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
  const todayStr = getFormattedDate(new Date());

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

  const handleSetToday = () => {
    setSelectedDate(todayStr);
  };

  const handleSelectDate = (dateStr: string) => {
    if (dateStr) setSelectedDate(dateStr);
  };

  const dateInputRef = useRef<HTMLInputElement>(null);

  const getRelativeDateInfo = (dateStr: string) => {
    const dToday = new Date(todayStr + 'T12:00:00');
    const dTarget = new Date(dateStr + 'T12:00:00');
    const diffDays = Math.round((dTarget.getTime() - dToday.getTime()) / (1000 * 60 * 60 * 24));
    const weekDaysShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    let label = 'Hoje';
    if (diffDays === -1) label = 'Ontem';
    else if (diffDays === 1) label = 'Amanhã';
    else if (diffDays !== 0) label = weekDaysShort[dTarget.getDay()] || '';

    return {
      isToday: diffDays === 0,
      label
    };
  };

  const { isToday, label: relativeLabel } = getRelativeDateInfo(selectedDate);

  const [activeTab, setActiveTab] = useState<'operacao' | 'checklists' | 'abastecimentos' | 'perfil'>('operacao');
  const [filterType, setFilterType] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyConfirmed, setShowOnlyConfirmed] = useState(false);
  const [sortOrder, setSortOrder] = useState<'hora' | 'az'>('hora');
  
  
  // --- NOVOS MÓDULOS DE ESTADO ---
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [fuelReservaTarget, setFuelReservaTarget] = useState<any>(null);
  const [fuelEmbarcacaoTarget, setFuelEmbarcacaoTarget] = useState<any>(null);

  const [isAvulsoFuelSelectorOpen, setIsAvulsoFuelSelectorOpen] = useState(false);
  const [fuelTargetMode, setFuelTargetMode] = useState<'reserva' | 'embarcacao' | 'avulso'>('reserva');
  const [fuelAvulsoName, setFuelAvulsoName] = useState('');
  const [fuelSelectedClient, setFuelSelectedClient] = useState<any>(null);

  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [captureModalTipo, setCaptureModalTipo] = useState<'descida' | 'subida' | 'saida' | 'retorno' | 'avulso'>('descida');
  const [captureReservaTarget, setCaptureReservaTarget] = useState<any>(null);
  const [captureEmbarcacaoTarget, setCaptureEmbarcacaoTarget] = useState<any>(null);

  const [isAvulsoModalOpen, setIsAvulsoModalOpen] = useState(false);
  const [selectedViewReserva, setSelectedViewReserva] = useState<any>(null);
  const [isAddFilaModalOpen, setIsAddFilaModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    boatCode?: string;
    boatName?: string;
    icon?: 'anchor' | 'navigation' | 'check';
    confirmLabel: string;
    confirmColor: 'amber' | 'blue' | 'emerald';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [unreadUpdateMessage, setUnreadUpdateMessage] = useState<string | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [activeBannerNotification, setActiveBannerNotification] = useState<MarinaNotificationItem | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(() => getUnreadNotificationsCount());
  const currentUser = { 
    nome: operadorNome || localStorage.getItem('admin_name') || localStorage.getItem('admin_username') || 'Operador' 
  };

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
    initAudioUnlock();
    const handleNotifUpdate = () => {
      setUnreadNotificationsCount(getUnreadNotificationsCount());
    };
    window.addEventListener('marina:notifications_updated', handleNotifUpdate);
    return () => {
      window.removeEventListener('marina:notifications_updated', handleNotifUpdate);
    };
  }, []);

  const getEmbarcacao = (id: string) => data?.boats?.find((b: any) => b.id === id);
  const getCliente = (id: string) => data?.clients?.find((c: any) => c.id === id);

  /**
   * Reconcilia alterações que ocorreram enquanto o operador estava com o celular
   * bloqueado, fora da página ou com o navegador suspenso em segundo plano.
   */
  const reconcileOfflineChanges = (freshData: any, isInitial: boolean) => {
    if (!freshData || !Array.isArray(freshData.reservations)) return;

    const STORAGE_KEY_KNOWN_RES = 'marina_last_known_res_state_v1';
    let knownMap: { [id: string]: any } = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY_KNOWN_RES);
      if (raw) knownMap = JSON.parse(raw);
    } catch {}

    const hasPreviousMap = Object.keys(knownMap).length > 0;
    const newOfflineEvents: any[] = [];
    const existingNotifs = getStoredNotifications();

    if (hasPreviousMap) {
      freshData.reservations.forEach((r: any) => {
        const prevResState = knownMap[r.id];
        const boat = freshData.boats?.find((b: any) => b.id === r.embarcacaoId);
        const client = freshData.clients?.find((c: any) => c.id === r.clienteId);
        const boatCode = getStrictBoatCode(boat, r);
        const clientName = client?.nome || r.clienteNome || r.nomeAvulso || 'Não informado';
        const previsaoSaida = r.previsaoSaida || r.horaSaida || r.horaDescida || 'Não informada';

        let operacao: string | null = null;
        let notifType: 'agendamento' | 'confirmacao' | 'cancelamento' | 'descida' | 'abastecimento' | 'saida' | 'chegada' | 'subida' | 'update' | 'info' = 'info';
        let severity: 'info' | 'success' | 'warning' | 'alert' = 'info';

        // 1. Nova reserva adicionada enquanto estava ausente
        if (!prevResState && r.status !== 'cancelado') {
          operacao = 'Nova Reserva';
          notifType = 'agendamento';
          severity = 'info';
        }
        // 2. Reserva cancelada enquanto estava ausente
        else if (prevResState && prevResState.status !== 'cancelado' && (r.status === 'cancelado' || r.statusMarina === 'cancelada')) {
          operacao = 'Cancelamento';
          notifType = 'cancelamento';
          severity = 'warning';
        }
        // 3. Descida pro píer realizada enquanto estava ausente
        else if (prevResState && !prevResState.horaDescida && r.horaDescida) {
          operacao = 'Descida pro Píer';
          notifType = 'descida';
          severity = 'success';
        }
        // 4. Saída para navegação enquanto estava ausente
        else if (prevResState && !prevResState.horaSaida && r.horaSaida) {
          operacao = 'Saída Registrada';
          notifType = 'saida';
          severity = 'info';
        }
        // 5. Retorno ao píer enquanto estava ausente
        else if (prevResState && !prevResState.horaRetorno && r.horaRetorno) {
          operacao = 'Retorno ao Píer';
          notifType = 'chegada';
          severity = 'info';
        }
        // 6. Subida/Guardada enquanto estava ausente
        else if (prevResState && !prevResState.horaSubida && r.horaSubida) {
          operacao = 'Embarcação Guardada';
          notifType = 'subida';
          severity = 'success';
        }
        // 7. Abastecimento realizado enquanto estava ausente
        else if (prevResState && Number(r.abastecimentoLitros) > 0 && Number(r.abastecimentoLitros) !== Number(prevResState.abastecimentoLitros)) {
          operacao = 'Abastecimento';
          notifType = 'abastecimento';
          severity = 'info';
        }

        if (operacao) {
          // Evita duplicar se já foi adicionado recentemente pelo socket
          const alreadyRecorded = existingNotifs.some(n => 
            n.reservationId === r.id && 
            n.type === notifType && 
            Math.abs(Date.now() - n.timestamp) < 2 * 60 * 60 * 1000
          );

          if (!alreadyRecorded) {
            const added = addStoredNotification({
              title: `${operacao} • ${boatCode}`,
              message: `Cliente: ${clientName} | Previsão: ${previsaoSaida}`,
              type: notifType,
              severity,
              operacao,
              boatCode,
              boatName: boatCode,
              clientName,
              previsaoSaida,
              vaga: boat?.vaga || r.embarcacaoVaga,
              reservationId: r.id
            });
            newOfflineEvents.push(added);
          }
        }
      });

      // Se houver novidades acumuladas enquanto o celular esteve fora, alerta o operador
      if (newOfflineEvents.length > 0) {
        if (newOfflineEvents.length === 1) {
          setActiveBannerNotification(newOfflineEvents[0]);
        } else {
          const summary = addStoredNotification({
            title: `${newOfflineEvents.length} Atualizações enquanto esteve ausente`,
            message: newOfflineEvents.map(e => `${e.operacao} • ${e.boatCode}`).slice(0, 3).join(' | '),
            type: 'update',
            severity: 'info'
          });
          setActiveBannerNotification(summary);
        }
      }
    }

    // Atualiza o snapshot no localStorage para a próxima checagem
    const freshMap: any = {};
    freshData.reservations.forEach((r: any) => {
      freshMap[r.id] = {
        status: r.status,
        statusMarina: r.statusMarina,
        horaDescida: r.horaDescida,
        horaSaida: r.horaSaida,
        horaRetorno: r.horaRetorno,
        horaSubida: r.horaSubida,
        abastecimentoLitros: Number(r.abastecimentoLitros || 0),
        date: r.date,
        embarcacaoId: r.embarcacaoId
      };
    });
    try {
      localStorage.setItem(STORAGE_KEY_KNOWN_RES, JSON.stringify(freshMap));
    } catch {}
  };

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
      reconcileOfflineChanges(json, isInitial);
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
    
    let isInitialConnect = true;
    socket.on('connect', () => {
      setIsSocketConnected(true);
      if (!isInitialConnect) {
        fetchData();
      }
      isInitialConnect = false;
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

      const previousRes = dataRef.current?.reservations?.find((r: any) => r.id === reservation.id);
      const boat = dataRef.current?.boats?.find((b: any) => b.id === reservation.embarcacaoId);
      const client = dataRef.current?.clients?.find((c: any) => c.id === reservation.clienteId);

      // Usar apenas o código da embarcação (ex: M99)
      const boatCode = getStrictBoatCode(boat, reservation);
      const clientName = client?.nome || reservation.clienteNome || reservation.nomeAvulso || 'Não informado';
      const previsaoSaida = reservation.previsaoSaida || reservation.horaSaida || reservation.horaDescida || 'Não informada';
      const vagaLabel = boat?.vaga || reservation.embarcacaoVaga;

      let operacao = 'Atualização';
      let notifType: 'agendamento' | 'confirmacao' | 'cancelamento' | 'descida' | 'abastecimento' | 'saida' | 'chegada' | 'subida' | 'update' | 'info' = 'info';
      let severity: 'info' | 'success' | 'warning' | 'alert' = 'info';

      // 1. ABASTECIMENTO
      if (
        payload.action === 'abastecimento' ||
        action === 'fuel' ||
        (Number(reservation.abastecimentoLitros) > 0 &&
          Number(reservation.abastecimentoLitros) !== Number(previousRes?.abastecimentoLitros))
      ) {
        operacao = 'Abastecimento';
        notifType = 'abastecimento';
        severity = 'info';
      }
      // 2. CANCELAMENTO
      else if (
        action === 'cancel' ||
        action === 'delete' ||
        reservation.status === 'cancelado' ||
        reservation.statusMarina === 'cancelada'
      ) {
        operacao = 'Cancelamento';
        notifType = 'cancelamento';
        severity = 'warning';
      }
      // 3. DESCIDA PRO PÍER
      else if (
        (reservation.horaDescida && !previousRes?.horaDescida) ||
        reservation.statusMarina === 'descida' ||
        reservation.statusMarina === 'pier' ||
        (reservation.statusMarina === 'pronta' && previousRes?.statusMarina !== 'pronta') ||
        (reservation.statusOperacional === 'pronto_na_agua' && previousRes?.statusOperacional !== 'pronto_na_agua') ||
        (reservation.fotosChecklistDescida && !previousRes?.fotosChecklistDescida)
      ) {
        operacao = 'Descida pro Píer';
        notifType = 'descida';
        severity = 'success';
      }
      // 4. CONFIRMAÇÃO
      else if (
        action === 'checkin' ||
        action === 'confirm' ||
        (reservation.status === 'confirmado' && previousRes?.status !== 'confirmado') ||
        (reservation.statusMarina === 'confirmada' && previousRes?.statusMarina !== 'confirmada')
      ) {
        operacao = 'Confirmação';
        notifType = 'confirmacao';
        severity = 'success';
      }
      // 5. AGENDAMENTO
      else if (action === 'new' || !previousRes || action === 'create') {
        operacao = 'Agendamento';
        notifType = 'agendamento';
        severity = 'info';
      }
      // 6. OUTRAS TRANSIÇÕES OPERACIONAIS (Saída, Retorno, Subida)
      else if (
        (reservation.horaSaida && !previousRes?.horaSaida) ||
        reservation.statusMarina === 'saida' ||
        reservation.statusMarina === 'navegando' ||
        reservation.statusOperacional === 'navegando'
      ) {
        operacao = 'Saída p/ Água';
        notifType = 'saida';
        severity = 'info';
      } else if (
        (reservation.horaChegada && !previousRes?.horaChegada) ||
        reservation.statusMarina === 'chegada' ||
        reservation.statusOperacional === 'retornou'
      ) {
        operacao = 'Retorno ao Píer';
        notifType = 'chegada';
        severity = 'info';
      } else if (
        (reservation.horaSubida && !previousRes?.horaSubida) ||
        reservation.statusMarina === 'guardada' ||
        reservation.statusOperacional === 'guardado'
      ) {
        operacao = 'Embarcação Guardada';
        notifType = 'subida';
        severity = 'success';
      } else {
        operacao = 'Atualização';
        notifType = 'update';
        severity = 'info';
      }

      const title = `${operacao} • ${boatCode}`;
      const message = `Cliente: ${clientName} | Previsão: ${previsaoSaida}`;

      // Dispara registro no sistema: salva no localStorage, vibra o celular, toca som e emite push se concedido
      const newNotif = addStoredNotification({
        title,
        message,
        type: notifType,
        severity,
        operacao,
        boatCode,
        boatName: boatCode,
        clientName,
        previsaoSaida,
        vaga: vagaLabel,
        reservationId: reservation.id
      });

      setActiveBannerNotification(newNotif);
      setUnreadUpdateMessage(`${operacao} • ${boatCode}`);
      showToast(`${operacao} • ${boatCode} | ${clientName} (${previsaoSaida})`, severity);
    });

    socket.on('marina_caixa_update', (payload: any) => {
      fetchData();
      if (payload?.action === 'devolver_coletes') {
        const notif = addStoredNotification({
          title: 'Devolução de Coletes',
          message: 'Coletes salva-vidas foram devolvidos no caixa.',
          type: 'info',
          severity: 'info'
        });
        setActiveBannerNotification(notif);
        showToast('Devolução de coletes registrada', 'info');
      }
    });

    socket.on('chamado_update', (payload: any) => {
      fetchData();
      if (payload?.chamado) {
        const ch = payload.chamado;
        const notif = addStoredNotification({
          title: 'Chamado da Marina',
          message: `${ch.titulo || 'Novo chamado'}: ${ch.descricao || ''}`,
          type: 'info',
          severity: 'warning'
        });
        setActiveBannerNotification(notif);
        showToast(`Chamado: ${ch.titulo || 'Novo chamado'}`, 'warning');
      }
    });
    
    // Reconciliação inteligente: só executa se o operador esteve fora ou com a tela bloqueada por mais de 20s
    let lastHiddenAt = 0;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (Date.now() - lastHiddenAt > 20000) {
          fetchData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  const handleMarcarSaida = (reserva: any) => {
    const boat = getEmbarcacao(reserva.embarcacaoId);
    const code = getStrictBoatCode(boat, reserva);

    setConfirmModal({
      isOpen: true,
      title: 'Marcar Saída / Partida',
      description: `A embarcação ${code} está liberada e saindo para navegar na água?`,
      boatCode: code,
      boatName: boat?.nome || reserva.barcoNome,
      icon: 'navigation',
      confirmLabel: 'Confirmar Saída',
      confirmColor: 'blue',
      onConfirm: async () => {
        setConfirmModal(null);
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const updatedReserva = {
          ...reserva,
          horaSaida: horaAtual,
          statusMarina: 'navegando',
          statusOperacional: 'navegando'
        };

        // 1. Atualização OTIMISTA instantânea na tela (0ms - zero recarregamento!)
        setData((prev: any) => {
          if (!prev) return prev;
          const reservations = (prev.reservations || []).map((r: any) =>
            r.id === reserva.id ? { ...r, ...updatedReserva } : r
          );
          return { ...prev, reservations };
        });

        showToast(`Saída de ${code} registrada com sucesso!`, 'success');

        // 2. Salva no banco de dados em segundo plano silencioso
        try {
          await fetch('/api/db/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
            body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
          });
          if (boat) {
            await logAction(currentUser.nome, 'MARCAR_SAIDA', `Embarcação ${code} marcou saída ${horaAtual}`);
          }
        } catch (err) {
          showToast('Erro ao sincronizar saída com o servidor.', 'warning');
        }
      }
    });
  };

  const handleChegadaEAbastecimento = (reserva: any) => {
    const boat = getEmbarcacao(reserva.embarcacaoId);
    const code = getStrictBoatCode(boat, reserva);

    setConfirmModal({
      isOpen: true,
      title: 'Chegada no Píer',
      description: `A embarcação ${code} encostou no píer e está pronta para abastecer ou subir?`,
      boatCode: code,
      boatName: boat?.nome || reserva.barcoNome,
      icon: 'anchor',
      confirmLabel: 'Confirmar Chegada',
      confirmColor: 'amber',
      onConfirm: async () => {
        setConfirmModal(null);
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const updatedReserva = {
          ...reserva,
          horaChegada: horaAtual,
          statusMarina: 'chegada',
          statusOperacional: 'retornou'
        };

        // 1. Atualização OTIMISTA instantânea na tela (0ms - zero recarregamento!)
        setData((prev: any) => {
          if (!prev) return prev;
          const reservations = (prev.reservations || []).map((r: any) =>
            r.id === reserva.id ? { ...r, ...updatedReserva } : r
          );
          return { ...prev, reservations };
        });

        showToast(`Chegada de ${code} registrada! Pronta para abastecer/subir.`, 'success');

        // 2. Salva no banco de dados em segundo plano silencioso
        try {
          await fetch('/api/db/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
            body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
          });
        } catch (err) {
          showToast('Erro ao sincronizar chegada com o servidor.', 'warning');
        }
      }
    });
  };

  const handleCaptureModalSuccess = async (data: any) => {
    // Process new checklist data (descida/subida/avulso)
    const target = captureReservaTarget;
    let updatedReserva = target ? { ...target } : {};

    if (captureModalTipo === 'descida') {
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        updatedReserva.horaDescida = horaAtual;
        updatedReserva.statusMarina = 'pronta'; // na água pronta para sair
        updatedReserva.fotosChecklistDescida = data.fotos; // Mapeado por ângulo
        updatedReserva.fotosExtrasDescida = data.fotosExtras; // Array normal
        updatedReserva.checklistEquipamentos = data.itensSeguranca;
        updatedReserva.checklistObservacoes = data.observacoes;
    } else if (captureModalTipo === 'subida') {
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        updatedReserva.horaSubida = horaAtual;
        updatedReserva.statusMarina = 'guardada';
        updatedReserva.statusOperacional = 'guardado';
        updatedReserva.fotosChecklistSubida = data.fotos;
        updatedReserva.fotosExtrasSubida = data.fotosExtras;
        updatedReserva.operadorSubida = currentUser.nome;
    } else {
        // Para avulsos ou outros modos que não exigem lógica prévia
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        updatedReserva.horaManual = horaAtual;
        updatedReserva.fotosAvulsas = data.fotos;
        updatedReserva.fotosExtrasAvulsas = data.fotosExtras;
    }

    // 1. Atualiza na memória do operador imediatamente (sem tela de carregamento)
    setData((prev: any) => {
      if (!prev || !target) return prev;
      const reservations = (prev.reservations || []).map((r: any) =>
        r.id === target.id ? { ...r, ...updatedReserva } : r
      );
      return { ...prev, reservations };
    });

    setIsCaptureModalOpen(false);
    setCaptureReservaTarget(null);
    setCaptureEmbarcacaoTarget(null);
    showToast(`Checklist de ${captureModalTipo} salvo com sucesso!`, 'success');

    // 2. Salva no banco de dados em segundo plano silencioso
    try {
      if (target) {
        await fetch('/api/db/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
          body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
        });
      }
    } catch (err) {
      showToast('Erro ao sincronizar checklist com o servidor.', 'warning');
    }
  };

  const handleFuelConfirm = async (fuelData: any) => {
    const isAvulso = fuelTargetMode === 'avulso';
    const finalStatusCobranca = fuelData.statusCobranca === 'pago' ? 'pago' : 'pendente';
    const isPendente = finalStatusCobranca === 'pendente';
    
    const finalPaymentType = (!isAvulso && isPendente) ? 'faturado' : (fuelData.paymentType || 'pix');
    const price = getFuelPrice(finalPaymentType);

    try {
      if (fuelTargetMode === 'reserva') {
        if (!fuelReservaTarget) return;
        const boat = fuelEmbarcacaoTarget;

        const updatedReserva = {
          ...fuelReservaTarget,
          abastecimentoLitros: fuelData.liters,
          abastecimentoFormaPagamento: finalPaymentType || null,
          abastecimentoStatusCobranca: finalStatusCobranca,
          abastecimentoValorTotal: (fuelData.liters * price).toString(),
          abastecimentoComprovanteUrl: fuelData.comprovanteUrl || null,
          abastecimentoOperador: currentUser.nome
        };

        // 1. Atualização OTIMISTA imediata (0ms - zero espera)
        setData((prev: any) => {
          if (!prev) return prev;
          const currentReservations = prev.reservations || [];
          return {
            ...prev,
            reservations: currentReservations.map((r: any) =>
              r.id === updatedReserva.id ? { ...r, ...updatedReserva } : r
            )
          };
        });

        setIsFuelModalOpen(false);
        showToast('Abastecimento salvo com sucesso!', 'success');

        await fetch('/api/db/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
          body: JSON.stringify({ type: 'reservations', action: 'upsert', data: updatedReserva })
        });

        if (fuelData.liters > 0 && finalStatusCobranca === 'pago') {
          const transacao = {
              id: `trans_fuel_${Date.now()}`,
              tipo: 'receita',
              categoria: 'combustivel',
              empresa: 'Marina',
              valor: fuelData.liters * price,
              dataVencimento: new Date().toISOString().split('T')[0],
              dataPagamento: new Date().toISOString().split('T')[0],
              status: 'pago',
              metodoPagamento: finalPaymentType || null,
              descricao: `Abastecimento Marina: ${fuelData.liters}L a R$${price.toFixed(2)}/L - ${boat?.nome || 'Desc'}`,
              clienteId: fuelReservaTarget.clienteId,
              embarcacaoId: fuelReservaTarget.embarcacaoId,
              operador: currentUser.nome,
              comprovanteUrl: fuelData.comprovanteUrl || null,
              createdAt: new Date().toISOString(),
              metadata: { litros: fuelData.liters }
          };

          setData((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              transacoes: [transacao, ...(prev.transacoes || [])]
            };
          });

          await fetch('/api/financeiro/transacoes/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
              body: JSON.stringify({ action: 'upsert', data: transacao })
          }).catch(() => null);
        }
      } else {
        // Modo Avulso ou Embarcação (Standalone)
        const boat = fuelTargetMode === 'embarcacao' ? fuelEmbarcacaoTarget : null;
        const client = fuelTargetMode === 'embarcacao' ? fuelSelectedClient : null;
        const targetName = boat ? (boat.nome || getBoatCode(boat)) : fuelAvulsoName;
        const isPaid = finalStatusCobranca === 'pago';
        const existingId = fuelReservaTarget?.isStandalone ? fuelReservaTarget.id : null;

        if (fuelData.liters > 0) {
          const transacao = {
              id: existingId || `trans_standalone_fuel_${Date.now()}`,
              tipo: 'receita',
              categoria: 'combustivel',
              empresa: 'Marina',
              valor: fuelData.liters * price,
              dataVencimento: new Date().toISOString().split('T')[0],
              dataPagamento: isPaid ? new Date().toISOString().split('T')[0] : null,
              status: isPaid ? 'pago' : (finalStatusCobranca === 'pendente' ? 'pendente' : 'lancado'),
              metodoPagamento: finalPaymentType || null,
              descricao: `Abastecimento Standalone: ${fuelData.liters}L a R$${price.toFixed(2)}/L - ${targetName}`,
              clienteId: client ? client.id : (boat ? boat.clienteId : 'cliente_avulso'),
              embarcacaoId: boat ? boat.id : 'embarcacao_avulsa',
              operador: currentUser.nome,
              comprovanteUrl: fuelData.comprovanteUrl || null,
              createdAt: new Date().toISOString(),
              metadata: { litros: fuelData.liters }
          };

          setData((prev: any) => {
            if (!prev) return prev;
            const currentTrans = prev.transacoes || [];
            const exists = currentTrans.some((t: any) => t.id === transacao.id);
            const transacoes = exists
              ? currentTrans.map((t: any) => t.id === transacao.id ? transacao : t)
              : [transacao, ...currentTrans];
            return { ...prev, transacoes };
          });

          setIsFuelModalOpen(false);
          showToast('Abastecimento avulso registrado com sucesso!', 'success');

          await fetch('/api/financeiro/transacoes/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
              body: JSON.stringify({ action: 'upsert', data: transacao })
          });

          if (boat) {
            await consumeFuelForEmbarcacao(fuelData.liters, boat.nome || 'Embarcação', currentUser.nome);
          }
        } else {
          setIsFuelModalOpen(false);
        }
      }
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

  const isReservaCancelada = (r: any): boolean => {
    return r?.status === 'cancelado' || r?.statusMarina === 'cancelada';
  };

  const totalDayReservations = (data?.reservations?.filter((r: any) => (r.data || r.date) === selectedDate) || [])
    .sort((a: any, b: any) => {
      const isCanceladoA = isReservaCancelada(a);
      const isCanceladoB = isReservaCancelada(b);
      // Reservas canceladas vão SEMPRE para o final da lista
      if (isCanceladoA !== isCanceladoB) {
        return isCanceladoA ? 1 : -1;
      }

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
      filtered = filtered.filter((r: any) => !isReservaCancelada(r) && !r.horaDescida && r.statusMarina !== 'guardada' && r.statusOperacional !== 'guardado' && r.status !== 'confirmado' && r.statusMarina !== 'confirmada');
    } else if (filterType === 'confirmadas') {
      filtered = filtered.filter((r: any) => !isReservaCancelada(r) && !r.horaDescida && (r.status === 'confirmado' || r.statusMarina === 'confirmada'));
    } else if (filterType === 'prontas') {
      filtered = filtered.filter((r: any) => 
        !isReservaCancelada(r) &&
        r.horaDescida && 
        r.statusMarina !== 'chegada' && 
        r.statusMarina !== 'guardada' &&
        r.statusOperacional !== 'guardado' &&
        !r.horaSubida
      );
    } else if (filterType === 'retornaram') {
      filtered = filtered.filter((r: any) => 
        !isReservaCancelada(r) && (
          r.statusMarina === 'chegada' || 
          r.statusMarina === 'guardada' ||
          r.statusOperacional === 'retornou' ||
          r.statusOperacional === 'guardado' ||
          r.horaSubida
        )
      );
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter((r: any) => {
        const boat = getEmbarcacao(r.embarcacaoId);
        const client = getCliente(r.clienteId);
        return matchesBoatSearch(searchTerm, boat, client, r);
      });
    }

    if (showOnlyConfirmed) {
      filtered = filtered.filter((r: any) => !isReservaCancelada(r) && !r.horaDescida && (r.status === 'confirmado' || r.statusMarina === 'confirmada'));
    }

    filtered.sort((a: any, b: any) => {
      const isCanceladoA = isReservaCancelada(a);
      const isCanceladoB = isReservaCancelada(b);

      // Reservas canceladas DEVEM SEMPRE ir para o final da lista!
      if (isCanceladoA !== isCanceladoB) {
        return isCanceladoA ? 1 : -1;
      }

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
  const descidasCount = totalDayReservations.filter((r: any) => !isReservaCancelada(r) && (r.horaDescida || r.statusMarina === 'pronta')).length;

  const standaloneFuelData = (data?.transacoes || []).filter((t: any) => {
    if (t.categoria !== 'Abastecimento Marina') return false;
    if (!t.id.startsWith('trans_standalone_fuel_')) return false;
    const tDate = t.createdAt ? t.createdAt.split('T')[0] : t.dataVencimento;
    return tDate === selectedDate;
  }).map((t: any) => {
    let liters = 0;
    if (t.metadata?.litros) {
        liters = parseFloat(t.metadata.litros);
    } else {
        const litersMatch = t.descricao?.match(/:\s*([\d\.]+)L/);
        liters = litersMatch ? parseFloat(litersMatch[1]) : 0;
    }

    let targetName = 'Visitante';
    if (t.descricao) {
        const parts = t.descricao.split(' - ');
        if (parts.length > 1) {
            targetName = parts.slice(1).join(' - ');
        }
    }

    return {
      id: t.id,
      embarcacaoId: t.embarcacaoId,
      clienteId: t.clienteId,
      abastecimentoLitros: liters,
      abastecimentoFormaPagamento: t.metodoPagamento,
      abastecimentoStatusCobranca: t.status === 'pago' ? 'cobrado' : 'pendente',
      abastecimentoValorTotal: t.valor,
      abastecimentoComprovanteUrl: t.comprovanteUrl,
      abastecimentoOperador: t.operador,
      barcoNome: targetName,
      clienteNome: t.clienteId && t.clienteId !== 'cliente_avulso' ? getCliente(t.clienteId)?.nome : 'Visitante Avulso',
      isStandalone: true,
      transacaoOriginal: t
    };
  });

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#070B18] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

    const handleSelectNotification = (notif: MarinaNotificationItem) => {
      setIsNotificationDrawerOpen(false);
      const code = notif.boatCode || notif.boatName;
      if (code && code !== 'M--') {
        setActiveTab('operacao');
        setSearchTerm(code);
        showToast(`Filtrando embarcação: ${code}`, 'info');
      }
    };

    return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans pb-20 relative">

      {/* Sticky Ultra-Compact Top Bar: Navegação de Datas + Notificações */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm pt-safe">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2">
          {/* Navegação Entre Dias (<, Data + Calendário, >) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            {/* Botão Dia Anterior */}
            <button
              type="button"
              onClick={handlePrevDay}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-700/80 shadow-2xs"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Seletor Central de Data com Calendário */}
            <div
              onClick={() => {
                if (dateInputRef.current) {
                  if (typeof (dateInputRef.current as any).showPicker === 'function') {
                    (dateInputRef.current as any).showPicker();
                  } else {
                    dateInputRef.current.click();
                  }
                }
              }}
              className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition cursor-pointer select-none min-w-0 ${
                isToday
                  ? 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-white shadow-2xs'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-200'
              }`}
              title="Clique para escolher no calendário"
            >
              <input
                type="date"
                ref={dateInputRef}
                value={selectedDate}
                onChange={(e) => handleSelectDate(e.target.value)}
                className="sr-only"
              />
              <Calendar className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isToday ? 'text-blue-400' : 'text-amber-400'}`} />
              
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-extrabold text-xs sm:text-sm truncate">
                  {relativeLabel}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
                  · {formatDisplayDate(selectedDate)}
                </span>
              </div>

              {/* Contador de Saídas do Dia */}
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${
                isToday 
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' 
                  : 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
              }`}>
                {totalDayReservations.length}
              </span>
            </div>

            {/* Botão Próximo Dia */}
            <button
              type="button"
              onClick={handleNextDay}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-700/80 shadow-2xs"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botão Rápido Hoje (se estiver em outro dia) */}
            {!isToday && (
              <button
                type="button"
                onClick={handleSetToday}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-black tracking-wide active:scale-95 transition cursor-pointer shrink-0"
                title="Voltar para Hoje"
              >
                Hoje
              </button>
            )}
          </div>

          {/* Lado Direito: Status Online + Botão Notificações */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status socket dot */}
            <span 
              className={`w-2 h-2 rounded-full shrink-0 ${isSocketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} 
              title={isSocketConnected ? 'Sistema online em tempo real' : 'Sistema desconectado'} 
            />

            {/* Notification Bell Button */}
            <button
              type="button"
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Central de Notificações"
            >
              <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${unreadNotificationsCount > 0 ? 'text-blue-400 animate-[bounce_2s_infinite]' : 'text-slate-300'}`} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black px-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md animate-pulse">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Real-time Floating Notification Banner */}
      <NotificationBanner
        notification={activeBannerNotification}
        onDismiss={() => setActiveBannerNotification(null)}
        onOpenHistory={() => setIsNotificationDrawerOpen(true)}
      />

      {/* Conteúdo da Aba Selecionada */}
      {activeTab === 'operacao' && (
        <OperationsTab
          reservasDoDia={reservasDoDia}
          getEmbarcacao={getEmbarcacao}
          getCliente={getCliente}
          selectedDate={selectedDate}
          formatDisplayDate={formatDisplayDate}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onSetToday={handleSetToday}
          onSelectDate={handleSelectDate}
          totalDayReservationsCount={totalDayReservations.length}
          onChecklistDescida={handleOpenChecklistDescida}
          onMarcarSaida={handleMarcarSaida}
          onChegadaEAbastecimento={handleChegadaEAbastecimento}
          onChecklistSubida={handleOpenChecklistSubida}
          onAbastecer={(reserva) => {
            setFuelTargetMode('reserva');
            setFuelReservaTarget(reserva);
            setFuelEmbarcacaoTarget(getEmbarcacao(reserva.embarcacaoId));
            setIsFuelModalOpen(true);
          }}
          showOnlyConfirmed={showOnlyConfirmed}
          setShowOnlyConfirmed={setShowOnlyConfirmed}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAdicionarFila={() => setIsAddFilaModalOpen(true)}
        />
      )}

      {activeTab === 'checklists' && (
        <ChecklistsTab
          totalDayReservations={reservasDoDia}
          getEmbarcacao={getEmbarcacao}
          getCliente={getCliente}
          selectedDate={selectedDate}
          formatDisplayDate={formatDisplayDate}
          onOpenAvulsoModal={() => setIsAvulsoModalOpen(true)}
          onViewChecklist={(reserva) => setSelectedViewReserva(reserva)}
        />
      )}

      {activeTab === 'abastecimentos' && (
        <FuelRecordsTab
          totalDayReservations={[...reservasDoDia, ...standaloneFuelData]}
          getEmbarcacao={getEmbarcacao}
          getCliente={getCliente}
          selectedDate={selectedDate}
          formatDisplayDate={formatDisplayDate}
          handleOpenFuelModal={(reserva) => {
            if (reserva.isStandalone) {
              setFuelTargetMode(reserva.embarcacaoId === 'embarcacao_avulsa' ? 'avulso' : 'embarcacao');
              setFuelAvulsoName(reserva.barcoNome);
              setFuelSelectedClient(getCliente(reserva.clienteId));
              setFuelReservaTarget(reserva); // We can still pass the mock reserva target
            } else {
              setFuelTargetMode('reserva');
              setFuelReservaTarget(reserva);
            }
            setFuelEmbarcacaoTarget(getEmbarcacao(reserva.embarcacaoId));
            setIsFuelModalOpen(true);
          }}
          onOpenAvulsoFuel={() => {
            setIsAvulsoFuelSelectorOpen(true);
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
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
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
              {[...reservasDoDia, ...standaloneFuelData].filter((r: any) => Number(r.abastecimentoLitros) > 0).length}
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

      {/* Toast Feedback flutuante na parte inferior */}
      {toast && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-[9990] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-sm font-semibold border backdrop-blur-md ${
            toast.type === 'success' 
              ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/30 shadow-emerald-950/30' 
              : toast.type === 'warning' 
              ? 'bg-slate-900/95 text-amber-400 border-amber-500/30 shadow-amber-950/30' 
              : 'bg-slate-900/95 text-blue-400 border-blue-500/30 shadow-blue-950/30'
          }`}>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Single-Screen de Captura de Fotos e Checklist */}
      {isCaptureModalOpen && (
        <ChecklistCaptureModal
          key={`${captureModalTipo}_${captureReservaTarget?.id || captureEmbarcacaoTarget?.id || 'new'}`}
          isOpen={isCaptureModalOpen}
          onClose={() => {
            setIsCaptureModalOpen(false);
            setCaptureReservaTarget(null);
            setCaptureEmbarcacaoTarget(null);
          }}
          tipo={captureModalTipo}
          reservaTarget={captureReservaTarget}
          embarcacaoTarget={captureEmbarcacaoTarget}
          onSuccess={handleCaptureModalSuccess}
        />
      )}

      {/* Modal de Registro e Tratamento de Combustível Touch-First */}
      <FuelRegistrationModal
        isOpen={isFuelModalOpen}
        onClose={() => {
          setIsFuelModalOpen(false);
          setFuelTargetMode('reserva');
          setFuelReservaTarget(null);
          setFuelEmbarcacaoTarget(null);
          setFuelAvulsoName('');
          setFuelSelectedClient(null);
        }}
        reservaTarget={fuelReservaTarget}
        embarcacaoTarget={fuelEmbarcacaoTarget}
        onConfirm={handleFuelConfirm}
        standaloneMode={fuelTargetMode !== 'reserva' ? (fuelTargetMode as 'embarcacao'|'avulso') : undefined}
        avulsoNome={fuelAvulsoName}
        standaloneClient={fuelSelectedClient}
      />

      {/* Modal Seletor de Abastecimento Avulso */}
      <AvulsoFuelSelectorModal
        isOpen={isAvulsoFuelSelectorOpen}
        onClose={() => setIsAvulsoFuelSelectorOpen(false)}
        data={data}
        getCliente={getCliente}
        onConfirm={(payload) => {
          setIsAvulsoFuelSelectorOpen(false);
          if (payload.type === 'embarcacao') {
            setFuelTargetMode('embarcacao');
            setFuelEmbarcacaoTarget(payload.boat);
            setFuelSelectedClient(payload.client);
            setFuelReservaTarget(null);
          } else {
            setFuelTargetMode('avulso');
            setFuelAvulsoName(payload.name);
            setFuelSelectedClient(null);
            setFuelReservaTarget(null);
            setFuelEmbarcacaoTarget(null);
          }
          setIsFuelModalOpen(true);
        }}
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
          setSelectedViewReserva(null);
          handleOpenChecklistDescida(reserva);
        }}
        onOpenChecklistForSubida={(reserva) => {
          setSelectedViewReserva(null);
          handleOpenChecklistSubida(reserva);
        }}
      />

      {/* Modal para Adicionar Imediatamente na Fila de Descida */}
      <AdicionarFilaModal
        isOpen={isAddFilaModalOpen}
        onClose={() => setIsAddFilaModalOpen(false)}
        onSuccess={(newReserva: any) => {
          if (newReserva) {
            setData((prev: any) => {
              if (!prev) return prev;
              const current = prev.reservations || [];
              const exists = current.some((r: any) => r.id === newReserva.id);
              return {
                ...prev,
                reservations: exists
                  ? current.map((r: any) => r.id === newReserva.id ? newReserva : r)
                  : [newReserva, ...current]
              };
            });
          }
          showToast('Embarcação adicionada à fila de descida com sucesso!', 'success');
        }}
      />

      {/* Drawer de Notificações e Histórico com Controles de Celular */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        onSelectNotification={handleSelectNotification}
      />

      {/* Modal de Confirmação Rápida In-App (Substitui window.confirm nativo sem travar a tela) */}
      {confirmModal && confirmModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setConfirmModal(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 text-slate-900 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ícone e Cabeçalho */}
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                confirmModal.confirmColor === 'amber'
                  ? 'bg-amber-100 text-amber-600 border border-amber-200'
                  : confirmModal.confirmColor === 'emerald'
                  ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                  : 'bg-blue-100 text-blue-600 border border-blue-200'
              }`}>
                {confirmModal.icon === 'anchor' ? (
                  <Anchor className="w-6 h-6 stroke-[2.2]" />
                ) : confirmModal.icon === 'navigation' ? (
                  <Navigation className="w-6 h-6 stroke-[2.2]" />
                ) : (
                  <Check className="w-6 h-6 stroke-[2.5]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base text-slate-900 leading-tight">
                  {confirmModal.title}
                </h3>
                {confirmModal.boatCode && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-slate-900 text-amber-300">
                      {confirmModal.boatCode}
                    </span>
                    {confirmModal.boatName && confirmModal.boatName !== confirmModal.boatCode && (
                      <span className="text-xs text-slate-500 font-semibold truncate">
                        {confirmModal.boatName}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Descrição */}
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              {confirmModal.description}
            </p>

            {/* Botões Grandes para Uso Rápido e Seguro no Celular */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="py-3.5 px-4 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const onConf = confirmModal.onConfirm;
                  onConf();
                }}
                className={`py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-md transition active:scale-95 cursor-pointer text-center ${
                  confirmModal.confirmColor === 'amber'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                    : confirmModal.confirmColor === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
