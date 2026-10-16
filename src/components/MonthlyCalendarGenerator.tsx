import React, { useState, useEffect, useRef } from 'react';
import { reservationDB, boatDB, clientDB } from '../db';
import { fetchGoogleCalendarEventsRange, CalendarEvent, mergeLocalAndGoogleEvents } from '../googleCalendar';
import { Embarcacao, Cliente } from '../types';
import { getBoatCode } from '../utils/boatUtils';
// @ts-ignore
import logoSrc from '../assets/images/vale_nauticos_logo_1780256879963.png';
import { 
  Calendar, 
  Download, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Grid, 
  Ship,
  Sparkles,
  Info,
  AlertCircle,
  ChevronDown,
  RefreshCw,
  Send
} from 'lucide-react';

interface MonthlyCalendarGeneratorProps {
  initialBoatId?: string;
  initialDate?: Date | string;
  onClose?: () => void;
  autoExport?: boolean;
  onExport?: (base64: string) => void;
  // Make it usable by client dashboard
  providedBoats?: Embarcacao[];
  providedReservations?: any[];
  providedClients?: Cliente[];
}

// Utility to get 1st and 2nd word from name
function getFirstTwoNames(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
  if (parts.length <= 2) return fullName;
  return `${parts[0]} ${parts[1]}`;
}

function parseEventDescription(desc: string) {
  if (!desc) return { details: [], notes: '' };
  const lines = desc.split('\n');
  const details: { label: string; value: string }[] = [];
  let notes = '';

  lines.forEach(line => {
    if (line.includes(':')) {
      const idx = line.indexOf(':');
      const label = line.substring(0, idx).trim();
      const value = line.substring(idx + 1).trim();
      details.push({ label, value });
    } else if (line.trim().startsWith('Obs:')) {
      notes = line.replace('Obs:', '').trim();
    }
  });

  return { details, notes };
}

const WEEKDAYS = ['DOM.', 'SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function MonthlyCalendarGenerator({ initialBoatId, initialDate, onClose, autoExport, onExport, providedBoats, providedReservations, providedClients }: MonthlyCalendarGeneratorProps) {
  const [boats] = useState<Embarcacao[]>(() => {
    if (providedBoats) return [...providedBoats].sort((a, b) => a.nome.localeCompare(b.nome));
    return [...boatDB.getAll()].sort((a, b) => a.nome.localeCompare(b.nome));
  });
  const [selectedBoatId, setSelectedBoatId] = useState(initialBoatId || boats[0]?.id || '');
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

  // Searchbar select states and logic
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredBoats = boats.filter(b => {
    const q = searchQuery.toLowerCase().trim();
    return b.nome.toLowerCase().includes(q) || String(b.numero).includes(q);
  });

  useEffect(() => {
    const img = new Image();
    img.src = logoSrc;
    img.onload = () => {
      setLogoImage(img);
    };
  }, []);

  const [currentDate, setCurrentDate] = useState(() => {
    if (initialDate) {
      const parsed = typeof initialDate === 'string' ? new Date(initialDate + 'T12:00:00') : new Date(initialDate);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  });
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeBoat = boats.find(b => b.id === selectedBoatId);

  const handleSendToWhatsapp = async () => {
    if (!activeBoat?.whatsappGroupId) return;
    setIsSendingWhatsapp(true);
    try {
      drawCanvas();
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Elemento do calendário não encontrado");
      
      const dataUrl = canvas.toDataURL('image/png');

      setToastMsg('Enviando para o WhatsApp...');
      
      const token = localStorage.getItem('admin_token') || localStorage.getItem('client_token');
      
      const response = await fetch('/api/whatsapp/send-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          base64Image: dataUrl,
          groupId: activeBoat.whatsappGroupId,
          boatName: activeBoat.nome
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha no envio da mensagem.');
      }
      
      setToastMsg('Imagem enviada com sucesso para o grupo!');
    } catch (err: any) {
      console.error('Erro ao enviar whatsapp:', err);
      setToastMsg('Erro ao enviar para o WhatsApp: ' + err.message);
    } finally {
      setIsSendingWhatsapp(false);
    }
  };
  const boatCode = activeBoat ? `M${(activeBoat.numero || '').padStart(2, '0')}` : 'M00';

  useEffect(() => {
    if (initialDate) {
      const parsed = typeof initialDate === 'string' ? new Date(initialDate + 'T12:00:00') : new Date(initialDate);
      if (!isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
      }
    }
  }, [initialDate]);

  useEffect(() => {
    if (initialBoatId) {
      setSelectedBoatId(initialBoatId);
    }
  }, [initialBoatId]);

  const provResStr = providedReservations ? JSON.stringify(providedReservations.map(r => ({ id: r.id, status: r.status, data: r.data }))) : '';

  useEffect(() => {
    loadEvents();
  }, [currentDate, provResStr]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const startOfGrid = new Date(firstDay);
      startOfGrid.setDate(firstDay.getDate() - firstDay.getDay()); // Go back to Sunday

      // Fetch local reservations in the 38-day range
      const dStart = new Date(startOfGrid);
      const dEnd = new Date(startOfGrid);
      dEnd.setDate(dEnd.getDate() + 41);
      const startStr = dStart.toISOString().split('T')[0];
      const endStr = dEnd.toISOString().split('T')[0];

      let localResRange;
      if (providedReservations) {
        localResRange = providedReservations.filter(r =>
          (r.status === 'confirmado' || r.status === 'agendado') &&
          r.data >= startStr &&
          r.data <= endStr
        );
      } else {
        localResRange = reservationDB.getAll().filter(r =>
          (r.status === 'confirmado' || r.status === 'agendado') &&
          r.data >= startStr &&
          r.data <= endStr
        );
      }

      const boatsList = providedBoats || boatDB.getAll();
      const clientsList = providedClients || clientDB.getAll();
      
      // Converte apenas as reservas locais (sem precisar consultar o Google Calendar)
      const mappedLocalEvents: CalendarEvent[] = localResRange.map(res => {
         const b = boatsList.find(x => x.id === res.embarcacaoId);
         const c = clientsList.find(x => x.id === res.clienteId);
         const boatCodeStr = b ? (b.numero ? `M${b.numero.padStart(2, '0')}` : b.nome) : 'MXX';
         let shortName = c ? getFirstTwoNames(c.nome) : 'Desconhecido';
         if (!c && res.observações?.includes('[NOME_RECUPERADO:')) {
           const match = res.observações.match(/\[NOME_RECUPERADO:(.*?)\]/);
           if (match) shortName = getFirstTwoNames(match[1].trim());
         }
         
         return {
           id: res.id,
           summary: `${boatCodeStr} - ${shortName} ${res.status === 'cancelado' ? '(CANCELADO)' : ''}`,
           description: `Status: ${res.status === 'confirmado' ? 'Confirmado' : res.status === 'cancelado' ? 'Cancelado' : 'Agendado'}\nObs: ${res.observações || ''}`,
           start: { date: res.data },
           end: { date: res.data }
         };
      });

      setAllEvents(mappedLocalEvents);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate calendar grid dates (6 rows * 7 columns = 42 cells)
  const getGridDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOfGrid = new Date(firstDay);
    startOfGrid.setDate(firstDay.getDate() - firstDay.getDay()); // Sun

    const grid: Date[] = [];
    const curr = new Date(startOfGrid);
    for (let i = 0; i < 42; i++) {
      grid.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return grid;
  };

  const gridDates = getGridDates();

  // Highlight if a specific day is mapped to the current boat or FECHADO
  const getDayStatus = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday...

    // Check if there is an event for this boat code on this date
    // Normalize code comparison (e.g. match M26 in event summary)
    const matchEvent = allEvents.find(evt => {
      const evtDate = evt.start.dateTime ? evt.start.dateTime.substring(0, 10) : evt.start.date;
      if (evtDate !== dateStr) return false;
      const summary = evt.summary.toUpperCase();
      return summary.includes(boatCode.toUpperCase()) && !summary.includes('FECHADO');
    });

    if (matchEvent) {
      // Try to parse clean target name (e.g., from "M26 - VALERIA" -> "VALERIA")
      let label = matchEvent.summary;
      if (label.includes('-')) {
        label = label.split('-')[1].trim();
      }

      const { details } = parseEventDescription(matchEvent.description || '');
      const statusDetail = details.find(d => d.label.toLowerCase().includes('status'));
      const currentStatus = statusDetail ? statusDetail.value : 'Agendado';
      const isCanceled = currentStatus.toLowerCase() === 'cancelado' || matchEvent.summary.toLowerCase().includes('cancelado');
      const isConfirmed = currentStatus.toLowerCase() === 'confirmado';

      const statusType = isCanceled 
        ? ('canceled' as const) 
        : isConfirmed 
          ? ('confirmed' as const) 
          : ('active' as const);

      return { type: statusType, label: `${boatCode} - ${label.toUpperCase()}` };
    }

    // Monday (1) and Tuesday (2) are FECHADO (closed) if there's no booking
    if (dayOfWeek === 1 || dayOfWeek === 2) {
      return { type: 'closed' as const, label: 'FECHADO' };
    }

    return null;
  };

  // Navigate Months
  const stepMonth = (amount: number) => {
    const next = new Date(currentDate);
    next.setMonth(currentDate.getMonth() + amount);
    setCurrentDate(next);
  };

  // Render to canvas for high-fidelity export
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    // Fill background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Title / Header background and text (plain white for blending matching logo)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, 90);

    ctx.font = 'bold 26px Inter, sans-serif';
    ctx.fillStyle = '#1E293B';
    const monthTitle = `${MONTH_NAMES[currentDate.getMonth()].toUpperCase()} ${currentDate.getFullYear()}`;
    const fullHeaderTitle = `PLANILHA DE OCUPAÇÃO - ${boatCode} — ${monthTitle}`;
    ctx.fillText(fullHeaderTitle, 40, 55);

    // Draw brand logo in header if loaded
    if (logoImage) {
      ctx.drawImage(logoImage, W - 190, 10, 150, 70);
    }

    // Grid details
    const startY = 140;
    const cellW = W / 7;
    const cellH = (H - startY) / 6;

    // Weekday headers
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 16px Inter, sans-serif';
    WEEKDAYS.forEach((day, index) => {
      ctx.fillText(day, index * cellW + cellW / 2 - ctx.measureText(day).width / 2, 120);
    });

    // Draw grid borders
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    // Horizontal lines
    for (let r = 0; r <= 6; r++) {
      const y = startY + r * cellH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // Vertical lines
    for (let c = 0; c <= 7; c++) {
      const x = c * cellW;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Today marker configuration
    const todayStr = new Date().toISOString().split('T')[0];

    // Render cells content
    gridDates.forEach((date, index) => {
      const r = Math.floor(index / 7);
      const c = index % 7;
      const x = c * cellW;
      const y = startY + r * cellH;

      const dateStr = date.toISOString().split('T')[0];
      const isCurrentMonth = date.getMonth() === currentDate.getMonth();

      // Draw Day count text
      ctx.fillStyle = isCurrentMonth ? '#1E293B' : '#94A3B8';
      ctx.font = 'bold 18px Inter, "Space Grotesk", sans-serif';
      
      const dayNum = date.getDate().toString();
      const numW = ctx.measureText(dayNum).width;

      const isToday = dateStr === todayStr;

      if (isToday) {
        // Draw blue badge exactly like screenshot
        ctx.fillStyle = '#0284C7'; // sky-600
        ctx.beginPath();
        ctx.arc(x + cellW / 2, y + 32, 18, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(dayNum, x + cellW / 2 - numW / 2, y + 38);
      } else {
        // Just text
        ctx.fillText(dayNum, x + cellW / 2 - numW / 2, y + 38);
      }

      // Draw status/booking bands
      const status = getDayStatus(date);
      if (status) {
        const padding = 10;
        const pillY = y + 65;
        const pillH = 34;

        ctx.beginPath();
        if (status.type === 'closed') {
          ctx.fillStyle = '#CC0000'; // Dark red for FECHADO
        } else if (status.type === 'canceled') {
          ctx.fillStyle = '#94A3B8'; // Light gray for Canceled
        } else if (status.type === 'confirmed') {
          ctx.fillStyle = '#16A34A'; // Green for CONFIRMADO
        } else {
          ctx.fillStyle = '#F97316'; // Orange for active pending ('AGENDADO')
        }
        
        // Draw round rectangle
        ctx.roundRect ? ctx.roundRect(x + padding, pillY, cellW - padding * 2, pillH, 6) : ctx.rect(x + padding, pillY, cellW - padding * 2, pillH);
        ctx.fill();

        // Label Text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Inter, sans-serif';
        const labelText = status.label;
        const textW = ctx.measureText(labelText).width;
        ctx.fillText(labelText, x + cellW / 2 - textW / 2, pillY + 22);
      }
    });
  };

  const regenerateImage = () => {
    setTimeout(() => {
      try {
        drawCanvas();
        const canvas = canvasRef.current;
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          setImageUrl(dataUrl);
          
          // Only auto-export when the data is fully loaded, there are events, and logo is ready
          // The delay ensures the events have been populated
          if (autoExport && onExport && !isLoading && logoImage) {
            onExport(dataUrl);
          }
        }
      } catch (err) {
        console.error('Erro ao gerar imagem:', err);
      }
    }, 150);
  };

  useEffect(() => {
    if (!isLoading && logoImage) {
      regenerateImage();
    }
  }, [allEvents, selectedBoatId, currentDate, logoImage, isLoading]);

  const captureClipboard = async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Fallback manual click para o usuário
      if (!navigator.clipboard || !navigator.clipboard.write) {
        showToast('Navegador não suporta cópia direta. Clique com botão direito na imagem e copie!');
        return;
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Falha ao gerar a imagem no formato binário.');
          return;
        }
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setCopied(true);
          showToast('Tabela copiada para a área de transferência! Cole no WhatsApp (Ctrl+V / Command+V).');
          setTimeout(() => setCopied(false), 2500);
        } catch (e: any) {
          console.error(e);
          showToast('Navegador bloqueou a cópia automática. Use o botão "Baixar Imagem" ou clique com botão direito e copie a imagem gerada abaixo.');
        }
      }, 'image/png');
    } catch (err: any) {
      showToast('Erro ao copiar a imagem: ' + err.message);
    }
  };

  const handleDownload = () => {
    try {
      drawCanvas();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dataUrl = canvas.toDataURL('image/png');
      const filename = `Escala_Marina_${boatCode}_${MONTH_NAMES[currentDate.getMonth()]}_2026.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      setDownloaded(true);
      showToast('Agendamentos baixados como imagem PNG!');
      setTimeout(() => setDownloaded(false), 2500);
    } catch (err: any) {
      showToast('Erro ao baixar imagem: ' + err.message);
    }
  };

  return (
    <div id="monthly-export-section" className="bg-white border border-slate-100 rounded-2xl shadow-md p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Gerador de Calendário Mensal ({boatCode})</h3>
            <p className="text-xs text-slate-500 font-sans">Compartilhe ou guarde a tabela consolidada de saídas da lancha/jet ski.</p>
          </div>
        </div>

        {/* Action controllers */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadEvents}
            className="inline-flex items-center px-3.5 py-2 hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Atualizar Tabela"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={captureClipboard}
            className="inline-flex items-center px-3.5 py-2 hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-2 text-slate-500" />
                Copiar Imagem
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-2" />
            {downloaded ? 'Baixado!' : 'Baixar Imagem'}
          </button>

          {activeBoat?.whatsappGroupId ? (
            <button
              onClick={handleSendToWhatsapp}
              disabled={isSendingWhatsapp}
              className="inline-flex items-center px-3.5 py-2 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-70 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              title={`Enviar diretamente para o grupo do WhatsApp da embarcação (${activeBoat.nome})`}
            >
              <Send className={`w-3.5 h-3.5 mr-2 ${isSendingWhatsapp ? 'animate-pulse' : ''}`} />
              {isSendingWhatsapp ? 'Enviando...' : 'Enviar p/ WhatsApp (Grupo)'}
            </button>
          ) : (
            <button
              onClick={captureClipboard}
              className="inline-flex items-center px-3.5 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Copiar imagem formatada para colar no WhatsApp Web (Ctrl+V)"
            >
              <Copy className="w-3.5 h-3.5 mr-2" />
              Copiar p/ WhatsApp Web
            </button>
          )}
        </div>
      </div>

      {toastMsg && (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-lg p-3 text-xs flex items-center space-x-2">
          <Info className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Selector and Nav */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-50/70 p-4 rounded-xl border border-slate-100">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Selecione a Embarcação
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setSearchQuery('');
              }}
              className="w-full h-9 bg-white border border-slate-200 text-sm font-semibold rounded-lg px-2.5 flex items-center justify-between focus:outline-none focus:border-indigo-500 cursor-pointer text-left shadow-xs"
            >
              <span className="truncate">{activeBoat ? getBoatCode(activeBoat) : 'Selecione a Embarcação'}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
            </button>
            
            {dropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                  <input
                    type="text"
                    placeholder="Pesquisar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500 font-medium bg-white"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto max-h-48 divide-y divide-slate-50">
                  {filteredBoats.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">Nenhuma embarcação encontrada</div>
                  ) : (
                    filteredBoats.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSelectedBoatId(b.id);
                          setDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between ${b.id === selectedBoatId ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-50' : 'text-slate-700'}`}
                      >
                        <span className="truncate pr-2">{getBoatCode(b)}</span>
                        {b.id === selectedBoatId && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none mb-1">Mês Selecionado</span>
            <span className="font-bold text-slate-800 text-sm">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => stepMonth(-1)}
              className="p-1.5 hover:bg-white bg-slate-100 border border-slate-200/65 rounded-lg text-slate-700 cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-slate-350 rounded cursor-pointer"
            >
              Mês Atual
            </button>
            <button
              onClick={() => stepMonth(1)}
              className="p-1.5 hover:bg-white bg-slate-100 border border-slate-200/65 rounded-lg text-slate-700 cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Month Grid Output */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
        
        {/* Days of week titles */}
        <div className="grid grid-cols-7 bg-slate-50/70 border-b border-slate-100 text-center py-2.5">
          {WEEKDAYS.map(day => (
            <span key={day} className="text-xs font-bold text-slate-500">{day}</span>
          ))}
        </div>

        {/* Days list */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 border-l border-t border-slate-50">
          {gridDates.map((date, index) => {
            const dateStr = date.toISOString().split('T')[0];
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const status = getDayStatus(date);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <div 
                key={dateStr}
                className={`min-h-[70px] p-1.5 flex flex-col justify-between transition-colors hover:bg-slate-50/30 ${
                  isCurrentMonth ? 'bg-white' : 'bg-slate-50/30 text-slate-300'
                }`}
              >
                {/* Day num */}
                <div className="flex justify-center">
                  <span className={`text-[11px] font-bold font-sans flex items-center justify-center p-1 w-6 h-6 rounded-full ${
                    isToday 
                      ? 'bg-sky-600 text-white font-extrabold shadow-xs' 
                      : isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                  }`}>
                    {date.getDate()}
                  </span>
                </div>

                {/* Pill display element copy-paste visual */}
                {status ? (
                  <div className={`mt-1.5 py-1 px-1 rounded text-[9px] font-extrabold text-center text-white line-clamp-1 uppercase leading-none ${
                    status.type === 'closed' 
                      ? 'bg-red-650 bg-red-600' 
                      : status.type === 'canceled'
                        ? 'bg-slate-400 line-through opacity-75'
                        : status.type === 'confirmed'
                          ? 'bg-emerald-600 font-extrabold'
                          : 'bg-orange-500'
                  }`} title={status.label}>
                    {status.label}
                  </div>
                ) : (
                  <div className="h-4"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hidden render target canvas for true export */}
      <canvas ref={canvasRef} className="hidden" />

      {imageUrl ? (
        <div className="space-y-3 border border-dashed border-indigo-200 bg-indigo-50/20 rounded-2xl p-5 shadow-inner transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100/60 pb-2.5">
            <span className="text-xs font-bold text-indigo-800 flex items-center">
              <Sparkles className="w-4 h-4 mr-1.5 text-indigo-500 animate-pulse" />
              Tabela Mensal em Imagem (Pronta para WhatsApp)
            </span>
            <span className="text-[10px] text-indigo-750 font-medium">
              👉 Clique com o botão direito sobre a imagem abaixo e selecione <strong className="font-bold underline">"Copiar imagem"</strong> ou toque e segure no celular!
            </span>
          </div>
          <div className="bg-white p-2.5 border border-slate-200/80 rounded-xl overflow-hidden flex justify-center shadow-xs">
            <img 
              referrerPolicy="no-referrer"
              src={imageUrl} 
              className="w-full h-auto max-w-4xl cursor-pointer hover:opacity-98 transition-all duration-150 rounded-lg hover:shadow-xs" 
              alt={`Tabela Mensal - ${boatCode}`}
              title="Clique com o botão direito e escolha 'Copiar imagem' para mandar no WhatsApp"
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-6 bg-slate-50/65 rounded-xl text-slate-400 text-xs border border-dashed border-slate-200">
          Gerando imagem para o WhatsApp...
        </div>
      )}

      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 flex items-start space-x-2.5">
        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-normal">
          💡 <strong>Dica de Uso:</strong> Use o botão <strong>"Copiar Imagem"</strong> para salvar a escala completa na memória do seu dispositivo. Cole de forma imediata (Ctrl+V / Command+V) nas janelas do WhatsApp Web com marinheiros ou sócios da embarcação!
        </p>
      </div>
    </div>
  );
}
