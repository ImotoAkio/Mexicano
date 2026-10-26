import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Anchor, Calendar, User, Phone, Mail, FileText, Download, Trash2, ShieldCheck, Lock, Eye, Database, Info, X, Home, Wallet, CreditCard, Ship, Bell, ChevronLeft, ChevronRight, Plus, CheckCircle, Smartphone, Share, CheckCircle2, Check, ChevronDown, Droplets, Waves, Wrench, QrCode, Ticket, RefreshCw, Search, AlertTriangle, ShieldAlert, Clock, MessageCircle, Sparkles } from 'lucide-react';
import { JetSkiIcon } from './icons/JetSkiIcon';
import { io } from 'socket.io-client';
// @ts-ignore
import boatImgLancha from '../assets/images/lancha.webp';
// @ts-ignore
import boatImgJet from '../assets/images/jet.webp';
import ClientReservationModal from './ClientReservationModal';
import ClientCheckinModal from './ClientCheckinModal';
import ClientMaintenanceModal from './ClientMaintenanceModal';
import FeedbackForm from './FeedbackForm';
import MonthlyCalendarGenerator from './MonthlyCalendarGenerator';
import { generateAvisoSaidaPDF } from '../utils/pdfGenerator';
import { getBoatCode } from '../utils/boatUtils';
import { Chamado } from '../types';
import { chamadoDB } from '../db';

const TAB_ORDER = ['home', 'calendar', 'finance', 'maintenance'] as const;
type TabKey = typeof TAB_ORDER[number];

const pageTabVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 20 : direction < 0 ? -20 : 0,
    scale: 0.99,
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.25, 1, 0.5, 1] as const,
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -20 : direction < 0 ? 20 : 0,
    scale: 0.99,
    transition: {
      duration: 0.16,
      ease: [0.25, 1, 0.5, 1] as const,
    },
  }),
};

const subTabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.14, ease: 'easeIn' as const } },
};

interface ClientDashboardPageProps {
  client: any;
  boats: any[];
  reservations: any[];
  transacoes?: any[];
  chamados?: Chamado[];
  manutencoes?: any[];
  onLogout: () => void;
  onRefresh?: (forceRefresh?: boolean) => void;
}

export default function ClientDashboardPage({ client, boats, reservations, transacoes = [], chamados = [], manutencoes = [], onLogout, onRefresh }: ClientDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [tabDirection, setTabDirection] = useState(0);

  const handleTabChange = (newTab: TabKey) => {
    if (newTab === activeTab) return;
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    const nextIndex = TAB_ORDER.indexOf(newTab);
    setTabDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(newTab);
  };
  const [maintenanceSubTab, setMaintenanceSubTab] = useState<'chamados' | 'servicos'>('chamados');
  const [financeTab, setFinanceTab] = useState<'fatura' | 'extrato'>('fatura');
  const [showFutureInvoices, setShowFutureInvoices] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyTab, setPrivacyTab] = useState<'general' | 'data' | 'rights' | 'dpo'>('general');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [maintenanceView, setMaintenanceView] = useState<'list' | 'create'>('list');
  const [maintenanceSearch, setMaintenanceSearch] = useState('');
  const [isMaintenanceSubmitting, setIsMaintenanceSubmitting] = useState(false);
  const [maintenanceFormData, setMaintenanceFormData] = useState({
    embarcacaoId: boats.length === 1 ? boats[0].id : '',
    titulo: '',
    descricaoAvaria: '',
    urgencia: 'baixa' as 'baixa' | 'media' | 'alta' | 'critica'
  });

  const [isContestationModalOpen, setIsContestationModalOpen] = useState(false);
  const [contestationTarget, setContestationTarget] = useState<any>(null);
  const [isContesting, setIsContesting] = useState(false);

  // Documentos da embarcação (visualizador integrado PWA)
  const [docModalBoat, setDocModalBoat] = useState<any>(null);
  const [docModalTab, setDocModalTab] = useState<'documento' | 'seguro'>('documento');
  const [isDocLoading, setIsDocLoading] = useState(true);

  const handleOpenDocModal = (boat: any, tab: 'documento' | 'seguro' = 'documento') => {
    setDocModalBoat(boat);
    setDocModalTab(tab);
    setIsDocLoading(true);
  };

  const handleShareDoc = async () => {
    if (!docModalBoat) return;
    const currentDocUrl = docModalTab === 'seguro' ? docModalBoat.seguroUrl : docModalBoat.documentoUrl;
    if (!currentDocUrl) return;

    const title = `${docModalTab === 'seguro' ? 'Apólice de Seguro' : 'Documento da Embarcação'} - ${getBoatCode(docModalBoat)}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Documentação da embarcação ${getBoatCode(docModalBoat)}`,
          url: currentDocUrl,
        });
      } catch (e) {
        // Ignora cancelamento do usuário
      }
    }
  };

  // Real-time & Refresh states
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    await Promise.resolve(onRefresh(true));
    setTimeout(() => setIsRefreshing(false), 800); // Visual feedback time
  };

  const boatsRef = useRef(boats);
  const onRefreshRef = useRef(onRefresh);
  const clientIdRef = useRef(client?.id);
  useEffect(() => {
    boatsRef.current = boats;
    onRefreshRef.current = onRefresh;
    clientIdRef.current = client?.id;
  }, [boats, onRefresh, client?.id]);

  // Asaas Pix payment states
  const [selectedTransactionDetails, setSelectedTransactionDetails] = useState<any>(null);
  const [selectedTransactionForPix, setSelectedTransactionForPix] = useState<any>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixError, setPixError] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [activePixPaymentId, setActivePixPaymentId] = useState<string | null>(null);
  const [pixPaymentConfirmed, setPixPaymentConfirmed] = useState(false);
  const [pixPaidAt, setPixPaidAt] = useState<string>('');
  const activePixRef = useRef<{ paymentId: string | null; txId: string | null }>({ paymentId: null, txId: null });

  useEffect(() => {
    activePixRef.current = {
      paymentId: activePixPaymentId,
      txId: selectedTransactionForPix?.id || null
    };
  }, [activePixPaymentId, selectedTransactionForPix]);

  useEffect(() => {
    const socket = io('/', {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10
    });

    socket.on('marina_update', (data: any) => {
      const isMyBoat = (boatsRef.current || []).some((b: any) => b.id === data?.reservation?.embarcacaoId);
      if (isMyBoat && onRefreshRef.current) {
        onRefreshRef.current();
      }
    });

    socket.on('marina_caixa_update', () => {
      if (onRefreshRef.current) onRefreshRef.current();
    });

    socket.on('chamado_update', () => {
      if (onRefreshRef.current) onRefreshRef.current();
    });

    socket.on('config_updated', (data: any) => {
      if (data && data.pagamentos_online_habilitado !== undefined) {
        const isHab = !!data.pagamentos_online_habilitado;
        setPagamentosHabilitados(isHab);
        try { localStorage.setItem('pagamentos_online_habilitado_cache', isHab ? '1' : '0'); } catch {}
      }
    });

    socket.on('asaas_payment_updated', (data: any) => {
      if (data?.status === 'pago' && activePixRef.current.txId) {
        const matchesPaymentId = data.paymentId && activePixRef.current.paymentId && String(data.paymentId) === String(activePixRef.current.paymentId);
        const matchesTxId = Array.isArray(data.transactionIds) && data.transactionIds.includes(activePixRef.current.txId);
        const matchesClientBulk = activePixRef.current.txId === 'bulk' && (!Array.isArray(data.clientIds) || data.clientIds.includes(clientIdRef.current));
        if (matchesPaymentId || matchesTxId || matchesClientBulk || !data.paymentId) {
          const now = new Date();
          setPixPaidAt(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
          setPixPaymentConfirmed(true);
        }
      }
      setSelectedTransactionDetails(null);
      if (onRefreshRef.current) onRefreshRef.current();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const targetId = activePixPaymentId || selectedTransactionForPix?.id;
    if (!selectedTransactionForPix || !targetId || !pixQrCode || pixPaymentConfirmed) return;
    const token = localStorage.getItem('client_token');
    if (!token) return;

    const markConfirmed = () => {
      const now = new Date();
      setPixPaidAt(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      setPixPaymentConfirmed(true);
      if (onRefreshRef.current) onRefreshRef.current(true);
    };

    const checkPaymentStatus = async () => {
      try {
        // 1. Direct Asaas + DB status endpoint
        const url = `/api/financeiro/asaas-status/${encodeURIComponent(targetId)}?clienteId=${encodeURIComponent(client?.id || '')}`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const d = await res.json();
          if (d?.paid) {
            markConfirmed();
            return;
          }
        }

        // 2. Fallback: Force-refresh client transactions from MariaDB (/api/client/me?forceRefresh=true)
        // Catches webhook updates written to the shared VPS database even if local server.ts wasn't restarted
        const meRes = await fetch('/api/client/me?forceRefresh=true', {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
        if (meRes.ok && (meRes.headers.get('content-type') || '').includes('application/json')) {
          const meData = await meRes.json();
          const freshTxs: any[] = meData?.transacoes || [];
          if (selectedTransactionForPix.id !== 'bulk') {
            const matched = freshTxs.find((t: any) =>
              String(t.id) === String(selectedTransactionForPix.id) ||
              (activePixPaymentId && String(t.asaasPaymentId) === String(activePixPaymentId))
            );
            if (matched && matched.status === 'pago') {
              markConfirmed();
              return;
            }
          } else {
            const matchedByPayId = activePixPaymentId
              ? freshTxs.filter((t: any) => String(t.asaasPaymentId) === String(activePixPaymentId))
              : [];
            if (matchedByPayId.length > 0 && matchedByPayId.every((t: any) => t.status === 'pago')) {
              markConfirmed();
              return;
            }
          }
        }
      } catch {}
    };

    checkPaymentStatus();
    const interval = setInterval(checkPaymentStatus, 3000);

    return () => clearInterval(interval);
  }, [selectedTransactionForPix, activePixPaymentId, pixQrCode, pixPaymentConfirmed, client?.id]);

  // Contatos de WhatsApp
  const FINANCEIRO_WHATSAPP = '558791229333';
  const VALE_ADMINISTRADORA_WHATSAPP = '558791090051';
  const [pagamentosHabilitados, setPagamentosHabilitados] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pagamentos_online_habilitado_cache') === '1';
    } catch {
      return false;
    }
  });

  const [finConfig, setFinConfig] = useState<{
    taxaJurosMensal: number;
    taxaMultaAtraso: number;
    diasFaturaAtual: number;
  }>({
    taxaJurosMensal: 2.2,
    taxaMultaAtraso: 2.0,
    diasFaturaAtual: 30
  });

  const getClientTxUpdatedValue = (t: any): { original: number; final: number; fees: number; isOverdue: boolean } => {
    const baseVal = Number(t?.valor || 0);
    if (!t || t.tipo !== 'receita' || t.status === 'pago' || t.status === 'cancelado' || !t.dataVencimento) {
      return { original: baseVal, final: baseVal, fees: 0, isOverdue: false };
    }
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (t.dataVencimento >= todayStr) {
      return { original: baseVal, final: baseVal, fees: 0, isOverdue: false };
    }
    const due = new Date(t.dataVencimento + 'T12:00:00');
    const todayRef = new Date(todayStr + 'T12:00:00');
    const diffDays = Math.max(0, Math.floor((todayRef.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
    if (diffDays <= 0) {
      return { original: baseVal, final: baseVal, fees: 0, isOverdue: false };
    }
    const fine = baseVal * (Math.max(0, finConfig.taxaMultaAtraso) / 100);
    const interest = baseVal * (Math.max(0, finConfig.taxaJurosMensal) / 100) * (diffDays / 30);
    const fees = Number((fine + interest).toFixed(2));
    const final = Number((baseVal + fees).toFixed(2));
    return { original: baseVal, final, fees, isOverdue: true };
  };

  useEffect(() => {
    const loadPagamentosFlag = () => {
      fetch('/api/config/public?chaves=pagamentos_online_habilitado', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data?.configs?.pagamentos_online_habilitado !== undefined) {
            const isHab = data.configs.pagamentos_online_habilitado === '1';
            setPagamentosHabilitados(isHab);
            try { localStorage.setItem('pagamentos_online_habilitado_cache', isHab ? '1' : '0'); } catch {}
          }
        })
        .catch(() => {});

      const token = localStorage.getItem('client_token');
      if (token) {
        fetch('/api/financeiro/configuracoes', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(d => {
            if (d?.success && d?.configuracoes) {
              setFinConfig({
                taxaJurosMensal: parseFloat(d.configuracoes.taxaJurosMensal ?? '2.2'),
                taxaMultaAtraso: parseFloat(d.configuracoes.taxaMultaAtraso ?? '2.0'),
                diasFaturaAtual: Math.max(1, parseInt(d.configuracoes.diasFaturaAtual ?? '30', 10) || 30)
              });
            }
          })
          .catch(() => {});
      }
    };
    loadPagamentosFlag();
    const onVisible = () => { if (document.visibilityState === 'visible') loadPagamentosFlag(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', loadPagamentosFlag);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', loadPagamentosFlag);
    };
  }, []);

  const buildFinanceiroWhatsAppUrl = (descricao: string, valor?: number) => {
    const valorFmt = valor !== undefined
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)
      : '';
    const nome = client?.nome ? `, sou ${client.nome}` : '';
    const msg = `Olá${nome}. Gostaria de realizar o pagamento de: ${descricao}${valorFmt ? ` (${valorFmt})` : ''}.`;
    return `https://wa.me/${FINANCEIRO_WHATSAPP}?text=${encodeURIComponent(msg)}`;
  };

  const handleOpenPixPayment = async (t: any) => {
    const calc = getClientTxUpdatedValue(t);
    setSelectedTransactionForPix({ ...t, valor: calc.final, valorOriginal: calc.original });
    setIsGeneratingPix(true);
    setPixQrCode(null);
    setPixPayload(null);
    setPixError(null);
    setCopiedPix(false);
    setPixPaymentConfirmed(false);
    setActivePixPaymentId(t.asaasPaymentId || null);

    try {
      const token = localStorage.getItem('client_token');
      const response = await fetch(`/api/financeiro/transacoes/${t.id}/gerar-asaas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ billingType: 'PIX' })
      });
      
      const resData = await response.json();
      if (response.ok && resData.success) {
        if (resData.asaasPaymentId) {
          setActivePixPaymentId(resData.asaasPaymentId);
        }
        if (resData.finalValue !== undefined) {
          setSelectedTransactionForPix((prev: any) => prev ? { ...prev, valor: Number(resData.finalValue) } : prev);
        }
        if (resData.qrCode) {
          setPixQrCode(resData.qrCode.encodedImage);
          setPixPayload(resData.qrCode.payload);
        } else {
          setPixError("QR Code não disponível no momento.");
        }
      } else {
        setPixError(resData.message || "Erro ao gerar PIX.");
      }
    } catch (err) {
      setPixError("Não foi possível conectar ao servidor.");
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const handleOpenBulkPixPayment = async (transacoesIds?: string[], customTotal?: number) => {
    setIsGeneratingPix(true);
    setPixQrCode(null);
    setPixPayload(null);
    setPixError(null);
    setCopiedPix(false);
    setPixPaymentConfirmed(false);
    setActivePixPaymentId(null);
    setSelectedTransactionForPix({
      id: 'bulk',
      descricao: 'Fatura Atual Consolidada',
      valor: customTotal !== undefined ? customTotal : totalAberto
    });

    try {
      const token = localStorage.getItem('client_token');
      const response = await fetch('/api/financeiro/fatura/gerar-asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          billingType: 'PIX',
          ...(Array.isArray(transacoesIds) && transacoesIds.length > 0 ? { transacoesIds } : {})
        })
      });
      
      const resData = await response.json();
      if (response.ok && resData.success) {
        if (resData.asaasPaymentId) {
          setActivePixPaymentId(resData.asaasPaymentId);
        }
        if (resData.finalValue !== undefined) {
          setSelectedTransactionForPix((prev: any) => prev ? { ...prev, valor: Number(resData.finalValue) } : prev);
        }
        if (resData.qrCode) {
          setPixQrCode(resData.qrCode.encodedImage);
          setPixPayload(resData.qrCode.payload);
        } else {
          setPixError("QR Code não disponível no momento.");
        }
      } else {
        setPixError(resData.message || "Erro ao gerar PIX consolidado.");
      }
    } catch (err) {
      setPixError("Não foi possível conectar ao servidor.");
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  // Optimistic UI states
  const [optimisticReservations, setOptimisticReservations] = useState<any[]>([]);
  const [lastAddedResId, setLastAddedResId] = useState<string | null>(null);

  // Merge external and optimistic reservations
  const [cancelledIds, setCancelledIds] = useState<(string | number)[]>([]);

  const mergedMap = new Map();
  reservations.forEach(r => mergedMap.set(r.id, r));
  optimisticReservations.forEach(r => mergedMap.set(r.id, r));
  cancelledIds.forEach(id => {
    if (mergedMap.has(id)) {
      mergedMap.set(id, { ...mergedMap.get(id), status: 'cancelado' });
    }
  });
  const mergedReservations = Array.from(mergedMap.values());

  const myReservations = mergedReservations.filter(r => r.clienteId === client.id);

  // Selected boat for calendar view
  const [selectedCalendarBoatId, setSelectedCalendarBoatId] = useState<any>(() => {
    return boats && boats.length > 0 ? boats[0].id : null;
  });

  useEffect(() => {
    if (boats && boats.length > 0 && !selectedCalendarBoatId) {
      setSelectedCalendarBoatId(boats[0].id);
    }
  }, [boats, selectedCalendarBoatId]);

  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isCalendarBoatDropdownOpen, setIsCalendarBoatDropdownOpen] = useState(false);
  const [calendarBoatSearchQuery, setCalendarBoatSearchQuery] = useState('');
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [selectedReservationForCheckin, setSelectedReservationForCheckin] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  });
  const [reservationFilter, setReservationFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  // Check-in states
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{title: string, msg: string, type: 'error'|'success'|'warning'} | null>(null);

  const rawTransacoesList = (client as any)?.transacoes || transacoes || [];
  const transacoesList = rawTransacoesList.filter((t: any) => !t.tipo || t.tipo === 'receita');
  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
  
  const totalAberto = transacoesList
    .filter((t: any) => t.status !== 'pago' && t.status !== 'cancelado' && (t.status === 'vencido' || (t.dataVencimento && t.dataVencimento < todayStr)))
    .reduce((acc: number, t: any) => acc + getClientTxUpdatedValue(t).final, 0);

  const isInadimplente = totalAberto > 0 || client?.statusFinanceiro === 'inadimplente';

  const formatClientTxDescription = (t: any): string => {
    if (!t) return '';
    let desc = String(t.descricao || t.categoria || '').trim();
    if (desc.toLowerCase().includes('ref:')) {
      desc = desc
        .replace(/^\s*Ref:\s*/i, '')
        .replace(/\|?\s*Ref:\s*/i, ' - ')
        .replace(/\((\d+)\/(\d+)\)/, ' (Parcela $1/$2)');

      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      desc = desc.replace(/(\d{2})\/(\d{4})/g, (match, m, y) => {
        const monthName = months[parseInt(m, 10) - 1];
        return monthName ? `${monthName}/${y}` : match;
      });
    }
    desc = desc.replace(/^\s*-\s*/, '').trim();
    if (t.categoria && !desc.toLowerCase().includes(String(t.categoria).toLowerCase()) && /^(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\/\d{4}/i.test(desc)) {
      desc = `${t.categoria} - ${desc}`;
    }
    return desc || t.categoria || 'Cobrança';
  };

  const formatClientTxStatus = (t: any, isOverdue: boolean): { label: string; className: string } => {
    const st = String(t?.status || '').toLowerCase();
    if (st === 'pago') {
      return { label: 'Pago', className: 'bg-emerald-500/10 text-emerald-400' };
    }
    if (st === 'cancelado') {
      return { label: 'Cancelado', className: 'bg-white/10 text-white/50' };
    }
    if (st === 'vencido' || isOverdue) {
      return { label: 'Vencido', className: 'bg-rose-500/10 text-rose-400' };
    }
    if (st === 'lancado' || st === 'a_vencer' || st === 'pendente') {
      return { label: 'A Vencer', className: 'bg-amber-500/10 text-amber-400' };
    }
    return { label: st.replace('_', ' ') || 'A Vencer', className: 'bg-amber-500/10 text-amber-400' };
  };



  // NORMAM Preview Modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPDFDoc, setPreviewPDFDoc] = useState<any>(null);
  const [previewFields, setPreviewFields] = useState<any>(null);

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // PWA Install prompt capture
  useEffect(() => {
    // Check if already installed as standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // Show install banner for iOS if not standalone
    if (iosDevice && !standalone) {
      setShowInstallBanner(true);
    }

    // Capture beforeinstallprompt for Android/Chrome
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for successful install
    const handleInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const showToast = (title: string, msg: string, type: 'error'|'success'|'warning' = 'error') => {
    setToastMsg({ title, msg, type });
    setTimeout(() => setToastMsg(null), 5000);
  };

  // Drag-to-scroll para Desktop
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeBoatSlide, setActiveBoatSlide] = useState(0);

  const handleSliderScroll = () => {
    if (!sliderRef.current) return;
    const width = sliderRef.current.clientWidth;
    if (width > 0) {
      const idx = Math.round(sliderRef.current.scrollLeft / width);
      if (idx !== activeBoatSlide) setActiveBoatSlide(idx);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    setIsDown(true);
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDown(false);
  const handleMouseUp = () => setIsDown(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  // Find primary boat (just use the first one available)
  const primaryBoat = boats.length > 0 ? boats[0] : null;

  const handleExportData = () => {
    const dataToExport = {
      cliente: {
        id: client.id,
        nome: client.nome,
        cpf: client.cpf,
        email: client.email,
        telefone: client.telefone,
        statusFinanceiro: client.statusFinanceiro,
        dataCadastro: client.dataCadastro
      },
      embarcacoes: boats.map(b => ({
        id: b.id,
        nome: b.nome,
        tipo: b.tipo,
        modelo: b.modelo
      })),
      agendamentos: myReservations.map(r => ({
        id: r.id,
        data: r.data,
        periodo: r.periodo,
        status: r.status
      })),
      timestamp_exportacao: new Date().toISOString(),
      base_legal: "Art. 18, V - Portabilidade / Direito de Acesso da LGPD"
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dados_cliente_${client.nome.toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRequestDeletion = async () => {
    const confirm = window.confirm(
      "Tem certeza que deseja solicitar a exclusão de seus dados pessoais?\n\nA exclusão será avaliada em até 15 dias pelo Encarregado de Dados (DPO)."
    );
    if (!confirm) return;

    try {
      const token = localStorage.getItem('client_token');
      const response = await fetch('/api/client/request-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      alert(data.message || "Solicitação registrada.");
    } catch {
      alert("Erro ao conectar com o servidor.");
    }
  };

  // --------------------------
  // TAB VIEWS
  // --------------------------

  const _localNow = new Date();
  const todayStrLocal = [
    _localNow.getFullYear(),
    String(_localNow.getMonth() + 1).padStart(2, '0'),
    String(_localNow.getDate()).padStart(2, '0')
  ].join('-');
  const todayReservations = myReservations.filter(r => r.data === todayStrLocal && r.status !== 'cancelado');


  const handleCancelReservation = async (reservationId?: string) => {
    const idToCancel = reservationId;
    if (!idToCancel) return;
    setIsCanceling(true);
    try {
      const token = localStorage.getItem('client_token');
      const response = await fetch('/api/client/cancel-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: idToCancel })
      });
      if (response.ok) {
        showToast('Sucesso', 'Reserva cancelada com sucesso.', 'success');
        setCancelledIds(prev => [...prev, idToCancel]);
        if (onRefresh) onRefresh();
        else window.location.reload();
      } else {
        throw new Error('Falha ao cancelar reserva');
      }
    } catch (err: any) {
      showToast('Erro', err.message || 'Erro ao comunicar com o servidor.', 'error');
    } finally {
      setIsCanceling(false);
      setCancelConfirmId(null);
    }
  };

  const handleDownloadPDF = async (resObj: any) => {
    try {
      const boat = boats.find(b => b.id === resObj.embarcacaoId);
      const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome.split(' ')[0]) : 'M00';
      const boatType = boat ? (boat.tipo === 'jet' ? 'Jetski' : 'Lancha') : 'Lancha';
      
      let finalDate = resObj.data;
      if (finalDate.includes('-')) {
        const p = finalDate.split('-');
        finalDate = `${p[2]} / ${p[1]} / ${p[0]}`;
      }

      await generateAvisoSaidaPDF({
        data: finalDate,
        nome: client.nome,
        tipo: boatType,
        nomeEmbarcacao: boatCode,
        pessoasABordo: String(resObj.pessoasABordo || '0'),
        destino: resObj.destino || 'Não informado',
        previsaoSaida: resObj.previsaoSaida || '00:00',
        previsaoChegada: resObj.previsaoChegada || '00:00',
        observacao: resObj.observações || 'Nenhuma'
      }, { autoPrint: false, download: true });

      showToast('Sucesso', 'PDF do Aviso de Saída baixado com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro', 'Não foi possível baixar o PDF.', 'error');
    }
  };

  const renderHome = () => (
    <div className="flex flex-col flex-1 animate-in fade-in zoom-in-95 duration-500">

      {/* Dynamic Check-in Banners */}
      {todayReservations.map((reservation) => {
        const isCheckedIn = reservation.status === 'confirmado';
        const boatInfo = boats.find(b => b.id === reservation.embarcacaoId);
        
        return (
          <div key={reservation.id} className="px-6 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className={`bg-gradient-to-br ${isCheckedIn ? 'from-[#121c15] to-[#070b08] border-emerald-500/30' : 'from-[#1c1a16] to-[#0a0907] border-[#B69D74]/30'} border rounded-3xl p-5 shadow-2xl relative overflow-hidden`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${isCheckedIn ? 'bg-emerald-500/10' : 'bg-[#B69D74]/20'} rounded-full blur-[40px] translate-x-1/2 -translate-y-1/2 pointer-events-none`}></div>
              
              <div className="relative z-10">
                {isCheckedIn ? (
                  <details className="group">
                    <summary className="flex items-center justify-between list-none cursor-pointer select-none">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-white tracking-wide">Passeio confirmado! {boatInfo ? `- ${getBoatCode(boatInfo)}` : ''}</h2>
                          <p className="text-[10px] text-white/50 mt-0.5">Toque para ver detalhes</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <ChevronDown className="w-4 h-4 text-white/50 group-open:rotate-180 transition-transform duration-300" />
                      </div>
                    </summary>
                    
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-3 text-xs">
                        <div>
                          <span className="block text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Destino</span>
                          <span className="text-white font-medium truncate block">{reservation?.destino || 'Não informado'}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Previsão Saída</span>
                          <span className="text-white font-medium">{reservation?.previsaoSaida || reservation?.horaSaida || '00:00'}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Retorno</span>
                          <span className="text-white font-medium">{reservation?.previsaoChegada || reservation?.horaChegada || '00:00'}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Pessoas</span>
                          <span className="text-white font-medium">{reservation?.pessoasABordo || '1'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDownloadPDF(reservation)}
                          className="flex-1 py-2.5 bg-[#B69D74] hover:bg-[#a38b65] text-slate-900 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Baixar NORMAM
                        </button>

                        {cancelConfirmId === reservation.id ? (
                          <div className="flex-1 flex gap-2">
                            <button 
                              onClick={() => setCancelConfirmId(null)}
                              className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors"
                            >
                              Voltar
                            </button>
                            <button 
                              onClick={() => handleCancelReservation(reservation.id)}
                              disabled={isCanceling}
                              className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg disabled:opacity-50"
                            >
                              {isCanceling ? '...' : 'Cancelar'}
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setCancelConfirmId(reservation.id)}
                            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </details>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#B69D74]/20 flex items-center justify-center">
                          <Anchor className="w-4 h-4 text-[#B69D74] animate-pulse" />
                        </div>
                        <h2 className="text-sm font-semibold text-white tracking-wide">Seu passeio é hoje! {boatInfo ? `- ${getBoatCode(boatInfo)}` : ''}</h2>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        {cancelConfirmId === reservation.id ? (
                          <div className="flex-1 animate-in zoom-in-95 duration-300 bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl">
                            <p className="text-xs text-rose-300 font-medium mb-3">Tem certeza que deseja CANCELAR o passeio de hoje?</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setCancelConfirmId(null)}
                                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors"
                              >
                                Voltar
                              </button>
                              <button 
                                onClick={() => handleCancelReservation(reservation.id)}
                                disabled={isCanceling}
                                className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg disabled:opacity-50"
                              >
                                {isCanceling ? 'Aguarde...' : 'Sim, Cancelar'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => {
                                if (totalAberto > 0) {
                                  showToast('Aviso', 'Você possui valores em aberto. Regularize sua situação para confirmar.', 'warning');
                                  return;
                                }
                                setSelectedReservationForCheckin(reservation);
                                setIsCheckinModalOpen(true);
                              }}
                              className="flex-1 py-2.5 bg-[#B69D74] hover:bg-[#a38b65] text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg"
                            >
                              Confirmar Saída
                            </button>
                            <button 
                              onClick={() => setCancelConfirmId(reservation.id)}
                              className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Central Vehicle Display Carousel */}
      <div className="flex-1 w-full relative mt-2">
        {/* Ambient Glow behind boats */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#B69D74]/20 rounded-full blur-[80px] pointer-events-none"></div>

        {boats.length === 0 ? (
          // Fallback if no boats
          <div className="px-6 flex flex-col items-center justify-center h-full pt-10">
            <div className="w-full bg-[#111]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl relative z-20 text-center">
              <h2 className="text-lg font-medium text-white tracking-wide">Nenhuma embarcação atribuída</h2>
            </div>
          </div>
        ) : (
          <>
            {/* Scrollable Container */}
            <div
              ref={sliderRef}
              onScroll={handleSliderScroll}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className={`w-full flex overflow-x-auto snap-x snap-mandatory subtle-scrollbar hide-scrollbar ${isDown ? 'cursor-grabbing snap-none' : 'cursor-grab'}`}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {boats.map((boat, index) => {
                // Usa a imagem configurada no banco ou fallback com base no tipo
                const isJet = boat.tipo === 'jet' || (boat.nome || '').toLowerCase().includes('jet');
                const fallbackImg = isJet ? boatImgJet : boatImgLancha;
                const imgSource = boat.imagemUrl ? boat.imagemUrl : fallbackImg;

                // Status dinâmico da embarcação
                let boatStatus = { text: 'Pronta para uso', colorClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', pulseClass: 'bg-emerald-500' };
                if (boat.emManutencao) {
                  boatStatus = { text: 'Em Manutenção', colorClass: 'bg-rose-500/10 border-rose-500/20 text-rose-400', pulseClass: 'bg-rose-500' };
                } else {
                  const todaysBoatReservations = mergedReservations.filter(r =>
                    r.embarcacaoId === boat.id && r.data === todayStrLocal && r.status !== 'cancelado'
                  );
                  const activeNavigating = todaysBoatReservations.find(r =>
                    ['descida', 'pier', 'saida', 'chegada'].includes(r.statusMarina || '')
                  );
                  if (activeNavigating) {
                    if (activeNavigating.statusMarina === 'saida') boatStatus = { text: 'Navegando', colorClass: 'bg-blue-500/10 border-blue-500/20 text-blue-400', pulseClass: 'bg-blue-500' };
                    if (activeNavigating.statusMarina === 'descida') boatStatus = { text: 'Em Descida', colorClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400', pulseClass: 'bg-amber-500' };
                    if (activeNavigating.statusMarina === 'pier') boatStatus = { text: 'No Píer', colorClass: 'bg-sky-500/10 border-sky-500/20 text-sky-400', pulseClass: 'bg-sky-500' };
                    if (activeNavigating.statusMarina === 'chegada') boatStatus = { text: 'Verificando Chegada', colorClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400', pulseClass: 'bg-amber-500' };
                  }
                }

                return (
                  <div key={boat.id} className="min-w-full snap-center px-6 flex flex-col items-center relative">

                    {/* Boat Image */}
                    <div className="relative z-10 w-full max-w-[320px] aspect-square flex items-center justify-center [animation:luxury-scale-up_1.5s_cubic-bezier(0.16,1,0.3,1)_forwards]">
                      <img
                        src={imgSource}
                        alt={boat.nome}
                        onError={(e) => {
                          if (e.currentTarget.src !== fallbackImg) {
                            e.currentTarget.src = fallbackImg;
                          }
                        }}
                        className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] [animation:luxury-float_6s_ease-in-out_infinite]"
                        style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
                      />
                    </div>

                    {/* Status Card Glass */}
                    <div className="w-full bg-[#111]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl relative z-20 -mt-10 mb-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Sua Embarcação</p>
                          <h2 className="text-lg font-medium text-white tracking-wide mt-1">{getBoatCode(boat)}</h2>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                          {isJet ? <JetSkiIcon className="w-5 h-5 text-[#B69D74]" /> : <Ship className="w-5 h-5 text-[#B69D74]" />}
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-3">
                        <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-medium uppercase tracking-wider ${boatStatus.colorClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${boatStatus.pulseClass}`}></span>
                          {boatStatus.text}
                        </span>
                        {boat.modelo && (
                          <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] text-white/60 uppercase tracking-wider">
                            {boat.modelo}
                          </span>
                        )}
                      </div>

                      {/* Documentos da Embarcação (Padrão: Documento e Seguro) */}
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Documentos da Embarcação</span>
                          <span className="text-[10px] text-[#B69D74] font-medium flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Acesso Integrado
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDocModal(boat, 'documento')}
                            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/10 text-xs text-white/90 font-medium transition-all cursor-pointer group"
                          >
                            <FileText className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                            <span className="truncate">Documento</span>
                            {boat.documentoUrl && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Disponível" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDocModal(boat, 'seguro')}
                            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/10 text-xs text-white/90 font-medium transition-all cursor-pointer group"
                          >
                            <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <span className="truncate">Seguro</span>
                            {boat.seguroUrl && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Disponível" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Pagination Dots */}
            {boats.length > 1 && (
              <div className="absolute bottom-0 left-0 w-full flex justify-center gap-2 pb-2 z-20">
                {boats.map((b, i) => (
                  <button
                    key={b.id || i}
                    type="button"
                    aria-label={`Ver embarcação ${i + 1}`}
                    onClick={() => {
                      if (sliderRef.current) {
                        sliderRef.current.scrollTo({ left: i * sliderRef.current.clientWidth, behavior: 'smooth' });
                        setActiveBoatSlide(i);
                      }
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      activeBoatSlide === i ? 'w-5 bg-[#B69D74]' : 'w-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Stats or Next Reservation */}
      <div className="px-6 pb-6 mt-8">
        <h3 className="text-xs uppercase tracking-widest text-white/40 mb-4 font-semibold">Próxima Reserva</h3>
        
        {(() => {
          const nextRes = myReservations.filter(r => r.data >= todayStrLocal && r.status !== 'cancelado' && !cancelledIds.includes(r.id)).sort((a,b) => a.data.localeCompare(b.data))[0];
          if (!nextRes) {
            return (
              <div className="bg-white/[0.02] border border-white/5 border-dashed rounded-2xl p-6 text-center">
                <p className="text-xs text-white/30 tracking-wide">Você não possui reservas futuras.</p>
              </div>
            );
          }
          const resDate = new Date(nextRes.data + 'T12:00:00Z');
          const monthName = resDate.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
          const day = resDate.getDate();
          const b = boats.find(b => b.id === nextRes.embarcacaoId) || primaryBoat;
          return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex flex-col items-center justify-center border border-white/5 shrink-0">
                <span className="text-[10px] font-bold text-[#B69D74] uppercase">{monthName}</span>
                <span className="text-base font-light text-white">{day}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Dia Inteiro</p>
                <p className="text-xs text-white/40 mt-0.5">{getBoatCode(b)}</p>
              </div>
              <span className={`text-[9px] px-2.5 py-1 rounded-md uppercase font-bold tracking-wider ${
                nextRes.status === 'confirmado'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {nextRes.status === 'confirmado' ? 'Confirmada' : 'Agendado'}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    
    const days = [];
    // Espaços vazios do início do mês
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleContest = async () => {
    if (!contestationTarget) return;
    setIsContesting(true);
    try {
      const token = localStorage.getItem('client_token');
      const res = await fetch('/api/client/contestar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reservaId: contestationTarget.id,
          embarcacaoId: contestationTarget.embarcacaoId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao realizar contestação.');
      }
      showToast('Sucesso!', 'Reserva contestada e agendada para você com sucesso.', 'success');
      setIsContestationModalOpen(false);
      setContestationTarget(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast('Aviso', err.message, 'error');
    } finally {
      setIsContesting(false);
    }
  };

  const openReservation = (dateObj: Date, isoStr: string, isOccupied: boolean, isClosed: boolean, contestableRes?: any) => {
    const _now = new Date();
    const todayStr = [
      _now.getFullYear(),
      String(_now.getMonth() + 1).padStart(2, '0'),
      String(_now.getDate()).padStart(2, '0')
    ].join('-');
    if (isoStr < todayStr) {
      showToast('Aviso', 'Não é possível realizar agendamentos em datas passadas.', 'warning');
      return;
    }

    if (totalAberto > 0) {
      showToast('Aviso', 'Você possui valores em aberto. Regularize sua situação para realizar agendamentos ou contestações.', 'warning');
      return;
    }

    if (contestableRes) {
      setContestationTarget(contestableRes);
      setIsContestationModalOpen(true);
      return;
    }

    if (isClosed) {
      showToast('Aviso', 'A marina não funciona às segundas e terças para esta embarcação (exceto plano completo).', 'warning');
      return;
    }

    if (isOccupied) {
      showToast('Aviso', 'Esta data já encontra-se ocupada por outro sócio.', 'warning');
      return;
    }

    setSelectedDate(isoStr);
    setIsReservationModalOpen(true);
  };

  const renderCalendar = () => {
    const days = generateCalendarDays();
    const monthName = currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const _now = new Date();
    const todayStr = [
      _now.getFullYear(),
      String(_now.getMonth() + 1).padStart(2, '0'),
      String(_now.getDate()).padStart(2, '0')
    ].join('-');

    // Find active boat selected for calendar view
    const activeBoat = boats.find(b => b.id === selectedCalendarBoatId) || boats[0] || null;
    const activeBoatId = activeBoat ? activeBoat.id : null;

    // Filter reservations specifically for the active boat
    const myBoatReservations = myReservations.filter(r => !activeBoatId || r.embarcacaoId === activeBoatId);
    const occupiedBoatReservations = mergedReservations.filter(r => (!activeBoatId || r.embarcacaoId === activeBoatId) && r.status !== 'cancelado' && r.clienteId !== client.id);

    return (
      <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6 pt-0">
        {/* Multi-Boat Selector (Custom Dropdown for scalability) */}
        {boats.length > 1 && (
          <div className="mb-4 relative">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/50 mb-2 pl-1">
              Selecionar Embarcação
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCalendarBoatDropdownOpen(!isCalendarBoatDropdownOpen)}
                className={`w-full bg-[#111] hover:bg-[#1a1a1a] border rounded-xl pl-11 pr-10 py-3.5 flex items-center justify-between text-sm font-medium text-white transition-all cursor-pointer shadow-sm
                  ${isCalendarBoatDropdownOpen ? 'border-[#B69D74] ring-1 ring-[#B69D74]/50' : 'border-white/10 hover:border-white/20'}`}
              >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Ship className={`w-4 h-4 transition-colors ${isCalendarBoatDropdownOpen ? 'text-[#B69D74]' : 'text-white/40'}`} />
                </div>

                {activeBoat ? (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white tracking-wide">{getBoatCode(activeBoat)}</span>
                    <span className="text-white/30">·</span>
                    <span className="text-white/80">{activeBoat.modelo || (activeBoat.tipo === 'jet' || (activeBoat.nome || '').toLowerCase().includes('jet') ? 'Jetski' : 'Lancha')}</span>
                  </div>
                ) : (
                  <span className="text-white/50">Selecione uma embarcação...</span>
                )}

                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <ChevronDown className={`w-4 h-4 transition-all duration-300 ${isCalendarBoatDropdownOpen ? 'rotate-180 text-[#B69D74]' : 'text-white/40'}`} />
                </div>
              </button>

              {/* Custom Dropdown List */}
              {isCalendarBoatDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsCalendarBoatDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Search Field */}
                    {boats.length > 5 && (
                      <div className="p-2 border-b border-white/[0.05]">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                          <input
                            type="text"
                            placeholder="Buscar embarcação..."
                            value={calendarBoatSearchQuery}
                            onChange={(e) => setCalendarBoatSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-white/30 focus:border-[#B69D74]/50 focus:ring-1 focus:ring-[#B69D74]/50 outline-none transition-all"
                            autoFocus
                          />
                        </div>
                      </div>
                    )}

                    {/* Boat List */}
                    <div className="max-h-[240px] overflow-y-auto subtle-scrollbar p-2">
                      {boats
                        .filter(b =>
                          (b.nome || '').toLowerCase().includes(calendarBoatSearchQuery.toLowerCase()) ||
                          getBoatCode(b).toLowerCase().includes(calendarBoatSearchQuery.toLowerCase())
                        )
                        .map((b) => {
                          const isJet = b.tipo === 'jet' || (b.nome || '').toLowerCase().includes('jet');
                          const TypeIcon = isJet ? JetSkiIcon : Ship;
                          const isSelected = activeBoatId === b.id;

                          // Count reservations
                          const boatResCount = myReservations.filter(r => r.embarcacaoId === b.id && r.data >= todayStr && r.status !== 'cancelado').length;

                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setSelectedCalendarBoatId(b.id);
                                setIsCalendarBoatDropdownOpen(false);
                                setCalendarBoatSearchQuery('');
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 last:mb-0 flex items-center justify-between transition-all cursor-pointer group ${
                                isSelected
                                  ? 'bg-[#B69D74]/15 hover:bg-[#B69D74]/20'
                                  : 'hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                  isSelected
                                    ? 'bg-[#B69D74]/20 border-[#B69D74]/30 text-[#B69D74]'
                                    : 'bg-white/5 border-white/10 text-white/40 group-hover:bg-white/10 group-hover:text-white/70'
                                }`}>
                                  <TypeIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                                      {getBoatCode(b)}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5 block">
                                    {b.modelo || (isJet ? 'Jetski' : 'Lancha')}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {boatResCount > 0 && (
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                                    isSelected
                                      ? 'bg-white/10 text-white/80'
                                      : 'bg-white/5 text-white/50 group-hover:bg-white/10'
                                  }`}>
                                    {boatResCount} res.
                                  </span>
                                )}
                                {isSelected && (
                                  <Check className="w-4 h-4 text-[#B69D74]" />
                                )}
                              </div>
                            </button>
                          );
                      })}

                      {boats.filter(b =>
                        (b.nome || '').toLowerCase().includes(calendarBoatSearchQuery.toLowerCase()) ||
                        getBoatCode(b).toLowerCase().includes(calendarBoatSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="p-4 text-center">
                          <span className="text-xs text-white/40">Nenhuma embarcação encontrada.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Active Boat Header Info Card */}
        {activeBoat && (() => {
          const activeBoatEntry = Array.isArray(client.embarcacoes)
            ? client.embarcacoes.find((eb: any) => eb?.embarcacaoId === activeBoat.id)
            : (client.embarcacaoId === activeBoat.id ? client : null);
          const isPlanoCompleto = activeBoatEntry?.plano === 'completo' || (!activeBoatEntry?.plano && client.plano === 'completo');

          return (
            <div className="mb-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#B69D74]/15 border border-[#B69D74]/30 flex items-center justify-center text-[#B69D74] shrink-0">
                  {activeBoat.tipo === 'jet' ? <JetSkiIcon className="w-6 h-6" /> : <Ship className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wide">{getBoatCode(activeBoat)}</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">
                    Exibindo disponibilidade desta embarcação
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium uppercase tracking-wider shrink-0">
                  {activeBoat.tipo === 'jet' ? 'Jetski' : 'Lancha'}
                </span>
                {isPlanoCompleto ? (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Plano Completo (Seg e Ter Liberados)
                  </span>
                ) : (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 font-medium uppercase tracking-wider">
                    Plano Normal (Qua a Dom)
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Grade do Calendário */}
        <div className="bg-[#111] border border-white/5 rounded-[2rem] p-6 shadow-2xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-light text-white tracking-wider capitalize">{monthName}</h2>
            <div className="flex space-x-2">
              <button onClick={handlePrevMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={handleNextMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-[10px] uppercase font-bold tracking-wider text-white/30 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((dateObj, idx) => {
              if (!dateObj) {
                return <div key={`empty-${idx}`} className="aspect-square rounded-xl bg-transparent" />;
              }

              const isoStr = [
                dateObj.getFullYear(),
                String(dateObj.getMonth() + 1).padStart(2, '0'),
                String(dateObj.getDate()).padStart(2, '0')
              ].join('-');

              // Verificar se a marina está fechada para esta embarcação específica (Segunda = 1, Terça = 2)
              const dayOfWeek = dateObj.getDay();
              const activeBoatEntry = Array.isArray(client.embarcacoes)
                ? client.embarcacoes.find((eb: any) => eb?.embarcacaoId === activeBoatId)
                : (client.embarcacaoId === activeBoatId ? client : null);
              const isPlanoCompletoForActiveBoat = activeBoatEntry?.plano === 'completo' || (!activeBoatEntry?.plano && client.plano === 'completo');
              const isClosed = (dayOfWeek === 1 || dayOfWeek === 2) && !isPlanoCompletoForActiveBoat;

              // Verificar se o CLIENTE tem reserva nessa embarcação ou se está ocupada
              const hasMyReservation = myBoatReservations.find(r => r.data === isoStr && r.status !== 'cancelado');
              const isOccupied = !hasMyReservation && occupiedBoatReservations.find(r => r.data === isoStr);

              // Evitar clicar no passado, dias ocupados ou dias fechados
              const isToday = isoStr === todayStr;
              const past = isoStr < todayStr;

              // Identificar possibilidade de contestação
              let contestableRes = null;
              if (isOccupied && !hasMyReservation && !past) {
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                if (isWeekend && isOccupied.tipoReserva === 'extra') {
                  const rDateObj = new Date(isoStr + "T00:00:00");
                  const hoursUntil = (rDateObj.getTime() - Date.now()) / (1000 * 60 * 60);

                  if (hoursUntil > 48) {
                    const theMonth = dateObj.getMonth();
                    const theYear = dateObj.getFullYear();
                    const usedMyQuota = myBoatReservations.some(r => {
                      if (r.status === 'cancelado') return false;
                      const rr = new Date(r.data + "T12:00:00Z");
                      return rr.getUTCMonth() === theMonth &&
                             rr.getUTCFullYear() === theYear &&
                             rr.getUTCDay() === dayOfWeek;
                    });
                    if (!usedMyQuota) {
                      contestableRes = isOccupied;
                    }
                  }
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => openReservation(dateObj, isoStr, !!isOccupied, isClosed, contestableRes)}
                  className={`
                    relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-300
                    ${(past || (isOccupied && !contestableRes) || isClosed) ? 'opacity-30' : 'hover:scale-105 cursor-pointer shadow-lg'}
                    ${hasMyReservation
                      ? 'bg-[#B69D74]/20 border border-[#B69D74]/40 text-[#B69D74]'
                      : contestableRes
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20'
                        : isOccupied
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                          : 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.15] text-white/70'}
                    ${isToday && !hasMyReservation && !isOccupied && !contestableRes ? 'ring-1 ring-white/20 bg-white/10 text-white' : ''}
                  `}
                >
                  <span className={`text-sm ${hasMyReservation || isOccupied ? 'font-bold' : 'font-medium'}`}>
                    {dateObj.getDate()}
                  </span>

                  {hasMyReservation && (
                    <div className={`w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1 shadow-[0_0_8px_rgba(182,157,116,0.8)] ${hasMyReservation.id === lastAddedResId ? 'animate-[ping_2s_ease-out_1,pulse_2s_infinite]' : ''}`} />
                  )}
                  {contestableRes && !hasMyReservation && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                  )}
                  {isOccupied && !contestableRes && !hasMyReservation && (
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                  )}
                  {!hasMyReservation && !isOccupied && !past && !isClosed && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Plus className="w-5 h-5 text-white/50" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Minhas Reservas</h2>
          <div className="flex bg-white/5 rounded-lg p-1">
            <button 
              onClick={() => setReservationFilter('upcoming')}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${reservationFilter === 'upcoming' ? 'bg-[#B69D74] text-slate-900' : 'text-white/40 hover:text-white/70'}`}
            >
              Próximos
            </button>
            <button 
              onClick={() => setReservationFilter('past')}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${reservationFilter === 'past' ? 'bg-[#B69D74] text-slate-900' : 'text-white/40 hover:text-white/70'}`}
            >
              Anteriores
            </button>
            <button 
              onClick={() => setReservationFilter('all')}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${reservationFilter === 'all' ? 'bg-[#B69D74] text-slate-900' : 'text-white/40 hover:text-white/70'}`}
            >
              Todos
            </button>
          </div>
        </div>

        {(() => {
          const displayedReservations = myReservations.filter(res => {
            const isFuture = res.data >= todayStr;
            const matchesBoat = !activeBoatId || res.embarcacaoId === activeBoatId;
            if (!matchesBoat) return false;
            if (reservationFilter === 'upcoming') return isFuture && res.status !== 'cancelado';
            if (reservationFilter === 'past') return !isFuture;
            return true;
          }).sort((a,b) => {
            if (reservationFilter === 'past') return b.data.localeCompare(a.data);
            return a.data.localeCompare(b.data);
          });

          if (displayedReservations.length === 0) {
            return (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-12">
                <Calendar className="w-12 h-12 text-[#B69D74] mb-4" />
                <p className="text-sm font-light text-white tracking-wide">Nenhuma reserva encontrada</p>
                <p className="text-xs text-white/40 mt-2 max-w-[200px]">Altere o filtro ou realize um novo agendamento.</p>
              </div>
            );
          }

          return (
            <div className="space-y-4 pb-12">
              {displayedReservations.map(res => {
              const boat = boats.find(b => b.id === res.embarcacaoId);
              const isFuture = res.data >= todayStrLocal;
              const isNew = res.id === lastAddedResId;
              return (
                <div key={res.id} className={`bg-[#111] border ${isNew ? 'border-[#B69D74]/50 shadow-[0_0_15px_rgba(182,157,116,0.15)] animate-in slide-in-from-top-4' : 'border-white/5'} rounded-2xl p-5 flex items-center gap-4 transition-all hover:border-white/10`}>
                  <div className={`w-14 h-14 rounded-2xl ${isNew ? 'bg-[#B69D74]/10' : 'bg-white/5'} flex items-center justify-center shrink-0 shadow-inner`}>
                    <Calendar className="w-6 h-6 text-[#B69D74]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-base tracking-wide">
                      {res.data.split('-').reverse().join('/')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Anchor className="w-3 h-3 text-[#B69D74]" />
                      <p className="text-xs text-white/50 truncate">
                        {getBoatCode(boat)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      res.status === 'cancelado' 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : !isFuture
                          ? 'bg-white/5 text-white/60 border border-white/10'
                          : res.status === 'confirmado'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {res.status === 'cancelado' ? 'Cancelado' : (!isFuture ? 'Concluída' : (res.status === 'confirmado' ? 'Confirmado' : 'Agendado'))}
                    </span>
                    {res.status === 'confirmado' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(res);
                        }}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-medium text-[#B69D74] transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                    )}
                    {isFuture && res.status !== 'cancelado' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Deseja realmente cancelar esta reserva?")) {
                            handleCancelReservation(res.id);
                          }
                        }}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-[10px] font-medium text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Cancelar
                      </button>
                    )}
                    {res.data === todayStrLocal && res.status !== 'cancelado' && res.status !== 'confirmado' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (totalAberto > 0) {
                            showToast('Aviso', 'Você possui valores em aberto. Regularize sua situação para confirmar.', 'warning');
                            return;
                          }
                          setSelectedReservationForCheckin(res);
                          setIsCheckinModalOpen(true);
                        }}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#B69D74]/10 hover:bg-[#B69D74]/20 border border-[#B69D74]/20 rounded-xl text-[10px] font-medium text-[#B69D74] transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Confirmar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          );
        })()}

      </div>
    );
  };

  const renderFinance = () => {
    // totalAberto is computed at component top level

    const getTransactionIcon = (categoria: string) => {
      const cat = categoria?.toLowerCase() || '';
      if (cat.includes('mensalidade') || cat.includes('cota')) return <Calendar className="w-4 h-4 text-[#B69D74]" />;
      if (cat.includes('combust')) return <Droplets className="w-4 h-4 text-rose-400" />;
      if (cat.includes('servi')) return <Wrench className="w-4 h-4 text-blue-400" />;
      return <CreditCard className="w-4 h-4 text-white/50" />;
    };

    return (
      <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6 pt-0 pb-24">
        {/* Cartão Estilo Black Card */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#111111] to-[#050505] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden mb-8 group">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#B69D74]/10 rounded-full blur-[50px] translate-x-1/3 -translate-y-1/3"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#B69D74] to-[#e5d3b3] flex items-center justify-center p-[1px]">
                  <div className="w-full h-full bg-[#111] rounded-full flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-[#B69D74]" />
                  </div>
                </div>
                <span className="text-xs font-medium text-white/60 tracking-wider">VILA NÁUTICA</span>
              </div>
              
              <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border backdrop-blur-sm ${
                isInadimplente
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {isInadimplente ? 'Em Aberto' : 'Em Dia'}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Total Vencido</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg text-white/60 font-light">R$</span>
                <h2 className="text-4xl font-light text-white tracking-tight">
                  {totalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/30 font-medium">
              <span>Status: {isInadimplente ? 'Requer Atenção' : 'Regular'}</span>
              <span className="text-[#B69D74]">{client.plano === 'completo' ? 'Plano Completo' : 'Cotista Titular'}</span>
            </div>
          </div>
        </div>

        {/* Abas Estilo Toggle Pill */}
        <div className="flex p-1 bg-white/5 rounded-2xl mb-6 backdrop-blur-sm border border-white/5">
          <button 
            onClick={() => setFinanceTab('fatura')}
            className={`flex-1 py-2.5 text-xs uppercase tracking-widest font-semibold rounded-xl transition-all duration-300 ${
              financeTab === 'fatura' 
                ? 'bg-gradient-to-r from-[#B69D74]/20 to-[#B69D74]/10 text-[#B69D74] shadow-sm' 
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            Fatura
          </button>
          <button 
            onClick={() => setFinanceTab('extrato')}
            className={`flex-1 py-2.5 text-xs uppercase tracking-widest font-semibold rounded-xl transition-all duration-300 ${
              financeTab === 'extrato' 
                ? 'bg-gradient-to-r from-[#B69D74]/20 to-[#B69D74]/10 text-[#B69D74] shadow-sm' 
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            Extrato
          </button>
        </div>
        
        {/* Lista de Transações */}
        <AnimatePresence mode="wait">
          <motion.div
            key={financeTab}
            variants={subTabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-4"
          >
          {(() => {
            const filteredTransacoes = transacoesList.filter((t: any) => {
              if (financeTab === 'fatura') {
                return t.status !== 'pago' && t.status !== 'cancelado';
              }
              return t.status === 'pago';
            });

            if (filteredTransacoes.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/[0.02] border border-white/5 border-dashed rounded-3xl">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-5 h-5 text-white/20" />
                  </div>
                  <p className="text-sm text-white/40 text-center font-medium">Nenhuma movimentação por aqui.</p>
                  <p className="text-xs text-white/30 text-center mt-1">Você está com tudo em dia.</p>
                </div>
              );
            }

            const sortedTransacoes = [...filteredTransacoes].sort((a, b) => {
              const dateA = a.dataVencimento ? new Date(a.dataVencimento + "T12:00:00").getTime() : 0;
              const dateB = b.dataVencimento ? new Date(b.dataVencimento + "T12:00:00").getTime() : 0;
              return financeTab === 'extrato' ? dateB - dateA : dateA - dateB;
            });

            let currentList = sortedTransacoes;
            let futureList: any[] = [];

            if (financeTab === 'fatura') {
              const windowLimitDate = new Date();
              windowLimitDate.setDate(windowLimitDate.getDate() + (finConfig.diasFaturaAtual || 30));

              currentList = sortedTransacoes.filter(t => {
                if (!t.dataVencimento) return true;
                const vDate = new Date(t.dataVencimento + "T12:00:00");
                return vDate <= windowLimitDate || t.status === 'vencido';
              });

              futureList = sortedTransacoes.filter(t => {
                if (!t.dataVencimento) return false;
                const vDate = new Date(t.dataVencimento + "T12:00:00");
                return vDate > windowLimitDate && t.status !== 'vencido';
              });
            }

            const renderTransaction = (t: any) => {
              const calc = getClientTxUpdatedValue(t);
              const desc = formatClientTxDescription(t);
              const stInfo = formatClientTxStatus(t, calc.isOverdue);
              return (
              <div 
                key={t.id} 
                onClick={() => setSelectedTransactionDetails(t)}
                className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl p-4 transition-all duration-300 overflow-hidden cursor-pointer flex-shrink-0"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    {getTransactionIcon(t.categoria)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="text-sm font-medium text-white truncate pr-2" title={desc}>{desc}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold whitespace-nowrap text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calc.final)}
                        </span>
                        {calc.isOverdue && calc.fees > 0 && (
                          <span className="text-[9px] text-rose-400/80 whitespace-nowrap">
                            Orig: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calc.original)} + encargos
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[11px] text-white/40">
                        Vencimento: <span className="text-white/60 font-medium">{t.dataVencimento ? t.dataVencimento.split('-').reverse().join('/') : ''}</span>
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${stInfo.className}`}>
                        {stInfo.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              );
            };

            return (
              <div className="space-y-3">
                {financeTab === 'fatura' && currentList.length > 1 && (() => {
                  const totalAtual = Number(currentList.reduce((acc, curr) => acc + getClientTxUpdatedValue(curr).final, 0).toFixed(2));
                  const currentIds = currentList.map(curr => curr.id);
                  const totalFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAtual);
                  const bulkClass = "w-full mb-2 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#B69D74]/20 to-[#B69D74]/10 hover:from-[#B69D74]/30 hover:to-[#B69D74]/20 border border-[#B69D74]/20 rounded-2xl text-xs font-bold uppercase tracking-widest text-[#B69D74] transition-all duration-300 shadow-lg";
                  return pagamentosHabilitados ? (
                    <button 
                      onClick={() => handleOpenBulkPixPayment(currentIds, totalAtual)}
                      className={bulkClass}
                    >
                      <QrCode className="w-4 h-4" />
                      Pagar Fatura Atual ({totalFmt})
                    </button>
                  ) : (
                    <a
                      id="btn-pagar-fatura-whatsapp"
                      href={buildFinanceiroWhatsAppUrl('Fatura atual', totalAtual)}
                      target="_blank"
                      rel="noreferrer"
                      className={bulkClass}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Pagar Fatura via Financeiro ({totalFmt})
                    </a>
                  );
                })()}

                {currentList.map(renderTransaction)}

                {futureList.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowFutureInvoices(!showFutureInvoices)}
                      className="w-full flex items-center justify-center gap-2 py-2 text-[11px] uppercase tracking-wider font-bold text-white/30 hover:text-white/60 transition-colors mt-2"
                    >
                      {showFutureInvoices ? 'Ocultar Lançamentos Futuros' : `Ver Lançamentos Futuros (${futureList.length})`}
                    </button>
                    {showFutureInvoices && (
                       <div className="space-y-3 mt-3">
                         {futureList.map(renderTransaction)}
                       </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceFormData.embarcacaoId || !maintenanceFormData.titulo || !maintenanceFormData.descricaoAvaria) {
      showToast('Aviso', "Preencha todos os campos obrigatórios.", 'warning');
      return;
    }

    setIsMaintenanceSubmitting(true);
    try {
      await chamadoDB.create({
        embarcacaoId: maintenanceFormData.embarcacaoId,
        solicitanteTipo: 'cliente',
        solicitanteNome: client.nome,
        clienteId: client.id,
        titulo: maintenanceFormData.titulo,
        descricaoAvaria: maintenanceFormData.descricaoAvaria,
        urgencia: maintenanceFormData.urgencia,
        status: 'pendente',
        dataAbertura: new Date().toISOString().split('T')[0]
      });

      showToast('Sucesso', 'Seu chamado foi aberto com sucesso.', 'success');
      setTimeout(() => {
        setIsMaintenanceSubmitting(false);
        setMaintenanceView('list');
        if (onRefresh) onRefresh();
      }, 500);

      setMaintenanceFormData({
        embarcacaoId: boats.length === 1 ? boats[0].id : '',
        titulo: '',
        descricaoAvaria: '',
        urgencia: 'baixa'
      });
    } catch (err) {
      setIsMaintenanceSubmitting(false);
      console.error(err);
      showToast('Erro', 'Ocorreu um erro ao criar o chamado.', 'error');
    }
  };

  const getStatusBadge = (status: string, chamadoObj?: any) => {
    if (status === 'os_gerada' && chamadoObj) {
      const linkedOS = (manutencoes || []).find((m: any) =>
        (m.chamadoId && String(m.chamadoId) === String(chamadoObj.id)) ||
        (chamadoObj.codigoOS && m.codigoOS === chamadoObj.codigoOS) ||
        (m.embarcacaoId === chamadoObj.embarcacaoId && m.tituloChamado && m.tituloChamado === chamadoObj.titulo)
      );
      if (linkedOS) {
        if (linkedOS.status === 'aguardando_orcamento') {
          return <span className="bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-500/30">Aguard. Orç. (O.S.)</span>;
        }
        if (linkedOS.status === 'aguardando_aprovacao') {
          return <span className="bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full text-xs font-medium border border-indigo-500/30">Aguard. Aprov. (O.S.)</span>;
        }
        if (linkedOS.status === 'concluido') {
          return <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-500/30">Concluído</span>;
        }
      }
    }
    switch (status) {
      case 'pendente': return <span className="bg-slate-500/20 text-slate-400 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-500/30">Pendente</span>;
      case 'em_analise': return <span className="bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-500/30">Em Análise</span>;
      case 'os_gerada': return <span className="bg-sky-500/20 text-sky-400 px-2.5 py-1 rounded-full text-xs font-medium border border-sky-500/30">O.S. Gerada</span>;
      case 'concluido': return <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-500/30">Concluído</span>;
      case 'rejeitado': return <span className="bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded-full text-xs font-medium border border-rose-500/30">Rejeitado</span>;
      case 'descartado': return <span className="bg-zinc-500/20 text-zinc-400 px-2.5 py-1 rounded-full text-xs font-medium border border-zinc-500/30">Descartado</span>;
      default: return <span className="bg-slate-500/20 text-slate-400 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-500/30">{status}</span>;
    }
  };

  const getUrgenciaIcon = (urgencia: string) => {
    switch (urgencia) {
      case 'critica': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'alta': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'media': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'baixa': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <CheckCircle2 className="w-4 h-4 text-slate-500" />;
    }
  };

  const renderMaintenance = () => {
    const validChamadoStatuses = ['pendente', 'em_analise', 'os_gerada', 'concluido'];
    const filteredChamados = chamados.filter(c =>
      c.solicitanteTipo === 'cliente' &&
      c.clienteId === client.id &&
      validChamadoStatuses.includes(c.status) &&
      (c.titulo.toLowerCase().includes(maintenanceSearch.toLowerCase()) ||
       (c.codigoChamado || '').toLowerCase().includes(maintenanceSearch.toLowerCase()))
    );

    const qLower = maintenanceSearch.toLowerCase();
    const filteredServicos = (manutencoes || []).filter(m =>
      (m.titulo || '').toLowerCase().includes(qLower) ||
      (m.tituloChamado || '').toLowerCase().includes(qLower) ||
      (m.descricaoServico || '').toLowerCase().includes(qLower) ||
      (m.codigoOS || '').toLowerCase().includes(qLower)
    );

    const getServicoStatus = (status) => {
      switch (status) {
        case 'aguardando_orcamento': return { label: 'Aguard. Orç.', color: 'text-amber-500', bg: 'bg-amber-500/10' };
        case 'aguardando_aprovacao': return { label: 'Aguard. Aprov.', color: 'text-indigo-400', bg: 'bg-indigo-400/10' };
        case 'em_execucao': return { label: 'Em Execução', color: 'text-blue-400', bg: 'bg-blue-400/10' };
        case 'concluido': return { label: 'Concluído', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
        case 'reprovado': return { label: 'Reprovado', color: 'text-rose-500', bg: 'bg-rose-500/10' };
        default: return { label: status, color: 'text-slate-400', bg: 'bg-white/5' };
      }
    };

    return (
      <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6 pt-0">

        {/* Apple Design Top Navigation Pill */}
        {maintenanceView === 'list' && (
          <div className="mb-4">
            <div className="flex bg-white/5 border border-white/5 rounded-xl p-1 relative">
              <div
                className="absolute inset-y-1 w-[calc(50%-4px)] bg-[#B69D74] rounded-lg shadow-sm transition-all duration-300 ease-[cubic-bezier(0.2,1,0.2,1)]"
                style={{ left: maintenanceSubTab === 'chamados' ? '4px' : 'calc(50%)' }}
              />
              <button
                onClick={() => setMaintenanceSubTab('chamados')}
                className={`flex-1 py-1.5 text-xs font-semibold z-10 transition-colors duration-300 ${maintenanceSubTab === 'chamados' ? 'text-white drop-shadow-md' : 'text-white/40 hover:text-white/70'}`}
              >
                Atendimento
              </button>
              <button
                onClick={() => setMaintenanceSubTab('servicos')}
                className={`flex-1 py-1.5 text-xs font-semibold z-10 transition-colors duration-300 ${maintenanceSubTab === 'servicos' ? 'text-white drop-shadow-md' : 'text-white/40 hover:text-white/70'}`}
              >
                O.S. / Serviços
              </button>
            </div>
          </div>
        )}

        {maintenanceView === 'list' && maintenanceSubTab === 'chamados' && (
          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-300">
            <div className="pb-4 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder="Buscar chamados..."
                  value={maintenanceSearch}
                  onChange={(e) => setMaintenanceSearch(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#B69D74] focus:ring-1 focus:ring-[#B69D74] transition-all outline-none"
                />
              </div>
              <button
                onClick={() => setMaintenanceView('create')}
                className="bg-[#B69D74] hover:bg-[#a38b65] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo</span>
              </button>
            </div>

            <div className="flex-1 space-y-4 pt-2">
              {filteredChamados.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/[0.02] border border-white/[0.05] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wrench className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-white/80 font-medium mb-1">Nenhum chamado encontrado</h3>
                  <p className="text-sm text-white/40 mb-6">Você ainda não solicitou nenhuma manutenção.</p>
                  <button
                    onClick={() => setMaintenanceView('create')}
                    className="text-[#B69D74] hover:text-[#a38b65] font-medium text-sm transition-colors cursor-pointer"
                  >
                    + Criar primeiro chamado
                  </button>
                </div>
              ) : (
                filteredChamados.map(chamado => {
                  const boat = boats.find(b => b.id === chamado.embarcacaoId);
                  return (
                    <div
                      key={chamado.id}
                      onClick={() => {
                        if (chamado.status === 'os_gerada') {
                          setMaintenanceSubTab('servicos');
                        }
                      }}
                      className={`bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 hover:border-white/[0.1] transition-all ${chamado.status === 'os_gerada' ? 'active:scale-[0.98] cursor-pointer' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-mono text-white/40">{chamado.codigoChamado || 'Local'}</span>
                            {getStatusBadge(chamado.status, chamado)}
                          </div>
                          <h4 className="text-white font-medium">{chamado.titulo}</h4>
                          {chamado.descricaoAvaria && (
                            <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{chamado.descricaoAvaria}</p>
                          )}
                          {(chamado as any).observacoesAnalise && (
                            <p className="text-[11px] text-[#B69D74]/90 bg-[#B69D74]/10 border border-[#B69D74]/20 rounded-lg px-2.5 py-1.5 mt-1">
                              <strong>Parecer Técnico:</strong> {(chamado as any).observacoesAnalise}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-white/40 pt-1">
                            <p className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(chamado.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="flex items-center gap-1.5" title="Urgência">
                              {getUrgenciaIcon(chamado.urgencia)}
                              <span className="capitalize">{chamado.urgencia}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0 shrink-0">
                          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">Embarcação</p>
                          <p className="text-sm font-medium text-white/80">
                            {boat ? getBoatCode(boat) : 'Excluída'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {maintenanceView === 'list' && maintenanceSubTab === 'servicos' && (
          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-300">
            <div className="pb-4 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder="Buscar O.S. e serviços..."
                  value={maintenanceSearch}
                  onChange={(e) => setMaintenanceSearch(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#B69D74] focus:ring-1 focus:ring-[#B69D74] transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex-1 space-y-4 pt-2">
              {filteredServicos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/[0.02] border border-white/[0.05] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Database className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-white/80 font-medium mb-1">Nenhum serviço encontrado</h3>
                  <p className="text-sm text-white/40">Sua embarcação não possui ordens de serviço ativas.</p>
                </div>
              ) : (
                filteredServicos.map(s => {
                  const boat = boats.find(b => b.id === s.embarcacaoId);
                  const st = getServicoStatus(s.status);
                  return (
                    <div
                      key={s.id}
                      className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 mr-3">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[10px] font-bold tracking-wider text-[#B69D74] uppercase bg-[#B69D74]/10 px-2 py-0.5 rounded-md">
                              {s.codigoOS}
                            </span>
                            {s.categoria && (
                              <span className="text-[10px] font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {s.categoria.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-white leading-snug">{s.titulo || s.tituloChamado || s.tipo?.nome || 'Serviço em Embarcação'}</h4>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${st.bg} ${st.color}`}>
                          {st.label}
                        </div>
                      </div>

                      {s.descricaoServico && (
                        <p className="text-xs text-white/50 mb-3 line-clamp-2 leading-relaxed">
                          {s.descricaoServico}
                        </p>
                      )}

                      {/* Financial info if it is finalized / approved / budget generated */}
                      {(s.custoTotal > 0 || (s.orcamento && s.orcamento > 0) || (s.valorRepassado && s.valorRepassado > 0)) && s.orcamentoStatus !== 'reprovado' && (
                        <div className="mb-3 p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04] flex items-center justify-between">
                          <span className="text-xs text-white/50 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-white/30"/> Custo Total Orçado</span>
                          <span className="text-sm font-bold text-white tracking-wide">
                            {(s.valorRepassado || s.orcamento || s.custoTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      )}

                      {/* Detalhamento dos itens do orçamento para o cliente */}
                      {s.pecas && Array.isArray(s.pecas) && s.pecas.length > 0 && s.orcamentoStatus !== 'reprovado' && (
                        <div className="mb-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/40 pb-1 border-b border-white/[0.04]">
                            <span>Itens & Serviços Orçados ({s.pecas.length})</span>
                            <span>Subtotal</span>
                          </div>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto subtle-scrollbar">
                            {s.pecas.map((item: any, itIdx: number) => {
                              const itemQtd = Number(item.quantidade) || 1;
                              const itemVal = Number(item.valorUnitario) || 0;
                              const sub = itemQtd * itemVal;
                              return (
                                <div key={itIdx} className="flex items-center justify-between text-xs text-white/80">
                                  <span className="truncate pr-2">
                                    <span className="font-bold text-[#B69D74]">{itemQtd}x</span> {item.nome}
                                    {itemQtd > 1 && itemVal > 0 && (
                                      <span className="text-[10px] text-white/40 ml-1">
                                        ({itemVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} un.)
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-semibold text-white/95 whitespace-nowrap">
                                    {sub.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-white/40 pt-3 border-t border-white/5 mt-1">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5">
                            <Anchor className="w-3.5 h-3.5 text-white/30" />
                            {boat ? getBoatCode(boat) : 'Embarcação'}
                          </span>
                        </div>
                        {(() => {
                          const rawDate = s.dataEntradaOficina || s.dataChamado || s.dataSaida || s.createdAt;
                          if (!rawDate) return null;
                          const parsed = new Date(rawDate);
                          if (isNaN(parsed.getTime())) return null;
                          return (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-white/30" />
                              {parsed.toLocaleDateString('pt-BR')}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {maintenanceView === 'create' && (
          <div className="flex-1 subtle-scrollbar pt-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-light text-white">Novo Chamado</h2>
                <p className="text-xs text-white/40 mt-1">Peças e Serviços</p>
              </div>
            </div>

            <form onSubmit={handleMaintenanceSubmit} className="space-y-6">
              <div className="space-y-4 bg-white/[0.02] p-5 rounded-2xl border border-white/[0.05]">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Embarcação</label>
                  <select
                    value={maintenanceFormData.embarcacaoId}
                    onChange={e => setMaintenanceFormData(p => ({ ...p, embarcacaoId: e.target.value }))}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#B69D74] focus:ring-1 focus:ring-[#B69D74] outline-none transition-all cursor-pointer"
                    required
                  >
                    <option value="" disabled>Selecione a embarcação...</option>
                    {boats.map(boat => (
                      <option key={boat.id} value={boat.id}>{boat.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Título do Reparo</label>
                  <input
                    type="text"
                    value={maintenanceFormData.titulo}
                    onChange={e => setMaintenanceFormData(p => ({ ...p, titulo: e.target.value }))}
                    placeholder="Ex: Revisão do motor, Troca de hélice..."
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#B69D74] focus:ring-1 focus:ring-[#B69D74] outline-none transition-all placeholder-white/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Urgência</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'baixa', label: 'Baixa', icon: CheckCircle2, color: 'emerald' },
                      { id: 'media', label: 'Média', icon: AlertTriangle, color: 'amber' },
                      { id: 'alta', label: 'Alta', icon: AlertTriangle, color: 'orange' },
                      { id: 'critica', label: 'Crítica', icon: ShieldAlert, color: 'rose' }
                    ].map(u => {
                      const Icon = u.icon;
                      const isActive = maintenanceFormData.urgencia === u.id;

                      let activeClasses = "";
                      if (u.id === 'baixa') activeClasses = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]';
                      else if (u.id === 'media') activeClasses = 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]';
                      else if (u.id === 'alta') activeClasses = 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]';
                      else activeClasses = 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]';

                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setMaintenanceFormData(p => ({ ...p, urgencia: u.id as any }))}
                          className={`flex flex-col items-center justify-center py-4 rounded-xl border text-xs gap-2 transition-all cursor-pointer ${
                            isActive
                              ? activeClasses
                              : 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/5 hover:text-white/60'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {u.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Descrição do Problema</label>
                  <textarea
                    value={maintenanceFormData.descricaoAvaria}
                    onChange={e => setMaintenanceFormData(p => ({ ...p, descricaoAvaria: e.target.value }))}
                    placeholder="Descreva com detalhes o que precisa ser feito..."
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#B69D74] focus:ring-1 focus:ring-[#B69D74] outline-none transition-all placeholder-white/20 resize-none"
                    rows={4}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 pb-10">
                <button
                  type="button"
                  onClick={() => setMaintenanceView('list')}
                  className="flex-1 px-4 py-3 border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] rounded-xl text-white/70 font-medium text-sm transition-all cursor-pointer active:scale-95"
                  disabled={isMaintenanceSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-4 py-3 bg-[#B69D74] hover:bg-[#a38b65] text-white rounded-xl font-medium text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex justify-center"
                  disabled={isMaintenanceSubmitting}
                >
                  {isMaintenanceSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Solicitar Manutenção'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="h-[100dvh] w-full bg-[#020202] text-white font-sans relative overflow-x-hidden overflow-y-auto pb-24 selection:bg-[#B69D74]/30">

      {/* Ambient Dark Background Effect */}
      <div className="fixed inset-0 pointer-events-none opacity-40 mix-blend-screen z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.015)_0%,_transparent_60%)]"></div>
      </div>

      {/* Main Content Area (Mobile Container Logic) */}
      <div className="relative z-10 w-full max-w-[480px] mx-auto min-h-max flex flex-col">
        {/* Shared Header Start */}
        <div className="flex items-center justify-between px-6 pb-4 pt-[max(env(safe-area-inset-top),1.5rem)]">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#B69D74] font-semibold">Bem-vindo(a)</p>
            <h1 className="text-xl font-light tracking-wide text-white mt-1">{client.nome.split(' ')[0]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative backdrop-blur-md active:bg-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-white/70 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowProfilePanel(true)}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors"
            >
              <User className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>
        {/* Shared Header End */}

        <AnimatePresence mode="wait" custom={tabDirection}>
          <motion.div
            key={activeTab}
            custom={tabDirection}
            variants={pageTabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full flex-1 flex flex-col"
          >
            {activeTab === 'home' && renderHome()}
            {activeTab === 'calendar' && renderCalendar()}
            {activeTab === 'finance' && renderFinance()}
            {activeTab === 'maintenance' && renderMaintenance()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation (iPhone Style Glassmorphism) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 px-4 pb-6 pt-4 bg-[#050505]/90 backdrop-blur-2xl border-t border-white/[0.04] pwa-safe-bottom">
        <div className="max-w-[400px] mx-auto flex items-center justify-between px-2 relative">
          
          <button
            onClick={() => handleTabChange('home')}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 px-1 z-10 cursor-pointer"
          >
            <Home className={`w-6 h-6 transition-colors duration-300 ${activeTab === 'home' ? 'text-[#B69D74]' : 'text-white/30'}`} />
            <span className={`text-[9px] uppercase tracking-wider font-semibold transition-colors duration-300 ${activeTab === 'home' ? 'text-[#B69D74]' : 'text-transparent'}`}>
              Início
            </span>
          </button>

          <button
            onClick={() => handleTabChange('calendar')}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 px-1 z-10 cursor-pointer"
          >
            <Calendar className={`w-6 h-6 transition-colors duration-300 ${activeTab === 'calendar' ? 'text-[#B69D74]' : 'text-white/30'}`} />
            <span className={`text-[9px] uppercase tracking-wider font-semibold transition-colors duration-300 ${activeTab === 'calendar' ? 'text-[#B69D74]' : 'text-transparent'}`}>
              Reservas
            </span>
          </button>

          {/* Spacer for Floating Button */}
          <div className="w-[72px] shrink-0"></div>

          {/* Action Menu Floating Backdrop */}
          {isActionMenuOpen && (
            <div 
              onClick={() => setIsActionMenuOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 animate-in fade-in duration-300"
            />
          )}

          {/* Action Menu Popover Sheet */}
          {isActionMenuOpen && (
            <div className="fixed bottom-24 inset-x-0 mx-auto w-[calc(100%-2rem)] max-w-[400px] z-50 animate-spring-pop">
              <div className="bg-[#121212]/95 border border-white/10 rounded-[2rem] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl space-y-2.5">
                <div className="text-center pt-1 pb-2 border-b border-white/[0.06]">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#B69D74]">
                    Menu de Solicitantes
                  </span>
                </div>

                {/* Option 1: Agendamento */}
                <button
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    if (totalAberto > 0) {
                      showToast('Aviso', 'Você possui valores em aberto. Regularize sua situação para realizar agendamentos.', 'warning');
                      return;
                    }
                    const targetBoatId = selectedCalendarBoatId || (boats[0] && boats[0].id);
                    const boatEntry = Array.isArray(client.embarcacoes)
                      ? client.embarcacoes.find((eb: any) => eb?.embarcacaoId === targetBoatId)
                      : (client.embarcacaoId === targetBoatId ? client : null);
                    const isPlanoComp = boatEntry?.plano === 'completo' || (!boatEntry?.plano && client.plano === 'completo');
                    const d = new Date();
                    for (let i = 0; i < 60; i++) {
                      const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
                      const dow = candidate.getDay();
                      const candIso = [
                        candidate.getFullYear(),
                        String(candidate.getMonth() + 1).padStart(2, '0'),
                        String(candidate.getDate()).padStart(2, '0')
                      ].join('-');
                      const closed = (dow === 1 || dow === 2) && !isPlanoComp;
                      const occupied = mergedReservations.some((r: any) => r.embarcacaoId === targetBoatId && r.data === candIso && r.status !== 'cancelado');
                      if (!closed && !occupied) {
                        setSelectedDate(candIso);
                        break;
                      }
                    }
                    setIsReservationModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-[#B69D74]/15 border border-white/[0.05] hover:border-[#B69D74]/30 transition-all duration-200 group text-left cursor-pointer animate-item-stagger-1"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#B69D74]/10 border border-[#B69D74]/20 flex items-center justify-center text-[#B69D74] group-hover:scale-110 transition-transform duration-300">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white group-hover:text-[#B69D74] transition-colors">
                        Agendamento
                      </h4>
                      <p className="text-[11px] text-white/40 font-light">
                        Reserve uma data para sua lancha ou jet
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-[#B69D74] group-hover:translate-x-1 transition-all" />
                </button>

                {/* Option 2: Manutenção */}
                <button
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    handleTabChange('maintenance');
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-amber-500/15 border border-white/[0.05] hover:border-amber-500/30 transition-all duration-200 group text-left cursor-pointer animate-item-stagger-2"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">
                        Manutenção
                      </h4>
                      <p className="text-[11px] text-white/40 font-light">
                        Reporte reparos ou revisão da embarcação
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </button>

                {/* Option 3: Ticket para Administração */}
                <button
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    setIsTicketModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-sky-500/15 border border-white/[0.05] hover:border-sky-500/30 transition-all duration-200 group text-left cursor-pointer animate-item-stagger-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform duration-300">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white group-hover:text-sky-400 transition-colors">
                        Ticket para Administração
                      </h4>
                      <p className="text-[11px] text-white/40 font-light">
                        Abra um chamado direto com a equipe
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
                </button>

              </div>
            </div>
          )}

          {/* Central Floating Action Button */}
          <div className="absolute left-1/2 -top-10 -translate-x-1/2 z-50 pointer-events-auto">
            <button
              onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(182,157,116,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 border-[4px] border-[#050505] cursor-pointer ${
                isActionMenuOpen
                  ? 'bg-rose-600 shadow-[0_10px_30px_rgba(225,29,72,0.5)] rotate-45'
                  : 'bg-gradient-to-tr from-[#B69D74] to-[#cbb28b] hover:from-[#a38b65] hover:to-[#B69D74]'
              }`}
              title={isActionMenuOpen ? "Fechar" : "Menu de Ações"}
            >
              <Plus className={`w-7 h-7 transition-colors duration-300 ${isActionMenuOpen ? 'text-white' : 'text-slate-900'}`} />
            </button>
          </div>

          <button
            onClick={() => handleTabChange('finance')}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 px-1 z-10 cursor-pointer"
          >
            <Wallet className={`w-6 h-6 transition-colors duration-300 ${activeTab === 'finance' ? 'text-[#B69D74]' : 'text-white/30'}`} />
            <span className={`text-[9px] uppercase tracking-wider font-semibold transition-colors duration-300 ${activeTab === 'finance' ? 'text-[#B69D74]' : 'text-transparent'}`}>
              Financeiro
            </span>
          </button>

          <button
            onClick={() => handleTabChange('maintenance')}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 px-1 z-10 cursor-pointer"
          >
            <Wrench className={`w-6 h-6 transition-colors duration-300 ${activeTab === 'maintenance' ? 'text-[#B69D74]' : 'text-white/30'}`} />
            <span className={`text-[9px] uppercase tracking-wider font-semibold transition-colors duration-300 ${activeTab === 'maintenance' ? 'text-[#B69D74]' : 'text-transparent'}`}>
              Manutenções
            </span>
          </button>

        </div>
      </nav>

      {/* Profile Slide-over */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          showProfilePanel ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowProfilePanel(false)}
        />
        <div
          className={`absolute top-0 right-0 h-full w-full max-w-sm bg-[#090909] border-l border-white/[0.04] px-6 pb-6 pt-[max(env(safe-area-inset-top),1.5rem)] shadow-2xl transition-transform duration-300 ease-out flex flex-col overflow-y-auto ${
            showProfilePanel ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
            <h2 className="text-xl font-light text-white">Meu Perfil</h2>
            <button
              onClick={() => setShowProfilePanel(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#B69D74]/20 to-[#B69D74]/5 border border-[#B69D74]/30 flex items-center justify-center">
              <User className="w-6 h-6 text-[#B69D74]" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">{client.nome}</h2>
              <p className="text-xs text-white/40 font-mono mt-0.5">{client.cpf}</p>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 space-y-5">
              <div className="flex items-center gap-4">
                <Mail className="w-4 h-4 text-white/30" />
                <div className="flex-1 border-b border-white/5 pb-4">
                  <p className="text-[10px] uppercase tracking-wider text-white/30">E-mail</p>
                  <p className="text-sm text-white/80 mt-1">{client.email || 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Phone className="w-4 h-4 text-white/30" />
                <div className="flex-1 border-b border-white/5 pb-4">
                  <p className="text-[10px] uppercase tracking-wider text-white/30">Telefone</p>
                  <p className="text-sm text-white/80 mt-1">{client.telefone || 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Anchor className="w-4 h-4 text-white/30 mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2.5">
                    {(boats && boats.length > 1) || (client.embarcacoes && client.embarcacoes.length > 1) ? 'Embarcações Vinculadas' : 'Embarcação Vinculada'}
                  </p>
                  {(() => {
                    const clientBoatsToDisplay = (boats && boats.length > 0)
                      ? boats
                      : (client.embarcacoes && client.embarcacoes.length > 0
                          ? client.embarcacoes.map((eb: any) => ({
                              id: eb.embarcacaoId,
                              nome: eb.embarcacaoId,
                              numero: eb.embarcacaoId,
                              tipo: 'lancha',
                              cota: eb.cota
                            }))
                          : (client.embarcacaoId ? [{
                              id: client.embarcacaoId,
                              nome: client.embarcacaoId,
                              numero: client.embarcacaoId,
                              tipo: 'lancha',
                              cota: client.cota
                            }] : []));

                    if (clientBoatsToDisplay.length === 0) {
                      return <p className="text-sm text-white/50 mt-1">Nenhuma embarcação vinculada</p>;
                    }

                    return (
                      <div className="space-y-2">
                        {clientBoatsToDisplay.map((boat: any) => {
                          const boatCode = getBoatCode(boat);
                          const isJet = boat.tipo === 'jet' || (boat.nome || '').toLowerCase().includes('jet');
                          const linkedCota = boat.cota
                            || client.embarcacoes?.find((eb: any) => eb.embarcacaoId === boat.id)?.cota
                            || (boat.id === client.embarcacaoId ? client.cota : null);

                          return (
                            <div
                              key={boat.id}
                              className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.02] border border-white/5"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                                  {isJet ? (
                                    <JetSkiIcon className="w-3.5 h-3.5 text-[#B69D74]" />
                                  ) : (
                                    <Ship className="w-3.5 h-3.5 text-[#B69D74]" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-white/90 truncate">
                                    {boatCode}
                                  </p>
                                  {(boat.modelo || (boat.nome && boat.nome !== boatCode)) && (
                                    <p className="text-[10px] text-white/40 truncate">
                                      {boat.modelo || boat.nome}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {linkedCota && (
                                <span className="shrink-0 text-[10px] font-medium text-[#B69D74] bg-[#B69D74]/10 border border-[#B69D74]/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  {String(linkedCota).toLowerCase().startsWith('cota') ? linkedCota : `Cota ${linkedCota}`}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Install App Banner */}
            {showInstallBanner && !isStandalone && (
              <div className="bg-gradient-to-br from-[#1a1815] to-[#0d0b08] border border-[#B69D74]/25 rounded-3xl p-5 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="absolute top-0 right-0 w-28 h-28 bg-[#B69D74]/15 rounded-full blur-[35px] translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#B69D74]/15 border border-[#B69D74]/30 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-[#B69D74]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-wide">Instale o App</h3>
                      <p className="text-[10px] text-white/40 mt-0.5">Acesso direto da tela inicial</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleInstallApp}
                      className="flex-1 py-2.5 bg-[#B69D74] hover:bg-[#a38b65] text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      {isIOS ? 'Como Instalar' : 'Instalar'}
                    </button>
                    <button
                      onClick={() => setShowInstallBanner(false)}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors border border-white/10 cursor-pointer"
                    >
                      X
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/[0.04] space-y-3">
            <button
              onClick={() => {
                setShowProfilePanel(false);
                setShowPrivacyModal(true);
              }}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-white/70" />
                <span className="text-sm font-light text-white/90">Privacidade & LGPD</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-rose-500/10 border border-white/[0.05] hover:border-rose-500/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4 text-rose-400 group-hover:text-rose-500" />
                <span className="text-sm font-light text-rose-400 group-hover:text-rose-500">Sair do Aplicativo</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Modal (Minimalist Premium Dark) */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020202]/95 backdrop-blur-xl transition-all duration-300">
          <div className="w-full max-w-xl bg-[#090909] rounded-[2rem] border border-white/[0.06] flex flex-col max-h-[85vh] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 pb-4 flex items-center justify-between border-b border-white/[0.04]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#B69D74]/15 border border-[#B69D74]/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#B69D74]" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-light tracking-wide text-white">Segurança de Dados</h2>
                  <p className="text-[10px] uppercase tracking-widest text-[#B69D74] mt-0.5">Política de Privacidade & LGPD</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPrivacyModal(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Premium Tab Navigation */}
            <div className="flex border-b border-white/[0.04] overflow-x-auto subtle-scrollbar">
              {[
                { id: 'general', label: 'Compromisso', icon: Info },
                { id: 'data', label: 'Dados Coletados', icon: Database },
                { id: 'rights', label: 'Seus Direitos', icon: Lock },
                { id: 'dpo', label: 'Contato DPO', icon: Eye }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = privacyTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setPrivacyTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-5 py-3.5 text-xs font-medium tracking-wide transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                      isActive 
                        ? 'border-[#B69D74] text-[#B69D74] bg-[#B69D74]/[0.02]' 
                        : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.01]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="px-6 md:px-8 py-6 overflow-y-auto text-white/60 text-sm font-light leading-relaxed space-y-4 subtle-scrollbar flex-1">
              
              {privacyTab === 'general' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-white/80">
                    O <strong className="font-medium text-white/95">Grupo Vila Náutica</strong>, composto por Vila Náutica, Vale Administradora e Passeios do Vale, preza pelo mais alto rigor no tratamento dos seus dados.
                  </p>
                  <p>
                    Esta aplicação foi desenvolvida sob rígidos padrões de segurança cibernética pela <strong className="text-white/85">Echo Desenvolvimento de Software</strong>, assegurando que toda informação trafegada e armazenada esteja devidamente protegida contra acessos não autorizados.
                  </p>
                  <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-start space-x-3.5 mt-2">
                    <ShieldCheck className="w-5 h-5 text-[#B69D74] shrink-0 mt-0.5" />
                    <p className="text-xs text-white/40 leading-relaxed">
                      Nosso compromisso é garantir a transparência no ciclo de vida dos seus dados pessoais, desde a coleta inicial até a eventual eliminação.
                    </p>
                  </div>
                </div>
              )}

              {privacyTab === 'data' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-white/90 font-medium text-xs uppercase tracking-wider mb-2">Quais informações tratamos?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                      <span className="block font-medium text-white/85 mb-1">Identificação Cadastral</span>
                      <p className="text-white/40">Nome completo, CPF, e-mail e telefone para autenticação e comunicação direta.</p>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                      <span className="block font-medium text-white/85 mb-1">Vínculo de Cotas</span>
                      <p className="text-white/40">Associação às embarcações que você possui direito de cota compartilhada.</p>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                      <span className="block font-medium text-white/85 mb-1">Histórico de Reservas</span>
                      <p className="text-white/40">Registro de datas e períodos solicitados para navegação das embarcações.</p>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                      <span className="block font-medium text-white/85 mb-1">Registros de Acesso</span>
                      <p className="text-white/40">Registros de login e IP para auditorias de segurança e prevenção a fraudes.</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 pt-2 border-t border-white/[0.04]">
                    <strong>Base Legal (Art. 7º, V da LGPD):</strong> O tratamento é fundamental para a execução de contrato ou de procedimentos preliminares relacionados a contrato do qual o cotista seja parte.
                  </p>
                </div>
              )}

              {privacyTab === 'rights' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-white/90 font-medium text-xs uppercase tracking-wider mb-2">Seus Direitos Previstos no Artigo 18 da LGPD</h3>
                  <ul className="space-y-2.5 text-xs text-white/50">
                    <li className="flex items-start space-x-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1.5 shrink-0" />
                      <span><strong>Confirmação e Acesso:</strong> Confirmar que tratamos seus dados e solicitar cópia estruturada dos registros.</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1.5 shrink-0" />
                      <span><strong>Retificação:</strong> Solicitar correção de dados que estejam errados, incompletos ou desatualizados.</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1.5 shrink-0" />
                      <span>
                        <strong>Portabilidade:</strong> Exportar os seus dados pessoais.{' '}
                        <button onClick={handleExportData} className="text-[#B69D74] hover:underline cursor-pointer">Exportar Agora</button>
                      </span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1.5 shrink-0" />
                      <span>
                        <strong>Eliminação / Revogação:</strong> Solicitar exclusão do cadastro. Alguns dados podem ser retidos conforme a legislação vigente.{' '}
                        <button onClick={handleRequestDeletion} className="text-rose-400 hover:underline cursor-pointer">Solicitar Exclusão</button>
                      </span>
                    </li>
                  </ul>
                </div>
              )}

              {privacyTab === 'dpo' && (
                <div className="space-y-4 animate-in fade-in duration-200 text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-[#B69D74]/10 border border-[#B69D74]/20 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-[#B69D74]" />
                  </div>
                  <h3 className="text-white font-medium text-sm">Encarregado pelo Tratamento de Dados (DPO)</h3>
                  <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                    Dúvidas sobre como seus dados são tratados ou solicitações de direitos previstos na LGPD podem ser enviadas diretamente ao nosso encarregado.
                  </p>
                  <div className="mt-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl inline-block">
                    <span className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">Canal de Atendimento DPO</span>
                    <span className="text-sm font-semibold font-mono text-[#B69D74]">dpo@valenauticos.com.br</span>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 md:p-8 pt-4 flex justify-end border-t border-white/[0.04] bg-[#070707]">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-8 py-3.5 bg-white hover:bg-white/90 text-black rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-lg hover:shadow-white/5"
              >
                Compreendi
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPreviewModal && previewFields && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020202]/90 backdrop-blur-xl transition-all duration-300">
          <div className="w-full max-w-[440px] bg-[#090909] rounded-[2rem] border border-white/[0.06] flex flex-col max-h-[90vh] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 pb-4 flex items-center justify-between border-b border-white/[0.04]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-light tracking-wide text-white">Check-in Concluído!</h2>
                  <p className="text-[10px] uppercase tracking-widest text-[#B69D74] mt-0.5">Aviso de Saída NORMAM-211</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowPreviewModal(false);
                  if (onRefresh) onRefresh();
                  else window.location.reload();
                }} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content / Preview Area */}
            <div className="px-6 py-5 overflow-y-auto subtle-scrollbar flex-1 space-y-4">
              
              <p className="text-xs text-white/50 text-center leading-relaxed">
                Confira o preview do documento obrigatório da Marinha gerado abaixo:
              </p>

              {/* Physical Document Mock Preview */}
              <div className="bg-white text-slate-800 p-5 rounded-2xl border border-slate-200 shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] text-left font-sans text-xs select-none">
                <div className="flex justify-between items-start border-b border-slate-200 pb-2 mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wide">AVISO DE SAÍDA</h4>
                    <p className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">NORMAM-211/DPC - ANEXO 4-A</p>
                  </div>
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded tracking-wider">
                    VILA NÁUTICA
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3 text-[10px]">
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase font-semibold">Data</span>
                    <span className="font-medium text-slate-700">{previewFields.data}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase font-semibold">Comandante</span>
                    <span className="font-medium text-slate-700 truncate block">{previewFields.nome.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase font-semibold">Embarcação</span>
                    <span className="font-medium text-slate-700 truncate block">
                      {previewFields.nomeEmbarcacao.toUpperCase()} ({previewFields.tipo})
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase font-semibold">Pessoas a Bordo</span>
                    <span className="font-medium text-slate-700">{previewFields.pessoasABordo}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[8px] text-slate-400 uppercase font-semibold">Destino</span>
                    <span className="font-medium text-slate-700 truncate block">{previewFields.destino.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase font-semibold">Previsão Saída</span>
                    <span className="font-medium text-slate-700">{previewFields.previsaoSaida}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase font-semibold">Previsão Chegada</span>
                    <span className="font-medium text-slate-700">{previewFields.previsaoChegada}</span>
                  </div>
                  {previewFields.observacao && previewFields.observacao !== 'Nenhuma' && (
                    <div className="col-span-2">
                      <span className="block text-[8px] text-slate-400 uppercase font-semibold">Observação</span>
                      <span className="font-medium text-slate-700 block whitespace-pre-wrap truncate">
                        {previewFields.observacao.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-slate-200 pt-2 text-[7px] text-slate-400 leading-relaxed italic">
                  É responsabilidade do comandante ter a bordo o material de salvatagem compatível com a singradura.
                </div>
              </div>

              {/* Informative Note */}
              <div className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-xs text-white/60 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#B69D74] shrink-0 mt-0.5 animate-pulse" />
                <p className="leading-relaxed text-xs">
                  O documento foi gerado! Deseja salvar o arquivo PDF em seu celular? Ele também estará <strong>sempre disponível no aplicativo</strong> na sua aba de reservas.
                </p>
              </div>

            </div>

            {/* Modal Footer / Actions */}
            <div className="p-6 pt-4 flex flex-col gap-2.5 border-t border-white/[0.04] bg-[#070707]">
              <button
                onClick={() => {
                  if (previewPDFDoc && previewFields) {
                    const filename = `Aviso_de_Saida_${previewFields.nomeEmbarcacao || 'Embarcacao'}_${(previewFields.data || '').replace(/\s+/g, '').replace(/\//g, '-')}.pdf`;
                    previewPDFDoc.save(filename);
                    showToast('Sucesso', 'PDF do Aviso de Saída baixado com sucesso!', 'success');
                  }
                }}
                className="w-full py-3.5 bg-[#B69D74] hover:bg-[#a38b65] text-slate-900 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[#B69D74]/5 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Baixar PDF no Dispositivo
              </button>
              
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  if (onRefresh) onRefresh();
                  else window.location.reload();
                }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer border border-white/10 text-center"
              >
                Concluir
              </button>
            </div>

          </div>
        </div>
      )}

      {/* iOS Install Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-[#020202]/90 backdrop-blur-xl transition-all duration-300">
          <div className="w-full max-w-[400px] bg-[#090909] rounded-t-[2rem] sm:rounded-[2rem] border border-white/[0.06] flex flex-col overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-8 duration-300">
            
            {/* Modal Header */}
            <div className="p-6 pb-4 flex items-center justify-between border-b border-white/[0.04]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#B69D74]/15 border border-[#B69D74]/30 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-[#B69D74]" />
                </div>
                <div>
                  <h2 className="text-base font-light tracking-wide text-white">Instalar no iPhone</h2>
                  <p className="text-[10px] uppercase tracking-widest text-[#B69D74] mt-0.5">Adicionar à Tela de Início</p>
                </div>
              </div>
              <button 
                onClick={() => setShowIOSInstructions(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instructions */}
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#B69D74]/15 flex items-center justify-center shrink-0 text-[#B69D74] font-bold text-sm">1</div>
                <div>
                  <p className="text-sm text-white font-medium">Toque no ícone de Compartilhar</p>
                  <p className="text-xs text-white/40 mt-1 flex items-center gap-1.5">
                    O ícone <Share className="w-3.5 h-3.5 inline text-[#B69D74]" /> na barra inferior do Safari
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#B69D74]/15 flex items-center justify-center shrink-0 text-[#B69D74] font-bold text-sm">2</div>
                <div>
                  <p className="text-sm text-white font-medium">Selecione "Adicionar à Tela de Início"</p>
                  <p className="text-xs text-white/40 mt-1">Role para baixo e toque na opção com o ícone de <strong className="text-white/60">+</strong></p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#B69D74]/15 flex items-center justify-center shrink-0 text-[#B69D74] font-bold text-sm">3</div>
                <div>
                  <p className="text-sm text-white font-medium">Confirme tocando em "Adicionar"</p>
                  <p className="text-xs text-white/40 mt-1">O app aparecerá na sua tela inicial como um app nativo</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-2 border-t border-white/[0.04]">
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full py-3.5 bg-[#B69D74] hover:bg-[#a38b65] text-slate-900 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-lg"
              >
                Entendi
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODALS */}
      
      <ClientMaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        boats={boats}
        clientId={client.id}
        clientName={client.nome}
        chamados={chamados}
        onSuccess={() => {
          setIsMaintenanceModalOpen(false);
          if (onRefresh) onRefresh();
        }}
      />

      {isTicketModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#020202]/95 backdrop-blur-xl transition-all duration-300 animate-in fade-in">
          <FeedbackForm 
            isEmbedded={true} 
            prefilledClient={client}
            onClose={() => setIsTicketModalOpen(false)} 
          />
        </div>
      )}

      <ClientReservationModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        selectedDate={selectedDate}
        client={client}
        boats={boats}
        reservations={mergedReservations}
        preselectedBoatId={selectedCalendarBoatId}
        onSuccess={(newRes) => {
          if (newRes) {
            setOptimisticReservations(prev => [...prev, newRes]);
            setLastAddedResId(newRes.id);
          }
          setIsReservationModalOpen(false);
          handleTabChange('calendar');
          if (onRefresh) {
            onRefresh();
          } else {
            window.location.reload();
          }
        }}
      />

      <ClientCheckinModal
        isOpen={isCheckinModalOpen}
        onClose={() => setIsCheckinModalOpen(false)}
        reservation={selectedReservationForCheckin}
        boat={boats.find(b => b.id === selectedReservationForCheckin?.embarcacaoId)}
        client={client}
        onSuccess={(checkinData) => {
          setIsCheckinModalOpen(false);
          
          if (selectedReservationForCheckin) {
            const updatedResObj = { 
              ...selectedReservationForCheckin, 
              ...(checkinData || {}),
              statusMarina: 'agendado',
              status: 'confirmado' 
            };
            setOptimisticReservations(prev => [
              ...prev.filter(r => r.id !== selectedReservationForCheckin.id),
              updatedResObj
            ]);
          }

          showToast('Sucesso', 'Check-in confirmado com sucesso!', 'success');
          if (onRefresh) {
            onRefresh();
          } else {
            window.location.reload();
          }
        }}
      />

      {/* TOAST NOTIFICATIONS */}
      {toastMsg && (
        <div className="fixed top-[max(1.5rem,env(safe-area-inset-top))] right-6 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`backdrop-blur-md border rounded-2xl p-4 shadow-2xl flex items-start gap-3 max-w-sm ${
            toastMsg.type === 'error' ? 'bg-rose-500/10 border-rose-500/30' :
            toastMsg.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
            'bg-emerald-500/10 border-emerald-500/30'
          }`}>
            <div className={`p-2 rounded-full mt-0.5 shrink-0 ${
              toastMsg.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
              toastMsg.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              {toastMsg.type === 'error' ? <ShieldCheck className="w-5 h-5" /> :
               toastMsg.type === 'warning' ? <Info className="w-5 h-5" /> :
               <CheckCircle className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold text-sm ${
                toastMsg.type === 'error' ? 'text-rose-400' :
                toastMsg.type === 'warning' ? 'text-amber-400' :
                'text-emerald-400'
              }`}>{toastMsg.title}</h4>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">{toastMsg.msg}</p>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-white/40 hover:text-white shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Transação */}
      {selectedTransactionDetails && (() => {
        const detailCalc = getClientTxUpdatedValue(selectedTransactionDetails);
        const detailStatus = formatClientTxStatus(selectedTransactionDetails, detailCalc.isOverdue);
        const detailDesc = formatClientTxDescription(selectedTransactionDetails);
        return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[105] animate-in fade-in duration-300">
          <div className="bg-[#1A1A1A]/95 border border-white/10 rounded-3xl w-full max-w-sm p-6 relative shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setSelectedTransactionDetails(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white hover:bg-white/5 p-1.5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-6">
              <span className="text-[10px] uppercase tracking-widest text-[#B69D74] font-semibold">Detalhes da Cobrança</span>
              <h3 className="text-lg font-light text-white tracking-wide mt-1">
                {detailDesc}
              </h3>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <span className="text-xs text-white/40 uppercase tracking-widest">Valor Atualizado</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-white block">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(detailCalc.final)}
                  </span>
                  {detailCalc.isOverdue && detailCalc.fees > 0 && (
                    <span className="text-[10px] text-rose-400">
                      Original: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(detailCalc.original)} (+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(detailCalc.fees)} multa/juros)
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <span className="text-xs text-white/40 uppercase tracking-widest">Vencimento</span>
                <span className="text-sm font-medium text-white/80">
                  {selectedTransactionDetails.dataVencimento ? selectedTransactionDetails.dataVencimento.split('-').reverse().join('/') : '-'}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <span className="text-xs text-white/40 uppercase tracking-widest">Status</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${detailStatus.className}`}>
                  {detailStatus.label}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {selectedTransactionDetails.status !== 'pago' && (pagamentosHabilitados ? (
                <button 
                  onClick={() => {
                    setSelectedTransactionDetails(null);
                    handleOpenPixPayment(selectedTransactionDetails);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-amber-400 transition-all shadow-lg"
                >
                  <QrCode className="w-4 h-4" />
                  Pagar com PIX
                </button>
              ) : (
                <a
                  id="btn-pagar-transacao-whatsapp"
                  href={buildFinanceiroWhatsAppUrl(
                    `${detailDesc}${selectedTransactionDetails.dataVencimento ? ` - venc. ${selectedTransactionDetails.dataVencimento.split('-').reverse().join('/')}` : ''}`,
                    detailCalc.final
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-emerald-400 transition-all shadow-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                  Pagar via WhatsApp do Financeiro
                </a>
              ))}
              
              {selectedTransactionDetails.boletoUrl && (
                <a 
                  href={selectedTransactionDetails.boletoUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#B69D74]/10 hover:bg-[#B69D74]/20 border border-[#B69D74]/20 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-[#B69D74] transition-all"
                >
                  <FileText className="w-4 h-4" />
                  Acessar Boleto
                </a>
              )}

              {selectedTransactionDetails.comprovante && (
                <a 
                  href={selectedTransactionDetails.comprovante} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-emerald-400 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  Ver Comprovante
                </a>
              )}
              
              <button 
                onClick={() => setSelectedTransactionDetails(null)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-semibold text-white/50 uppercase tracking-widest transition-colors mt-2"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal de Pagamento Pix */}
      {selectedTransactionForPix && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[110] animate-in fade-in duration-300">
          <div className={`bg-[#1A1A1A]/95 rounded-3xl w-full max-w-sm p-6 relative shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-500 overflow-hidden transition-all ${
            pixPaymentConfirmed
              ? 'border border-emerald-500/30 shadow-[0_0_55px_-12px_rgba(16,185,129,0.3)]'
              : 'border border-white/10'
          }`}>
            {/* Ambient Radial Glow */}
            <div className={`pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-[60px] transition-colors duration-700 ${
              pixPaymentConfirmed ? 'bg-emerald-500/20' : 'bg-[#B69D74]/10'
            }`} />

            <button 
              onClick={() => {
                setSelectedTransactionForPix(null);
                setPixPaymentConfirmed(false);
              }}
              className="absolute top-4 right-4 text-white/40 hover:text-white hover:bg-white/5 p-1.5 rounded-full transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <AnimatePresence mode="wait">
              {pixPaymentConfirmed ? (
                <motion.div
                  key="pix-confirmed"
                  initial={{ opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10 flex flex-col items-center text-center pt-3 pb-1"
                >
                  {/* Animated Checkmark Emblem */}
                  <div className="relative flex items-center justify-center w-24 h-24 mb-5">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: [1, 1.45, 1.65], opacity: [0.45, 0.15, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border border-emerald-400/40 bg-emerald-500/10"
                    />
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: [1, 1.25], opacity: [0.35, 0] }}
                      transition={{ duration: 1.8, delay: 0.3, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-2 rounded-full border border-[#B69D74]/40"
                    />
                    <motion.div
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
                      className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500/25 via-emerald-500/15 to-[#B69D74]/20 border border-emerald-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                    >
                      <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="none">
                        <motion.path
                          d="M5 13l4 4L19 7"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.55, delay: 0.2, ease: "easeOut" }}
                        />
                      </svg>
                    </motion.div>
                  </div>

                  {/* Status Pill */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 mb-3"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-400">
                      Confirmado em Tempo Real
                    </span>
                  </motion.div>

                  <motion.h3
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32, duration: 0.3 }}
                    className="text-xl font-light text-white tracking-wide"
                  >
                    Pagamento Recebido!
                  </motion.h3>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.38, duration: 0.3 }}
                    className="text-xs text-white/50 mt-1 max-w-[240px] leading-relaxed"
                  >
                    Sua transação foi conciliada automaticamente com sucesso.
                  </motion.p>

                  {/* Receipt Summary Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.35 }}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mt-5 space-y-2.5 text-left"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] uppercase tracking-widest text-white/35">Descrição</span>
                      <span className="text-white/85 font-medium truncate max-w-[170px]">
                        {selectedTransactionForPix.descricao || selectedTransactionForPix.categoria}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-white/[0.04] pt-2.5">
                      <span className="text-[10px] uppercase tracking-widest text-white/35">Valor Liquidado</span>
                      <span className="text-sm font-semibold text-emerald-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTransactionForPix.valor)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-white/[0.04] pt-2.5">
                      <span className="text-[10px] uppercase tracking-widest text-white/35">Horário</span>
                      <span className="text-white/60 font-mono text-[11px]">
                        Hoje{pixPaidAt ? ` às ${pixPaidAt}` : ''}
                      </span>
                    </div>
                  </motion.div>

                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, duration: 0.3 }}
                    onClick={() => {
                      setSelectedTransactionForPix(null);
                      setPixPaymentConfirmed(false);
                      if (onRefresh) onRefresh();
                    }}
                    className="w-full mt-6 py-3.5 bg-gradient-to-r from-emerald-500/20 via-emerald-500/15 to-[#B69D74]/20 hover:from-emerald-500/30 hover:to-[#B69D74]/30 border border-emerald-500/30 rounded-2xl text-xs font-bold uppercase tracking-widest text-emerald-300 transition-all shadow-lg cursor-pointer"
                  >
                    Concluir
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="pix-waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="relative z-10"
                >
                  <div className="text-center mt-2 mb-6">
                    <span className="text-[10px] uppercase tracking-widest text-[#B69D74] font-semibold">Pagamento Instantâneo</span>
                    <h3 className="text-lg font-light text-white tracking-wide mt-1">Pagar com PIX</h3>
                    <p className="text-xs text-white/40 mt-1">
                      {selectedTransactionForPix.descricao || selectedTransactionForPix.categoria}
                    </p>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTransactionForPix.valor)}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center min-h-[220px]">
                    {isGeneratingPix ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-[#B69D74] border-t-transparent animate-spin"></div>
                        <p className="text-xs text-white/40 font-medium">Gerando QR Code PIX...</p>
                      </div>
                    ) : pixError ? (
                      <div className="flex flex-col items-center text-center p-4">
                        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
                          <X className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-white max-w-[240px] leading-relaxed">{pixError}</p>
                        <button 
                          onClick={() => selectedTransactionForPix.id === 'bulk' ? handleOpenBulkPixPayment() : handleOpenPixPayment(selectedTransactionForPix)}
                          className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white transition-colors cursor-pointer"
                        >
                          Tentar Novamente
                        </button>
                      </div>
                    ) : pixQrCode ? (
                      <div className="flex flex-col items-center w-full">
                        {/* QR Code Container */}
                        <div className="bg-white p-3 rounded-2xl shadow-inner mb-5">
                          <img 
                            src={`data:image/png;base64,${pixQrCode}`} 
                            alt="PIX QR Code" 
                            className="w-40 h-40 object-contain"
                          />
                        </div>

                        {/* Copia e Cola */}
                        <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-3 mb-4">
                          <p className="text-[9px] uppercase tracking-widest text-white/30 font-medium mb-1.5">Código Copia e Cola</p>
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              readOnly 
                              value={pixPayload || ''} 
                              className="flex-1 bg-transparent border-none text-xs text-white/70 select-all outline-none font-mono truncate"
                            />
                            <button 
                              onClick={handleCopyPix}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                                copiedPix 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-[#B69D74]/20 hover:bg-[#B69D74]/30 text-[#B69D74] border border-[#B69D74]/30'
                              }`}
                            >
                              {copiedPix ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B69D74] animate-ping" />
                          <span className="text-[10px] text-white/50 font-medium tracking-wide">
                            Aguardando confirmação automática...
                          </span>
                        </div>

                        <p className="text-[10px] text-white/35 text-center font-medium max-w-[210px] leading-relaxed">
                          Abra o app do seu banco e escaneie o código QR acima ou utilize o Copia e Cola.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 text-center">
                    <button
                      onClick={() => {
                        setSelectedTransactionForPix(null);
                        setPixPaymentConfirmed(false);
                      }}
                      className="text-xs text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                      Voltar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Modal de Documentos da Embarcação (Integrado PWA) */}
      {docModalBoat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="w-full h-full md:max-w-3xl md:h-[90vh] md:rounded-[2rem] bg-[#090909] border border-white/10 flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 pt-[max(env(safe-area-inset-top),0px)] pb-[max(env(safe-area-inset-bottom),0px)]">

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#111] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#B69D74]/15 border border-[#B69D74]/30 flex items-center justify-center shrink-0">
                  {docModalTab === 'seguro' ? (
                    <ShieldCheck className="w-5 h-5 text-[#B69D74]" />
                  ) : (
                    <FileText className="w-5 h-5 text-[#B69D74]" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                    {docModalTab === 'seguro' ? 'Apólice de Seguro' : 'Documento da Embarcação'}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[#B69D74] border border-white/10 font-mono">
                      {getBoatCode(docModalBoat)}
                    </span>
                  </h3>
                  <p className="text-[11px] text-white/40">
                    {docModalBoat.nome || docModalBoat.modelo || 'Embarcação'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {((docModalTab === 'seguro' ? docModalBoat.seguroUrl : docModalBoat.documentoUrl)) && (
                  <>
                    {typeof navigator !== 'undefined' && !!navigator.share && (
                      <button
                        type="button"
                        onClick={handleShareDoc}
                        title="Compartilhar documento"
                        className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
                      >
                        <Share className="w-4 h-4" />
                      </button>
                    )}
                    <a
                      href={docModalTab === 'seguro' ? docModalBoat.seguroUrl : docModalBoat.documentoUrl}
                      download
                      title="Baixar PDF"
                      className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setDocModalBoat(null)}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Selector: Documento vs Seguro */}
            <div className="p-3 bg-black/40 border-b border-white/5 grid grid-cols-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setDocModalTab('documento'); setIsDocLoading(true); }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  docModalTab === 'documento'
                    ? 'bg-[#B69D74] text-black shadow-lg font-semibold'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Documento</span>
                {docModalBoat.documentoUrl ? (
                  <span className={`w-1.5 h-1.5 rounded-full ${docModalTab === 'documento' ? 'bg-black' : 'bg-emerald-400'}`} />
                ) : (
                  <span className="text-[9px] opacity-60">(Pendente)</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setDocModalTab('seguro'); setIsDocLoading(true); }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  docModalTab === 'seguro'
                    ? 'bg-[#B69D74] text-black shadow-lg font-semibold'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Seguro</span>
                {docModalBoat.seguroUrl ? (
                  <span className={`w-1.5 h-1.5 rounded-full ${docModalTab === 'seguro' ? 'bg-black' : 'bg-emerald-400'}`} />
                ) : (
                  <span className="text-[9px] opacity-60">(Pendente)</span>
                )}
              </button>
            </div>

            {/* Document Viewer Body */}
            <div className="flex-1 w-full relative bg-[#151515] overflow-hidden flex flex-col">
              {(() => {
                const currentDocUrl = docModalTab === 'seguro' ? docModalBoat.seguroUrl : docModalBoat.documentoUrl;

                if (!currentDocUrl) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#111] to-[#090909]">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/30 mb-4 shadow-inner">
                        {docModalTab === 'seguro' ? (
                          <ShieldAlert className="w-8 h-8 text-amber-400/60" />
                        ) : (
                          <FileText className="w-8 h-8 text-indigo-400/60" />
                        )}
                      </div>
                      <h4 className="text-base font-medium text-white mb-1.5">
                        {docModalTab === 'seguro' ? 'Apólice de Seguro Pendente' : 'Documento da Embarcação Pendente'}
                      </h4>
                      <p className="text-xs text-white/40 max-w-sm mb-6 leading-relaxed">
                        {docModalTab === 'seguro'
                          ? `A apólice de seguro de ${getBoatCode(docModalBoat)} ainda não foi disponibilizada nos arquivos digitais da Vale Administradora.`
                          : `O documento oficial (TIE/TIEM) de ${getBoatCode(docModalBoat)} ainda não foi digitalizado nos registros da Vale Administradora.`
                        }
                      </p>
                      <a
                        href={`https://wa.me/${VALE_ADMINISTRADORA_WHATSAPP}?text=${encodeURIComponent(
                          `Olá! Gostaria de consultar sobre o ${docModalTab === 'seguro' ? 'Seguro' : 'Documento'} da embarcação ${getBoatCode(docModalBoat)} com a Vale Administradora.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />
                        <span>Solicitar à Vale Administradora via WhatsApp</span>
                      </a>
                    </div>
                  );
                }

                return (
                  <>
                    {isDocLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090909] z-10 gap-3">
                        <div className="w-8 h-8 border-2 border-[#B69D74] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-white/50">Carregando visualização integrada...</span>
                      </div>
                    )}
                    <iframe
                      key={currentDocUrl}
                      src={`${currentDocUrl}#toolbar=0&navpanes=0`}
                      className="w-full flex-1 border-0 bg-white"
                      title={docModalTab === 'seguro' ? 'Apólice de Seguro' : 'Documento da Embarcação'}
                      onLoad={() => setIsDocLoading(false)}
                    />

                    {/* Bottom bar with integrated options */}
                    <div className="p-3 bg-[#0d0d0d] border-t border-white/5 flex items-center justify-between text-xs shrink-0">
                      <span className="text-white/40 text-[11px] flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-emerald-400" /> Visualização segura integrada
                      </span>
                      <div className="flex items-center gap-2">
                        {typeof navigator !== 'undefined' && !!navigator.share && (
                          <button
                            type="button"
                            onClick={handleShareDoc}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Share className="w-3 h-3 text-[#B69D74]" />
                            <span>Compartilhar</span>
                          </button>
                        )}
                        <a
                          href={currentDocUrl}
                          download
                          className="px-3 py-1.5 rounded-lg bg-[#B69D74]/15 hover:bg-[#B69D74]/25 text-[#B69D74] border border-[#B69D74]/30 text-[11px] flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Baixar Arquivo</span>
                        </a>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* Modal de Contestação */}
      {isContestationModalOpen && contestationTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020202]/90 backdrop-blur-xl transition-all duration-300">
          <div className="w-full max-w-sm bg-[#090909] rounded-[2rem] border border-amber-500/20 flex flex-col overflow-hidden shadow-[0_25px_60px_-15px_rgba(245,158,11,0.2)] animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-4 border-b border-white/[0.04] text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-light text-white tracking-wide">Contestar Reserva</h2>
              <p className="text-xs text-white/40 mt-1">Garantia de Final de Semana</p>
            </div>

            <div className="p-6 text-sm text-white/70 leading-relaxed text-center">
              <p>
                O dia <strong className="text-amber-500">{contestationTarget.data.split('-').reverse().join('/')}</strong> encontra-se ocupado por uma reserva que excede o limite garantido do final de semana de outro cotista.
              </p>
              <p className="mt-4">
                Como você ainda não utilizou a sua garantia para este dia/mês, você tem direito a <strong>contestar esta data</strong>.
              </p>
            </div>

            <div className="p-6 pt-4 flex flex-col gap-3 bg-[#070707] border-t border-white/[0.04]">
              <button
                onClick={handleContest}
                disabled={isContesting}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isContesting ? 'Contestando...' : 'Confirmar Contestação'}
              </button>
              <button
                onClick={() => {
                  setIsContestationModalOpen(false);
                  setContestationTarget(null);
                }}
                disabled={isContesting}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
