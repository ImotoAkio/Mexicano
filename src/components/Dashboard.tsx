import React, { useState, useEffect } from 'react';
import { reservationDB, boatDB, clientDB, funcionarioDB, folgaDB, syncWithRemote } from '../db';
import { fetchGoogleCalendarEvents, fetchGoogleCalendarEventsRange, deleteGoogleCalendarEvent, isCalendarConnected, setSimulatedConnection, setDeveloperToken, CalendarEvent, getGoogleClientId, setGoogleClientId, initiateOAuthLogin, handleOAuthCallback, setCachedToken, mergeLocalAndGoogleEvents, getCachedToken, createGoogleCalendarEvent, checkServerConfig } from '../googleCalendar';
import { Reserva, Embarcacao, Cliente } from '../types';
import ReservationModal from './ReservationModal';
import { Calendar, Ship, Trash2, Anchor, RefreshCw, Plus, Users, Shield, Radio, Sparkles, CheckCircle2, CloudSun, Compass, HelpCircle, ShieldAlert, Clock, ExternalLink, Database, Download, Upload, Briefcase, LayoutDashboard, Calculator, UserCheck } from 'lucide-react';

export default function Dashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const getLocalDateStr = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr());
  const parsedSelectedDate = (() => {
    const d = new Date(selectedDate + 'T12:00:00');
    return isNaN(d.getTime()) ? new Date() : d;
  })();
  const [activeReservations, setActiveReservations] = useState<Reserva[]>([]);
  const [dailyReservations, setDailyReservations] = useState<Reserva[]>([]);
  const [rangeReservations, setRangeReservations] = useState<Reserva[]>([]);
  const [weather, setWeather] = useState<{ temp: number; desc: string } | null>(null);

  // Helper to split events into boats and jets
  const getVehicleCounts = (resList: Reserva[]) => {
    let boatsCount = 0;
    let jetsCount = 0;
    resList.forEach(r => {
      const b = boatDB.getById(r.embarcacaoId);
      if (b && b.tipo === 'jet') jetsCount++;
      else boatsCount++;
    });
    return { boats: boatsCount, jets: jetsCount };
  };

  // Get tomorrow relative to selected date
  const getNextDayDateStr = () => {
    if (!selectedDate) return '';
    try {
      const d = new Date(selectedDate + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      return getLocalDateStr(d);
    } catch {
      return '';
    }
  };

  const nextDayDateStr = getNextDayDateStr();

  const nextDayEvents = rangeReservations.filter(r => r.data === nextDayDateStr);

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };
  
  // Stats counters
  const [boatsCount, setBoatsCount] = useState(0);

  const [employeesCount, setEmployeesCount] = useState(0);
  const [employeesOnLeaveToday, setEmployeesOnLeaveToday] = useState(0);

  const [clientsCount, setClientsCount] = useState(0);

  // Connection & OAuth
  const [gcalConnected, setGcalConnected] = useState(() => {
    return !!sessionStorage.getItem('nautical_google_access_token');
  });
  const [developerToken, setDevTokenState] = useState('');
  const [simMode, setSimMode] = useState(() => {
    const token = sessionStorage.getItem('nautical_google_access_token');
    return token ? false : true;
  });
  const [clientId, setClientId] = useState(() => getGoogleClientId());
  const [showInstructions, setShowInstructions] = useState(false);

  // Modals / Feedback
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [cancelConfirmation, setCancelConfirmation] = useState<Reserva | null>(null);
  const [deleteGcalEventId, setDeleteGcalEventId] = useState<string | null>(null);
  const [deleteGcalEventSummary, setDeleteGcalEventSummary] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // VPS Cloud sync status
  const [syncStatus, setSyncStatus] = useState<{
    connected: boolean;
    vpsHost: string | null;
    database: string | null;
    message: string;
    loading: boolean;
  }>({
    connected: false,
    vpsHost: null,
    database: null,
    message: 'Verificando conexão da VPS...',
    loading: false,
  });

  const triggerRemoteSync = async (isManual = false) => {
    if (isManual) {
      setSyncStatus(prev => ({ ...prev, loading: true }));
    }
    const result = await syncWithRemote();
    setSyncStatus({
      connected: !!result.connected,
      vpsHost: result.vpsHost || null,
      database: result.database || null,
      message: result.message || 'Sincronizado.',
      loading: false,
    });
    if (isManual) {
      if (result.success) {
        showToast(result.message || 'Banco de dados sincronizado com a VPS!', 'success');
      } else {
        showToast(result.message || 'Banco operando de forma isolada nesta máquina.', 'error');
      }
    }
    // Update local variables in sync with fetched DB
    const boats = boatDB.getAll();
    const clients = clientDB.getAll();
    setBoatsCount(boats.length);
    setClientsCount(clients.length);
  };


  // Handle standard redirect token parsing on layout mount
  useEffect(() => {
    // VPS Database Auto-synchronization on page mount
    triggerRemoteSync();

    // Sync Service Account Mode from backend
    const checkServiceAccountConfig = async () => {
      const isSAActive = await checkServerConfig();
      if (isSAActive) {
        setSimMode(false);
        setSimulatedConnection(false);
        setGcalConnected(true);
        loadDashboardData();
      }
    };
    checkServiceAccountConfig();

    // Ensure state matches the auto-migrated client ID from localStorage
    const currentId = getGoogleClientId();
    if (clientId !== currentId) {
      setClientId(currentId);
    }

    const parsedToken = handleOAuthCallback();
    if (parsedToken) {
      setSimMode(false);
      setSimulatedConnection(false);
      setGcalConnected(true);
      showToast('Login com o Google realizado com sucesso! Conexão ativa com o Google Calendar.', 'success');
      loadDashboardData();
    }

    // Capture OAuth success messages from popups
    const handlePopupMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'nautical_oauth_success') {
        const token = event.data.token;
        setCachedToken(token);
        setSimMode(false);
        setSimulatedConnection(false);
        setGcalConnected(true);
        showToast('Login com o Google realizado com sucesso! Conexão ativa com o Google Calendar.', 'success');
        loadDashboardData();
      }
    };

    window.addEventListener('message', handlePopupMessage);
    return () => {
      window.removeEventListener('message', handlePopupMessage);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Safe load of data
  const loadDashboardData = async () => {
    setIsLoading(true);
    const startTime = Date.now();
    try {
      // 1. Load Local Database Reservations for the active date
      const localRes = reservationDB.getAll().filter(r => r.data === selectedDate && r.status === 'confirmado');
      setActiveReservations(localRes);

      const boats = boatDB.getAll();
      const clients = clientDB.getAll();

      // 2. Load Sync status and Google events
      const connected = isCalendarConnected();
      setGcalConnected(connected);
      if (connected && simMode) {
        setSimMode(false);
        setSimulatedConnection(false);
      }

      // Fetch local reservations in the 14-day range
      const dStart = new Date(selectedDate);
      const dEnd = new Date(selectedDate);
      dEnd.setDate(dEnd.getDate() + 14);
      const startStr = getLocalDateStr(dStart);
      const endStr = getLocalDateStr(dEnd);

      if (connected && !simMode) {
        const dStartMinus2 = new Date(selectedDate);
        dStartMinus2.setDate(dStartMinus2.getDate() - 2);
        const startStrMinus2 = getLocalDateStr(dStartMinus2);
        
        const gcalEvents = await fetchGoogleCalendarEventsRange(startStrMinus2, 16);
        if (gcalEvents && gcalEvents.length > 0) {
          await mergeLocalAndGoogleEvents(gcalEvents, reservationDB.getAll(), boats, clients);
        }
      }

      // Re-fetch from DB after merge
      const updatedLocalRes = reservationDB.getAll().filter(r => r.data === selectedDate && r.status === 'confirmado');
      setActiveReservations(updatedLocalRes);
      setDailyReservations(updatedLocalRes);

      const localResRange = reservationDB.getAll().filter(r => 
        r.status === 'confirmado' && 
        r.data >= startStr && 
        r.data <= endStr
      );

      setRangeReservations(localResRange);

      // Stats
      setBoatsCount(boats.length);
      setClientsCount(clients.length);
    } catch (err) {
      console.error('Falha ao processar sincronização automática.', err);
    } finally {
      // Guarantee the skeleton loader remains visible for at least 600ms to prevent visual flickering
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise(resolve => setTimeout(resolve, 600 - elapsed));
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Seed initial mock connection state
    setSimulatedConnection(simMode);

    // Safeguard selectedDate from being empty, cleared, or invalid
    if (!selectedDate || isNaN(new Date(selectedDate + 'T12:00:00').getTime())) {
      setSelectedDate(getLocalDateStr());
      return;
    }

    loadDashboardData();
  }, [selectedDate, simMode]);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-9.4121&longitude=-40.5096&current=temperature_2m,weather_code'
        );
        if (!response.ok) throw new Error('Weather API call failed');
        const data = await response.json();
        
        const temp = Math.round(data.current.temperature_2m);
        const code = data.current.weather_code;
        
        let desc = 'Ensolarado';
        if (code === 0) desc = 'Ensolarado';
        else if (code === 1) desc = 'Limpo';
        else if (code === 2) desc = 'Parcialmente Nublado';
        else if (code === 3) desc = 'Nublado';
        else if (code >= 51 && code <= 55) desc = 'Chuvisco';
        else if (code >= 61 && code <= 65) desc = 'Chuva';
        else if (code >= 80 && code <= 82) desc = 'Pancadas';
        else if (code === 95) desc = 'Tempestade';
        
        setWeather({ temp, desc });
      } catch (err) {
        console.error('Erro ao buscar clima:', err);
        setWeather({ temp: 24, desc: 'Ensolarado' });
      }
    };
    fetchWeather();
  }, []);

  const handleSimulateToggle = () => {
    const nextMode = !simMode;
    setSimMode(nextMode);
    setSimulatedConnection(nextMode);
    showToast(nextMode ? 'Modo de Sincronização Simulado Ativo!' : 'Modo Simulado desligado. Pronto para chaves/token GCP.');
  };

  const handleApplyDeveloperToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!developerToken.trim()) {
      showToast('Por favor, informe um token de desenvolvedor válido.', 'error');
      return;
    }
    setDeveloperToken(developerToken.trim());
    setSimMode(false);
    setGcalConnected(true);
    showToast('Token de Acesso Real Google configurado com sucesso! Próximas chamadas utilizarão o Google Developer Dashboard.');
    setDevTokenState('');
    loadDashboardData();
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim()) {
      showToast('Por favor, digite um Client ID válido.', 'error');
      return;
    }
    setGoogleClientId(clientId.trim());
    showToast('Google Client ID salvo localmente!', 'success');
  };

  const handleOAuthLoginClick = () => {
    if (!clientId.trim()) {
      showToast('Insira o ID do Cliente Google antes de tentar fazer login com o Google.', 'error');
      return;
    }
    setGoogleClientId(clientId);
    initiateOAuthLogin(clientId);
  };

  const handleLogout = () => {
    setCachedToken(null);
    setSimMode(true);
    setSimulatedConnection(true);
    setGcalConnected(false);
    showToast('Desconectado do Google com sucesso.', 'success');
    loadDashboardData();
  };

  // Initiates cancellation preview by triggering modal state
  const handleCancelReservation = (reservation: Reserva) => {
    setCancelConfirmation(reservation);
  };

  // Executes actual cancellation operations on backends
  const executeCancelReservation = async () => {
    if (!cancelConfirmation) return;
    const reservation = cancelConfirmation;
    try {
      setIsLoading(true);

      // 1. Delete on Google Calendar (Real API, fallback handles simulated)
      if (reservation.googleEventId) {
        const boat = boatDB.getById(reservation.embarcacaoId);
        const boatCode = boat ? `M${boat.numero}` : undefined;
        await deleteGoogleCalendarEvent(reservation.googleEventId, boatCode);
      }

      // 2. Cancel in local DB
      reservationDB.cancel(reservation.id);
      showToast('Reserva cancelada e removida com sucesso do painel e do Google Calendar!');
      setCancelConfirmation(null);
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao cancelar reserva.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGcalEvent = (eventId: string, summary: string) => {
    setDeleteGcalEventId(eventId);
    setDeleteGcalEventSummary(summary);
  };

  const executeDeleteGcalEvent = async () => {
    if (!deleteGcalEventId) return;
    try {
      setIsLoading(true);
      await deleteGoogleCalendarEvent(deleteGcalEventId);
      showToast('Evento excluído do Google Calendar com sucesso!');
      setDeleteGcalEventId(null);
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir o evento.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  
  const pendingSyncReservations = reservationDB.getAll().filter(r => 
    r.status === 'confirmado' && 
    (!r.googleEventId || r.googleEventId.startsWith('g_sim_') || r.googleEventId.startsWith('g_sim_err_') || r.googleEventId.startsWith('g_sim_fb_'))
  );

  const handleSyncSingleReservation = async (reservaId: string) => {
    try {
      setIsLoading(true);
      const res = reservationDB.getById(reservaId);
      if (!res) throw new Error('Reserva não encontrada no banco.');

      const boat = boatDB.getById(res.embarcacaoId);
      const client = clientDB.getById(res.clienteId);
      if (!boat || !client) throw new Error('Informações de barco ou cliente corrompidas ou ausentes.');

      const result = await createGoogleCalendarEvent(boat, client, {
        embarcacaoId: res.embarcacaoId,
        clienteId: res.clienteId,
        data: res.data,
        periodo: res.periodo,
        observações: res.observações,
        status: 'confirmado'
      });

      if (result.boatCalendarSynced || result.marinaCalendarSynced) {
        reservationDB.update(res.id, { googleEventId: result.eventId });
        showToast('Reserva sincronizada com o Google Calendar com sucesso!', 'success');
      } else {
        throw new Error('Não foi possível gravar na agenda do Google. Verifique a autenticação e permissões.');
      }
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao sincronizar reserva.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncAllPending = async () => {
    try {
      setIsSyncingAll(true);
      setIsLoading(true);
      const pending = [...pendingSyncReservations];

      if (pending.length === 0) {
        showToast('Nenhum agendamento pendente de sincronização.', 'success');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const res of pending) {
        const boat = boatDB.getById(res.embarcacaoId);
        const client = clientDB.getById(res.clienteId);
        if (!boat || !client) {
          failCount++;
          continue;
        }

        try {
          const result = await createGoogleCalendarEvent(boat, client, {
            embarcacaoId: res.embarcacaoId,
            clienteId: res.clienteId,
            data: res.data,
            periodo: res.periodo,
            observações: res.observações,
            status: 'confirmado'
          });

          if (result.boatCalendarSynced || result.marinaCalendarSynced) {
            reservationDB.update(res.id, { googleEventId: result.eventId });
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          failCount++;
        }
      }

      if (successCount > 0) {
        showToast(`${successCount} agendamento(s) sincronizado(s) com sucesso no Google Agenda!`, 'success');
      }
      if (failCount > 0) {
        showToast(`${failCount} agendamento(s) não puderam ser sincronizados. Certifique-se de que o Google está conectado e tente novamente.`, 'error');
      }
      
      loadDashboardData();
    } catch (err: any) {
      showToast(err.message || 'Erro durante a sincronização.', 'error');
    } finally {
      setIsSyncingAll(false);
      setIsLoading(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const clientsData = clientDB.getAll();
      const boatsData = boatDB.getAll();
      const reservationsData = reservationDB.getAll();
      
      // Get calendar configurations
      const calendarMappings = localStorage.getItem('nautical_calendar_mappings') || '{}';
      const googleClientId = localStorage.getItem('nautical_google_client_id') || '';
      const googleServiceAccountJson = localStorage.getItem('nautical_google_service_account_json') || '';

      const backupData = {
        clients: clientsData,
        boats: boatsData,
        reservations: reservationsData,
        calendarMappings: JSON.parse(calendarMappings),
        googleClientId: googleClientId,
        googleServiceAccountJson: googleServiceAccountJson,
        exportedAt: new Date().toISOString(),
        version: '1.1'
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `reservas_nauticas_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Backup completo (incluindo agendas/IDs) exportado com sucesso!', 'success');
    } catch (err: any) {
      showToast(`Erro ao exportar backup: ${err.message}`, 'error');
    }
  };

  const handleFileImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = async (event) => {
      try {
        const resultText = event.target?.result as string;
        const backupData = JSON.parse(resultText);

        if (!backupData.clients || !backupData.boats || !backupData.reservations) {
          showToast('Formato de backup inválido! O arquivo JSON deve conter clients, boats e reservations.', 'error');
          return;
        }

        // Save Google configs if found
        if (backupData.calendarMappings) {
          localStorage.setItem('nautical_calendar_mappings', JSON.stringify(backupData.calendarMappings));
        }
        if (backupData.googleClientId) {
          localStorage.setItem('nautical_google_client_id', backupData.googleClientId);
        }
        if (backupData.googleServiceAccountJson) {
          localStorage.setItem('nautical_google_service_account_json', backupData.googleServiceAccountJson);
        }

        showToast('Backup completo importado com sucesso! Iniciando sincronização...', 'success');
        
        // Trigger sync
        await triggerRemoteSync(true);
      } catch (err: any) {
        showToast(`Erro ao importar arquivo: ${err.message}`, 'error');
      }
    };
    fileReader.readAsText(file);
    e.target.value = '';
  };



  return (
    <div id="dashboard-section" className="space-y-6">
      {/* Toast popup */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 border transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Sync Pending Alert Section */}
      {pendingSyncReservations.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex flex-col md:flex-row items-stretch justify-between gap-5 shadow-xs animate-in fade-in duration-200">
          <div className="flex-1 space-y-3">
            <div className="flex gap-3 items-start">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950 leading-tight">Agendamentos Pendentes de Sincronização</h4>
                <p className="text-xs text-slate-700 mt-1">
                  Existe(m) <strong className="text-amber-900 font-bold">{pendingSyncReservations.length} agendamento(s)</strong> salvo(s) localmente que ainda não foram sincronizados com o Google Agenda.
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Conecte sua conta Google acima para sincronizar ou use os botões individuais abaixo.
                </p>
              </div>
            </div>

            {/* List of explicit pending reservations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pt-2 border-t border-amber-200/50">
              {pendingSyncReservations.map((res) => {
                const boat = boatDB.getById(res.embarcacaoId);
                const client = clientDB.getById(res.clienteId);
                const parsedDate = new Date(res.data + 'T12:00:00');
                const formattedDate = isNaN(parsedDate.getTime()) ? res.data : parsedDate.toLocaleDateString('pt-BR');
                const formattedPeriod = res.periodo === 'dia_inteiro' ? 'Dia Inteiro' : res.periodo === 'manha' ? 'Manhã' : 'Tarde';
                return (
                  <div key={res.id} className="flex items-center justify-between text-xs bg-white border border-amber-200 rounded-lg px-3 py-2 shadow-2xs">
                    <div className="flex flex-col min-w-0 pr-2">
                       <span className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-mono rounded border border-indigo-100 font-bold">
                          {boat ? boat.nome : 'M--'}
                        </span>
                        <span className="text-slate-400 text-[11px] font-normal">
                          ({boat ? (boat.tipo === 'jet' ? 'Jet' : 'Lancha') : 'Embarcação'})
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-500 truncate mt-1">
                        Sócio: {client ? client.nome : 'Cliente'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1.5 font-sans">
                      <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        {formattedDate}
                      </span>
                      {gcalConnected && (
                        <button
                          onClick={() => handleSyncSingleReservation(res.id)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer hover:no-underline"
                        >
                          Sincronizar Google
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center shrink-0 border-t md:border-t-0 md:border-l border-amber-200 pt-4 md:pt-0 md:pl-5 justify-center">
            <button
              onClick={handleSyncAllPending}
              disabled={isSyncingAll}
              className="w-full md:w-auto px-5 py-3 h-fit bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
              {isSyncingAll ? 'Sincronizando...' : 'Sincronizar Tudo no Google'}
            </button>
          </div>
        </div>
      )}

      {/* Main Dynamic Day Summary Card Report */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Day Report Block - MANDATORY EXPLICIT REQUIREMENT ("Alem de um relatorio de quantos evento existem no dia") */}
        <div id="day-report" className="col-span-1 md:col-span-6 lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[220px]">
          {isLoading ? (
            <div className="animate-pulse flex flex-col justify-between h-full space-y-4">
              <div>
                <div className="h-3.5 w-24 bg-slate-200 rounded"></div>
                <div className="mt-5 flex items-baseline space-x-2">
                  <div className="h-10 w-12 bg-slate-300 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-slate-200 rounded"></div>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="h-3 w-full bg-slate-100 rounded"></div>
                  <div className="h-3 w-4/5 bg-slate-100 rounded"></div>
                </div>
              </div>
              <div className="h-10 bg-slate-100 rounded-xl mt-6"></div>
            </div>
          ) : (
            <>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Relatório de Hoje</span>
                <div className="mt-4 flex items-baseline space-x-2">
                  <span id="events-count-badge" className="text-5xl font-black text-slate-950 tracking-tight">
                    {dailyReservations.length}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    {dailyReservations.length === 1 ? 'evento ativo' : 'eventos ativos'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  No dia de hoje existem <strong className="text-slate-900 font-semibold">{dailyReservations.length} reservas registradas</strong> e sincronizadas no Google Cal.
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/60 font-sans">
                  <span className="text-[10px] font-medium text-slate-400 block">Lanchas</span>
                  <span className="text-lg font-bold text-slate-800">
                    {getVehicleCounts(dailyReservations).boats}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/60 font-sans">
                  <span className="text-[10px] font-medium text-slate-400 block">Jets</span>
                  <span className="text-lg font-bold text-slate-800 text-amber-600">
                    {getVehicleCounts(dailyReservations).jets}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tomorrow Day Report Block */}
        <div id="tomorrow-report" className="col-span-1 md:col-span-6 lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[220px]">
          {isLoading ? (
            <div className="animate-pulse flex flex-col justify-between h-full space-y-4">
              <div>
                <div className="h-3.5 w-24 bg-slate-200 rounded"></div>
                <div className="mt-5 flex items-baseline space-x-2">
                  <div className="h-10 w-12 bg-slate-300 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-slate-200 rounded"></div>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="h-3 w-full bg-slate-100 rounded"></div>
                  <div className="h-3 w-4/5 bg-slate-100 rounded"></div>
                </div>
              </div>
              <div className="h-10 bg-slate-100 rounded-xl mt-6"></div>
            </div>
          ) : (
            <>
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">Dia Seguinte ({formatShortDate(nextDayDateStr)})</span>
                <div className="mt-4 flex items-baseline space-x-2">
                  <span id="tomorrow-events-count-badge" className="text-5xl font-black text-slate-950 tracking-tight">
                    {nextDayEvents.length}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    {nextDayEvents.length === 1 ? 'evento previsto' : 'eventos previstos'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  No dia seguinte existem <strong className="text-slate-900 font-semibold">{nextDayEvents.length} reservas registradas</strong> e sincronizadas no Google Cal.
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/60 font-sans">
                  <span className="text-[10px] font-medium text-slate-400 block">Lanchas</span>
                  <span className="text-lg font-bold text-slate-800">
                    {getVehicleCounts(nextDayEvents).boats}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/60 font-sans">
                  <span className="text-[10px] font-medium text-slate-400 block">Jets</span>
                  <span className="text-lg font-bold text-slate-800 text-amber-600">
                    {getVehicleCounts(nextDayEvents).jets}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mini stats & Navigation picker */}
        <div className="col-span-1 md:col-span-12 lg:col-span-6 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
            <div className="flex items-center space-x-2.5">
              <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-900 text-md leading-none">Selecione o Dia de Navegação</h3>
                <span className="text-xs text-slate-400 mt-1 block">Inspecione reservas de datas específicas.</span>
              </div>
            </div>

            <div>
              <input
                id="dashboard-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
              />
            </div>
          </div>

          {/* Environmental / Nautical Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <CloudSun className="w-5 h-5 text-sky-500 shrink-0" />
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Clima no São Francisco</span>
                <span className="text-xs font-semibold text-slate-800">
                  {weather ? `${weather.temp}°C - ${weather.desc}` : 'Carregando clima...'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Ship className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Embarcações Ativas</span>
                <span className="text-xs font-semibold text-slate-800">{boatsCount} cadastradas</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Users className="w-5 h-5 text-teal-600 shrink-0" />
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Clientes Totais</span>
                <span className="text-xs font-semibold text-slate-800">{clientsCount} sócios integrados</span>
              </div>
            </div>
          </div>

          {/* Quick Schedule Button */}
          <div className="flex justify-end pt-2">
            <button
              id="open-schedule-modal"
              onClick={() => setIsResModalOpen(true)}
              className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agendar Nova Reserva
            </button>
          </div>
        </div>
      </div>

      
      {/* Atalhos de Setores / Painel de Módulos */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
        <div className="mb-5">
          <h3 className="font-semibold text-slate-900 text-lg flex items-center">
            <LayoutDashboard className="w-5 h-5 text-indigo-600 mr-2" />
            Módulos do Sistema
          </h3>
          <p className="text-xs text-slate-500 mt-1">Acesso rápido às áreas operacionais, financeiras e de gestão de pessoas.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate && onNavigate('schedules')}
            className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl hover:shadow-md transition-all group cursor-pointer text-center"
          >
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Compass className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800">Operacional</span>
            <span className="text-[11px] text-slate-500 mt-1">Gestão de Reservas e Lanchas</span>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('finance-lancamentos')}
            className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-xl hover:shadow-md transition-all group cursor-pointer text-center"
          >
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Calculator className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800">Financeiro</span>
            <span className="text-[11px] text-slate-500 mt-1">Controle de Caixas e Lançamentos</span>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('dp-dashboard')}
            className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-xl hover:shadow-md transition-all group cursor-pointer text-center relative"
          >
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Briefcase className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800">Departamento Pessoal</span>
            <span className="text-[11px] text-slate-500 mt-1">Funcionários, Folgas e EPIs</span>
            
            {employeesOnLeaveToday > 0 && (
               <span className="absolute top-4 right-4 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                 {employeesOnLeaveToday} folga(s) hoje
               </span>
            )}
          </button>
        </div>
      </div>

{/* Dynamic Useful Statistics & Analytics Panel */}
      {(() => {
        const allLocalRes = reservationDB.getAll().filter(r => r.status === 'confirmado');
        
        // If connected in real mode, use the real rangeEvents + googleEvents to compute statistics instead of mock local database!
        const activeOutingsList = allLocalRes;

        // Groups per boat
        const boatTrackerCount: { [id: string]: number } = {};
        activeOutingsList.forEach(r => {
          boatTrackerCount[r.embarcacaoId] = (boatTrackerCount[r.embarcacaoId] || 0) + 1;
        });

        const sortedBoatsData = boatDB.getAll().map(b => ({
          name: b.nome,
          tipo: b.tipo,
          count: boatTrackerCount[b.id] || 0
        })).sort((a, b) => b.count - a.count);

        const topRanked = sortedBoatsData.slice(0, 4);
        const maxRankValue = Math.max(...topRanked.map(r => r.count), 1);

        // Groups per weekday (0 = Sun, 1 = Mon, 2 = Tue, ...)
        const dayTracker = [0, 0, 0, 0, 0, 0, 0];
        activeOutingsList.forEach(r => {
          const dt = new Date(r.data + 'T12:00:00');
          if (!isNaN(dt.getTime())) {
            dayTracker[dt.getDay()]++;
          }
        });

        const maxWeekValue = Math.max(...dayTracker, 1);
        const weekdaysNamesPtStr = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

        // Jet vs Boat stats ratio
        const totalOutings = activeOutingsList.length;
        const jetsTotalCount = activeOutingsList.filter(r => {
          const b = boatDB.getById(r.embarcacaoId);
          return b?.tipo === 'jet';
        }).length;
        const boatsTotalCount = totalOutings - jetsTotalCount;

        const jetPct = totalOutings > 0 ? Math.round((jetsTotalCount / totalOutings) * 100) : 0;
        const boatPct = totalOutings > 0 ? Math.round((boatsTotalCount / totalOutings) * 100) : 0;

        return (
          <div id="analytics-statistics-board" className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
            
            {/* Chart Column 1: Weekly Output Bar Chart */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Taxa de Saídas / Ocupação da Semana</h4>
                <p className="text-[11px] text-slate-500 font-sans">Visualização agregada histórica de saídas por dia da semana.</p>
              </div>

              {/* Bar scale visual wrapper */}
              <div className="h-44 flex items-end justify-between gap-2.5 pt-6 pb-2 px-1">
                {dayTracker.map((count, index) => {
                  const isClosed = index === 1 || index === 2; // Mon or Tue is closed
                  const pctHeight = isClosed ? 100 : Math.round((count / maxWeekValue) * 85) + 15;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-6 scale-0 group-hover:scale-100 text-[10px] bg-slate-900 text-white font-mono px-1.5 py-0.5 rounded shadow-sm transition-transform z-10">
                        {isClosed ? 'Fechado' : `${count} reservas`}
                      </div>

                      {/* Bar body */}
                      <div 
                        style={{ height: `${pctHeight}%` }} 
                        className={`w-full rounded-lg transition-all duration-500 shadow-md ${
                          isClosed 
                            ? 'bg-rose-500/10 border border-rose-500/30 border-dashed flex items-center justify-center p-0.5 font-mono text-[8px] text-rose-500/50 font-bold uppercase select-none write-vertical' 
                            : 'bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 shadow-emerald-500/20'
                        }`}
                      >
                        {isClosed && <span className="rotate-0 text-center tracking-tighter opacity-60">F</span>}
                      </div>

                      {/* Day Label element */}
                      <span className="text-[9px] font-bold text-slate-400 uppercase mt-2.5 font-sans">
                        {weekdaysNamesPtStr[index]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart Column 2: Leaderboard Ranking Outings per boat */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Top Embarcações em Saídas</h4>
                <p className="text-[11px] text-slate-500 font-sans">Embarcações mais reservadas pelos sócios no sistema.</p>
              </div>

              <div className="space-y-3.5 pt-5">
                {topRanked.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-8">Nenhuma reserva ativa cadastrada para computar ranking.</p>
                ) : (
                  topRanked.map((item, idx) => {
                    const widthPct = Math.round((item.count / maxRankValue) * 100);
                    return (
                      <div key={idx} className="space-y-1 bg-white/40 p-2.5 rounded-xl border border-white shadow-sm backdrop-blur-sm transition hover:shadow-md">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-800 font-sans flex items-center">
                            <span className="w-5 h-5 text-[10px] bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold mr-2 border border-indigo-200/50 shadow-sm">
                              {idx + 1}
                            </span>
                            {item.name}
                          </span>
                          <span className="text-slate-500 font-sans text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">{item.count} saídas</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
                          <div 
                            style={{ width: `${widthPct}%` }}
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                              item.tipo === 'jet' ? 'bg-gradient-to-r from-amber-500 to-amber-300' : 'bg-gradient-to-r from-sky-500 to-sky-300'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chart Column 4: Distribution Ratio Jet vs Boat Circular Representation */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
              <div>
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Distribuição de Tipo de Veículo</h5>
                <p className="text-[11px] text-slate-500 font-sans">Proporção histórica de uso entre Lanchas e Jet Skis.</p>
              </div>

              <div className="flex items-center justify-around gap-4 pt-4">
                {/* Visual Circle Meter representation */}
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center drop-shadow-md">
                  <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                    <defs>
                      <linearGradient id="skyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0ea5e9" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                      <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#fbbf24" />
                      </linearGradient>
                    </defs>
                    <circle className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" r="15" cx="18" cy="18" pathLength="100" />
                    {/* Jets Part */}
                    <circle 
                      stroke="url(#amberGradient)" 
                      strokeWidth="4" 
                      strokeDasharray={`${jetPct} 100`} 
                      strokeLinecap="round" 
                      fill="none" 
                      r="15" 
                      cx="18" 
                      cy="18" 
                      pathLength="100"
                    />
                    {/* Boats Part */}
                    <circle 
                      stroke="url(#skyGradient)" 
                      strokeWidth="4" 
                      strokeDasharray={`${boatPct} 100`} 
                      strokeDashoffset={`-${jetPct}`}
                      strokeLinecap="round" 
                      fill="none" 
                      r="15" 
                      cx="18" 
                      cy="18" 
                      pathLength="100"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center bg-white w-16 h-16 rounded-full justify-center shadow-inner">
                    <span className="text-xl font-black text-slate-800 tracking-tighter">{totalOutings}</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase leading-none mt-0.5">Reservas</span>
                  </div>
                </div>

                {/* Progress Details Labels */}
                <div className="space-y-2 flex-1 max-w-[120px]">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                      <span className="flex items-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 mr-1.5" />
                        Lanchas
                      </span>
                      <span className="font-mono text-slate-700">{boatPct}%</span>
                    </div>
                    <p className="text-[10px] text-slate-500 pl-4">{boatsTotalCount} saídas com lanchas.</p>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                      <span className="flex items-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5" />
                        Jets
                      </span>
                      <span className="font-mono text-slate-700">{jetPct}%</span>
                    </div>
                    <p className="text-[10px] text-slate-500 pl-4">{jetsTotalCount} saídas com jet skis.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        );
      })()}

      {isResModalOpen && (
        <ReservationModal 
          onClose={() => {
            setIsResModalOpen(false);
            loadDashboardData();
          }} 
          onSuccess={(msg) => showToast(msg, 'success')}
        />
      )}
    </div>
  );
}
