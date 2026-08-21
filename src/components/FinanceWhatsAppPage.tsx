import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare, QrCode, LogOut, CheckCircle, AlertTriangle, RefreshCw,
  Smartphone, Send, Paperclip, Search, X, FileText, Image as ImageIcon,
  Users, WifiOff, ChevronRight, Clock, LayoutTemplate, Eye,
  UserCheck, UserX, ChevronDown, Settings, ShieldAlert, Plus, Trash2, Save,
  List, Filter, Anchor, Maximize2, CheckSquare, Square, FolderPlus, Bookmark, Layers
} from 'lucide-react';
import { clientDB, boatDB } from '../db';
import type { Cliente, Embarcacao } from '../types';

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
Equipe Financeira — Villa Nautica 🚢`,
  },
  {
    id: 'lembrete_5',
    label: 'Lembrete 5 dias',
    icon: '⏰',
    color: 'amber',
    description: 'Urgência moderada, sugere anexo de boleto',
    text: `Olá {nome}!

O vencimento da sua cota está se aproximando — *faltam apenas 5 dias*.

Caso ainda não tenha realizado o pagamento, solicitamos que regularize sua situação o quanto antes para evitar multas e juros.

Seguindo em anexo o boleto para sua conveniência.

Atenciosamente,
Equipe Financeira — Villa Nautica 🚢`,
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
Equipe Financeira — Villa Nautica 🚢`,
  },
  {
    id: 'inadimplente',
    label: 'Aviso de Débito',
    icon: '⚠️',
    color: 'rose',
    description: 'Cobrança para clientes inadimplentes',
    text: `Olá {nome},

Identificamos que existe um *débito em aberto* em seu cadastro referente à sua cota na Villa Nautica.

Pedimos que entre em contato conosco o quanto antes para regularizar sua situação e evitar a suspensão dos serviços.

Atenciosamente,
Equipe Financeira — Villa Nautica 🚢`,
  },
  {
    id: 'confirmacao',
    label: 'Pagamento Recebido',
    icon: '✅',
    color: 'teal',
    description: 'Confirmação de pagamento ao cliente',
    text: `Olá {nome}!

Informamos que o pagamento referente à sua cota foi *recebido com sucesso*. ✅

Agradecemos pela pontualidade! Qualquer dúvida, estamos à disposição.

Atenciosamente,
Equipe Financeira — Villa Nautica 🚢`,
  },
] as const;

export default function FinanceWhatsAppPage() {
  // Connection state
  const [instanceName, setInstanceName] = useState<string | null>(() => localStorage.getItem('finance_whatsapp_instance'));
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
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
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
    localStorage.setItem('finance_whatsapp_instance', inst);
    setInstanceName(inst);
    // sync in DB
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      fetch('/api/config', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, 
        body: JSON.stringify({ configs: { finance_whatsapp_instance: inst } }) 
      }).catch(console.warn);
    }
    showToast(`Instância ${inst} vinculada!`);
  };
  // Debug State
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugReport, setDebugReport] = useState<any>(null);
  const [isRunningDebug, setIsRunningDebug] = useState(false);

  const handleRunDebug = async () => {
    setIsRunningDebug(true);
    try {
      const inst = instanceName || 'financeiro_199998';
      const token = localStorage.getItem('admin_token');
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

  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showBoatDropdown, setShowBoatDropdown] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const boatDropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (boatDropdownRef.current && !boatDropdownRef.current.contains(e.target as Node)) {
        setShowBoatDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Connection logic
  const fetchWaStatus = async (instance: string) => {
    setIsFetchingWaStatus(true);
    try {
      const res = await fetch(`/api/whatsapp/status?instance=${instance}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      
      const state = data?.instance?.state || 'close';
      
      if (state === 'not_created') {
        setInstanceName(null);
        localStorage.removeItem('finance_whatsapp_instance');
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
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
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
    if (instanceName) fetchWaStatus(instanceName);
    else setWaStatus('not_created');
  }, [instanceName]);

  useEffect(() => { 
    setClients(clientDB.getAll()); 
    
    const adminToken = localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    
    fetch('/api/config?chaves=finance_whatsapp_instance,finance_whatsapp_custom_lists,finance_whatsapp_custom_templates', { headers })
      .then(res => res.json())
      .then(data => {
        const configs = data.configs || {};
        
        const serverInstance = configs.finance_whatsapp_instance;
        if (serverInstance !== undefined && serverInstance !== null) {
          localStorage.setItem('finance_whatsapp_instance', serverInstance);
          setInstanceName(serverInstance || null);
        }
        
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
        // Do nothing on failure, let it default to localStorage
      });
  }, []);

  const handleCreateInstance = async () => {
    setIsCreating(true);
    const newInstance = `financeiro_${Math.floor(Math.random() * 1_000_000)}`;
    try {
      const res = await fetch('/api/whatsapp/instance/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({ instanceName: newInstance }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      if (!res.ok) throw new Error(data.message || data.error || text || 'Erro ao criar instância');
      localStorage.setItem('finance_whatsapp_instance', newInstance);
      setInstanceName(newInstance);
      // Persist to centralized database
      const adminToken = localStorage.getItem('admin_token');
      const hdr: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) hdr['Authorization'] = `Bearer ${adminToken}`;
      fetch('/api/config', { method: 'POST', headers: hdr, body: JSON.stringify({ configs: { finance_whatsapp_instance: newInstance } }) }).catch(console.warn);
      showToast('Instância criada! Escaneie o QR Code.');
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar instância', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleWaLogout = async () => {
    if (!instanceName) return;
    if (!window.confirm('Desconectar e excluir esta instância do servidor?')) return;
    try {
      await fetch(`/api/whatsapp/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      });
    } catch (_) {}
    localStorage.removeItem('finance_whatsapp_instance');
    setInstanceName(null);
    // Clear in centralized database
    const adminToken = localStorage.getItem('admin_token');
    const hdr: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) hdr['Authorization'] = `Bearer ${adminToken}`;
    fetch('/api/config', { method: 'POST', headers: hdr, body: JSON.stringify({ configs: { finance_whatsapp_instance: '' } }) }).catch(console.warn);
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

      if (clientFilter === 'inadimplentes' && c.statusFinanceiro !== 'inadimplente') return false;
      if (clientFilter === 'em_dia' && c.statusFinanceiro === 'inadimplente') return false;
      return true;
    });
  }, [clients, searchQuery, clientFilter, selectedBoatId, boats]);

  const inadimplentesCount = useMemo(() => clients.filter(c => c.telefone && c.statusFinanceiro === 'inadimplente').length, [clients]);
  const emDiaCount = useMemo(() => clients.filter(c => c.telefone && c.statusFinanceiro !== 'inadimplente').length, [clients]);

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
    const adminToken = localStorage.getItem('admin_token');
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
    const adminToken = localStorage.getItem('admin_token');
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
    const adminToken = localStorage.getItem('admin_token');
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
    const adminToken2 = localStorage.getItem('admin_token');
    const hdr2: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken2) hdr2['Authorization'] = `Bearer ${adminToken2}`;
    fetch('/api/config', { method: 'POST', headers: hdr2, body: JSON.stringify({ configs: { finance_whatsapp_custom_templates: updated } }) }).catch(console.warn);
    if (activeTemplateId === id) {
      setActiveTemplateId(null);
      setMessageText('');
    }
    showToast('Modelo excluído.');
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

  const getPersonalizedMessage = (text: string, client: Cliente) => {
    const firstName = client.nome.split(' ')[0];
    const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long' });
    const capitalizedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
    const currentDate = new Date().toLocaleDateString('pt-BR');

    return text
      .replace(/{nome}/g, firstName)
      .replace(/{mes}/g, capitalizedMonth)
      .replace(/{data}/g, currentDate);
  };

  const handleMassSend = async () => {
    setShowConfirmModal(false);
    setSendingStatus('sending');
    const log: SendLogEntry[] = [];
    let successes = 0, failures = 0;

    for (let i = 0; i < selectedClientIds.length; i++) {
      const client = clients.find(c => c.id === selectedClientIds[i]);
      if (!client?.telefone) { failures++; log.push({ clientName: client?.nome || '?', phone: '-', status: 'error', timestamp: new Date().toLocaleTimeString() }); continue; }

      setProgress({ current: i + 1, total: selectedClientIds.length, successes, failures });
      const personalizedText = getPersonalizedMessage(messageText, client);

      try {
        const res = await fetch('/api/whatsapp/finance/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
          body: JSON.stringify({
            instanceName, number: client.telefone, text: personalizedText,
            media: attachment?.base64, mimetype: attachment?.file.type, fileName: attachment?.file.name,
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
    return id ? clients.find(c => c.id === id) : null;
  }, [selectedClientIds, clients]);

  const previewText = useMemo(() => {
    if (!previewClient) return messageText;
    return getPersonalizedMessage(messageText, previewClient);
  }, [messageText, previewClient]);

  // Status badge helper
  const StatusButton = () => {
    if (!instanceName || waStatus === 'not_created') {
      return (
        <button
          onClick={() => setShowConnectionModal(true)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl transition-all border border-slate-200 shadow-2xs cursor-pointer"
        >
          <WifiOff className="w-4 h-4 text-slate-400" /> WhatsApp Desconectado
        </button>
      );
    }
    if (waStatus === 'open') {
      return (
        <button
          onClick={() => setShowConnectionModal(true)}
          className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 px-3.5 py-2 rounded-xl border border-emerald-200 transition-all shadow-2xs cursor-pointer"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          WhatsApp Conectado
        </button>
      );
    }
    return (
      <button
        onClick={() => setShowConnectionModal(true)}
        className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100/70 px-3.5 py-2 rounded-xl border border-amber-200 transition-all shadow-2xs cursor-pointer"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
        WhatsApp Aguardando
      </button>
    );
  };

  const filterLabel: Record<ClientFilter, string> = { todos: 'Todos', inadimplentes: 'Inadimplentes', em_dia: 'Em dia' };
  const filterIcon: Record<ClientFilter, React.ReactNode> = {
    todos: <Users className="w-3.5 h-3.5" />,
    inadimplentes: <UserX className="w-3.5 h-3.5 text-rose-500" />,
    em_dia: <UserCheck className="w-3.5 h-3.5 text-emerald-500" />,
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-xl border text-sm font-semibold flex items-center gap-2.5 z-[100] ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-slate-500" /> Configuração do WhatsApp Financeiro
              </h3>
              <button onClick={() => setShowConnectionModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8">
              {(!instanceName || waStatus === 'not_created') ? (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Smartphone className="w-10 h-10 text-slate-300" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhuma sessão ativa</h2>
                  <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
                    Crie uma instância dedicada no servidor ou busque uma existente para vincular este painel.
                  </p>
                  
                  <div className="flex flex-col gap-4 max-w-sm mx-auto">
                    <button onClick={handleCreateInstance} disabled={isCreating}
                      className="inline-flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg cursor-pointer">
                      {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                      {isCreating ? 'Criando instância...' : 'Criar Nova Sessão'}
                    </button>
                    
                    {!serverInstances.length ? (
                      <button onClick={handleFetchInstances} disabled={isFetchingInstances}
                        className="inline-flex justify-center items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 px-8 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer">
                        <RefreshCw className={`w-4 h-4 ${isFetchingInstances ? 'animate-spin' : ''}`} />
                        Buscar Sessões Existentes
                      </button>
                    ) : (
                      <div className="mt-4 p-4 border border-slate-200 rounded-2xl bg-slate-50 text-left">
                        <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase">Sessões Disponíveis</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {serverInstances.map((inst, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                              <div>
                                <div className="text-sm font-bold text-slate-800">{inst.name || inst.instance?.instanceName}</div>
                                <div className={`text-[10px] font-bold ${(inst.connectionStatus || inst.instance?.status) === 'open' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  STATUS: {(inst.connectionStatus || inst.instance?.status || 'desconhecido').toUpperCase()}
                                </div>
                              </div>
                              <button onClick={() => handleReconnectInstance(inst.name || inst.instance?.instanceName)}
                                className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer">
                                Vincular
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : isFetchingWaStatus ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Verificando status de conexão...</p>
                </div>
              ) : waStatus === 'open' ? (
                <div className="text-center py-6">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-100">
                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Conectado com Sucesso!</h2>
                  <p className="text-slate-500 text-sm mb-4">Seu WhatsApp financeiro está ativo e pronto para uso.</p>
                  <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mb-8">
                    <span className="text-xs text-slate-400 font-medium">Instância:</span>
                    <code className="text-sm font-bold text-slate-700">{instanceName}</code>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => fetchWaStatus(instanceName!)}
                      className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer">
                      <RefreshCw className="w-4 h-4" /> Atualizar
                    </button>
                    <button onClick={handleWaLogout}
                      className="inline-flex items-center gap-2 border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-600 px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer">
                      <LogOut className="w-4 h-4" /> Desconectar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row items-center gap-10">
                  <div className="shrink-0">
                    {waQrCode ? (
                      <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-100 flex flex-col items-center gap-2">
                        <img 
                          src={waQrCode.startsWith('data:') ? waQrCode : `data:image/png;base64,${waQrCode}`} 
                          alt="QR Code WhatsApp" 
                          className="w-60 h-60 object-contain" 
                        />
                        <button 
                          onClick={() => fetchWaQrCode(instanceName!)} 
                          className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Atualizar QR Code
                        </button>
                      </div>
                    ) : (
                      <div className="w-60 h-60 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-4 text-center">
                        <QrCode className="w-12 h-12 text-slate-300" />
                        <span className="text-xs text-slate-500 font-medium">
                          {isFetchingWaStatus ? 'Buscando status...' : 'Obtendo QR Code...'}
                        </span>
                        <button 
                          onClick={() => { fetchWaStatus(instanceName!); fetchWaQrCode(instanceName!); }} 
                          className="mt-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Gerar / Buscar QR
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex items-center gap-2 mb-4 justify-center lg:justify-start">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </span>
                      <span className="text-amber-600 font-bold text-sm">Aguardando conexão ({instanceName})</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-3">Escaneie o QR Code</h2>
                    <ol className="space-y-3 text-sm text-slate-600 mb-8 text-left">
                      {['Abra o WhatsApp no seu celular.', 'Toque em "Mais opções" (⋮) ou "Aparelhos conectados".', 'Aponte a câmera para o QR Code ao lado.'].map((s, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                    <div className="flex gap-2 justify-center lg:justify-start">
                      <button onClick={() => fetchWaStatus(instanceName!)} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer">
                        <RefreshCw className="w-4 h-4" /> Já conectei, atualizar
                      </button>
                      <button onClick={handleWaLogout} className="inline-flex items-center gap-2 border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Botão e Painel de Diagnóstico Debug */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diagnóstico Técnico</span>
                  </div>
                  <button
                    onClick={handleRunDebug}
                    disabled={isRunningDebug}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningDebug ? 'animate-spin' : ''}`} />
                    {isRunningDebug ? 'Testando...' : '🔍 Executar Debug & Testar Conexão'}
                  </button>
                </div>

                {showDebugPanel && debugReport && (
                  <div className="mt-4 p-4 bg-slate-950 text-emerald-400 font-mono rounded-2xl text-xs space-y-3 border border-slate-800 shadow-inner">
                    <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                      <span className="font-bold text-white">📑 Relatório do Servidor ({debugReport.timestamp?.split('T')[1]?.split('.')[0]})</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(debugReport, null, 2));
                          showToast('Logs de debug copiados!');
                        }}
                        className="text-[10px] text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded cursor-pointer"
                      >
                        Copiar JSON
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><strong>URL API:</strong> {debugReport.env?.EVOLUTION_API_URL}</div>
                      <div><strong>Instância Alvo:</strong> {debugReport.env?.targetInstance}</div>
                      <div><strong>Key Presente:</strong> {debugReport.env?.EVOLUTION_API_KEY ? 'SIM' : 'NÃO'}</div>
                      <div><strong>Instâncias no Servidor:</strong> {debugReport.tests?.fetchInstances?.instancesCount ?? 0}</div>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px] overflow-x-auto">
                      <div className="text-slate-300 font-bold">Resumo dos Testes HTTP:</div>
                      <div>• Status Instance: <span className={debugReport.tests?.connectionState?.ok ? 'text-emerald-400' : 'text-amber-400'}>{JSON.stringify(debugReport.tests?.connectionState?.data?.instance || debugReport.tests?.connectionState?.error || debugReport.tests?.connectionState?.status)}</span></div>
                      <div>• Connect QR Endpoint: <span className={debugReport.tests?.connect?.hasBase64 ? 'text-emerald-400' : 'text-amber-400'}>{debugReport.tests?.connect?.hasBase64 ? 'Base64 Presente ✓' : JSON.stringify(debugReport.tests?.connect?.dataSummary || debugReport.tests?.connect?.status)}</span></div>
                      <div>• Instâncias Ativas: <span className="text-blue-300">{JSON.stringify(debugReport.tests?.fetchInstances?.instances)}</span></div>
                    </div>

                    <details className="text-[10px] text-slate-400 cursor-pointer">
                      <summary className="hover:text-slate-200 font-semibold">Ver JSON Completo de Diagnóstico</summary>
                      <pre className="mt-2 p-2 bg-black/60 rounded max-h-48 overflow-y-auto text-emerald-300 text-[10px]">
                        {JSON.stringify(debugReport, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-100">
              <Send className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center mb-2">Confirmar Envio em Lote</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Você está prestes a enviar uma mensagem para{' '}
              <strong className="text-slate-900 font-bold">{selectedClientIds.length} clientes</strong>.
              Haverá um intervalo de ~2 segundos entre cada envio.
            </p>
            {attachment && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 flex items-center gap-3">
                {attachment.file.type.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-emerald-600" /> : <FileText className="w-5 h-5 text-rose-500" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">{attachment.file.name}</p>
                  <p className="text-[10px] text-slate-400">{(attachment.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleMassSend}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md cursor-pointer">
                Confirmar e Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Preview Drawer Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-400" /> Pré-visualização da Mensagem
              </h3>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-[#e5ddd5] rounded-2xl p-4 max-h-[400px] overflow-y-auto subtle-scrollbar">
                <div className="max-w-[85%] ml-auto">
                  <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                    <p className="text-[13px] text-slate-800 whitespace-pre-line leading-relaxed">{previewText || 'Sua mensagem aparecerá aqui...'}</p>
                    {attachment && (
                      <div className="mt-2 pt-2 border-t border-emerald-200/50 flex items-center gap-2">
                        {attachment.file.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4 text-rose-600" />}
                        <span className="text-[11px] text-emerald-800 font-medium truncate">{attachment.file.name}</span>
                      </div>
                    )}
                    <p className="text-[10px] text-emerald-700/60 text-right mt-1">agora ✓✓</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">
                {previewClient ? `Visualizando como ${previewClient.nome.split(' ')[0]} receberia` : 'Selecione um cliente para ver personalizado'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-xs">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              WhatsApp Financeiro
            </h1>
            <p className="text-xs text-slate-500 mt-1 ml-[46px]">Envio de faturas e comunicados de cobrança em lote</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusButton />
            <button
              onClick={() => setShowConnectionModal(true)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl transition-all border border-slate-200 shadow-2xs flex items-center gap-2 text-xs font-bold cursor-pointer"
              title="Configurações do WhatsApp Financeiro"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Configurações</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Composer Page */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Connection warning banner if not connected */}
        {!isConnected && (
          <div className="absolute inset-x-0 top-[85px] z-40 bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between text-sm text-amber-800 shadow-sm animate-in slide-in-from-top-4">
            <span className="flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              WhatsApp desconectado. Ative a conexão para poder disparar as mensagens.
            </span>
            <button
              onClick={() => setShowConnectionModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Configurar WhatsApp
            </button>
          </div>
        )}

        {/* Left panel: client list & quick actions */}
        <div className={`w-[360px] shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all ${!isConnected ? 'pt-12' : ''}`}>
          <div className="p-4 border-b border-slate-100 space-y-3">
            
            {/* Header / Counter & Expanded Selection Button */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-slate-400" /> Destinatários
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full">
                  {selectedClientIds.length}
                </span>
                <button
                  onClick={() => setShowAdvancedSelectorModal(true)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Abrir Modal de Seleção Ampliada"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Ampliar</span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por nome, fone ou barco (ex: M58)..."
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                disabled={sendingStatus !== 'idle'}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & Lists Bar */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              {/* Status Filter */}
              <div className="relative" ref={filterDropdownRef}>
                <button 
                  onClick={() => setShowFilterDropdown(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    clientFilter !== 'todos' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {filterIcon[clientFilter]}
                  {filterLabel[clientFilter]}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showFilterDropdown && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 w-52 py-1.5 overflow-hidden">
                    {([
                      { key: 'todos' as ClientFilter, label: 'Todos os Clientes', count: clients.filter(c => c.telefone).length, icon: <Users className="w-4 h-4 text-slate-400" /> },
                      { key: 'inadimplentes' as ClientFilter, label: 'Inadimplentes', count: inadimplentesCount, icon: <UserX className="w-4 h-4 text-rose-500" /> },
                      { key: 'em_dia' as ClientFilter, label: 'Em Dia', count: emDiaCount, icon: <UserCheck className="w-4 h-4 text-emerald-500" /> },
                    ]).map(opt => (
                      <button 
                        key={opt.key}
                        onClick={() => { setClientFilter(opt.key); setShowFilterDropdown(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-xs transition-colors cursor-pointer ${
                          clientFilter === opt.key ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.icon}
                        <span className="flex-1 text-left">{opt.label}</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{opt.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Boat Selector Dropdown */}
              <div className="relative" ref={boatDropdownRef}>
                <button 
                  onClick={() => setShowBoatDropdown(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    selectedBoatId !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Anchor className="w-3.5 h-3.5 text-indigo-500" />
                  {selectedBoatId === 'all' ? 'Todas Embarcações' : getBoatName(selectedBoatId) || 'Barco'}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showBoatDropdown && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 w-60 py-1.5 overflow-hidden max-h-60 overflow-y-auto subtle-scrollbar">
                    <button 
                      onClick={() => { setSelectedBoatId('all'); setShowBoatDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${
                        selectedBoatId === 'all' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Todas as Embarcações
                    </button>
                    {boats.map(b => (
                      <button 
                        key={b.id}
                        onClick={() => { setSelectedBoatId(b.id); setShowBoatDropdown(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer ${
                          selectedBoatId === b.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{b.nome}</span>
                        <span className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-500">M{b.numero}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selection Quick Bar (Batch actions & Custom Lists) */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllFiltered}
                  disabled={sendingStatus !== 'idle' || filteredClients.length === 0}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-40 cursor-pointer"
                >
                  Marcar Visíveis ({filteredClients.length})
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={clearAllSelected}
                  disabled={sendingStatus !== 'idle' || selectedClientIds.length === 0}
                  className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 disabled:opacity-40 cursor-pointer"
                >
                  Desmarcar
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSaveListModal(true)}
                  disabled={selectedClientIds.length === 0}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors disabled:opacity-40 cursor-pointer"
                  title="Salvar Seleção Atual como Lista Personalizada"
                >
                  <FolderPlus className="w-3 h-3" /> Salvar Lista
                </button>
                <button
                  onClick={() => setShowManageListsModal(true)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Gerenciar Listas Salvas"
                >
                  <Bookmark className="w-3 h-3 text-indigo-500" /> Listas ({customLists.length})
                </button>
              </div>
            </div>
          </div>

          {/* Client List */}
          <div className="flex-1 overflow-y-auto subtle-scrollbar">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Nenhum cliente encontrado com os filtros atuais.</p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filteredClients.map(client => {
                  const isSelected = selectedClientIds.includes(client.id);
                  const isInadimplente = client.statusFinanceiro === 'inadimplente';
                  const boatName = getBoatName(client.embarcacaoId);
                  return (
                    <label key={client.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all select-none ${
                        isSelected ? 'bg-emerald-50 border border-emerald-100' : 'border border-transparent hover:bg-slate-50'
                      }`}>
                      <input type="checkbox" checked={isSelected}
                        onChange={() => toggleClient(client.id)} disabled={sendingStatus !== 'idle'}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 shrink-0 cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 truncate">{client.nome}</p>
                          {isInadimplente && (
                            <span className="text-[9px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.2 rounded-md shrink-0">DEVEDOR</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] text-slate-400 truncate">{client.telefone}</p>
                          {boatName && <span className="text-[10px] text-indigo-600 font-medium truncate">• {boatName}</span>}
                        </div>
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{filteredClients.length} filtrados</span>
              <span className="font-semibold text-emerald-600">{selectedClientIds.length} selecionados</span>
            </div>
          </div>
        </div>

        {/* Right panel: Composer & Sending */}
        <div className={`flex-1 flex flex-col bg-white overflow-hidden ${!isConnected ? 'pt-12' : ''}`}>
          
          {/* Sending Progress view if active */}
          {sendingStatus !== 'idle' && (
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {sendingStatus === 'sending' ? (
                    <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  )}
                  <h3 className="font-bold text-slate-900 text-sm">
                    {sendingStatus === 'sending' ? 'Disparando Mensagens em Lote...' : 'Envio Concluído!'}
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {progress.current} / {progress.total} ({Math.round((progress.current / (progress.total || 1)) * 100)}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-4">
                <div className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }} />
              </div>

              <div className="flex items-center justify-between text-xs mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-emerald-600 font-bold">{progress.successes} enviados com sucesso</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-rose-500 font-bold">{progress.failures} falhas</span>
                </div>
              </div>

              {/* Send log table */}
              {sendLog.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl mb-4 max-h-48 overflow-y-auto subtle-scrollbar shadow-2xs">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Cliente</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Telefone</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Hora</th>
                        <th className="text-center px-3 py-2 font-semibold text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sendLog.map((entry, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-700 font-medium truncate max-w-[120px]">{entry.clientName}</td>
                          <td className="px-3 py-2 text-slate-500 font-mono">{entry.phone}</td>
                          <td className="px-3 py-2 text-slate-400">{entry.timestamp}</td>
                          <td className="px-3 py-2 text-center">
                            {entry.status === 'success'
                              ? <span className="text-emerald-600 font-bold">✓ Sucesso</span>
                              : <span className="text-rose-500 font-bold">✗ Falha</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sendingStatus === 'completed' && (
                <button onClick={resetSender}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer">
                  Iniciar Novo Disparo
                </button>
              )}
            </div>
          )}

          {/* Template selector */}
          <div className="px-6 pt-4 bg-white border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5" /> Modelos de Mensagem
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pb-3 max-h-[150px] overflow-y-auto subtle-scrollbar pr-1">
              {allTemplates.map(tpl => {
                const colorMap: Record<string, string> = {
                  blue: 'border-blue-200 hover:bg-blue-50 text-blue-700',
                  amber: 'border-amber-200 hover:bg-amber-50 text-amber-700',
                  emerald: 'border-emerald-200 hover:bg-emerald-50 text-emerald-700',
                  rose: 'border-rose-200 hover:bg-rose-50 text-rose-700',
                  teal: 'border-teal-200 hover:bg-teal-50 text-teal-700',
                  slate: 'border-slate-200 hover:bg-slate-50 text-slate-700',
                };
                const isActive = activeTemplateId === tpl.id;
                return (
                  <div key={tpl.id} className="relative group">
                    <button onClick={() => handleTemplateClick(tpl)}
                      className={`flex flex-col items-start px-3.5 py-2 rounded-xl border text-left transition-all min-w-[140px] pr-7 cursor-pointer ${
                        isActive ? 'bg-slate-900 border-slate-900 text-white shadow-xs' : `bg-white ${colorMap[tpl.color] || 'border-slate-200 text-slate-700'}`
                      }`}>
                      <span className="flex items-center gap-1.5 text-xs font-bold">
                        <span>{tpl.icon}</span> {tpl.label}
                      </span>
                      <span className={`text-[10px] mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>{tpl.description}</span>
                    </button>
                    {(tpl as any).isCustom && (
                      <button
                        onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                        className="absolute right-2 top-2 p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
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

          {/* Compose area */}
          <div className="flex-1 p-6 overflow-auto flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
                <LayoutTemplate className="w-3.5 h-3.5 shrink-0" />
                <span>Variáveis automáticas:</span>
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[10px]" title="Primeiro nome do cliente">{'{nome}'}</code>
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[10px]" title="Mês atual por extenso">{'{mes}'}</code>
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[10px]" title="Data atual">{'{data}'}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{messageText.length} caracteres</span>
                <button
                  onClick={() => setShowSaveTemplateModal(true)}
                  disabled={!messageText.trim()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Salvar Modelo
                </button>
                <button onClick={() => setShowPreview(true)} disabled={!messageText.trim()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                  <Eye className="w-3.5 h-3.5" /> Prévia
                </button>
              </div>
            </div>

            {/* Textarea */}
            <textarea 
              value={messageText} 
              onChange={e => { setMessageText(e.target.value); setActiveTemplateId(null); }}
              placeholder={`Selecione um modelo acima ou escreva sua mensagem personalizada...\n\nDica: {nome}, {mes} e {data} serão substituídos automaticamente para cada destinatário.`}
              className="w-full flex-1 min-h-[160px] resize-none border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 subtle-scrollbar leading-relaxed" 
            />

            {/* Attachment Box (Image or PDF) */}
            <input type="file" ref={fileInputRef} accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
            <div 
              className={`border-2 border-dashed rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all group ${
                attachment ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
              }`} 
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                attachment ? 'bg-emerald-100' : 'bg-slate-100 group-hover:bg-emerald-100'
              }`}>
                {attachment ? (
                  attachment.file.type.startsWith('image/') ? (
                    <ImageIcon className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <FileText className="w-6 h-6 text-rose-500" />
                  )
                ) : (
                  <Paperclip className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {attachment ? (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-emerald-800 truncate">{attachment.file.name}</p>
                      <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        attachment.file.type.startsWith('image/') ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {attachment.file.type.startsWith('image/') ? 'Imagem' : 'Documento PDF'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 mt-0.5">{(attachment.file.size / 1024).toFixed(0)} KB — clique para alterar arquivo</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">
                      Anexar Imagem ou Documento PDF
                    </p>
                    <p className="text-xs text-slate-400">PDF (.pdf) ou Imagens (JPG, PNG, WEBP) — até 15 MB</p>
                  </>
                )}
              </div>
              {attachment && (
                <button 
                  onClick={e => { e.stopPropagation(); setAttachment(null); }} 
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remover anexo"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Intervalo seguro de ~2s entre cada envio
            </div>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!isConnected || selectedClientIds.length === 0 || (!messageText.trim() && !attachment)}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer ${
                isConnected && selectedClientIds.length > 0 && (messageText.trim() || attachment)
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md hover:scale-[1.01]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              Disparar para {selectedClientIds.length} {selectedClientIds.length === 1 ? 'cliente' : 'clientes'}
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Selector Modal (Modal de Seleção Ampliada) */}
      {showAdvancedSelectorModal && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Seleção Ampliada de Destinatários</h3>
                  <p className="text-xs text-slate-500">Marque múltiplos clientes por busca, embarcação ou status sem precisar rolar listas extensas.</p>
                </div>
              </div>
              <button onClick={() => setShowAdvancedSelectorModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filter toolbar in Modal */}
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar por nome do cliente, telefone ou código da embarcação (ex: M58)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={selectedBoatId}
                  onChange={e => setSelectedBoatId(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="all">Todas as Embarcações ({boats.length})</option>
                  {boats.map(b => (
                    <option key={b.id} value={b.id}>{b.nome} (M{b.numero})</option>
                  ))}
                </select>

                <select
                  value={clientFilter}
                  onChange={e => setClientFilter(e.target.value as ClientFilter)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="todos">Todos os Status ({clients.filter(c => c.telefone).length})</option>
                  <option value="inadimplentes">Inadimplentes ({inadimplentesCount})</option>
                  <option value="em_dia">Em Dia ({emDiaCount})</option>
                </select>
              </div>

              {/* Quick Batch Actions */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllFiltered}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Marcar Todos os {filteredClients.length} Filtrados
                  </button>
                  <button
                    onClick={deselectAllFiltered}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Desmarcar Filtrados
                  </button>
                </div>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  {selectedClientIds.length} Clientes Selecionados
                </span>
              </div>
            </div>

            {/* Grid of clients */}
            <div className="flex-1 overflow-y-auto p-4 subtle-scrollbar">
              {filteredClients.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-500">Nenhum cliente encontrado para esses filtros.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredClients.map(client => {
                    const isSelected = selectedClientIds.includes(client.id);
                    const isInadimplente = client.statusFinanceiro === 'inadimplente';
                    const boatName = getBoatName(client.embarcacaoId);
                    return (
                      <div
                        key={client.id}
                        onClick={() => toggleClient(client.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all select-none flex items-start gap-3 ${
                          isSelected ? 'bg-emerald-50/80 border-emerald-300 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 shrink-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{client.nome}</h4>
                            {isInadimplente && (
                              <span className="text-[9px] font-extrabold bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded">DEVEDOR</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{client.telefone}</p>
                          {boatName && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                              {boatName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Exibindo {filteredClients.length} de {clients.filter(c => c.telefone).length} clientes cadastrados</span>
              <button
                onClick={() => setShowAdvancedSelectorModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Concluir Seleção ({selectedClientIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Custom List Modal */}
      {showSaveListModal && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <FolderPlus className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center mb-1">Salvar Seleção como Lista</h3>
            <p className="text-xs text-slate-500 text-center mb-5">
              Crie uma lista reutilizável com os <strong className="text-emerald-700 font-bold">{selectedClientIds.length} clientes</strong> atualmente selecionados.
            </p>
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Nome da Lista</label>
                <input
                  type="text"
                  placeholder="Ex: Lista A - Vencimento Dia 10"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSaveListModal(false); setNewListName(''); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveList}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Salvar Lista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Custom Lists Modal */}
      {showManageListsModal && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-500" /> Minhas Listas Salvas
              </h3>
              <button onClick={() => setShowManageListsModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {customLists.length === 0 ? (
              <div className="text-center py-8">
                <Bookmark className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Nenhuma lista salva ainda.</p>
                <p className="text-[11px] text-slate-400 mt-1">Selecione alguns clientes na tela principal e clique em "Salvar Lista".</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto subtle-scrollbar pr-1 mb-6">
                {customLists.map(list => (
                  <div
                    key={list.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-indigo-200 transition-all"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{list.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {list.clientIds.length} clientes • Criada em {list.createdAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { handleLoadList(list); setShowManageListsModal(false); }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                      >
                        Carregar
                      </button>
                      <button
                        onClick={(e) => handleDeleteList(list.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir lista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-right">
              <button
                onClick={() => setShowManageListsModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-100">
              <Save className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center mb-2">Salvar Modelo</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Dê um nome para identificar este modelo na sua lista de mensagens prontas.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Nome do Modelo</label>
                <input
                  type="text"
                  placeholder="Ex: Cobrança Atrasada Julho"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSaveTemplateModal(false); setNewTemplateName(''); }}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTemplate}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                Salvar Modelo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
