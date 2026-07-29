import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Anchor, Calendar, User, Phone, Mail, FileText, Download, Trash2, ShieldCheck, Lock, Eye, Database, Info, X, Home, Wallet, CreditCard, Ship, Bell, ChevronLeft, ChevronRight, Plus, CheckCircle, Smartphone, Share, CheckCircle2, Check, ChevronDown, Droplets, Wrench, QrCode } from 'lucide-react';
// @ts-ignore
import boatImg1 from '../assets/images/1.webp';
// @ts-ignore
import boatImg2 from '../assets/images/2.webp';
import ClientReservationModal from './ClientReservationModal';
import ClientCheckinModal from './ClientCheckinModal';
import MonthlyCalendarGenerator from './MonthlyCalendarGenerator';
import { generateAvisoSaidaPDF } from '../utils/pdfGenerator';

interface ClientDashboardPageProps {
  client: any;
  boats: any[];
  reservations: any[];
  transacoes?: any[];
  onLogout: () => void;
  onRefresh?: () => void;
}

export default function ClientDashboardPage({ client, boats, reservations, transacoes = [], onLogout, onRefresh }: ClientDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'finance' | 'profile'>('home');
  const [financeTab, setFinanceTab] = useState<'fatura' | 'extrato'>('fatura');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyTab, setPrivacyTab] = useState<'general' | 'data' | 'rights' | 'dpo'>('general');

  // Asaas Pix payment states
  const [selectedTransactionForPix, setSelectedTransactionForPix] = useState<any>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixError, setPixError] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  const handleOpenPixPayment = async (t: any) => {
    setSelectedTransactionForPix(t);
    setIsGeneratingPix(true);
    setPixQrCode(null);
    setPixPayload(null);
    setPixError(null);
    setCopiedPix(false);

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
        if (resData.qrCode) {
          setPixQrCode(resData.qrCode.encodedImage);
          setPixPayload(resData.qrCode.payload);
        } else {
          setPixError("QR Code não retornado pelo Asaas.");
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
  const [cancelledIds, setCancelledIds] = useState<number[]>([]);

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

  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [selectedReservationForCheckin, setSelectedReservationForCheckin] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reservationFilter, setReservationFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  // Check-in states
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinData, setCheckinData] = useState({ previsaoSaida: '', previsaoChegada: '', pessoasABordo: '', destino: '' });
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [toastMsg, setToastMsg] = useState<{title: string, msg: string, type: 'error'|'success'|'warning'} | null>(null);

  const transacoesList = (client as any)?.transacoes || transacoes || [];
  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
  
  const totalAberto = transacoesList
    .filter((t: any) => t.status === 'pendente' || t.status === 'vencido')
    .reduce((acc: number, t: any) => acc + (Number(t.valor) || 0), 0);



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
  const todayReservation = myReservations.find(r => r.data === todayStrLocal && r.status !== 'cancelado');
  const needsCheckin = todayReservation && (!todayReservation.previsaoSaida || !todayReservation.pessoasABordo || todayReservation.statusMarina === 'agendado');
  const isCheckedIn = todayReservation && todayReservation.statusMarina === 'confirmado';

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todayReservation) return;

    // Validate 40 mins gap
    if (checkinData.previsaoSaida) {
      const now = new Date();
      const [hours, minutes] = checkinData.previsaoSaida.split(':').map(Number);
      const outputTime = new Date();
      outputTime.setHours(hours, minutes, 0, 0);

      const diffInMinutes = (outputTime.getTime() - now.getTime()) / (1000 * 60);

      if (diffInMinutes < 40) {
        showToast('Horário Inválido', 'A previsão de saída deve ter pelo menos 40 minutos de antecedência para a preparação da embarcação.', 'warning');
        return;
      }
    }

    setIsSubmittingCheckin(true);
    try {
      const token = localStorage.getItem('client_token');
      const res = await fetch('/api/client/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          id: todayReservation.id,
          ...checkinData
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Falha ao realizar check-in');
      }

      // Generate PDF
      const boat = boats.find(b => b.id === todayReservation.embarcacaoId);
      const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome.split(' ')[0]) : 'M00';
      const boatType = boat ? (boat.tipo === 'jet' ? 'Jetski' : 'Lancha') : 'Lancha';
      
      let finalDate = todayReservation.data;
      if (finalDate.includes('-')) {
        const p = finalDate.split('-');
        finalDate = `${p[2]} / ${p[1]} / ${p[0]}`;
      }

      const fields = {
        data: finalDate,
        nome: client.nome,
        tipo: boatType,
        nomeEmbarcacao: boatCode,
        pessoasABordo: checkinData.pessoasABordo,
        destino: checkinData.destino,
        previsaoSaida: checkinData.previsaoSaida,
        previsaoChegada: checkinData.previsaoChegada,
        observacao: todayReservation.observações || 'Nenhuma'
      };

      const doc = await generateAvisoSaidaPDF(fields, { autoPrint: false });

      // Atualiza o estado local para refletir o check-in imediatamente
      setOptimisticReservations(prev => [
        ...prev.filter(r => r.id !== todayReservation.id),
        { ...todayReservation, ...checkinData, statusMarina: 'confirmado' }
      ]);

      setPreviewFields(fields);
      setPreviewPDFDoc(doc);
      setShowPreviewModal(true);
      setShowCheckinModal(false);

      showToast('Sucesso', 'Check-in realizado com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro', err.message || 'Erro ao comunicar com o servidor.', 'error');
    } finally {
      setIsSubmittingCheckin(false);
    }
  };

  const handleCancelReservation = async (reservationId?: string) => {
    const idToCancel = typeof reservationId === 'string' ? reservationId : todayReservation?.id;
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
      setShowCancelConfirm(false);
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
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#B69D74] font-semibold">Bem-vindo(a)</p>
          <h1 className="text-xl font-light tracking-wide text-white mt-1">{client.nome.split(' ')[0]}</h1>
        </div>
        <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative backdrop-blur-md">
          <Bell className="w-4 h-4 text-white/70" />
          <span className="absolute top-2.5 right-3 w-1.5 h-1.5 bg-[#B69D74] rounded-full"></span>
        </button>
      </div>

      {/* Dynamic Check-in Banner */}
      {(needsCheckin || isCheckedIn) && (
        <div className="px-6 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
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
                        <h2 className="text-sm font-semibold text-white tracking-wide">Passeio hoje confirmado!</h2>
                        <p className="text-[10px] text-white/50 mt-0.5">Toque para ver detalhes</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                      <ChevronDown className="w-4 h-4 text-white/50 group-open:rotate-180 transition-transform duration-300" />
                    </div>
                  </summary>
                  
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-3 text-xs">
                      <div>
                        <span className="block text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Destino</span>
                        <span className="text-white font-medium truncate block">{todayReservation?.destino || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Previsão Saída</span>
                        <span className="text-white font-medium">{todayReservation?.previsaoSaida || '00:00'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDownloadPDF(todayReservation)}
                        className="flex-1 py-2.5 bg-[#B69D74] hover:bg-[#a38b65] text-slate-900 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar NORMAM
                      </button>

                      {showCancelConfirm ? (
                        <div className="flex-1 flex gap-2">
                          <button 
                            onClick={() => setShowCancelConfirm(false)}
                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors"
                          >
                            Voltar
                          </button>
                          <button 
                            onClick={() => handleCancelReservation()}
                            disabled={isCanceling}
                            className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg disabled:opacity-50"
                          >
                            {isCanceling ? '...' : 'Cancelar'}
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setShowCancelConfirm(true)}
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
                      <h2 className="text-sm font-semibold text-white tracking-wide">Seu passeio é hoje!</h2>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                      {showCancelConfirm ? (
                        <div className="flex-1 animate-in zoom-in-95 duration-300 bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl">
                          <p className="text-xs text-rose-300 font-medium mb-3">Tem certeza que deseja CANCELAR o passeio de hoje?</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setShowCancelConfirm(false)}
                              className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors"
                            >
                              Voltar
                            </button>
                            <button 
                              onClick={() => handleCancelReservation()}
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
                              setSelectedReservationForCheckin(todayReservation);
                              setIsCheckinModalOpen(true);
                            }}
                            className="flex-1 py-2.5 bg-[#B69D74] hover:bg-[#a38b65] text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg"
                          >
                            Confirmar Saída
                          </button>
                          <button 
                            onClick={() => setShowCancelConfirm(true)}
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
      )}

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
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className={`w-full flex overflow-x-auto snap-x snap-mandatory subtle-scrollbar hide-scrollbar ${isDown ? 'cursor-grabbing snap-none' : 'cursor-grab'}`} 
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {boats.map((boat, index) => {
                // Usa a imagem configurada no banco ou fallback alternado
                const fallbackImg = index % 2 === 0 ? boatImg1 : boatImg2;
                const imgSource = boat.imagemUrl ? boat.imagemUrl : fallbackImg;
                return (
                  <div key={boat.id} className="min-w-full snap-center px-6 flex flex-col items-center relative">
                    
                    {/* Boat Image */}
                    <div className="relative z-10 w-full max-w-[320px] aspect-square flex items-center justify-center [animation:luxury-scale-up_1.5s_cubic-bezier(0.16,1,0.3,1)_forwards]">
                      <img 
                        src={imgSource} 
                        alt={boat.nome} 
                        className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] [animation:luxury-float_6s_ease-in-out_infinite]"
                        style={{ WebkitUserDrag: 'none' }}
                      />
                    </div>

                    {/* Status Card Glass */}
                    <div className="w-full bg-[#111]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl relative z-20 -mt-10 mb-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Sua Embarcação</p>
                          <h2 className="text-lg font-medium text-white tracking-wide mt-1">{boat.nome}</h2>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                          <Ship className="w-5 h-5 text-[#B69D74]" />
                        </div>
                      </div>
                      
                      <div className="mt-5 flex items-center gap-3">
                        <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Pronta para uso
                        </span>
                        {boat.modelo && (
                          <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] text-white/60 uppercase tracking-wider">
                            {boat.modelo}
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Pagination Dots */}
            {boats.length > 1 && (
              <div className="absolute bottom-0 left-0 w-full flex justify-center gap-2 pointer-events-none pb-2">
                {boats.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
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
                <p className="text-xs text-white/40 mt-0.5">{b?.nome}</p>
              </div>
              <span className="text-[9px] px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 uppercase font-bold tracking-wider">
                Confirmada
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

  const openReservation = (dateObj: Date, isoStr: string, isOccupied: boolean, isClosed: boolean) => {
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

    if (isClosed) {
      showToast('Aviso', 'A marina não funciona às segundas e terças (exceto plano completo).', 'warning');
      return;
    }

    if (isOccupied) {
      showToast('Aviso', 'Esta data já encontra-se ocupada por outro condômino.', 'warning');
      return;
    }

    if (totalAberto > 0) {
      showToast('Aviso', 'Você possui valores em aberto. Regularize sua situação para realizar agendamentos.', 'warning');
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

    return (
      <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
        <div className="mb-6 mt-4">
          <p className="text-[10px] uppercase tracking-widest text-[#B69D74] font-semibold">Calendário</p>
          <h1 className="text-2xl font-light tracking-wide text-white mt-1">Agendamentos</h1>
        </div>

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

              // Verificar se a marina está fechada (Segunda = 1, Terça = 2)
              const dayOfWeek = dateObj.getDay();
              const isClosed = (dayOfWeek === 1 || dayOfWeek === 2) && client.plano !== 'completo';

              // Verificar se o CLIENTE tem reserva nesse dia ou se está ocupado
              const hasMyReservation = myReservations.find(r => r.data === isoStr && r.status !== 'cancelado');
              const isOccupied = !hasMyReservation && mergedReservations.find(r => r.data === isoStr && r.status !== 'cancelado');
              
              // Evitar clicar no passado, dias ocupados ou dias fechados
              const isToday = isoStr === todayStr;
              const past = isoStr < todayStr;

              return (
                <button
                  key={idx}
                  onClick={() => openReservation(dateObj, isoStr, !!isOccupied, isClosed)}
                  className={`
                    relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-300
                    ${(past || isOccupied || isClosed) ? 'opacity-30' : 'hover:scale-105 cursor-pointer shadow-lg'}
                    ${hasMyReservation 
                      ? 'bg-[#B69D74]/20 border border-[#B69D74]/40 text-[#B69D74]' 
                      : isOccupied
                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        : 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.15] text-white/70'}
                    ${isToday && !hasMyReservation && !isOccupied ? 'ring-1 ring-white/20 bg-white/10 text-white' : ''}
                  `}
                >
                  <span className={`text-sm ${hasMyReservation || isOccupied ? 'font-bold' : 'font-medium'}`}>
                    {dateObj.getDate()}
                  </span>
                  
                  {hasMyReservation && (
                    <div className={`w-1.5 h-1.5 rounded-full bg-[#B69D74] mt-1 shadow-[0_0_8px_rgba(182,157,116,0.8)] ${hasMyReservation.id === lastAddedResId ? 'animate-[ping_2s_ease-out_1,pulse_2s_infinite]' : ''}`} />
                  )}
                  {isOccupied && (
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
                        {boat?.nome}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      res.status === 'cancelado' 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : res.statusMarina === 'confirmado'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {res.status === 'cancelado' ? 'Cancelado' : (res.statusMarina === 'confirmado' ? 'Confirmado' : 'Agendado')}
                    </span>
                    {res.statusMarina === 'confirmado' && (
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
                    {res.data === todayStrLocal && res.status !== 'cancelado' && res.statusMarina !== 'confirmado' && (
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
      <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6 pb-24">
        <div className="mb-6 mt-2">
          <p className="text-[10px] uppercase tracking-widest text-[#B69D74] font-semibold">Conta</p>
          <h1 className="text-2xl font-light tracking-wide text-white mt-1">Financeiro</h1>
        </div>

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
                <span className="text-xs font-medium text-white/60 tracking-wider">MARINA CLUB</span>
              </div>
              
              <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border backdrop-blur-sm ${
                client.statusFinanceiro === 'inadimplente'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {client.statusFinanceiro === 'inadimplente' ? 'Em Aberto' : 'Em Dia'}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Total em Aberto</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg text-white/60 font-light">R$</span>
                <h2 className="text-4xl font-light text-white tracking-tight">
                  {totalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/30 font-medium">
              <span>Status: {client.statusFinanceiro === 'inadimplente' ? 'Requer Atenção' : 'Regular'}</span>
              <span className="text-[#B69D74]">Premium Member</span>
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
        <div className="space-y-4">
          {(() => {
            const filteredTransacoes = transacoes.filter(t => {
              if (financeTab === 'fatura') {
                return t.status !== 'pago' && t.status !== 'cancelado';
              }
              return t.status === 'pago';
            });
            
            if (filteredTransacoes.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-5 h-5 text-white/20" />
                  </div>
                  <p className="text-sm text-white/40 text-center font-medium">Nenhuma movimentação por aqui.</p>
                  <p className="text-xs text-white/30 text-center mt-1">Você está com tudo em dia.</p>
                </div>
              );
            }
            
            return (
              <div className="space-y-3">
                {filteredTransacoes.map((t: any) => (
                  <div key={t.id} className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl p-4 transition-all duration-300 overflow-hidden">
                    <div className="flex items-center gap-4">
                      {/* Ícone da Transação */}
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        {getTransactionIcon(t.categoria)}
                      </div>
                      
                      {/* Detalhes Principais */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="text-sm font-medium text-white truncate pr-2">{t.descricao || t.categoria}</span>
                          <span className={`text-sm font-semibold whitespace-nowrap ${
                            t.status === 'pago' ? 'text-white' : 'text-white'
                          }`}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[11px] text-white/40">
                            Vencimento: <span className="text-white/60 font-medium">{t.dataVencimento ? t.dataVencimento.split('-').reverse().join('/') : ''}</span>
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            t.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400' :
                            t.status === 'vencido' ? 'bg-rose-500/10 text-rose-400' :
                            t.status === 'cancelado' ? 'bg-white/10 text-white/50' :
                            'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações Rápidas */}
                    {(t.status !== 'pago' || t.boletoUrl || t.comprovante) && (
                      <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {t.status !== 'pago' && (
                          <button 
                            onClick={() => handleOpenPixPayment(t)}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-full text-[10px] font-semibold text-amber-400 transition-colors"
                          >
                            <QrCode className="w-3 h-3" />
                            Pagar com PIX
                          </button>
                        )}
                        {t.boletoUrl && (
                          <a href={t.boletoUrl} target="_blank" rel="noreferrer" 
                             className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#B69D74]/10 hover:bg-[#B69D74]/20 border border-[#B69D74]/20 rounded-full text-[10px] font-semibold text-[#B69D74] transition-colors">
                            <FileText className="w-3 h-3" />
                            Acessar Boleto
                          </a>
                        )}
                        {t.comprovante && (
                          <a href={t.comprovante} target="_blank" rel="noreferrer" 
                             className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-full text-[10px] font-semibold text-emerald-400 transition-colors">
                            <CheckCircle className="w-3 h-3" />
                            Comprovante
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
      <div className="mb-8 mt-4">
        <p className="text-[10px] uppercase tracking-widest text-[#B69D74] font-semibold">Configurações</p>
        <h1 className="text-2xl font-light tracking-wide text-white mt-1">Meu Perfil</h1>
      </div>

      {/* Avatar & Basic Info */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#B69D74]/20 to-[#B69D74]/5 border border-[#B69D74]/30 flex items-center justify-center">
          <User className="w-6 h-6 text-[#B69D74]" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-white">{client.nome}</h2>
          <p className="text-xs text-white/40 font-mono mt-0.5">{client.cpf}</p>
        </div>
      </div>

      <div className="space-y-6">
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
          <div className="flex items-center gap-4">
            <Anchor className="w-4 h-4 text-white/30" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-white/30">Cota Principal</p>
              <p className="text-sm text-[#B69D74] font-medium mt-1 uppercase tracking-widest">{client.cota || 'Padrão'}</p>
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
                  <p className="text-[10px] text-white/40 mt-0.5">Acesse como um aplicativo nativo</p>
                </div>
              </div>
              <p className="text-xs text-white/50 leading-relaxed mb-4">
                Adicione o Vila Náutica à sua tela inicial para uma experiência completa, com carregamento instantâneo e acesso direto.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleInstallApp}
                  className="flex-1 py-2.5 bg-[#B69D74] hover:bg-[#a38b65] text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {isIOS ? 'Como Instalar' : 'Instalar App'}
                </button>
                <button
                  onClick={() => setShowInstallBanner(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors border border-white/10 cursor-pointer"
                >
                  Depois
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden">
          <button 
            onClick={() => setShowPrivacyModal(true)}
            className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-white/50" />
              <span className="text-sm font-light text-white">Privacidade & LGPD</span>
            </div>
            <span className="text-white/20">→</span>
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-5 hover:bg-white/5 transition-colors text-rose-400"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-light">Sair do Aplicativo</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] w-full bg-[#020202] text-white font-sans relative overflow-x-hidden pb-24 selection:bg-[#B69D74]/30 pwa-safe-top">
      
      {/* Ambient Dark Background Effect */}
      <div className="fixed inset-0 pointer-events-none opacity-40 mix-blend-screen z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.015)_0%,_transparent_60%)]"></div>
      </div>

      {/* Main Content Area (Mobile Container Logic) */}
      <div className="relative z-10 w-full max-w-[480px] mx-auto min-h-[100dvh] flex flex-col">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'calendar' && renderCalendar()}
        {activeTab === 'finance' && renderFinance()}
        {activeTab === 'profile' && renderProfile()}
      </div>

      {/* Bottom Navigation (iPhone Style Glassmorphism) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 px-4 pb-6 pt-4 bg-[#050505]/90 backdrop-blur-2xl border-t border-white/[0.04] pwa-safe-bottom">
        <div className="max-w-[400px] mx-auto flex items-center justify-between px-2 relative">
          
          <button 
            onClick={() => setActiveTab('home')}
            className="flex flex-col items-center gap-1.5 px-3 z-10"
          >
            <Home className={`w-6 h-6 transition-colors duration-300 ${activeTab === 'home' ? 'text-[#B69D74]' : 'text-white/30'}`} />
            <span className={`text-[9px] uppercase tracking-wider font-semibold transition-colors duration-300 ${activeTab === 'home' ? 'text-[#B69D74]' : 'text-transparent'}`}>
              Início
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('calendar')}
            className="flex flex-col items-center gap-1.5 px-3 z-10"
          >
            <Calendar className={`w-6 h-6 transition-colors duration-300 ${activeTab === 'calendar' ? 'text-white' : 'text-white/30'}`} />
            <span className={`text-[9px] uppercase tracking-wider font-semibold transition-colors duration-300 ${activeTab === 'calendar' ? 'text-white' : 'text-transparent'}`}>
              Reservas
            </span>
          </button>

          {/* Spacer for Floating Button */}
          <div className="w-16"></div>

          {/* Central Floating Action Button */}
          <div className="absolute left-1/2 -top-10 -translate-x-1/2 z-50 pointer-events-auto">
            <button 
              onClick={() => setActiveTab('calendar')}
              className="w-16 h-16 bg-gradient-to-tr from-[#B69D74] to-[#cbb28b] hover:from-[#a38b65] hover:to-[#B69D74] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(182,157,116,0.4)] transition-transform hover:scale-105 active:scale-95 border-[4px] border-[#050505]"
            >
              <Plus className="w-7 h-7 text-slate-900" />
            </button>
          </div>

          <button 
            onClick={() => setActiveTab('finance')}
            className="flex flex-col items-center gap-1.5 px-3 z-10"
          >
            <Wallet className={`w-6 h-6 transition-colors duration-300 ${activeTab === 'finance' ? 'text-white' : 'text-white/30'}`} />
            <span className={`text-[9px] uppercase tracking-wider font-semibold transition-colors duration-300 ${activeTab === 'finance' ? 'text-white' : 'text-transparent'}`}>
              Financeiro
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('profile')}
            className="flex flex-col items-center gap-1.5 px-3 z-10"
          >
            <User className={`w-6 h-6 transition-colors duration-300 ${activeTab === 'profile' ? 'text-white' : 'text-white/30'}`} />
            <span className={`text-[9px] uppercase tracking-wider font-semibold transition-colors duration-300 ${activeTab === 'profile' ? 'text-white' : 'text-transparent'}`}>
              Perfil
            </span>
          </button>

        </div>
      </nav>

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
                    O <strong className="font-medium text-white/95">Grupo Vila Náutica</strong> composto por Vila Náutica, Vila Náutica, Vale Administradora e Passeios do Vale, preza pelo mais alto rigor no tratamento dos seus dados.
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
                      <p className="text-white/40">Registro de das e períodos solicitados para navegação das embarcações.</p>
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
      <ClientReservationModal 
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        selectedDate={selectedDate}
        client={client}
        boats={boats}
        onSuccess={(newRes) => {
          if (newRes) {
            setOptimisticReservations(prev => [...prev, newRes]);
            setLastAddedResId(newRes.id);
          }
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
        onSuccess={() => {
          setIsCheckinModalOpen(false);
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
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
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

      {/* Modal de Pagamento Pix */}
      {selectedTransactionForPix && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[110] animate-in fade-in duration-300">
          <div className="bg-[#1A1A1A]/95 border border-white/10 rounded-3xl w-full max-w-sm p-6 relative shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setSelectedTransactionForPix(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white hover:bg-white/5 p-1.5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

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
                  <p className="text-xs text-white/40 font-medium">Gerando PIX no Asaas...</p>
                </div>
              ) : pixError ? (
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
                    <X className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-white max-w-[240px] leading-relaxed">{pixError}</p>
                  <button 
                    onClick={() => handleOpenPixPayment(selectedTransactionForPix)}
                    className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white transition-colors"
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
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 ${
                          copiedPix 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-[#B69D74]/20 hover:bg-[#B69D74]/30 text-[#B69D74] border border-[#B69D74]/30'
                        }`}
                      >
                        {copiedPix ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-white/40 text-center font-medium max-w-[200px] leading-relaxed">
                    Abra o app do seu banco e escaneie o código QR acima ou utilize o Copia e Cola.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 text-center">
              <button 
                onClick={() => setSelectedTransactionForPix(null)}
                className="text-xs text-white/40 hover:text-white transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
