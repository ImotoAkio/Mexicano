import React, { useState, useEffect, useRef } from 'react';
import { reservationDB, boatDB, clientDB } from '../db';
import { 
  deleteGoogleCalendarEvent, 
  updateGoogleCalendarEvent,
  isCalendarConnected, 
  setSimulatedConnection, 
  setDeveloperToken, 
  getGoogleClientId, 
  setGoogleClientId, 
  initiateOAuthLogin, 
  handleOAuthCallback, 
  setCachedToken,
  createGoogleCalendarEvent,
  getCachedToken,
  checkServerConfig,
  isServiceAccountMode,
  getServiceAccountEmail,
  getCalendarMappings,
  saveCalendarMappings,
  fetchCalendarList,
  saveGoogleServiceAccount,
  fetchGoogleCalendarEventsRange
} from '../googleCalendar';
import { Reserva, Cliente } from '../types';
import ReservationModal from './ReservationModal';
import MonthlyCalendarGenerator from './MonthlyCalendarGenerator';
import { generateAvisoSaidaPDF } from '../utils/pdfGenerator';
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Anchor, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Search, 
  Sparkles, 
  ExternalLink, 
  Ship, 
  User, 
  CalendarDays, 
  ArrowRight,
  Info,
  Compass,
  HelpCircle,
  ClipboardList,
  CheckCircle,
  XCircle,
  FileDown,
  Printer,
  ShieldAlert,
  Wrench,
  AlertTriangle,
  Check
} from 'lucide-react';
import SearchableClientSelect from './shared/SearchableClientSelect';
import ScheduleCard from './Schedules/ScheduleCard';
import DeleteConfirmationModal from './Schedules/DeleteConfirmationModal';
import BulkWhatsAppModal from './Schedules/BulkWhatsAppModal';
import StatusModal from './Schedules/StatusModal';

export default function SchedulesPage() {
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
  const [isLoading, setIsLoading] = useState(false);
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Status Edit States
  const [statusModalEvent, setStatusModalEvent] = useState<Reserva | null>(null);
  const [editModalEvent, setEditModalEvent] = useState<Reserva | null>(null);
  const [editFormData, setEditFormData] = useState({
    clienteId: '',
    data: '',
    periodo: 'dia_inteiro' as 'dia_inteiro' | 'manha' | 'tarde',
    observacoes: ''
  });
  const [deleteGcalEventSummary, setDeleteGcalEventSummary] = useState('');

  // Resolution Modal States
  const [differences, setDifferences] = useState<SyncDifference[]>([]);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isVerifyingSync, setIsVerifyingSync] = useState(false);

  const [importClients, setImportClients] = useState<Record<string, string>>({});
  const [isResolvingId, setIsResolvingId] = useState<string | null>(null);

  // Sound system checklist control states
  const [somRetirado, setSomRetirado] = useState(false);
  const [somTesteSaida, setSomTesteSaida] = useState('nao_realizado');
  const [somTesteRetorno, setSomTesteRetorno] = useState('nao_realizado');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Agendado' | 'Confirmado' | 'Cancelado'>('Todos');
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'Lancha' | 'Jetski'>('Todos');

  const filterEvent = (res: Reserva) => {
    // 1. Status filter
    const stStr = res.status === 'confirmado' ? 'Confirmado' : res.status === 'cancelado' ? 'Cancelado' : 'Agendado';

    if (statusFilter !== 'Todos' && stStr !== statusFilter) {
      return false;
    }

    // 2. Type filter
    const boat = boatDB.getById(res.embarcacaoId);
    const boatType = boat ? (boat.tipo === 'jet' ? 'Jetski' : 'Lancha') : 'Lancha';
    
    if (typeFilter !== 'Todos' && boatType !== typeFilter) {
      return false;
    }

    // 3. Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const client = clientDB.getById(res.clienteId);
      
      const boatMatch = boat ? boat.nome.toLowerCase().includes(q) : false;
      const clientMatch = client ? client.nome.toLowerCase().includes(q) || (client.telefone && client.telefone.includes(q)) : false;
      const obsMatch = res.observações ? res.observações.toLowerCase().includes(q) : false;
      const dateMatch = res.data.includes(q);
      
      if (!boatMatch && !clientMatch && !obsMatch && !dateMatch) {
        return false;
      }
    }

    return true;
  };

  const filteredDailyReservations = dailyReservations.filter(filterEvent);
  const filteredRangeReservations = rangeReservations.filter(filterEvent);

  const openStatusModal = (res: Reserva) => {
    setStatusModalEvent(res);
  };

  const handleGeneratePDFForEvent = async (res: Reserva) => {
    try {
      const boat = boatDB.getById(res.embarcacaoId);
      const client = clientDB.getById(res.clienteId);
      const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome.split(' ')[0]) : 'M00';
      const boatType = boat ? (boat.tipo === 'jet' ? 'Jetski' : 'Lancha') : 'Lancha';
      let ownerName = client ? client.nome : 'Desconhecido';
      if (!client && res.observações?.includes('[NOME_RECUPERADO:')) {
        const match = res.observações.match(/\[NOME_RECUPERADO:(.*?)\]/);
        if (match) ownerName = match[1].trim();
      }

      let finalDate = res.data;
      if (finalDate.includes('-')) {
        const p = finalDate.split('-');
        finalDate = `${p[2]} / ${p[1]} / ${p[0]}`;
      }

      await generateAvisoSaidaPDF({
        data: finalDate,
        nome: ownerName,
        tipo: boatType,
        nomeEmbarcacao: boatCode,
        pessoasABordo: '02',
        destino: 'Iate Club - Rodeadouro',
        previsaoSaida: res.periodo === 'tarde' ? '13:00' : '08:00',
        previsaoChegada: res.periodo === 'manha' ? '13:00' : '18:00',
        observacao: res.observações || 'Nenhuma'
      });

      showToast('PDF "Aviso de Saída" gerado com sucesso!');
    } catch (error: any) {
      console.error(error);
      showToast('Erro ao gerar o PDF.', 'error');
    }
  };

  // Google Calendar Connection States
  const [clientId, setClientId] = useState(() => getGoogleClientId());
  const [simMode, setSimMode] = useState(() => {
    const token = sessionStorage.getItem('nautical_google_access_token');
    return token ? false : true;
  });
  const [gcalConnected, setGcalConnected] = useState(() => {
    return !!sessionStorage.getItem('nautical_google_access_token');
  });
  const [devTokenInput, setDevTokenInput] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [saJsonInput, setSaJsonInput] = useState('');

  const handleSaveServiceAccount = async () => {
    const trimmed = saJsonInput.trim();
    if (!trimmed) {
      showToast('Por favor, cole as credenciais JSON da sua Conta de Serviço.', 'error');
      return;
    }

    try {
      JSON.parse(trimmed); // Quick syntax validation
    } catch {
      showToast('O conteúdo fornecido não é um JSON válido. Verifique as credenciais e tente novamente.', 'error');
      return;
    }

    setIsLoading(true);
    const result = await saveGoogleServiceAccount(trimmed);
    setIsLoading(false);

    if (result.success) {
      showToast(result.message, 'success');
      setSaJsonInput('');
      setSimMode(false);
      setSimulatedConnection(false);
      setGcalConnected(true);
      loadScheduleData();
    } else {
      showToast(result.message, 'error');
    }
  };

  // Calendar ID mapping states
  const [showMappingsPanel, setShowMappingsPanel] = useState(false);
  const [calendarMappings, setCalendarMappingsState] = useState<Record<string, string>>(() => getCalendarMappings());
  const [bulkMappingsInput, setBulkMappingsInput] = useState('');
  const [selectedMapBoat, setSelectedMapBoat] = useState('');
  const [singleMapIdInput, setSingleMapIdInput] = useState('');

  // Auto-init bulk input when mappings change
  useEffect(() => {
    const textLines = Object.entries(calendarMappings)
      .map(([key, val]) => `${key} = ${val}`)
      .join('\n');
    setBulkMappingsInput(textLines);
  }, [calendarMappings]);

  const handleSaveBulkMappings = () => {
    const parsed: Record<string, string> = {};
    const lines = bulkMappingsInput.split('\n');
    lines.forEach(line => {
      const idx = line.indexOf('=');
      if (idx !== -1) {
        const key = line.substring(0, idx).trim().toLowerCase();
        const val = line.substring(idx + 1).trim();
        if (key && val) {
          parsed[key] = val;
        }
      }
    });

    saveCalendarMappings(parsed);
    setCalendarMappingsState(parsed);
    showToast('Mapeamentos de agendas do Google Calendar salvos com sucesso!', 'success');
  };

  const handleSaveSingleMapping = () => {
    if (!selectedMapBoat) {
      showToast('Por favor, selecione para qual agenda deseja mapear.', 'error');
      return;
    }
    const cleanId = singleMapIdInput.trim();
    if (!cleanId) {
      showToast('Por favor, informe um Google Calendar ID válido.', 'error');
      return;
    }

    const updated = { ...calendarMappings, [selectedMapBoat.toLowerCase()]: cleanId };
    saveCalendarMappings(updated);
    setCalendarMappingsState(updated);
    showToast(`Endereço da agenda para "${selectedMapBoat.toUpperCase()}" salvo com sucesso!`, 'success');
    setSingleMapIdInput('');
  };

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  
  const pendingSyncReservations = reservationDB.getAll().filter(r => {
    if (r.status !== 'confirmado') return false;
    const boat = boatDB.getById(r.embarcacaoId);
    const boatCode = boat ? boat.nome : '';
    if (boatCode.toUpperCase() === 'M04') return false;
    return (!r.googleEventId || r.googleEventId.startsWith('g_sim_') || r.googleEventId.startsWith('g_sim_err_') || r.googleEventId.startsWith('g_sim_fb_'));
  });

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
      loadScheduleData();
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
      
      loadScheduleData();
    } catch (err: any) {
      showToast(err.message || 'Erro durante a sincronização.', 'error');
    } finally {
      setIsSyncingAll(false);
      setIsLoading(false);
    }
  };

  const getEventPeriod = (evt: any): 'dia_inteiro' | 'manha' | 'tarde' => {
    const desc = (evt.description || '').toLowerCase();
    if (desc.includes('período: manhã') || desc.includes('periodo: manha') || desc.includes('período: manha')) return 'manha';
    if (desc.includes('período: tarde') || desc.includes('periodo: tarde')) return 'tarde';
    if (desc.includes('período: dia inteiro') || desc.includes('periodo: dia inteiro')) return 'dia_inteiro';
    if (evt.start?.dateTime) {
      const time = evt.start.dateTime.split('T')[1]?.substring(0, 5);
      if (time === '08:00') return 'manha';
      if (time === '13:00') return 'tarde';
    }
    return 'dia_inteiro';
  };

  const getEventObs = (evt: any): string => {
    const desc = evt.description || '';
    const match = desc.match(/Obs:\s*(.*)/i);
    return match ? match[1].trim() : '';
  };

  const isEventCancelled = (evt: any): boolean => {
    const summary = (evt.summary || '').toUpperCase();
    const desc = (evt.description || '').toLowerCase();
    return summary.includes('(CANCELADO)') || summary.includes('(CANCELADA)') || desc.includes('status: cancelado');
  };

  const handleVerifySync = async () => {
    setIsVerifyingSync(true);
    setIsLoading(true);
    try {
      if (!isCalendarConnected()) {
        showToast('Google Agenda não está conectado. Conecte-o nas configurações abaixo.', 'error');
        setIsLoading(false);
        setIsVerifyingSync(false);
        return;
      }

      const dStart = new Date(selectedDate + 'T12:00:00');
      dStart.setDate(dStart.getDate() - 7);
      const startStr = dStart.toISOString().split('T')[0];

      const dEnd = new Date(selectedDate + 'T12:00:00');
      dEnd.setDate(dEnd.getDate() + 60);
      const endStr = dEnd.toISOString().split('T')[0];

      const localReservations = reservationDB.getAll().filter(r => r.data >= startStr && r.data <= endStr);
      const gcalEvents = await fetchGoogleCalendarEventsRange(startStr, 68);

      const boats = boatDB.getAll();
      const clients = clientDB.getAll();

      const detectedDiffs: SyncDifference[] = [];
      const matchedEventIds = new Set<string>();

      // Normalize observations to avoid false conflicts
      const normalizeObs = (s: string) => {
        const cleanVal = s.trim().toLowerCase();
        if (
          cleanVal === '' ||
          cleanVal === 'nenhuma' ||
          cleanVal === 'nenhuma.' ||
          cleanVal === 'nenhuma observação' ||
          cleanVal === 'nenhuma observacao' ||
          cleanVal === 'nenhuma observação.' ||
          cleanVal === 'nenhuma observacao.' ||
          cleanVal === 'atualizado via google agenda' ||
          cleanVal === 'atualizado via google agenda.' ||
          cleanVal === 'nenhuma descrição relevante' ||
          cleanVal === 'nenhuma descrição relevante.' ||
          cleanVal === 'nenhuma descricao relevante' ||
          cleanVal === 'nenhuma descricao relevante.' ||
          /^m\d{2}\s*-/i.test(cleanVal)
        ) {
          return '';
        }
        return cleanVal.replace(/[^a-z0-9]/g, '');
      };

      for (const res of localReservations) {
        const boat = boats.find(b => b.id === res.embarcacaoId);
        const boatCode = boat ? boat.nome : 'M00';
        if (boatCode.toUpperCase() === 'M04') continue;
        const client = clients.find(c => c.id === res.clienteId);

        let matchedEvt = gcalEvents.find(evt => {
          if (res.googleEventId && evt.id === res.googleEventId) return true;

          const evtDate = evt.start?.dateTime ? evt.start.dateTime.substring(0, 10) : (evt.start?.date || '');
          if (evtDate !== res.data) return false;

          const summaryUpper = evt.summary.toUpperCase();
          const hasBoat = summaryUpper.includes(boatCode) || summaryUpper.replace(/\s+/g, '').includes(boatCode);
          if (!hasBoat) return false;

          const evtPeriod = getEventPeriod(evt);
          return evtPeriod === res.periodo;
        });

        if (matchedEvt) {
          matchedEventIds.add(matchedEvt.id);

          if (!res.googleEventId || res.googleEventId.startsWith('g_sim_')) {
            reservationDB.update(res.id, { googleEventId: matchedEvt.id });
            res.googleEventId = matchedEvt.id;
          }

          const diffs: string[] = [];

          const evtPeriod = getEventPeriod(matchedEvt);
          if (res.periodo !== evtPeriod) {
            const periodLabel = (p: string) => p === 'dia_inteiro' ? 'Dia Inteiro' : p === 'manha' ? 'Manhã' : 'Tarde';
            diffs.push(`Período divergente: local é "${periodLabel(res.periodo)}" mas na agenda está "${periodLabel(evtPeriod)}".`);
          }

          const localStatus = res.status;
          const calendarIsCancelled = isEventCancelled(matchedEvt);
          if (localStatus === 'cancelado' && !calendarIsCancelled) {
            diffs.push(`Status divergente: local está "Cancelado" mas na agenda o evento está ativo.`);
          } else if (localStatus !== 'cancelado' && calendarIsCancelled) {
            diffs.push(`Status divergente: local está ativo (${localStatus}) mas na agenda está "Cancelado".`);
          }

          const localObs = (res.observações || '').trim();
          const evtObs = getEventObs(matchedEvt);
          if (normalizeObs(localObs) !== normalizeObs(evtObs)) {
            diffs.push(`Observações divergentes: local possui "${localObs || 'Nenhuma'}" e na agenda está "${evtObs || 'Nenhuma'}".`);
          }

          if (diffs.length > 0) {
            detectedDiffs.push({
              id: `diff_${res.id}_${matchedEvt.id}`,
              type: 'mismatch',
              reservation: res,
              event: matchedEvt,
              details: diffs,
              date: res.data,
              boatCode,
              period: res.periodo
            });
          }
        } else {
          // Canceled local bookings don't need to be synced to Google Calendar if they don't exist there
          if (res.status === 'cancelado') continue;

          detectedDiffs.push({
            id: `diff_local_${res.id}`,
            type: 'only_in_system',
            reservation: res,
            event: null,
            details: ['Esta reserva está registrada no sistema, mas não foi encontrada no Google Agenda.'],
            date: res.data,
            boatCode,
            period: res.periodo
          });
        }
      }

      for (const evt of gcalEvents) {
        if (matchedEventIds.has(evt.id)) continue;
        // Canceled calendar events that don't exist locally do not need to be imported
        if (isEventCancelled(evt)) continue;

        const summary = evt.summary || '';
        const boatMatch = summary.match(/\b(M\d{2})\b/i);
        const boatCode = boatMatch ? boatMatch[1].toUpperCase() : '';

        if (!boatCode || boatCode === 'M04') continue;

        const boat = boats.find(b => b.nome === boatCode);
        if (!boat) continue;

        const parts = summary.split('-');
        let clientName = parts.length > 1 ? parts[1].trim() : '';

        let matchedClient = clients.find(c => c.nome.toUpperCase().includes(clientName.toUpperCase()));
        if (!matchedClient && clientName) {
          const clientNameParts = clientName.split(' ');
          matchedClient = clients.find(c => {
            const dbNameUpper = c.nome.toUpperCase();
            return clientNameParts.some(p => p.length > 3 && dbNameUpper.includes(p.toUpperCase()));
          });
        }

        const evtDate = evt.start?.dateTime ? evt.start.dateTime.substring(0, 10) : (evt.start?.date || '');
        const evtPeriod = getEventPeriod(evt);

        detectedDiffs.push({
          id: `diff_gcal_${evt.id}`,
          type: 'only_in_calendar',
          reservation: null,
          event: evt,
          details: ['Este agendamento existe no Google Agenda, mas não está registrado no sistema local.'],
          date: evtDate,
          boatCode,
          period: evtPeriod,
          suggestedClientName: clientName || undefined,
          suggestedClientId: matchedClient?.id || undefined
        });
      }

      setDifferences(detectedDiffs);
      
      if (detectedDiffs.length === 0) {
        showToast('Tudo sincronizado! Nenhuma divergência encontrada entre o sistema e o Google Agenda.', 'success');
      } else {
        setIsSyncModalOpen(true);
      }

      loadScheduleData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao verificar sincronia.', 'error');
    } finally {
      setIsVerifyingSync(false);
      setIsLoading(false);
    }
  };

  const handleResolveOnlyInSystem = async (diff: SyncDifference, action: 'send_to_gcal' | 'delete_local') => {
    if (!diff.reservation) return;
    setIsResolvingId(diff.id);
    try {
      const res = diff.reservation;
      if (action === 'send_to_gcal') {
        const boat = boatDB.getById(res.embarcacaoId);
        const client = clientDB.getById(res.clienteId);
        if (!boat || !client) throw new Error('Dados corrompidos ou ausentes do barco ou cliente.');

        const result = await createGoogleCalendarEvent(boat, client, {
          embarcacaoId: res.embarcacaoId,
          clienteId: res.clienteId,
          data: res.data,
          periodo: res.periodo,
          observações: res.observações,
          status: res.status
        });

        if (result.boatCalendarSynced || result.marinaCalendarSynced) {
          reservationDB.update(res.id, { googleEventId: result.eventId });
          showToast('Reserva enviada para o Google Agenda!', 'success');
          setDifferences(prev => prev.filter(d => d.id !== diff.id));
        } else {
          throw new Error('Falha ao sincronizar com Google Agenda.');
        }
      } else {
        if (confirm('Deseja realmente excluir esta reserva do sistema local?')) {
          reservationDB.delete(res.id);
          showToast('Reserva removida do sistema local com sucesso.', 'success');
          setDifferences(prev => prev.filter(d => d.id !== diff.id));
        }
      }
      loadScheduleData();
    } catch (e: any) {
      showToast(e.message || 'Erro ao resolver pendência.', 'error');
    } finally {
      setIsResolvingId(null);
    }
  };

  const handleResolveOnlyInCalendar = async (diff: SyncDifference, action: 'import_to_local' | 'delete_gcal') => {
    if (!diff.event) return;
    setIsResolvingId(diff.id);
    try {
      if (action === 'import_to_local') {
        const selectedClientId = importClients[diff.id] || diff.suggestedClientId;
        if (!selectedClientId) {
          showToast('Por favor, selecione o cotista correspondente para a importação.', 'error');
          setIsResolvingId(null);
          return;
        }

        const boat = boatDB.getAll().find(b => b.nome === diff.boatCode);
        if (!boat) throw new Error(`Barco com código ${diff.boatCode} não encontrado no sistema.`);

        const obs = getEventObs(diff.event) || '';
        const isCancelled = isEventCancelled(diff.event);
        const status = isCancelled ? 'cancelado' : 'agendado';

        // Check if a reservation with this googleEventId already exists to avoid duplicates
        const existing = reservationDB.getAll().find(r => r.googleEventId === diff.event!.id);
        if (existing) {
          reservationDB.update(existing.id, {
            embarcacaoId: boat.id,
            clienteId: selectedClientId,
            data: diff.date,
            periodo: diff.period,
            status: status,
            observações: obs
          });
          showToast('Agendamento atualizado no sistema local com sucesso!', 'success');
        } else {
          reservationDB.create({
            embarcacaoId: boat.id,
            clienteId: selectedClientId,
            data: diff.date,
            periodo: diff.period,
            status: status,
            googleEventId: diff.event.id,
            observações: obs
          });
          showToast('Agendamento importado para o sistema local com sucesso!', 'success');
        }
        setDifferences(prev => prev.filter(d => d.id !== diff.id));
      } else {
        if (confirm('Deseja realmente excluir este agendamento do Google Agenda?')) {
          const success = await deleteGoogleCalendarEvent(diff.event.id, diff.boatCode);
          if (success) {
            showToast('Evento excluído do Google Agenda.', 'success');
            setDifferences(prev => prev.filter(d => d.id !== diff.id));
          } else {
            throw new Error('Não foi possível excluir do Google Agenda.');
          }
        }
      }
      loadScheduleData();
    } catch (e: any) {
      showToast(e.message || 'Erro ao resolver pendência.', 'error');
    } finally {
      setIsResolvingId(null);
    }
  };

  const handleResolveMismatch = async (diff: SyncDifference, action: 'overwrite_gcal' | 'overwrite_local') => {
    if (!diff.reservation || !diff.event) return;
    setIsResolvingId(diff.id);
    try {
      const res = diff.reservation;
      const evt = diff.event;
      const boat = boatDB.getById(res.embarcacaoId);
      const client = clientDB.getById(res.clienteId);
      const boatCode = boat ? boat.nome : 'M00';

      if (action === 'overwrite_gcal') {
        let ownerName = client ? client.nome : 'Desconhecido';
        if (!client && res.observações?.includes('[NOME_RECUPERADO:')) {
          const match = res.observações.match(/\[NOME_RECUPERADO:(.*?)\]/);
          if (match) ownerName = match[1].trim();
        }
        const baseTitle = `${boatCode} - ${ownerName}`;
        const finalTitle = res.status === 'cancelado' ? `${baseTitle} (CANCELADO)` : baseTitle;

        const lines = [
          'Reservado via Reservas Náuticas',
          `Status: ${res.status === 'cancelado' ? 'Cancelado' : res.status === 'confirmado' ? 'Confirmado' : 'Agendado'}`,
          `Embarcação: ${boat ? boat.nome : 'N/A'}`,
          `Proprietário: ${ownerName}`,
          `Período: ${res.periodo === 'dia_inteiro' ? 'Dia Inteiro' : res.periodo === 'manha' ? 'Manhã' : 'Tarde'}`,
          `Obs: ${res.observações || 'Nenhuma'}`
        ];
        const finalDescription = lines.join('\n');

        const success = await updateGoogleCalendarEvent(res.googleEventId!, boatCode, {
          summary: finalTitle,
          description: finalDescription
        });

        if (success) {
          showToast('Google Agenda atualizado com os dados locais.', 'success');
          setDifferences(prev => prev.filter(d => d.id !== diff.id));
        } else {
          throw new Error('Não foi possível atualizar o Google Agenda.');
        }
      } else {
        const evtPeriod = getEventPeriod(evt);
        const evtObs = getEventObs(evt) || 'Atualizado via Google Agenda';
        const isCancelled = isEventCancelled(evt);
        const newStatus = isCancelled ? 'cancelado' : 'agendado';

        reservationDB.update(res.id, {
          periodo: evtPeriod,
          observações: evtObs,
          status: newStatus
        });

        showToast('Sistema local atualizado com os dados do Google Agenda.', 'success');
        setDifferences(prev => prev.filter(d => d.id !== diff.id));
      }
      loadScheduleData();
    } catch (e: any) {
      showToast(e.message || 'Erro ao sincronizar dados.', 'error');
    } finally {
      setIsResolvingId(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadScheduleData = async () => {
    setIsLoading(true);
    try {
      // Clean up auto-generated bad observations from local storage
      const allReservations = reservationDB.getAll();
      let localUpdated = false;
      const cleanedLocal = allReservations.map(r => {
        const obs = r.observações || '';
        const cleanObs = obs.trim();
        if (
          cleanObs === 'Nenhuma' ||
          cleanObs === 'Nenhuma.' ||
          cleanObs === 'Nenhuma observação' ||
          cleanObs === 'Nenhuma observacao' ||
          cleanObs === 'Nenhuma observação.' ||
          cleanObs === 'Nenhuma observacao.' ||
          cleanObs === 'Atualizado via Google Agenda' ||
          cleanObs === 'Atualizado via Google Agenda.' ||
          cleanObs === 'Nenhuma descrição relevante' ||
          cleanObs === 'Nenhuma descrição relevante.' ||
          cleanObs === 'Nenhuma descricao relevante' ||
          cleanObs === 'Nenhuma descricao relevante.' ||
          /^M\d{2}\s*-/i.test(cleanObs)
        ) {
          localUpdated = true;
          return { ...r, observações: '' };
        }
        return r;
      });
      if (localUpdated) {
        localStorage.setItem('nautical_reservations_db', JSON.stringify(cleanedLocal));
      }

      const boats = boatDB.getAll();
      const isNotM04 = (r: Reserva) => {
        const boat = boats.find(b => b.id === r.embarcacaoId);
        const boatCode = boat ? boat.nome : '';
        return boatCode.toUpperCase() !== 'M04';
      };

      // 1. Fetch Local DB Reservations for selected date (excluding M04)
      const localRes = reservationDB.getByDate(selectedDate).filter(isNotM04);
      setActiveReservations(localRes);
      setDailyReservations(localRes);

      // 2. Fetch local reservations in the 14-day range (excluding M04)
      const dStart = new Date(selectedDate);
      const dEnd = new Date(selectedDate);
      dEnd.setDate(dEnd.getDate() + 14);
      const startStr = getLocalDateStr(dStart);
      const endStr = getLocalDateStr(dEnd);

      const localResRange = reservationDB.getAll().filter(r => 
        r.status === 'confirmado' && 
        r.data >= startStr && 
        r.data <= endStr &&
        isNotM04(r)
      );

      setRangeReservations(localResRange);
    } catch (err: any) {
      console.error('Erro ao recarregar agenda:', err);
      showToast('Erro ao recarregar agendamentos.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Safeguard selectedDate from being empty, cleared, or invalid
    if (!selectedDate || isNaN(new Date(selectedDate + 'T12:00:00').getTime())) {
      setSelectedDate(getLocalDateStr());
      return;
    }
    loadScheduleData();
  }, [selectedDate, simMode]);

  useEffect(() => {
    // Sync Service Account Mode from backend
    const checkServiceAccountConfig = async () => {
      const isSAActive = await checkServerConfig();
      // Since it pulls and saves clientid and mappings to localStorage, lets update our React states!
      setClientId(getGoogleClientId());
      setCalendarMappingsState(getCalendarMappings());

      if (isSAActive) {
        setSimMode(false);
        setSimulatedConnection(false);
        setGcalConnected(true);
        loadScheduleData();
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
      loadScheduleData();
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
        loadScheduleData();
      }
    };

    window.addEventListener('message', handlePopupMessage);
    return () => {
      window.removeEventListener('message', handlePopupMessage);
    };
  }, []);

  const handleSimulateToggle = () => {
    const nextMode = !simMode;
    setSimMode(nextMode);
    setSimulatedConnection(nextMode);
    setGcalConnected(!nextMode);
    showToast(nextMode ? 'Modo de Sincronização Simulado Ativo!' : 'Modo Simulado desligado. Pronto para chaves/token GCP.');
  };

  const handleApplyDeveloperToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!devTokenInput.trim()) {
      showToast('Por favor, informe um token de desenvolvedor válido.', 'error');
      return;
    }
    setDeveloperToken(devTokenInput.trim());
    setSimMode(false);
    setGcalConnected(true);
    showToast('Token de Acesso Real Google configurado com sucesso! Próximas chamadas utilizarão o Google Developer Dashboard.');
    setDevTokenInput('');
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
  };

  // Navigate Days
  const stepDate = (amount: number) => {
    let d = new Date(selectedDate + 'T12:00:00');
    if (isNaN(d.getTime())) {
      d = new Date();
    }
    d.setDate(d.getDate() + amount);
    setSelectedDate(getLocalDateStr(d));
  };

  const setToday = () => {
    setSelectedDate(getLocalDateStr());
  };

  const [deleteGcalEventId, setDeleteGcalEventId] = useState<string | null>(null);
  const executeDeleteGcalEvent = () => {
    setDeleteGcalEventId(null);
  };

  // Delete Reservation (Local + GCal)
  const handleDeleteReservation = async (res: Reserva) => {
    if (!confirm('Deseja realmente excluir esta reserva do sistema e do Google Calendar? Esta ação é irreversível.')) return;
    
    setIsLoading(true);
    try {
      if (res.googleEventId) {
        try {
          const boat = boatDB.getById(res.embarcacaoId);
          const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome.split(' ')[0]) : undefined;
          await deleteGoogleCalendarEvent(res.googleEventId, boatCode);
        } catch (e) {
          console.warn('Erro ao excluir do GCal (pode já ter sido excluído na nuvem):', e);
        }
      }
      reservationDB.delete(res.id);
      showToast('Reserva excluída do sistema e Google Calendar com sucesso!', 'success');
      loadScheduleData();
    } catch (err: any) {
      showToast('Erro ao excluir reserva: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate subsequent dates list for buttons (next 5 days)
  const getSubsequentDays = () => {
    const dates: { dateStr: string; label: string; weekday: string }[] = [];
    let base = new Date(selectedDate + 'T12:00:00');
    if (isNaN(base.getTime())) {
      base = new Date();
    }
    
    for (let i = 1; i <= 5; i++) {
      const next = new Date(base);
      next.setDate(base.getDate() + i);
      const isDateToday = getLocalDateStr(next) === getLocalDateStr();
      
      dates.push({
        dateStr: getLocalDateStr(next),
        label: next.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        weekday: isDateToday ? 'Hoje' : next.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
      });
    }
    return dates;
  };

  return (
    <div id="schedules-page-section" className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 border animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Consulta de Agendamentos</h2>
          <p className="text-sm text-slate-500 font-sans">Visualização integrada em tempo real da marina e das saídas de embarcações.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadScheduleData}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Atualizar Tabela"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={handleVerifySync}
            disabled={isLoading || isVerifyingSync}
            className="relative inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer shadow-md bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white border border-indigo-500/20 hover:shadow-indigo-500/25 active:scale-95 group overflow-hidden"
            title="Verificar sincronia com Google Agenda"
          >
            <span className="absolute -inset-y-0 -inset-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out" />
            <RefreshCw className={`w-4 h-4 mr-2 ${isVerifyingSync ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            {isVerifyingSync ? 'Verificando...' : 'Verificar Sincronia'}
          </button>

          
          <button
            id="page-add-res-btn"
            onClick={() => setIsResModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Reserva
          </button>
        </div>
      </div>

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
                      <span className="text-[10px] text-slate-500 truncate mt-1 flex items-center gap-1.5">
                        Sócio: {client ? client.nome : 'Cliente'}
                        {client?.statusFinanceiro === 'inadimplente' && (
                          <span className="px-1.5 flex items-center gap-0.5 py-0.5 rounded text-[8px] font-bold uppercase text-rose-800 bg-rose-100 border border-rose-200">
                            <AlertTriangle className="w-2.5 h-2.5" /> Pendências
                          </span>
                        )}
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

      {/* Date Navigation & Filters Panel */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-xs p-3 flex flex-col gap-3">
        {/* Row 1: Date Navigation & Quick Hop */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 shrink-0">
            <button onClick={() => stepDate(-1)} className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-slate-700" title="Dia Anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={setToday} className="px-3 py-1.5 border border-slate-200 hover:border-slate-400 font-bold text-[11px] rounded-lg transition-colors cursor-pointer bg-white text-slate-800 uppercase">
              Hoje
            </button>
            <button onClick={() => stepDate(1)} className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-slate-700" title="Próximo Dia">
              <ChevronRight className="w-4 h-4" />
            </button>
            <input
              id="schedule-main-datepicker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="ml-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-950 font-semibold"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto subtle-scrollbar w-full lg:w-auto lg:justify-center">
            {getSubsequentDays().map((dobj) => (
              <button
                key={dobj.dateStr}
                onClick={() => setSelectedDate(dobj.dateStr)}
                className={`flex-1 lg:flex-none flex flex-col items-center justify-center px-3 py-1.5 border rounded-lg transition-all text-center cursor-pointer min-w-[55px] ${
                  selectedDate === dobj.dateStr
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-white text-slate-600'
                }`}
              >
                <span className="text-[9px] font-bold font-sans uppercase text-slate-400 leading-none mb-0.5">
                  {dobj.weekday}
                </span>
                <span className="text-[11px] font-bold font-mono text-slate-800">
                  {dobj.label}
                </span>
              </button>
            ))}
          </div>
          
          <div className="hidden xl:flex flex-col items-end shrink-0">
            <h3 className="font-bold text-slate-900 text-xs tracking-tight">
              {parsedSelectedDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <span className="text-[9px] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-bold font-mono text-indigo-700 mt-0.5">
              {dailyReservations.length} Atividades
            </span>
          </div>
        </div>

        <div className="h-px w-full bg-slate-100"></div>

        {/* Row 2: Search & Filters */}
        <div id="search-and-filters-container" className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 md:max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              id="schedule-search-input"
              type="text"
              placeholder="Pesquisar cliente, barco (ex: M19)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-400 focus:outline-hidden rounded-lg font-medium transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer">
                <XCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Status:</span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {(['Todos', 'Agendado', 'Confirmado', 'Cancelado'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-colors ${statusFilter === st ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Tipo:</span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {(['Todos', 'Lancha', 'Jetski'] as const).map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setTypeFilter(tp)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-colors ${typeFilter === tp ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    {tp}
                  </button>
                ))}
              </div>
            </div>

            {(searchQuery || statusFilter !== 'Todos' || typeFilter !== 'Todos') && (
              <button onClick={() => { setSearchQuery(''); setStatusFilter('Todos'); setTypeFilter('Todos'); }} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer underline underline-offset-2">
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Day's Agenda List Column */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center">
                    <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600 animate-pulse" />
                    Agendamentos Ativos do Dia
                  </h3>
                </div>
                <span className="text-[10px] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-semibold text-indigo-700 font-sans shadow-2xs">
                  Sincronizado: Agenda Marina Central
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono font-medium bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                {parsedSelectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>

            {dailyReservations.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <p className="text-sm font-sans font-medium">Nenhum agendamento registrado nesta data.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">Não há registros correspondentes no Google Calendar ou no repositório geral de reservas da marina para o dia selecionado.</p>
                <button
                  onClick={() => setIsResModalOpen(true)}
                  className="inline-flex items-center px-3.5 py-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors mt-2"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agendar Saída
                </button>
              </div>
            ) : filteredDailyReservations.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Search className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
                <p className="text-sm font-sans font-semibold">Sem correspondências para os filtros ativos.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">Nenhum agendamento do dia selecionado corresponde ao texto da pesquisa ou aos filtros de status/tipo selecionados.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('Todos');
                    setTypeFilter('Todos');
                  }}
                  className="inline-flex items-center px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-indigo-700 transition-colors mt-1 cursor-pointer font-sans"
                >
                  Limpar Filtros
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredDailyReservations.map(res => {
                  return (
                    <ScheduleCard 
                      key={res.id} 
                      res={res} 
                      gcalConnected={gcalConnected}
                      onSync={handleSyncSingleReservation}
                      onGeneratePDF={handleGeneratePDFForEvent}
                      onOpenStatus={openStatusModal}
                      onDelete={handleDeleteReservation}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Monthly visual scale workspace and exporter */}
      <MonthlyCalendarGenerator initialDate={selectedDate} />

      {/* Custom Non-blocking confirmation modal for safe event deletion */}
      <DeleteConfirmationModal
        isOpen={!!deleteGcalEventId}
        summary={deleteGcalEventSummary}
        onClose={() => setDeleteGcalEventId(null)}
        onConfirm={executeDeleteGcalEvent}
      />

      {/* Dynamic Status Update Modal */}
      <StatusModal
        isOpen={!!statusModalEvent}
        reserva={statusModalEvent}
        onClose={() => setStatusModalEvent(null)}
        onSuccess={(msg) => showToast(msg, 'success')}
        onError={(msg) => showToast(msg, 'error')}
        onUpdateCompleted={loadScheduleData}
      />
      {/* Sync Comparison and Resolution Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Header banner */}
            <div className="bg-indigo-50/50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin-slow" />
                  <h3 className="font-bold text-slate-900 text-base font-sans">
                    Resolução de Divergências - Google Agenda
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-sans">
                  Encontramos {differences.length} divergência(s) entre o sistema e o Google Calendar no período de 16 dias. Escolha a ação adequada para cada caso.
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsSyncModalOpen(false);
                  loadScheduleData();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer ml-4"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Differences List Content Area */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 subtle-scrollbar font-sans text-xs">
              {differences.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-3">
                  <CheckCircle className="w-12 h-12 text-emerald-500" />
                  <p className="font-semibold text-sm">Todas as divergências foram resolvidas!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {differences.map((diff) => {
                    const formattedDate = new Date(diff.date + 'T12:00:00').toLocaleDateString('pt-BR');
                    const periodLabel = diff.period === 'dia_inteiro' ? 'Dia Inteiro' : diff.period === 'manha' ? 'Manhã' : 'Tarde';
                    const clients = clientDB.getAll();

                    return (
                      <div 
                        key={diff.id} 
                        className={`p-0 border rounded-2xl shadow-sm transition-all flex flex-col overflow-hidden ${
                          diff.type === 'only_in_system' 
                            ? 'border-indigo-200' 
                            : diff.type === 'only_in_calendar' 
                            ? 'border-emerald-200' 
                            : 'border-amber-200'
                        }`}
                      >
                        {/* Status Header for Difference */}
                        <div className={`px-4 py-2 flex items-center justify-between border-b ${
                          diff.type === 'only_in_system'
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-800'
                            : diff.type === 'only_in_calendar'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                            : 'bg-amber-50 border-amber-100 text-amber-800'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              {diff.type === 'only_in_system' 
                                ? 'Apenas no Sistema' 
                                : diff.type === 'only_in_calendar' 
                                ? 'Apenas no Google Agenda' 
                                : 'Divergência de Dados'}
                            </span>
                            {diff.type === 'mismatch' && (
                              <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded font-semibold border border-amber-200">
                                Conflito
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold font-mono bg-white px-2 py-0.5 rounded border border-black/10">
                            {diff.boatCode} | {formattedDate} ({periodLabel})
                          </span>
                        </div>

                        {/* Dual Column Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
                          
                          {/* LEFT COLUMN: SYSTEM */}
                          <div className={`p-4 flex flex-col ${!diff.reservation ? 'bg-slate-50 opacity-60' : ''}`}>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                              Sistema Local
                            </h4>
                            
                            {!diff.reservation ? (
                              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic text-center px-4 py-4 border-2 border-dashed border-slate-200 rounded-lg">
                                Este agendamento não existe no banco de dados local.
                              </div>
                            ) : (
                              <div className="space-y-2 text-xs">
                                <p className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="text-slate-500">Cliente:</span>
                                  <span className="font-semibold text-slate-800">{clientDB.getById(diff.reservation.clienteId)?.nome || 'Desconhecido'}</span>
                                </p>
                                <p className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="text-slate-500">Status:</span>
                                  <span className={`font-semibold capitalize ${diff.reservation.status === 'cancelado' ? 'text-rose-600' : 'text-emerald-600'}`}>{diff.reservation.status}</span>
                                </p>
                                <p className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="text-slate-500">Período:</span>
                                  <span className="font-semibold text-slate-800">{diff.reservation.periodo === 'dia_inteiro' ? 'Dia Inteiro' : diff.reservation.periodo === 'manha' ? 'Manhã' : 'Tarde'}</span>
                                </p>
                                <div className="pt-1">
                                  <span className="text-slate-500 block mb-1">Observações:</span>
                                  <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 italic min-h-[40px]">
                                    {diff.reservation.observações || 'Nenhuma observação.'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* RIGHT COLUMN: GOOGLE CALENDAR */}
                          <div className={`p-4 flex flex-col ${!diff.event ? 'bg-slate-50 opacity-60' : ''}`}>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              Google Agenda
                            </h4>
                            
                            {!diff.event ? (
                              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic text-center px-4 py-4 border-2 border-dashed border-slate-200 rounded-lg">
                                Este agendamento não foi encontrado na agenda do Google.
                              </div>
                            ) : (
                              <div className="space-y-2 text-xs">
                                <p className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="text-slate-500">Título:</span>
                                  <span className="font-semibold text-slate-800 line-clamp-1" title={diff.event.summary}>{diff.event.summary}</span>
                                </p>
                                <p className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="text-slate-500">Status Oculto:</span>
                                  <span className={`font-semibold capitalize ${isEventCancelled(diff.event) ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {isEventCancelled(diff.event) ? 'Cancelado' : 'Ativo'}
                                  </span>
                                </p>
                                <p className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="text-slate-500">Data Agenda:</span>
                                  <span className="font-semibold text-slate-800">
                                    {diff.event.start?.dateTime ? new Date(diff.event.start.dateTime).toLocaleString('pt-BR').substring(0, 10) : (diff.event.start?.date || 'N/A')}
                                  </span>
                                </p>
                                <div className="pt-1">
                                  <span className="text-slate-500 block mb-1">Descrição:</span>
                                  <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 italic min-h-[40px] break-words whitespace-pre-wrap line-clamp-3">
                                    {getEventObs(diff.event) || 'Nenhuma descrição relevante.'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Mismatch Highlights (if any) */}
                        {diff.type === 'mismatch' && diff.details.length > 0 && (
                          <div className="bg-rose-50/50 border-y border-rose-100 p-3">
                            <p className="text-[10px] font-bold text-rose-800 uppercase mb-1">Detalhes do Conflito Encontrado:</p>
                            <ul className="list-disc pl-4 text-xs text-rose-700 space-y-0.5 font-medium">
                              {diff.details.map((detail, idx) => (
                                <li key={idx}>{detail}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Action Bar (Footer) */}
                        <div className="bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl">
                          
                          {/* actions for ONLY_IN_SYSTEM */}
                          {diff.type === 'only_in_system' && (
                            <>
                              <button 
                                onClick={() => handleResolveOnlyInSystem(diff, 'delete_local')}
                                disabled={isResolvingId === diff.id}
                                className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-100 rounded-lg font-bold transition-colors disabled:opacity-50"
                              >
                                Excluir do Sistema
                              </button>
                              <button 
                                onClick={() => handleResolveOnlyInSystem(diff, 'send_to_gcal')}
                                disabled={isResolvingId === diff.id}
                                className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
                              >
                                {isResolvingId === diff.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                Copiar para Google Agenda
                              </button>
                            </>
                          )}

                          {/* actions for ONLY_IN_CALENDAR */}
                          {diff.type === 'only_in_calendar' && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3">
                              <div className="flex items-center gap-2 flex-1 max-w-sm">
                                <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Associar a:</span>
                                <SearchableClientSelect
                                  clients={clients}
                                  value={importClients[diff.id] || diff.suggestedClientId || ''}
                                  onChange={(val) => setImportClients(prev => ({ ...prev, [diff.id]: val }))}
                                />
                                {diff.suggestedClientName && !importClients[diff.id] && !diff.suggestedClientId && (
                                  <span className="text-[10px] text-amber-600 font-bold hidden md:inline">
                                    Sugestão: {diff.suggestedClientName}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleResolveOnlyInCalendar(diff, 'delete_gcal')}
                                  disabled={isResolvingId === diff.id}
                                  className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-100 rounded-lg font-bold transition-colors disabled:opacity-50 shrink-0"
                                >
                                  Excluir da Agenda
                                </button>
                                <button 
                                  onClick={() => handleResolveOnlyInCalendar(diff, 'import_to_local')}
                                  disabled={isResolvingId === diff.id || (!diff.suggestedClientId && !importClients[diff.id])}
                                  className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs shrink-0"
                                >
                                  {isResolvingId === diff.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
                                  Importar para Sistema
                                </button>
                              </div>
                            </div>
                          )}

                          {/* actions for MISMATCH */}
                          {diff.type === 'mismatch' && (
                            <div className="flex justify-end w-full gap-2">
                              <button 
                                onClick={() => handleResolveMismatch(diff, 'overwrite_local')}
                                disabled={isResolvingId === diff.id}
                                className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
                                title="Grava os dados da agenda do Google no sistema local"
                              >
                                {isResolvingId === diff.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5 rotate-180" />}
                                Importar Alterações da Agenda
                              </button>
                              <button 
                                onClick={() => handleResolveMismatch(diff, 'overwrite_gcal')}
                                disabled={isResolvingId === diff.id}
                                className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
                                title="Força os dados do sistema a sobrescrever a agenda"
                              >
                                {isResolvingId === diff.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                                Enviar Correções para Agenda
                              </button>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer with Close Button */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsSyncModalOpen(false);
                  loadScheduleData();
                }}
                className="px-5 py-2 text-xs font-semibold bg-white border border-slate-205 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Reservation Booking Popup Form render */}
      {isResModalOpen && (
        <ReservationModal
          onClose={() => setIsResModalOpen(false)}
          onSuccess={(msg) => {
            showToast(msg);
            loadScheduleData();
          }}
        />
      )}
    </div>
  );
}
