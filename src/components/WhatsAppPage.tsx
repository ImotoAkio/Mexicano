import React, { useState, useEffect } from 'react';
import { reservationDB, boatDB, clientDB } from '../db';
import { Embarcacao, Cliente, Reserva } from '../types';
import MonthlyCalendarGenerator from './MonthlyCalendarGenerator';
import { ShieldAlert, Smartphone, UserCheck, UserX, QrCode, LogOut, CheckCircle, MessageSquare, Calendar as CalendarIcon, Check, AlertTriangle, 
  RefreshCw, Search, Send, Clock, Ship, CalendarDays, Wallet 
} from 'lucide-react';

const formatFirstName = (fullName: string): string => {
  if (!fullName) return '';
  const firstName = fullName.trim().split(' ')[0];
  if (!firstName) return '';
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};

const getQuando = (targetDateStr: string): string => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'hoje';
    } else if (diffDays === 1) {
      return 'amanhã';
    } else {
      return `no dia ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
    }
  } catch (e) {
    return 'amanhã';
  }
};


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function WhatsAppPage() {
  const [activeMainTab, setActiveMainTab] = useState<'confirmations' | 'calendars' | 'config'>('confirmations');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [confTemplate1, setConfTemplate1] = useState(() => {
    return localStorage.getItem('whatsapp_conf_template1') || "Olá, *{cliente}*! 😃\nPosso confirmar sua saída *{quando}* com a embarcação *{barco}*?";
  });

  const [confTemplate2, setConfTemplate2] = useState(() => {
    return localStorage.getItem('whatsapp_conf_template2') || "⚠️ *ATENÇÃO: DADOS OBRIGATÓRIOS PARA NAVEGAÇÃO!* ⚠️\nCaso o passeio esteja confirmado, por favor responda com:\n\n📍 *Destino:*\n⏰ *Previsão de saída às:*\n⏰ *Previsão de chegada às:*\n👥 *Número de pessoas a bordo:*\n\n🚨 *A Marinha exige o Plano de Navegação prévio. Com esses dados, adiantaremos o preenchimento obrigatório para sua segurança!*";
  });

  const [showTemplatesEditor, setShowTemplatesEditor] = useState(false);

  const handleSaveConfTemplate1 = (val: string) => {
    setConfTemplate1(val);
    localStorage.setItem('whatsapp_conf_template1', val);
    // Persist to centralized database
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/config', { method: 'POST', headers, body: JSON.stringify({ whatsapp_conf_template1: val }) }).catch(console.warn);
  };

  const handleSaveConfTemplate2 = (val: string) => {
    setConfTemplate2(val);
    localStorage.setItem('whatsapp_conf_template2', val);
    // Persist to centralized database
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/config', { method: 'POST', headers, body: JSON.stringify({ whatsapp_conf_template2: val }) }).catch(console.warn);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- WHATSAPP CONFIG LOGIC ---
  // WhatsApp States
  const [activeTab, setActiveTab] = useState<'conta' | 'contatos' | 'grupos'>('conta');
  const [waStatus, setWaStatus] = useState<string>('loading');
  const [waQrCode, setWaQrCode] = useState<string | null>(null);
  const [isFetchingWaStatus, setIsFetchingWaStatus] = useState(false);

  // WhatsApp Contacts Sync States
  const [clients, setClients] = useState<Cliente[]>([]);
  const setClientsFiltered = (allClients: Cliente[]) => {
    setClients(allClients.filter(c => !c.nome.toLowerCase().includes('vila nautica')));
  };
  const [whatsAppContacts, setWhatsAppContacts] = useState<any[]>([]);
  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [activeContactsTab, setActiveContactsTab] = useState<'todos' | 'sem_telefone' | 'vinculados'>('sem_telefone');
  const [clientSearch, setClientSearch] = useState('');
  const [activeManualSyncClientId, setActiveManualSyncClientId] = useState<string | null>(null);
  const [contactQuery, setContactQuery] = useState('');

  
  // WhatsApp Groups Sync States
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [mappingState, setMappingState] = useState<Record<string, string>>({});
  const [boats, setBoats] = useState<any[]>([]);

  

  // --- CONFIRMATIONS LOGIC ---
  const [confDate, setConfDate] = useState(() => {
    const today = new Date();
    const localStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    return localStr;
  });
  
  const [confReservations, setConfReservations] = useState<Reserva[]>([]);
  const [confSearch, setConfSearch] = useState('');
  const [confFilter, setConfFilter] = useState<'all' | 'with_contact' | 'without_contact'>('all');
  const [confSelectedIds, setConfSelectedIds] = useState<string[]>([]);
  const [confSendingStatus, setConfSendingStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [confSendResults, setConfSendResults] = useState<Record<string, 'pending' | 'sending' | 'success' | 'error'>>({});

  useEffect(() => {
    const res = reservationDB.getAll().filter(r => r.data === confDate && (r.status === 'agendado' || r.status === 'confirmado'));
    setConfReservations(res);
    
    // Auto-seleciona apenas os que têm telefone e AINDA NÃO tiveram confirmação enviada
    const initialSelected = res
      .filter(r => {
        const client = clientDB.getById(r.clienteId);
        return !!client?.telefone && !r.confirmacaoEnviada && client?.statusFinanceiro !== 'inadimplente';
      })
      .map(r => r.id);
    setConfSelectedIds(initialSelected);

    // Inicializa o status visual mostrando quais já foram enviados no passado
    const initialResults: Record<string, 'pending' | 'sending' | 'success' | 'error'> = {};
    res.forEach(r => {
      initialResults[r.id] = r.confirmacaoEnviada ? 'success' : 'pending';
    });
    setConfSendResults(initialResults);
    setConfSendingStatus('idle');
  }, [confDate]);

  const filteredConfRes = confReservations.filter(res => {
    const client = clientDB.getById(res.clienteId);
    const boat = boatDB.getById(res.embarcacaoId);
    const search = confSearch.toLowerCase();
    
    const matchesSearch = !search || 
      client?.nome?.toLowerCase().includes(search) || 
      boat?.nome?.toLowerCase().includes(search) || 
      String(boat?.numero).includes(search);
      
    if (!matchesSearch) return false;
    
    const hasPhone = !!client?.telefone;
    if (confFilter === 'with_contact' && !hasPhone) return false;
    if (confFilter === 'without_contact' && hasPhone) return false;
    
    return true;
  });

  const visibleIdsWithPhone = filteredConfRes
    .filter(res => !!clientDB.getById(res.clienteId)?.telefone)
    .map(res => res.id);
  
  const allVisibleSelected = visibleIdsWithPhone.length > 0 && visibleIdsWithPhone.every(id => confSelectedIds.includes(id));

  const handleConfToggleSelect = (id: string) => {
    setConfSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleConfToggleSelectAll = () => {
    if (allVisibleSelected) {
      setConfSelectedIds(prev => prev.filter(id => !visibleIdsWithPhone.includes(id)));
    } else {
      const newSelection = new Set([...confSelectedIds, ...visibleIdsWithPhone]);
      setConfSelectedIds(Array.from(newSelection));
    }
  };

  const handleSendConfirmations = async () => {
    if (confSelectedIds.length === 0) {
      showToast('Nenhum agendamento selecionado.', 'error');
      return;
    }
    setConfSendingStatus('sending');
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    for (const resId of confSelectedIds) {
      const res = confReservations.find(r => r.id === resId);
      if (!res) continue;
      const client = clientDB.getById(res.clienteId);
      const boat = boatDB.getById(res.embarcacaoId);
      if (!client || !client.telefone) continue;

      const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome) : 'M00';
      const clientFirstName = client.nome ? formatFirstName(client.nome) : '';
      const quando = getQuando(res.data);
      const text1 = confTemplate1
        .replace(/{cliente}/g, clientFirstName)
        .replace(/{barco}/g, boatCode)
        .replace(/{quando}/g, quando);
      const text2 = confTemplate2
        .replace(/{cliente}/g, clientFirstName)
        .replace(/{barco}/g, boatCode)
        .replace(/{quando}/g, quando);

      setConfSendResults(prev => ({ ...prev, [resId]: 'sending' }));

      try {
        let response = await fetch('/api/whatsapp/send-text', {
          method: 'POST',
          headers,
          body: JSON.stringify({ number: client.telefone, text: text1 })
        });
        if (!response.ok) throw new Error('Falha 1');
        
        await sleep(4000);
        
        response = await fetch('/api/whatsapp/send-text', {
          method: 'POST',
          headers,
          body: JSON.stringify({ number: client.telefone, text: text2 })
        });
        if (!response.ok) throw new Error('Falha 2');

        setConfSendResults(prev => ({ ...prev, [resId]: 'success' }));
        reservationDB.update(resId, { confirmacaoEnviada: true });
      } catch (err) {
        setConfSendResults(prev => ({ ...prev, [resId]: 'error' }));
      }
      await sleep(5000);
    }
    setConfSendingStatus('completed');
    showToast('Processo de disparo concluído!', 'success');
  };

const fetchWaStatus = async () => {
    setIsFetchingWaStatus(true);
    try {
      const res = await fetch('/api/whatsapp/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      const state = data?.instance?.state || 'close';
      setWaStatus(state);
      if (state !== 'open') {
        fetchWaQrCode();
      } else {
        setWaQrCode(null);
      }
    } catch (err) {
      console.error(err);
      setWaStatus('error');
    } finally {
      setIsFetchingWaStatus(false);
    }
  };

  const fetchWaQrCode = async () => {
    try {
      const res = await fetch('/api/whatsapp/connect', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (data.base64) {
        setWaQrCode(data.base64);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWaLogout = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    try {
      await fetch('/api/whatsapp/logout', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      showToast('WhatsApp desconectado!');
      setWaStatus('close');
      setTimeout(() => fetchWaQrCode(), 2000);
    } catch (err) {
      showToast('Erro ao desconectar', 'error');
    }
  };

  

  const handleFetchGroups = async () => {
    setIsFetchingGroups(true);
    try {
      const res = await fetch('/api/whatsapp/groups', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setAvailableGroups(data.groups);
        const newMapping: Record<string, string> = {};
        for (const b of boats) {
          if (b.whatsappGroupId) newMapping[b.id] = b.whatsappGroupId;
        }
        setMappingState(newMapping);
        showToast(`${data.groups.length} grupos carregados.`);
      } else {
        showToast('Erro ao carregar grupos', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão com grupos', 'error');
    } finally {
      setIsFetchingGroups(false);
    }
  };

  const handleMappingChange = (boatId: string, groupId: string) => {
    setMappingState(prev => ({ ...prev, [boatId]: groupId }));
  };

  const handleSaveGroupMapping = () => {
    try {
      let count = 0;
      for (const b of boats) {
        const newGroupId = mappingState[b.id] || '';
        if (newGroupId !== (b.whatsappGroupId || '')) {
          boatDB.update(b.id, { whatsappGroupId: newGroupId || undefined });
          count++;
        }
      }
      setBoats(boatDB.getAll());
      showToast(`Mapeamento salvo! ${count} atualizações.`);
    } catch (err) {
      showToast('Erro ao salvar mapeamento', 'error');
    }
  };

  const fetchWhatsAppContactsList = async () => {
    setIsFetchingContacts(true);
    try {
      const res = await fetch('/api/whatsapp/contacts', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.contacts)) {
        const personal = data.contacts.filter((c: any) => c.remoteJid && c.remoteJid.endsWith('@s.whatsapp.net'));
        setWhatsAppContacts(personal);
        showToast(`${personal.length} contatos carregados!`);
      } else {
        throw new Error();
      }
    } catch (err) {
      showToast('Erro ao obter contatos da VPS.', 'error');
    } finally {
      setIsFetchingContacts(false);
    }
  };

  const handleLinkPhone = (clientId: string, phone: string) => {
    try {
      clientDB.update(clientId, { telefone: phone });
      setClientsFiltered(clientDB.getAll());
      showToast('Telefone vinculado com sucesso!');
    } catch (err: any) {
      showToast('Erro ao atualizar cadastro', 'error');
    }
  };

  const handleUnlinkPhone = (clientId: string) => {
    try {
      clientDB.update(clientId, { telefone: '' });
      setClientsFiltered(clientDB.getAll());
      showToast('Vínculo de telefone removido.');
    } catch (err: any) {
      showToast('Erro ao remover vínculo', 'error');
    }
  };

  const formatPhoneNumber = (jid: string): string => {
    const raw = jid.split('@')[0];
    if (raw.startsWith('55') && raw.length >= 12) {
      const ddd = raw.substring(2, 4);
      const rest = raw.substring(4);
      if (rest.length === 9) return `(${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
      return `(${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
    return raw;
  };

  


  useEffect(() => {
    fetchWaStatus();
    setClientsFiltered(clientDB.getAll());
    setBoats(boatDB.getAll());
  }, []);

  // --- CALENDARS LOGIC ---
  const [calMonth, setCalMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [calBoats, setCalBoats] = useState<Embarcacao[]>([]);
  const [calSearch, setCalSearch] = useState('');
  const [calSelectedIds, setCalSelectedIds] = useState<string[]>([]);
  const [calSendingStatus, setCalSendingStatus] = useState<'idle' | 'sending' | 'completed'>('idle');
  const [calSendResults, setCalSendResults] = useState<Record<string, 'pending' | 'sending' | 'success' | 'error'>>({});
  const [currentBoatIdx, setCurrentBoatIdx] = useState<number>(-1);

  const [calMessageTemplate, setCalMessageTemplate] = useState(() => {
    return localStorage.getItem('whatsapp_cal_template') || "Olá pessoal! 📅 Segue o calendário de reservas da embarcação {barco} para o mês de {mes}. Bom uso a todos! ☀️⛵";
  });

  const handleSaveCalTemplate = (val: string) => {
    setCalMessageTemplate(val);
    localStorage.setItem('whatsapp_cal_template', val);
    // Persist to centralized database
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/config', { method: 'POST', headers, body: JSON.stringify({ whatsapp_cal_template: val }) }).catch(console.warn);
  };

  useEffect(() => {
    // Only boats with WhatsApp groups
    const all = boatDB.getAll().filter(b => b.whatsappGroupId);
    setCalBoats(all);
  }, []);

  const filteredCalBoats = calBoats.filter(b => {
    if (!calSearch) return true;
    const s = calSearch.toLowerCase();
    return b.nome.toLowerCase().includes(s) || String(b.numero).includes(s);
  });

  const calAllSelected = filteredCalBoats.length > 0 && filteredCalBoats.every(b => calSelectedIds.includes(b.id));

  const handleCalToggleSelectAll = () => {
    if (calAllSelected) {
      setCalSelectedIds(prev => prev.filter(id => !filteredCalBoats.some(b => b.id === id)));
    } else {
      const newSelection = new Set([...calSelectedIds, ...filteredCalBoats.map(b => b.id)]);
      setCalSelectedIds(Array.from(newSelection));
    }
  };

  const handleStartCalSend = () => {
    if (calSelectedIds.length === 0) {
      showToast('Selecione pelo menos uma embarcação.', 'error');
      return;
    }
    setCalSendingStatus('sending');
    setCurrentBoatIdx(0);
    // Initializes the results mapping
    const initialResults: Record<string, 'pending' | 'sending' | 'success' | 'error'> = {};
    calSelectedIds.forEach(id => initialResults[id] = 'pending');
    setCalSendResults(initialResults);
  };

  // Called when MonthlyCalendarGenerator triggers onExport
  const handleCalendarExported = async (base64Image: string) => {
    const boatId = calSelectedIds[currentBoatIdx];
    const boat = boatDB.getById(boatId);
    if (!boat || !boat.whatsappGroupId) {
       nextCalendar();
       return;
    }
    
    setCalSendResults(prev => ({ ...prev, [boatId]: 'sending' }));
    
    try {
      const token = localStorage.getItem('admin_token');
      
      const groupObj = availableGroups.find(g => g.id === boat.whatsappGroupId);
      const groupName = groupObj ? (groupObj.subject || groupObj.name || boat.whatsappGroupId) : boat.nome;
      
      const [year, month] = calMonth.split('-');
      const monthsPt = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      const monthName = monthsPt[parseInt(month, 10) - 1] || month;
      
      const caption = calMessageTemplate
        .replace(/{barco}/g, boat.nome)
        .replace(/{grupo}/g, groupName)
        .replace(/{mes}/g, `${monthName} de ${year}`)
        .replace(/{ano}/g, year);

      const response = await fetch('/api/whatsapp/send-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          base64Image: base64Image,
          groupId: boat.whatsappGroupId,
          boatName: boat.nome,
          caption: caption
        })
      });
      
      if (!response.ok) throw new Error('Falha no envio');
      setCalSendResults(prev => ({ ...prev, [boatId]: 'success' }));
    } catch (err) {
      setCalSendResults(prev => ({ ...prev, [boatId]: 'error' }));
    }
    
    await sleep(3000); // Wait 3 seconds before moving to next boat
    nextCalendar();
  };

  const nextCalendar = () => {
    if (currentBoatIdx + 1 < calSelectedIds.length) {
      setCurrentBoatIdx(currentBoatIdx + 1);
    } else {
      setCalSendingStatus('completed');
      setCurrentBoatIdx(-1);
      showToast('Envio de calendários concluído!', 'success');
    }
  };

  const activeProcessingBoatId = currentBoatIdx >= 0 ? calSelectedIds[currentBoatIdx] : null;

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" /> Central de WhatsApp
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Dispare confirmações e calendários em massa de forma automatizada</p>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 bg-slate-200/50 p-1 rounded-xl w-max">
        <button 
          onClick={() => setActiveMainTab('confirmations')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeMainTab === 'confirmations' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          <Check className="w-4 h-4" /> Confirmações Diárias
        </button>
        <button 
          onClick={() => setActiveMainTab('calendars')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeMainTab === 'calendars' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          <CalendarIcon className="w-4 h-4" /> Calendários Mensais
        </button>
        <button 
          onClick={() => setActiveMainTab('config')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeMainTab === 'config' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          <Smartphone className="w-4 h-4" /> Configurações & Conexão
        </button>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col h-0 overflow-hidden">
        
        {/* CONFIRMATIONS TAB */}
        {activeMainTab === 'confirmations' && (
          <div className="flex flex-col h-full space-y-4">
            <div className="flex gap-4 items-center mb-2 shrink-0">
              <div className="w-48">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data dos Agendamentos</label>
                <input 
                  type="date" 
                  value={confDate} 
                  onChange={e => setConfDate(e.target.value)}
                  className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pesquisar</label>
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nome do cliente ou embarcação..."
                    value={confSearch}
                    onChange={(e) => setConfSearch(e.target.value)}
                    className="w-full text-sm pl-9 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="self-end mb-[2px]">
                <button
                  onClick={() => setShowTemplatesEditor(prev => !prev)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors h-[38px]"
                >
                  <MessageSquare className="w-4 h-4" /> 
                  {showTemplatesEditor ? 'Ocultar Modelos' : 'Editar Modelos'}
                </button>
              </div>
            </div>

            {showTemplatesEditor && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                <div className="flex flex-col space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Modelo da 1ª Mensagem (Confirmação)</label>
                  <textarea
                    value={confTemplate1}
                    onChange={e => handleSaveConfTemplate1(e.target.value)}
                    rows={4}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
                    placeholder="Ex: Olá, {cliente}! 😃..."
                  />
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Modelo da 2ª Mensagem (Dados de Navegação)</label>
                  <textarea
                    value={confTemplate2}
                    onChange={e => handleSaveConfTemplate2(e.target.value)}
                    rows={4}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
                    placeholder="Ex: ⚠️ ATENÇÃO: DADOS OBRIGATÓRIOS... ⚠️"
                  />
                </div>
                
                <div className="md:col-span-2 text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="font-bold text-slate-700">Variáveis disponíveis:</span>
                  <span><code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{cliente}'}</code> (Primeiro nome, ex: Adhler)</span>
                  <span><code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{barco}'}</code> (Código da embarcação, ex: M18)</span>
                  <span><code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{quando}'}</code> (Dia relativo, ex: hoje / amanhã / no dia 03/07)</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center shrink-0">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                 <button onClick={() => setConfFilter('all')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${confFilter === 'all' ? 'bg-white shadow' : 'text-slate-500'}`}>Todos</button>
                 <button onClick={() => setConfFilter('with_contact')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${confFilter === 'with_contact' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Com Telefone</button>
                 <button onClick={() => setConfFilter('without_contact')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${confFilter === 'without_contact' ? 'bg-white shadow text-rose-600' : 'text-slate-500'}`}>Sem Telefone</button>
              </div>
              <button 
                onClick={handleConfToggleSelectAll}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                 <Check className="w-4 h-4" /> Selecionar Todos Filtrados
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 border-t pt-4">
              {filteredConfRes.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">Nenhum agendamento encontrado para esta data.</div>
              ) : (
                filteredConfRes.map(res => {
                  const client = clientDB.getById(res.clienteId);
                  const boat = boatDB.getById(res.embarcacaoId);
                  const hasPhone = !!client?.telefone;
                  const isSelected = confSelectedIds.includes(res.id);
                  const status = confSendResults[res.id] || 'pending';
                  const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome) : 'M00';

                  return (
                    <div key={res.id} className={`flex flex-col p-3 rounded-xl border ${isSelected ? 'bg-emerald-50/30 border-emerald-300' : 'bg-slate-50 border-slate-200'} ${!hasPhone ? 'opacity-60 bg-slate-100 grayscale' : 'cursor-pointer hover:border-emerald-400'}`} onClick={() => hasPhone && confSendingStatus !== 'sending' && handleConfToggleSelect(res.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button disabled={!hasPhone || confSendingStatus === 'sending'} className={`flex items-center justify-center w-5 h-5 rounded border ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <div>
                             <div className="flex items-center gap-2">
                               <span className="font-bold text-xs bg-slate-200 px-1.5 py-0.5 rounded">{boatCode}</span>
                               <span className="font-bold text-sm text-slate-800">{client?.nome || 'Desconhecido'}</span>
                               {client?.statusFinanceiro === 'inadimplente' ? (
                                 <span className="font-bold text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider" title="Cliente inadimplente não pode usufruir da embarcação">
                                    <AlertTriangle className="w-3 h-3"/> Inadimplente
                                 </span>
                               ) : (client?.temValoresEmAberto || client?.statusFinanceiro === 'pendente') ? (
                                 <span className="font-bold text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider" title="Possui valores lançados em aberto">
                                    <Wallet className="w-3 h-3"/> Possui Lançamentos
                                 </span>
                               ) : client?.temLancamentos ? (
                                 <span className="font-bold text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider" title="Possui lançamentos no sistema">
                                    <Wallet className="w-3 h-3"/> Com Lançamentos
                                 </span>
                               ) : null}
                             </div>
                            <div className="mt-1">
                              {hasPhone ? <span className="text-xs text-slate-500">{client.telefone}</span> : <span className="text-xs text-rose-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Sem telefone</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-bold">
                          {status === 'sending' && <span className="text-blue-600 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin"/> Enviando...</span>}
                          {status === 'success' && <span className="text-emerald-600 bg-emerald-100 px-2 py-1 rounded">✅ Enviado</span>}
                          {status === 'error' && <span className="text-rose-600 bg-rose-100 px-2 py-1 rounded">❌ Erro</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="shrink-0 pt-4 border-t flex justify-end">
              <button
                disabled={confSendingStatus === 'sending' || confSelectedIds.length === 0}
                onClick={handleSendConfirmations}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {confSendingStatus === 'sending' ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                {confSendingStatus === 'sending' ? `Enviando...` : `Disparar para ${confSelectedIds.length} clientes`}
              </button>
            </div>
          </div>
        )}

        {/* CALENDARS TAB */}
        {activeMainTab === 'calendars' && (
          <div className="flex flex-col h-full space-y-4">
             <div className="flex gap-4 items-center mb-2 shrink-0">
              <div className="w-48">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mês de Referência</label>
                <input 
                  type="month" 
                  value={calMonth} 
                  onChange={e => setCalMonth(e.target.value)}
                  className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Buscar Embarcação</label>
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar..."
                    value={calSearch}
                    onChange={(e) => setCalSearch(e.target.value)}
                    className="w-full text-sm pl-9 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <button 
                onClick={handleCalToggleSelectAll}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 self-end mb-3"
              >
                 <Check className="w-4 h-4" /> Selecionar Todos
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0">
               <label className="block text-xs font-bold text-slate-700 mb-1">Mensagem de Legenda do Calendário</label>
               <textarea
                 value={calMessageTemplate}
                 onChange={e => handleSaveCalTemplate(e.target.value)}
                 rows={3}
                 className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-sans"
                 placeholder="Digite a mensagem padrão que será enviada junto com a foto do calendário..."
               />
               <p className="text-[10px] text-slate-500 mt-1">
                 Variáveis disponíveis: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{barco}'}</code> (Nome da embarcação), <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{grupo}'}</code> (Nome do grupo), <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{mes}'}</code> (Mês por extenso, ex: Julho de 2026), <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">{'{ano}'}</code> (Ano, ex: 2026).
               </p>
            </div>

            {calBoats.length === 0 && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Nenhuma embarcação possui <b>ID do Grupo do WhatsApp</b> configurado. Vá no Cadastro de Embarcações e informe o ID Evolution do grupo para utilizar essa função.</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 border-t pt-4">
               {filteredCalBoats.map(boat => {
                  const isSelected = calSelectedIds.includes(boat.id);
                  const status = calSendResults[boat.id] || 'pending';
                  const boatCode = boat.numero ? `M${boat.numero}` : 'MXX';
                  
                  return (
                    <div key={boat.id} className={`flex items-center justify-between p-3 rounded-xl border ${isSelected ? 'bg-emerald-50/30 border-emerald-300' : 'bg-slate-50 border-slate-200'} cursor-pointer hover:border-emerald-400`} onClick={() => calSendingStatus !== 'sending' && setCalSelectedIds(prev => prev.includes(boat.id) ? prev.filter(i => i !== boat.id) : [...prev, boat.id])}>
                       <div className="flex items-center gap-3">
                          <button disabled={calSendingStatus === 'sending'} className={`flex items-center justify-center w-5 h-5 rounded border ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                               <Ship className="w-4 h-4 text-slate-400"/>
                               <span className="font-bold text-xs bg-slate-200 px-1.5 py-0.5 rounded">{boatCode}</span>
                               <span className="font-bold text-sm text-slate-800">{boat.nome}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                               ID: {boat.whatsappGroupId}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-bold">
                          {status === 'sending' && <span className="text-blue-600 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin"/> Renderizando/Enviando...</span>}
                          {status === 'success' && <span className="text-emerald-600 bg-emerald-100 px-2 py-1 rounded">✅ Enviado</span>}
                          {status === 'error' && <span className="text-rose-600 bg-rose-100 px-2 py-1 rounded">❌ Erro</span>}
                        </div>
                    </div>
                  );
               })}
            </div>

            <div className="shrink-0 pt-4 border-t flex justify-between items-center">
              <div className="text-xs text-slate-500 font-medium">
                {calSendingStatus === 'sending' && (
                  <span className="flex items-center gap-1 animate-pulse">
                     <Clock className="w-3.5 h-3.5" /> 
                     Processando {currentBoatIdx + 1} de {calSelectedIds.length}... Aguarde (Isso pode demorar um pouco).
                  </span>
                )}
              </div>
              <button
                disabled={calSendingStatus === 'sending' || calSelectedIds.length === 0}
                onClick={handleStartCalSend}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {calSendingStatus === 'sending' ? <RefreshCw className="w-4 h-4 animate-spin"/> : <CalendarDays className="w-4 h-4"/>}
                {calSendingStatus === 'sending' ? `Enviando...` : `Disparar Calendário p/ ${calSelectedIds.length} grupos`}
              </button>
            </div>
          </div>
        )}

      </div>

      
        {/* CONFIG TAB */}
        {activeMainTab === 'config' && (
          <div className="flex flex-col h-full overflow-y-auto subtle-scrollbar -mx-6">
            <div className="flex items-center border-b border-slate-100 bg-slate-50/50 px-4">
              <button
                onClick={() => setActiveTab('conta')}
                className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors ${activeTab === 'conta' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Status da Conta
              </button>
              <button
                onClick={() => setActiveTab('grupos')}
                className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors ${activeTab === 'grupos' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Sincronizar Grupos
              </button>
              <button
                onClick={() => setActiveTab('contatos')}
                className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors ${activeTab === 'contatos' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Sincronizar Contatos
              </button>
            </div>

            {/* TAB CONTENT: CONTA / QR CODE */}
            {activeTab === 'conta' && (
              <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center">
                {isFetchingWaStatus ? (
                  <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                ) : waStatus === 'open' ? (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto">
                      <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">WhatsApp Conectado</h4>
                      <p className="text-sm text-slate-500">A API Evolution está pronta para enviar e receber mensagens.</p>
                    </div>
                    <button onClick={handleWaLogout} className="mt-4 bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 mx-auto transition-colors">
                      <LogOut className="w-4 h-4" /> Desconectar
                    </button>
                  </div>
                ) : waQrCode ? (
                  <div className="text-center space-y-6">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">Conectar WhatsApp</h4>
                      <p className="text-sm text-slate-500">Abra o WhatsApp no celular, vá em Aparelhos Conectados e escaneie o código abaixo:</p>
                    </div>
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 inline-block">
                      <img src={waQrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
                    </div>
                    <button onClick={fetchWaStatus} className="text-xs text-slate-500 hover:text-slate-800 underline">Atualizar Status</button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-800">Serviço Indisponível ou Desconectado</p>
                    <button onClick={fetchWaQrCode} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 mx-auto">
                      <QrCode className="w-4 h-4" /> Gerar Novo QR Code
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: GRUPOS */}
            {activeTab === 'grupos' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Associe as embarcações aos grupos do WhatsApp encontrados na Evolution API para disparo de calendários.</p>
                  <button onClick={handleFetchGroups} disabled={isFetchingGroups} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGroups ? 'animate-spin' : ''}`} /> Puxar Grupos do WhatsApp
                  </button>
                </div>

                {availableGroups.length > 0 ? (
                  <div className="space-y-3">
                    {boats.map(boat => (
                      <div key={boat.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="mb-2 sm:mb-0">
                          <p className="text-sm font-semibold text-slate-800">{boat.nome}</p>
                          <p className="text-xs text-slate-500">Lancha/Jet: {boat.numero}</p>
                        </div>
                        <div className="w-full sm:w-1/2">
                          <select
                            value={mappingState[boat.id] || ''}
                            onChange={(e) => handleMappingChange(boat.id, e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                          >
                            <option value="">-- Sem Grupo Associado --</option>
                            {availableGroups.map(g => (
                              <option key={g.id} value={g.id}>{g.subject || g.name || g.id}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 flex justify-end">
                      <button onClick={handleSaveGroupMapping} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm">
                        Salvar Associações de Grupos
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Nenhum grupo carregado. Clique em "Puxar Grupos do WhatsApp".
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: CONTATOS */}
            {activeTab === 'contatos' && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                    <button onClick={() => setActiveContactsTab('sem_telefone')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${activeContactsTab === 'sem_telefone' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Sem WhatsApp</button>
                    <button onClick={() => setActiveContactsTab('vinculados')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${activeContactsTab === 'vinculados' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Mapeados</button>
                    <button onClick={() => setActiveContactsTab('todos')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${activeContactsTab === 'todos' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}>Todos</button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-8 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                    <button onClick={fetchWhatsAppContactsList} disabled={isFetchingContacts} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors">
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingContacts ? 'animate-spin' : ''}`} /> Puxar
                    </button>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100">
                  {(() => {
                    const filteredClients = clients.filter(c => {
                      if (clientSearch && !c.nome.toLowerCase().includes(clientSearch.toLowerCase())) return false;
                      if (activeContactsTab === 'sem_telefone') return !c.telefone;
                      if (activeContactsTab === 'vinculados') return !!c.telefone;
                      return true;
                    });

                    if (filteredClients.length === 0) return <div className="p-8 text-center text-slate-400 text-xs">Nenhum cliente encontrado neste filtro.</div>;

                    return filteredClients.map((client) => {
                      return (
                        <div key={client.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                          <div className="space-y-1 max-w-md">
                            <span className="font-semibold text-slate-900 text-xs">{client.nome}</span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:justify-end flex-1">
                            {client.telefone ? (
                              <div className="flex items-center justify-between sm:justify-end gap-3 w-full">
                                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5">
                                  <UserCheck className="w-3.5 h-3.5" /> {formatPhoneNumber(client.telefone)}
                                </div>
                                <button onClick={() => handleUnlinkPhone(client.id)} className="text-[11px] text-rose-600 font-medium">Remover</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 w-full justify-between sm:justify-end">
                                {activeManualSyncClientId === client.id ? (
                                  <div className="relative flex-1 max-w-xs flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="Buscar contato puxado..."
                                      value={contactQuery}
                                      onChange={(e) => setContactQuery(e.target.value)}
                                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                                      autoFocus
                                    />
                                    <button onClick={() => { setActiveManualSyncClientId(null); setContactQuery(''); }} className="text-[10px] text-slate-400 px-1 py-1">Cancelar</button>
                                    {contactQuery.trim().length > 0 && (
                                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-40 divide-y divide-slate-100 subtle-scrollbar">
                                        {whatsAppContacts.filter(c => (c.pushName && c.pushName.toLowerCase().includes(contactQuery.toLowerCase())) || c.remoteJid.includes(contactQuery)).slice(0, 10).map(contact => (
                                          <button
                                            key={contact.id}
                                            onClick={() => { handleLinkPhone(client.id, contact.remoteJid.split('@')[0]); setActiveManualSyncClientId(null); setContactQuery(''); }}
                                            className="w-full text-left p-2 hover:bg-slate-50 text-[11px] transition-colors flex flex-col"
                                          >
                                            <span className="font-semibold text-slate-950">{contact.pushName || 'Sem Nome'}</span>
                                            <span className="text-[9px] text-slate-400 font-mono">{formatPhoneNumber(contact.remoteJid)}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <button onClick={() => { setActiveManualSyncClientId(client.id); setContactQuery(''); }} className="text-[11px] text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                                    <Smartphone className="w-3.5 h-3.5" /> Vincular Manualmente
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}


      {/* Hidden processing block for Calendars */}
      {activeMainTab === 'calendars' && calSendingStatus === 'sending' && activeProcessingBoatId && (
         <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
           <MonthlyCalendarGenerator 
             initialBoatId={activeProcessingBoatId}
             initialDate={`${calMonth}-01`}
             autoExport={true}
             onExport={(base64) => {
                handleCalendarExported(base64);
             }}
           />
         </div>
      )}

    </div>
  );
}
