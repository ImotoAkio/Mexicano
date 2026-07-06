import React, { useState, useEffect } from 'react';
import { Funcionario, Folga, Turno, Usuario } from '../types';
import { funcionarioDB, folgaDB } from '../db';
import { 
  Users, Calendar, Plus, Edit, Trash2, Check, X, AlertTriangle, 
  Clock, CheckCircle, ShieldAlert, FileText, Search, ChevronLeft, ChevronRight
} from 'lucide-react';

const diasDaSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export default function ControleFolgasPage() {
  const [activeTab, setActiveTab] = useState<'folgas' | 'funcionarios'>('folgas');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [folgas, setFolgas] = useState<Folga[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  
  // Modals
  const [isFuncModalOpen, setIsFuncModalOpen] = useState(false);
  const [isFolgaModalOpen, setIsFolgaModalOpen] = useState(false);
  
  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = () => {
    setFuncionarios(funcionarioDB.getAll());
    setFolgas(folgaDB.getAll());
    
    // Carregar usuários para vínculo
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsuarios(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  // ================= FUNCIONARIOS LOGIC =================
  const [funcId, setFuncId] = useState('');
  const [funcNome, setFuncNome] = useState('');
  const [funcCargo, setFuncCargo] = useState('');
  const [funcSetor, setFuncSetor] = useState('');
  const [funcUsuarioId, setFuncUsuarioId] = useState('');
  const [funcTurnos, setFuncTurnos] = useState<Turno[]>([]);
  
  // New User Inline Creation
  const [funcCriarUsuario, setFuncCriarUsuario] = useState(false);
  const [funcNewUsername, setFuncNewUsername] = useState('');
  const [funcNewPassword, setFuncNewPassword] = useState('');
  const [funcNewRole, setFuncNewRole] = useState<'admin' | 'marina' | 'financeiro'>('marina');

  const openFuncModal = (func?: Funcionario) => {
    if (func) {
      setFuncId(func.id);
      setFuncNome(func.nome);
      setFuncCargo(func.cargo);
      setFuncSetor(func.setor);
      setFuncUsuarioId(func.usuarioId || '');
      setFuncTurnos([...func.turnos]);
    } else {
      setFuncId('');
      setFuncNome('');
      setFuncCargo('');
      setFuncSetor('');
      setFuncUsuarioId('');
      setFuncTurnos([]);
      setFuncCriarUsuario(false);
      setFuncNewUsername('');
      setFuncNewPassword('');
      setFuncNewRole('marina');
    }
    setIsFuncModalOpen(true);
  };

  const handleAddTurno = (dia: number) => {
    if (funcTurnos.some(t => t.dia === dia)) return;
    setFuncTurnos([...funcTurnos, { dia, entrada: '08:00', saida: '18:00', pausaInicio: '12:00', pausaFim: '13:00' }]);
  };

  const handleRemoveTurno = (dia: number) => {
    setFuncTurnos(funcTurnos.filter(t => t.dia !== dia));
  };

  const handleTurnoChange = (dia: number, field: keyof Turno, value: string) => {
    setFuncTurnos(funcTurnos.map(t => t.dia === dia ? { ...t, [field]: value } : t));
  };

  const handleSaveFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalUsuarioId = funcUsuarioId;
    
    if (funcCriarUsuario && (!funcId || !funcUsuarioId)) {
      try {
        const payload = {
          action: 'upsert',
          data: {
            username: funcNewUsername.trim(),
            password: funcNewPassword,
            role: funcNewRole
          }
        };
        const res = await fetch('/api/admin/users/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error('Falha ao criar usuário na API.');
        
        // Obter o ID do usuário criado
        const data = await res.json().catch(() => ({}));
        
        if (data && data.id) {
           finalUsuarioId = data.id;
        } else {
           // Fallback: buscar a lista atualizada
           const usersRes = await fetch('/api/admin/users');
           const usersData = await usersRes.json();
           const createdUser = usersData.find((u: any) => u.username === funcNewUsername.trim());
           if (createdUser) finalUsuarioId = createdUser.id;
        }
      } catch (err) {
        showToast('Não foi possível criar o acesso do usuário no servidor.', 'error');
        return; // Interrompe se falhou
      }
    }
    
    try {
      const data = { nome: funcNome, cargo: funcCargo, setor: funcSetor, usuarioId: finalUsuarioId, turnos: funcTurnos };
      if (funcId) {
        funcionarioDB.update(funcId, data);
        showToast('Funcionário atualizado com sucesso!');
      } else {
        funcionarioDB.create(data);
        showToast('Funcionário cadastrado com sucesso!');
      }
      setIsFuncModalOpen(false);
      loadData();
    } catch (err) {
      showToast('Erro ao salvar funcionário', 'error');
    }
  };

  const handleDeleteFuncionario = (id: string) => {
    if (confirm('Deseja realmente remover este funcionário? Suas folgas também poderão ser afetadas.')) {
      funcionarioDB.delete(id);
      showToast('Funcionário removido!');
      loadData();
    }
  };

  // ================= FOLGAS LOGIC =================
  const [folgaId, setFolgaId] = useState('');
  const [folgaFuncId, setFolgaFuncId] = useState('');
  const [folgaData, setFolgaData] = useState('');
  const [folgaTipo, setFolgaTipo] = useState<'domingo' | 'semana' | 'compensacao_feriado' | 'outro'>('semana');
  const [folgaStatus, setFolgaStatus] = useState<'pendente' | 'aprovada' | 'rejeitada'>('pendente');
  const [folgaObs, setFolgaObs] = useState('');
  const [folgaFeriado, setFolgaFeriado] = useState('');
  const [folgaWarning, setFolgaWarning] = useState<string | null>(null);

  const openFolgaModal = (folga?: Folga) => {
    if (folga) {
      setFolgaId(folga.id);
      setFolgaFuncId(folga.funcionarioId);
      setFolgaData(folga.data);
      setFolgaTipo(folga.tipo);
      setFolgaStatus(folga.status);
      setFolgaObs(folga.observacao || '');
      setFolgaFeriado(folga.feriadoTrabalhado || '');
    } else {
      setFolgaId('');
      setFolgaFuncId('');
      setFolgaData(new Date().toISOString().split('T')[0]);
      setFolgaTipo('semana');
      setFolgaStatus('aprovada'); // Default aprovada for admin
      setFolgaObs('');
      setFolgaFeriado('');
    }
    setFolgaWarning(null);
    setIsFolgaModalOpen(true);
  };

  // Validação ao mudar os dados da folga
  useEffect(() => {
    if (!folgaFuncId || !folgaData) {
      setFolgaWarning(null);
      return;
    }

    const dateObj = new Date(folgaData + 'T00:00:00');
    const mes = dateObj.getMonth();
    const ano = dateObj.getFullYear();
    const isSunday = dateObj.getDay() === 0;

    // Se o tipo for domingo mas a data não for domingo, avisa
    if (folgaTipo === 'domingo' && !isSunday) {
      setFolgaWarning('Atenção: A data selecionada não cai em um Domingo.');
      return;
    }

    // Calcular quantas folgas ele já tem no mês (ignora a folga atual se estiver editando)
    const folgasDoMes = folgas.filter(f => {
      if (f.id === folgaId) return false;
      if (f.funcionarioId !== folgaFuncId) return false;
      if (f.status === 'rejeitada') return false;
      const fDate = new Date(f.data + 'T00:00:00');
      return fDate.getMonth() === mes && fDate.getFullYear() === ano;
    });

    if (folgaTipo === 'domingo') {
      const domingos = folgasDoMes.filter(f => f.tipo === 'domingo').length;
      if (domingos >= 1) {
        setFolgaWarning('Atenção: Este funcionário já possui 1 folga de Domingo aprovada/pendente neste mês.');
        return;
      }
    } else if (folgaTipo === 'semana') {
      const semanas = folgasDoMes.filter(f => f.tipo === 'semana').length;
      if (semanas >= 2) {
        setFolgaWarning('Atenção: Este funcionário já excedeu o limite de 2 folgas na semana neste mês.');
        return;
      }
    }

    setFolgaWarning(null);
  }, [folgaFuncId, folgaData, folgaTipo, folgas, folgaId]);

  const handleSaveFolga = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folgaFuncId) {
      showToast('Selecione um funcionário.', 'error');
      return;
    }
    if (folgaTipo === 'compensacao_feriado' && !folgaFeriado) {
      showToast('Para compensação, informe a data do feriado trabalhado.', 'error');
      return;
    }

    try {
      const data = {
        funcionarioId: folgaFuncId,
        data: folgaData,
        tipo: folgaTipo,
        status: folgaStatus,
        observacao: folgaObs,
        feriadoTrabalhado: folgaTipo === 'compensacao_feriado' ? folgaFeriado : undefined
      };

      if (folgaId) {
        folgaDB.update(folgaId, data);
        showToast('Folga atualizada!');
      } else {
        folgaDB.create(data);
        showToast('Folga registrada com sucesso!');
      }
      setIsFolgaModalOpen(false);
      loadData();
    } catch (err) {
      showToast('Erro ao salvar folga.', 'error');
    }
  };

  const handleDeleteFolga = (id: string) => {
    if (confirm('Deseja realmente remover este registro de folga?')) {
      folgaDB.delete(id);
      showToast('Registro removido.');
      loadData();
    }
  };

  const handleUpdateFolgaStatus = (id: string, status: 'aprovada' | 'rejeitada') => {
    folgaDB.update(id, { status });
    showToast(`Folga ${status}!`);
    loadData();
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" /> Controle de Folgas
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Gerencie os funcionários, seus turnos e os registros de folgas mensais.
          </p>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 
          toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
          'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toast.type === 'error' ? <X className="w-4 h-4" /> : 
           toast.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
           <Check className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 bg-slate-200/50 p-1 rounded-xl w-max">
        <button 
          onClick={() => setActiveTab('folgas')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'folgas' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          <Calendar className="w-4 h-4" /> Calendário de Folgas
        </button>
        <button 
          onClick={() => setActiveTab('funcionarios')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'funcionarios' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          <Users className="w-4 h-4" /> Funcionários e Turnos
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        
        {/* ================= ABA FOLGAS ================= */}
        {activeTab === 'folgas' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold text-slate-700">Registros de Folgas</h2>
                <div className="flex bg-white rounded-lg border border-slate-200 p-0.5">
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Lista
                  </button>
                  <button 
                    onClick={() => setViewMode('calendar')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Calendário
                  </button>
                </div>
              </div>
              <button
                onClick={() => openFolgaModal()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Lançar Folga
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {viewMode === 'calendar' ? (
                <CalendarView folgas={folgas} funcionarios={funcionarios} onEditFolga={openFolgaModal} />
              ) : folgas.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">Nenhuma folga registrada.</div>
              ) : (
                <div className="space-y-3">
                  {folgas.map(folga => {
                    const func = funcionarios.find(f => f.id === folga.funcionarioId);
                    return (
                      <div key={folga.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors bg-white gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                            folga.status === 'aprovada' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                            folga.status === 'rejeitada' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                            'bg-amber-50 border-amber-200 text-amber-600'
                          }`}>
                            {folga.status === 'aprovada' ? <CheckCircle className="w-5 h-5"/> : 
                             folga.status === 'rejeitada' ? <X className="w-5 h-5"/> : 
                             <Clock className="w-5 h-5"/>}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-800 text-sm">{func?.nome || 'Desconhecido'}</h3>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold uppercase">
                                {folga.tipo.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> 
                                {new Date(folga.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                              {folga.feriadoTrabalhado && (
                                <span className="flex items-center gap-1 text-indigo-600"><AlertTriangle className="w-3.5 h-3.5"/> Feriado trab: {new Date(folga.feriadoTrabalhado + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                              )}
                            </div>
                            {folga.observacao && <div className="text-[11px] text-slate-400 mt-1">Obs: {folga.observacao}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {folga.status === 'pendente' && (
                            <>
                              <button onClick={() => handleUpdateFolgaStatus(folga.id, 'aprovada')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Aprovar">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleUpdateFolgaStatus(folga.id, 'rejeitada')} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" title="Rejeitar">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button onClick={() => openFolgaModal(folga)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteFolga(folga.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= ABA FUNCIONARIOS ================= */}
        {activeTab === 'funcionarios' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-700">Equipe e Escalas</h2>
              <button
                onClick={() => openFuncModal()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Novo Funcionário
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {funcionarios.map(func => (
                  <div key={func.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{func.nome}</h3>
                        <p className="text-xs text-slate-500">{func.cargo} • {func.setor}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openFuncModal(func)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded"><Edit className="w-4 h-4"/></button>
                        <button onClick={() => handleDeleteFuncionario(func.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                    {func.usuarioId ? (
                      <div className="mb-3 text-[10px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 w-max px-2 py-0.5 rounded">
                        <CheckCircle className="w-3 h-3"/> Acesso ao Sistema Vinculado
                      </div>
                    ) : (
                      <div className="mb-3 text-[10px] text-amber-600 font-bold flex items-center gap-1 bg-amber-50 w-max px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3"/> Sem Acesso ao Sistema
                      </div>
                    )}
                    <div className="space-y-1.5 mt-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Escala de Trabalho</h4>
                      {diasDaSemana.map((diaNome, idx) => {
                        const turno = func.turnos.find(t => t.dia === idx);
                        if (!turno) return null;
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 p-1.5 rounded">
                            <span className="font-semibold text-slate-700">{diaNome}</span>
                            <span className="text-slate-500 font-mono text-[10px]">{turno.entrada} - {turno.saida}</span>
                          </div>
                        );
                      })}
                      {func.turnos.length === 0 && <span className="text-xs text-slate-400">Nenhuma escala definida.</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL DE FUNCIONARIO ================= */}
      {isFuncModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <h2 className="font-bold text-slate-800">{funcId ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
              <button onClick={() => setIsFuncModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSaveFuncionario} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input required value={funcNome} onChange={e => setFuncNome(e.target.value)} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  {!funcUsuarioId && !funcId && (
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-3 cursor-pointer">
                      <input type="checkbox" checked={funcCriarUsuario} onChange={e => setFuncCriarUsuario(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                      Criar Acesso ao Sistema para o Funcionário
                    </label>
                  )}
                  
                  {!funcCriarUsuario ? (
                    <>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Vincular a Usuário Existente</label>
                      <select value={funcUsuarioId} onChange={e => setFuncUsuarioId(e.target.value)} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                        <option value="">-- Nenhum Usuário Vinculado --</option>
                        {usuarios.map(u => (
                          <option key={u.id} value={u.id}>{u.username} ({u.role || 'Admin'})</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                       <div>
                         <label className="block text-[10px] font-bold text-slate-700 mb-1">Nome de Usuário (Login)</label>
                         <input required={funcCriarUsuario} value={funcNewUsername} onChange={e => setFuncNewUsername(e.target.value)} className="w-full text-xs py-1.5 px-3 border border-slate-300 rounded-lg outline-none focus:border-emerald-500" placeholder="ex: adhler.marina" />
                       </div>
                       <div>
                         <label className="block text-[10px] font-bold text-slate-700 mb-1">Senha Provisória</label>
                         <input type="password" required={funcCriarUsuario} value={funcNewPassword} onChange={e => setFuncNewPassword(e.target.value)} className="w-full text-xs py-1.5 px-3 border border-slate-300 rounded-lg outline-none focus:border-emerald-500" placeholder="••••••••" />
                       </div>
                       <div>
                         <label className="block text-[10px] font-bold text-slate-700 mb-1">Perfil de Acesso</label>
                         <select required={funcCriarUsuario} value={funcNewRole} onChange={e => setFuncNewRole(e.target.value as any)} className="w-full text-xs py-1.5 px-3 border border-slate-300 rounded-lg outline-none bg-white focus:border-emerald-500">
                           <option value="marina">Operacional da Marina (Sem acesso financeiro)</option>
                           <option value="financeiro">Financeiro (Somente área financeira)</option>
                           <option value="admin">Administrador (Acesso Total)</option>
                         </select>
                       </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cargo / Função</label>
                  <input required value={funcCargo} onChange={e => setFuncCargo(e.target.value)} placeholder="Ex: Marinheiro, Limpeza..." className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Setor</label>
                  <select required value={funcSetor} onChange={e => setFuncSetor(e.target.value)} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                    <option value="">Selecione...</option>
                    <option value="Operacional">Operacional (Marina)</option>
                    <option value="Administrativo">Administrativo</option>
                    <option value="Manutencao">Manutenção</option>
                    <option value="Limpeza">Limpeza</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="w-4 h-4"/> Escala de Trabalho Semanal</h3>
                <div className="space-y-3">
                  {diasDaSemana.map((dia, idx) => {
                    const hasTurno = funcTurnos.some(t => t.dia === idx);
                    const turno = funcTurnos.find(t => t.dia === idx);
                    
                    return (
                      <div key={idx} className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${hasTurno ? 'bg-emerald-50/30 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3 w-40">
                          <input 
                            type="checkbox" 
                            checked={hasTurno} 
                            onChange={(e) => e.target.checked ? handleAddTurno(idx) : handleRemoveTurno(idx)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600"
                          />
                          <span className={`text-sm font-semibold ${hasTurno ? 'text-emerald-900' : 'text-slate-500'}`}>{dia}</span>
                        </div>
                        
                        {hasTurno && turno && (
                          <div className="flex-1 flex flex-wrap gap-3 items-center">
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-slate-500 font-bold uppercase">Entrada</label>
                              <input type="time" required value={turno.entrada} onChange={e => handleTurnoChange(idx, 'entrada', e.target.value)} className="text-xs p-1.5 border border-emerald-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-slate-500 font-bold uppercase">Saída</label>
                              <input type="time" required value={turno.saida} onChange={e => handleTurnoChange(idx, 'saida', e.target.value)} className="text-xs p-1.5 border border-emerald-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                            </div>
                            <div className="flex items-center gap-2 border-l border-emerald-200 pl-3">
                              <label className="text-[10px] text-slate-500 font-bold uppercase">Pausa (opc.)</label>
                              <input type="time" value={turno.pausaInicio || ''} onChange={e => handleTurnoChange(idx, 'pausaInicio', e.target.value)} className="text-xs p-1.5 border border-emerald-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-20" />
                              <span className="text-emerald-300">-</span>
                              <input type="time" value={turno.pausaFim || ''} onChange={e => handleTurnoChange(idx, 'pausaFim', e.target.value)} className="text-xs p-1.5 border border-emerald-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-20" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
                  <Check className="w-4 h-4"/> Salvar Funcionário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DE FOLGA ================= */}
      {isFolgaModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col shadow-xl">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <h2 className="font-bold text-slate-800">{folgaId ? 'Editar Folga' : 'Lançar Folga'}</h2>
              <button onClick={() => setIsFolgaModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSaveFolga} className="p-6 space-y-4">
              
              {folgaWarning && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex items-start gap-2 text-xs font-semibold mb-4">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <p>{folgaWarning}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Funcionário</label>
                <select required value={folgaFuncId} onChange={e => setFolgaFuncId(e.target.value)} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                  <option value="">Selecione o funcionário...</option>
                  {funcionarios.map(f => (
                    <option key={f.id} value={f.id}>{f.nome} ({f.cargo})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data da Folga</label>
                  <input type="date" required value={folgaData} onChange={e => setFolgaData(e.target.value)} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Situação</label>
                  <select required value={folgaStatus} onChange={e => setFolgaStatus(e.target.value as any)} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                    <option value="aprovada">Aprovada</option>
                    <option value="pendente">Pendente de Aprovação</option>
                    <option value="rejeitada">Rejeitada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Folga</label>
                <select required value={folgaTipo} onChange={e => setFolgaTipo(e.target.value as any)} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                  <option value="semana">Folga Semanal Padrão</option>
                  <option value="domingo">Folga de Domingo</option>
                  <option value="compensacao_feriado">Troca de Feriado Trabalhado</option>
                  <option value="outro">Outro / Exceção</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Lembrete: Regra de 1 domingo por mês ou 2 dias na semana.</p>
              </div>

              {folgaTipo === 'compensacao_feriado' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-emerald-700 mb-1">Feriado Trabalhado (Origem da Troca)</label>
                  <input type="date" required value={folgaFeriado} onChange={e => setFolgaFeriado(e.target.value)} className="w-full text-sm py-2 px-3 border border-emerald-300 bg-emerald-50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observações (Opcional)</label>
                <textarea rows={2} value={folgaObs} onChange={e => setFolgaObs(e.target.value)} className="w-full text-sm py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
                  <Check className="w-4 h-4"/> Salvar Folga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Subcomponente de Calendário
function CalendarView({ folgas, funcionarios, onEditFolga }: { folgas: Folga[], funcionarios: Funcionario[], onEditFolga: (f: Folga) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`blank-${i}`} className="p-2 border-r border-b border-slate-100 bg-slate-50/30"></div>);
  
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayFolgas = folgas.filter(f => f.data === dateStr);
    
    // Obter data de hoje na string de fuso horário local para comparação certa
    const today = new Date();
    const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return (
      <div key={d} className={`p-2 border-r border-b border-slate-100 min-h-[100px] flex flex-col ${isToday ? 'bg-emerald-50/20' : 'bg-white'}`}>
        <div className={`text-xs font-bold mb-2 w-max ${isToday ? 'bg-emerald-600 text-white px-2 py-0.5 rounded-md' : 'text-slate-500'}`}>
          {d}
        </div>
        <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[120px] pr-1">
          {dayFolgas.map(f => {
            const func = funcionarios.find(fn => fn.id === f.funcionarioId);
            return (
              <div 
                key={f.id} 
                onClick={() => onEditFolga(f)}
                className={`text-[10px] px-2 py-1 rounded cursor-pointer truncate border shadow-xs transition-colors ${
                  f.status === 'aprovada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                  f.status === 'rejeitada' ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' :
                  'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
                title={`${func?.nome || 'Desconhecido'} - ${f.tipo.replace('_', ' ')}`}
              >
                <span className="font-semibold truncate block">{func?.nome || 'Desc.'}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  });

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">{monthNames[month]} <span className="text-slate-400 font-normal">{year}</span></h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-1.5 bg-white border border-slate-200 shadow-xs rounded-lg hover:bg-slate-50 transition-colors"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 shadow-xs rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">Hoje</button>
          <button onClick={nextMonth} className="p-1.5 bg-white border border-slate-200 shadow-xs rounded-lg hover:bg-slate-50 transition-colors"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
        {dayNames.map(name => (
          <div key={name} className="py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">{name}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {blanks}
        {days}
      </div>
    </div>
  );
}

