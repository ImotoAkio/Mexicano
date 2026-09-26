import React, { useState, useEffect } from 'react';
import { User, Anchor, Building2, Zap, ChevronDown, Plus, X, Check, Loader2, Package } from 'lucide-react';
import { clientDB, boatDB } from '../db';
import { Cliente, Embarcacao } from '../types';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedClient: Cliente) => void;
  editingClient?: Cliente | null;
  boats?: Embarcacao[];
}

export default function ClientModal({
  isOpen,
  onClose,
  onSave,
  editingClient = null,
  boats: propBoats
}: ClientModalProps) {
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form States
  const [name, setName] = useState('');
  const [clientBoats, setClientBoats] = useState<Array<{ embarcacaoId: string; cota: string }>>([{ embarcacaoId: '', cota: '' }]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('Solteiro(a)');
  const [profissao, setProfissao] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [rg, setRg] = useState('');
  const [orgaoEmissor, setOrgaoEmissor] = useState('');
  const [numeroHabilitacao, setNumeroHabilitacao] = useState('');
  const [validadeHabilitacao, setValidadeHabilitacao] = useState('');
  const [orgaoEmissorHabilitacao, setOrgaoEmissorHabilitacao] = useState('Capitania Fluvial de Juazeiro');
  const [categoriaHabilitacao, setCategoriaHabilitacao] = useState('');
  
  // Address States
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numeroEnd, setNumeroEnd] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [statusFinanceiro, setStatusFinanceiro] = useState<'em_dia' | 'inadimplente' | 'pendente'>('em_dia');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [observacoesFinanceiras, setObservacoesFinanceiras] = useState('');
  const [plano, setPlano] = useState<'normal' | 'completo'>('normal');
  const [empresas, setEmpresas] = useState<string[]>(['VALE']);

  // Acessórios
  const [tenda, setTenda] = useState(false);
  const [mesa, setMesa] = useState(false);
  const [bancosCadeiras, setBancosCadeiras] = useState(false);
  const [churrasqueira, setChurrasqueira] = useState(false);
  const [observacoesAcessorios, setObservacoesAcessorios] = useState('');

  const hasLancha = clientBoats.some(cb => {
    const b = boats.find(boat => boat.id === cb.embarcacaoId);
    return b?.tipo === 'lancha';
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (propBoats && propBoats.length > 0) {
      setBoats(propBoats);
    } else {
      setBoats(boatDB.getAll());
    }
  }, [propBoats, isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (editingClient) {
        setEditingId(editingClient.id);
        setName(editingClient.nome || '');
        setStatus(editingClient.status || 'ativo');
        if (editingClient.embarcacoes && editingClient.embarcacoes.length > 0) {
          setClientBoats(editingClient.embarcacoes.map(eb => ({
            embarcacaoId: eb.embarcacaoId || '',
            cota: eb.cota || ''
          })));
        } else {
          setClientBoats([{ embarcacaoId: editingClient.embarcacaoId || '', cota: editingClient.cota || '' }]);
        }
        setEmail(editingClient.email || '');
        setPhone(editingClient.telefone || '');
        setCpf(editingClient.cpf || '');
        setEstadoCivil(editingClient.estadoCivil || 'Solteiro(a)');
        setProfissao(editingClient.profissao || '');
        setDataNascimento(editingClient.dataNascimento || '');
        setRg(editingClient.rg || '');
        setOrgaoEmissor(editingClient.orgaoEmissor || '');
        setNumeroHabilitacao(editingClient.numeroHabilitacao || editingClient.cnh_cha || '');
        setValidadeHabilitacao(editingClient.validadeHabilitacao || '');
        setOrgaoEmissorHabilitacao(editingClient.orgaoEmissorHabilitacao || 'Capitania Fluvial de Juazeiro');
        setCategoriaHabilitacao(editingClient.categoriaHabilitacao || '');
        setCep(editingClient.cep || '');
        setLogradouro(editingClient.logradouro || '');
        setNumeroEnd(editingClient.numeroEnd || '');
        setComplemento(editingClient.complemento || '');
        setBairro(editingClient.bairro || '');
        setCidade(editingClient.cidade || '');
        setEstado(editingClient.estado || '');
        setStatusFinanceiro(editingClient.statusFinanceiro || 'em_dia');
        setObservacoesFinanceiras(editingClient.observacoesFinanceiras || '');
        setPlano(editingClient.plano || 'normal');
        setEmpresas(editingClient.empresas && editingClient.empresas.length > 0 ? editingClient.empresas : ['VALE']);
        setTenda(editingClient.acessorios?.tenda || false);
        setMesa(editingClient.acessorios?.mesa || false);
        setBancosCadeiras(editingClient.acessorios?.bancosCadeiras || false);
        setChurrasqueira(editingClient.acessorios?.churrasqueira || false);
        setObservacoesAcessorios(editingClient.acessorios?.observacoes || '');
      } else {
        setEditingId(null);
        setName('');
        setStatus('ativo');
        const availableBoats = propBoats && propBoats.length > 0 ? propBoats : boatDB.getAll();
        setClientBoats([{ embarcacaoId: availableBoats[0]?.id || '', cota: '' }]);
        setEmail('');
        setPhone('');
        setCpf('');
        setEstadoCivil('Solteiro(a)');
        setProfissao('');
        setDataNascimento('');
        setRg('');
        setOrgaoEmissor('');
        setNumeroHabilitacao('');
        setValidadeHabilitacao('');
        setOrgaoEmissorHabilitacao('Capitania Fluvial de Juazeiro');
        setCategoriaHabilitacao('');
        setCep('');
        setLogradouro('');
        setNumeroEnd('');
        setComplemento('');
        setBairro('');
        setCidade('');
        setEstado('');
        setStatusFinanceiro('em_dia');
        setObservacoesFinanceiras('');
        setPlano('normal');
        setEmpresas(['VALE']);
        setTenda(false);
        setMesa(false);
        setBancosCadeiras(false);
        setChurrasqueira(false);
        setObservacoesAcessorios('');
      }
      setIsAdvancedOpen(false);
    }
  }, [isOpen, editingClient]);

  const fetchCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        showToast('CEP não encontrado.', 'error');
      } else {
        setLogradouro(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setEstado(data.uf || '');
        showToast('Endereço preenchido automaticamente!');
      }
    } catch (err) {
      showToast('Erro ao consultar o CEP.', 'error');
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 8) raw = raw.substring(0, 8);
    
    let formatted = raw;
    if (raw.length > 5) {
      formatted = `${raw.substring(0, 5)}-${raw.substring(5)}`;
    }
    setCep(formatted);

    if (raw.length === 8) {
      fetchCep(raw);
    }
  };

  const handleCepBlur = () => {
    const raw = cep.replace(/\D/g, '');
    if (raw.length === 8) {
      fetchCep(raw);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('O nome é obrigatório.', 'error');
      return;
    }
    if (clientBoats.length === 0) {
      showToast('Por favor, adicione pelo menos um veículo vinculado.', 'error');
      return;
    }
    if (clientBoats.some(cb => !cb.embarcacaoId)) {
      showToast('Todas as embarcações selecionadas devem ser válidas.', 'error');
      return;
    }
    if (clientBoats.some(cb => !cb.cota.trim())) {
      showToast('O número da cota é obrigatório para todas as embarcações.', 'error');
      return;
    }

    try {
      const primaryBoat = clientBoats[0];
      let saved: Cliente;

      const acessorios = hasLancha ? {
        tenda,
        mesa,
        bancosCadeiras,
        churrasqueira,
        observacoes: observacoesAcessorios
      } : undefined;

      const clientDataPayload = {
        nome: name.toUpperCase(),
        embarcacaoId: primaryBoat.embarcacaoId,
        cota: primaryBoat.cota.toUpperCase(),
        embarcacoes: clientBoats.map(cb => ({
          embarcacaoId: cb.embarcacaoId,
          cota: cb.cota.toUpperCase()
        })),
        email,
        telefone: phone,
        cpf,
        estadoCivil,
        profissao,
        dataNascimento,
        rg,
        orgaoEmissor,
        numeroHabilitacao,
        cnh_cha: numeroHabilitacao,
        validadeHabilitacao,
        orgaoEmissorHabilitacao: orgaoEmissorHabilitacao || 'Capitania Fluvial de Juazeiro',
        categoriaHabilitacao,
        cep,
        logradouro,
        numeroEnd,
        complemento,
        bairro,
        cidade,
        estado,
        statusFinanceiro,
        observacoesFinanceiras,
        plano,
        empresas,
        status,
        acessorios
      };

      if (editingId) {
        saved = clientDB.update(editingId, clientDataPayload);
        showToast('Cliente atualizado com sucesso!');
      } else {
        saved = clientDB.create(clientDataPayload);
        showToast('Cliente cadastrado com sucesso!');
      }

      onSave(saved);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar cliente', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div id="client-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      {/* Toast Banner */}
      {toast && (
        <div className={`fixed top-[max(1rem,env(safe-area-inset-top))] right-4 z-60 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-6xl w-full overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? 'Editar Cadastro do Cliente' : 'Cadastrar Novo Cliente'}
            </h3>
          </div>
          <button
            id="close-client-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto subtle-scrollbar flex-1 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUNA 1: IDENTIFICAÇÃO E CONTATOS (4 cols) */}
            <div className="lg:col-span-4 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                <User className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Identificação & Contatos
              </h4>

              {/* Status do Cadastro */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Status do Cadastro</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                    {status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-200/60 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setStatus('ativo')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      status === 'ativo'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('inativo')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      status === 'inativo'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    Inativo
                  </button>
                </div>
                {status === 'inativo' && (
                  <p className="text-[10px] text-amber-700 mt-1.5 leading-tight">
                    ⚠️ Cliente inativo: bloqueado para novas reservas e login no portal. Todo o histórico é preservado.
                  </p>
                )}
              </div>

              {/* Plano de Agendamento */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Plano de Agendamento</span>
                </label>
                <select
                  value={plano}
                  onChange={(e) => setPlano(e.target.value as 'normal' | 'completo')}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 font-medium cursor-pointer"
                >
                  <option value="normal">Normal (Sem acesso a seg/ter)</option>
                  <option value="completo">Plano Completo (Acesso total)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Nome Completo *</label>
                <input
                  id="input-client-name"
                  type="text"
                  tabIndex={1}
                  required
                  placeholder="Nome do Cliente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent font-medium"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Telefone / Celular (WhatsApp)</label>
                <input
                  id="input-client-phone"
                  type="text"
                  tabIndex={2}
                  placeholder="Ex: (11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  id="input-client-email"
                  type="email"
                  tabIndex={3}
                  placeholder="Ex: joao@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">CPF</label>
                  <input
                    id="input-client-cpf"
                    type="text"
                    tabIndex={4}
                    placeholder="Ex: 000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Data de Nascimento</label>
                  <input
                    id="input-client-data-nascimento"
                    type="date"
                    tabIndex={5}
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent font-mono text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estado Civil</label>
                  <select
                    tabIndex={5}
                    value={estadoCivil}
                    onChange={(e) => setEstadoCivil(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent font-medium"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="União Estável">União Estável</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Profissão</label>
                  <input
                    type="text"
                    tabIndex={5}
                    placeholder="Ex: Empresário"
                    value={profissao}
                    onChange={(e) => setProfissao(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent font-medium"
                  />
                </div>
              </div>
            </div>

            {/* COLUNA 2: EMBARCAÇÕES & EMPRESAS VINCULADAS (4 cols) */}
            <div className="lg:col-span-4 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                <Anchor className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Veículos & Empresas
              </h4>

              {/* Seção das Embarcações e Cotas */}
              <div className="border border-slate-200/80 p-3.5 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Veículos Vinculados / Cotas *
                  </label>
                  <button
                    type="button"
                    tabIndex={5}
                    onClick={() => setClientBoats([...clientBoats, { embarcacaoId: boats[0]?.id || '', cota: 'C1' }])}
                    className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar Veículo
                  </button>
                </div>

                <div className="space-y-3 max-h-56 overflow-y-auto subtle-scrollbar pr-1">
                  {clientBoats.map((cb, idx) => (
                    <div key={idx} className="flex items-start bg-white border border-slate-200 p-3 rounded-lg relative space-x-2.5 shadow-xs">
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Embarcação #{idx + 1}</label>
                          <select
                            required
                            tabIndex={6 + (idx * 2)}
                            value={cb.embarcacaoId}
                            onChange={(e) => {
                              const newList = [...clientBoats];
                              newList[idx].embarcacaoId = e.target.value;
                              setClientBoats(newList);
                            }}
                            className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                          >
                            <option value="">Selecione...</option>
                            {[...boats].sort((a, b) => a.nome.localeCompare(b.nome)).map(b => (
                              <option key={b.id} value={b.id}>
                                {b.nome}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Cota #{idx + 1}</label>
                          <input
                            type="text"
                            required
                            tabIndex={7 + (idx * 2)}
                            placeholder="Ex: C1, C3"
                            value={cb.cota}
                            onChange={(e) => {
                              const newList = [...clientBoats];
                              newList[idx].cota = e.target.value;
                              setClientBoats(newList);
                            }}
                            className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white font-mono"
                          />
                        </div>
                      </div>

                      {clientBoats.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setClientBoats(clientBoats.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-rose-700 hover:text-rose-800 hover:bg-rose-100 rounded transition-colors self-center mt-3 cursor-pointer"
                          title="Remover veículo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Empresas Vinculadas */}
              <div className="border border-slate-200/80 p-3.5 rounded-xl bg-slate-50/50 space-y-2">
                <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center">
                  <Building2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Empresas Vinculadas *
                </label>
                <p className="text-[11px] text-slate-500">Selecione onde este cliente pode ser gerenciado:</p>
                <div className="space-y-2 pt-1">
                  {[
                    { id: 'VALE', label: 'Vale Administradora (Gestão Principal)' },
                    { id: 'MARINA', label: 'Marina Club (Controle de Garagem & Vagas)' },
                    { id: 'MEXICANO', label: 'Mexicano Lanchas' }
                  ].map((emp, empIdx) => (
                    <label key={emp.id} className="flex items-center space-x-2.5 text-xs text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        tabIndex={10 + empIdx}
                        checked={empresas.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEmpresas([...empresas, emp.id]);
                          } else {
                            if (empresas.length === 1) {
                              showToast('O cliente precisa estar vinculado a pelo menos 1 empresa.', 'error');
                              return;
                            }
                            setEmpresas(empresas.filter(x => x !== emp.id));
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <span className="font-medium">{emp.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Acessórios da Lancha */}
              {hasLancha && (
                <div className="border border-indigo-100 p-3.5 rounded-xl bg-indigo-50/30 space-y-3">
                  <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wider flex items-center">
                    <Package className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Acessórios Possuídos
                  </label>
                  <p className="text-[11px] text-indigo-700/70">
                    Selecione quais acessórios este cotista possui o direito/propriedade.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <label className="flex items-center space-x-2 text-xs text-indigo-900 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={tenda}
                        onChange={(e) => setTenda(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 bg-white border-indigo-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="font-medium">Tenda</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs text-indigo-900 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={mesa}
                        onChange={(e) => setMesa(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 bg-white border-indigo-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="font-medium">Mesa</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs text-indigo-900 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={bancosCadeiras}
                        onChange={(e) => setBancosCadeiras(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 bg-white border-indigo-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="font-medium">Bancos / Cadeiras</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs text-indigo-900 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={churrasqueira}
                        onChange={(e) => setChurrasqueira(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 bg-white border-indigo-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="font-medium">Churrasqueira</span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <label className="block text-[10px] font-semibold text-indigo-800 uppercase tracking-wider mb-1">
                      Observações de Acessórios
                    </label>
                    <textarea
                      value={observacoesAcessorios}
                      onChange={(e) => setObservacoesAcessorios(e.target.value)}
                      placeholder="Algum detalhe específico sobre os acessórios?"
                      className="w-full h-16 px-3 py-2 text-xs border border-indigo-200 rounded bg-white text-indigo-900 placeholder-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* COLUNA 3: CAMPOS AVANÇADOS (ACORDEÃO RECOLHÍVEL) (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                <Zap className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Informações Complementares
              </h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 bg-slate-100/70 hover:bg-slate-100 transition-colors cursor-pointer"
                  tabIndex={13}
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    Campos Avançados (Doc., Endereço & Fin.)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(rg || numeroHabilitacao || cep || logradouro || bairro || cidade || observacoesFinanceiras || plano === 'completo') && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Ativo</span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isAdvancedOpen && (
                  <div className="p-3.5 space-y-4 bg-white border-t border-slate-200 animate-in fade-in duration-150 max-h-[55vh] overflow-y-auto subtle-scrollbar">
                    {/* Documentação & Habilitação Náutica */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100 pb-1">
                        Documentação & Habilitação Náutica
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">RG</label>
                          <input
                            type="text"
                            tabIndex={14}
                            placeholder="Ex: 12.345.678-9"
                            value={rg}
                            onChange={(e) => setRg(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Órgão Emissor</label>
                          <input
                            type="text"
                            tabIndex={15}
                            placeholder="Ex: SSP/SP"
                            value={orgaoEmissor}
                            onChange={(e) => setOrgaoEmissor(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Nº Habilitação (Arrais/CHA)</label>
                          <input
                            type="text"
                            tabIndex={16}
                            placeholder="Ex: 381M2021005"
                            value={numeroHabilitacao}
                            onChange={(e) => setNumeroHabilitacao(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Categoria CHA</label>
                          <select
                            tabIndex={17}
                            value={categoriaHabilitacao}
                            onChange={(e) => setCategoriaHabilitacao(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                          >
                            <option value="">Selecione...</option>
                            <option value="Arrais-Amador">Arrais-Amador</option>
                            <option value="Motonauta">Motonauta</option>
                            <option value="Arrais e Motonauta">Arrais e Motonauta</option>
                            <option value="Mestre-Amador">Mestre-Amador</option>
                            <option value="Capitão-Amador">Capitão-Amador</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Validade CHA</label>
                          <input
                            type="date"
                            tabIndex={18}
                            value={validadeHabilitacao}
                            onChange={(e) => setValidadeHabilitacao(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Órgão CHA</label>
                          <input
                            type="text"
                            tabIndex={19}
                            placeholder="Ex: Capitania Fluvial"
                            value={orgaoEmissorHabilitacao}
                            onChange={(e) => setOrgaoEmissorHabilitacao(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Endereço Residencial */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider pb-1">
                        Endereço Residencial
                      </p>
                      
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="col-span-2 relative">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                            <span>CEP</span>
                            {isFetchingCep && <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />}
                          </label>
                          <input
                            id="input-client-cep"
                            type="text"
                            tabIndex={20}
                            placeholder="Ex: 01001-000"
                            value={cep}
                            onChange={handleCepChange}
                            onBlur={handleCepBlur}
                            maxLength={9}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                          />
                        </div>
                        <div className="col-span-1 flex items-end">
                          <button
                            type="button"
                            disabled={isFetchingCep || cep.replace(/\D/g, '').length !== 8}
                            onClick={() => fetchCep(cep.replace(/\D/g, ''))}
                            className="w-full py-1.5 text-xs font-bold text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 rounded-lg border border-indigo-100 transition-all h-[34px] cursor-pointer"
                          >
                            Buscar
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Rua / Logradouro</label>
                        <input
                          id="input-client-logradouro"
                          type="text"
                          tabIndex={21}
                          placeholder="Ex: Avenida Paulista"
                          value={logradouro}
                          onChange={(e) => setLogradouro(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="col-span-1">
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Número</label>
                          <input
                            id="input-client-numero-end"
                            type="text"
                            tabIndex={22}
                            placeholder="Ex: 1000"
                            value={numeroEnd}
                            onChange={(e) => setNumeroEnd(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Complemento</label>
                          <input
                            id="input-client-complemento"
                            type="text"
                            tabIndex={23}
                            placeholder="Ex: Apto 12"
                            value={complemento}
                            onChange={(e) => setComplemento(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Bairro</label>
                        <input
                          id="input-client-bairro"
                          type="text"
                          tabIndex={24}
                          placeholder="Ex: Centro / Jardins"
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="col-span-2">
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">Cidade</label>
                          <input
                            id="input-client-cidade"
                            type="text"
                            tabIndex={25}
                            placeholder="Ex: São Paulo"
                            value={cidade}
                            onChange={(e) => setCidade(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">UF</label>
                          <input
                            id="input-client-estado"
                            type="text"
                            tabIndex={26}
                            placeholder="Ex: SP"
                            value={estado}
                            onChange={(e) => setEstado(e.target.value)}
                            maxLength={2}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Situação Financeira & Plano */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider pb-1">
                        Situação Financeira & Plano
                      </p>
                      
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Observações Financeiras</label>
                        <textarea
                          tabIndex={27}
                          placeholder="Taxa de janeiro pendente, faróis para pagar..."
                          value={observacoesFinanceiras}
                          onChange={(e) => setObservacoesFinanceiras(e.target.value)}
                          rows={2}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white resize-none"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-slate-100 shrink-0">
            <button
              id="cancel-save-client"
              type="button"
              tabIndex={28}
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="submit-save-client"
              type="submit"
              tabIndex={29}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4 mr-2" />
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
