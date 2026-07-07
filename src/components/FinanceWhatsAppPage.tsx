import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare, QrCode, LogOut, CheckCircle, AlertTriangle, RefreshCw,
  Smartphone, Send, Paperclip, Search, X, FileText, Image as ImageIcon,
  Users, WifiOff, ChevronRight, Clock, LayoutTemplate, Eye,
  UserCheck, UserX, ChevronDown, Settings, ShieldAlert, Plus, Trash2, Save
} from 'lucide-react';
import { clientDB, boatDB } from '../db';
import type { Cliente } from '../types';

interface CustomTemplate {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  text: string;
  isCustom: boolean;
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
  
  // Modal states
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Mass Sender state
  const [clients, setClients] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<ClientFilter>('todos');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  
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

  const [attachment, setAttachment] = useState<{ file: File; base64: string } | null>(null);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, successes: 0, failures: 0 });
  const [sendLog, setSendLog] = useState<SendLogEntry[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
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
      if (data.base64) setWaQrCode(data.base64);
    } catch (_) {}
  };

  useEffect(() => {
    if (instanceName) fetchWaStatus(instanceName);
    else setWaStatus('not_created');
  }, [instanceName]);

  useEffect(() => { setClients(clientDB.getAll()); }, []);

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
      fetch('/api/config', { method: 'POST', headers: hdr, body: JSON.stringify({ finance_whatsapp_instance: newInstance }) }).catch(console.warn);
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
    fetch('/api/config', { method: 'POST', headers: hdr, body: JSON.stringify({ finance_whatsapp_instance: '' }) }).catch(console.warn);
    setWaStatus('not_created');
    setWaQrCode(null);
    showToast('WhatsApp desconectado!');
  };

  // Client filtering
  const boats = useMemo(() => boatDB.getAll(), []);
  const getBoatName = (id: string) => boats.find(b => b.id === id)?.nome || '';

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (!c.telefone) return false;
      if (searchQuery && !c.nome.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (clientFilter === 'inadimplentes' && c.statusFinanceiro !== 'inadimplente') return false;
      if (clientFilter === 'em_dia' && c.statusFinanceiro === 'inadimplente') return false;
      return true;
    });
  }, [clients, searchQuery, clientFilter]);

  const inadimplentesCount = useMemo(() => clients.filter(c => c.telefone && c.statusFinanceiro === 'inadimplente').length, [clients]);
  const emDiaCount = useMemo(() => clients.filter(c => c.telefone && c.statusFinanceiro !== 'inadimplente').length, [clients]);

  const toggleClient = (id: string) =>
    setSelectedClientIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () =>
    selectedClientIds.length === filteredClients.length
      ? setSelectedClientIds([])
      : setSelectedClientIds(filteredClients.map(c => c.id));

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
    // Persist to centralized database
    const adminToken = localStorage.getItem('admin_token');
    const hdr: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) hdr['Authorization'] = `Bearer ${adminToken}`;
    fetch('/api/config', { method: 'POST', headers: hdr, body: JSON.stringify({ finance_whatsapp_custom_templates: updated }) }).catch(console.warn);
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
    // Persist to centralized database
    const adminToken2 = localStorage.getItem('admin_token');
    const hdr2: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken2) hdr2['Authorization'] = `Bearer ${adminToken2}`;
    fetch('/api/config', { method: 'POST', headers: hdr2, body: JSON.stringify({ finance_whatsapp_custom_templates: updated }) }).catch(console.warn);
    if (activeTemplateId === id) {
      setActiveTemplateId(null);
      setMessageText('');
    }
    showToast('Modelo excluído.');
  };

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
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl transition-all border border-slate-200"
        >
          <WifiOff className="w-4 h-4 text-slate-400" /> WhatsApp Desconectado
        </button>
      );
    }
    if (waStatus === 'open') {
      return (
        <button
          onClick={() => setShowConnectionModal(true)}
          className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 px-3.5 py-2 rounded-xl border border-emerald-200 transition-all"
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
        className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100/70 px-3.5 py-2 rounded-xl border border-amber-200 transition-all"
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
    inadimplentes: <UserX className="w-3.5 h-3.5" />,
    em_dia: <UserCheck className="w-3.5 h-3.5" />,
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
                <Smartphone className="w-5 h-5 text-slate-500" /> Configuração do WhatsApp
              </h3>
              <button onClick={() => setShowConnectionModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
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
                    Crie uma instância no servidor para conectar o número do financeiro via código QR.
                  </p>
                  <button onClick={handleCreateInstance} disabled={isCreating}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg">
                    {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    {isCreating ? 'Criando instância...' : 'Criar Nova Sessão'}
                  </button>
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
                      className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors">
                      <RefreshCw className="w-4 h-4" /> Atualizar
                    </button>
                    <button onClick={handleWaLogout}
                      className="inline-flex items-center gap-2 border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-600 px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors">
                      <LogOut className="w-4 h-4" /> Desconectar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row items-center gap-10">
                  <div className="shrink-0">
                    {waQrCode ? (
                      <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-100">
                        <img src={waQrCode} alt="QR Code WhatsApp" className="w-60 h-60" />
                      </div>
                    ) : (
                      <div className="w-60 h-60 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                        <QrCode className="w-12 h-12 text-slate-300" />
                        <span className="text-xs text-slate-400 font-medium">Gerando QR Code...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex items-center gap-2 mb-4 justify-center lg:justify-start">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </span>
                      <span className="text-amber-600 font-bold text-sm">Aguardando conexão</span>
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
                      <button onClick={() => fetchWaStatus(instanceName!)} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors">
                        <RefreshCw className="w-4 h-4" /> Já conectei, atualizar
                      </button>
                      <button onClick={handleWaLogout} className="inline-flex items-center gap-2 border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Send className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center mb-2">Confirmar Disparo</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Você está prestes a enviar mensagens para <strong className="text-slate-800">{selectedClientIds.length} {selectedClientIds.length === 1 ? 'cliente' : 'clientes'}</strong>.
              {attachment && <><br/>Incluindo o arquivo <strong className="text-slate-800">{attachment.file.name}</strong>.</>}
            </p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-6 max-h-28 overflow-y-auto subtle-scrollbar">
              <p className="text-xs text-slate-400 font-semibold mb-2">PRÉVIA DA MENSAGEM:</p>
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{previewText.substring(0, 200)}{previewText.length > 200 ? '…' : ''}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleMassSend} className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> Confirmar Envio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-400" /> Pré-visualização da Mensagem
              </h3>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {/* Phone mockup */}
              <div className="bg-[#e5ddd5] rounded-2xl p-4 max-h-[400px] overflow-y-auto subtle-scrollbar">
                <div className="max-w-[85%] ml-auto">
                  <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                    <p className="text-[13px] text-slate-800 whitespace-pre-line leading-relaxed">{previewText || 'Sua mensagem aparecerá aqui...'}</p>
                    {attachment && (
                      <div className="mt-2 pt-2 border-t border-emerald-200/50 flex items-center gap-2">
                        {attachment.file.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4 text-emerald-600" />}
                        <span className="text-[11px] text-emerald-700 font-medium truncate">{attachment.file.name}</span>
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
          <StatusButton />
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
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition-colors"
            >
              Configurar WhatsApp
            </button>
          </div>
        )}

        {/* Left panel: client list */}
        <div className={`w-[340px] shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all ${!isConnected ? 'pt-12' : ''}`}>
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-slate-400" /> Destinatários
              </h3>
              <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full">
                {selectedClientIds.length}
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar por nome..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                disabled={sendingStatus !== 'idle'}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>

            {/* Filter + Select All */}
            <div className="flex items-center justify-between">
              <div className="relative" ref={filterDropdownRef}>
                <button onClick={() => setShowFilterDropdown(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    clientFilter !== 'todos' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
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
                      <button key={opt.key}
                        onClick={() => { setClientFilter(opt.key); setShowFilterDropdown(false); setSelectedClientIds([]); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          clientFilter === opt.key ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                        }`}>
                        {opt.icon}
                        <span className="flex-1 text-left">{opt.label}</span>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{opt.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={toggleAll} disabled={sendingStatus !== 'idle'}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                {selectedClientIds.length === filteredClients.length && filteredClients.length > 0 ? 'Desmarcar' : 'Selecionar todos'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto subtle-scrollbar">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Nenhum cliente encontrado.</p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filteredClients.map(client => {
                  const isSelected = selectedClientIds.includes(client.id);
                  const isInadimplente = client.statusFinanceiro === 'inadimplente';
                  const boatName = getBoatName(client.embarcacaoId);
                  return (
                    <label key={client.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all select-none ${
                        isSelected ? 'bg-emerald-50 border border-emerald-100' : 'border border-transparent hover:bg-slate-50'
                      }`}>
                      <input type="checkbox" checked={isSelected}
                        onChange={() => toggleClient(client.id)} disabled={sendingStatus !== 'idle'}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 truncate">{client.nome}</p>
                          {isInadimplente && (
                            <span className="text-[9px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md shrink-0">DEVEDOR</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-slate-400 truncate">{client.telefone}</p>
                          {boatName && <span className="text-[10px] text-slate-300">• {boatName}</span>}
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
              <span>{filteredClients.length} {clientFilter === 'inadimplentes' ? 'inadimplentes' : clientFilter === 'em_dia' ? 'em dia' : 'clientes'}</span>
              <span className="font-semibold text-emerald-600">{selectedClientIds.length} selecionados</span>
            </div>
          </div>
        </div>

        {/* Right panel: composer */}
        <div className={`flex-1 flex flex-col relative overflow-hidden transition-all ${!isConnected ? 'pt-12' : ''}`}>

          {/* Progress overlay */}
          {sendingStatus !== 'idle' && (
            <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8">
              {sendingStatus === 'sending' ? (
                <>
                  <div className="relative w-24 h-24 mb-6">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="#e2e8f0" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="34" stroke="#10b981" strokeWidth="6" fill="none"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - (progress.total > 0 ? progress.current / progress.total : 0))}`}
                        strokeLinecap="round" className="transition-all duration-500" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black text-slate-900">
                        {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Enviando mensagens...</h3>
                  <p className="text-sm text-slate-500 mb-6">{progress.current} de {progress.total}</p>
                  <div className="flex gap-6 text-sm font-semibold">
                    <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> {progress.successes}</span>
                    <span className="text-rose-500 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {progress.failures}</span>
                  </div>
                </>
              ) : (
                <div className="w-full max-w-lg">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 mx-auto border-4 border-emerald-50">
                      <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Disparo concluído!</h3>
                    <div className="flex gap-4 justify-center text-sm font-semibold">
                      <span className="text-emerald-600">{progress.successes} enviados</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-rose-500">{progress.failures} falhas</span>
                    </div>
                  </div>

                  {/* Send log */}
                  {sendLog.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl mb-6 max-h-48 overflow-y-auto subtle-scrollbar">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-100">
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
                                  ? <span className="text-emerald-600 font-bold">✓</span>
                                  : <span className="text-rose-500 font-bold">✗</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <button onClick={resetSender}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm transition-colors">
                    Novo Disparo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Template selector */}
          <div className="px-6 pt-5 bg-white border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5" /> Modelos de Mensagem
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pb-4 max-h-[160px] overflow-y-auto subtle-scrollbar pr-1">
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
                      className={`flex flex-col items-start px-4 py-2 rounded-xl border text-left transition-all min-w-[150px] pr-8 ${
                        isActive ? 'bg-slate-900 border-slate-900 text-white' : `bg-white ${colorMap[tpl.color] || 'border-slate-200 text-slate-700'}`
                      }`}>
                      <span className="flex items-center gap-2 text-xs font-bold">
                        <span>{tpl.icon}</span> {tpl.label}
                      </span>
                      <span className={`text-[10px] mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>{tpl.description}</span>
                    </button>
                    {(tpl as any).isCustom && (
                      <button
                        onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                        className="absolute right-2 top-2 p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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
                <span>Variáveis:</span>
                <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]" title="Primeiro nome do cliente">{'{nome}'}</code>
                <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]" title="Mês atual por extenso">{'{mes}'}</code>
                <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]" title="Data atual">{'{data}'}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{messageText.length} caracteres</span>
                <button
                  onClick={() => setShowSaveTemplateModal(true)}
                  disabled={!messageText.trim()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" /> Salvar Modelo
                </button>
                <button onClick={() => setShowPreview(true)} disabled={!messageText.trim()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  <Eye className="w-3.5 h-3.5" /> Prévia
                </button>
              </div>
            </div>

            {/* Textarea */}
            <textarea value={messageText} onChange={e => { setMessageText(e.target.value); setActiveTemplateId(null); }}
              placeholder={`Selecione um modelo acima ou escreva sua mensagem...\n\nDica: {nome}, {mes} e {data} serão substituídos automaticamente.`}
              className="w-full flex-1 min-h-[160px] resize-none border border-slate-200 rounded-2xl p-5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 subtle-scrollbar leading-relaxed" />

            {/* Attachment zone */}
            <input type="file" ref={fileInputRef} accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
            <div className={`border-2 border-dashed rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all group ${
              attachment ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
            }`} onClick={() => fileInputRef.current?.click()}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                attachment ? 'bg-emerald-100' : 'bg-slate-100 group-hover:bg-emerald-100'
              }`}>
                {attachment ? (
                  attachment.file.type.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-emerald-600" /> : <FileText className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Paperclip className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {attachment ? (
                  <>
                    <p className="text-sm font-bold text-emerald-700 truncate">{attachment.file.name}</p>
                    <p className="text-xs text-emerald-500">{(attachment.file.size / 1024).toFixed(0)} KB — clique para trocar</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-600 group-hover:text-emerald-700 transition-colors">Anexar Boleto, Imagem ou Documento</p>
                    <p className="text-xs text-slate-400">PDF, PNG ou JPG — até 15 MB</p>
                  </>
                )}
              </div>
              {attachment && (
                <button onClick={e => { e.stopPropagation(); setAttachment(null); }} className="text-slate-400 hover:text-rose-500 transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Intervalo de ~2s entre cada envio
            </div>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!isConnected || selectedClientIds.length === 0 || (!messageText.trim() && !attachment)}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
                isConnected && selectedClientIds.length > 0 && (messageText.trim() || attachment)
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md hover:scale-[1.02]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}>
              <Send className="w-4 h-4" />
              Disparar para {selectedClientIds.length} {selectedClientIds.length === 1 ? 'cliente' : 'clientes'}
            </button>
          </div>
        </div>
      </div>

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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSaveTemplateModal(false); setNewTemplateName(''); }}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTemplate}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
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
