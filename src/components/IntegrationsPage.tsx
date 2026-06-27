import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  RefreshCw, 
  ShieldAlert, 
  MessageSquare,
  Smartphone,
  Search,
  UserCheck,
  UserX,
  Anchor,
  X,
  Zap,
  QrCode,
  LogOut,
  CalendarDays,
  CheckCircle,
  CheckCircle2
} from 'lucide-react';
import { Cliente } from '../types';
import { 
  initiateOAuthLogin, 
  isServiceAccountMode, 
  getServiceAccountEmail, 
  getCalendarMappings, 
  saveCalendarMappings, 
  fetchCalendarList, 
  saveGoogleServiceAccount, 
  getGoogleClientId, 
  setGoogleClientId,
  getCachedToken,
  setCachedToken,
  checkServerConfig,
} from '../googleCalendar';
import { boatDB, clientDB } from '../db';

export default function IntegrationsPage() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mappings state
  const [calendarMappings, setCalendarMappingsState] = useState<Record<string, string>>({});
  const [isGCalModalOpen, setIsGCalModalOpen] = useState(false);
  const [bulkMappingsInput, setBulkMappingsInput] = useState<string>('');

  // Google OAuth Configs
  const [clientId, setClientId] = useState('');
  const [gcalConnected, setGcalConnected] = useState(false);
  const [saJsonInput, setSaJsonInput] = useState('');

  // WhatsApp States
  const [activeTab, setActiveTab] = useState<'conta' | 'contatos' | 'grupos'>('conta');
  const [waStatus, setWaStatus] = useState<string>('loading');
  const [waQrCode, setWaQrCode] = useState<string | null>(null);
  const [isFetchingWaStatus, setIsFetchingWaStatus] = useState(false);

  // WhatsApp Contacts Sync States
  const [clients, setClients] = useState<Cliente[]>([]);
  const setClientsFiltered = (allClients: Cliente[]) => {
    setClients(allClients.filter(c => !c.nome.toLowerCase().includes('mexicano lanchas')));
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [isSAMode, setIsSAMode] = useState(isServiceAccountMode());

  useEffect(() => {
    setClientId(getGoogleClientId());
    setGcalConnected(!!getCachedToken());
    
    const mappings = getCalendarMappings();
    setCalendarMappingsState(mappings);
    const bulkLines = Object.entries(mappings).map(([k, v]) => `${k} = ${v}`).join('\n');
    setBulkMappingsInput(bulkLines);

    setClientsFiltered(clientDB.getAll());
    setBoats(boatDB.getAll());
    fetchWaStatus();

    // Verify service account config asynchronously on mount
    checkServerConfig().then(isActive => {
      setIsSAMode(isActive);
    });
  }, []);

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

  const handleSaveServiceAccount = async () => {
    const raw = saJsonInput.trim();
    if (!raw) {
      showToast('Cole o JSON da Conta de Serviço', 'error');
      return;
    }
    setIsLoading(true);
    const result = await saveGoogleServiceAccount(raw);
    setIsLoading(false);
    if (result.success) {
      showToast(result.message);
      setSaJsonInput('');
      const isActive = await checkServerConfig();
      setIsSAMode(isActive);
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleSaveBulkMappings = () => {
    const lines = bulkMappingsInput.split('\n');
    const parsed: Record<string, string> = {};
    lines.forEach(line => {
      const idx = line.indexOf('=');
      if (idx !== -1) {
        const key = line.substring(0, idx).trim().toLowerCase();
        const val = line.substring(idx + 1).trim();
        if (key && val) parsed[key] = val;
      }
    });
    saveCalendarMappings(parsed);
    setCalendarMappingsState(parsed);
    showToast('Mapeamentos salvos com sucesso!');
    setIsGCalModalOpen(false);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 border transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Hero Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Integrações de Sistema</h2>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie conexões do Google Calendar e serviços do WhatsApp da plataforma.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GOOGLE CALENDAR SIMPLE CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-5 flex items-center justify-between bg-slate-50 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Google Calendar</h3>
                <p className="text-[10px] text-slate-500">Sincronização de agendas</p>
              </div>
            </div>
            {isSAMode ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider">
                CONTA DE SERVIÇO ATIVA
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase">
                Desconectado
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            {!isSAMode ? (
              <div className="space-y-3">
                <label className="block text-[11px] uppercase font-bold text-slate-500 font-mono">Credenciais JSON da Conta de Serviço</label>
                <textarea
                  rows={3}
                  placeholder='{ "type": "service_account", "project_id": "...", "private_key": "...", ... }'
                  value={saJsonInput}
                  onChange={(e) => setSaJsonInput(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-3 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSaveServiceAccount}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  {isLoading ? 'Salvando...' : 'Salvar JSON e Conectar'}
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-xs text-emerald-800 space-y-2">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Conexão operando normalmente.
                </p>
                <p className="text-[10px] font-mono opacity-80 pl-6 select-all">{getServiceAccountEmail()}</p>
              </div>
            )}
            
            <button
              onClick={() => setIsGCalModalOpen(true)}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4 text-slate-400" />
              Configurar Mapeamento de Agendas
            </button>
          </div>
        </div>

        {/* GOOGLE CALENDAR MODAL */}
        {isGCalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Mapeamento de Agendas</h3>
                  <p className="text-[10px] text-slate-500">Defina os IDs do Google Calendar (formato: código = ID)</p>
                </div>
                <button onClick={() => setIsGCalModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5">
                <textarea
                  rows={8}
                  value={bulkMappingsInput}
                  onChange={(e) => setBulkMappingsInput(e.target.value)}
                  placeholder="marina = id_marina&#10;m30 = id_m30"
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-3 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setIsGCalModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200">Cancelar</button>
                <button onClick={handleSaveBulkMappings} className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700">Salvar Mapeamento</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* CENTRALIZED WHATSAPP SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-100 bg-emerald-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">WhatsApp Evolution API</h3>
              <p className="text-xs text-slate-500">Central de comunicação, grupos e disparo de imagens</p>
            </div>
          </div>
        </div>

        {/* TABS */}
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
    </div>
  );
}
