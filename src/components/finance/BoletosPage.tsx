import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  XCircle,
  Search,
  Calendar,
  FileText,
  Send,
  EyeOff,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Trash2,
  X,
  Users,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  Check,
  Copy,
  Info,
  Shield,
  Pause,
  Play,
  Sliders,
  Settings2,
  Shuffle
} from 'lucide-react';
import { clientDB, boatDB } from '../../db';
import { Cliente, Embarcacao } from '../../types';
import { getBoatCode } from '../../utils/boatUtils';
import Select from 'react-select';
import { PageHeader } from '../tailadmin';

interface BoletoFile {
  originalName: string;
  payerName: string;
  tempPath: string;
  localPath: string;
  clientIdEncontrado?: string;
  confidence: 'alta' | 'media' | 'baixa' | 'none';
  ignored?: boolean;
}

interface AntiBlockConfig {
  enabled: boolean;
  profile: 'safe' | 'moderate' | 'fast' | 'custom';
  minDelaySec: number;
  maxDelaySec: number;
  pauseEvery: number;
  pauseDurationSec: number;
  simulateTyping: boolean;
  useSpintax: boolean;
  antiHash: boolean;
}

const DEFAULT_ANTIBLOCK_PROFILES: Record<'safe' | 'moderate' | 'fast', Omit<AntiBlockConfig, 'enabled' | 'profile'>> = {
  safe: {
    minDelaySec: 8,
    maxDelaySec: 16,
    pauseEvery: 8,
    pauseDurationSec: 30,
    simulateTyping: true,
    useSpintax: true,
    antiHash: true
  },
  moderate: {
    minDelaySec: 5,
    maxDelaySec: 10,
    pauseEvery: 15,
    pauseDurationSec: 20,
    simulateTyping: true,
    useSpintax: true,
    antiHash: true
  },
  fast: {
    minDelaySec: 2,
    maxDelaySec: 5,
    pauseEvery: 25,
    pauseDurationSec: 10,
    simulateTyping: false,
    useSpintax: false,
    antiHash: false
  }
};

const ALREADY_SENT_NAMES = [
  "ALLISON GABRIEL", "ALISSON GABRIEL", "ERIVAN DA COSTA", "RINALDO LUIZ", "DOMINGOS ANGELO",
  "PLINIO VICTOR", "THIAGO DOS REIS", "ALBERT EINSTEN", "JACKSON FERREIRA",
  "JOAO PAULO FIGUEIREDO", "JOAO EDUARDO DE SOUZA", "IAGO DA SILVA",
  "JEFERSON DOS SANTOS BARBOSA", "JOSIMAR RODRIGUES", "EUDES SOBREIRA",
  "RAFAEL CAMPELO", "LUAN YURI", "HUIGO GOMES", "DARK BLACK", "FERNANDO VIEIRA",
  "DIOGO VARGAS", "FRANCISCO BEZERRA", "JULIA INEZ CORREIA NOBRE MOTA",
  "VICTOR GOMES", "THULIO RAMIREZ", "DIEGO BARROSO", "JOSE PHELIPE",
  "DANILO PORTO", "FELIPE FRANCISCO", "ITALO GOMES", "LUIZ TORRISI", "WALNEY ARAUJO"
];

const PRESET_TEMPLATES = [
  {
    id: 'taxa_padrao',
    label: 'Taxa Administrativa (Padrão)',
    text: "{Olá|Oi|Prezado(a)} {nome}! 👋\n\n{Segue|Encaminhamos|Conforme combinado, segue} o boleto referente à *Taxa Administrativa* de {mes}/{ano}.\n\n{Qualquer dúvida, estamos à disposição!|Ficamos à total disposição para esclarecimentos.|Estamos ao seu dispor para qualquer dúvida.}\nGrupo Villa Náutica 🚤"
  },
  {
    id: 'aviso_vencimento',
    label: 'Lembrete Amigável',
    text: "{Olá|Oi|Prezado cotista} {nome}! {Tudo bem?|Esperamos que esteja bem!}\n\nEncaminhamos o seu boleto de *Taxa Administrativa* de {mes}/{ano}.\n\n{Contamos com sua pontualidade para mantermos as embarcações sempre prontas.|Agradecemos pela pontualidade de sempre!} Bom passeio!\nVilla Náutica ⛵"
  },
  {
    id: 'segunda_via',
    label: 'Segunda Via / Atualização',
    text: "{Olá|Oi|Prezado} {nome}!\n\nSegue a 2ª via atualizada do boleto de {mes}/{ano}.\n\n{Caso já tenha realizado o pagamento, por favor desconsidere este aviso.|Se o pagamento já foi efetuado, pedimos gentilmente desconsiderar.}\nAtenciosamente, Financeiro Villa Náutica 🚤"
  }
];

// Helper: Spintax resolver {A|B|C}
function parseSpintax(text: string): string {
  return text.replace(/\{([^{}]+)\}/g, (match, contents) => {
    // If it's a dynamic parameter, leave it untouched
    if (['nome', 'mes', 'ano'].includes(contents.toLowerCase())) {
      return match;
    }
    // If it contains pipe, pick random option
    if (contents.includes('|')) {
      const parts = contents.split('|');
      return parts[Math.floor(Math.random() * parts.length)].trim();
    }
    return match;
  });
}

// Helper: Micro zero-width hash-breaker
function appendAntiHash(text: string, index: number): string {
  const zeroWidths = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
  const count = (index % 4) + 1;
  const invisiblePad = Array.from({ length: count }, (_, i) => zeroWidths[(index + i) % zeroWidths.length]).join('');
  return text + invisiblePad;
}

export default function BoletosPage() {
  const [step, setStep] = useState<'upload' | 'review' | 'message'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // WhatsApp connection state
  const [instanceName] = useState<string>(() => {
    return localStorage.getItem('finance_whatsapp_instance') || 'financeiro';
  });
  const [waStatus, setWaStatus] = useState<'checking' | 'open' | 'close' | 'error'>('checking');

  // Data state
  const [boletos, setBoletos] = useState<BoletoFile[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);

  // Review state
  const [currentReviewIndex, setCurrentReviewIndex] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'todos' | 'prontos' | 'pendentes' | 'ignorados'>('todos');

  // Month reference
  const [monthYear, setMonthYear] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });

  // Message template
  const [messageTemplate, setMessageTemplate] = useState<string>(PRESET_TEMPLATES[0].text);
  const [previewSeed, setPreviewSeed] = useState<number>(0); // For live spintax re-render

  // Anti-Block Settings
  const [antiBlock, setAntiBlock] = useState<AntiBlockConfig>({
    enabled: true,
    profile: 'safe',
    ...DEFAULT_ANTIBLOCK_PROFILES.safe
  });
  const [showAntiBlockDetails, setShowAntiBlockDetails] = useState(false);

  // Sending state & controls
  const [sendingState, setSendingState] = useState<'idle' | 'sending' | 'cooling' | 'paused' | 'completed'>('idle');
  const [sendResults, setSendResults] = useState<{ clientId: string; status: 'success' | 'error'; error?: string }[]>([]);
  const [sendProgress, setSendProgress] = useState(0);
  const [currentSendingName, setCurrentSendingName] = useState<string>('');
  const [countdownSec, setCountdownSec] = useState<number>(0);
  const [countdownLabel, setCountdownLabel] = useState<string>('');
  const [sentCountInCurrentBatch, setSentCountInCurrentBatch] = useState<number>(0);

  // Control refs
  const isCancelledRef = useRef(false);
  const isPausedRef = useRef(false);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    setClientes(clientDB.getAll());
    setEmbarcacoes(boatDB.getAll());
    checkWhatsAppStatus();
  }, []);

  const checkWhatsAppStatus = async () => {
    try {
      setWaStatus('checking');
      const token = localStorage.getItem('admin_token');
      const inst = localStorage.getItem('finance_whatsapp_instance') || 'financeiro';
      const res = await fetch(`/api/whatsapp/status?instance=${inst}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const state = data?.instance?.state || 'close';
        setWaStatus(state === 'open' ? 'open' : 'close');
      } else {
        setWaStatus('close');
      }
    } catch {
      setWaStatus('error');
    }
  };

  const handleSelectAntiBlockProfile = (profile: 'safe' | 'moderate' | 'fast') => {
    setAntiBlock(prev => ({
      ...prev,
      profile,
      ...DEFAULT_ANTIBLOCK_PROFILES[profile]
    }));
  };

  const processUploadedFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) {
      alert("Por favor selecione arquivos válidos em formato PDF.");
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    files.forEach(f => formData.append('boletos', f));

    try {
      const token = localStorage.getItem('admin_token');
      const resUpload = await fetch('/api/boletos/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const dataUpload = await resUpload.json();

      if (!dataUpload.success) {
        alert("Erro no upload: " + (dataUpload.message || 'Falha ao processar arquivos.'));
        setIsProcessing(false);
        return;
      }

      const uploadedBoletos = dataUpload.boletos || [];
      if (uploadedBoletos.length === 0) {
        alert("Nenhum boleto válido foi identificado nos arquivos enviados.");
        setIsProcessing(false);
        return;
      }

      const namesToMatch = uploadedBoletos.map((b: any) => b.payerName);

      const resMatch = await fetch('/api/boletos/match-clients', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ names: namesToMatch })
      });
      const dataMatch = await resMatch.json();

      if (dataMatch.success) {
        const enrichedBoletos: BoletoFile[] = uploadedBoletos.map((b: any, index: number) => {
          const matchResult = dataMatch.matches ? dataMatch.matches[index] : null;
          const shouldIgnore = ALREADY_SENT_NAMES.some(n =>
            (b.payerName && b.payerName.toUpperCase().includes(n)) ||
            (matchResult?.match?.nome && matchResult.match.nome.toUpperCase().includes(n))
          );

          return {
            ...b,
            clientIdEncontrado: matchResult?.match?.id,
            confidence: matchResult?.confidence || 'none',
            ignored: shouldIgnore
          };
        });
        setBoletos(enrichedBoletos);
        setStep('review');
        setCurrentReviewIndex(0);
      } else {
        alert("Erro ao associar clientes aos boletos.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de comunicação ao processar os boletos.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilesDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processUploadedFiles(e.target.files);
    }
  };

  const handleDropArea = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleUpdateBoleto = (index: number, updates: Partial<BoletoFile>) => {
    setBoletos(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const setPresetMonth = (type: 'current' | 'next' | 'prev') => {
    const d = new Date();
    if (type === 'next') d.setMonth(d.getMonth() + 1);
    if (type === 'prev') d.setMonth(d.getMonth() - 1);
    setMonthYear(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
  };

  // Build personalized message with Spintax and Anti-Hash
  const buildPersonalizedMessage = (clientId: string, itemIndex: number = 0, forPreview: boolean = false) => {
    const client = clientes.find(c => c.id === clientId) || clientDB.getById(clientId);
    const firstName = client?.nome ? client.nome.split(' ')[0] : 'Cotista';
    const [mes, ano] = monthYear.split('/');

    let text = messageTemplate;

    // 1. Resolve Spintax {A|B|C} if enabled
    if (antiBlock.useSpintax || forPreview) {
      text = parseSpintax(text);
    }

    // 2. Replace standard placeholders
    text = text.replace(/\{nome\}/g, firstName);
    text = text.replace(/\{mes\}/g, mes || '');
    text = text.replace(/\{ano\}/g, ano || '');

    // 3. Append invisible anti-hash variation for actual sends
    if (antiBlock.antiHash && !forPreview) {
      text = appendAntiHash(text, itemIndex);
    }

    return text;
  };

  const activeBoletos = useMemo(() => {
    return boletos.filter(b => !b.ignored && b.clientIdEncontrado);
  }, [boletos]);

  const pendentesBoletos = useMemo(() => {
    return boletos.filter(b => !b.ignored && !b.clientIdEncontrado);
  }, [boletos]);

  const ignoradosBoletos = useMemo(() => {
    return boletos.filter(b => b.ignored);
  }, [boletos]);

  const filteredBoletos = useMemo(() => {
    return boletos
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => {
        if (reviewFilter === 'prontos' && (row.ignored || !row.clientIdEncontrado)) return false;
        if (reviewFilter === 'pendentes' && (row.ignored || row.clientIdEncontrado)) return false;
        if (reviewFilter === 'ignorados' && !row.ignored) return false;

        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        const payer = (row.payerName || '').toLowerCase();
        const file = (row.originalName || '').toLowerCase();
        const clientName = (clientes.find(c => c.id === row.clientIdEncontrado)?.nome || '').toLowerCase();
        return payer.includes(q) || file.includes(q) || clientName.includes(q);
      });
  }, [boletos, reviewFilter, searchTerm, clientes]);

  // Anti-block countdown helper
  const waitWithCountdown = async (seconds: number, label: string) => {
    setCountdownLabel(label);
    for (let s = seconds; s > 0; s--) {
      if (isCancelledRef.current) break;
      while (isPausedRef.current && !isCancelledRef.current) {
        setSendingState('paused');
        await new Promise(r => setTimeout(r, 400));
      }
      setCountdownSec(s);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdownSec(0);
    setCountdownLabel('');
  };

  // SEND LOOP WITH FULL ANTI-BLOCK GUARD
  const handleStartSending = async () => {
    if (activeBoletos.length === 0) return;

    // Validate phone numbers
    const validBoletos = activeBoletos.filter(b => {
      const c = clientes.find(cl => cl.id === b.clientIdEncontrado) || clientDB.getById(b.clientIdEncontrado!);
      return c && c.telefone && c.telefone.replace(/\D/g, '').length >= 10;
    });

    if (validBoletos.length === 0) {
      alert("Nenhum cliente associado possui número de telefone válido cadastrado.");
      return;
    }

    if (validBoletos.length < activeBoletos.length) {
      const diff = activeBoletos.length - validBoletos.length;
      if (!confirm(`Aviso: ${diff} cliente(s) não possuem telefone válido e serão pulados. Deseja prosseguir com os ${validBoletos.length} clientes válidos?`)) {
        return;
      }
    }

    // WhatsApp status check
    const inst = localStorage.getItem('finance_whatsapp_instance') || instanceName || 'financeiro';
    try {
      const token = localStorage.getItem('admin_token');
      const statusRes = await fetch(`/api/whatsapp/status?instance=${inst}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statusData = await statusRes.json();
      const state = statusData?.instance?.state || 'close';

      if (state !== 'open') {
        alert("O WhatsApp não está conectado! Por favor conecte a instância antes de disparar os boletos.");
        return;
      }
    } catch {
      alert("Aviso: Não foi possível checar o status da API do WhatsApp. Tentando disparo direto...");
    }

    // Initialize sending loop
    isCancelledRef.current = false;
    isPausedRef.current = false;
    currentIndexRef.current = 0;
    setSendingState('sending');
    setSendProgress(0);
    setSendResults([]);
    setSentCountInCurrentBatch(0);

    const [mes, ano] = monthYear.split('/');
    const token = localStorage.getItem('admin_token');
    const localResults: { clientId: string; status: 'success' | 'error'; error?: string }[] = [];

    for (let i = 0; i < validBoletos.length; i++) {
      if (isCancelledRef.current) break;

      // Handle user pause
      while (isPausedRef.current && !isCancelledRef.current) {
        setSendingState('paused');
        await new Promise(r => setTimeout(r, 400));
      }
      if (isCancelledRef.current) break;

      currentIndexRef.current = i;
      const boleto = validBoletos[i];
      const client = clientes.find(c => c.id === boleto.clientIdEncontrado) || clientDB.getById(boleto.clientIdEncontrado!)!;
      const firstName = client.nome ? client.nome.split(' ')[0] : 'Cotista';
      const fileName = `${firstName} - Taxa Administrativa ${mes || ''}-${ano || ''}.pdf`;

      // Build message with spintax & anti-hash
      const textMessage = buildPersonalizedMessage(client.id, i, false);

      setCurrentSendingName(client.nome);
      setSendingState('sending');

      try {
        const res = await fetch('/api/boletos/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instanceName: inst,
            simulateTyping: antiBlock.simulateTyping,
            boletos: [{
              clientId: client.id,
              number: client.telefone,
              text: textMessage,
              localPath: boleto.localPath,
              fileName
            }]
          })
        });

        const data = await res.json();
        if (data.success && data.results && data.results.length > 0) {
          localResults.push(data.results[0]);
        } else {
          localResults.push({ clientId: client.id, status: 'error', error: data.message || 'Falha no disparo' });
        }
      } catch (err: any) {
        localResults.push({ clientId: client.id, status: 'error', error: 'Falha de rede com o servidor' });
      }

      setSendResults([...localResults]);
      setSendProgress(Math.round(((i + 1) / validBoletos.length) * 100));

      const isLastItem = i === validBoletos.length - 1;
      if (isLastItem || isCancelledRef.current) break;

      // Anti-block Rule 1: Batch Cooling-off pause after N messages
      const countInBatch = (i + 1);
      if (antiBlock.enabled && antiBlock.pauseEvery > 0 && countInBatch % antiBlock.pauseEvery === 0) {
        setSendingState('cooling');
        await waitWithCountdown(
          antiBlock.pauseDurationSec,
          `Pausa de resfriamento anti-bloqueio (${countInBatch}/${validBoletos.length} enviados)`
        );
      } else if (antiBlock.enabled) {
        // Anti-block Rule 2: Random Jitter Delay between individual sends
        const minD = Math.max(2, antiBlock.minDelaySec);
        const maxD = Math.max(minD, antiBlock.maxDelaySec);
        const randomDelay = Math.floor(Math.random() * (maxD - minD + 1)) + minD;

        await waitWithCountdown(
          randomDelay,
          `Aguardando intervalo randômico de proteção (${randomDelay}s)...`
        );
      } else {
        // Minimal fallback delay
        await waitWithCountdown(2, "Intervalo padrão...");
      }
    }

    setSendingState('completed');
  };

  const handlePauseSending = () => {
    isPausedRef.current = true;
    setSendingState('paused');
  };

  const handleResumeSending = () => {
    isPausedRef.current = false;
    setSendingState('sending');
  };

  const handleCancelSending = () => {
    if (confirm("Deseja interromper o envio restante? Os boletos já enviados permanecerão válidos.")) {
      isCancelledRef.current = true;
      isPausedRef.current = false;
    }
  };

  const handleResetBatch = () => {
    if (boletos.length > 0) {
      if (!confirm("Tem certeza que deseja descartar este lote e começar novamente?")) return;
    }
    setStep('upload');
    setBoletos([]);
    setCurrentReviewIndex(0);
    setSendingState('idle');
    setSendResults([]);
    setSendProgress(0);
  };

  const clientOptions = useMemo(() => {
    return clientes.map(c => {
      const boat = c.embarcacaoId ? embarcacoes.find(b => b.id === c.embarcacaoId) : null;
      const boatLabel = boat ? ` • ${getBoatCode(boat)}` : '';
      return {
        value: c.id,
        label: `${c.nome}${c.telefone ? ` (${c.telefone})` : ' [Sem Tel]'}${boatLabel}`,
        client: c
      };
    });
  }, [clientes, embarcacoes]);

  // RENDER STEP 1: UPLOAD
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDropArea}
        className={`bg-white rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 shadow-xs flex flex-col items-center justify-center ${
          isDragging
            ? 'border-stone-900 bg-stone-50/80 scale-[0.99]'
            : 'border-stone-200/90 hover:border-stone-400 bg-gradient-to-b from-stone-50/40 via-white to-stone-50/20'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-stone-900 text-white flex items-center justify-center mb-5 shadow-sm ring-4 ring-stone-100">
          <UploadCloud className="w-8 h-8 text-stone-100" />
        </div>

        <h3 className="text-xl font-bold text-stone-900 tracking-tight mb-2">
          Carregar Arquivos de Boletos (PDF)
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 max-w-lg mb-6 leading-relaxed">
          Arraste e solte um arquivo PDF único com múltiplas páginas ou vários PDFs individuais.
          O sistema separa as páginas automaticamente e reconhece o nome do pagador.
        </p>

        <div className="w-full max-w-md bg-stone-50 border border-stone-200/90 rounded-2xl p-4 mb-6 shadow-2xs text-left">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              Mês / Ano de Referência
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPresetMonth('prev')}
                className="px-2 py-0.5 text-[10px] font-semibold text-stone-600 hover:text-stone-900 bg-white rounded border border-stone-200 shadow-2xs cursor-pointer"
              >
                Mês Ant.
              </button>
              <button
                type="button"
                onClick={() => setPresetMonth('current')}
                className="px-2 py-0.5 text-[10px] font-semibold text-stone-600 hover:text-stone-900 bg-white rounded border border-stone-200 shadow-2xs cursor-pointer"
              >
                Atual
              </button>
              <button
                type="button"
                onClick={() => setPresetMonth('next')}
                className="px-2 py-0.5 text-[10px] font-semibold text-stone-600 hover:text-stone-900 bg-white rounded border border-stone-200 shadow-2xs cursor-pointer"
              >
                Próximo
              </button>
            </div>
          </div>
          <input
            type="text"
            placeholder="MM/AAAA (ex: 11/2026)"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-sm font-semibold text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
          />
        </div>

        <label className="cursor-pointer inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold shadow-sm transition-all duration-150 active:scale-98">
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-stone-300" />
              <span>Processando e Dividindo PDFs...</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 text-stone-200" />
              <span>Selecionar Arquivos PDF do Computador</span>
            </>
          )}
          <input
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={handleFilesDrop}
            disabled={isProcessing}
          />
        </label>

        {isProcessing && (
          <div className="mt-6 flex flex-col items-center gap-2 text-xs text-stone-500 font-medium animate-pulse">
            <p>Separando páginas, convertendo texto e cruzando com o cadastro de clientes...</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center mb-3">
            <Layers className="w-5 h-5 text-stone-700" />
          </div>
          <h4 className="text-sm font-bold text-stone-900 mb-1">Divisão Multipáginas</h4>
          <p className="text-xs text-stone-500 leading-relaxed">
            Pode enviar o PDF consolidado do banco (ex: 80 boletos em um arquivo). O servidor divide página por página automaticamente.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-100">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="text-sm font-bold text-stone-900 mb-1">Reconhecimento de Sacado</h4>
          <p className="text-xs text-stone-500 leading-relaxed">
            Identifica o nome do pagador dentro de cada folha e faz matching com os cotistas cadastrados no sistema.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="text-sm font-bold text-stone-900 mb-1">Escudo Anti-Bloqueio</h4>
          <p className="text-xs text-stone-500 leading-relaxed">
            Disparos com simulação de digitação, intervalos aleatórios e variações de texto para proteger seu WhatsApp de banimentos.
          </p>
        </div>
      </div>
    </div>
  );

  // RENDER STEP 2: REVIEW
  const renderReviewStep = () => {
    const currentRow = boletos[currentReviewIndex];
    const currentClient = currentRow?.clientIdEncontrado
      ? clientes.find(c => c.id === currentRow.clientIdEncontrado)
      : null;
    const currentBoat = currentClient?.embarcacaoId
      ? embarcacoes.find(b => b.id === currentClient.embarcacaoId)
      : null;

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <span>Revisão e Vínculo de Clientes</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                {activeBoletos.length} de {boletos.length} prontos para envio
              </span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Confirme a associação de cada boleto com o cliente cadastrado antes de prosseguir para o disparo.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
            >
              Voltar ao Upload
            </button>
            <button
              type="button"
              onClick={() => setStep('message')}
              disabled={activeBoletos.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Avançar para Mensagem & Anti-Bloqueio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: List */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs flex flex-col">
            <div className="p-3 border-b border-stone-100 bg-stone-50/60 flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setReviewFilter('todos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  reviewFilter === 'todos'
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Todos ({boletos.length})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('prontos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  reviewFilter === 'prontos'
                    ? 'bg-white text-emerald-800 shadow-2xs border border-emerald-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Prontos ({activeBoletos.length})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('pendentes')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  reviewFilter === 'pendentes'
                    ? 'bg-white text-amber-800 shadow-2xs border border-amber-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Pendentes ({pendentesBoletos.length})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('ignorados')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  reviewFilter === 'ignorados'
                    ? 'bg-white text-stone-700 shadow-2xs border border-stone-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Ignorados ({ignoradosBoletos.length})
              </button>
            </div>

            <div className="p-3 border-b border-stone-100 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar por pagador ou arquivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900/20"
                />
              </div>
            </div>

            <div className="max-h-[580px] overflow-y-auto divide-y divide-stone-100">
              {filteredBoletos.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  Nenhum boleto encontrado com este filtro.
                </div>
              ) : (
                filteredBoletos.map(({ row, idx }) => {
                  const isSelected = idx === currentReviewIndex;
                  const matchedClient = row.clientIdEncontrado
                    ? clientes.find(c => c.id === row.clientIdEncontrado)
                    : null;

                  return (
                    <div
                      key={idx}
                      onClick={() => setCurrentReviewIndex(idx)}
                      className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors border-l-3 ${
                        isSelected
                          ? 'bg-stone-100/70 border-l-stone-900'
                          : 'hover:bg-stone-50 border-l-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!row.ignored}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdateBoleto(idx, { ignored: !e.target.checked });
                        }}
                        className="w-4 h-4 mt-0.5 rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <p className={`text-xs font-bold truncate ${row.ignored ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                            {row.payerName || row.originalName}
                          </p>
                          <span className="text-[10px] text-stone-400 shrink-0 font-mono">
                            #{idx + 1}
                          </span>
                        </div>

                        <p className="text-[11px] text-stone-500 truncate mb-1.5">
                          {matchedClient ? (
                            <span className="font-medium text-stone-700">
                              ✓ {matchedClient.nome}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium">
                              ⚠ Não associado a cliente
                            </span>
                          )}
                        </p>

                        <div className="flex items-center gap-1.5">
                          {row.ignored ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-500">
                              <EyeOff className="w-2.5 h-2.5" /> Ignorado
                            </span>
                          ) : row.clientIdEncontrado ? (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              row.confidence === 'alta'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            }`}>
                              <CheckCircle className="w-2.5 h-2.5" />
                              {row.confidence === 'alta' ? 'Alta Confiança' : 'Média Confiança'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                              <AlertCircle className="w-2.5 h-2.5" /> Pendente
                            </span>
                          )}

                          {matchedClient?.telefone && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600">
                              <Smartphone className="w-2.5 h-2.5 text-emerald-600" />
                              WhatsApp
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Boleto Detail Inspector */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs flex flex-col">
            {currentRow ? (
              <>
                <div className="p-4 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 tracking-tight">
                      Detalhes do Boleto #{currentReviewIndex + 1}
                    </h4>
                    <p className="text-xs text-stone-500">
                      Revise o cliente associado e visualize o arquivo gerado
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentReviewIndex === 0}
                      onClick={() => setCurrentReviewIndex(p => Math.max(0, p - 1))}
                      className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-30 cursor-pointer shadow-2xs"
                      title="Boleto Anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold text-stone-600 px-1 font-mono">
                      {currentReviewIndex + 1} / {boletos.length}
                    </span>
                    <button
                      type="button"
                      disabled={currentReviewIndex >= boletos.length - 1}
                      onClick={() => setCurrentReviewIndex(p => Math.min(boletos.length - 1, p + 1))}
                      className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-30 cursor-pointer shadow-2xs"
                      title="Próximo Boleto"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-stone-500" />
                        Dados Lidos do Documento
                      </span>
                      {currentRow.tempPath && (
                        <a
                          href={currentRow.tempPath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-stone-900 hover:underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-600" />
                          <span>Abrir PDF em nova aba</span>
                          <ExternalLink className="w-3 h-3 text-stone-400" />
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <p className="text-[11px] text-stone-400 font-medium">Nome do Arquivo</p>
                        <p className="text-xs font-semibold text-stone-800 break-all">{currentRow.originalName}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-stone-400 font-medium">Sacado / Pagador Identificado</p>
                        <p className="text-xs font-bold text-stone-900">
                          {currentRow.payerName || <span className="text-rose-600 italic">Não identificado</span>}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-800 block uppercase tracking-wider">
                      Vincular ao Cliente do Sistema
                    </label>

                    <Select
                      options={clientOptions}
                      value={
                        currentRow.clientIdEncontrado
                          ? clientOptions.find(opt => opt.value === currentRow.clientIdEncontrado)
                          : null
                      }
                      onChange={(opt: any) => {
                        handleUpdateBoleto(currentReviewIndex, {
                          clientIdEncontrado: opt?.value,
                          confidence: 'alta',
                          ignored: false
                        });
                      }}
                      placeholder="Pesquisar cliente pelo nome ou telefone..."
                      isClearable
                      className="text-xs"
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          minHeight: '40px',
                          borderRadius: '0.75rem',
                          borderColor: currentRow.clientIdEncontrado
                            ? '#e7e5e4'
                            : '#fca5a5',
                          boxShadow: state.isFocused ? '0 0 0 2px rgba(28, 25, 23, 0.1)' : 'none',
                          '&:hover': {
                            borderColor: '#a8a29e'
                          }
                        })
                      }}
                    />
                  </div>

                  {currentClient ? (
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                            {currentClient.nome ? currentClient.nome.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-stone-900 leading-tight">
                              {currentClient.nome}
                            </h5>
                            <p className="text-xs text-stone-500 mt-0.5">
                              {currentBoat ? (
                                <span className="font-semibold text-stone-700">
                                  Embarcação: {getBoatCode(currentBoat)} (Cota {currentClient.cota || 'N/A'})
                                </span>
                              ) : (
                                <span>Cliente Geral</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3" /> Vinculado
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
                        <div className="flex items-center gap-1.5 text-stone-700">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-medium">Telefone:</span>
                          <span className="font-bold text-stone-900">
                            {currentClient.telefone || <span className="text-rose-600 font-semibold">Sem telefone cadastrado</span>}
                          </span>
                        </div>
                        {currentClient.cpf && (
                          <div className="flex items-center gap-1.5 text-stone-700">
                            <span className="font-medium text-stone-500">CPF:</span>
                            <span className="font-mono text-stone-900">{currentClient.cpf}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-bold text-amber-900 mb-0.5">Boleto sem cliente vinculado</p>
                        <p className="text-amber-700">
                          Selecione um cliente no campo acima para associar este boleto e permitir o envio por WhatsApp.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleUpdateBoleto(currentReviewIndex, { ignored: !currentRow.ignored })}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
                        currentRow.ignored
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {currentRow.ignored ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Incluir no Lote de Envio</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Ignorar Envio deste Boleto</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={currentReviewIndex >= boletos.length - 1}
                      onClick={() => setCurrentReviewIndex(p => Math.min(boletos.length - 1, p + 1))}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-stone-900 hover:bg-stone-800 text-white disabled:opacity-30 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Próximo Boleto</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-xs text-stone-400">
                Selecione um boleto na lista ao lado para inspecionar.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // RENDER STEP 3: MESSAGE & SEND WITH ANTIBLOCK
  const renderMessageStep = () => {
    // ACTIVE SENDING / COOLING / PAUSED VIEW
    if (sendingState === 'sending' || sendingState === 'cooling' || sendingState === 'paused' || sendingState === 'completed') {
      return (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-8 shadow-xs max-w-2xl mx-auto text-center space-y-6">
          {sendingState !== 'completed' ? (
            <>
              {/* Anti-block state badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200/80">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Escudo Anti-Bloqueio Ativo</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* Status Graphic */}
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <div className={`w-28 h-28 rounded-full border-4 ${
                  sendingState === 'cooling'
                    ? 'border-amber-400 border-t-amber-600 animate-pulse'
                    : sendingState === 'paused'
                    ? 'border-stone-300'
                    : 'border-emerald-200 border-t-emerald-600 animate-spin'
                }`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-stone-900 tabular-nums">
                    {countdownSec > 0 ? `${countdownSec}s` : `${sendProgress}%`}
                  </span>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">
                    {countdownSec > 0 ? 'Pausa' : 'Progresso'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-stone-900 tracking-tight">
                  {sendingState === 'cooling'
                    ? 'Pausa de Resfriamento da Conexão'
                    : sendingState === 'paused'
                    ? 'Envio Pausado'
                    : 'Disparando Boletos via WhatsApp'}
                </h3>

                <p className="text-xs text-stone-600 font-medium mt-1">
                  {countdownLabel || (
                    <>
                      Enviando para: <span className="font-bold text-stone-900">{currentSendingName || 'Cotista'}</span>
                    </>
                  )}
                </p>

                <p className="text-[11px] text-stone-400 mt-1">
                  {sendResults.length} de {activeBoletos.length} boletos processados no lote atual
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    sendingState === 'cooling' ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${sendProgress}%` }}
                />
              </div>

              {/* Control Buttons (Pause / Resume / Cancel) */}
              <div className="flex items-center justify-center gap-3 pt-2">
                {sendingState === 'paused' ? (
                  <button
                    type="button"
                    onClick={handleResumeSending}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Retomar Envio</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseSending}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 shadow-2xs flex items-center gap-2 cursor-pointer"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pausar Disparo</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCancelSending}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Interromper Restante</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* COMPLETED REPORT */}
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-stone-900 tracking-tight">
                  Disparo Concluído!
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  {sendResults.filter(r => r.status === 'success').length} de {sendResults.length} boletos enviados com sucesso.
                </p>
              </div>

              {/* Detailed Results Log */}
              <div className="border border-stone-200/80 rounded-xl overflow-hidden text-left max-h-64 overflow-y-auto divide-y divide-stone-100">
                {sendResults.map((r, i) => {
                  const client = clientes.find(c => c.id === r.clientId) || clientDB.getById(r.clientId);
                  return (
                    <div key={i} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {r.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span className="font-semibold text-stone-800">{client?.nome || 'Cliente'}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        r.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {r.status === 'success' ? 'Enviado' : (r.error || 'Falha')}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = sendResults.map(r => {
                      const c = clientes.find(cl => cl.id === r.clientId) || clientDB.getById(r.clientId);
                      return `${r.status === 'success' ? 'OK' : 'ERRO'} | ${c?.nome} | ${r.error || ''}`;
                    }).join('\n');
                    navigator.clipboard.writeText("Relatório de Envio:\n" + text);
                    alert("Relatório copiado!");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-50 border border-stone-200 hover:bg-stone-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span>Copiar Relatório</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetBatch}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 shadow-xs cursor-pointer"
                >
                  Novo Lote de Boletos
                </button>
              </div>
            </>
          )}
        </div>
      );
    }

    // NORMAL COMPOSER VIEW
    const sampleBoleto = activeBoletos[0];
    const sampleClient = sampleBoleto?.clientIdEncontrado
      ? clientes.find(c => c.id === sampleBoleto.clientIdEncontrado)
      : null;
    const previewMessage = sampleClient
      ? buildPersonalizedMessage(sampleClient.id, previewSeed, true)
      : parseSpintax(messageTemplate);

    const [mes, ano] = monthYear.split('/');
    const sampleFileName = sampleClient
      ? `${sampleClient.nome.split(' ')[0]} - Taxa Administrativa ${mes || ''}-${ano || ''}.pdf`
      : 'Boleto.pdf';

    return (
      <div className="space-y-5">
        {/* Step Header */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-900 tracking-tight">
              Personalização da Mensagem & Proteção Anti-Bloqueio
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Defina o texto, as variações de saudação e os parâmetros de segurança para o envio oficial
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep('review')}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
            >
              Voltar à Revisão
            </button>
          </div>
        </div>

        {/* Anti-Block Guard Card (Highlights Security) */}
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-stone-900 text-white rounded-2xl p-5 shadow-xs border border-emerald-900/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold tracking-tight text-white">
                    Escudo Anti-Bloqueio WhatsApp (Anti-Ban Guard)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Ativo
                  </span>
                </div>
                <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
                  Evita o banimento da linha simulando digitação humana, aplicando intervalos dinâmicos com jitter aleatório e alternando variações no texto das mensagens.
                </p>
              </div>
            </div>

            {/* Profile Selection Pills */}
            <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl border border-white/10 shrink-0 self-start md:self-auto">
              {(['safe', 'moderate', 'fast'] as const).map(prof => (
                <button
                  key={prof}
                  type="button"
                  onClick={() => handleSelectAntiBlockProfile(prof)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    antiBlock.profile === prof
                      ? 'bg-emerald-500 text-stone-950 shadow-xs'
                      : 'text-stone-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {prof === 'safe' ? 'Seguro (Recomendado)' : prof === 'moderate' ? 'Moderado' : 'Rápido'}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowAntiBlockDetails(prev => !prev)}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  showAntiBlockDetails ? 'bg-white/20 text-white' : 'text-stone-400 hover:text-white'
                }`}
                title="Configurações avançadas do anti-bloqueio"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick summary badges */}
          <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center gap-3 text-xs text-stone-300">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Intervalo: <strong className="text-white">{antiBlock.minDelaySec}s a {antiBlock.maxDelaySec}s</strong> randômicos
            </span>
            <span className="text-stone-600">•</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              Resfriamento: pausa de <strong className="text-white">{antiBlock.pauseDurationSec}s</strong> a cada <strong className="text-white">{antiBlock.pauseEvery} envios</strong>
            </span>
            <span className="text-stone-600">•</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Status <strong className="text-white">"Digitando..."</strong> antes do disparo
            </span>
            <span className="text-stone-600">•</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
              Spintax & Anti-Hash ativados
            </span>
          </div>

          {/* Advanced collapsible settings */}
          {showAntiBlockDetails && (
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <label className="text-[11px] text-stone-400 block mb-1">Intervalo Mínimo (segundos)</label>
                <input
                  type="number"
                  min={2}
                  max={60}
                  value={antiBlock.minDelaySec}
                  onChange={(e) => setAntiBlock(p => ({ ...p, profile: 'custom', minDelaySec: Math.max(2, parseInt(e.target.value) || 2) }))}
                  className="w-full bg-stone-900 border border-white/20 rounded-lg px-2.5 py-1 text-white font-bold"
                />
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <label className="text-[11px] text-stone-400 block mb-1">Intervalo Máximo (segundos)</label>
                <input
                  type="number"
                  min={antiBlock.minDelaySec}
                  max={120}
                  value={antiBlock.maxDelaySec}
                  onChange={(e) => setAntiBlock(p => ({ ...p, profile: 'custom', maxDelaySec: Math.max(p.minDelaySec, parseInt(e.target.value) || p.minDelaySec) }))}
                  className="w-full bg-stone-900 border border-white/20 rounded-lg px-2.5 py-1 text-white font-bold"
                />
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <label className="text-[11px] text-stone-400 block mb-1">Pausa de Lote a cada N envios</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={antiBlock.pauseEvery}
                  onChange={(e) => setAntiBlock(p => ({ ...p, profile: 'custom', pauseEvery: parseInt(e.target.value) || 10 }))}
                  className="w-full bg-stone-900 border border-white/20 rounded-lg px-2.5 py-1 text-white font-bold"
                />
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <label className="text-[11px] text-stone-400 block mb-1">Duração da Pausa (segundos)</label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={antiBlock.pauseDurationSec}
                  onChange={(e) => setAntiBlock(p => ({ ...p, profile: 'custom', pauseDurationSec: parseInt(e.target.value) || 30 }))}
                  className="w-full bg-stone-900 border border-white/20 rounded-lg px-2.5 py-1 text-white font-bold"
                />
              </div>
            </div>
          )}
        </div>

        {/* Message Editor & WhatsApp Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Template Editor */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs space-y-5">
            {/* Template Presets */}
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
                Modelos com Anti-Bloqueio Integrado
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setMessageTemplate(tpl.text)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 transition-colors cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Texto da Mensagem
                </label>
                <span className="text-[11px] text-stone-400">
                  Suporta Spintax: <code className="text-stone-700 font-mono">{"{Opção 1|Opção 2}"}</code>
                </span>
              </div>

              <textarea
                rows={7}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs sm:text-sm font-medium text-stone-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 resize-none font-mono"
              />

              {/* Variable & Spintax Chips */}
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-stone-400 mr-1">Inserir:</span>
                {['{nome}', '{mes}', '{ano}', '{Olá|Oi|Prezado(a)}', '{Segue|Encaminhamos}'].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setMessageTemplate(prev => prev + ' ' + chip)}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Pre-flight Checklist */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80 space-y-2 text-xs">
              <span className="font-bold text-stone-700 uppercase tracking-wider block">
                Resumo da Operação
              </span>
              <div className="grid grid-cols-2 gap-2 text-stone-600">
                <div>
                  <span className="text-stone-400">Boletos prontos:</span>{' '}
                  <span className="font-bold text-stone-900">{activeBoletos.length} arquivos</span>
                </div>
                <div>
                  <span className="text-stone-400">Mês de Referência:</span>{' '}
                  <span className="font-bold text-stone-900">{monthYear}</span>
                </div>
                <div>
                  <span className="text-stone-400">Perfil de Proteção:</span>{' '}
                  <span className="font-bold text-emerald-700 uppercase">
                    {antiBlock.profile === 'safe' ? 'Seguro' : antiBlock.profile === 'moderate' ? 'Moderado' : 'Rápido'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Instância WhatsApp:</span>{' '}
                  <span className="font-mono text-stone-800">{instanceName}</span>
                </div>
              </div>
            </div>

            {/* Start Send Button */}
            <button
              type="button"
              onClick={handleStartSending}
              disabled={activeBoletos.length === 0}
              className="w-full py-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <span>Iniciar Disparo com Anti-Bloqueio ({activeBoletos.length} boletos)</span>
            </button>
          </div>

          {/* Right Column: WhatsApp Mockup Preview */}
          <div className="lg:col-span-5 bg-stone-100 rounded-3xl p-3 border-4 border-stone-200 shadow-md">
            <div className="bg-[#075E54] rounded-2xl px-4 py-3 text-white flex items-center justify-between shadow-sm mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  VN
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight truncate">Grupo Villa Náutica</p>
                  <p className="text-[10px] text-emerald-100 leading-none">Online • Prévia Real</p>
                </div>
              </div>

              {/* Button to test random spintax variation in preview */}
              <button
                type="button"
                onClick={() => setPreviewSeed(p => p + 1)}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Gera uma nova variação para testar o Spintax"
              >
                <Shuffle className="w-3 h-3" />
                <span>Testar Variação</span>
              </button>
            </div>

            <div
              className="bg-[#efeae2] rounded-2xl p-4 min-h-[360px] flex flex-col justify-end space-y-3 relative"
              style={{
                backgroundImage: `radial-gradient(#d1d5db 1px, transparent 1px)`,
                backgroundSize: '16px 16px'
              }}
            >
              <div className="self-center bg-white/80 backdrop-blur-xs text-[10px] font-medium text-stone-600 px-2.5 py-1 rounded-full shadow-2xs">
                Hoje • Prévia para {sampleClient?.nome ? sampleClient.nome.split(' ')[0] : 'Cotista'}
              </div>

              <div className="self-end bg-[#dcf8c6] max-w-[90%] rounded-2xl rounded-tr-none p-2.5 shadow-2xs border border-emerald-100/50 space-y-2">
                <div className="bg-white/80 rounded-xl p-2.5 flex items-center gap-2.5 border border-black/5">
                  <div className="w-9 h-9 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {sampleFileName}
                    </p>
                    <p className="text-[10px] text-stone-500 uppercase font-semibold">
                      PDF • Boleto Registrado
                    </p>
                  </div>
                </div>

                <p className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed text-left px-1">
                  {previewMessage}
                </p>

                <div className="flex items-center justify-end gap-1 text-[10px] text-stone-400 px-1">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <CheckCircle className="w-3 h-3 text-sky-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        pageTitle="Boletos & Cobrança em Lote"
        subtitle="Divisão automática de PDFs multipáginas, conciliação inteligente de sacados e disparo oficial com proteção anti-bloqueio"
        breadcrumbs={[
          { label: "Financeiro" },
          { label: "Recebíveis & Cobrança" },
          { label: "Boletos & Cobrança" }
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200/80 text-xs shadow-2xs">
              <span className={`w-2 h-2 rounded-full ${
                waStatus === 'open'
                  ? 'bg-emerald-500 animate-pulse'
                  : waStatus === 'checking'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`} />
              <span className="font-semibold text-stone-700">
                {waStatus === 'open' ? 'WhatsApp Online' : waStatus === 'checking' ? 'Checando WhatsApp...' : 'WhatsApp Offline'}
              </span>
            </div>

            {step !== 'upload' && (
              <button
                type="button"
                onClick={handleResetBatch}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                <span>Novo Lote</span>
              </button>
            )}
          </div>
        }
      />

      {/* 2. Stepper */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-2 shadow-xs">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setStep('upload')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              step === 'upload'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === 'upload' ? 'bg-white text-stone-900' : 'bg-stone-200 text-stone-700'
            }`}>
              1
            </span>
            <span className="truncate">1. Upload & Divisão</span>
          </button>

          <button
            type="button"
            disabled={boletos.length === 0}
            onClick={() => setStep('review')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              step === 'review'
                ? 'bg-stone-900 text-white shadow-2xs cursor-pointer'
                : boletos.length === 0
                ? 'text-stone-300 cursor-not-allowed'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50 cursor-pointer'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === 'review' ? 'bg-white text-stone-900' : 'bg-stone-200 text-stone-700'
            }`}>
              2
            </span>
            <span className="truncate">2. Revisão & Vínculos ({boletos.length})</span>
          </button>

          <button
            type="button"
            disabled={activeBoletos.length === 0}
            onClick={() => setStep('message')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              step === 'message'
                ? 'bg-stone-900 text-white shadow-2xs cursor-pointer'
                : activeBoletos.length === 0
                ? 'text-stone-300 cursor-not-allowed'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50 cursor-pointer'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === 'message' ? 'bg-white text-stone-900' : 'bg-stone-200 text-stone-700'
            }`}>
              3
            </span>
            <span className="truncate">3. Mensagem & Disparo</span>
          </button>
        </div>
      </div>

      {/* 3. Executive KPI Metric Cards */}
      {boletos.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Total Lidos</p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black text-stone-900 tabular-nums">{boletos.length}</p>
              <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                PDFs
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Páginas ou arquivos carregados</p>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Prontos p/ Disparo</p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black text-emerald-700 tabular-nums">{activeBoletos.length}</p>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                Validados
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Vinculados e ativos</p>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Pendentes</p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black text-amber-700 tabular-nums">{pendentesBoletos.length}</p>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
                Atenção
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Sem cliente associado</p>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Ignorados</p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black text-stone-500 tabular-nums">{ignoradosBoletos.length}</p>
              <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                Desmarcados
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Não receberão cobrança</p>
          </div>
        </div>
      )}

      {/* 4. Active Step Content */}
      {step === 'upload' && renderUploadStep()}
      {step === 'review' && renderReviewStep()}
      {step === 'message' && renderMessageStep()}
    </div>
  );
}
