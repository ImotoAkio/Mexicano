import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  CheckCircle2,
  Clock,
  Camera,
  Lock,
  Ship,
  MapPin,
  Calendar,
  Repeat,
  User,
  Loader2,
  X,
  RotateCcw,
  Check,
  Sparkles,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Timer,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { AtividadeOperacional, ClasseFuncionarioAtividade } from '../../types';
import { getAdminToken } from '../../db';

interface AtividadesOperacionaisTabProps {
  classeDestino: ClasseFuncionarioAtividade;
  operadorNome: string;
  selectedDate?: string;
  onDateChange?: (newDate: string) => void;
}

const getFormattedDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export function formatDuration(seconds?: number | null): string {
  if (seconds == null || seconds < 0) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  if (mins > 0) {
    return `${mins}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

export function formatStopwatch(seconds?: number | null): string {
  if (seconds == null || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTimeTimestamp(iso?: string | null): string {
  if (!iso) return '--:--:--';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '--:--:--';
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--:--:--';
  }
}

export const AtividadesOperacionaisTab: React.FC<AtividadesOperacionaisTabProps> = ({
  classeDestino,
  operadorNome,
  selectedDate: propSelectedDate,
  onDateChange,
}) => {
  const [internalDate, setInternalDate] = useState<string>(() => getFormattedDate(new Date()));
  const activeDate = propSelectedDate || internalDate;

  const [atividades, setAtividades] = useState<AtividadeOperacional[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'todas' | 'pendente' | 'em_andamento' | 'concluida'>('todas');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Live ticker for active stopwatch
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Unified Activity Detail & Confirmation Sheet
  const [selectedAtvId, setSelectedAtvId] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [isUploadingFoto, setIsUploadingFoto] = useState<boolean>(false);
  const [observacaoExecucao, setObservacaoExecucao] = useState<string>('');
  const [isSubmittingConcluir, setIsSubmittingConcluir] = useState<boolean>(false);
  const [previewFotoModal, setPreviewFotoModal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAtv = atividades.find(a => a.id === selectedAtvId) || null;

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  const fetchAtividades = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = getAdminToken();
      const res = await fetch(
        `/api/atividades-operacionais?data=${encodeURIComponent(activeDate)}&classe=${encodeURIComponent(classeDestino)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.atividades)) {
          setAtividades(data.atividades);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar atividades operacionais:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeDate, classeDestino]);

  useEffect(() => {
    fetchAtividades(false);
  }, [fetchAtividades]);

  useEffect(() => {
    const token = getAdminToken();
    const socket = io('/', { path: '/socket.io', auth: { token } });
    const handleRemoteUpdate = () => {
      fetchAtividades(true);
    };
    socket.on('atividades_operacionais_update', handleRemoteUpdate);
    return () => {
      socket.off('atividades_operacionais_update', handleRemoteUpdate);
      socket.disconnect();
    };
  }, [fetchAtividades]);

  const handleChangeDate = (offsetDays: number) => {
    const d = new Date(`${activeDate}T12:00:00`);
    d.setDate(d.getDate() + offsetDays);
    const nextStr = getFormattedDate(d);
    if (onDateChange) onDateChange(nextStr);
    else setInternalDate(nextStr);
  };

  const openActivitySheet = (atv: AtividadeOperacional) => {
    setSelectedAtvId(atv.id);
    setFotoUrl(atv.fotoConferenciaUrl || '');
    setObservacaoExecucao(atv.observacaoExecucao || '');
  };

  const handleIniciarAtividade = async (atv: AtividadeOperacional, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionLoadingId(atv.id);
    try {
      const token = getAdminToken();
      const res = await fetch(`/api/atividades-operacionais/${encodeURIComponent(atv.id)}/iniciar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ executorNome: operadorNome }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Não foi possível iniciar a atividade.', 'error');
        fetchAtividades(true);
        return;
      }
      showToast('Atividade iniciada! Cronômetro em andamento.', 'success');
      await fetchAtividades(true);
      setSelectedAtvId(atv.id);
    } catch {
      showToast('Erro de conexão ao iniciar atividade.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReabrirAtividade = async (atv: AtividadeOperacional, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Deseja cancelar o início desta atividade e devolvê-la para Pendente?')) return;
    setActionLoadingId(atv.id);
    try {
      const token = getAdminToken();
      const res = await fetch(`/api/atividades-operacionais/${encodeURIComponent(atv.id)}/reabrir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ executorNome: operadorNome }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Erro ao reabrir atividade.', 'error');
        return;
      }
      showToast('Atividade devolvida para Pendente.', 'info');
      fetchAtividades(true);
    } catch {
      showToast('Erro de conexão ao reabrir atividade.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFoto(true);
    try {
      const token = getAdminToken();
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload/checklist-image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.message || 'Falha no envio da foto');
      }
      setFotoUrl(data.imageUrl);
      showToast('Foto anexada com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar foto de conferência.', 'error');
    } finally {
      setIsUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmarConclusao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAtv) return;

    if (selectedAtv.fotoObrigatoria && !fotoUrl) {
      showToast('Envie a foto de conferência obrigatória antes de confirmar.', 'error');
      return;
    }

    setIsSubmittingConcluir(true);
    try {
      const token = getAdminToken();
      const res = await fetch(
        `/api/atividades-operacionais/${encodeURIComponent(selectedAtv.id)}/concluir`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            executorNome: operadorNome,
            fotoConferenciaUrl: fotoUrl || null,
            observacaoExecucao: observacaoExecucao.trim() || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Erro ao concluir atividade.', 'error');
        return;
      }
      showToast('Atividade concluída e registrada com sucesso!', 'success');
      setSelectedAtvId(null);
      fetchAtividades(true);
    } catch {
      showToast('Erro de conexão ao concluir atividade.', 'error');
    } finally {
      setIsSubmittingConcluir(false);
    }
  };

  const totalCount = atividades.length;
  const pendentesCount = atividades.filter(a => a.status === 'pendente').length;
  const emAndamentoCount = atividades.filter(a => a.status === 'em_andamento').length;
  const concluidasCount = atividades.filter(a => a.status === 'concluida').length;

  const filteredList = atividades.filter(a => {
    if (statusFilter === 'todas') return true;
    return a.status === statusFilter;
  });

  const getPrioridadeStyle = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'alta':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'baixa':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-sky-100 text-sky-900 border-sky-200';
    }
  };

  const getFrequenciaLabel = (freq: string) => {
    switch (freq) {
      case 'diaria':
        return 'Diária';
      case 'semanal':
        return 'Semanal';
      case 'quinzenal':
        return 'Quinzenal';
      case 'mensal':
        return 'Mensal';
      default:
        return 'Avulsa';
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {toast && (
        <div
          className={`fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center justify-between gap-2 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-emerald-50'
              : toast.type === 'error'
              ? 'bg-red-900 text-red-50'
              : 'bg-slate-900 text-slate-50'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Seletor de Data Compacto caso não venha controlado do pai */}
      {!propSelectedDate && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
          <button
            onClick={() => handleChangeDate(-1)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#186b77]" />
            <input
              type="date"
              value={activeDate}
              onChange={e => e.target.value && setInternalDate(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
            />
            {activeDate !== getFormattedDate(new Date()) && (
              <button
                onClick={() => setInternalDate(getFormattedDate(new Date()))}
                className="px-2 py-0.5 text-[11px] font-bold bg-teal-50 text-[#186b77] rounded-md border border-teal-200"
              >
                Hoje
              </button>
            )}
          </div>
          <button
            onClick={() => handleChangeDate(1)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros de Status com Contadores Tabulares */}
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            { id: 'todas', label: 'Todas', count: totalCount, activeClass: 'bg-slate-900 text-white border-slate-900' },
            { id: 'pendente', label: 'Pendentes', count: pendentesCount, activeClass: 'bg-amber-600 text-white border-amber-600' },
            { id: 'em_andamento', label: 'Ativas', count: emAndamentoCount, activeClass: 'bg-blue-600 text-white border-blue-600' },
            { id: 'concluida', label: 'Concluídas', count: concluidasCount, activeClass: 'bg-emerald-700 text-white border-emerald-700' },
          ] as const
        ).map(tab => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                isActive
                  ? tab.activeClass
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="text-base font-black font-mono tabular-nums leading-none">
                {tab.count}
              </div>
              <div className={`text-[11px] font-semibold mt-1 truncate ${isActive ? 'text-white' : 'text-slate-600'}`}>
                {tab.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Lista de Atividades */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-[#186b77] animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Carregando atividades do dia...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">Nenhuma atividade encontrada</h4>
          <p className="text-xs text-slate-600 max-w-xs mx-auto">
            {statusFilter === 'todas'
              ? 'Não há atividades programadas para esta data no seu setor.'
              : 'Nenhuma atividade neste filtro para a data selecionada.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map(atv => {
            const isMine =
              !atv.executadoPorNome ||
              atv.executadoPorNome.toLowerCase() === operadorNome.toLowerCase();
            const isAssignedToOther =
              Boolean(atv.funcionarioDestinoNome) &&
              atv.funcionarioDestinoNome!.toLowerCase() !== operadorNome.toLowerCase();
            const isLockedByOther =
              atv.status !== 'pendente' && Boolean(atv.executadoPorNome) && !isMine;

            const elapsedSeconds =
              atv.status === 'em_andamento' && atv.iniciadoEm
                ? Math.max(0, Math.floor((nowMs - new Date(atv.iniciadoEm).getTime()) / 1000))
                : atv.duracaoSegundos || 0;

            return (
              <div
                key={atv.id}
                onClick={() => openActivitySheet(atv)}
                className={`bg-white rounded-2xl border transition-all overflow-hidden cursor-pointer ${
                  atv.status === 'concluida'
                    ? 'border-emerald-200 hover:border-emerald-300'
                    : atv.status === 'em_andamento'
                    ? 'border-blue-300 hover:border-blue-400'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-4 space-y-3">
                  {/* Top Meta Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${getPrioridadeStyle(
                          atv.prioridade
                        )}`}
                      >
                        {atv.prioridade}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        {getFrequenciaLabel(atv.frequenciaOrigem)}
                      </span>
                      {atv.fotoObrigatoria && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          Foto Obrigatória
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {atv.horarioLimite && (
                        <span className="text-[11px] font-bold font-mono tabular-nums text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-600" />
                          Até {atv.horarioLimite}
                        </span>
                      )}
                      <span className="text-xs font-bold text-[#186b77] inline-flex items-center gap-0.5">
                        Abrir
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {atv.titulo}
                    </h3>
                    {atv.descricao && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {atv.descricao}
                      </p>
                    )}
                  </div>

                  {/* Location / Boat / Target Employee */}
                  {(atv.embarcacaoNome || atv.setorLocal || atv.funcionarioDestinoNome) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {atv.embarcacaoNome && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-900 border border-cyan-200 font-semibold">
                          <Ship className="w-3.5 h-3.5" />
                          {atv.embarcacaoNome}
                        </span>
                      )}
                      {atv.setorLocal && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-slate-600" />
                          {atv.setorLocal}
                        </span>
                      )}
                      {atv.funcionarioDestinoNome && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 font-semibold">
                          <User className="w-3.5 h-3.5" />
                          {atv.funcionarioDestinoNome}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Active Telemetry Banner */}
                  {atv.status === 'em_andamento' && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                          Em execução por {atv.executadoPorNome}
                        </div>
                        <div className="text-[11px] text-blue-800 font-mono tabular-nums mt-0.5">
                          Início: {formatTimeTimestamp(atv.iniciadoEm)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black font-mono tabular-nums text-blue-950 block">
                          {formatStopwatch(elapsedSeconds)}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-800">
                          decorridos
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Completed Banner */}
                  {atv.status === 'concluida' && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="truncate">Concluída por {atv.executadoPorNome}</span>
                        </div>
                        <div className="text-[11px] text-emerald-800 font-mono tabular-nums mt-0.5">
                          {formatTimeTimestamp(atv.iniciadoEm)} → {formatTimeTimestamp(atv.concluidoEm)} ({formatDuration(atv.duracaoSegundos)})
                        </div>
                      </div>
                      {atv.fotoConferenciaUrl && (
                        <img
                          src={atv.fotoConferenciaUrl}
                          alt="Foto de conferência"
                          className="w-11 h-11 rounded-lg object-cover border border-emerald-300 shrink-0"
                        />
                      )}
                    </div>
                  )}

                  {/* Primary Action Row */}
                  <div className="pt-1" onClick={e => e.stopPropagation()}>
                    {atv.status === 'pendente' && (
                      <>
                        {isAssignedToOther ? (
                          <div className="w-full py-2.5 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4" />
                            Direcionada para {atv.funcionarioDestinoNome}
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoadingId === atv.id}
                            onClick={e => handleIniciarAtividade(atv, e)}
                            className="w-full py-3 px-4 rounded-xl bg-[#186b77] hover:bg-[#135660] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                          >
                            {actionLoadingId === atv.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 fill-current" />
                            )}
                            Iniciar Atividade
                          </button>
                        )}
                      </>
                    )}

                    {atv.status === 'em_andamento' && (
                      <>
                        {isLockedByOther ? (
                          <div className="w-full py-2.5 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4 shrink-0" />
                            Em execução por {atv.executadoPorNome}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openActivitySheet(atv)}
                            className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            Abrir Confirmação e Concluir
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAINEL DE CONFIRMAÇÃO E DETALHES DA ATIVIDADE */}
      {selectedAtv && (
        <div
          onClick={() => setSelectedAtvId(null)}
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
          >
            {/* Header da Ficha */}
            <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${getPrioridadeStyle(
                      selectedAtv.prioridade
                    )}`}
                  >
                    {selectedAtv.prioridade}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {getFrequenciaLabel(selectedAtv.frequenciaOrigem)}
                  </span>
                  {selectedAtv.status === 'pendente' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900">
                      Pendente
                    </span>
                  )}
                  {selectedAtv.status === 'em_andamento' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900">
                      Em Execução
                    </span>
                  )}
                  {selectedAtv.status === 'concluida' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900">
                      Concluída
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                  {selectedAtv.titulo}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAtvId(null)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo da Ficha */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Descrição e Localização */}
              {(selectedAtv.descricao || selectedAtv.setorLocal || selectedAtv.embarcacaoNome || selectedAtv.horarioLimite) && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  {selectedAtv.descricao && (
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                      {selectedAtv.descricao}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {selectedAtv.embarcacaoNome && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold">
                        <Ship className="w-3.5 h-3.5 text-[#186b77]" />
                        {selectedAtv.embarcacaoNome}
                      </span>
                    )}
                    {selectedAtv.setorLocal && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-slate-600" />
                        {selectedAtv.setorLocal}
                      </span>
                    )}
                    {selectedAtv.horarioLimite && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-mono tabular-nums font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Limite: {selectedAtv.horarioLimite}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Painel de Cronometragem e Timestamps */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold">
                      {selectedAtv.status === 'em_andamento'
                        ? 'Cronômetro em Andamento'
                        : selectedAtv.status === 'concluida'
                        ? 'Tempo Total Registrado'
                        : 'Aguardando Início'}
                    </span>
                  </div>
                  <span className="text-lg font-black font-mono tabular-nums text-teal-300">
                    {selectedAtv.status === 'em_andamento' && selectedAtv.iniciadoEm
                      ? formatStopwatch(
                          Math.max(0, Math.floor((nowMs - new Date(selectedAtv.iniciadoEm).getTime()) / 1000))
                        )
                      : selectedAtv.status === 'concluida'
                      ? formatDuration(selectedAtv.duracaoSegundos)
                      : '00:00'}
                  </span>
                </div>

                <div className="grid grid-cols-3 divide-x divide-slate-200 bg-white text-center">
                  <div className="p-3">
                    <span className="text-[11px] font-semibold text-slate-600 block">
                      Início
                    </span>
                    <span className="text-xs font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">
                      {formatTimeTimestamp(selectedAtv.iniciadoEm)}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[11px] font-semibold text-slate-600 block">
                      Conclusão
                    </span>
                    <span className="text-xs font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">
                      {formatTimeTimestamp(selectedAtv.concluidoEm)}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[11px] font-semibold text-slate-600 block">
                      Responsável
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                      {selectedAtv.executadoPorNome || operadorNome}
                    </span>
                  </div>
                </div>
              </div>

              {/* Se estiver EM ANDAMENTO pelo colaborador atual: Formulário de Confirmação e Foto */}
              {selectedAtv.status === 'em_andamento' &&
                (!selectedAtv.executadoPorNome ||
                  selectedAtv.executadoPorNome.toLowerCase() === operadorNome.toLowerCase()) && (
                  <form id="concluir-atv-form" onSubmit={handleConfirmarConclusao} className="space-y-4">
                    {/* Foto de Conferência */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-[#186b77]" />
                          Foto de Conferência
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                            selectedAtv.fotoObrigatoria
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {selectedAtv.fotoObrigatoria ? 'Obrigatória' : 'Opcional'}
                        </span>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFotoUpload}
                        className="hidden"
                      />

                      {fotoUrl ? (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
                          <img
                            src={fotoUrl}
                            alt="Foto de conferência anexada"
                            onClick={() => setPreviewFotoModal(fotoUrl)}
                            className="w-full h-52 object-cover cursor-pointer"
                          />
                          <div className="p-2.5 bg-slate-900 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              Imagem pronta para envio
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                              >
                                Trocar Foto
                              </button>
                              <button
                                type="button"
                                onClick={() => setFotoUrl('')}
                                className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isUploadingFoto}
                          onClick={() => fileInputRef.current?.click()}
                          className={`w-full py-7 px-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                            selectedAtv.fotoObrigatoria
                              ? 'border-rose-300 bg-rose-50/50 hover:bg-rose-50 text-rose-900'
                              : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          {isUploadingFoto ? (
                            <>
                              <Loader2 className="w-7 h-7 animate-spin text-[#186b77]" />
                              <span className="text-xs font-bold">Enviando imagem...</span>
                            </>
                          ) : (
                            <>
                              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#186b77]">
                                <Camera className="w-5 h-5" />
                              </div>
                              <span className="text-sm font-bold">
                                Capturar ou Anexar Foto de Conferência
                              </span>
                              <span className="text-xs text-slate-600">
                                {selectedAtv.fotoObrigatoria
                                  ? 'Toque aqui para tirar a foto exigida nesta tarefa'
                                  : 'Toque aqui caso queira registrar foto da entrega'}
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Observações */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        Observações da Execução (Opcional)
                      </label>
                      <textarea
                        rows={2}
                        value={observacaoExecucao}
                        onChange={e => setObservacaoExecucao(e.target.value)}
                        placeholder="Informe se houve alguma ocorrência ou observação..."
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white"
                      />
                    </div>
                  </form>
                )}

              {/* Se já estiver CONCLUÍDA: Mostra a evidência registrada */}
              {selectedAtv.status === 'concluida' && (
                <div className="space-y-3">
                  {selectedAtv.fotoConferenciaUrl ? (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-800 block">
                        Foto de Conferência Registrada
                      </span>
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
                        <img
                          src={selectedAtv.fotoConferenciaUrl}
                          alt="Foto de conferência"
                          onClick={() => setPreviewFotoModal(selectedAtv.fotoConferenciaUrl!)}
                          className="w-full h-56 object-cover cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
                      Atividade concluída sem foto anexada.
                    </div>
                  )}

                  {selectedAtv.observacaoExecucao && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-xs font-bold text-slate-800 block">
                        Observação registrada
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {selectedAtv.observacaoExecucao}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rodapé de Ações */}
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2.5">
              {selectedAtv.status === 'pendente' && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedAtvId(null)}
                    className="px-4 py-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    disabled={
                      actionLoadingId === selectedAtv.id ||
                      (Boolean(selectedAtv.funcionarioDestinoNome) &&
                        selectedAtv.funcionarioDestinoNome!.toLowerCase() !==
                          operadorNome.toLowerCase())
                    }
                    onClick={() => handleIniciarAtividade(selectedAtv)}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#186b77] hover:bg-[#135660] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoadingId === selectedAtv.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                    Iniciar Atividade Agora
                  </button>
                </>
              )}

              {selectedAtv.status === 'em_andamento' && (
                <>
                  {!selectedAtv.executadoPorNome ||
                  selectedAtv.executadoPorNome.toLowerCase() === operadorNome.toLowerCase() ? (
                    <>
                      <button
                        type="button"
                        disabled={actionLoadingId === selectedAtv.id}
                        onClick={() => handleReabrirAtividade(selectedAtv)}
                        className="px-3.5 py-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Cancelar Início
                      </button>
                      <button
                        type="submit"
                        form="concluir-atv-form"
                        disabled={
                          isSubmittingConcluir ||
                          isUploadingFoto ||
                          (selectedAtv.fotoObrigatoria && !fotoUrl)
                        }
                        className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingConcluir ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Confirmar e Concluir
                      </button>
                    </>
                  ) : (
                    <div className="w-full py-2.5 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" />
                      Em execução por {selectedAtv.executadoPorNome}
                    </div>
                  )}
                </>
              )}

              {selectedAtv.status === 'concluida' && (
                <button
                  type="button"
                  onClick={() => setSelectedAtvId(null)}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  Fechar Detalhes
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Zoom da Foto */}
      {previewFotoModal && (
        <div
          onClick={() => setPreviewFotoModal(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <div className="relative max-w-2xl w-full">
            <button
              onClick={() => setPreviewFotoModal(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:opacity-80"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewFotoModal}
              alt="Foto de conferência ampliada"
              className="w-full max-h-[82vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default AtividadesOperacionaisTab;
