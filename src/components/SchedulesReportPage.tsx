import React, { useState, useEffect } from 'react';
import { clientDB, boatDB, reservationDB } from '../db';
import { Reserva, Embarcacao, Cliente } from '../types';
import { updateGoogleCalendarEvent, deleteGoogleCalendarEvent, formatEventTimes } from '../googleCalendar';
import { generateAvisoSaidaPDF } from '../utils/pdfGenerator';
import { 
  Search, 
  Calendar, 
  Ship, 
  Users, 
  FileText, 
  Download, 
  Filter,
  Wrench,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  X,
  Trash2,
  RefreshCw
} from 'lucide-react';

export default function SchedulesReportPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  });

  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  
  const [results, setResults] = useState<Reserva[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  
  const [isBoatDropdownOpen, setIsBoatDropdownOpen] = useState(false);
  const [boatSearchQuery, setBoatSearchQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  // Status & Edit states
  const [editModalEvent, setEditModalEvent] = useState<Reserva | null>(null);
  const [editFormData, setEditFormData] = useState({
    clienteId: '',
    data: '',
    periodo: 'dia_inteiro' as 'dia_inteiro' | 'manha' | 'tarde',
    observacoes: ''
  });

  const [statusModalEvent, setStatusModalEvent] = useState<Reserva | null>(null);
  const [statusVal, setStatusVal] = useState<'Agendado' | 'Confirmado' | 'Cancelado'>('Agendado');
  const [destino, setDestino] = useState('Iate Club - Rodeadouro');
  const [horaSaida, setHoraSaida] = useState('11:30');
  const [horaChegada, setHoraChegada] = useState('17:28');
  const [pessoasABordo, setPessoasABordo] = useState('02');
  const [numObs, setNumObs] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [somRetirado, setSomRetirado] = useState(false);
  const [somTesteSaida, setSomTesteSaida] = useState('nao_realizado');
  const [somTesteRetorno, setSomTesteRetorno] = useState('nao_realizado');

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    setBoats(boatDB.getAll().sort((a, b) => a.nome.localeCompare(b.nome)));
    setClients(clientDB.getAll().sort((a, b) => a.nome.localeCompare(b.nome)));
  }, []);

  useEffect(() => {
    handleSearch();
  }, [startDate, endDate, selectedBoatId, selectedClientId]);

  const handleSearch = () => {
    const allRes = reservationDB.getAll();
    const filtered = allRes.filter(res => {
      if (res.data < startDate || res.data > endDate) return false;
      if (selectedBoatId && res.embarcacaoId !== selectedBoatId) return false;
      if (selectedClientId && res.clienteId !== selectedClientId) return false;
      return true;
    });
    filtered.sort((a, b) => a.data.localeCompare(b.data));
    setResults(filtered);
  };

  const getBoatCode = (boat: Embarcacao | undefined) => {
    if (!boat) return 'M00';
    return boat.numero ? `M${boat.numero.padStart(2, '0')}` : boat.nome.split(' ')[0];
  };

  const getOwnerName = (res: Reserva, client: Cliente | undefined) => {
    let ownerName = client ? client.nome : 'Desconhecido';
    if (!client && res.observações?.includes('[NOME_RECUPERADO:')) {
      const match = res.observações.match(/\[NOME_RECUPERADO:(.*?)\]/);
      if (match) ownerName = match[1].trim();
    }
    return ownerName;
  };

  // ---- Edit Logic ----
  const handleEditClick = (res: Reserva) => {
    setEditFormData({
      clienteId: res.clienteId,
      data: res.data,
      periodo: res.periodo,
      observacoes: res.observações || ''
    });
    setEditModalEvent(res);
  };

  const handleSaveEdit = async () => {
    if (!editModalEvent) return;
    setIsLoading(true);
    try {
      const updatedRes = {
        ...editModalEvent,
        clienteId: editFormData.clienteId,
        data: editFormData.data,
        periodo: editFormData.periodo,
        observações: editFormData.observacoes
      };
      
      reservationDB.update(editModalEvent.id, updatedRes);

      if (editModalEvent.googleEventId && !editModalEvent.googleEventId.startsWith('g_sim_')) {
        const boat = boats.find(b => b.id === editModalEvent.embarcacaoId);
        const client = clients.find(c => c.id === editFormData.clienteId);
        const boatCode = getBoatCode(boat);
        const ownerName = getOwnerName(updatedRes, client);
        
        let baseTitle = `${boatCode} - ${ownerName}`;
        const finalTitle = editModalEvent.status === 'cancelado' ? `${baseTitle} (CANCELADO)` : baseTitle;

        const lines = [
          'Reservado via Reservas Náuticas',
          `Status: ${editModalEvent.status === 'cancelado' ? 'Cancelado' : editModalEvent.status === 'confirmado' ? 'Confirmado' : 'Agendado'}`,
          `Embarcação: ${boat ? boat.nome : 'N/A'}`,
          `Proprietário: ${ownerName}`,
          `Período: ${editFormData.periodo === 'dia_inteiro' ? 'Dia Inteiro' : editFormData.periodo === 'manha' ? 'Manhã' : 'Tarde'}`,
          `Obs: ${editFormData.observacoes || 'Nenhuma'}`
        ];
        
        const times = formatEventTimes(editFormData.data, editFormData.periodo);
        await updateGoogleCalendarEvent(editModalEvent.googleEventId, boatCode, {
          summary: finalTitle,
          description: lines.join('\n'),
          start: times.start,
          end: times.end
        });
      }

      showToast('Agendamento atualizado com sucesso!', 'success');
      setEditModalEvent(null);
      handleSearch();
    } catch (e) {
      console.error(e);
      showToast('Erro ao atualizar agendamento.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Status / View Logic ----
  const openStatusModal = (res: Reserva) => {
    setStatusModalEvent(res);
    setStatusVal(res.status === 'confirmado' ? 'Confirmado' : res.status === 'cancelado' ? 'Cancelado' : 'Agendado');
    setDestino('');
    setHoraSaida('');
    setHoraChegada('');
    setPessoasABordo('');
    setNumObs(res.observações || '');
    setSomRetirado(!!res.somRetirado);
    setSomTesteSaida(res.somTesteSaida || 'nao_realizado');
    setSomTesteRetorno(res.somTesteRetorno || 'nao_realizado');
  };

  const handleUpdateEventStatus = async () => {
    if (!statusModalEvent) return;
    if (statusVal === 'Confirmado' && (!destino || !horaSaida || !horaChegada || !pessoasABordo)) {
      showToast('Para confirmar a reserva, preencha todos os dados de saída obrigatórios.', 'error');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const res = statusModalEvent;
      const boat = boats.find(b => b.id === res.embarcacaoId);
      const client = clients.find(c => c.id === res.clienteId);
      const boatCode = getBoatCode(boat);
      const ownerName = getOwnerName(res, client);
      
      let baseTitle = `${boatCode} - ${ownerName}`;
      const finalTitle = statusVal === 'Cancelado' ? `${baseTitle} (CANCELADO)` : baseTitle;

      const lines = [
        'Reservado via Reservas Náuticas',
        `Status: ${statusVal}`
      ];
      
      if (statusVal === 'Confirmado') {
        lines.push(`Destino: ${destino}`);
        lines.push(`Previsão de Saída: ${horaSaida}`);
        lines.push(`Previsão de Chegada: ${horaChegada}`);
        lines.push(`Pessoas a bordo: ${pessoasABordo}`);
      }

      if (boat) lines.push(`Embarcação: ${boat.nome}`);
      if (client) lines.push(`Proprietário: ${client.nome}`);
      if (client?.telefone) lines.push(`Contato: ${client.telefone}`);
      lines.push(`Período: ${res.periodo === 'dia_inteiro' ? 'Dia Inteiro' : res.periodo === 'manha' ? 'Manhã' : 'Tarde'}`);
      
      const finalObs = numObs.trim() || res.observações || 'Nenhuma';
      lines.push(`Obs: ${finalObs}`);

      const mappedStatus = statusVal === 'Cancelado' ? 'cancelado' : statusVal === 'Confirmado' ? 'confirmado' : 'agendado';
      reservationDB.update(res.id, {
        status: mappedStatus,
        observações: finalObs,
        somRetirado,
        somTesteSaida,
        somTesteRetorno,
        previsaoSaida: statusVal === 'Confirmado' ? horaSaida : undefined,
        previsaoChegada: statusVal === 'Confirmado' ? horaChegada : undefined,
        destino: statusVal === 'Confirmado' ? destino : undefined,
        pessoasABordo: statusVal === 'Confirmado' ? pessoasABordo : undefined,
        statusMarina: statusVal === 'Confirmado' ? 'agendado' : undefined
      });

      let success = true;
      if (res.googleEventId && !res.googleEventId.startsWith('g_sim_')) {
        success = await updateGoogleCalendarEvent(res.googleEventId, boatCode, {
          summary: finalTitle,
          description: lines.join('\n')
        });
      }

      if (success) {
        if (boat?.temSom) {
          try {
            const dataToSave = {
              id: `som_${Date.now()}`,
              reservaId: res.id,
              embarcacaoId: boatCode,
              clienteId: client?.id || 'N/A',
              data: new Date().toISOString().split('T')[0],
              somRetirado,
              somTesteSaida,
              somTesteRetorno,
              observacoes: finalObs,
              createdAt: new Date().toISOString()
            };
            const token = localStorage.getItem('admin_token');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            await fetch('/api/db/save', {
              method: 'POST',
              headers,
              body: JSON.stringify({ type: 'controles_som', action: 'upsert', data: dataToSave })
            });
          } catch(e) {}
        }

        if (statusVal === 'Confirmado') {
          try {
            const boatType = boat ? (boat.tipo === 'jet' ? 'Jetski' : 'Lancha') : 'Lancha';
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
              pessoasABordo: pessoasABordo || '02',
              destino: destino || 'Iate Club - Rodeadouro',
              previsaoSaida: horaSaida || '11:30',
              previsaoChegada: horaChegada || '17:28',
              observacao: numObs.trim() || 'Nenhuma'
            });
            
            try {
              const textToCopy = `✅ CONFIRMADO - ${boatCode} - ${ownerName.toUpperCase()}    |  Saída: ${horaSaida || '11:30'}`;
              await navigator.clipboard.writeText(textToCopy);
            } catch (err) {
              console.error('Erro ao copiar para clipboard:', err);
            }
            
            showToast('Documento gerado!', 'success');
          } catch (pdfErr) {
            console.error('Erro ao gerar PDF', pdfErr);
          }
        }
        showToast(`Status atualizado para "${statusVal}" com sucesso!`, 'success');
      } else {
        showToast('Atualizado localmente, mas falhou no Google Agenda.', 'error');
      }

      setStatusModalEvent(null);
      handleSearch();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Erro ao salvar alteração.', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteReservation = async (id: string, googleEventId?: string, boatId?: string) => {
    if (!confirm('Tem certeza que deseja excluir permanentemente este agendamento?')) return;
    setIsLoading(true);
    try {
      if (googleEventId && !googleEventId.startsWith('g_sim_')) {
        const boat = boats.find(b => b.id === boatId);
        const boatCode = getBoatCode(boat);
        await deleteGoogleCalendarEvent(googleEventId, boatCode);
      }
      reservationDB.delete(id);
      showToast('Agendamento excluído com sucesso!', 'success');
      setStatusModalEvent(null);
      handleSearch();
    } catch (e: any) {
      showToast('Erro ao excluir do Google Agenda. Excluído apenas localmente.', 'error');
      reservationDB.delete(id);
      setStatusModalEvent(null);
      handleSearch();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300 ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          toastMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
           toastMessage.type === 'error' ? <AlertTriangle className="w-5 h-5 text-rose-600" /> :
           <FileText className="w-5 h-5 text-indigo-600" />}
          <span className="font-semibold text-sm">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Relatórios de Agendamentos</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pesquisa avançada por período, embarcação e proprietário.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold">
          <Filter className="w-5 h-5 text-indigo-600" />
          Filtros de Pesquisa
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Data Inicial</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Data Final</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Embarcação</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsBoatDropdownOpen(!isBoatDropdownOpen)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium text-left flex items-center justify-between"
              >
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Ship className="w-4 h-4 text-slate-400" />
                </div>
                <span className="truncate">
                  {selectedBoatId ? boats.find(b => b.id === selectedBoatId)?.nome : 'Todas as Embarcações'}
                </span>
              </button>

              {isBoatDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsBoatDropdownOpen(false)} />
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 flex flex-col">
                    <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={boatSearchQuery}
                        onChange={(e) => setBoatSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-sm focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto subtle-scrollbar">
                      <button
                        type="button"
                        onClick={() => { setSelectedBoatId(''); setIsBoatDropdownOpen(false); setBoatSearchQuery(''); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                      >
                        Todas as Embarcações
                      </button>
                      {boats.filter(b => b.nome.toLowerCase().includes(boatSearchQuery.toLowerCase())).map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => { setSelectedBoatId(b.id); setIsBoatDropdownOpen(false); setBoatSearchQuery(''); }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                        >
                          {getBoatCode(b)} - {b.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Cliente / Sócio</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium text-left flex items-center justify-between"
              >
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <span className="truncate">
                  {selectedClientId ? clients.find(c => c.id === selectedClientId)?.nome : 'Todos os Clientes'}
                </span>
              </button>

              {isClientDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsClientDropdownOpen(false)} />
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 flex flex-col">
                    <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-sm focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto subtle-scrollbar">
                      <button
                        type="button"
                        onClick={() => { setSelectedClientId(''); setIsClientDropdownOpen(false); setClientSearchQuery(''); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                      >
                        Todos os Clientes
                      </button>
                      {clients.filter(c => c.nome.toLowerCase().includes(clientSearchQuery.toLowerCase())).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedClientId(c.id); setIsClientDropdownOpen(false); setClientSearchQuery(''); }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                        >
                          {c.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Resultados da Pesquisa
          </h3>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-100">
            {results.length} registro(s) encontrado(s)
          </span>
        </div>

        {results.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">Nenhum agendamento encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Embarcação</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right print:hidden">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map(res => {
                  const boat = boats.find(b => b.id === res.embarcacaoId);
                  const client = clients.find(c => c.id === res.clienteId);
                  const isCanceled = res.status === 'cancelado';
                  
                  const dt = new Date(res.data + 'T12:00:00');
                  const formattedDate = isNaN(dt.getTime()) ? res.data : dt.toLocaleDateString('pt-BR');
                  
                  const periodMap = {
                    'dia_inteiro': 'Dia Inteiro',
                    'manha': 'Manhã',
                    'tarde': 'Tarde'
                  };

                  return (
                    <tr key={res.id} className={`hover:bg-slate-50 transition-colors ${isCanceled ? 'opacity-60 bg-slate-50/50' : ''}`}>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-700">{formattedDate}</span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-mono rounded border border-indigo-100 font-bold">
                            {getBoatCode(boat)}
                          </span>
                          <span className="text-sm text-slate-600 truncate max-w-[150px]">
                            {boat ? boat.nome : 'Desconhecida'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-700">{getOwnerName(res, client)}</span>
                      </td>

                      <td className="px-6 py-3 whitespace-nowrap">
                        {isCanceled ? (
                          <span className="px-2 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded border border-red-100">Cancelado</span>
                        ) : res.status === 'confirmado' ? (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded border border-emerald-100">Confirmado</span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded border border-amber-100">Agendado</span>
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right print:hidden">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleEditClick(res)} 
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" 
                            title="Editar Agendamento"
                          >
                            <Wrench className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openStatusModal(res)} 
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                            title="Status / Detalhes"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModalEvent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                Editar Agendamento
              </h3>
              <button onClick={() => setEditModalEvent(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente / Sócio</label>
                <select
                  value={editFormData.clienteId}
                  onChange={(e) => setEditFormData({ ...editFormData, clienteId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="">Selecione o Cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Data</label>
                <input
                  type="date"
                  value={editFormData.data}
                  onChange={(e) => setEditFormData({ ...editFormData, data: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Período</label>
                <select
                  value={editFormData.periodo}
                  onChange={(e) => setEditFormData({ ...editFormData, periodo: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="dia_inteiro">Dia Inteiro</option>
                  <option value="manha">Manhã (até 13h)</option>
                  <option value="tarde">Tarde (após 13h)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Observações</label>
                <textarea
                  value={editFormData.observacoes}
                  onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  rows={3}
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t mt-4">
              <button
                onClick={() => setEditModalEvent(null)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all text-sm flex items-center justify-center gap-2"
              >
                {isLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Details Modal */}
      {statusModalEvent && (() => {
        const boat = boats.find(b => b.id === statusModalEvent.embarcacaoId);
        const boatCode = getBoatCode(boat);
        const hasGoogleEvent = statusModalEvent.googleEventId && !statusModalEvent.googleEventId.startsWith('g_sim_');
        const showSoundControls = boat?.temSom || false;

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-indigo-600" />
                  Detalhes / Status da Reserva
                </h3>
                <button onClick={() => setStatusModalEvent(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status Toggle */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Alterar Status</label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button onClick={() => setStatusVal('Agendado')} className={`py-2 text-sm font-semibold rounded-lg transition-all ${statusVal === 'Agendado' ? 'bg-white text-slate-800 shadow shadow-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>
                      Agendado
                    </button>
                    <button onClick={() => setStatusVal('Confirmado')} className={`py-2 text-sm font-semibold rounded-lg transition-all ${statusVal === 'Confirmado' ? 'bg-emerald-500 text-white shadow shadow-emerald-500/30' : 'text-slate-500 hover:text-slate-700'}`}>
                      Confirmado
                    </button>
                    <button onClick={() => setStatusVal('Cancelado')} className={`py-2 text-sm font-semibold rounded-lg transition-all ${statusVal === 'Cancelado' ? 'bg-rose-500 text-white shadow shadow-rose-500/30' : 'text-slate-500 hover:text-slate-700'}`}>
                      Cancelado
                    </button>
                  </div>
                </div>

                {/* Confirm Fields */}
                {statusVal === 'Confirmado' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Destino *</label>
                        <input type="text" value={destino} onChange={e => setDestino(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: Iate Club" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pessoas a bordo *</label>
                        <input type="number" value={pessoasABordo} onChange={e => setPessoasABordo(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hora Saída *</label>
                        <input type="time" value={horaSaida} onChange={e => setHoraSaida(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hora Retorno *</label>
                        <input type="time" value={horaChegada} onChange={e => setHoraChegada(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                    </div>

                    {showSoundControls && (
                      <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200 mt-4">
                        <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                          Controle de Som
                        </h4>
                        <div>
                          <label className="flex items-center gap-3">
                            <input type="checkbox" checked={somRetirado} onChange={e => setSomRetirado(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm font-medium text-slate-700">Equipamento de Som Removido?</span>
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Teste na Saída</label>
                            <select value={somTesteSaida} onChange={e => setSomTesteSaida(e.target.value)} className="w-full text-sm border rounded-lg px-2 py-1.5">
                              <option value="nao_realizado">Não Realizado</option>
                              <option value="ok">Ok / Funcionando</option>
                              <option value="falha">Apresentou Falha</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Teste no Retorno</label>
                            <select value={somTesteRetorno} onChange={e => setSomTesteRetorno(e.target.value)} className="w-full text-sm border rounded-lg px-2 py-1.5">
                              <option value="nao_realizado">Não Realizado</option>
                              <option value="ok">Ok / Funcionando</option>
                              <option value="falha">Apresentou Falha</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Observações (Atual)</label>
                  <textarea value={numObs} onChange={e => setNumObs(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between">
                <button
                  onClick={() => handleDeleteReservation(statusModalEvent.id, statusModalEvent.googleEventId, statusModalEvent.embarcacaoId)}
                  disabled={isLoading}
                  className="px-4 py-2.5 text-rose-600 font-semibold rounded-xl hover:bg-rose-50 transition-colors text-sm flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Apagar
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setStatusModalEvent(null)} className="px-5 py-2.5 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 bg-slate-100 transition-colors text-sm">
                    Cancelar
                  </button>
                  <button onClick={handleUpdateEventStatus} disabled={isLoading || isUpdatingStatus} className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2">
                    {isUpdatingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                    Salvar {hasGoogleEvent ? '& Sincronizar' : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          main, main * { visibility: visible; }
          main { position: absolute; left: 0; top: 0; width: 100%; }
          .md\\:hidden, button { display: none !important; }
          aside { display: none !important; }
        }
      `}} />
    </div>
  );
}
