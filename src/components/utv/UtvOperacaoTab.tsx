import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  Fuel,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Play,
  RotateCcw,
  Eye,
  Trash2,
  Filter,
  User,
  Truck,
  FileText
} from 'lucide-react';
import { UtvUso, UtvVeiculo, UtvCotista } from '../../types';
import { fetchWithAuth } from '../../utils/apiAuth';
import { formatHorimetroDecimal, formatKm, formatDateBR } from '../../utils/utvUtils';

interface UtvOperacaoTabProps {
  usos: UtvUso[];
  veiculos: UtvVeiculo[];
  cotistas: UtvCotista[];
  onOpenNovaReserva: () => void;
  onOpenChecklist: (uso: UtvUso, mode: 'saida' | 'devolucao' | 'visualizar') => void;
  onReload: () => void;
}

export default function UtvOperacaoTab({
  usos,
  veiculos,
  cotistas,
  onOpenNovaReserva,
  onOpenChecklist,
  onReload
}: UtvOperacaoTabProps) {
  // Filtros
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedVeiculo, setSelectedVeiculo] = useState<string>('todos');
  const [searchCotista, setSearchCotista] = useState('');

  // Navegação do Calendário
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal de Cancelamento
  const [cancelModalUso, setCancelModalUso] = useState<UtvUso | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);

  // Mês e Ano atual no calendário
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Gerar dias do mês
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days = [];
    // Dias do mês anterior para preencher início da semana
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Dias reais
    for (let d = 1; d <= lastDayOfMonth; d++) {
      const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr: dayStr });
    }
    return days;
  }, [currentYear, currentMonth]);

  // Mapa de ocupação por data
  const ocupacaoMap = useMemo(() => {
    const map = new Map<string, UtvUso[]>();
    usos.forEach(u => {
      if (u.status !== 'cancelado') {
        const arr = map.get(u.dataUso) || [];
        arr.push(u);
        map.set(u.dataUso, arr);
      }
    });
    return map;
  }, [usos]);

  // Usos filtrados para a listagem
  const filteredUsos = useMemo(() => {
    return usos.filter(u => {
      if (selectedStatus !== 'todos' && u.status !== selectedStatus) return false;
      if (selectedVeiculo !== 'todos' && u.veiculoId !== selectedVeiculo) return false;
      if (searchCotista.trim()) {
        const q = searchCotista.toLowerCase();
        const nome = (u.cotistaNome || '').toLowerCase();
        const cota = (u.cotistaCota || '').toLowerCase();
        if (!nome.includes(q) && !cota.includes(q)) return false;
      }
      return true;
    });
  }, [usos, selectedStatus, selectedVeiculo, searchCotista]);

  // Cancelar Uso
  const handleConfirmCancel = async () => {
    if (!cancelModalUso) return;
    setIsCanceling(true);

    try {
      const res = await fetchWithAuth('/api/utv/usos/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cancelModalUso.id,
          motivoCancelamento: motivoCancelamento || 'Cancelado pelo administrador'
        })
      });

      if (res.ok) {
        setCancelModalUso(null);
        setMotivoCancelamento('');
        onReload();
      } else {
        const data = await res.json();
        alert(data.message || 'Erro ao cancelar uso.');
      }
    } catch (e: any) {
      alert('Erro de comunicação: ' + e.message);
    } finally {
      setIsCanceling(false);
    }
  };

  // Excluir Uso (reserva não realizada)
  const handleDeleteUso = async (id: string, status: string) => {
    if (status === 'realizado') {
      alert('É terminantemente proibido apagar um uso já realizado (Regra de integridade do UTV).');
      return;
    }

    if (!confirm('Deseja excluir este registro de uso?')) return;

    try {
      const res = await fetchWithAuth(`/api/utv/usos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onReload();
      } else {
        const data = await res.json();
        alert(data.message || 'Erro ao excluir uso.');
      }
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="space-y-6">

      {/* ── BARRA SUPERIOR: CALENDÁRIO + AÇÃO PRINCIPAL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Painel do Calendário (Ocupação das Trilhas) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-amber-600" />
              <h3 className="font-black text-slate-800 text-base">
                Ocupação de Trilhas • {monthNames[currentMonth]} {currentYear}
              </h3>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hoje
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grade de Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, idx) => (
              <span key={idx} className="text-[10px] font-black uppercase text-slate-400 py-1">
                {dia}
              </span>
            ))}
          </div>

          {/* Grade de Datas */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((item, idx) => {
              if (!item) {
                return <div key={`empty-${idx}`} className="h-14 rounded-xl bg-slate-50/50" />;
              }

              const ocupacoes = ocupacaoMap.get(item.dateStr) || [];
              const hasOcupacao = ocupacoes.length > 0;
              const isToday = item.dateStr === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={item.dateStr}
                  className={`h-14 p-1 rounded-xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? 'border-amber-500 bg-amber-50/30'
                      : hasOcupacao
                      ? 'border-slate-300 bg-slate-50'
                      : 'border-slate-100 hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold ${
                      isToday ? 'text-amber-700 font-black' : 'text-slate-600'
                    }`}>
                      {item.dayNumber}
                    </span>
                    {hasOcupacao && (
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </div>

                  {hasOcupacao ? (
                    <div className="space-y-0.5">
                      {ocupacoes.map((u) => {
                        const isRealizado = u.status === 'realizado';
                        const isEmUso = u.status === 'em_uso';
                        return (
                          <div
                            key={u.id}
                            onClick={() => onOpenChecklist(u, isRealizado ? 'visualizar' : isEmUso ? 'devolucao' : 'saida')}
                            className={`text-[9px] font-bold px-1 py-0.5 rounded truncate cursor-pointer shadow-2xs ${
                              isRealizado
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isEmUso
                                ? 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                            title={`${u.cotistaNome || 'Cotista'} - ${u.status}`}
                          >
                            {u.cotistaCota || u.cotistaNome?.split(' ')[0]}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-300 self-end">Livre</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legenda do Calendário */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Reservado (Saldo Bloqueado)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Em Uso (Na Trilha)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Realizado (Baixa na Franquia Efetivada)</span>
            </div>
          </div>

        </div>

        {/* Card Lateral: Ações Rápidas & Regras Operacionais */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 rounded-3xl p-6 text-white flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                Operação UTV
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                Gestão de Trilha & Cotistas
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Lançamento de reservas, checklists rigorosos e conferência de combustível full-to-full.
              </p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2 text-xs">
              <div className="font-bold text-amber-300 flex items-center space-x-1.5">
                <Fuel className="w-4 h-4" />
                <span>Regra Tanque Cheio → Cheio</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                O UTV é retirado 100% abastecido e deve retornar da mesma forma com comprovante anexado no checklist de devolução.
              </p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2 text-xs">
              <div className="font-bold text-amber-300 flex items-center space-x-1.5">
                <Clock className="w-4 h-4" />
                <span>Horímetro Decimal</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Cada 0,1 h equivale a 6 minutos de motor. O KM e as horas ficam acumulados permanentemente para rateios.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={onOpenNovaReserva}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Reserva de UTV</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── LISTAGEM DE REGISTROS DE USO (HISTÓRICO & STATUS) ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">

        {/* Cabeçalho da Listagem & Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-800">
              Histórico & Agendamentos de Uso ({filteredUsos.length})
            </h3>
            <p className="text-xs text-slate-500">
              Acompanhamento de retiradas, retornos, comprovantes e integridade de dados
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="todos">Todos os Status</option>
              <option value="reservado">Reservado</option>
              <option value="em_uso">Em Uso</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </select>

            {/* Busca rápida */}
            <input
              type="text"
              placeholder="Buscar cotista ou cota..."
              value={searchCotista}
              onChange={(e) => setSearchCotista(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 w-44"
            />
          </div>
        </div>

        {/* Tabela de Usos */}
        {filteredUsos.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Nenhum agendamento ou uso encontrado com os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-3">Cotista / Cota</th>
                  <th className="py-3 px-3">Veículo</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Saída (KM / Horímetro)</th>
                  <th className="py-3 px-3">Retorno (KM / Horímetro)</th>
                  <th className="py-3 px-3">Uso Real</th>
                  <th className="py-3 px-3 text-right">Ações Operacionais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsos.map((u) => {
                  const isReservado = u.status === 'reservado';
                  const isEmUso = u.status === 'em_uso';
                  const isRealizado = u.status === 'realizado';
                  const isCancelado = u.status === 'cancelado';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">

                      {/* Data */}
                      <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                        {formatDateBR(u.dataUso)}
                      </td>

                      {/* Cotista */}
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900">{u.cotistaNome || 'Cotista'}</div>
                        <div className="text-[10px] font-bold text-amber-700">{u.cotistaCota || 'Cota'}</div>
                      </td>

                      {/* Veículo */}
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {u.veiculoNome || 'UTV'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isRealizado
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isEmUso
                            ? 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse'
                            : isCancelado
                            ? 'bg-slate-100 text-slate-500 border border-slate-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      {/* Saída */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {u.kmInicial !== null && u.kmInicial !== undefined ? (
                          <div>
                            <div>{formatKm(u.kmInicial)} • {u.horaSaida || '-'}</div>
                            <div className="text-[10px] text-slate-400">{formatHorimetroDecimal(u.horimetroInicial)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pendente</span>
                        )}
                      </td>

                      {/* Retorno */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {u.kmFinal !== null && u.kmFinal !== undefined ? (
                          <div>
                            <div>{formatKm(u.kmFinal)} • {u.horaChegada || '-'}</div>
                            <div className="text-[10px] text-slate-400">{formatHorimetroDecimal(u.horimetroFinal)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pendente</span>
                        )}
                      </td>

                      {/* Delta Real */}
                      <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-800">
                        {isRealizado ? (
                          <div>
                            <div className="text-emerald-700">+{formatKm(u.kmRodado)}</div>
                            <div className="text-[10px] text-amber-700">+{formatHorimetroDecimal(u.horasUtilizadas)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">

                          {/* Ação 1: Checklist de Saída */}
                          {isReservado && (
                            <button
                              onClick={() => onOpenChecklist(u, 'saida')}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 flex items-center space-x-1 cursor-pointer"
                              title="Registrar Retirada / Saída"
                            >
                              <Play className="w-3 h-3" />
                              <span>Saída</span>
                            </button>
                          )}

                          {/* Ação 2: Checklist de Devolução */}
                          {isEmUso && (
                            <button
                              onClick={() => onOpenChecklist(u, 'devolucao')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 flex items-center space-x-1 cursor-pointer"
                              title="Registrar Devolução e Fechar"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Devolução</span>
                            </button>
                          )}

                          {/* Ação 3: Visualizar Espelho Completo */}
                          <button
                            onClick={() => onOpenChecklist(u, 'visualizar')}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Visualizar detalhes do checklist"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Ação 4: Cancelar Reserva (estorna saldo) */}
                          {(isReservado || isEmUso) && (
                            <button
                              onClick={() => setCancelModalUso(u)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Cancelar uso (estorna a data)"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Ação 5: Excluir (somente se não for realizado, trava de integridade utv.md) */}
                          {isCancelado && (
                            <button
                              onClick={() => handleDeleteUso(u.id, u.status)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Excluir histórico cancelado"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

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

      {/* ── MODAL DE CANCELAMENTO ── */}
      {cancelModalUso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center space-x-2 text-red-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirmar Cancelamento de Reserva</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O cancelamento da reserva de <strong className="text-slate-800">{cancelModalUso.cotistaNome}</strong> em <strong className="text-slate-800">{formatDateBR(cancelModalUso.dataUso)}</strong> liberará a data na agenda e <strong className="text-emerald-700">não descontará</strong> o dia da cota anual do usuário.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Motivo do Cancelamento
              </label>
              <textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Imprevisto do cotista, condições climáticas desfavoráveis..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalUso(null)}
                disabled={isCanceling}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCanceling}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
              >
                {isCanceling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
