import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, Share2, Anchor, MapPin, Check, QrCode
} from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

interface ClientBoardingTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: any;
  boat: any;
  client: any;
}

export default function ClientBoardingTicketModal({
  isOpen,
  onClose,
  reservation,
  boat,
  client
}: ClientBoardingTicketModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  // Informações da embarcação (apenas 'Moto Aquática' ou 'Lancha', sem 'JET SKI')
  const boatCode = boat ? (boat.numero ? `M${boat.numero}` : (boat.nome || 'M00').split(' ')[0]) : 'M00';
  const isJet = boat?.tipo === 'jet' || (boat?.nome || '').toLowerCase().includes('jet');
  const boatTypeLabel = isJet ? 'Moto Aquática' : 'Lancha';

  // Formatação de data
  const rawDate = reservation?.data || '';
  let displayDate = rawDate;
  if (rawDate.includes('-')) {
    const parts = rawDate.split('-');
    displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // Nome completo do cotista sem cortes
  const clientFullName = (client?.nome || 'Cotista Titular').trim();

  // Informações de Navegação
  const destino = reservation?.destino || 'Costeira / Ilhas';
  const horaSaida = reservation?.previsaoSaida || reservation?.horaSaida || '12:00';
  const horaRetorno = reservation?.previsaoChegada || reservation?.horaChegada || '17:00';
  const totalPax = reservation?.pessoasABordo || 1;

  // Código único do ticket
  const resShortId = (reservation?.id || '0000').toString().slice(-4).toUpperCase();
  const ticketCode = `VN-${boatCode}-${displayDate.replace(/\//g, '')}-${resShortId}`;
  const authCode = `VAL-${resShortId}-${(boatCode || 'M').replace(/\D/g, '') || '01'}`;

  // Link público do validador para a marina
  const validatorUrl = (typeof window !== 'undefined' && reservation)
    ? `${window.location.origin}/validar-embarque?ticket=${encodeURIComponent(ticketCode)}&res=${encodeURIComponent(reservation?.id || '')}&b=${encodeURIComponent(boatCode)}&c=${encodeURIComponent(clientFullName)}&d=${encodeURIComponent(displayDate)}&s=${encodeURIComponent(horaSaida)}&r=${encodeURIComponent(horaRetorno)}&dest=${encodeURIComponent(destino)}&pax=${encodeURIComponent(totalPax)}`
    : '';

  // Gerar QR Code
  useEffect(() => {
    if (!isOpen || !reservation || !validatorUrl) return;
    QRCode.toDataURL(validatorUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0a0a0a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Erro ao gerar QR Code do Ticket:', err));
  }, [isOpen, reservation, validatorUrl]);

  if (!isOpen || !reservation) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ticketCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleSaveTicketImage = async () => {
    if (!ticketRef.current) return;
    try {
      setIsGeneratingImage(true);
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2.5,
        backgroundColor: '#07080c',
        useCORS: true,
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Ticket_Embarque_${boatCode}_${displayDate.replace(/\//g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao salvar imagem do ticket:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleShareTicket = async () => {
    const shareText = `🎟️ *TICKET DE EMBARQUE - VILA NÁUTICA*\n\n` +
      `⚓ *Embarcação:* ${boatCode} (${boatTypeLabel})\n` +
      `👤 *Cotista:* ${clientFullName}\n` +
      `📅 *Data:* ${displayDate}\n` +
      `⏰ *Horário:* ${horaSaida} às ${horaRetorno}\n` +
      `📍 *Destino:* ${destino}\n` +
      `👥 *Tripulantes:* ${totalPax} pessoa(s)\n` +
      `🎫 *Bilhete:* #${resShortId}\n` +
      `✅ *Status:* Embarque Liberado!\n\n` +
      `Validação Oficial: ${validatorUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket de Embarque ${boatCode} - Vila Náutica`,
          text: shareText,
          url: validatorUrl
        });
        return;
      } catch {
        // Fallback
      }
    }
    
    navigator.clipboard.writeText(shareText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-sm my-auto z-10 flex flex-col">
        {/* Botão Fechar Minimalista */}
        <div className="flex justify-end pb-2">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TICKET ESTILO INGRESSO DE CINEMA */}
        <div 
          ref={ticketRef}
          className="w-full bg-[#0d0e14] border border-[#B69D74]/40 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative overflow-hidden text-white select-none"
        >
          {/* Efeitos Glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#B69D74]/10 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />

          {/* PARTE SUPERIOR DO TICKET (CORPO DO BILHETE) */}
          <div className="p-5 sm:p-6 space-y-4">
            
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#B69D74]/15 border border-[#B69D74]/30 flex items-center justify-center text-[#B69D74]">
                  <Anchor className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-[#B69D74] block font-semibold">
                    GRUPO VILA NÁUTICA
                  </span>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Ticket de Embarque
                  </h3>
                </div>
              </div>

              <button 
                onClick={handleCopyCode}
                className="text-right text-[11px] font-mono text-white/40 hover:text-[#B69D74] transition-colors cursor-pointer"
                title="Copiar código do bilhete"
              >
                <span className="block text-[8px] uppercase tracking-wider text-white/30">Bilhete</span>
                <span className="font-bold text-[#B69D74]">#{resShortId}</span>
              </button>
            </div>

            {/* Cotista Titular e Embarcação */}
            <div className="space-y-2">
              <div>
                <span className="text-[8px] uppercase font-mono text-white/40 tracking-wider block mb-0.5">
                  Cotista Titular
                </span>
                <h2 className="text-base font-bold text-white uppercase tracking-wide leading-snug break-words">
                  {clientFullName}
                </h2>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                <div>
                  <span className="text-[8px] uppercase font-mono text-white/40 block">Embarcação</span>
                  <span className="font-bold text-[#B69D74] text-sm">
                    {boatCode} <span className="text-xs font-normal text-white/60">· {boatTypeLabel}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] uppercase font-mono text-white/40 block">Data</span>
                  <span className="font-mono font-bold text-white text-sm">{displayDate}</span>
                </div>
              </div>
            </div>

            {/* INFORMAÇÕES DE NAVEGAÇÃO COMPACTAS */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3 space-y-2 text-xs">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#B69D74] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] uppercase font-mono text-white/40 block">Destino</span>
                  <span className="font-medium text-white truncate block">{destino}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-white/[0.04] text-center">
                <div>
                  <span className="text-[8px] uppercase font-mono text-[#B69D74] block font-bold">Saída</span>
                  <span className="font-mono font-bold text-[#B69D74] text-xs">{horaSaida}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-white/40 block">Retorno</span>
                  <span className="font-mono font-bold text-white text-xs">{horaRetorno}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-mono text-white/40 block">Pessoas</span>
                  <span className="font-mono font-bold text-white text-xs">{totalPax}</span>
                </div>
              </div>
            </div>

          </div>

          {/* DIVISÓRIA ESTILO TICKET DE CINEMA: NOTCHES CIRCULARES LATERAIS + LINHA DE PICOTE */}
          <div className="relative flex items-center justify-between my-0">
            {/* Entalhe circular esquerdo vazado */}
            <div className="w-5 h-8 bg-black/85 rounded-r-full border-r border-[#B69D74]/40 -ml-[1px]" />
            
            {/* Linha tracejada do picote */}
            <div className="flex-1 border-b-2 border-dashed border-white/20 mx-3" />
            
            {/* Entalhe circular direito vazado */}
            <div className="w-5 h-8 bg-black/85 rounded-l-full border-l border-[#B69D74]/40 -mr-[1px]" />
          </div>

          {/* CANHOTO DE VALIDAÇÃO COM O QR CODE (STUB) */}
          <div className="p-5 sm:p-6 pt-3 text-center space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#B69D74]">
                Validador
              </span>
              <span className="text-[9px] font-mono text-white/40">
                {authCode}
              </span>
            </div>

            {/* QR Code */}
            <div className="inline-block p-2.5 bg-white rounded-2xl shadow-xl mx-auto">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code de Embarque" 
                  className="w-36 h-36 object-contain mx-auto"
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <Check className="w-3.5 h-3.5" />
                Embarque Liberado
              </span>
            </div>
          </div>

        </div>

        {/* Botões de Ação */}
        <div className="pt-3 flex gap-2">
          <button
            onClick={handleSaveTicketImage}
            disabled={isGeneratingImage}
            className="flex-1 py-3 bg-gradient-to-r from-[#B69D74] to-[#cbb28b] hover:brightness-110 active:scale-[0.99] text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isGeneratingImage ? 'Gerando...' : 'Salvar Ticket'}
          </button>

          <button
            onClick={handleShareTicket}
            className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartilhar</span>
          </button>
        </div>

      </div>
    </div>
  );
}
