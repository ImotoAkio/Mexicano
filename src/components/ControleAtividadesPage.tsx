import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  Camera,
  CheckCircle2,
  Play,
  RotateCcw,
  Trash2,
  Edit2,
  Repeat,
  User,
  Ship,
  MapPin,
  Search,
  Eye,
  X,
  Check,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Anchor,
  Wrench,
  Power,
  Timer,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { io } from 'socket.io-client';
import {
  AtividadeOperacional,
  AtividadeProgramada,
  ClasseFuncionarioAtividade,
  FrequenciaAtividadeOperacional,
  PrioridadeAtividadeOperacional,
  Funcionario,
  Embarcacao,
} from '../types';
import { boatDB, funcionarioDB, getAdminToken } from '../db';
import {
  formatDuration,
  formatStopwatch,
  formatTimeTimestamp,
} from './MarinaOperador/AtividadesOperacionaisTab';
import { uploadPhotoToStorage } from '../utils/checklistStorage';

const DIAS_SEMANA = [
  { id: 1, short: 'Seg', full: 'Segunda' },
  { id: 2, short: 'Ter', full: 'Terça' },
  { id: 3, short: 'Qua', full: 'Quarta' },
  { id: 4, short: 'Qui', full: 'Quinta' },
  { id: 5, short: 'Sex', full: 'Sexta' },
  { id: 6, short: 'Sáb', full: 'Sábado' },
  { id: 0, short: 'Dom', full: 'Domingo' },
];

const SETORES_SUGERIDOS = [
  'Píer Principal',
  'Galpão Seco / Hangar',
  'Guarita / Recepção',
  'Banheiros & Vestiários',
  'Posto de Combustível',
  'Área de Convivência / Gourmet',
  'Pátio Externo / Estacionamento',
  'Embarcação',
];

const getFormattedDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function ControleAtividadesPage() {
  const todayStr = getFormattedDate(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'execucao' | 'recorrencias'>('execucao');

  const [atividades, setAtividades] = useState<AtividadeOperacional[]>([]);
  const [programacoes, setProgramacoes] = useState<AtividadeProgramada[]>([]);
  const [colaboradores, setColaboradores] = useState<Funcionario[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [classeFilter, setClasseFilter] = useState<'todas' | ClasseFuncionarioAtividade>('todas');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'pendente' | 'em_andamento' | 'concluida'>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingModo, setEditingModo] = useState<'avulsa' | 'programacao'>('avulsa');

  // Form states
  const [titulo, setTitulo] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [classeDestino, setClasseDestino] = useState<ClasseFuncionarioAtividade>('marinheiro');
  const [funcionarioDestinoId, setFuncionarioDestinoId] = useState<string>('');
  const [embarcacaoId, setEmbarcacaoId] = useState<string>('');
  const [setorLocal, setSetorLocal] = useState<string>('');
  const [prioridade, setPrioridade] = useState<PrioridadeAtividadeOperacional>('normal');
  const [frequencia, setFrequencia] = useState<FrequenciaAtividadeOperacional>('avulsa');
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 3, 5]);
  const [diaMes, setDiaMes] = useState<number>(1);
  const [dataProgramada, setDataProgramada] = useState<string>(todayStr);
  const [horarioLimite, setHorarioLimite] = useState<string>('');
  const [tempoEstimadoMinutos, setTempoEstimadoMinutos] = useState<string>('');
  const [fotoObrigatoria, setFotoObrigatoria] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Unified Inspection & Confirmation Drawer/Modal when clicking an activity
  const [inspectAtvId, setInspectAtvId] = useState<string | null>(null);
  const [inspectFotoUrl, setInspectFotoUrl] = useState<string>('');
  const [inspectObservacao, setInspectObservacao] = useState<string>('');
  const [isUploadingFoto, setIsUploadingFoto] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [zoomFotoUrl, setZoomFotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inspectAtv = atividades.find(a => a.id === inspectAtvId) || null;

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadAuxData = useCallback(async () => {
    setBoats(boatDB.getAll());
    setColaboradores(funcionarioDB.getAll());
    try {
      const token = getAdminToken();
      const res = await fetch('/api/funcionarios', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) setColaboradores(list);
      }
    } catch {}
  }, []);

  const fetchAtividades = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = getAdminToken();
      const res = await fetch(
        `/api/atividades-operacionais?data=${encodeURIComponent(selectedDate)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.atividades)) setAtividades(data.atividades);
        if (Array.isArray(data.programacoes)) setProgramacoes(data.programacoes);
      }
    } catch (err) {
      console.error('Erro ao buscar controle de atividades:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadAuxData();
  }, [loadAuxData]);

  useEffect(() => {
    fetchAtividades(false);
  }, [fetchAtividades]);

  useEffect(() => {
    const token = getAdminToken();
    const socket = io('/', { path: '/socket.io', auth: { token } });
    const onUpdate = () => fetchAtividades(true);
    socket.on('atividades_operacionais_update', onUpdate);
    return () => {
      socket.off('atividades_operacionais_update', onUpdate);
      socket.disconnect();
    };
  }, [fetchAtividades]);

  const openInspectModal = (atv: AtividadeOperacional) => {
    setInspectAtvId(atv.id);
    setInspectFotoUrl(atv.fotoConferenciaUrl || '');
    setInspectObservacao(atv.observacaoExecucao || '');
  };

  const handleOpenNewModal = (defaultFreq: FrequenciaAtividadeOperacional = 'avulsa') => {
    setEditingId(null);
    setEditingModo(defaultFreq === 'avulsa' ? 'avulsa' : 'programacao');
    setTitulo('');
    setDescricao('');
    setClasseDestino('marinheiro');
    setFuncionarioDestinoId('');
    setEmbarcacaoId('');
    setSetorLocal('');
    setPrioridade('normal');
    setFrequencia(defaultFreq);
    setDiasSemana([1, 3, 5]);
    setDiaMes(new Date().getDate());
    setDataProgramada(selectedDate);
    setHorarioLimite('');
    setTempoEstimadoMinutos('');
    setFotoObrigatoria(true);
    setIsModalOpen(true);
  };

  const handleOpenEditAtividade = (atv: AtividadeOperacional, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInspectAtvId(null);
    setEditingId(atv.id);
    setEditingModo('avulsa');
    setTitulo(atv.titulo);
    setDescricao(atv.descricao || '');
    setClasseDestino(atv.classeDestino);
    setFuncionarioDestinoId(atv.funcionarioDestinoId || '');
    setEmbarcacaoId(atv.embarcacaoId || '');
    setSetorLocal(atv.setorLocal || '');
    setPrioridade(atv.prioridade);
    setFrequencia('avulsa');
    setDataProgramada(atv.dataProgramada);
    setHorarioLimite(atv.horarioLimite || '');
    setTempoEstimadoMinutos(atv.tempoEstimadoMinutos ? String(atv.tempoEstimadoMinutos) : '');
    setFotoObrigatoria(Boolean(atv.fotoObrigatoria));
    setIsModalOpen(true);
  };

  const handleOpenEditProgramacao = (prog: AtividadeProgramada) => {
    setEditingId(prog.id);
    setEditingModo('programacao');
    setTitulo(prog.titulo);
    setDescricao(prog.descricao || '');
    setClasseDestino(prog.classeDestino);
    setFuncionarioDestinoId(prog.funcionarioDestinoId || '');
    setEmbarcacaoId(prog.embarcacaoId || '');
    setSetorLocal(prog.setorLocal || '');
    setPrioridade(prog.prioridade);
    setFrequencia(prog.frequencia);
    setDiasSemana(Array.isArray(prog.diasSemana) && prog.diasSemana.length > 0 ? prog.diasSemana : [1]);
    setDiaMes(prog.diaMes || 1);
    setDataProgramada(prog.dataInicio || selectedDate);
    setHorarioLimite(prog.horarioLimite || '');
    setTempoEstimadoMinutos(prog.tempoEstimadoMinutos ? String(prog.tempoEstimadoMinutos) : '');
    setFotoObrigatoria(Boolean(prog.fotoObrigatoria));
    setIsModalOpen(true);
  };

  const toggleDiaSemana = (dow: number) => {
    setDiasSemana(prev =>
      prev.includes(dow)
        ? prev.length > 1
          ? prev.filter(d => d !== dow)
          : prev
        : [...prev, dow].sort()
    );
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    setIsSaving(true);
    try {
      const token = getAdminToken();
      const matchedColab = colaboradores.find(c => c.id === funcionarioDestinoId);
      const matchedBoat = boats.find(b => b.id === embarcacaoId);

      const isProgramacao = frequencia !== 'avulsa';
      const payload = {
        modo: isProgramacao ? 'programacao' : 'avulsa',
        data: {
          id: editingId || undefined,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          classeDestino,
          funcionarioDestinoId: matchedColab ? matchedColab.id : null,
          funcionarioDestinoNome: matchedColab ? matchedColab.nome : null,
          embarcacaoId: matchedBoat ? matchedBoat.id : null,
          embarcacaoNome: matchedBoat ? matchedBoat.nome : null,
          setorLocal: setorLocal.trim() || null,
          prioridade,
          frequencia: isProgramacao ? frequencia : undefined,
          frequenciaOrigem: !isProgramacao ? 'avulsa' : frequencia,
          diasSemana: frequencia === 'semanal' ? diasSemana : [],
          diaMes: frequencia === 'mensal' ? Number(diaMes) || 1 : null,
          dataInicio: dataProgramada,
          dataProgramada: dataProgramada,
          dataReferencia: selectedDate,
          horarioLimite: horarioLimite || null,
          tempoEstimadoMinutos: tempoEstimadoMinutos ? Number(tempoEstimadoMinutos) : null,
          fotoObrigatoria,
          ativo: true,
        },
      };

      const res = await fetch('/api/atividades-operacionais/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchAtividades(true);
      }
    } catch (err) {
      console.error('Erro ao salvar atividade:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string, modo: 'avulsa' | 'programacao', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (
      !confirm(
        modo === 'programacao'
          ? 'Deseja remover esta programação recorrente?'
          : 'Deseja remover esta atividade do dia?'
      )
    )
      return;

    try {
      const token = getAdminToken();
      await fetch('/api/atividades-operacionais/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, modo }),
      });
      if (inspectAtvId === id) setInspectAtvId(null);
      fetchAtividades(true);
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const handleToggleProgramacaoAtiva = async (prog: AtividadeProgramada) => {
    try {
      const token = getAdminToken();
      await fetch('/api/atividades-operacionais/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          modo: 'programacao',
          data: {
            ...prog,
            ativo: !prog.ativo,
            dataReferencia: selectedDate,
          },
        }),
      });
      fetchAtividades(true);
    } catch (err) {
      console.error('Erro ao alternar programação:', err);
    }
  };

  const handleIniciarAtividadeGestor = async (atv: AtividadeOperacional) => {
    setIsActionLoading(true);
    try {
      const token = getAdminToken();
      const operatorName =
        localStorage.getItem('admin_name') || localStorage.getItem('admin_username') || 'Gestor';
      await fetch(`/api/atividades-operacionais/${encodeURIComponent(atv.id)}/iniciar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ executorNome: atv.funcionarioDestinoNome || operatorName }),
      });
      await fetchAtividades(true);
    } catch (err) {
      console.error('Erro ao iniciar:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFotoUploadInspect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFoto(true);
    try {
      const imageUrl = await uploadPhotoToStorage(file);
      setInspectFotoUrl(imageUrl);
    } catch (err) {
      console.error('Erro no upload de foto:', err);
    } finally {
      setIsUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConcluirAtividadeGestor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectAtv) return;
    if (inspectAtv.fotoObrigatoria && !inspectFotoUrl) {
      alert('Esta atividade exige uma foto de conferência para ser concluída.');
      return;
    }
    setIsActionLoading(true);
    try {
      const token = getAdminToken();
      const operatorName =
        localStorage.getItem('admin_name') || localStorage.getItem('admin_username') || 'Gestor';
      const res = await fetch(
        `/api/atividades-operacionais/${encodeURIComponent(inspectAtv.id)}/concluir`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            executorNome: inspectAtv.executadoPorNome || inspectAtv.funcionarioDestinoNome || operatorName,
            fotoConferenciaUrl: inspectFotoUrl || null,
            observacaoExecucao: inspectObservacao.trim() || null,
          }),
        }
      );
      if (res.ok) {
        await fetchAtividades(true);
        setInspectAtvId(null);
      }
    } catch (err) {
      console.error('Erro ao concluir:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReabrirAtividade = async (atv: AtividadeOperacional, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Deseja reabrir a atividade "${atv.titulo}" para que possa ser refeita?`)) return;
    setIsActionLoading(true);
    try {
      const token = getAdminToken();
      await fetch(`/api/atividades-operacionais/${encodeURIComponent(atv.id)}/reabrir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      await fetchAtividades(true);
    } catch (err) {
      console.error('Erro ao reabrir:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredAtividades = atividades.filter(a => {
    if (classeFilter !== 'todas' && a.classeDestino !== classeFilter) return false;
    if (statusFilter !== 'todas' && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitulo = (a.titulo || '').toLowerCase().includes(q);
      const matchExec = (a.executadoPorNome || '').toLowerCase().includes(q);
      const matchSetor = (a.setorLocal || '').toLowerCase().includes(q);
      const matchBoat = (a.embarcacaoNome || '').toLowerCase().includes(q);
      if (!matchTitulo && !matchExec && !matchSetor && !matchBoat) return false;
    }
    return true;
  });

  const filteredProgramacoes = programacoes.filter(p => {
    if (classeFilter !== 'todas' && p.classeDestino !== classeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!(p.titulo || '').toLowerCase().includes(q) && !(p.setorLocal || '').toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  // KPIs do Dia
  const totalDia = atividades.length;
  const pendentesDia = atividades.filter(a => a.status === 'pendente').length;
  const emAndamentoDia = atividades.filter(a => a.status === 'em_andamento').length;
  const concluidasDia = atividades.filter(a => a.status === 'concluida').length;
  const concluidasComTempo = atividades.filter(
    a => a.status === 'concluida' && a.duracaoSegundos != null && a.duracaoSegundos > 0
  );
  const tempoMedioSegundos =
    concluidasComTempo.length > 0
      ? Math.round(
          concluidasComTempo.reduce((acc, cur) => acc + (cur.duracaoSegundos || 0), 0) /
            concluidasComTempo.length
        )
      : null;

  const changeDate = (days: number) => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + days);
    setSelectedDate(getFormattedDate(d));
  };

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

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Controle de Atividades Operacionais
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Gerencie rotinas avulsas, semanais ou quinzenais para <strong>Marinheiros</strong> e{' '}
            <strong>Serviços Gerais</strong> com registro de timestamps e conferência fotográfica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenNewModal('semanal')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition cursor-pointer"
          >
            <Repeat className="w-4 h-4 text-[#186b77]" />
            Nova Recorrência
          </button>
          <button
            type="button"
            onClick={() => handleOpenNewModal('avulsa')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#186b77] hover:bg-[#135660] text-white font-bold text-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Atividade
          </button>
        </div>
      </div>

      {/* Resumo Operacional do Dia */}
      <div className="bg-white border border-slate-200 rounded-2xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono tabular-nums text-slate-900">
              {totalDia}
            </span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-mono tabular-nums">
              {pendentesDia} pendentes
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-1">
            Tarefas Programadas ({selectedDate === todayStr ? 'Hoje' : selectedDate})
          </p>
        </div>

        <div className="p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono tabular-nums text-blue-700">
              {emAndamentoDia}
            </span>
            <span className="text-xs font-semibold text-blue-800">Cronômetro ativo</span>
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-1">Em Execução Agora</p>
        </div>

        <div className="p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono tabular-nums text-emerald-700">
              {concluidasDia}
            </span>
            <span className="text-xs font-bold font-mono tabular-nums text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {totalDia > 0 ? `${Math.round((concluidasDia / totalDia) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-1">Concluídas no Dia</p>
        </div>

        <div className="p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono tabular-nums text-slate-900">
              {formatDuration(tempoMedioSegundos)}
            </span>
            <span className="text-xs font-semibold text-slate-600">Início → Fim</span>
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-1">Tempo Médio por Tarefa</p>
        </div>
      </div>

      {/* Barra de Navegação e Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Sub-abas: Execução do Dia vs Programações Recorrentes */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 self-start">
            <button
              type="button"
              onClick={() => setViewMode('execucao')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'execucao'
                  ? 'bg-white text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Execução Diária ({atividades.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('recorrencias')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'recorrencias'
                  ? 'bg-white text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              Programações Recorrentes ({programacoes.length})
            </button>
          </div>

          {/* Seletor de Data */}
          {viewMode === 'execucao' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => changeDate(-1)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50">
                <Calendar className="w-4 h-4 text-[#186b77]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => e.target.value && setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => changeDate(1)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {selectedDate !== todayStr && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 text-[#186b77] border border-teal-200 text-xs font-bold cursor-pointer"
                >
                  Hoje
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filtros de Classe, Status e Busca */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setClasseFilter('todas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                classeFilter === 'todas'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todas as Classes
            </button>
            <button
              type="button"
              onClick={() => setClasseFilter('marinheiro')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                classeFilter === 'marinheiro'
                  ? 'bg-cyan-800 text-white border-cyan-800'
                  : 'bg-cyan-50 text-cyan-900 border-cyan-200 hover:bg-cyan-100'
              }`}
            >
              <Anchor className="w-3.5 h-3.5" />
              Marinheiros
            </button>
            <button
              type="button"
              onClick={() => setClasseFilter('servicos_gerais')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                classeFilter === 'servicos_gerais'
                  ? 'bg-teal-800 text-white border-teal-800'
                  : 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Serviços Gerais
            </button>

            {viewMode === 'execucao' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none"
              >
                <option value="todas">Todos os Status</option>
                <option value="pendente">Pendentes</option>
                <option value="em_andamento">Em Execução</option>
                <option value="concluida">Concluídas</option>
              </select>
            )}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar tarefa, funcionário ou setor..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* VISÃO 1: EXECUÇÃO DIÁRIA */}
      {viewMode === 'execucao' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#186b77] animate-spin" />
              <p className="text-xs text-slate-600 font-medium">Carregando atividades do dia...</p>
            </div>
          ) : filteredAtividades.length === 0 ? (
            <div className="p-14 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Nenhuma atividade encontrada para esta data
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Crie uma atividade avulsa ou configure uma programação recorrente (semanal, quinzenal ou diária) para gerar as tarefas automaticamente.
              </p>
              <button
                type="button"
                onClick={() => handleOpenNewModal('avulsa')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#186b77] text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Criar Atividade Agora
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold text-[11px]">
                    <th className="px-4 py-3.5">Atividade & Local</th>
                    <th className="px-4 py-3.5">Classe / Atribuição</th>
                    <th className="px-4 py-3.5">Status & Executor</th>
                    <th className="px-4 py-3.5">Timestamps (Início / Fim)</th>
                    <th className="px-4 py-3.5">Conferência</th>
                    <th className="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAtividades.map(atv => {
                    const elapsedSec =
                      atv.status === 'em_andamento' && atv.iniciadoEm
                        ? Math.max(0, Math.floor((nowMs - new Date(atv.iniciadoEm).getTime()) / 1000))
                        : atv.duracaoSegundos;

                    return (
                      <tr
                        key={atv.id}
                        onClick={() => openInspectModal(atv)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs group-hover:text-[#186b77] transition-colors">
                              {atv.titulo}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${getPrioridadeStyle(
                                atv.prioridade
                              )}`}
                            >
                              {atv.prioridade}
                            </span>
                          </div>
                          {atv.descricao && (
                            <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                              {atv.descricao}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {atv.embarcacaoNome && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-50 text-cyan-900 border border-cyan-200 text-[10px] font-semibold">
                                <Ship className="w-3 h-3" />
                                {atv.embarcacaoNome}
                              </span>
                            )}
                            {atv.setorLocal && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-semibold">
                                <MapPin className="w-3 h-3" />
                                {atv.setorLocal}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase">
                              <Repeat className="w-3 h-3" />
                              {atv.frequenciaOrigem}
                            </span>
                            {atv.horarioLimite && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-mono tabular-nums font-semibold">
                                <Clock className="w-3 h-3" />
                                Até {atv.horarioLimite}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                              atv.classeDestino === 'marinheiro'
                                ? 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                                : 'bg-teal-100 text-teal-900 border border-teal-200'
                            }`}
                          >
                            {atv.classeDestino === 'marinheiro' ? 'Marinheiros' : 'Serviços Gerais'}
                          </span>
                          <div className="text-[11px] text-slate-600 mt-1">
                            {atv.funcionarioDestinoNome
                              ? `Fixo: ${atv.funcionarioDestinoNome}`
                              : 'Livre (1º do turno)'}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {atv.status === 'pendente' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Pendente
                            </span>
                          )}
                          {atv.status === 'em_andamento' && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                                Em Execução
                              </span>
                              <div className="text-[11px] font-bold text-slate-900 mt-1">
                                Por: {atv.executadoPorNome}
                              </div>
                            </div>
                          )}
                          {atv.status === 'concluida' && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                Concluída
                              </span>
                              <div className="text-[11px] font-bold text-slate-900 mt-1">
                                Por: {atv.executadoPorNome}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 font-mono tabular-nums text-[11px]">
                          <div className="text-slate-700">
                            Início:{' '}
                            <strong className="text-slate-900">
                              {formatTimeTimestamp(atv.iniciadoEm)}
                            </strong>
                          </div>
                          <div className="text-slate-700">
                            Fim:{' '}
                            <strong className="text-slate-900">
                              {formatTimeTimestamp(atv.concluidoEm)}
                            </strong>
                          </div>
                          {elapsedSec != null && elapsedSec > 0 && (
                            <div className="text-[11px] font-bold text-[#186b77] mt-0.5">
                              Duração: {formatDuration(elapsedSec)}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {atv.fotoConferenciaUrl ? (
                              <img
                                src={atv.fotoConferenciaUrl}
                                alt="Conferência"
                                className="w-10 h-10 rounded-lg object-cover border border-emerald-300 shrink-0"
                              />
                            ) : null}
                            <div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block ${
                                  atv.fotoObrigatoria
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {atv.fotoObrigatoria ? 'Foto Obrigatória' : 'Foto Opcional'}
                              </span>
                              <div className="text-[11px] font-semibold text-[#186b77] mt-1 flex items-center gap-0.5">
                                {atv.fotoConferenciaUrl ? 'Ver foto e detalhes' : 'Abrir confirmação'}
                                <ArrowUpRight className="w-3 h-3" />
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {atv.status !== 'pendente' && (
                              <button
                                type="button"
                                onClick={e => handleReabrirAtividade(atv, e)}
                                title="Reabrir atividade"
                                className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={e => handleOpenEditAtividade(atv, e)}
                              title="Editar atividade"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={e => handleDeleteRecord(atv.id, 'avulsa', e)}
                              title="Excluir atividade"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
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
      )}

      {/* VISÃO 2: PROGRAMAÇÕES RECORRENTES */}
      {viewMode === 'recorrencias' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {filteredProgramacoes.length === 0 ? (
            <div className="p-14 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Repeat className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Nenhuma programação recorrente cadastrada
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Configure atividades diárias, semanais, quinzenais ou mensais para que apareçam automaticamente na lista dos funcionários.
              </p>
              <button
                type="button"
                onClick={() => handleOpenNewModal('semanal')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#186b77] text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Criar Programação Recorrente
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold text-[11px]">
                    <th className="px-4 py-3.5">Rotina Programada</th>
                    <th className="px-4 py-3.5">Classe & Responsável</th>
                    <th className="px-4 py-3.5">Regra de Recorrência</th>
                    <th className="px-4 py-3.5">Foto Obrigatória</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProgramacoes.map(prog => (
                    <tr key={prog.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{prog.titulo}</div>
                        {prog.descricao && (
                          <div className="text-[11px] text-slate-600 mt-0.5">{prog.descricao}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {prog.setorLocal && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                              {prog.setorLocal}
                            </span>
                          )}
                          {prog.embarcacaoNome && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-50 text-cyan-900">
                              {prog.embarcacaoNome}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                            prog.classeDestino === 'marinheiro'
                              ? 'bg-cyan-100 text-cyan-900'
                              : 'bg-teal-100 text-teal-900'
                          }`}
                        >
                          {prog.classeDestino === 'marinheiro' ? 'Marinheiros' : 'Serviços Gerais'}
                        </span>
                        <div className="text-[11px] text-slate-600 mt-1">
                          {prog.funcionarioDestinoNome || 'Qualquer 1 do turno'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 uppercase text-[11px]">
                          {prog.frequencia}
                        </div>
                        {prog.frequencia === 'semanal' && Array.isArray(prog.diasSemana) && (
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            Dias:{' '}
                            {prog.diasSemana
                              .map(d => DIAS_SEMANA.find(x => x.id === d)?.short)
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                        )}
                        {prog.frequencia === 'quinzenal' && (
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            A cada 14 dias desde {prog.dataInicio}
                          </div>
                        )}
                        {prog.frequencia === 'mensal' && (
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            Todo dia {prog.diaMes || 1} do mês
                          </div>
                        )}
                        {prog.horarioLimite && (
                          <div className="text-[11px] text-amber-800 font-mono tabular-nums font-semibold mt-0.5">
                            Horário limite: {prog.horarioLimite}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            prog.fotoObrigatoria
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {prog.fotoObrigatoria ? 'Sim (Obrigatória)' : 'Não (Opcional)'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleProgramacaoAtiva(prog)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                            prog.ativo
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          {prog.ativo ? 'Ativa' : 'Pausada'}
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditProgramacao(prog)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(prog.id, 'programacao')}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FICHA DE INSPEÇÃO E CONFIRMAÇÃO DA ATIVIDADE (AO CLICAR NA LINHA) */}
      {inspectAtv && (
        <div
          onClick={() => setInspectAtvId(null)}
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
          >
            {/* Header da Ficha */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                      inspectAtv.classeDestino === 'marinheiro'
                        ? 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                        : 'bg-teal-100 text-teal-900 border border-teal-200'
                    }`}
                  >
                    {inspectAtv.classeDestino === 'marinheiro' ? 'Marinheiros' : 'Serviços Gerais'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${getPrioridadeStyle(
                      inspectAtv.prioridade
                    )}`}
                  >
                    {inspectAtv.prioridade}
                  </span>
                  {inspectAtv.status === 'pendente' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900">
                      Pendente
                    </span>
                  )}
                  {inspectAtv.status === 'em_andamento' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900">
                      Em Execução
                    </span>
                  )}
                  {inspectAtv.status === 'concluida' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900">
                      Concluída
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                  {inspectAtv.titulo}
                </h3>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEditAtividade(inspectAtv)}
                  title="Editar dados da atividade"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setInspectAtvId(null)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Corpo da Ficha */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Instruções e Metadados */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                {inspectAtv.descricao ? (
                  <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                    {inspectAtv.descricao}
                  </p>
                ) : (
                  <p className="text-xs text-slate-600">
                    Sem instruções adicionais cadastradas para esta atividade.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  {inspectAtv.embarcacaoNome && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-900 font-semibold">
                      <Ship className="w-3.5 h-3.5 text-[#186b77]" />
                      {inspectAtv.embarcacaoNome}
                    </span>
                  )}
                  {inspectAtv.setorLocal && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-900 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-slate-600" />
                      {inspectAtv.setorLocal}
                    </span>
                  )}
                  {inspectAtv.horarioLimite && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono tabular-nums font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Limite: {inspectAtv.horarioLimite}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                    {inspectAtv.funcionarioDestinoNome
                      ? `Atribuída: ${inspectAtv.funcionarioDestinoNome}`
                      : 'Livre para o turno (1 executor)'}
                  </span>
                </div>
              </div>

              {/* Painel de Telemetria (Timestamps e Duração) */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold">
                      {inspectAtv.status === 'em_andamento'
                        ? 'Tempo em Execução'
                        : inspectAtv.status === 'concluida'
                        ? 'Duração Total da Execução'
                        : 'Aguardando Início'}
                    </span>
                  </div>
                  <span className="text-lg font-black font-mono tabular-nums text-teal-300">
                    {inspectAtv.status === 'em_andamento' && inspectAtv.iniciadoEm
                      ? formatStopwatch(
                          Math.max(
                            0,
                            Math.floor((nowMs - new Date(inspectAtv.iniciadoEm).getTime()) / 1000)
                          )
                        )
                      : inspectAtv.status === 'concluida'
                      ? formatDuration(inspectAtv.duracaoSegundos)
                      : '00:00'}
                  </span>
                </div>

                <div className="grid grid-cols-3 divide-x divide-slate-200 bg-white text-center">
                  <div className="p-3">
                    <span className="text-[11px] font-semibold text-slate-600 block">
                      Timestamp Inicial
                    </span>
                    <span className="text-xs font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">
                      {formatTimeTimestamp(inspectAtv.iniciadoEm)}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[11px] font-semibold text-slate-600 block">
                      Timestamp Final
                    </span>
                    <span className="text-xs font-bold font-mono tabular-nums text-slate-900 mt-0.5 block">
                      {formatTimeTimestamp(inspectAtv.concluidoEm)}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[11px] font-semibold text-slate-600 block">
                      Executor Responsável
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                      {inspectAtv.executadoPorNome || 'Não iniciado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seção de Conferência Fotográfica e Observação */}
              {inspectAtv.status === 'concluida' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-[#186b77]" />
                      Evidência Fotográfica de Conferência
                    </span>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      Atividade Finalizada
                    </span>
                  </div>

                  {inspectAtv.fotoConferenciaUrl ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
                      <img
                        src={inspectAtv.fotoConferenciaUrl}
                        alt="Conferência da atividade"
                        onClick={() => setZoomFotoUrl(inspectAtv.fotoConferenciaUrl!)}
                        className="w-full max-h-72 object-contain cursor-pointer"
                      />
                      <div className="px-4 py-2.5 bg-slate-900 flex items-center justify-between">
                        <span className="text-xs text-slate-200 font-medium">
                          Clique na imagem para ampliar em tela cheia
                        </span>
                        <button
                          type="button"
                          onClick={() => setZoomFotoUrl(inspectAtv.fotoConferenciaUrl!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ampliar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
                      Concluída sem foto anexada (foto configurada como opcional).
                    </div>
                  )}

                  {inspectAtv.observacaoExecucao && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-xs font-bold text-slate-900 block">
                        Observação registrada na conclusão
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {inspectAtv.observacaoExecucao}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <form id="gestor-concluir-form" onSubmit={handleConcluirAtividadeGestor} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-[#186b77]" />
                        Foto de Conferência
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                          inspectAtv.fotoObrigatoria
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {inspectAtv.fotoObrigatoria ? 'Obrigatória' : 'Opcional'}
                      </span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFotoUploadInspect}
                      className="hidden"
                    />

                    {inspectFotoUrl ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
                        <img
                          src={inspectFotoUrl}
                          alt="Foto anexada"
                          className="w-full h-52 object-cover"
                        />
                        <div className="p-2.5 bg-slate-900 flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-300">
                            Imagem carregada
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1 rounded-lg bg-slate-800 text-white text-xs font-bold cursor-pointer"
                            >
                              Trocar
                            </button>
                            <button
                              type="button"
                              onClick={() => setInspectFotoUrl('')}
                              className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer"
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
                        className="w-full py-6 px-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        {isUploadingFoto ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin text-[#186b77]" />
                            <span className="text-xs font-bold">Enviando foto...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-6 h-6 text-[#186b77]" />
                            <span className="text-xs font-bold">
                              Anexar Foto de Conferência
                            </span>
                            <span className="text-[11px] text-slate-600">
                              Clique para selecionar uma imagem do dispositivo
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-600" />
                      Observações de Conferência (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={inspectObservacao}
                      onChange={e => setInspectObservacao(e.target.value)}
                      placeholder="Registre observações sobre a execução..."
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Rodapé de Ações */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
              {inspectAtv.status === 'pendente' && (
                <>
                  <button
                    type="button"
                    onClick={() => setInspectAtvId(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Fechar
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleIniciarAtividadeGestor(inspectAtv)}
                      className="px-4 py-2.5 rounded-xl bg-[#186b77] hover:bg-[#135660] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Registrar Início
                    </button>
                    <button
                      type="submit"
                      form="gestor-concluir-form"
                      disabled={
                        isActionLoading ||
                        isUploadingFoto ||
                        (inspectAtv.fotoObrigatoria && !inspectFotoUrl)
                      }
                      className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Confirmar Conclusão
                    </button>
                  </div>
                </>
              )}

              {inspectAtv.status === 'em_andamento' && (
                <>
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleReabrirAtividade(inspectAtv)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Devolver para Pendente
                  </button>
                  <button
                    type="submit"
                    form="gestor-concluir-form"
                    disabled={
                      isActionLoading ||
                      isUploadingFoto ||
                      (inspectAtv.fotoObrigatoria && !inspectFotoUrl)
                    }
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Confirmar e Concluir Atividade
                  </button>
                </>
              )}

              {inspectAtv.status === 'concluida' && (
                <>
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleReabrirAtividade(inspectAtv)}
                    className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Solicitar Refação / Reabrir
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectAtvId(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Fechar Conferência
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRIAR / EDITAR ATIVIDADE OU RECORRÊNCIA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingId ? 'Editar Atividade Operacional' : 'Nova Atividade Operacional'}
                </h3>
                <p className="text-xs text-slate-600">
                  Defina a classe responsável, recorrência e exigência de foto de conferência.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4 overflow-y-auto">
              {/* Classe Destino */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Classe de Funcionários Responsável *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setClasseDestino('marinheiro')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      classeDestino === 'marinheiro'
                        ? 'bg-cyan-800 text-white border-cyan-800'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Anchor className="w-4 h-4" />
                    Marinheiro
                  </button>
                  <button
                    type="button"
                    onClick={() => setClasseDestino('servicos_gerais')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      classeDestino === 'servicos_gerais'
                        ? 'bg-teal-800 text-white border-teal-800'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    Serviços Gerais
                  </button>
                </div>
              </div>

              {/* Título */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Título da Atividade *
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Lavar píer flutuante, Limpeza dos banheiros, Conferir amarras..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white"
                />
              </div>

              {/* Descrição / Instruções */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Instruções / Detalhes (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Descreva os pontos de atenção para conferência..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white"
                />
              </div>

              {/* Setor / Embarcação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Setor / Área da Marina
                  </label>
                  <input
                    type="text"
                    list="setores-marina-list"
                    value={setorLocal}
                    onChange={e => setSetorLocal(e.target.value)}
                    placeholder="Ex: Píer Principal, Banheiros..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white"
                  />
                  <datalist id="setores-marina-list">
                    {SETORES_SUGERIDOS.map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Embarcação Vinculada (Opcional)
                  </label>
                  <select
                    value={embarcacaoId}
                    onChange={e => setEmbarcacaoId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white"
                  >
                    <option value="">Sem embarcação específica</option>
                    {boats.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.nome} {b.codigo ? `(${b.codigo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Atribuição Individual (Opcional)
                  </label>
                  <select
                    value={funcionarioDestinoId}
                    onChange={e => setFuncionarioDestinoId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white"
                  >
                    <option value="">Livre para a classe (1º que iniciar assume)</option>
                    {colaboradores.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nome} {c.cargo ? `(${c.cargo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Prioridade</label>
                  <select
                    value={prioridade}
                    onChange={e => setPrioridade(e.target.value as PrioridadeAtividadeOperacional)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Programação / Frequência */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Repeat className="w-4 h-4 text-[#186b77]" />
                    Frequência / Programação
                  </label>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {(
                    [
                      { id: 'avulsa', label: 'Avulsa' },
                      { id: 'diaria', label: 'Diária' },
                      { id: 'semanal', label: 'Semanal' },
                      { id: 'quinzenal', label: 'Quinzenal' },
                      { id: 'mensal', label: 'Mensal' },
                    ] as const
                  ).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={Boolean(editingId) && editingModo === 'avulsa' && opt.id !== 'avulsa'}
                      onClick={() => setFrequencia(opt.id)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        frequencia === opt.id
                          ? 'bg-[#186b77] text-white border-[#186b77]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      } disabled:opacity-40`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {frequencia === 'semanal' && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Dias da Semana em que a atividade será gerada:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {DIAS_SEMANA.map(d => {
                        const active = diasSemana.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => toggleDiaSemana(d.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              active
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            {d.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {frequencia === 'mensal' && (
                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-xs font-bold text-slate-800">Dia do mês (1 a 31):</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={diaMes}
                      onChange={e => setDiaMes(Number(e.target.value) || 1)}
                      className="w-20 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {frequencia === 'avulsa' ? 'Data da Atividade' : 'Data de Início'}
                    </label>
                    <input
                      type="date"
                      value={dataProgramada}
                      onChange={e => setDataProgramada(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Horário Limite (Opcional)
                    </label>
                    <input
                      type="time"
                      value={horarioLimite}
                      onChange={e => setHorarioLimite(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Obrigatoriedade de Foto de Conferência */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      fotoObrigatoria
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">
                      Exigir Foto de Conferência ao Concluir
                    </span>
                    <span className="text-[11px] text-slate-600">
                      {fotoObrigatoria
                        ? 'Obrigatória: o funcionário só consegue concluir após enviar a foto.'
                        : 'Opcional: o funcionário pode concluir com ou sem foto.'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFotoObrigatoria(!fotoObrigatoria)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer shrink-0 ${
                    fotoObrigatoria
                      ? 'bg-rose-700 text-white border-rose-700'
                      : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  {fotoObrigatoria ? 'Obrigatória' : 'Opcional'}
                </button>
              </div>

              {/* Rodapé do Modal */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#186b77] hover:bg-[#135660] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Salvar Atividade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ZOOM DA FOTO */}
      {zoomFotoUrl && (
        <div
          onClick={() => setZoomFotoUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <div className="relative max-w-3xl w-full">
            <button
              type="button"
              onClick={() => setZoomFotoUrl(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:opacity-80 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={zoomFotoUrl}
              alt="Conferência ampliada"
              className="w-full max-h-[82vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
