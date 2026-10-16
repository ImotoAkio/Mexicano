import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Ship,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Save,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Building2,
  CreditCard,
  FileText,
  Anchor,
  Compass,
  MessageCircle,
  Calendar,
  ShieldCheck,
  Award
} from 'lucide-react';
import { Cliente, Embarcacao, StatusContrato } from '../../types';
import { clientDB } from '../../db';

interface ComercialClientDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (savedClient: Cliente) => void;
  editingClient?: Cliente | null;
  boats: Embarcacao[];
}

interface CotaItem {
  embarcacaoId: string;
  cota: string;
  acessorios?: {
    tenda?: boolean;
    mesa?: boolean;
    churrasqueira?: boolean;
    bancosCadeiras?: boolean;
    observacoes?: string;
  };
}

export default function ComercialClientDrawer({
  open,
  onClose,
  onSave,
  editingClient = null,
  boats = []
}: ComercialClientDrawerProps) {
  const isEditing = !!editingClient;

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados do Formulário - Comercial
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [plano, setPlano] = useState<'completo' | 'normal'>('normal');
  const [statusFinanceiro, setStatusFinanceiro] = useState<'em_dia' | 'inadimplente' | 'pendente'>('em_dia');
  const [statusContrato, setStatusContrato] = useState<StatusContrato>('sem_contrato');
  const [contratoDataAssinatura, setContratoDataAssinatura] = useState<string>('');
  const [empresas, setEmpresas] = useState<string[]>(['VALE']);
  const [observacoesFinanceiras, setObservacoesFinanceiras] = useState('');

  // Estados do Formulário - Embarcações & Cotas
  const [cotasList, setCotasList] = useState<CotaItem[]>([]);

  // Estados do Formulário - Dados Pessoais
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [orgaoEmissor, setOrgaoEmissor] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [profissao, setProfissao] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('Casado(a)');

  // Habilitação Náutica
  const [numeroHabilitacao, setNumeroHabilitacao] = useState('');
  const [categoriaHabilitacao, setCategoriaHabilitacao] = useState('Motonauta');
  const [validadeHabilitacao, setValidadeHabilitacao] = useState('');

  // Estados do Formulário - Contatos & Endereço
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numeroEnd, setNumeroEnd] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('PE');
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Embarcações ordenadas por nome
  const sortedBoats = useMemo(() => {
    return [...boats].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [boats]);

  // Tecla ESC para fechar
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Carregar dados quando abrir ou quando editingClient mudar
  useEffect(() => {
    if (!open) return;

    if (editingClient) {
      setNome(editingClient.nome || '');
      setStatus(editingClient.status === 'inativo' ? 'inativo' : 'ativo');
      setPlano(editingClient.plano || 'normal');
      setStatusFinanceiro(editingClient.statusFinanceiro || 'em_dia');
      setStatusContrato(editingClient.statusContrato || 'sem_contrato');
      setContratoDataAssinatura(editingClient.contratoDataAssinatura || '');
      setEmpresas(editingClient.empresas && editingClient.empresas.length > 0 ? editingClient.empresas : ['VALE']);
      setObservacoesFinanceiras(editingClient.observacoesFinanceiras || '');

      // Cotas
      if (editingClient.embarcacoes && editingClient.embarcacoes.length > 0) {
        setCotasList(editingClient.embarcacoes.map(eb => ({
          embarcacaoId: eb.embarcacaoId || '',
          cota: eb.cota || 'Cota',
          acessorios: eb.acessorios ? { ...eb.acessorios } : undefined
        })));
      } else if (editingClient.embarcacaoId) {
        setCotasList([{
          embarcacaoId: editingClient.embarcacaoId,
          cota: editingClient.cota || 'Cota',
          acessorios: editingClient.acessorios ? { ...editingClient.acessorios } : undefined
        }]);
      } else {
        setCotasList([]);
      }

      setCpf(editingClient.cpf || '');
      setRg(editingClient.rg || '');
      setOrgaoEmissor(editingClient.orgaoEmissor || '');
      setDataNascimento(editingClient.dataNascimento || '');
      setProfissao(editingClient.profissao || '');
      setEstadoCivil(editingClient.estadoCivil || 'Casado(a)');

      setNumeroHabilitacao(editingClient.numeroHabilitacao || editingClient.cnh_cha || '');
      setCategoriaHabilitacao(editingClient.categoriaHabilitacao || 'Motonauta');
      setValidadeHabilitacao(editingClient.validadeHabilitacao || '');

      setTelefone(editingClient.telefone || '');
      setEmail(editingClient.email || '');
      setCep(editingClient.cep || '');
      setLogradouro(editingClient.logradouro || '');
      setNumeroEnd(editingClient.numeroEnd || '');
      setComplemento(editingClient.complemento || '');
      setBairro(editingClient.bairro || '');
      setCidade(editingClient.cidade || '');
      setEstado(editingClient.estado || 'PE');
    } else {
      // Novo cadastro limpo
      setNome('');
      setStatus('ativo');
      setPlano('normal');
      setStatusFinanceiro('em_dia');
      setStatusContrato('sem_contrato');
      setContratoDataAssinatura('');
      setEmpresas(['VALE']);
      setObservacoesFinanceiras('');
      setCotasList([]);
      setCpf('');
      setRg('');
      setOrgaoEmissor('');
      setDataNascimento('');
      setProfissao('');
      setEstadoCivil('Casado(a)');
      setNumeroHabilitacao('');
      setCategoriaHabilitacao('Motonauta');
      setValidadeHabilitacao('');
      setTelefone('');
      setEmail('');
      setCep('');
      setLogradouro('');
      setNumeroEnd('');
      setComplemento('');
      setBairro('');
      setCidade('');
      setEstado('PE');
    }

    setErrorMessage(null);
  }, [open, editingClient]);

  // Máscaras de entrada
  const handleCpfChange = (val: string) => {
    let clean = val.replace(/\D/g, '').slice(0, 11);
    if (clean.length > 9) {
      clean = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (clean.length > 6) {
      clean = clean.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (clean.length > 3) {
      clean = clean.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setCpf(clean);
  };

  const handlePhoneChange = (val: string) => {
    let clean = val.replace(/\D/g, '').slice(0, 11);
    if (clean.length > 10) {
      clean = clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (clean.length > 6) {
      clean = clean.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (clean.length > 2) {
      clean = clean.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }
    setTelefone(clean);
  };

  const handleCepChange = (val: string) => {
    let clean = val.replace(/\D/g, '').slice(0, 8);
    let formatted = clean;
    if (clean.length > 5) {
      formatted = clean.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    }
    setCep(formatted);

    if (clean.length === 8) {
      searchCep(clean);
    }
  };

  // Busca de CEP automática via ViaCEP
  const searchCep = async (overrideCep?: string) => {
    const cleanCep = (overrideCep !== undefined ? overrideCep : cep).replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setLogradouro(data.logradouro);
        if (data.bairro) setBairro(data.bairro);
        if (data.localidade) setCidade(data.localidade);
        if (data.uf) setEstado(data.uf);
        if (data.complemento && !complemento) setComplemento(data.complemento);
      }
    } catch {
      // Ignora erro
    } finally {
      setIsSearchingCep(false);
    }
  };

  const toggleEmpresa = (emp: string) => {
    if (empresas.includes(emp)) {
      if (empresas.length > 1) {
        setEmpresas(empresas.filter(e => e !== emp));
      }
    } else {
      setEmpresas([...empresas, emp]);
    }
  };

  const handleAddCota = () => {
    const firstBoatId = sortedBoats.length > 0 ? sortedBoats[0].id : '';
    setCotasList(prev => [
      ...prev,
      {
        embarcacaoId: firstBoatId,
        cota: 'Cota 1/4',
        acessorios: {
          tenda: false,
          mesa: false,
          churrasqueira: false,
          bancosCadeiras: false
        }
      }
    ]);
  };

  const handleRemoveCota = (index: number) => {
    setCotasList(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCota = (index: number, fields: Partial<CotaItem>) => {
    setCotasList(prev =>
      prev.map((item, i) => (i === index ? { ...item, ...fields } : item))
    );
  };

  // Salvar cliente
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMessage('Por favor, informe o nome do cliente.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const primaryBoat = cotasList.length > 0 ? cotasList[0] : null;

      const payload: Partial<Cliente> = {
        nome: nome.trim(),
        status,
        plano,
        statusFinanceiro,
        statusContrato,
        contratoDataAssinatura: statusContrato === 'assinado' ? (contratoDataAssinatura || new Date().toISOString().split('T')[0]) : undefined,
        empresas,
        observacoesFinanceiras: observacoesFinanceiras.trim(),
        embarcacaoId: primaryBoat ? primaryBoat.embarcacaoId : '',
        cota: primaryBoat ? primaryBoat.cota : '',
        embarcacoes: cotasList.map(c => ({
          embarcacaoId: c.embarcacaoId,
          cota: c.cota,
          acessorios: c.acessorios
        })),
        cpf: cpf.trim(),
        rg: rg.trim(),
        orgaoEmissor: orgaoEmissor.trim(),
        dataNascimento: dataNascimento.trim(),
        profissao: profissao.trim(),
        estadoCivil,
        numeroHabilitacao: numeroHabilitacao.trim(),
        cnh_cha: numeroHabilitacao.trim(),
        categoriaHabilitacao,
        validadeHabilitacao: validadeHabilitacao.trim(),
        telefone: telefone.trim(),
        email: email.trim(),
        cep: cep.trim(),
        logradouro: logradouro.trim(),
        numeroEnd: numeroEnd.trim(),
        complemento: complemento.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        estado
      };

      let savedClient: Cliente;
      if (isEditing && editingClient) {
        savedClient = clientDB.update(editingClient.id, payload);
      } else {
        savedClient = clientDB.create(payload as any);
      }

      onSave(savedClient);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      setErrorMessage(err.message || 'Falha ao salvar dados do cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Backdrop com blur idêntico ao AddWidgetDrawer */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-stone-900/25 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-label={isEditing ? 'Editar cliente' : 'Novo cliente'}
        className={`absolute top-3 right-3 bottom-3 w-[calc(100%-1.5rem)] sm:w-[500px] lg:w-[540px] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[110%] opacity-0 pointer-events-none'
        }`}
      >
        {/* Header no padrão exato do AddWidgetDrawer */}
        <header className="h-14 px-5 flex items-center justify-between border-b border-stone-100 shrink-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-mx-ink-100 text-mx-ink font-bold text-xs flex items-center justify-center shrink-0">
              {nome ? nome.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-stone-900 truncate">
                {isEditing ? (nome || 'Editar cliente') : 'Novo cliente'}
              </h2>
              <p className="text-[11px] text-stone-400 truncate">
                {isEditing ? `ID: ${editingClient?.id}` : 'Cadastro comercial de cotistas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
              }`}
            >
              {status === 'ativo' ? 'Ativo' : 'Inativo'}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário com Scroll Suave */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-stone-800">
          {/* CARD 1: IDENTIFICAÇÃO DO CLIENTE */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
            <div className="flex items-center gap-2 text-stone-900 pb-1 border-b border-stone-100">
              <User className="w-4 h-4 text-stone-500" />
              <h3 className="text-[13px] font-semibold">Identificação</h3>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Nome do cliente ou cotista..."
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    CPF / CNPJ
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={e => handleCpfChange(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Nascimento
                  </label>
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={e => setDataNascimento(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">RG</label>
                  <input
                    type="text"
                    value={rg}
                    onChange={e => setRg(e.target.value)}
                    placeholder="Número..."
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Órgão Emissor
                  </label>
                  <input
                    type="text"
                    value={orgaoEmissor}
                    onChange={e => setOrgaoEmissor(e.target.value)}
                    placeholder="Ex: SDS/PE"
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Profissão
                  </label>
                  <input
                    type="text"
                    value={profissao}
                    onChange={e => setProfissao(e.target.value)}
                    placeholder="Profissão..."
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Estado Civil
                  </label>
                  <select
                    value={estadoCivil}
                    onChange={e => setEstadoCivil(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 cursor-pointer"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="União Estável">União Estável</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: CONDIÇÃO COMERCIAL & PLANO */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <div className="flex items-center gap-2 text-stone-900">
                <Sparkles className="w-4 h-4 text-stone-500" />
                <h3 className="text-[13px] font-semibold">Condição Comercial</h3>
              </div>
              <span className="text-[10px] text-stone-400">Regras e coberturas</span>
            </div>

            {/* Plano */}
            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1.5">
                Plano Contratado
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlano('completo')}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    plano === 'completo'
                      ? 'border-amber-400 bg-amber-50/60 shadow-xs'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">Plano Completo</span>
                    {plano === 'completo' && <Check className="w-3.5 h-3.5 text-amber-700 stroke-[3]" />}
                  </div>
                  <span className="text-[10px] text-amber-700/80 block mt-0.5">Com coberturas extras</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlano('normal')}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    plano === 'normal'
                      ? 'border-mx-ink bg-mx-ink-50/60 shadow-xs'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-mx-ink">Plano Normal</span>
                    {plano === 'normal' && <Check className="w-3.5 h-3.5 text-mx-ink stroke-[3]" />}
                  </div>
                  <span className="text-[10px] text-stone-500 block mt-0.5">Padrão da marina</span>
                </button>
              </div>
            </div>

            {/* Status Cadastral & Status Financeiro */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Status Cadastral
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatus('ativo')}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      status === 'ativo'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('inativo')}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      status === 'inativo'
                        ? 'bg-stone-700 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Inativo
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Financeiro
                </label>
                <select
                  value={statusFinanceiro}
                  onChange={e => setStatusFinanceiro(e.target.value as any)}
                  className="w-full h-8 px-2 rounded-md border border-stone-200 bg-white text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 cursor-pointer"
                >
                  <option value="em_dia">Em dia</option>
                  <option value="pendente">Pendente</option>
                  <option value="inadimplente">Inadimplente</option>
                </select>
              </div>
            </div>

            {/* Status do Contrato */}
            <div className="pt-2 border-t border-stone-100 space-y-1.5">
              <label className="text-[11px] font-semibold text-stone-600 block">
                Situação do Contrato
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setStatusContrato('assinado');
                    if (!contratoDataAssinatura) setContratoDataAssinatura(new Date().toISOString().split('T')[0]);
                  }}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                    statusContrato === 'assinado'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Assinado
                </button>
                <button
                  type="button"
                  onClick={() => setStatusContrato('pendente')}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                    statusContrato === 'pendente'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Pendente
                </button>
                <button
                  type="button"
                  onClick={() => setStatusContrato('sem_contrato')}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                    statusContrato === 'sem_contrato'
                      ? 'bg-rose-50 border-rose-400 text-rose-800 ring-1 ring-rose-400 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Não Possui
                </button>
              </div>
              {statusContrato === 'assinado' && (
                <div className="pt-1">
                  <label className="text-[10px] font-semibold text-emerald-800 block mb-0.5">
                    Data da Assinatura
                  </label>
                  <input
                    type="date"
                    value={contratoDataAssinatura}
                    onChange={e => setContratoDataAssinatura(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-emerald-300 bg-white text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Empresas */}
            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1.5">
                Empresas Vinculadas
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'VALE', name: 'Vale Náutica' },
                  { id: 'MARINA', name: 'Marina' },
                  { id: 'MEXICANO', name: 'El Mexicano' }
                ].map(emp => {
                  const isChecked = empresas.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleEmpresa(emp.id)}
                      className={`py-1.5 px-2 rounded-lg border text-center text-[11px] font-semibold transition-colors cursor-pointer ${
                        isChecked
                          ? 'border-mx-ink bg-mx-ink-100 text-mx-ink'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {emp.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                Anotações Comerciais
              </label>
              <textarea
                rows={2}
                value={observacoesFinanceiras}
                onChange={e => setObservacoesFinanceiras(e.target.value)}
                placeholder="Preferências, histórico ou acordos comerciais..."
                className="w-full p-2.5 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
              />
            </div>
          </section>

          {/* CARD 3: EMBARCAÇÕES & COTAS NÁUTICAS */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <div className="flex items-center gap-2 text-stone-900">
                <Ship className="w-4 h-4 text-stone-500" />
                <h3 className="text-[13px] font-semibold">Embarcações & Cotas</h3>
              </div>
              <button
                type="button"
                onClick={handleAddCota}
                className="h-7 px-2.5 rounded-md bg-mx-ink hover:bg-mx-ink-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3 h-3" />
                <span>Adicionar</span>
              </button>
            </div>

            {cotasList.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-stone-200 rounded-lg bg-stone-50/50">
                <p className="text-xs text-stone-500">Nenhuma embarcação vinculada ao cliente.</p>
                <button
                  type="button"
                  onClick={handleAddCota}
                  className="mt-2 text-xs text-mx-ink font-semibold hover:underline cursor-pointer"
                >
                  + Vincular embarcação agora
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cotasList.map((cotaItem, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-stone-200/90 bg-stone-50/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                        <Anchor className="w-3.5 h-3.5 text-stone-500" />
                        Cota #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCota(idx)}
                        className="text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Remover cota"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-stone-500 block mb-1">
                          Embarcação
                        </label>
                        <select
                          value={cotaItem.embarcacaoId}
                          onChange={e => handleUpdateCota(idx, { embarcacaoId: e.target.value })}
                          className="w-full h-8 px-2 rounded-md border border-stone-200 bg-white text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 cursor-pointer"
                        >
                          <option value="">Selecione...</option>
                          {sortedBoats.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-stone-500 block mb-1">
                          Cota (Ex: C1, 1/4)
                        </label>
                        <input
                          type="text"
                          value={cotaItem.cota}
                          onChange={e => handleUpdateCota(idx, { cota: e.target.value })}
                          placeholder="Cota..."
                          className="w-full h-8 px-2.5 rounded-md border border-stone-200 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                        />
                      </div>
                    </div>

                    {/* Acessórios rápidos */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { key: 'tenda', label: 'Tenda' },
                        { key: 'mesa', label: 'Mesa' },
                        { key: 'churrasqueira', label: 'Churrasqueira' },
                        { key: 'bancosCadeiras', label: 'Bancos' }
                      ].map(acc => {
                        const isChecked = !!cotaItem.acessorios?.[acc.key as keyof typeof cotaItem.acessorios];
                        return (
                          <button
                            key={acc.key}
                            type="button"
                            onClick={() => {
                              const cur = cotaItem.acessorios || {};
                              handleUpdateCota(idx, {
                                acessorios: {
                                  ...cur,
                                  [acc.key]: !isChecked
                                }
                              });
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                              isChecked
                                ? 'bg-mx-ink-100 border-mx-ink text-mx-ink font-semibold'
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            {acc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CARD 4: CONTATOS & ENDEREÇO */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
            <div className="flex items-center gap-2 text-stone-900 pb-1 border-b border-stone-100">
              <Phone className="w-4 h-4 text-stone-500" />
              <h3 className="text-[13px] font-semibold">Contatos & Localização</h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Celular / WhatsApp
                </label>
                <input
                  type="text"
                  value={telefone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="cliente@exemplo.com"
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="pt-2 border-t border-stone-100 space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[10px] font-semibold text-stone-500 block mb-1">
                    CEP {isSearchingCep && '...'}
                  </label>
                  <input
                    type="text"
                    value={cep}
                    onChange={e => handleCepChange(e.target.value)}
                    onBlur={searchCep}
                    placeholder="00000-000"
                    className="w-full h-8 px-2.5 rounded-md border border-stone-200 text-xs text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-stone-500 block mb-1">
                    Rua / Avenida
                  </label>
                  <input
                    type="text"
                    value={logradouro}
                    onChange={e => setLogradouro(e.target.value)}
                    placeholder="Rua..."
                    className="w-full h-8 px-2.5 rounded-md border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-stone-500 block mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={numeroEnd}
                    onChange={e => setNumeroEnd(e.target.value)}
                    placeholder="Nº"
                    className="w-full h-8 px-2.5 rounded-md border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-stone-500 block mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={bairro}
                    onChange={e => setBairro(e.target.value)}
                    placeholder="Bairro"
                    className="w-full h-8 px-2.5 rounded-md border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-stone-500 block mb-1">
                    Cidade / UF
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={cidade}
                      onChange={e => setCidade(e.target.value)}
                      placeholder="Cidade"
                      className="w-full h-8 px-2 rounded-md border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                    />
                    <input
                      type="text"
                      maxLength={2}
                      value={estado}
                      onChange={e => setEstado(e.target.value.toUpperCase())}
                      placeholder="UF"
                      className="w-10 h-8 px-1 rounded-md border border-stone-200 text-xs text-stone-900 uppercase text-center font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CARD 5: HABILITAÇÃO NÁUTICA (CHA) */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-2.5">
            <div className="flex items-center gap-2 text-stone-900 pb-1 border-b border-stone-100">
              <Compass className="w-4 h-4 text-stone-500" />
              <h3 className="text-[13px] font-semibold">Habilitação Náutica (Marinha)</h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-stone-500 block mb-1">
                  Número CHA
                </label>
                <input
                  type="text"
                  value={numeroHabilitacao}
                  onChange={e => setNumeroHabilitacao(e.target.value)}
                  placeholder="Nº da carteira"
                  className="w-full h-8 px-2.5 rounded-md border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-stone-500 block mb-1">
                  Categoria
                </label>
                <select
                  value={categoriaHabilitacao}
                  onChange={e => setCategoriaHabilitacao(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 cursor-pointer"
                >
                  <option value="Motonauta">Motonauta</option>
                  <option value="Arrais Amador">Arrais Amador</option>
                  <option value="Mestre Amador">Mestre Amador</option>
                  <option value="Capitão Amador">Capitão Amador</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-stone-500 block mb-1">
                  Validade
                </label>
                <input
                  type="date"
                  value={validadeHabilitacao}
                  onChange={e => setValidadeHabilitacao(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 cursor-pointer"
                />
              </div>
            </div>
          </section>
        </form>

        {/* Rodapé fixo do Drawer */}
        <footer className="h-16 px-5 border-t border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-8 px-3.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Salvar cliente'}</span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
