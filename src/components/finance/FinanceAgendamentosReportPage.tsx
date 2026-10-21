import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Calendar,
  Ship,
  Users,
  FileText,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  X,
  Phone,
  Printer,
  Compass,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { JetSkiIcon } from '../icons/JetSkiIcon';
import { reservationDB, boatDB, clientDB } from '../../db';
import { Reserva, Embarcacao, Cliente } from '../../types';
import { getBoatCode } from '../../utils/boatUtils';
import { generateAdminReportPDF } from '../../utils/pdfGenerator';

export default function FinanceAgendamentosReportPage() {
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
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [selectedTipoEmb, setSelectedTipoEmb] = useState('');
  const [searchText, setSearchText] = useState('');

  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [reservations, setReservations] = useState<Reserva[]>([]);

  // Detailed reservation inspection modal
  const [inspectedReservation, setInspectedReservation] = useState<Reserva | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setBoats(boatDB.getAll().sort((a, b) => a.nome.localeCompare(b.nome)));
    setClients(clientDB.getAll().sort((a, b) => a.nome.localeCompare(b.nome)));
    setReservations(reservationDB.getAll());
  }, []);

  const getClient = (id: string) => clients.find(c => c.id === id);
  const getBoat = (id: string) => boats.find(b => b.id === id);

  // Filtered results
  const filteredResults = useMemo(() => {
    return reservations.filter(res => {
      if (startDate && res.data < startDate) return false;
      if (endDate && res.data > endDate) return false;
      if (selectedBoatId && res.embarcacaoId !== selectedBoatId) return false;
      if (selectedClientId && res.clienteId !== selectedClientId) return false;
      if (selectedStatus && res.status !== selectedStatus) return false;
      if (selectedPeriodo && res.periodo !== selectedPeriodo) return false;

      if (selectedTipoEmb) {
        const boat = getBoat(res.embarcacaoId);
        if (boat && boat.tipo !== selectedTipoEmb) return false;
      }

      if (searchText.trim()) {
        const q = searchText.toLowerCase().trim();
        const client = getClient(res.clienteId);
        const boat = getBoat(res.embarcacaoId);
        const clientMatch = client?.nome.toLowerCase().includes(q) || client?.cpf?.includes(q);
        const boatMatch = boat?.nome.toLowerCase().includes(q) || boat?.codigoCotista?.toLowerCase().includes(q);
        const obsMatch = res.observações?.toLowerCase().includes(q);
        const destMatch = res.destino?.toLowerCase().includes(q);
        if (!clientMatch && !boatMatch && !obsMatch && !destMatch) return false;
      }

      return true;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [reservations, startDate, endDate, selectedBoatId, selectedClientId, selectedStatus, selectedPeriodo, selectedTipoEmb, searchText, boats, clients]);

  // Statistics
  const metrics = useMemo(() => {
    const total = filteredResults.length;
    const confirmados = filteredResults.filter(r => r.status === 'confirmado').length;
    const agendados = filteredResults.filter(r => r.status === 'agendado').length;
    const cancelados = filteredResults.filter(r => r.status === 'cancelado').length;
    return { total, confirmados, agendados, cancelados };
  }, [filteredResults]);

  const clearAllFilters = () => {
    setSelectedBoatId('');
    setSelectedClientId('');
    setSelectedStatus('');
    setSelectedPeriodo('');
    setSelectedTipoEmb('');
    setSearchText('');
  };

  const applyPreset = (preset: 'mes_atual' | 'mes_anterior' | 'ultimos_30' | 'ano_atual') => {
    const today = new Date();
    if (preset === 'mes_atual') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(first.toISOString().split('T')[0]);
      setEndDate(last.toISOString().split('T')[0]);
    } else if (preset === 'mes_anterior') {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(first.toISOString().split('T')[0]);
      setEndDate(last.toISOString().split('T')[0]);
    } else if (preset === 'ultimos_30') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'ano_atual') {
      const first = new Date(today.getFullYear(), 0, 1);
      const last = new Date(today.getFullYear(), 11, 31);
      setStartDate(first.toISOString().split('T')[0]);
      setEndDate(last.toISOString().split('T')[0]);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const columns = ['Data', 'Embarcação', 'Cotista / Cliente', 'Período', 'Status', 'Destino / Observações'];
      const rows = filteredResults.map(res => {
        const boat = getBoat(res.embarcacaoId);
        const client = getClient(res.clienteId);
        const dt = new Date(res.data + 'T12:00:00');
        const formattedDate = isNaN(dt.getTime()) ? res.data : dt.toLocaleDateString('pt-BR');
        const periodMap: Record<string, string> = {
          'dia_inteiro': 'Dia Inteiro',
          'manha': 'Manhã (08h - 13h)',
          'tarde': 'Tarde (13h - 18h)',
        };
        const statusMap: Record<string, string> = {
          'agendado': 'Agendado',
          'confirmado': 'Confirmado',
          'cancelado': 'Cancelado',
        };

        const boatName = boat ? `${getBoatCode(boat)} (${boat.tipo === 'jet' ? 'Jet' : 'Lancha'})` : 'N/A';
        const dest = res.destino
          ? `Destino: ${res.destino}${res.observações ? ' | ' + res.observações : ''}`
          : (res.observações || '—');

        return [
          formattedDate,
          boatName,
          client ? client.nome : 'N/A',
          periodMap[res.periodo] || res.periodo,
          statusMap[res.status] || res.status,
          dest,
        ];
      });

      const metricsData = [
        { label: 'Total de Agendamentos', value: String(metrics.total) },
        { label: 'Confirmados', value: String(metrics.confirmados) },
        { label: 'Agendados', value: String(metrics.agendados) },
        { label: 'Cancelados', value: String(metrics.cancelados) },
      ];

      const startFormatted = startDate ? new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR') : '';
      const endFormatted = endDate ? new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR') : '';

      await generateAdminReportPDF(
        'EL MEXICANO - RELATÓRIO DE AGENDAMENTOS NÁUTICOS',
        `Período Analisado: ${startFormatted} até ${endFormatted}`,
        columns,
        rows,
        metricsData
      );
    } catch (err) {
      console.error('Erro ao gerar relatório em PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmado':
        return {
          label: 'Confirmado',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dotClass: 'bg-emerald-500'
        };
      case 'cancelado':
        return {
          label: 'Cancelado',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
          dotClass: 'bg-rose-500'
        };
      default:
        return {
          label: 'Agendado',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dotClass: 'bg-amber-500'
        };
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'dia_inteiro': return 'Dia Inteiro';
      case 'manha': return 'Manhã';
      case 'tarde': return 'Tarde';
      default: return period;
    }
  };

  const hasActiveFilters = Boolean(
    selectedBoatId ||
    selectedClientId ||
    selectedStatus ||
    selectedPeriodo ||
    selectedTipoEmb ||
    searchText.trim()
  );

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white p-5 lg:p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-800">
              <FileSpreadsheet className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-900">
                Relatórios & Agendamentos
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Histórico consolidado, auditoria de saídas náuticas e emissão de relatórios em PDF
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Export PDF */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting || filteredResults.length === 0}
            className="h-9 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
            title="Exportar listagem filtrada para PDF formatado"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Gerando PDF…' : 'Exportar Relatório PDF'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Total Filtrado</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-stone-900 tabular-nums">{metrics.total}</p>
            <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
              Saídas
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Registros no intervalo selecionado</p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Confirmados</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-emerald-700 tabular-nums">{metrics.confirmados}</p>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
              Realizadas
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Saídas liberadas pela marina</p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Agendados</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-amber-700 tabular-nums">{metrics.agendados}</p>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
              Pendentes
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Previsões ainda não confirmadas</p>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Cancelados</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-black text-rose-700 tabular-nums">{metrics.cancelados}</p>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-md">
              Canceladas
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Desistências ou cancelamentos</p>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
        {/* Row 1: Date Range & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200/80 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-bold text-stone-400 uppercase">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-stone-800 cursor-pointer focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200/80 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-bold text-stone-400 uppercase">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-stone-800 cursor-pointer focus:outline-hidden"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset('mes_atual')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200/80 text-stone-700 transition-colors cursor-pointer"
            >
              Este Mês
            </button>
            <button
              type="button"
              onClick={() => applyPreset('mes_anterior')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200/80 text-stone-700 transition-colors cursor-pointer"
            >
              Mês Anterior
            </button>
            <button
              type="button"
              onClick={() => applyPreset('ultimos_30')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200/80 text-stone-700 transition-colors cursor-pointer"
            >
              Últimos 30 Dias
            </button>
            <button
              type="button"
              onClick={() => applyPreset('ano_atual')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200/80 text-stone-700 transition-colors cursor-pointer"
            >
              Ano Atual
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns and Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por cotista, CPF, embarcação ou destino..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-hidden focus:border-stone-400"
            />
          </div>

          {/* Embarcação */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedBoatId}
              onChange={e => setSelectedBoatId(e.target.value)}
              className="w-full h-9 pl-3 pr-8 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 appearance-none cursor-pointer focus:outline-hidden focus:border-stone-400"
            >
              <option value="">Todas Embarcações</option>
              {boats.map(boat => (
                <option key={boat.id} value={boat.id}>
                  {getBoatCode(boat)} ({boat.tipo === 'jet' ? 'Jet' : 'Lancha'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>

          {/* Tipo de Embarcação */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedTipoEmb}
              onChange={e => setSelectedTipoEmb(e.target.value)}
              className="w-full h-9 pl-3 pr-8 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 appearance-none cursor-pointer focus:outline-hidden focus:border-stone-400"
            >
              <option value="">Todos Tipos</option>
              <option value="lancha">Lanchas</option>
              <option value="jet">Jets</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>

          {/* Status */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full h-9 pl-3 pr-8 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 appearance-none cursor-pointer focus:outline-hidden focus:border-stone-400"
            >
              <option value="">Todos Status</option>
              <option value="confirmado">Confirmado</option>
              <option value="agendado">Agendado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>

          {/* Período */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedPeriodo}
              onChange={e => setSelectedPeriodo(e.target.value)}
              className="w-full h-9 pl-3 pr-8 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 appearance-none cursor-pointer focus:outline-hidden focus:border-stone-400"
            >
              <option value="">Todos Períodos</option>
              <option value="dia_inteiro">Dia Inteiro</option>
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>

          {/* Clear button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Limpar todos os filtros"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Results Table */}
      <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200/80 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Embarcação</th>
                <th className="px-5 py-3">Cotista / Proprietário</th>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3">Destino / Previsão</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-stone-400">
                    Nenhum agendamento encontrado no período com os filtros informados.
                  </td>
                </tr>
              ) : (
                filteredResults.map((res, idx) => {
                  const rDate = new Date(res.data + 'T00:00:00');
                  const formattedDate = rDate.toLocaleDateString('pt-BR');
                  const badge = getStatusBadge(res.status);
                  const boat = getBoat(res.embarcacaoId);
                  const client = getClient(res.clienteId);

                  return (
                    <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-stone-900 whitespace-nowrap">{formattedDate}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {boat?.tipo === 'jet' ? (
                            <JetSkiIcon className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          ) : (
                            <Ship className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          )}
                          <span className="font-bold text-stone-800">{getBoatCode(boat)}</span>
                          <span className="text-[10px] text-stone-400">({boat?.tipo === 'jet' ? 'Jet' : 'Lancha'})</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-stone-900">{client?.nome || 'N/A'}</div>
                        {client?.telefone && (
                          <div className="text-[10px] text-stone-400 font-mono mt-0.5">{client.telefone}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-medium text-stone-600">
                        {getPeriodLabel(res.periodo)}
                      </td>
                      <td className="px-5 py-3.5 text-stone-600 max-w-xs truncate">
                        {res.destino ? (
                          <span className="font-medium text-stone-800">{res.destino}</span>
                        ) : res.observações ? (
                          <span className="text-stone-500">{res.observações}</span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                        {res.previsaoSaida && (
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            Saída: {res.previsaoSaida} {res.previsaoChegada ? `• Retorno: ${res.previsaoChegada}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${badge.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectedReservation(res)}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Reservation Inspection Modal (Read-Only) */}
      {inspectedReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs font-sans animate-in fade-in duration-150"
          onClick={() => setInspectedReservation(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-stone-200/80 w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Ficha do Agendamento</h3>
                  <p className="text-[11px] text-stone-400">Auditoria e controle financeiro de saída</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedReservation(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200/70">
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-400">Data da Saída</p>
                  <p className="font-bold text-stone-900 text-sm mt-0.5">
                    {new Date(inspectedReservation.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-400">Status da Saída</p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border mt-1 ${getStatusBadge(inspectedReservation.status).badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(inspectedReservation.status).dotClass}`} />
                    {getStatusBadge(inspectedReservation.status).label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200/70">
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-400">Embarcação</p>
                  <p className="font-bold text-stone-900 mt-0.5">
                    {getBoatCode(getBoat(inspectedReservation.embarcacaoId))}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    {getBoat(inspectedReservation.embarcacaoId)?.nome}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-400">Período de Uso</p>
                  <p className="font-semibold text-stone-800 mt-0.5">
                    {getPeriodLabel(inspectedReservation.periodo)}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                <p className="text-[10px] uppercase font-bold text-stone-400">Cotista Responsável</p>
                <p className="font-bold text-stone-900">{getClient(inspectedReservation.clienteId)?.nome || 'N/A'}</p>
                {getClient(inspectedReservation.clienteId)?.telefone && (
                  <p className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-1 font-mono">
                    <Phone className="w-3 h-3 text-stone-400" />
                    {getClient(inspectedReservation.clienteId)?.telefone}
                  </p>
                )}
              </div>

              {(inspectedReservation.destino || inspectedReservation.previsaoSaida) && (
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Informações de Rota & Horários</p>
                  {inspectedReservation.destino && (
                    <p className="text-stone-800"><span className="font-semibold">Destino:</span> {inspectedReservation.destino}</p>
                  )}
                  {inspectedReservation.previsaoSaida && (
                    <p className="text-stone-700">
                      <span className="font-semibold">Previsão:</span> Saída às {inspectedReservation.previsaoSaida}
                      {inspectedReservation.previsaoChegada ? ` • Retorno às ${inspectedReservation.previsaoChegada}` : ''}
                    </p>
                  )}
                  {inspectedReservation.pessoasABordo && (
                    <p className="text-stone-700"><span className="font-semibold">Pessoas a bordo:</span> {inspectedReservation.pessoasABordo}</p>
                  )}
                </div>
              )}

              {inspectedReservation.observações && (
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Observações Registradas</p>
                  <p className="font-normal text-stone-700 leading-relaxed">{inspectedReservation.observações}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedReservation(null)}
                className="h-9 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
