import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass, CalendarDays, CheckCircle2, X, CreditCard, Key, Shield,
  ShieldCheck, AlertTriangle, RefreshCw, MessageSquare, QrCode, Loader2, Check
} from 'lucide-react';
import { io } from 'socket.io-client';
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

  // Asaas Configs
  const [asaasApiKey, setAsaasApiKey] = useState('');
  const [asaasApiUrl, setAsaasApiUrl] = useState('https://api-sandbox.asaas.com/v3');
  const [asaasWebhookToken, setAsaasWebhookToken] = useState('');
  const [hasAsaasApiKey, setHasAsaasApiKey] = useState(false);

  // Status de pagamentos online (com cache local imediato para evitar pulo de estado ao recarregar)
  const [pagamentosHabilitados, setPagamentosHabilitados] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('pagamentos_online_habilitado_cache');
      return cached === 'true';
    } catch {
      return false;
    }
  });
  const [isSavingPagamentos, setIsSavingPagamentos] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingToggleStatus, setPendingToggleStatus] = useState<boolean | null>(null);

  // Marina Configs
  const [checkinAntecedencia, setCheckinAntecedencia] = useState('40');

  // Per-day-of-week schedule: keys 0-6 = Sunday-Saturday (JS Date.getDay())
  const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const DEFAULT_SCHEDULE: Record<string, { abertura: string; fechamento: string; checkinSaida: string; checkinChegada: string }> = {
    '0': { abertura: '09:00', fechamento: '19:00', checkinSaida: '09:00', checkinChegada: '19:00' },
    '1': { abertura: '08:00', fechamento: '18:00', checkinSaida: '09:00', checkinChegada: '17:00' },
    '2': { abertura: '08:00', fechamento: '18:00', checkinSaida: '09:00', checkinChegada: '17:00' },
    '3': { abertura: '08:00', fechamento: '18:00', checkinSaida: '09:00', checkinChegada: '17:00' },
    '4': { abertura: '08:00', fechamento: '18:00', checkinSaida: '09:00', checkinChegada: '17:00' },
    '5': { abertura: '08:00', fechamento: '18:00', checkinSaida: '09:00', checkinChegada: '17:00' },
    '6': { abertura: '09:00', fechamento: '19:00', checkinSaida: '09:00', checkinChegada: '19:00' },
  };
  const [horariosSemana, setHorariosSemana] = useState(DEFAULT_SCHEDULE);

  const updateDaySchedule = (day: string, field: string, value: string) => {
    setHorariosSemana(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [isSAMode, setIsSAMode] = useState(isServiceAccountMode());

  const loadServerConfigs = useCallback(async (showNotification = false) => {
    setIsConfigLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setIsConfigLoading(false);
        return;
      }

      const res = await fetch('/api/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });

      if (!res.ok) {
        console.warn('Erro ao carregar configurações do servidor:', res.status);
        if (showNotification) showToast('Não foi possível verificar status com o servidor.', 'error');
        setIsConfigLoading(false);
        return;
      }

      const data = await res.json();
      if (data && !data.error) {
        setHasAsaasApiKey(!!data.has_asaas_api_key);
        setAsaasApiUrl(data.asaas_api_url || 'https://api-sandbox.asaas.com/v3');
        setAsaasWebhookToken(data.asaas_webhook_token || '');

        const isHabilitado = !!data.pagamentos_online_habilitado;
        setPagamentosHabilitados(isHabilitado);
        try {
          localStorage.setItem('pagamentos_online_habilitado_cache', String(isHabilitado));
        } catch {}
        const nowStr = new Date().toLocaleTimeString('pt-BR');
        setLastSavedTimestamp(nowStr);

        if (data.marina_checkin_antecedencia) setCheckinAntecedencia(data.marina_checkin_antecedencia);
        if (data.marina_horarios_semana) {
          setHorariosSemana(prev => ({ ...prev, ...data.marina_horarios_semana }));
        }
        if (data.has_asaas_api_key) {
          setAsaasApiKey('__UNCHANGED__');
        }
        if (showNotification) {
          showToast(`Status sincronizado com o banco de dados (${nowStr})!`, 'success');
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar configurações:', err);
      if (showNotification) showToast('Erro de conexão ao verificar status no servidor.', 'error');
    } finally {
      setIsConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    setClientId(getGoogleClientId());
    setGcalConnected(!!getCachedToken());

    const mappings = getCalendarMappings();
    setCalendarMappingsState(mappings);
    const bulkLines = Object.entries(mappings).map(([k, v]) => `${k} = ${v}`).join('\n');
    setBulkMappingsInput(bulkLines);

    // Verify service account config asynchronously on mount
    checkServerConfig().then(isActive => {
      setIsSAMode(isActive);
    });

    // Fetch config status on mount
    loadServerConfigs(false);

    // Socket.io real-time listener for updates
    let socket: any;
    try {
      socket = io('/', { path: '/socket.io' });
      socket.on('config_updated', (data: any) => {
        if (data && data.pagamentos_online_habilitado !== undefined) {
          const val = !!data.pagamentos_online_habilitado;
          setPagamentosHabilitados(val);
          try {
            localStorage.setItem('pagamentos_online_habilitado_cache', String(val));
          } catch {}
          setLastSavedTimestamp(new Date().toLocaleTimeString('pt-BR'));
        }
      });
    } catch (e) {
      console.warn('Socket connection error in IntegrationsPage:', e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [loadServerConfigs]);

  const handleRequestTogglePagamentos = (targetValue?: boolean) => {
    const nextVal = targetValue !== undefined ? targetValue : !pagamentosHabilitados;
    setPendingToggleStatus(nextVal);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmTogglePagamentos = async () => {
    if (pendingToggleStatus === null) return;
    const next = pendingToggleStatus;
    setIsSavingPagamentos(true);
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        showToast('Sessão expirada. Faça login novamente.', 'error');
        setIsConfirmModalOpen(false);
        return;
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const res = await fetch('/api/config', {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify({ pagamentos_online_habilitado: next })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.message || 'Falha ao atualizar status de pagamentos no servidor.', 'error');
      } else {
        setPagamentosHabilitados(next);
        try {
          localStorage.setItem('pagamentos_online_habilitado_cache', String(next));
        } catch {}
        const nowStr = new Date().toLocaleTimeString('pt-BR');
        setLastSavedTimestamp(nowStr);
        showToast(
          next
            ? 'Pagamentos online ativados e gravados com sucesso no banco de dados!'
            : 'Pagamentos online desativados. Clientes agora serão direcionados ao WhatsApp do financeiro.',
          'success'
        );
        setIsConfirmModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao conectar ao servidor.', 'error');
    } finally {
      setIsSavingPagamentos(false);
    }
  };

  const handleSaveAsaasConfig = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/config', {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify({
          asaas_api_key: asaasApiKey,
          asaas_api_url: asaasApiUrl,
          asaas_webhook_token: asaasWebhookToken,
          pagamentos_online_habilitado: pagamentosHabilitados
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Falha ao salvar configurações do Asaas.', 'error');
      } else {
        showToast('Configurações do Asaas salvas com sucesso!');
        setLastSavedTimestamp(new Date().toLocaleTimeString('pt-BR'));
        if (asaasApiKey && asaasApiKey !== '__UNCHANGED__') {
          setHasAsaasApiKey(true);
          setAsaasApiKey('__UNCHANGED__');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao conectar ao servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMarinaConfig = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/config', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          marina_checkin_antecedencia: checkinAntecedencia,
          marina_horarios_semana: horariosSemana
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.message || 'Falha ao salvar configurações', 'error');
      } else {
        showToast('Configurações da Marina salvas com sucesso!');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro de conexão.', 'error');
    } finally {
      setIsLoading(false);
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

        {/* ASAAS INTEGRATION CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-5 flex items-center justify-between bg-slate-50 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Integração Asaas</h3>
                <p className="text-[10px] text-slate-500">Cobranças por PIX, Boleto e Cartão</p>
              </div>
            </div>
            {hasAsaasApiKey ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider">
                CONECTADO
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase">
                Chave Pendente
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">

            {/* PAINEL DE CONTROLE DE PAGAMENTO E TRANSAÇÕES DO PORTAL */}
            <div className={`rounded-2xl p-4.5 border transition-all duration-300 ${
              pagamentosHabilitados
                ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30'
                : 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30'
            }`}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">
                    Modo do Portal do Cliente
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isConfigLoading ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                        Verificando servidor...
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        pagamentosHabilitados
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${pagamentosHabilitados ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        {pagamentosHabilitados ? 'PIX ATIVO NO PORTAL' : 'REDIRECIONAMENTO WHATSAPP'}
                      </span>
                    )}

                    <button
                      type="button"
                      title="Sincronizar status gravado no banco de dados agora"
                      onClick={() => loadServerConfigs(true)}
                      disabled={isConfigLoading || isSavingPagamentos}
                      className="p-1.5 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isConfigLoading ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    {pagamentosHabilitados ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Pagamentos Online via PIX Habilitados</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        <span>Pagamentos Online Desativados (WhatsApp)</span>
                      </>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {pagamentosHabilitados
                      ? 'Clientes visualizam o botão "Pagar com PIX" e geram o QR Code instantâneo diretamente pelo portal.'
                      : 'O botão de pagamento no portal do cliente foi substituído pelo encaminhamento direto para o WhatsApp do Financeiro (+55 87 9122-9333).'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    {lastSavedTimestamp ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>Gravado no MySQL às {lastSavedTimestamp}</span>
                      </>
                    ) : (
                      <span>Carregando persistência...</span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isSavingPagamentos || isConfigLoading}
                    onClick={() => handleRequestTogglePagamentos()}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                      pagamentosHabilitados
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    {isSavingPagamentos ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Gravando...</span>
                      </>
                    ) : pagamentosHabilitados ? (
                      <>
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Mudar para WhatsApp</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Habilitar PIX no Portal</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-2">
              <h5 className="font-bold text-blue-800 text-xs mb-2">Instruções de Configuração Asaas:</h5>
              <ol className="list-decimal list-inside text-[11px] text-blue-700/90 space-y-1.5 leading-relaxed">
                <li>Acesse sua conta no Asaas e vá em <strong>Configurações &gt; Integração &gt; API</strong> ou "Gerar API Key".</li>
                <li>Copie o "Access Token" e cole no campo <strong>API Key</strong> abaixo.</li>
                <li>Para o Webhook, vá em <strong>Integração &gt; Webhooks</strong> e crie um novo.</li>
                <li>Use o endpoint do servidor para <code>/api/webhook/asaas</code>.</li>
                <li>Marque os eventos <code>PAYMENT_RECEIVED</code> e <code>PAYMENT_CONFIRMED</code>.</li>
                <li>Configure um <strong>Token Autenticador</strong> (Token de Segurança) lá e preencha-o abaixo.</li>
              </ol>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Ambiente de Execução</label>
                <select
                  value={asaasApiUrl}
                  onChange={(e) => setAsaasApiUrl(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="https://api-sandbox.asaas.com/v3">Sandbox / Homologação (Testes)</option>
                  <option value="https://api.asaas.com/v3">Produção (Dinheiro Real)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">API Key do Asaas</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Key className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="password"
                    placeholder={hasAsaasApiKey ? "••••••••••••••••••••••••••••••••" : "Cole sua access_token do Asaas"}
                    value={asaasApiKey === '__UNCHANGED__' ? '' : asaasApiKey}
                    onChange={(e) => setAsaasApiKey(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                {hasAsaasApiKey && (
                  <p className="text-[9px] text-slate-400 mt-1">
                    * Uma chave de API já está salva. Deixe em branco se não quiser alterá-la.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Token de Segurança do Webhook</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Shield className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Configure um token para validação das chamadas do webhook"
                    value={asaasWebhookToken}
                    onChange={(e) => setAsaasWebhookToken(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveAsaasConfig}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors mt-2"
              >
                {isLoading ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        </div>

        {/* MARINA CONFIG CARD */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/50">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Regras de Operação da Marina</h3>
                <p className="text-[11px] text-slate-500 font-medium">Controle os horários de início e término das operações e check-ins.</p>
              </div>
            </div>
            {isLoading && <div className="text-[10px] uppercase font-bold text-slate-400 animate-pulse">Salvando...</div>}
          </div>

          <div className="p-6">
            <p className="text-xs text-slate-500 mb-4">Configure os horários de operação e check-in padrão para cada dia da semana.</p>

            {/* Per-day schedule table */}
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="text-left py-2 px-2 w-24">Dia</th>
                    <th className="text-center py-2 px-2">Abertura</th>
                    <th className="text-center py-2 px-2">Fechamento</th>
                    <th className="text-center py-2 px-2">Saída Check-in</th>
                    <th className="text-center py-2 px-2">Retorno Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <tr key={day} className={`border-t border-slate-100 ${day === 0 || day === 6 ? 'bg-amber-50/50' : ''}`}>
                      <td className="py-2 px-2">
                        <span className={`text-xs font-semibold ${day === 0 || day === 6 ? 'text-amber-700' : 'text-slate-700'}`}>
                          {DAY_LABELS[day]}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="time"
                          value={horariosSemana[String(day)]?.abertura || '08:00'}
                          onChange={(e) => updateDaySchedule(String(day), 'abertura', e.target.value)}
                          className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-center"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="time"
                          value={horariosSemana[String(day)]?.fechamento || '18:00'}
                          onChange={(e) => updateDaySchedule(String(day), 'fechamento', e.target.value)}
                          className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-center"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="time"
                          value={horariosSemana[String(day)]?.checkinSaida || '09:00'}
                          onChange={(e) => updateDaySchedule(String(day), 'checkinSaida', e.target.value)}
                          className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-center"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="time"
                          value={horariosSemana[String(day)]?.checkinChegada || '17:00'}
                          onChange={(e) => updateDaySchedule(String(day), 'checkinChegada', e.target.value)}
                          className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-center"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Antecedência (global, stays flat) */}
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-shrink-0">
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Antecedência Mínima (min)</label>
                <input
                  type="number"
                  min="0"
                  value={checkinAntecedencia}
                  onChange={(e) => setCheckinAntecedencia(e.target.value)}
                  className="w-28 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-4">Tempo mínimo de antecedência para o horário de saída no check-in do cliente.</p>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSaveMarinaConfig}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Aguarde...' : 'Salvar Configurações da Marina'}
              </button>
            </div>
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

        {/* MODAL DE CONFIRMAÇÃO E SEGURANÇA DE PAGAMENTOS ONLINE */}
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  pendingToggleStatus
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}>
                  {pendingToggleStatus ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {pendingToggleStatus
                      ? 'Habilitar Pagamentos Online (PIX no Portal)?'
                      : 'Desativar Pagamentos e Encaminhar ao WhatsApp?'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Esta alteração afeta imediatamente a experiência de todos os clientes no portal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isSavingPagamentos) {
                      setIsConfirmModalOpen(false);
                      setPendingToggleStatus(null);
                    }
                  }}
                  disabled={isSavingPagamentos}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                pendingToggleStatus
                  ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900'
                  : 'bg-amber-50/60 border-amber-100 text-amber-900'
              }`}>
                <p className="font-semibold">O que acontecerá após confirmar:</p>
                <ul className="space-y-1.5 text-[11px] opacity-90">
                  {pendingToggleStatus ? (
                    <>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        Clientes poderão gerar QR Code PIX instantaneamente no portal do cliente.
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        O Asaas processará e liquidará as cobranças de forma automatizada.
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        O status é gravado imediatamente e com segurança no banco de dados central (MySQL).
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">⚠</span>
                        O botão de pagamento no portal do cliente abrirá diretamente o WhatsApp do Financeiro (+55 87 9122-9333).
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">⚠</span>
                        Nenhuma cobrança PIX automática será gerada pelo portal até reativação.
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">⚠</span>
                        O status é gravado imediatamente e com segurança no banco de dados central (MySQL).
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSavingPagamentos}
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    setPendingToggleStatus(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSavingPagamentos}
                  onClick={handleConfirmTogglePagamentos}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
                    pendingToggleStatus
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  }`}
                >
                  {isSavingPagamentos ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gravando no Banco...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{pendingToggleStatus ? 'Confirmar e Habilitar' : 'Confirmar e Desativar'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>


    </div>
  );
}
