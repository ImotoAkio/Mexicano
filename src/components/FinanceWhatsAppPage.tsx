import { fetchWithAuth, getAuthHeaders, getAdminToken } from '../utils/apiAuth';
import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import {
  MessageSquare, QrCode, LogOut, CheckCircle, AlertTriangle, RefreshCw,
  Smartphone, Send, Paperclip, Search, X, FileText, Image as ImageIcon,
  Users, WifiOff, ChevronRight, Clock, LayoutTemplate, Eye,
  UserCheck, UserX, ChevronDown, Settings, ShieldAlert, Plus, Trash2, Save,
  List, Filter, Anchor, Maximize2, CheckSquare, Square, FolderPlus, Bookmark, Layers,
  ExternalLink, Activity, Info, Check, Sparkles, Download, Clipboard, ArrowLeft, Receipt
} from 'lucide-react';
import { toPng } from 'html-to-image';
// @ts-ignore
import logoUrl from '../assets/images/logo_mexicano_trim.png';
import { clientDB, boatDB } from '../db';
import type { Cliente, Embarcacao, TransacaoFinanceira } from '../types';
import PageHeader from './tailadmin/PageHeader';

interface CustomTemplate {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  text: string;
  isCustom: boolean;
}

interface CustomClientList {
  id: string;
  name: string;
  clientIds: string[];
  createdAt: string;
}

type ClientFilter = 'todos' | 'inadimplentes' | 'em_dia';

interface SendLogEntry {
  clientName: string;
  phone: string;
  status: 'success' | 'error';
  timestamp: string;
}

const MESSAGE_TEMPLATES = [
  {
    id: 'lembrete_10',
    label: 'Lembrete 10 dias',
    icon: '📅',
    color: 'blue',
    description: 'Aviso cordial de vencimento próximo',
    text: `Olá {nome}, tudo bem?

Passamos para lembrá-lo(a) de que o vencimento da sua cota está previsto para os próximos *10 dias*.

Para garantir que tudo esteja em dia e evitar encargos, pedimos que providencie o pagamento com antecedência.

Em caso de dúvidas ou para solicitar uma segunda via do boleto, estamos à disposição.

Atenciosamente,
Equipe Financeira — El Mexicano 🚢`,
  },
  {
    id: 'lembrete_5',
    label: 'Lembrete 5 dias',
    icon: '⏰',
    color: 'amber',
    description: 'Urgência moderada, aviso com boleto',
    text: `Olá {nome}!

O vencimento da sua cota está se aproximando — *faltam apenas 5 dias*.

Caso ainda não tenha realizado o pagamento, solicitamos que regularize sua situação o quanto antes para evitar multas e juros.

Seguindo em anexo o boleto para sua conveniência.

Atenciosamente,
Equipe Financeira — El Mexicano 🚢`,
  },
  {
    id: 'boleto',
    label: 'Envio de Boleto',
    icon: '📄',
    color: 'emerald',
    description: 'Envio direto do boleto mensal',
    text: `Olá {nome}, tudo bem?

Segue em anexo o boleto referente à sua cota do mês vigente.

O vencimento está indicado no próprio documento. Pedimos que efetue o pagamento até a data para evitar encargos adicionais.

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Equipe Financeira — El Mexicano 🚢`,
  },
  {
    id: 'inadimplente',
    label: 'Aviso de Débito',
    icon: '⚠️',
    color: 'rose',
    description: 'Cobrança para cotistas com pendências',
    text: `Olá {nome},

Identificamos que existe um *débito em aberto* em seu cadastro referente à sua cota no El Mexicano.

Pedimos que entre em contato conosco o quanto antes para regularizar sua situação e evitar a suspensão dos agendamentos.

Atenciosamente,
Equipe Financeira — El Mexicano 🚢`,
  },
  {
    id: 'confirmacao',
    label: 'Pagamento Recebido',
    icon: '✅',
    color: 'teal',
    description: 'Confirmação e agradecimento de quitação',
    text: `Olá {nome}!

Informamos que o pagamento referente à sua cota foi *recebido com sucesso*. ✅

Agradecemos pela pontualidade! Qualquer dúvida, estamos à disposição.

Atenciosamente,
Equipe Financeira — El Mexicano 🚢`,
  },
] as const;

const formatFirstName = (fullName: string): string => {
  if (!fullName) return '';
  const firstName = fullName.trim().split(' ')[0];
  if (!firstName) return '';
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};

const getTodayDateStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isTransactionOverdue = (t: TransacaoFinanceira): boolean => {
  if (t.status === 'pago' || t.status === 'cancelado') return false;
  if (t.status === 'vencido') return true;
  if (!t.dataVencimento) return false;
  return t.dataVencimento < getTodayDateStr();
};

const calculateTransactionInterest = (t: TransacaoFinanceira) => {
  const originalVal = Number(t.valor) || 0;
  if (t.status === 'pago' || t.status === 'cancelado' || !t.dataVencimento) {
    return { daysOverdue: 0, interest: 0, total: originalVal, isOverdue: false };
  }
  const [y, m, d] = t.dataVencimento.split('-').map(Number);
  const dueDate = new Date(y, m - 1, d);
  dueDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - dueDate.getTime();
  const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Apenas considera juros e atraso se a data de vencimento já tiver passado
  if (daysOverdue <= 0 && t.status !== 'vencido') {
    return { daysOverdue: 0, interest: 0, total: originalVal, isOverdue: false };
  }

  const effectiveDays = Math.max(daysOverdue, 0);
  const ratePerDay = 0.0007333; // 0.07333% ao dia (~2.2% ao mes)
  const interest = originalVal * ratePerDay * effectiveDays;
  return { daysOverdue: effectiveDays, interest, total: originalVal + interest, isOverdue: true };
};

const base64ToFile = (base64Data: string, fileName: string): File => {
  const arr = base64Data.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mime });
};

const FINANCE_INSTANCE = 'financeiro';

export default function FinanceWhatsAppPage() {
  const cancelSendingRef = useRef<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Connection state — single fixed instance, no random names
  const [instanceName, setInstanceName] = useState<string>(() => {
    return localStorage.getItem('finance_whatsapp_instance') || FINANCE_INSTANCE;
  });

  useEffect(() => {
    if (instanceName) {
      localStorage.setItem('finance_whatsapp_instance', instanceName);
    }
  }, [instanceName]);

  const [waStatus, setWaStatus] = useState<string>('loading');
  const [waQrCode, setWaQrCode] = useState<string | null>(null);
  const [isFetchingWaStatus, setIsFetchingWaStatus] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [serverInstances, setServerInstances] = useState<any[]>([]);
  const [isFetchingInstances, setIsFetchingInstances] = useState(false);

  const handleFetchInstances = async () => {
    setIsFetchingInstances(true);
    try {
      const res = await fetch('/api/whatsapp/instances', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (Array.isArray(data)) setServerInstances(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingInstances(false);
    }
  };

  const handleReconnectInstance = (inst: string) => {
    setInstanceName(inst);
    showToast(`Instância ${inst} vinculada!`);
  };

  // Debug State
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugReport, setDebugReport] = useState<any>(null);
  const [isRunningDebug, setIsRunningDebug] = useState(false);

  const handleRunDebug = async () => {
    setIsRunningDebug(true);
    try {
      const inst = instanceName;
      const token = getAdminToken();
      const res = await fetch(`/api/whatsapp/debug?instance=${inst}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = { error: 'Resposta HTML/não-JSON recebida (Sessão expirada ou rota não encontrada)', raw: text.substring(0, 300) };
      }
      setDebugReport(data);
      setShowDebugPanel(true);
    } catch (err: any) {
      setDebugReport({ error: err.message || 'Falha ao executar diagnóstico' });
      setShowDebugPanel(true);
    } finally {
      setIsRunningDebug(false);
    }
  };
  
  // Modal states
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Mass Sender & Selection state
  const [clients, setClients] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<ClientFilter>('todos');
  const [selectedBoatId, setSelectedBoatId] = useState<string>('all');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  
  // Custom Lists state
  const [customLists, setCustomLists] = useState<CustomClientList[]>(() => {
    try {
      const stored = localStorage.getItem('finance_whatsapp_custom_lists');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });
  const [showSaveListModal, setShowSaveListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showManageListsModal, setShowManageListsModal] = useState(false);
  const [showAdvancedSelectorModal, setShowAdvancedSelectorModal] = useState(false);

  // Custom templates state
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(() => {
    try {
      const stored = localStorage.getItem('finance_whatsapp_custom_templates');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Attachments & Sending
  const [attachment, setAttachment] = useState<{ file: File; base64: string } | null>(null);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, successes: 0, failures: 0 });
  const [sendLog, setSendLog] = useState<SendLogEntry[]>([]);

  // Transactions & Statement (Extrato) States
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [showExtratoModal, setShowExtratoModal] = useState(false);
  const [extratoSelectedClientId, setExtratoSelectedClientId] = useState<string | null>(null);
  const [extratoPreviewImage, setExtratoPreviewImage] = useState<string | null>(null);
  const [extratoGenerating, setExtratoGenerating] = useState(false);
  const [extratoSendingDirect, setExtratoSendingDirect] = useState(false);
  const [extratoSearchQuery, setExtratoSearchQuery] = useState('');
  const [extratoFilterOnlyDebts, setExtratoFilterOnlyDebts] = useState(true);
  const [attachIndividualExtratos, setAttachIndividualExtratos] = useState(false);

  useEffect(() => {
    const loadTransactions = () => {
      fetch('/api/financeiro/transacoes', {
        headers: getAuthHeaders(),
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setTransacoes(data);
        })
        .catch(console.warn);
    };

    loadTransactions();

    window.addEventListener('finance_updated', loadTransactions);
    window.addEventListener('db_updated', loadTransactions);
    window.addEventListener('db_synced', loadTransactions);

    return () => {
      window.removeEventListener('finance_updated', loadTransactions);
      window.removeEventListener('db_updated', loadTransactions);
      window.removeEventListener('db_synced', loadTransactions);
    };
  }, []);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 5000);
  };

  // Connection logic
  const fetchWaStatus = async (instance: string) => {
    setIsFetchingWaStatus(true);
    try {
      const res = await fetch(`/api/whatsapp/status?instance=${instance}`, {
        headers: getAuthHeaders(),
      });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      
      const state = data?.instance?.state || 'close';
      
      if (state === 'not_created') {
        setWaStatus('not_created');
        return;
      }
      
      setWaStatus(state);
      if (state !== 'open') fetchWaQrCode(instance);
      else { setWaQrCode(null); }
    } catch {
      setWaStatus('error');
    } finally {
      setIsFetchingWaStatus(false);
    }
  };

  const fetchWaQrCode = async (instance: string) => {
    try {
      const res = await fetch(`/api/whatsapp/connect?instance=${instance}`, {
        headers: getAuthHeaders(),
      });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      const qr = data.base64 || data.qrcode?.base64 || data.code;
      if (qr) {
        setWaQrCode(qr);
      } else if (data.instance?.state === 'open') {
        setWaStatus('open');
        setWaQrCode(null);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchWaStatus(instanceName);
  }, [instanceName]);

  useEffect(() => { 
    setClients(clientDB.getAll()); 
    
    const adminToken = getAdminToken();
    const headers: Record<string, string> = {};
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    
    fetch('/api/config?chaves=finance_whatsapp_custom_lists,finance_whatsapp_custom_templates', { headers })
      .then(res => res.json())
      .then(data => {
        const configs = data.configs || {};

        const serverLists = configs.finance_whatsapp_custom_lists;
        if (serverLists) {
          let parsedLists = serverLists;
          if (typeof serverLists === 'string') {
            try { parsedLists = JSON.parse(serverLists); } catch (e) { parsedLists = []; }
          }
          localStorage.setItem('finance_whatsapp_custom_lists', JSON.stringify(parsedLists));
          setCustomLists(parsedLists);
        }
        
        const serverTemplates = configs.finance_whatsapp_custom_templates;
        if (serverTemplates) {
          let parsedTpls = serverTemplates;
          if (typeof serverTemplates === 'string') {
            try { parsedTpls = JSON.parse(serverTemplates); } catch (e) { parsedTpls = []; }
          }
          localStorage.setItem('finance_whatsapp_custom_templates', JSON.stringify(parsedTpls));
          setCustomTemplates(parsedTpls);
        }
      })
      .catch(() => {
        // Fallback em background
      });
  }, []);

  const handleCreateInstance = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/whatsapp/instance/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ instanceName: FINANCE_INSTANCE }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      if (!res.ok) throw new Error(data.message || data.error || text || 'Erro ao criar instância');
      setInstanceName(FINANCE_INSTANCE);
      showToast('Instância criada! Escaneie o QR Code.');
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar instância', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleWaLogout = async () => {
    if (!window.confirm('Desconectar e excluir esta instância do servidor?')) return;
    try {
      await fetch(`/api/whatsapp/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (_) {}
    setWaStatus('not_created');
    setWaQrCode(null);
    showToast('WhatsApp desconectado!');
  };

  // Boats & Client filtering
  const boats = useMemo(() => boatDB.getAll(), []);
  const getBoat = (id: string) => boats.find(b => b.id === id);
  const getBoatName = (id: string) => getBoat(id)?.nome || '';

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (!c.telefone) return false;
      
      // Filter by boat dropdown
      if (selectedBoatId !== 'all') {
        const clientBoatIds = c.embarcacoes?.map(e => e.embarcacaoId) || (c.embarcacaoId ? [c.embarcacaoId] : []);
        if (!clientBoatIds.includes(selectedBoatId)) return false;
      }

      // Filter by search query (matches name, phone, or boat name/code)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.nome.toLowerCase().includes(q);
        const matchesPhone = c.telefone.toLowerCase().includes(q);
        const clientBoats = (c.embarcacoes?.map(e => getBoat(e.embarcacaoId)) || [getBoat(c.embarcacaoId)]).filter(Boolean);
        const matchesBoat = clientBoats.some(b => 
          b?.nome?.toLowerCase().includes(q) || 
          b?.numero?.toLowerCase().includes(q) ||
          `m${b?.numero}`.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesPhone && !matchesBoat) return false;
      }

      if (clientFilter === 'inadimplentes' && !isClientInadimplente(c)) return false;
      if (clientFilter === 'em_dia' && isClientInadimplente(c)) return false;
      return true;
    });
  }, [clients, searchQuery, clientFilter, selectedBoatId, boats, transacoes]);

  const clientHasOverdueDebts = (clientId: string) => {
    return transacoes.some(t => t.clienteId === clientId && isTransactionOverdue(t));
  };

  const getClientOverdueDebts = (clientId: string) => {
    return transacoes.filter(t => t.clienteId === clientId && isTransactionOverdue(t));
  };

  const getClientFutureDebts = (clientId: string) => {
    return transacoes.filter(t => t.clienteId === clientId && !isTransactionOverdue(t) && t.status !== 'pago' && t.status !== 'cancelado');
  };

  const getClientTotalOverdueDebt = (clientId: string) => {
    const overdue = getClientOverdueDebts(clientId);
    return overdue.reduce((acc, t) => {
      const { total } = calculateTransactionInterest(t);
      return acc + total;
    }, 0);
  };

  const isClientInadimplente = (client: Cliente) => {
    // 1. Se tem título vencido de fato no financeiro, é inadimplente
    const hasOverdue = transacoes.some(t => t.clienteId === client.id && isTransactionOverdue(t));
    if (hasOverdue) return true;

    // 2. Se tem lançamentos pendentes mas nenhum está vencido, está EM DIA (dentro do prazo de validade)
    const hasAnyOpen = transacoes.some(t => t.clienteId === client.id && t.status !== 'pago' && t.status !== 'cancelado');
    if (hasAnyOpen) return false;

    // 3. Fallback cadastral apenas se não houver registros de lançamentos
    return client.statusFinanceiro === 'inadimplente';
  };

  const generateExtratoText = (client: Cliente, clientOverdueUnpaid: TransacaoFinanceira[], magicLink?: string): string => {
    if (clientOverdueUnpaid.length === 0) {
      return `Olá, *${formatFirstName(client.nome)}*! Tudo bem? ⚓\n\nVerificamos em nosso sistema e seu cadastro está *100% regularizado*, sem nenhum débito vencido em aberto.\n\nQualquer dúvida, estamos à disposição! 👍`;
    }
    let text = `Olá, *${formatFirstName(client.nome)}*! Tudo bem? ⚓\n\n`;
    text += `Constam em nosso sistema os seguintes *títulos vencidos* em aberto vinculados ao seu cadastro:\n\n`;
    let totalGeral = 0;
    clientOverdueUnpaid.forEach((t, i) => {
      const { interest, total } = calculateTransactionInterest(t);
      totalGeral += total;
      const catName = t.categoria ? t.categoria.replace('Servi??o', 'Serviço').replace('??', 'ç') : 'Lançamento';
      const desc = t.descricao ? ` - ${t.descricao}` : '';
      const venc = t.dataVencimento ? t.dataVencimento.split('-').reverse().join('/') : '-';
      text += `🔸 *${i + 1}. ${catName}*${desc}\n`;
      text += `Vencimento: ${venc} (VENCIDO)\n`;
      text += `Valor Orig.: R$ ${Number(t.valor).toFixed(2).replace('.', ',')}`;
      if (interest > 0) {
        text += ` | Juros/Atraso: R$ ${interest.toFixed(2).replace('.', ',')}`;
      }
      text += `\n*_Total: R$ ${total.toFixed(2).replace('.', ',')}_*\n\n`;
    });

    text += `*Total Vencido em Atraso: R$ ${totalGeral.toFixed(2).replace('.', ',')}*\n\n`;
    text += `⚠️ Solicitamos a regularização dos títulos vencidos para mantermos seus agendamentos e descidas autorizados.\n\n`;
    text += magicLink
      ? `Para consultar seu débito completo e efetuar o pagamento via PIX dentro do sistema, acesse seu link exclusivo:\n👉 ${magicLink}\n\n`
      : `Para efetuar o pagamento via PIX ou solicitar a 2ª via atualizada, responda a esta mensagem.\n\n`;
    text += `Caso já tenha efetuado o pagamento, por favor desconsidere ou envie o comprovante por aqui. Obrigado! 👍`;
    return text;
  };

  const generateExtratoBase64 = async (clientId: string): Promise<string> => {
    const captureEl = document.getElementById(`extrato-invoice-capture-${clientId}`);
    if (!captureEl) {
      console.error(`Elemento de extrato não encontrado para clientId: ${clientId}`);
      throw new Error("Elemento de extrato não encontrado no DOM");
    }

    await new Promise(r => setTimeout(r, 200));

    try {
      // @ts-ignore
      return await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 2, skipFonts: true, cacheBust: true });
    } catch (e) {
      console.warn("Retentando gerar extrato com pixelRatio 1.5...", e);
      await new Promise(r => setTimeout(r, 400));
      // @ts-ignore
      return await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 1.5, skipFonts: true, cacheBust: true });
    }
  };

  const handleGenerateExtratoPreview = async (clientId: string) => {
    setExtratoGenerating(true);
    try {
      const b64 = await generateExtratoBase64(clientId);
      setExtratoPreviewImage(b64);
    } catch (err: any) {
      console.error("Erro ao gerar prévia do extrato:", err);
      showToast("Erro ao gerar prévia da imagem do extrato.", "error");
    } finally {
      setExtratoGenerating(false);
    }
  };

  const handleDownloadExtrato = async (clientId: string, clientName: string) => {
    setExtratoGenerating(true);
    try {
      const base64Image = extratoPreviewImage || await generateExtratoBase64(clientId);
      const a = document.createElement('a');
      a.href = base64Image;
      a.download = `Extrato_${clientName.replace(/\s+/g, '_')}.png`;
      a.click();
      showToast("Extrato em PNG baixado com sucesso!", "success");
    } catch (err: any) {
      console.error("Falha ao baixar extrato:", err);
      showToast("Falha ao baixar extrato em imagem.", "error");
    } finally {
      setExtratoGenerating(false);
    }
  };

  const handleCopyExtratoImage = async (clientId: string) => {
    setExtratoGenerating(true);
    try {
      const base64Image = extratoPreviewImage || await generateExtratoBase64(clientId);
      const res = await fetch(base64Image);
      const blob = await res.blob();
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      showToast("Imagem do extrato copiada para a área de transferência!", "success");
    } catch (err: any) {
      console.warn("ClipboardItem write failed:", err);
      showToast("Seu navegador não suporta cópia direta de imagem. Use a opção Baixar Imagem.", "error");
    } finally {
      setExtratoGenerating(false);
    }
  };

  const handleCopyExtratoText = async (clientId: string) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;
      const clientOverdue = getClientOverdueDebts(clientId);
      let magicLink: string | undefined;
      try {
        const mlRes = await fetch('/api/notifications/generate-finance-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ clienteId: client.id, origin: window.location.origin }),
        });
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          if (mlData?.magicLink) magicLink = mlData.magicLink;
        }
      } catch {}
      const text = generateExtratoText(client, clientOverdue, magicLink);
      await navigator.clipboard.writeText(text);
      showToast("Texto do extrato copiado com sucesso!", "success");
    } catch (e) {
      showToast("Erro ao copiar texto.", "error");
    }
  };

  const handleSendWAWebExtrato = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || !client.telefone) return showToast("Cliente sem telefone válido.", "error");
    const clientOverdue = getClientOverdueDebts(clientId);
    const text = generateExtratoText(client, clientOverdue);
    const clean = client.telefone.replace(/\D/g, '');
    if (!clean) return showToast("Cliente sem telefone válido.", "error");
    const withCountry = clean.startsWith('55') ? clean : `55${clean}`;
    const url = `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDirectSendExtrato = async (client: Cliente) => {
    if (!isConnected) {
      showToast("WhatsApp desconectado. Conecte a instância antes de disparar.", "error");
      return;
    }
    if (!client.telefone) {
      showToast("Cliente sem telefone válido cadastrado.", "error");
      return;
    }
    setExtratoSendingDirect(true);
    try {
      const b64 = extratoPreviewImage || await generateExtratoBase64(client.id);
      const clientOverdue = getClientOverdueDebts(client.id);
      let magicLink: string | undefined;
      try {
        const mlRes = await fetch('/api/notifications/generate-finance-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ clienteId: client.id, origin: window.location.origin }),
        });
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          if (mlData?.magicLink) magicLink = mlData.magicLink;
        }
      } catch {}
      const text = generateExtratoText(client, clientOverdue, magicLink);

      const res = await fetch('/api/whatsapp/finance/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          instanceName,
          number: client.telefone,
          text,
          media: b64,
          mimetype: 'image/png',
          fileName: `Extrato_${client.nome.replace(/\s+/g, '_')}.png`,
        }),
      });

      if (res.ok) {
        showToast(`Extrato em imagem enviado com sucesso para ${client.nome}!`, "success");
      } else {
        const errData = await res.json().catch(() => null);
        showToast(errData?.error || "Falha ao enviar extrato via WhatsApp.", "error");
      }
    } catch (err: any) {
      console.error("Erro ao enviar extrato direto:", err);
      showToast("Erro ao processar envio do extrato.", "error");
    } finally {
      setExtratoSendingDirect(false);
    }
  };

  const handleAttachExtratoToComposer = async (client: Cliente) => {
    setExtratoGenerating(true);
    try {
      const b64 = extratoPreviewImage || await generateExtratoBase64(client.id);
      const clientOverdue = getClientOverdueDebts(client.id);
      const file = base64ToFile(b64, `Extrato_${client.nome.replace(/\s+/g, '_')}.png`);

      setAttachment({ file, base64: b64 });
      setSelectedClientIds([client.id]);

      if (!messageText.trim()) {
        setMessageText(generateExtratoText(client, clientOverdue));
      }

      setShowExtratoModal(false);
      showToast(`Extrato em imagem de ${client.nome} anexado ao disparador!`, "success");
    } catch (err) {
      console.error("Falha ao anexar extrato:", err);
      showToast("Falha ao gerar e anexar extrato.", "error");
    } finally {
      setExtratoGenerating(false);
    }
  };

  const openExtratoForClient = (clientId: string) => {
    setExtratoSelectedClientId(clientId);
    setExtratoPreviewImage(null);
    setShowExtratoModal(true);
    setTimeout(() => {
      handleGenerateExtratoPreview(clientId);
    }, 150);
  };

  const renderInvoiceCard = (captureId: string, client: Cliente) => {
    const overdueUnpaid = transacoes.filter(t => t.clienteId === client.id && isTransactionOverdue(t));
    const futureUnpaid = transacoes.filter(t => t.clienteId === client.id && !isTransactionOverdue(t) && t.status !== 'pago' && t.status !== 'cancelado');

    const totalVencido = overdueUnpaid.reduce((acc, t) => {
      const { total } = calculateTransactionInterest(t);
      return acc + total;
    }, 0);

    const isOverdue = overdueUnpaid.length > 0;

    return (
      <div
        key={captureId}
        id={captureId}
        className="bg-white p-10 w-[800px] text-stone-800 font-sans shadow-none rounded-none border-none"
      >
        <div className="flex justify-between items-start mb-8 border-b-2 border-stone-900 pb-6">
          <img src={logoUrl} alt="Logo Mexicano" className="h-16 object-contain" />
          <div className="text-right">
            <h1 className="text-3xl font-black text-stone-900 tracking-tight">Extrato de Débitos Vencidos</h1>
            <p className="text-stone-500 mt-1 font-semibold text-sm">Emissão: {new Date().toLocaleDateString('pt-BR')} • Posição de Títulos Vencidos</p>
          </div>
        </div>

        <div className="mb-8 bg-stone-50 p-5 rounded-2xl border border-stone-200">
          <h2 className="text-2xl font-black text-stone-900">{client.nome}</h2>
          <p className="text-stone-600 text-sm mt-1 font-medium">Telefone: {client.telefone || 'Não informado'}</p>
          {client.email && <p className="text-stone-600 text-sm mt-0.5 font-medium">E-mail: {client.email}</p>}
          <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
            isOverdue
              ? 'bg-rose-100 text-rose-700 border border-rose-200'
              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}>
            {isOverdue ? `⚠️ Status de Cobrança: INADIMPLENTE (${overdueUnpaid.length} ${overdueUnpaid.length === 1 ? 'título vencido' : 'títulos vencidos'})` : '✅ Status de Cobrança: REGULARIZADO / EM DIA'}
          </div>
        </div>

        {isOverdue ? (
          <div className="mb-8">
            <div className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Títulos Vencidos com Encargos Legais</span>
              <span className="text-[11px] font-medium text-stone-500 normal-case">Juros de 0,0733%/dia de atraso aplicados</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-stone-100 border-y-2 border-stone-800">
                <tr>
                  <th className="py-3 px-4 font-bold text-xs text-stone-700 uppercase tracking-wider">Categoria / Descrição</th>
                  <th className="py-3 px-4 font-bold text-xs text-stone-700 uppercase tracking-wider">Vencimento</th>
                  <th className="py-3 px-4 font-bold text-xs text-stone-700 uppercase tracking-wider text-right">Valor Orig.</th>
                  <th className="py-3 px-4 font-bold text-xs text-stone-700 uppercase tracking-wider text-right">Juros/Atraso</th>
                  <th className="py-3 px-4 font-bold text-xs text-stone-700 uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-sm">
                {overdueUnpaid.map(t => {
                  const { interest, total } = calculateTransactionInterest(t);
                  const catName = t.categoria ? t.categoria.replace('Servi??o', 'Serviço').replace('??', 'ç') : 'Lançamento';
                  return (
                    <tr key={t.id}>
                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        {catName}
                        {t.descricao && <p className="text-xs text-stone-500 font-normal mt-0.5">{t.descricao}</p>}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-rose-700">
                        {t.dataVencimento ? t.dataVencimento.split('-').reverse().join('/') : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 text-right font-mono">
                        R$ {Number(t.valor).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-rose-600 font-bold text-right font-mono">
                        {interest > 0 ? `+ R$ ${interest.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-black text-stone-900 text-right font-mono">
                        R$ {total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 bg-emerald-50/60 rounded-xl border border-emerald-200 text-center text-emerald-800 text-sm font-medium mb-8">
            ✅ Nenhum débito vencido encontrado. O cadastro do cotista está 100% regularizado e em dia.
            {futureUnpaid.length > 0 && (
              <p className="text-xs text-stone-500 mt-1 font-normal">
                Existem {futureUnpaid.length} lançamento(s) a vencer dentro do prazo regular de pagamento.
              </p>
            )}
          </div>
        )}

        {/* Lançamentos futuros informativos se houver */}
        {futureUnpaid.length > 0 && (
          <div className="mb-8 p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600">
            <span className="font-bold text-stone-800 uppercase tracking-wider block mb-1">
              ℹ️ Lançamentos a Vencer no Prazo (Não Inclusos na Cobrança)
            </span>
            <p className="text-stone-500">
              Constam {futureUnpaid.length} título(s) com vencimento futuro (a partir de {futureUnpaid[0]?.dataVencimento ? futureUnpaid[0].dataVencimento.split('-').reverse().join('/') : 'breve'}), sem incidência de juros.
            </p>
          </div>
        )}

        <div className="border-t-2 border-stone-900 pt-6 flex justify-between items-center">
          <div className="text-xs text-stone-400 font-medium">
            Mexicano Gestão Náutica • Central Financeira
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Total Vencido em Atraso</p>
            <p className={`text-4xl font-black tracking-tight font-mono ${isOverdue ? 'text-rose-600' : 'text-emerald-700'}`}>
              R$ {totalVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const inadimplentesCount = useMemo(() => {
    return clients.filter(c => c.telefone && isClientInadimplente(c)).length;
  }, [clients, transacoes]);

  const emDiaCount = useMemo(() => {
    return clients.filter(c => c.telefone && !isClientInadimplente(c)).length;
  }, [clients, transacoes]);

  const toggleClient = (id: string) =>
    setSelectedClientIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectAllFiltered = () => {
    const idsToAdd = filteredClients.map(c => c.id);
    setSelectedClientIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const deselectAllFiltered = () => {
    const idsToRemove = new Set(filteredClients.map(c => c.id));
    setSelectedClientIds(prev => prev.filter(id => !idsToRemove.has(id)));
  };

  const clearAllSelected = () => {
    setSelectedClientIds([]);
  };

  // Custom List Handling
  const handleSaveList = () => {
    if (!newListName.trim()) {
      showToast('Digite um nome para a lista.', 'error');
      return;
    }
    if (selectedClientIds.length === 0) {
      showToast('Selecione pelo menos um cliente para salvar na lista.', 'error');
      return;
    }
    const newList: CustomClientList = {
      id: `list_${Date.now()}`,
      name: newListName.trim(),
      clientIds: [...selectedClientIds],
      createdAt: new Date().toLocaleDateString('pt-BR')
    };
    const updated = [...customLists, newList];
    setCustomLists(updated);
    localStorage.setItem('finance_whatsapp_custom_lists', JSON.stringify(updated));
    const adminToken = getAdminToken();
    const hdr: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) hdr['Authorization'] = `Bearer ${adminToken}`;
    fetch('/api/config', { method: 'POST', headers: hdr, body: JSON.stringify({ configs: { finance_whatsapp_custom_lists: updated } }) }).catch(console.warn);
    
    setNewListName('');
    setShowSaveListModal(false);
    showToast(`Lista "${newList.name}" salva com ${newList.clientIds.length} clientes!`);
  };

  const handleLoadList = (list: CustomClientList) => {
    const validIds = list.clientIds.filter(id => clients.some(c => c.id === id && c.telefone));
    setSelectedClientIds(validIds);
    showToast(`Lista "${list.name}" carregada (${validIds.length} clientes selecionados).`);
  };

  const handleDeleteList = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Excluir esta lista de clientes?')) return;
    const updated = customLists.filter(l => l.id !== id);
    setCustomLists(updated);
    localStorage.setItem('finance_whatsapp_custom_lists', JSON.stringify(updated));
    const adminToken = getAdminToken();
    const hdr: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) hdr['Authorization'] = `Bearer ${adminToken}`;
    fetch('/api/config', { method: 'POST', headers: hdr, body: JSON.stringify({ configs: { finance_whatsapp_custom_lists: updated } }) }).catch(console.warn);
    showToast('Lista excluída.');
  };

  // Templates
  const allTemplates = useMemo(() => {
    return [...MESSAGE_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  const handleTemplateClick = (tpl: any) => {
    if (activeTemplateId === tpl.id) {
      setActiveTemplateId(null);
      setMessageText('');
    } else {
      setActiveTemplateId(tpl.id);
      setMessageText(tpl.text);
    }
  };

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      showToast('Digite um nome para o modelo.', 'error');
      return;
    }
    if (!messageText.trim()) {
      showToast('Escreva a mensagem antes de salvar.', 'error');
      return;
    }
    const newTpl: CustomTemplate = {
      id: `custom_${Date.now()}`,
      label: newTemplateName.trim(),
      icon: '📝',
      color: 'slate',
      description: 'Modelo personalizado',
      text: messageText,
      isCustom: true
    };
    const updated = [...customTemplates, newTpl];
    setCustomTemplates(updated);
    localStorage.setItem('finance_whatsapp_custom_templates', JSON.stringify(updated));
    const adminToken = getAdminToken();
    const hdr: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) hdr['Authorization'] = `Bearer ${adminToken}`;
    fetch('/api/config', { method: 'POST', headers: hdr, body: JSON.stringify({ configs: { finance_whatsapp_custom_templates: updated } }) }).catch(console.warn);
    setActiveTemplateId(newTpl.id);
    setNewTemplateName('');
    setShowSaveTemplateModal(false);
    showToast('Modelo salvo com sucesso!');
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Excluir este modelo personalizado?')) return;
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    localStorage.setItem('finance_whatsapp_custom_templates', JSON.stringify(updated));
    const adminToken2 = getAdminToken();
    const hdr2: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken2) hdr2['Authorization'] = `Bearer ${adminToken2}`;
    fetch('/api/config', { method: 'POST', headers: hdr2, body: JSON.stringify({ configs: { finance_whatsapp_custom_templates: updated } }) }).catch(console.warn);
    if (activeTemplateId === id) {
      setActiveTemplateId(null);
      setMessageText('');
    }
    showToast('Modelo excluído.');
  };

  // Helper to insert placeholders directly at cursor position
  const insertTagAtCursor = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessageText(prev => prev + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = messageText;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    setMessageText(before + tag + after);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Attachment handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { showToast('Arquivo muito grande (limite 15 MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => setAttachment({ file, base64: ev.target?.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getPersonalizedMessage = (text: string, client: Cliente, magicLink?: string) => {
    const firstName = client.nome ? client.nome.trim().split(' ')[0] : 'Cotista';
    const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long' });
    const capitalizedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
    const currentDate = new Date().toLocaleDateString('pt-BR');

    return text
      .replace(/\{nome\}/g, firstName)
      .replace(/\{mes\}/g, capitalizedMonth)
      .replace(/\{data\}/g, currentDate)
      .replace(/\{\s*link\s*\}/gi, magicLink || '');
  };

  const handleMassSend = async () => {
    cancelSendingRef.current = false;
    setShowConfirmModal(false);
    setSendingStatus('sending');
    const log: SendLogEntry[] = [];
    let successes = 0, failures = 0;

    for (let i = 0; i < selectedClientIds.length; i++) {
      if (cancelSendingRef.current) {
        log.push({ clientName: 'SISTEMA', phone: '-', status: 'error', timestamp: new Date().toLocaleTimeString() });
        break;
      }

      const client = clients.find(c => c.id === selectedClientIds[i]);
      if (!client?.telefone) { failures++; log.push({ clientName: client?.nome || '?', phone: '-', status: 'error', timestamp: new Date().toLocaleTimeString() }); continue; }

      setProgress({ current: i + 1, total: selectedClientIds.length, successes, failures });
      let magicLinkForClient: string | undefined;
      if (/\{\s*link\s*\}/i.test(messageText) || (attachIndividualExtratos && !messageText.trim())) {
        try {
          const mlRes = await fetch('/api/notifications/generate-finance-magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ clienteId: client.id, origin: window.location.origin }),
          });
          if (mlRes.ok) {
            const mlData = await mlRes.json();
            if (mlData?.magicLink) magicLinkForClient = mlData.magicLink;
          }
        } catch {}
      }
      let personalizedText = getPersonalizedMessage(messageText, client, magicLinkForClient);
      let mediaPayload: { media?: string; mimetype?: string; fileName?: string } = {};

      if (attachIndividualExtratos) {
        const clientOverdue = getClientOverdueDebts(client.id);
        if (clientOverdue.length > 0) {
          try {
            const b64 = await generateExtratoBase64(client.id);
            mediaPayload = {
              media: b64,
              mimetype: 'image/png',
              fileName: `Extrato_${client.nome.replace(/\s+/g, '_')}.png`,
            };
            if (!messageText.trim()) {
              personalizedText = generateExtratoText(client, clientOverdue, magicLinkForClient);
            }
          } catch (err) {
            console.warn(`Erro ao gerar extrato dinâmico para ${client.nome}:`, err);
          }
        }
      } else if (attachment) {
        mediaPayload = {
          media: attachment.base64,
          mimetype: attachment.file.type,
          fileName: attachment.file.name,
        };
      }

      try {
        const res = await fetch('/api/whatsapp/finance/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            instanceName,
            number: client.telefone,
            text: personalizedText,
            ...mediaPayload,
          }),
        });
        const ok = res.ok;
        if (ok) successes++; else failures++;
        log.push({ clientName: client.nome, phone: client.telefone, status: ok ? 'success' : 'error', timestamp: new Date().toLocaleTimeString() });
      } catch {
        failures++;
        log.push({ clientName: client.nome, phone: client.telefone, status: 'error', timestamp: new Date().toLocaleTimeString() });
      }

      if (i < selectedClientIds.length - 1) await new Promise(r => setTimeout(r, 2000));
    }

    setSendLog(log);
    setSendingStatus('completed');
    setProgress({ current: selectedClientIds.length, total: selectedClientIds.length, successes, failures });
  };

  const resetSender = () => {
    setSendingStatus('idle');
    setProgress({ current: 0, total: 0, successes: 0, failures: 0 });
    setSelectedClientIds([]);
    setMessageText('');
    setActiveTemplateId(null);
    setAttachment(null);
    setSendLog([]);
  };

  const isConnected = waStatus === 'open';

  // Preview helper
  const previewClient = useMemo(() => {
    const id = selectedClientIds[0];
    return id ? clients.find(c => c.id === id) : clients[0] || null;
  }, [selectedClientIds, clients]);

  const previewText = useMemo(() => {
    if (!previewClient) return messageText;
    return getPersonalizedMessage(messageText, previewClient);
  }, [messageText, previewClient]);

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 z-[100] animate-in slide-in-from-bottom-5 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Standardized Mexicano PageHeader */}
      <PageHeader
        pageTitle="WhatsApp Cobrança & Mensagens"
        subtitle="Disparo de faturas, avisos de débito, lembretes de vencimento e comunicados aos cotistas"
        breadcrumbs={[
          { label: "Financeiro" },
          { label: "WhatsApp Cobrança" }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Gerador de Extrato de Cobrança (PNG) */}
            <button
              onClick={() => {
                setShowExtratoModal(true);
                setExtratoSelectedClientId(null);
                setExtratoPreviewImage(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/80 text-xs font-semibold text-stone-700 hover:text-stone-900 transition-colors shadow-2xs cursor-pointer"
              title="Gerar e Enviar Extrato de Débitos em Imagem PNG com Juros"
            >
              <FileText className="w-3.5 h-3.5 text-mx-ink" />
              <span>Extrato de Cobrança (PNG)</span>
            </button>

            {/* WhatsApp Connection Status Badge */}
            <button
              onClick={() => setShowConnectionModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70'
                  : 'bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100/70'
              }`}
              title="Clique para gerenciar a conexão da instância"
            >
              <span className="relative flex h-2 w-2">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </>
                )}
              </span>
              <span className="font-bold">{isConnected ? 'Conectado (financeiro)' : 'Desconectado'}</span>
            </button>

            {/* Quick Session Config Button */}
            <button
              onClick={() => setShowConnectionModal(true)}
              className="p-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/80 text-stone-700 transition-colors shadow-2xs cursor-pointer"
              title="Configurações da Sessão WhatsApp"
            >
              <Settings className="w-4 h-4 text-stone-600" />
            </button>
          </div>
        }
      />

      {/* 1. Metric KPI Cards (Estilo Mexicano) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Status Conexão */}
            <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-500">Status da Instância</span>
                <span
                  className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 ${
                    isConnected
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                      : 'text-amber-700 bg-amber-50 border border-amber-200/60'
                  }`}
                >
                  {isConnected ? 'Operacional' : 'Aguardando'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-stone-900 truncate">
                    {instanceName}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    {isConnected ? 'Pronto para disparos' : 'Conexão necessária'}
                  </div>
                </div>
                <button
                  onClick={() => setShowConnectionModal(true)}
                  className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 transition-colors cursor-pointer"
                  title="Configurar sessão"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inadimplentes */}
            <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-500">Cotistas Inadimplentes</span>
                <span className="text-[10px] font-semibold rounded-md px-1.5 py-0.5 text-rose-700 bg-rose-50 border border-rose-200/60">
                  Débitos
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold tabular-nums text-rose-600">
                    {inadimplentesCount}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    Com pendências ativas
                  </div>
                </div>
                <button
                  onClick={() => {
                    setClientFilter('inadimplentes');
                    const inads = clients.filter(c => c.telefone && c.statusFinanceiro === 'inadimplente').map(c => c.id);
                    setSelectedClientIds(inads);
                    showToast(`${inads.length} inadimplentes selecionados.`);
                  }}
                  className="text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/60 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Selecionar
                </button>
              </div>
            </div>

            {/* Em Dia */}
            <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-500">Cotistas em Dia</span>
                <span className="text-[10px] font-semibold rounded-md px-1.5 py-0.5 text-emerald-700 bg-emerald-50 border border-emerald-200/60">
                  Regulares
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold tabular-nums text-stone-900">
                    {emDiaCount}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    Cadastros em dia
                  </div>
                </div>
                <button
                  onClick={() => setClientFilter('em_dia')}
                  className="text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Filtrar
                </button>
              </div>
            </div>

            {/* Fila de Disparo */}
            <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-500">Fila de Disparo</span>
                <span className="text-[10px] font-semibold rounded-md px-1.5 py-0.5 text-stone-700 bg-stone-100 border border-stone-200/60">
                  {filteredClients.length} visíveis
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold tabular-nums text-stone-900">
                    {selectedClientIds.length}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    Cotistas marcados
                  </div>
                </div>
                {selectedClientIds.length > 0 && (
                  <button
                    onClick={clearAllSelected}
                    className="text-xs font-semibold text-stone-500 hover:text-rose-600 px-2 py-1 transition-colors cursor-pointer"
                  >
                    Desmarcar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Connection warning banner if disconnected */}
          {!isConnected && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
              <span className="flex items-center gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                WhatsApp desconectado. Conecte a instância <strong>{instanceName}</strong> para disparar as mensagens.
              </span>
              <button
                onClick={() => setShowConnectionModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Conectar via QR Code
              </button>
            </div>
          )}

          {/* 2. Main Workspace (Destinatários + Compositor) */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col lg:flex-row min-h-[660px]">
            {/* Left Panel: Cotistas & Destinatários */}
            <div className="w-full lg:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r border-stone-200/80 flex flex-col bg-stone-50/40">
              {/* Header da Coluna */}
              <div className="p-4 border-b border-stone-200/80 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-stone-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <Users className="w-4 h-4 text-stone-500" /> Destinatários
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold bg-mx-ink-100 text-mx-ink border border-mx-ink/10 px-2 py-0.5 rounded-full">
                      {selectedClientIds.length} selecionados
                    </span>
                    <button
                      onClick={() => setShowAdvancedSelectorModal(true)}
                      className="p-1.5 bg-stone-100 hover:bg-stone-200/80 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Abrir Seleção Ampliada em Tela Cheia"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Buscar cotista, telefone ou cota (ex: M58)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    disabled={sendingStatus !== 'idle'}
                    className="w-full pl-9 pr-8 py-2 bg-stone-50/70 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-mx-ink focus:ring-1 focus:ring-mx-ink/20 transition-all font-medium"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Segmented Filter */}
                <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200/60 text-xs">
                  <button
                    onClick={() => setClientFilter('todos')}
                    className={`flex-1 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                      clientFilter === 'todos' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    Todos ({clients.filter(c => c.telefone).length})
                  </button>
                  <button
                    onClick={() => setClientFilter('inadimplentes')}
                    className={`flex-1 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                      clientFilter === 'inadimplentes' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-stone-500 hover:text-rose-600'
                    }`}
                  >
                    Inadimplentes ({inadimplentesCount})
                  </button>
                  <button
                    onClick={() => setClientFilter('em_dia')}
                    className={`flex-1 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                      clientFilter === 'em_dia' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-stone-500 hover:text-emerald-700'
                    }`}
                  >
                    Em Dia ({emDiaCount})
                  </button>
                </div>

                {/* Embarcação Select */}
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <select
                      value={selectedBoatId}
                      onChange={e => setSelectedBoatId(e.target.value)}
                      className="w-full pl-7 pr-7 py-1.5 bg-stone-50/70 border border-stone-200 rounded-lg text-xs font-medium text-stone-700 focus:outline-none focus:border-mx-ink cursor-pointer truncate"
                    >
                      <option value="all">Todas as Embarcações ({boats.length})</option>
                      {boats.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.nome} {b.numero ? `(M${b.numero})` : ''}
                        </option>
                      ))}
                    </select>
                    <Anchor className="w-3.5 h-3.5 text-stone-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Batch Actions Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[11px]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllFiltered}
                      disabled={sendingStatus !== 'idle' || filteredClients.length === 0}
                      className="font-semibold text-mx-ink hover:text-mx-ink-700 disabled:opacity-40 cursor-pointer"
                    >
                      Marcar Visíveis ({filteredClients.length})
                    </button>
                    <span className="text-stone-300">•</span>
                    <button
                      onClick={clearAllSelected}
                      disabled={sendingStatus !== 'idle' || selectedClientIds.length === 0}
                      className="font-semibold text-stone-500 hover:text-rose-600 disabled:opacity-40 cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowSaveListModal(true)}
                      disabled={selectedClientIds.length === 0}
                      className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
                      title="Salvar Seleção como Lista"
                    >
                      <FolderPlus className="w-3 h-3 text-stone-500" /> Salvar
                    </button>
                    <button
                      onClick={() => setShowManageListsModal(true)}
                      className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title="Gerenciar Listas Salvas"
                    >
                      <Bookmark className="w-3 h-3 text-stone-500" /> Listas ({customLists.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Client List */}
              <div className="flex-1 overflow-y-auto subtle-scrollbar p-2 space-y-1">
                {filteredClients.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                    <p className="text-xs text-stone-400 font-medium">Nenhum cotista encontrado com os filtros atuais.</p>
                  </div>
                ) : (
                  filteredClients.map(client => {
                    const isSelected = selectedClientIds.includes(client.id);
                    const isOverdue = clientHasOverdueDebts(client.id);
                    const totalOverdue = getClientTotalOverdueDebt(client.id);
                    const boatName = getBoatName(client.embarcacaoId);
                    return (
                      <div
                        key={client.id}
                        onClick={() => toggleClient(client.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all select-none border ${
                          isSelected
                            ? 'bg-white border-mx-ink/30 shadow-2xs'
                            : 'bg-white/70 border-stone-200/60 hover:bg-white hover:border-stone-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          disabled={sendingStatus !== 'idle'}
                          className="w-4 h-4 text-mx-ink rounded border-stone-300 focus:ring-mx-ink shrink-0 cursor-pointer accent-[#2b1120]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-stone-900 truncate">{client.nome}</span>
                            {isOverdue && (
                              <span className="text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60 px-1.5 py-0.2 rounded shrink-0">
                                DÉBITO VENCIDO R$ {Math.round(totalOverdue)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-stone-400 font-mono">
                            <span>{client.telefone}</span>
                            {boatName && (
                              <span className="text-[10px] text-stone-500 bg-stone-100 px-1 py-0.2 rounded font-sans truncate">
                                {boatName}
                              </span>
                            )}
                          </div>
                        </div>
                        {isOverdue && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openExtratoForClient(client.id);
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors shrink-0 cursor-pointer"
                            title="Gerar e ver Extrato de Débitos Vencidos em Imagem (PNG)"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-mx-ink shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer da Coluna */}
              <div className="p-3 border-t border-stone-200/80 bg-white flex items-center justify-between text-xs text-stone-500">
                <span>{filteredClients.length} filtrados</span>
                <span className="font-bold text-mx-ink">{selectedClientIds.length} selecionados</span>
              </div>
            </div>

            {/* Right Panel: Compositor & Envio */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {/* Sending Progress view if active */}
              {sendingStatus !== 'idle' && (
                <div className="p-5 bg-stone-50 border-b border-stone-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {sendingStatus === 'sending' ? (
                        <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                      <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                        {sendingStatus === 'sending' ? 'Disparando Mensagens em Lote...' : 'Envio Concluído!'}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-stone-600 tabular-nums">
                      {progress.current} / {progress.total} ({Math.round((progress.current / (progress.total || 1)) * 100)}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-mx-ink h-full transition-all duration-300"
                      style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-700 font-bold">{progress.successes} enviados</span>
                      <span className="text-stone-300">•</span>
                      <span className="text-rose-600 font-bold">{progress.failures} falhas</span>
                    </div>
                    {sendingStatus === 'sending' && (
                      <button
                        onClick={() => { cancelSendingRef.current = true; setSendingStatus('idle'); }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" /> Cancelar
                      </button>
                    )}
                  </div>

                  {/* Send log table */}
                  {sendLog.length > 0 && (
                    <div className="bg-white border border-stone-200 rounded-xl mb-3 max-h-40 overflow-y-auto subtle-scrollbar">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-stone-50 border-b border-stone-200 text-stone-500">
                          <tr>
                            <th className="text-left px-3 py-1.5 font-semibold">Cliente</th>
                            <th className="text-left px-3 py-1.5 font-semibold">Telefone</th>
                            <th className="text-left px-3 py-1.5 font-semibold">Hora</th>
                            <th className="text-center px-3 py-1.5 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {sendLog.map((entry, i) => (
                            <tr key={i}>
                              <td className="px-3 py-1.5 text-stone-800 font-medium truncate max-w-[140px]">{entry.clientName}</td>
                              <td className="px-3 py-1.5 text-stone-500 font-mono">{entry.phone}</td>
                              <td className="px-3 py-1.5 text-stone-400">{entry.timestamp}</td>
                              <td className="px-3 py-1.5 text-center">
                                {entry.status === 'success' ? (
                                  <span className="text-emerald-700 font-bold">✓ Enviado</span>
                                ) : (
                                  <span className="text-rose-600 font-bold">✗ Falha</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {sendingStatus === 'completed' && (
                    <button
                      onClick={resetSender}
                      className="w-full bg-mx-ink hover:bg-mx-ink-700 text-white py-2 rounded-xl font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                    >
                      Iniciar Novo Disparo
                    </button>
                  )}
                </div>
              )}

              {/* Template Selector Bar */}
              <div className="px-6 py-4 bg-stone-50/50 border-b border-stone-200/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                    <LayoutTemplate className="w-3.5 h-3.5 text-stone-400" /> Modelos Rápidos de Mensagem
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Selecione um modelo para preencher a mensagem automaticamente
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto subtle-scrollbar pb-1">
                  {allTemplates.map(tpl => {
                    const isActive = activeTemplateId === tpl.id;
                    return (
                      <div key={tpl.id} className="relative group shrink-0">
                        <button
                          onClick={() => handleTemplateClick(tpl)}
                          className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border text-left transition-all min-w-[150px] cursor-pointer ${
                            isActive
                              ? 'bg-mx-ink border-mx-ink text-white shadow-xs'
                              : 'bg-white border-stone-200/80 hover:border-stone-400 hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <span className="text-base shrink-0 mt-0.5">{tpl.icon}</span>
                          <div className="min-w-0 pr-4">
                            <div className="text-xs font-bold leading-tight truncate">{tpl.label}</div>
                            <div className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-stone-300' : 'text-stone-400'}`}>
                              {tpl.description}
                            </div>
                          </div>
                        </button>
                        {(tpl as any).isCustom && (
                          <button
                            onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                            className="absolute right-1.5 top-1.5 p-1 text-stone-400 hover:text-rose-600 rounded hover:bg-stone-100 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Excluir modelo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Compose Body */}
              <div className="flex-1 p-6 flex flex-col gap-3.5 overflow-y-auto subtle-scrollbar">
                {/* Toolbar de variáveis automáticas */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 flex-wrap">
                    <span className="font-semibold text-stone-600">Inserir tag automática:</span>
                    <button
                      type="button"
                      onClick={() => insertTagAtCursor('{nome}')}
                      className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono text-[11px] font-semibold transition-colors cursor-pointer"
                      title="Inserir primeiro nome do cliente"
                    >
                      {'{nome}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTagAtCursor('{mes}')}
                      className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono text-[11px] font-semibold transition-colors cursor-pointer"
                      title="Inserir mês atual"
                    >
                      {'{mes}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTagAtCursor('{data}')}
                      className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono text-[11px] font-semibold transition-colors cursor-pointer"
                      title="Inserir data atual"
                    >
                      {'{data}'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400 tabular-nums">{messageText.length} caracteres</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedClientIds.length === 1) {
                          const client = clients.find(c => c.id === selectedClientIds[0]);
                          if (client) {
                            handleAttachExtratoToComposer(client);
                            return;
                          }
                        }
                        setShowExtratoModal(true);
                        setExtratoSelectedClientId(null);
                        setExtratoPreviewImage(null);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-all cursor-pointer shadow-2xs"
                      title={selectedClientIds.length === 1 ? "Gerar e anexar extrato PNG do cotista selecionado" : "Abrir central de extratos de débitos"}
                    >
                      <FileText className="w-3 h-3 text-rose-700" />
                      <span>Gerar Extrato (PNG)</span>
                    </button>
                    <button
                      onClick={() => setShowSaveTemplateModal(true)}
                      disabled={!messageText.trim()}
                      className="flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200 transition-all disabled:opacity-30 cursor-pointer"
                    >
                      <Save className="w-3 h-3" /> Salvar Modelo
                    </button>
                    <button
                      onClick={() => setShowPreview(true)}
                      disabled={!messageText.trim() && !attachment}
                      className="flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-emerald-700 bg-white hover:bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200 hover:border-emerald-200 transition-all disabled:opacity-30 cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-emerald-600" /> Prévia WhatsApp
                    </button>
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={e => { setMessageText(e.target.value); setActiveTemplateId(null); }}
                  placeholder="Selecione um modelo acima ou redija sua mensagem personalizada para os cotistas...&#10;&#10;As tags {nome}, {mes} e {data} são preenchidas automaticamente para cada destinatário."
                  className="w-full flex-1 min-h-[200px] resize-none border border-stone-200 rounded-xl p-4 text-xs sm:text-sm text-stone-800 focus:outline-none focus:border-mx-ink focus:ring-1 focus:ring-mx-ink/20 subtle-scrollbar leading-relaxed font-sans placeholder-stone-400"
                />

                {/* Attachment Box */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div
                  className={`border-2 border-dashed rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all ${
                    attachment
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-stone-200 hover:border-stone-400 hover:bg-stone-50/60'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    attachment ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {attachment ? (
                      attachment.file.type.startsWith('image/') ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />
                    ) : (
                      <Paperclip className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {attachment ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900 truncate">{attachment.file.name}</span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            {attachment.file.type.startsWith('image/') ? 'Imagem' : 'Boleto / PDF'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">{(attachment.file.size / 1024).toFixed(0)} KB • Clique para alterar o arquivo</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-stone-800">Anexar Boleto Bancário (PDF) ou Comprovante (Imagem)</p>
                        <p className="text-[11px] text-stone-400">PDF (.pdf) ou Imagens (JPG, PNG, WEBP) até 15 MB</p>
                      </>
                    )}
                  </div>
                  {attachment && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setAttachment(null); }}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remover anexo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-6 py-4 border-t border-stone-200/80 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-stone-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Cadência de segurança anti-bloqueio de ~2s entre cada envio
                </div>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!isConnected || selectedClientIds.length === 0 || (!messageText.trim() && !attachment)}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer ${
                    isConnected && selectedClientIds.length > 0 && (messageText.trim() || attachment)
                      ? 'bg-mx-ink hover:bg-mx-ink-700 text-white shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] active:scale-98'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  Disparar para {selectedClientIds.length} {selectedClientIds.length === 1 ? 'Cotista' : 'Cotistas'}
                </button>
              </div>
            </div>
          </div>

      {/* MODAL 1: Connection & QR Code Settings */}
      {showConnectionModal && (
        <div className="fixed inset-0 z-[90] bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/70">
              <h3 className="font-bold text-stone-900 flex items-center gap-2 text-sm">
                <Smartphone className="w-4 h-4 text-stone-500" /> Conexão do WhatsApp Financeiro
              </h3>
              <button onClick={() => setShowConnectionModal(false)} className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              {waStatus === 'not_created' ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-stone-400">
                    <Smartphone className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-stone-900 mb-1">Nenhuma sessão ativa</h4>
                  <p className="text-stone-500 text-xs max-w-sm mx-auto mb-6">
                    Crie a instância dedicada do financeiro para conectar o seu WhatsApp ao sistema.
                  </p>
                  
                  <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
                    <button
                      onClick={handleCreateInstance}
                      disabled={isCreating}
                      className="inline-flex justify-center items-center gap-2 bg-mx-ink hover:bg-mx-ink-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs"
                    >
                      {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                      {isCreating ? 'Criando instância...' : 'Criar Instância Financeira'}
                    </button>
                    
                    <button
                      onClick={handleFetchInstances}
                      disabled={isFetchingInstances}
                      className="inline-flex justify-center items-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-6 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingInstances ? 'animate-spin' : ''}`} />
                      Buscar Instâncias Existentes
                    </button>
                  </div>

                  {serverInstances.length > 0 && (
                    <div className="mt-4 p-3 border border-stone-200 rounded-xl bg-stone-50 text-left">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-2">Instâncias Disponíveis</span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto subtle-scrollbar">
                        {serverInstances.map((inst, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded-lg text-xs">
                            <span className="font-bold text-stone-800">{inst.name || inst.instance?.instanceName}</span>
                            <button
                              onClick={() => handleReconnectInstance(inst.name || inst.instance?.instanceName)}
                              className="text-xs bg-mx-ink hover:bg-mx-ink-700 text-white px-2.5 py-1 rounded-md font-bold cursor-pointer"
                            >
                              Vincular
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : isFetchingWaStatus ? (
                <div className="text-center py-10">
                  <RefreshCw className="w-8 h-8 animate-spin text-stone-400 mx-auto mb-3" />
                  <p className="text-stone-500 text-xs font-medium">Verificando status da conexão...</p>
                </div>
              ) : waStatus === 'open' ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200/80 text-emerald-600">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-stone-900 mb-1">WhatsApp Conectado!</h4>
                  <p className="text-stone-500 text-xs mb-4">A instância financeira está online e pronta para envio de faturas.</p>
                  <div className="inline-flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 mb-6 text-xs">
                    <span className="text-stone-400">Instância:</span>
                    <code className="font-mono font-bold text-stone-800">{instanceName}</code>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => fetchWaStatus(instanceName)}
                      className="inline-flex items-center gap-1.5 border border-stone-200 hover:bg-stone-50 text-stone-700 px-4 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                    </button>
                    <button
                      onClick={handleWaLogout}
                      className="inline-flex items-center gap-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Desconectar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5 text-center">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-200">
                    {waQrCode ? (
                      <img
                        src={waQrCode.startsWith('data:') ? waQrCode : `data:image/png;base64,${waQrCode}`}
                        alt="QR Code WhatsApp"
                        className="w-56 h-56 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-56 h-56 flex flex-col items-center justify-center bg-stone-50 rounded-lg text-stone-400 gap-2">
                        <QrCode className="w-10 h-10 animate-pulse" />
                        <span className="text-xs">Gerando QR Code...</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-stone-800">Escaneie com o WhatsApp no seu celular</p>
                    <p className="text-[11px] text-stone-400">Abra o WhatsApp &gt; Dispositivos conectados &gt; Conectar aparelho</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchWaStatus(instanceName)}
                      className="bg-mx-ink hover:bg-mx-ink-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Já conectei, atualizar
                    </button>
                    <button
                      onClick={() => fetchWaQrCode(instanceName)}
                      className="border border-stone-200 hover:bg-stone-50 text-stone-700 px-3 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Novo QR Code
                    </button>
                  </div>
                </div>
              )}

              {/* Diagnóstico técnico */}
              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Diagnóstico Técnico</span>
                <button
                  onClick={handleRunDebug}
                  disabled={isRunningDebug}
                  className="text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isRunningDebug ? 'animate-spin' : ''}`} />
                  {isRunningDebug ? 'Testando...' : 'Executar Teste'}
                </button>
              </div>

              {showDebugPanel && debugReport && (
                <div className="mt-3 p-3 bg-stone-900 text-emerald-400 font-mono rounded-xl text-[11px] space-y-2 border border-stone-800 max-h-48 overflow-y-auto subtle-scrollbar">
                  <div><strong>API URL:</strong> {debugReport.env?.EVOLUTION_API_URL}</div>
                  <div><strong>Instância:</strong> {debugReport.env?.targetInstance}</div>
                  <div><strong>Conexão:</strong> {JSON.stringify(debugReport.tests?.connectionState?.data || debugReport.tests?.connectionState?.status)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Message Preview Drawer (Simulação WhatsApp) */}
      {showPreview && (
        <div className="fixed inset-0 z-[90] bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/70">
              <h3 className="font-bold text-stone-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <Eye className="w-4 h-4 text-emerald-600" /> Prévia no WhatsApp
              </h3>
              <button onClick={() => setShowPreview(false)} className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 bg-[#efeae2]">
              {/* Balão WhatsApp */}
              <div className="bg-white rounded-2xl p-4 shadow-sm max-w-[90%] ml-auto border border-stone-200/60 relative">
                <p className="text-xs text-stone-800 whitespace-pre-line leading-relaxed">
                  {previewText || 'Sua mensagem aparecerá aqui...'}
                </p>
                {attachment && (
                  <div className="mt-2 pt-2 border-t border-stone-100 flex items-center gap-2">
                    {attachment.file.type.startsWith('image/') ? (
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-rose-600" />
                    )}
                    <span className="text-[11px] text-stone-700 font-medium truncate">{attachment.file.name}</span>
                  </div>
                )}
                <div className="text-[10px] text-stone-400 text-right mt-1.5 flex items-center justify-end gap-1 font-mono">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-blue-500 font-bold">✓✓</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-500 mt-3 text-center">
                {previewClient ? `Simulação personalizada para: ${previewClient.nome}` : 'Nenhum cliente selecionado'}
              </p>
            </div>

            <div className="p-3 border-t border-stone-100 bg-white flex justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold cursor-pointer"
              >
                Fechar Prévia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[90] bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-mx-ink-100 text-mx-ink rounded-2xl flex items-center justify-center mx-auto mb-4 border border-mx-ink/10">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-1">Confirmar Disparo em Lote</h3>
            <p className="text-xs text-stone-500 mb-5 leading-relaxed">
              Você está prestes a disparar mensagens para <strong className="text-stone-900 font-bold">{selectedClientIds.length} cotistas</strong>. Haverá um intervalo seguro de ~2 segundos entre cada envio.
            </p>
            {attachment && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-2.5 mb-5 flex items-center gap-2.5 text-left text-xs">
                <FileText className="w-4 h-4 text-stone-500 shrink-0" />
                <span className="font-medium text-stone-700 truncate flex-1">{attachment.file.name}</span>
              </div>
            )}
            {selectedClientIds.some(id => clientHasOverdueDebts(id)) && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 mb-5 text-left cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={attachIndividualExtratos}
                  onChange={(e) => setAttachIndividualExtratos(e.target.checked)}
                  className="mt-0.5 rounded border-amber-300 text-mx-ink focus:ring-mx-ink cursor-pointer accent-[#2b1120]"
                />
                <div>
                  <span className="text-xs font-bold text-amber-900 block">Gerar extrato PNG individual para cotistas com títulos vencidos</span>
                  <span className="text-[11px] text-amber-700 block leading-tight mt-0.5">
                    Gera e anexa automaticamente o extrato visual com cálculo de juros específico de cada cotista com pendências vencidas.
                  </span>
                </div>
              </label>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleMassSend}
                className="flex-1 px-4 py-2.5 rounded-xl bg-mx-ink hover:bg-mx-ink-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirmar Disparos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-[90] bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-sm w-full p-5 animate-in zoom-in-95 duration-150">
            <h4 className="text-sm font-bold text-stone-900 mb-1">Salvar Modelo de Mensagem</h4>
            <p className="text-xs text-stone-500 mb-4">Dê um nome identificador para reutilizar esta mensagem no futuro.</p>
            <input
              type="text"
              placeholder="Ex: Cobrança Amigável - Mês Atual"
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-mx-ink mb-4 font-medium"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="flex-1 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTemplate}
                className="flex-1 py-2 rounded-xl bg-mx-ink hover:bg-mx-ink-700 text-white text-xs font-bold cursor-pointer"
              >
                Salvar Modelo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Save Custom List Modal */}
      {showSaveListModal && (
        <div className="fixed inset-0 z-[90] bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-sm w-full p-5 animate-in zoom-in-95 duration-150">
            <h4 className="text-sm font-bold text-stone-900 mb-1">Salvar Lista de Destinatários</h4>
            <p className="text-xs text-stone-500 mb-4">Salvar os {selectedClientIds.length} cotistas selecionados como lista fixa.</p>
            <input
              type="text"
              placeholder="Ex: Grupo Barco M58 - Vencimento Dia 10"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-mx-ink mb-4 font-medium"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveListModal(false)}
                className="flex-1 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveList}
                className="flex-1 py-2 rounded-xl bg-mx-ink hover:bg-mx-ink-700 text-white text-xs font-bold cursor-pointer"
              >
                Salvar Lista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Manage Lists Modal */}
      {showManageListsModal && (
        <div className="fixed inset-0 z-[90] bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
              <h4 className="text-sm font-bold text-stone-900">Listas Salvas</h4>
              <button onClick={() => setShowManageListsModal(false)} className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {customLists.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">Nenhuma lista salva ainda.</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto subtle-scrollbar">
                {customLists.map(list => (
                  <div key={list.id} className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs">
                    <div>
                      <div className="font-bold text-stone-800">{list.name}</div>
                      <div className="text-[10px] text-stone-400">{list.clientIds.length} cotistas • Criada em {list.createdAt}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { handleLoadList(list); setShowManageListsModal(false); }}
                        className="px-2.5 py-1 bg-mx-ink text-white rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        Carregar
                      </button>
                      <button
                        onClick={(e) => handleDeleteList(list.id, e)}
                        className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 7: Advanced Selector Modal */}
      {showAdvancedSelectorModal && (
        <div className="fixed inset-0 z-[90] bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Seleção Ampliada de Cotistas</h3>
                  <p className="text-[11px] text-stone-400">Marque múltiplos clientes por busca, embarcação ou status financeiro</p>
                </div>
              </div>
              <button onClick={() => setShowAdvancedSelectorModal(false)} className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-stone-50/50 border-b border-stone-100 flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por cotista, fone ou barco..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-mx-ink font-medium"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllFiltered}
                  className="px-3 py-1.5 bg-mx-ink-100 hover:bg-mx-ink-100/80 text-mx-ink font-bold border border-mx-ink/10 rounded-lg text-xs cursor-pointer"
                >
                  Marcar Todos ({filteredClients.length})
                </button>
                <button
                  onClick={deselectAllFiltered}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold border border-stone-200 rounded-lg text-xs cursor-pointer"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            {/* Grid of clients */}
            <div className="flex-1 overflow-y-auto p-4 subtle-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {filteredClients.map(client => {
                  const isSelected = selectedClientIds.includes(client.id);
                  const isInadimplente = client.statusFinanceiro === 'inadimplente';
                  const boatName = getBoatName(client.embarcacaoId);
                  return (
                    <div
                      key={client.id}
                      onClick={() => toggleClient(client.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all select-none flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-white border-mx-ink/40 shadow-xs'
                          : 'bg-white border-stone-200/70 hover:border-stone-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 mt-0.5 text-mx-ink rounded border-stone-300 focus:ring-mx-ink shrink-0 accent-[#2b1120]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-stone-900 truncate">{client.nome}</span>
                          {isInadimplente && (
                            <span className="text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60 px-1 py-0.2 rounded">
                              DÉBITO
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 font-mono mt-0.5">{client.telefone}</p>
                        {boatName && (
                          <span className="inline-block mt-1 text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                            {boatName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 border-t border-stone-100 bg-stone-50 flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">{selectedClientIds.length} cotistas selecionados</span>
              <button
                onClick={() => setShowAdvancedSelectorModal(false)}
                className="px-5 py-2 bg-mx-ink hover:bg-mx-ink-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-2xs"
              >
                Concluir Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Extrato de Débito em Imagem (PNG) */}
      {showExtratoModal && (
        <div className="fixed inset-0 z-[95] bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {!extratoSelectedClientId ? (
              // ETAPA 1: SELEÇÃO DO COTISTA
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-mx-sand-100 border border-mx-sand-200 text-mx-ink flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm sm:text-base">Extrato Financeiro em Imagem (PNG)</h3>
                      <p className="text-xs text-stone-500">Selecione o cotista para gerar a fatura visual com juros calculados</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowExtratoModal(false)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 border-b border-stone-100 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:flex-1">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, telefone ou embarcação..."
                      value={extratoSearchQuery}
                      onChange={e => setExtratoSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:border-mx-ink focus:ring-1 focus:ring-mx-ink/20"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExtratoFilterOnlyDebts(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        extratoFilterOnlyDebts
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Apenas com Débitos ({inadimplentesCount})
                    </button>
                    <button
                      onClick={() => setExtratoFilterOnlyDebts(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        !extratoFilterOnlyDebts
                          ? 'bg-stone-800 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Todos ({clients.length})
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto subtle-scrollbar p-4 divide-y divide-stone-100">
                  {clients
                    .filter(c => {
                      if (!c.telefone) return false;
                      const hasOverdue = clientHasOverdueDebts(c.id);
                      if (extratoFilterOnlyDebts && !hasOverdue) return false;

                      if (extratoSearchQuery.trim()) {
                        const q = extratoSearchQuery.toLowerCase();
                        const matchesName = c.nome.toLowerCase().includes(q);
                        const matchesPhone = c.telefone.toLowerCase().includes(q);
                        const boatName = getBoatName(c.embarcacaoId).toLowerCase();
                        return matchesName || matchesPhone || boatName.includes(q);
                      }
                      return true;
                    })
                    .slice(0, 80)
                    .map(client => {
                      const clientOverdue = getClientOverdueDebts(client.id);
                      const clientFuture = getClientFutureDebts(client.id);
                      const totalOverdue = getClientTotalOverdueDebt(client.id);
                      const boatName = getBoatName(client.embarcacaoId);
                      return (
                        <div
                          key={client.id}
                          onClick={() => openExtratoForClient(client.id)}
                          className="py-3 px-3 rounded-xl hover:bg-stone-50 cursor-pointer flex items-center justify-between gap-3 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-mx-sand-100 group-hover:text-mx-ink transition-colors">
                              {client.nome.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-mx-ink truncate">
                                {client.nome}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5 font-mono">
                                <span>{client.telefone}</span>
                                {boatName && (
                                  <span className="font-sans text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                                    {boatName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {clientOverdue.length > 0 ? (
                              <div>
                                <p className="text-xs sm:text-sm font-black text-rose-600 font-mono">
                                  R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-[10px] font-bold text-rose-500 mt-0.5">
                                  {clientOverdue.length} {clientOverdue.length === 1 ? 'título vencido' : 'títulos vencidos'}
                                </p>
                                {clientFuture.length > 0 && (
                                  <p className="text-[9px] text-stone-400">
                                    +{clientFuture.length} a vencer
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                                <CheckCircle className="w-3 h-3" /> Em dia {clientFuture.length > 0 ? `(${clientFuture.length} a vencer)` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              // ETAPA 2: AÇÕES DO CLIENTE SELECIONADO & PREVIEW DO EXTRATO
              (() => {
                const client = clients.find(c => c.id === extratoSelectedClientId);
                if (!client) return null;
                const clientOverdue = getClientOverdueDebts(client.id);
                const clientFuture = getClientFutureDebts(client.id);
                const totalOverdue = getClientTotalOverdueDebt(client.id);
                const boatName = getBoatName(client.embarcacaoId);

                return (
                  <div className="flex flex-col h-full overflow-hidden">
                    {/* Header do Cliente */}
                    <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setExtratoSelectedClientId(null);
                            setExtratoPreviewImage(null);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-stone-900 text-sm sm:text-base">{client.nome}</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${
                              clientOverdue.length > 0
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}>
                              {clientOverdue.length > 0 ? `Inadimplente (${clientOverdue.length} vencidos)` : 'Regularizado / Em Dia'}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-0.5 font-mono">
                            {client.telefone} {boatName ? `• ${boatName}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowExtratoModal(false)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Conteúdo: 2 Colunas (Ações à esquerda, Preview à direita) */}
                    <div className="flex-1 overflow-y-auto subtle-scrollbar p-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      {/* Coluna da Esquerda: Botões de Ação */}
                      <div className="space-y-3">
                        <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Vencido em Atraso</span>
                          <div className={`text-2xl font-black font-mono mt-0.5 ${clientOverdue.length > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1">
                            {clientOverdue.length > 0
                              ? `${clientOverdue.length} lançamento(s) vencido(s) com juros de 0,0733%/dia aplicados.`
                              : 'Nenhum lançamento vencido. Cadastro 100% regularizado.'}
                          </p>
                          {clientFuture.length > 0 && (
                            <p className="text-[10px] text-stone-400 mt-1 border-t border-stone-200/60 pt-1">
                              ℹ️ Constam {clientFuture.length} título(s) futuro(s) a vencer dentro do prazo regular (não cobrados aqui).
                            </p>
                          )}
                        </div>

                        {/* AÇÃO PRINCIPAL 1: Anexar ao disparador */}
                        <button
                          disabled={extratoGenerating}
                          onClick={() => handleAttachExtratoToComposer(client)}
                          className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-mx-ink hover:bg-mx-ink-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                            <Send className="w-4 h-4" />
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="truncate">Anexar ao Disparador e Redigir</div>
                            <div className="text-[10px] text-white/70 font-normal">Prepara o extrato PNG e mensagem no compositor</div>
                          </div>
                        </button>

                        {/* AÇÃO PRINCIPAL 2: Disparo direto WhatsApp Conectado */}
                        <button
                          disabled={extratoGenerating || extratoSendingDirect || !isConnected}
                          onClick={() => handleDirectSendExtrato(client)}
                          className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            {extratoSendingDirect ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="truncate">Disparar Agora via WhatsApp Conectado</div>
                            <div className="text-[10px] text-white/80 font-normal">
                              {isConnected ? `Envia imediatamente para ${client.telefone}` : 'Instância desconectada'}
                            </div>
                          </div>
                        </button>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          {/* Baixar PNG */}
                          <button
                            disabled={extratoGenerating}
                            onClick={() => handleDownloadExtrato(client.id, client.nome)}
                            className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Download className="w-4 h-4 text-stone-500 shrink-0" />
                            <span className="truncate">Baixar PNG</span>
                          </button>

                          {/* Copiar Imagem */}
                          <button
                            disabled={extratoGenerating}
                            onClick={() => handleCopyExtratoImage(client.id)}
                            className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Clipboard className="w-4 h-4 text-stone-500 shrink-0" />
                            <span className="truncate">Copiar Imagem</span>
                          </button>

                          {/* Copiar Texto */}
                          <button
                            onClick={() => handleCopyExtratoText(client.id)}
                            className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-stone-500 shrink-0" />
                            <span className="truncate">Copiar Texto</span>
                          </button>

                          {/* WhatsApp Web Fallback */}
                          <button
                            onClick={() => handleSendWAWebExtrato(client.id)}
                            className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-emerald-50 text-emerald-800 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate">WhatsApp Web</span>
                          </button>
                        </div>

                        {/* Botão de atualizar / re-renderizar prévia */}
                        <button
                          type="button"
                          disabled={extratoGenerating}
                          onClick={() => handleGenerateExtratoPreview(client.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 text-stone-500 hover:text-stone-800 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${extratoGenerating ? 'animate-spin' : ''}`} />
                          Atualizar renderização da imagem
                        </button>
                      </div>

                      {/* Coluna da Direita: Prévia Visual */}
                      <div className="bg-stone-100/70 rounded-2xl border border-stone-200 p-4 flex flex-col items-center justify-center min-h-[360px]">
                        {extratoGenerating ? (
                          <div className="flex flex-col items-center justify-center py-10 space-y-3">
                            <div className="w-12 h-12 border-4 border-stone-200 border-t-mx-ink rounded-full animate-spin"></div>
                            <p className="text-xs font-bold text-stone-600">Renderizando Extrato em Alta Resolução...</p>
                          </div>
                        ) : extratoPreviewImage ? (
                          <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-200">
                            <div className="bg-white p-1 rounded-xl shadow-md border border-stone-200 w-full max-w-[340px] overflow-hidden">
                              <img
                                src={extratoPreviewImage}
                                alt={`Extrato de Débitos - ${client.nome}`}
                                className="w-full h-auto object-contain rounded-lg"
                              />
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-[11px] text-stone-500 font-medium">Prévia gerada em 2x (PNG)</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-10 space-y-3">
                            <div className="w-14 h-14 bg-stone-200 rounded-2xl flex items-center justify-center mx-auto text-stone-400">
                              <ImageIcon className="w-7 h-7" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-stone-700">Prévia ainda não carregada</p>
                              <p className="text-[11px] text-stone-400 max-w-xs mx-auto mt-0.5">
                                Clique abaixo para renderizar o extrato visual em imagem
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleGenerateExtratoPreview(client.id)}
                              className="px-4 py-2 rounded-xl bg-mx-ink text-white font-bold text-xs hover:bg-mx-ink-700 transition-colors cursor-pointer shadow-xs"
                            >
                              Renderizar Prévia Agora
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Hidden offscreen container for html-to-image capture */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none opacity-0 select-none" aria-hidden="true">
        {extratoSelectedClientId && (() => {
          const client = clients.find(c => c.id === extratoSelectedClientId);
          if (!client) return null;
          return renderInvoiceCard(`extrato-invoice-capture-${client.id}`, client);
        })()}

        {selectedClientIds.map(clientId => {
          if (clientId === extratoSelectedClientId) return null;
          const client = clients.find(c => c.id === clientId);
          if (!client) return null;
          return renderInvoiceCard(`extrato-invoice-capture-${client.id}`, client);
        })}

        {clients
          .filter(c => clientHasOverdueDebts(c.id) && c.id !== extratoSelectedClientId && !selectedClientIds.includes(c.id))
          .slice(0, 50)
          .map(client => renderInvoiceCard(`extrato-invoice-capture-${client.id}`, client))
        }
      </div>
    </div>
  );
}
