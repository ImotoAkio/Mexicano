import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FileText,
  Anchor,
  Compass,
  Search,
  MessageCircle,
  ChevronRight,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Award,
  Loader2,
  UserCheck
} from 'lucide-react';
import { Cliente, Embarcacao } from '../../types';
import { clientDB } from '../../db';
import { getBoatCode } from '../../utils/boatUtils';
import {
  normalizeCotaCode,
  getBoatCotaOccupancyMap,
  getBoatCotasList,
  getBoatTotalCotas,
  getBoatEstoqueResumo
} from '../../utils/cotaUtils';

interface ComercialClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedClient: Cliente) => void;
  editingClient?: Cliente | null;
  boats: Embarcacao[];
  clients?: Cliente[];
}

interface CotaItem {
  embarcacaoId: string;
  cota: string;
  plano?: 'normal' | 'completo';
  acessorios?: {
    tenda?: boolean;
    mesa?: boolean;
    churrasqueira?: boolean;
    bancosCadeiras?: boolean;
    observacoes?: string;
  };
}

export default function ComercialClientModal({
  isOpen,
  onClose,
  onSave,
  editingClient = null,
  boats = [],
  clients: propClients
}: ComercialClientModalProps) {
  const isEditing = !!editingClient;

  // Lista de outros clientes para controle de cotas ocupadas
  const clients = useMemo(() => {
    const list = propClients && propClients.length > 0 ? propClients : clientDB.getAll();
    return list.filter(c => c.id !== editingClient?.id);
  }, [propClients, editingClient, isOpen]);

  // Aba ativa: 'comercial' | 'embarcacoes' | 'dados' | 'endereco'
  const [activeTab, setActiveTab] = useState<'comercial' | 'embarcacoes' | 'dados' | 'endereco'>('comercial');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados do Formulário - Comercial
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [plano, setPlano] = useState<'completo' | 'normal'>('normal');
  const [statusFinanceiro, setStatusFinanceiro] = useState<'em_dia' | 'inadimplente' | 'pendente'>('em_dia');
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
  const [cepError, setCepError] = useState<string | null>(null);
  const numeroInputRef = useRef<HTMLInputElement | null>(null);

  // Embarcações ordenadas por código Mxx
  const sortedBoats = useMemo(() => {
    return [...boats].sort((a, b) => {
      const codeA = getBoatCode(a);
      const codeB = getBoatCode(b);
      const numA = parseInt(codeA.replace(/\D/g, ''), 10);
      const numB = parseInt(codeB.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
      return (a.nome || '').localeCompare(b.nome || '');
    });
  }, [boats]);

  // Inicializar dados quando o modal abre ou cliente muda
  useEffect(() => {
    if (!isOpen) return;

    if (editingClient) {
      setNome(editingClient.nome || '');
      setStatus(editingClient.status === 'inativo' ? 'inativo' : 'ativo');
      setPlano(editingClient.plano || 'normal');
      setStatusFinanceiro(editingClient.statusFinanceiro || 'em_dia');
      setEmpresas(editingClient.empresas && editingClient.empresas.length > 0 ? editingClient.empresas : ['VALE']);
      setObservacoesFinanceiras(editingClient.observacoesFinanceiras || '');

      // Cotas (normalizadas para C1, C2...)
      if (editingClient.embarcacoes && editingClient.embarcacoes.length > 0) {
        setCotasList(editingClient.embarcacoes.map((eb, idx) => ({
          embarcacaoId: eb.embarcacaoId || '',
          cota: normalizeCotaCode(eb.cota, idx + 1),
          plano: eb.plano || editingClient.plano || 'normal',
          acessorios: eb.acessorios ? { ...eb.acessorios } : undefined
        })));
      } else if (editingClient.embarcacaoId) {
        setCotasList([{
          embarcacaoId: editingClient.embarcacaoId,
          cota: normalizeCotaCode(editingClient.cota, 1),
          plano: editingClient.plano || 'normal',
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

    setActiveTab('comercial');
    setErrorMessage(null);
  }, [isOpen, editingClient]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Máscaras de digitação
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

    // Se preencheu os 8 dígitos do CEP, aciona a busca automaticamente no ViaCEP
    if (clean.length === 8) {
      searchCep(clean);
    }
  };

  // Busca de CEP automática via ViaCEP
  const searchCep = async (overrideCep?: string) => {
    const cleanCep = (overrideCep !== undefined ? overrideCep : cep).replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    setCepError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setLogradouro(data.logradouro);
        if (data.bairro) setBairro(data.bairro);
        if (data.localidade) setCidade(data.localidade);
        if (data.uf) setEstado(data.uf);
        if (data.complemento && !complemento) setComplemento(data.complemento);
        // Focar automaticamente no número da residência após preencher
        setTimeout(() => {
          numeroInputRef.current?.focus();
        }, 120);
      } else {
        setCepError('CEP não encontrado');
        setTimeout(() => setCepError(null), 4000);
      }
    } catch {
      setCepError('Falha ao consultar CEP');
      setTimeout(() => setCepError(null), 4000);
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Toggle de Empresas
  const toggleEmpresa = (emp: string) => {
    if (empresas.includes(emp)) {
      if (empresas.length > 1) {
        setEmpresas(empresas.filter(e => e !== emp));
      }
    } else {
      setEmpresas([...empresas, emp]);
    }
  };

  // Helper para encontrar a próxima cota livre considerando os outros clientes ativos + as demais cotas já adicionadas neste formulário
  const findNextFreeCotaForBoat = (boatId: string, currentList: CotaItem[], ignoreIndex?: number): string => {
    if (!boatId) return 'C1';
    const allClients = clientDB.getAll().filter(c => c.id !== editingClient?.id);
    const boatObj = boats.find(b => b.id === boatId);
    const occupiedMap = getBoatCotaOccupancyMap(boatId, allClients, boatObj);

    const usedInForm = new Set<string>();
    currentList.forEach((it, idx) => {
      if (idx !== ignoreIndex && it.embarcacaoId === boatId && it.cota) {
        usedInForm.add(normalizeCotaCode(it.cota, 1));
      }
    });

    const total = getBoatTotalCotas(boatObj, occupiedMap.size + usedInForm.size);
    for (let i = 1; i <= total; i++) {
      const code = `C${i}`;
      if (!occupiedMap.has(code) && !usedInForm.has(code)) {
        return code;
      }
    }
    return `C${total + 1}`;
  };

  // Manipulação de Cotas
  const handleAddCota = () => {
    const lastBoatId = cotasList.length > 0 ? cotasList[cotasList.length - 1].embarcacaoId : '';
    const defaultBoatId = lastBoatId || (sortedBoats.length > 0 ? sortedBoats[0].id : '');
    const nextFree = findNextFreeCotaForBoat(defaultBoatId, cotasList);

    setCotasList(prev => [
      ...prev,
      {
        embarcacaoId: defaultBoatId,
        cota: nextFree,
        plano: 'normal',
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
      prev.map((item, i) => {
        if (i !== index) return item;
        const nextItem = { ...item, ...fields };
        if (fields.embarcacaoId !== undefined && fields.embarcacaoId !== item.embarcacaoId) {
          nextItem.cota = findNextFreeCotaForBoat(fields.embarcacaoId, prev, index);
        } else if (fields.cota !== undefined) {
          nextItem.cota = normalizeCotaCode(fields.cota, 1);
        }
        return nextItem;
      })
    );
  };

  // Salvar Cliente
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMessage('Por favor, informe o nome completo do cliente.');
      setActiveTab('dados');
      return;
    }

    // Validar cotas selecionadas (sem duplicidade e sem conflito com outro titular ativo)
    const validCotas = cotasList.filter(c => c.embarcacaoId);
    const otherActiveClients = clientDB.getAll().filter(c => c.id !== editingClient?.id);
    const seenPairs = new Set<string>();

    for (let i = 0; i < validCotas.length; i++) {
      const item = validCotas[i];
      const normCode = normalizeCotaCode(item.cota, i + 1);
      const pairKey = `${item.embarcacaoId}::${normCode}`;
      const boatObj = boats.find(b => b.id === item.embarcacaoId);
      const boatLabel = boatObj ? getBoatCode(boatObj) : 'Embarcação';

      if (seenPairs.has(pairKey)) {
        setErrorMessage(`A cota ${normCode} da embarcação ${boatLabel} foi selecionada mais de uma vez para este cliente.`);
        setActiveTab('embarcacoes');
        return;
      }
      seenPairs.add(pairKey);

      const occupiedMap = getBoatCotaOccupancyMap(item.embarcacaoId, otherActiveClients, boatObj);
      const occupant = occupiedMap.get(normCode);
      if (occupant && occupant.clienteId !== editingClient?.id) {
        setErrorMessage(`A cota ${normCode} (${boatLabel}) já pertence ao titular ${occupant.clienteNome}.`);
        setActiveTab('embarcacoes');
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const normalizedCotasList = validCotas.map((c, idx) => ({
        embarcacaoId: c.embarcacaoId,
        cota: normalizeCotaCode(c.cota, idx + 1),
        plano: c.plano || 'normal',
        acessorios: c.acessorios
      }));

      // Determina embarcação e cota primárias para compatibilidade legado
      const primaryBoat = normalizedCotasList.length > 0 ? normalizedCotasList[0] : null;
      const anyBoatCompleto = normalizedCotasList.some(c => c.plano === 'completo');

      const payload: Partial<Cliente> = {
        nome: nome.trim(),
        status,
        plano: anyBoatCompleto ? 'completo' : 'normal',
        statusFinanceiro,
        empresas,
        observacoesFinanceiras: observacoesFinanceiras.trim(),
        embarcacaoId: primaryBoat ? primaryBoat.embarcacaoId : '',
        cota: primaryBoat ? primaryBoat.cota : '',
        embarcacoes: normalizedCotasList,
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
      console.error('Erro ao salvar cliente comercial:', err);
      setErrorMessage(err.message || 'Falha ao salvar dados do cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  interface ClientTabItem {
    id: 'comercial' | 'embarcacoes' | 'dados' | 'endereco';
    label: string;
    icon: React.ElementType;
    desc: string;
    count?: number;
  }

  const CLIENT_TABS: ClientTabItem[] = [
    { id: 'comercial', label: 'Condição Comercial', icon: Sparkles, desc: 'Status do cadastro, plano de navegação e empresas vinculadas' },
    { id: 'embarcacoes', label: 'Embarcações & Cotas', icon: Ship, desc: 'Vínculos de cotas e acessórios por embarcação', count: cotasList.length },
    { id: 'dados', label: 'Dados Pessoais', icon: User, desc: 'Identificação civil e habilitação náutica do cotista' },
    { id: 'endereco', label: 'Contatos & Endereço', icon: MapPin, desc: 'Canais de comunicação e endereço residencial' },
  ];

  const currentTabMeta = CLIENT_TABS.find(t => t.id === activeTab) || CLIENT_TABS[0];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ─── MODAL CONTAINER (Padrão Split View da Referência) ─── */}
      <div
        className="bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-stone-200/80 w-full max-w-4xl h-[90vh] max-h-[680px] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ================= COLUNA LATERAL ESQUERDA ================= */}
        <aside className="w-full md:w-72 bg-stone-50/70 border-b md:border-b-0 md:border-r border-stone-200/70 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            
            {/* Cabeçalho da Coluna Esquerda */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex items-center justify-center text-stone-800 shrink-0">
                  <User className="w-4 h-4 text-stone-700" />
                </div>
                <h3 className="font-bold text-[14px] text-stone-900 tracking-tight">
                  {isEditing ? 'Editar Cotista' : 'Novo Cotista'}
                </h3>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                {isEditing ? (
                  <>Atualização cadastral e cotas de <span className="font-semibold text-stone-800">{nome || 'cliente'}</span>.</>
                ) : (
                  'Cadastre cotistas e configure embarcações, cotas e planos.'
                )}
              </p>
            </div>

            {/* Menu Vertical de Navegação por Pílulas */}
            <nav className="space-y-1">
              {CLIENT_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                        : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-stone-600" />
                      <span>{tab.label}</span>
                    </div>
                    {typeof tab.count === 'number' && tab.count > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Rodapé da Coluna Esquerda */}
          <div className="pt-4 border-t border-stone-200/60 space-y-2 mt-4">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-500 font-medium">Situação:</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 ${
                status === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status === 'ativo' ? 'bg-emerald-600' : 'bg-stone-400'}`} />
                {status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-stone-400 pt-0.5">
              <span className="font-medium text-stone-600">Plano {plano === 'completo' ? 'Completo' : 'Normal'}</span>
              <span className="font-semibold text-stone-700">{cotasList.length} {cotasList.length === 1 ? 'cota' : 'cotas'}</span>
            </div>
          </div>
        </aside>

        {/* ================= COLUNA PRINCIPAL DE CONTEÚDO ================= */}
        <main className="flex-1 flex flex-col min-w-0 bg-white p-6 md:p-8 overflow-hidden">
          {/* Cabeçalho da Seção Ativa + Botão Fechar */}
          <header className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100 shrink-0">
            <div>
              <h2 className="font-bold text-base text-stone-900 tracking-tight">
                {currentTabMeta.label}
              </h2>
              <p className="text-xs text-stone-500 font-normal mt-0.5">
                {currentTabMeta.desc}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* MENSAGEM DE ERRO (CASO HAJA) */}
          {errorMessage && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* CORPO DO FORMULÁRIO COM SCROLL */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* ============================================================== */}
          {/* ABA 1: CONDIÇÃO COMERCIAL                                      */}
          {/* ============================================================== */}
          {activeTab === 'comercial' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Status Cadastral e Plano */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status Cadastral */}
                <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200/80 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                    Status do Cadastro
                  </label>
                  <p className="text-[11px] text-stone-500">
                    Define se o cliente está liberado para navegação, reservas e agendamentos.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setStatus('ativo')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        status === 'ativo'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Ativo (Liberado)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('inativo')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        status === 'inativo'
                          ? 'bg-stone-200 border-stone-400 text-stone-900 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-stone-400" />
                      Inativo (Bloqueado)
                    </button>
                  </div>
                </div>

                {/* Plano Náutico por Embarcação */}
                <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-stone-400" />
                      Plano Náutico por Embarcação
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('embarcacoes')}
                      className="text-[11px] font-semibold text-mx-ink hover:underline cursor-pointer"
                    >
                      Configurar nas Cotas →
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    O acesso às segundas e terças é contratado individualmente por embarcação na aba <strong>Embarcações & Cotas</strong>, incidindo diretamente sobre a taxa administrativa do respectivo bem.
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {cotasList.length === 0 ? (
                      <span className="text-xs text-stone-400 italic">Nenhuma cota vinculada no momento.</span>
                    ) : (
                      cotasList.map((c, i) => {
                        const b = boats.find(boat => boat.id === c.embarcacaoId);
                        const isC = c.plano === 'completo';
                        return (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border border-stone-200/70 text-xs">
                            <span className="font-semibold text-stone-800">
                              {b ? `${getBoatCode(b)} — ${b.nome}` : `Embarcação #${i + 1}`} ({c.cota})
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isC ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-stone-100 text-stone-600'
                            }`}>
                              {isC ? 'Plano Completo' : 'Normal'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Empresas Vinculadas */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-stone-400" />
                  Empresas / Unidades Vinculadas
                </label>
                <p className="text-[11px] text-stone-500">
                  Selecione as unidades onde o cliente possui cadastro ou autorização de serviço.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'VALE', name: 'Vale Administradora', desc: 'Administra cotas' },
                    { id: 'MARINA', name: 'Marina', desc: 'Guarda embarcações não administradas' }
                  ].map(emp => {
                    const isSelected = empresas.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEmpresa(emp.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-mx-ink bg-mx-ink-50 shadow-xs ring-1 ring-mx-ink/30'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${isSelected ? 'text-mx-ink' : 'text-stone-800'}`}>
                            {emp.name}
                          </span>
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                              isSelected ? 'bg-mx-ink border-mx-ink text-white' : 'border-stone-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <span className="text-[11px] text-stone-500 leading-snug block">{emp.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Observações Comerciais */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-stone-400" />
                  Observações Comerciais & Anotações
                </label>
                <textarea
                  rows={3}
                  value={observacoesFinanceiras}
                  onChange={e => setObservacoesFinanceiras(e.target.value)}
                  placeholder="Informações contratuais adicionais, preferências do cotista, acordos ou histórico..."
                  className="w-full p-3 rounded-xl border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                />
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 2: EMBARCAÇÕES & COTAS NÁUTICAS                           */}
          {/* ============================================================== */}
          {activeTab === 'embarcacoes' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200/80">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <Ship className="w-4 h-4 text-mx-ink" />
                    Cotas Náuticas Vinculadas
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    O cliente pode possuir cotas em uma ou múltiplas lanchas, jet skis ou veículos da frota.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCota}
                  className="h-8 px-3.5 rounded-lg bg-mx-ink text-white hover:bg-mx-ink-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Cota</span>
                </button>
              </div>

              {cotasList.length === 0 ? (
                <div className="p-8 text-center rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50">
                  <div className="w-10 h-10 rounded-full bg-stone-100 mx-auto flex items-center justify-center text-stone-400 mb-2">
                    <Anchor className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-stone-800">Nenhuma cota náutica vinculada</h4>
                  <p className="text-[11px] text-stone-500 max-w-sm mx-auto mt-1 mb-3">
                    Este cliente está cadastrado como prospecto avulso. Clique no botão abaixo para vincular uma embarcação e cota.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddCota}
                    className="h-8 px-3.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Vincular Embarcação Agora
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {cotasList.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-xs space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-mx-ink-100 text-mx-ink text-[11px] font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-stone-800">
                            Cota Náutica #{idx + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCota(idx)}
                          className="text-stone-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remover esta cota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Seletor de Embarcação */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-stone-600">
                            Embarcação da Frota
                          </label>
                          <select
                            value={item.embarcacaoId}
                            onChange={e => handleUpdateCota(idx, { embarcacaoId: e.target.value })}
                            className="w-full h-9 px-3 rounded-lg border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:bg-white cursor-pointer"
                          >
                            <option value="">Selecione a embarcação...</option>
                            {sortedBoats.map(b => {
                              const estoque = getBoatEstoqueResumo(b.id, clients, b);
                              return (
                                <option key={b.id} value={b.id}>
                                  {getBoatCode(b)} — {b.nome} ({estoque.cotasDisponiveis}/{estoque.totalCotas} livres)
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Seleção Padronizada da Cota (C1..CN) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-stone-600">
                              Fração / Cota Padronizada
                            </label>
                            <span className="text-[10px] text-stone-400">
                              Clique em uma cota disponível
                            </span>
                          </div>
                          {(() => {
                            const boatObj = boats.find(b => b.id === item.embarcacaoId);
                            const occMap = item.embarcacaoId
                              ? getBoatCotaOccupancyMap(item.embarcacaoId, clients, boatObj)
                              : new Map<string, { clienteId: string; clienteNome: string; cota: string }>();
                            const slots = getBoatCotasList(boatObj, occMap.size);
                            const currentNorm = normalizeCotaCode(item.cota, idx + 1);

                            return (
                              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                                {slots.map(slot => {
                                  const occ = occMap.get(slot);
                                  const occupiedByOtherClient = !!(occ && occ.clienteId !== editingClient?.id);
                                  const usedInOtherRow = cotasList.some(
                                    (other, otherIdx) =>
                                      otherIdx !== idx &&
                                      other.embarcacaoId &&
                                      other.embarcacaoId === item.embarcacaoId &&
                                      normalizeCotaCode(other.cota, otherIdx + 1) === slot
                                  );
                                  const isSelected = currentNorm === slot;
                                  const isDisabled = occupiedByOtherClient || usedInOtherRow;

                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      disabled={isDisabled}
                                      onClick={() => handleUpdateCota(idx, { cota: slot })}
                                      title={
                                        occupiedByOtherClient
                                          ? `Ocupada por ${occ?.clienteNome}`
                                          : usedInOtherRow
                                          ? 'Já selecionada em outra cota deste cliente'
                                          : `Selecionar cota ${slot}`
                                      }
                                      className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-bold flex flex-col items-center justify-center transition-all tabular-nums ${
                                        isSelected
                                          ? 'bg-mx-ink text-white border-mx-ink shadow-xs cursor-pointer'
                                          : isDisabled
                                          ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-75'
                                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:border-stone-300 cursor-pointer'
                                      }`}
                                    >
                                      <span>{slot}</span>
                                      <span
                                        className={`text-[9px] font-medium truncate max-w-full ${
                                          isSelected
                                            ? 'text-white/80'
                                            : isDisabled
                                            ? 'text-stone-400'
                                            : 'text-emerald-600'
                                        }`}
                                      >
                                        {occupiedByOtherClient
                                          ? 'Ocupada'
                                          : usedInOtherRow
                                          ? 'Em uso'
                                          : 'Livre'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Acessórios da Cota */}
                      <div className="pt-2 border-t border-stone-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                          Acessórios Inclusos nesta Cota
                        </span>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {[
                            { key: 'tenda', label: 'Tenda' },
                            { key: 'mesa', label: 'Mesa' },
                            { key: 'churrasqueira', label: 'Churrasqueira' },
                            { key: 'bancosCadeiras', label: 'Bancos / Cadeiras' }
                          ].map(acc => {
                            const isChecked = !!item.acessorios?.[acc.key as keyof typeof item.acessorios];
                            return (
                              <button
                                key={acc.key}
                                type="button"
                                onClick={() => {
                                  const cur = item.acessorios || {};
                                  handleUpdateCota(idx, {
                                    acessorios: {
                                      ...cur,
                                      [acc.key]: !isChecked
                                    }
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-mx-ink-100 border-mx-ink text-mx-ink font-semibold'
                                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                                }`}
                              >
                                <div
                                  className={`w-3 h-3 rounded-xs border flex items-center justify-center ${
                                    isChecked ? 'bg-mx-ink border-mx-ink text-white' : 'border-stone-300 bg-white'
                                  }`}
                                >
                                  {isChecked && <Check className="w-2 h-2 stroke-[3]" />}
                                </div>
                                <span>{acc.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Plano Contratado desta Cota */}
                      <div className="pt-2.5 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-stone-400" />
                            Plano de Atendimento desta Embarcação
                          </span>
                          <span className="text-[10px] text-stone-400 block mt-0.5">
                            Acesso e navegação às segundas e terças-feiras (incide na taxa adm deste bem)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateCota(idx, { plano: 'normal' })}
                            className={`py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                              (item.plano || 'normal') === 'normal'
                                ? 'bg-mx-ink-50 border-mx-ink text-mx-ink shadow-xs'
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            Plano Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateCota(idx, { plano: 'completo' })}
                            className={`py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                              item.plano === 'completo'
                                ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5 text-amber-600" />
                            Plano Completo (+ Seg/Ter)
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 3: DADOS PESSOAIS & DOCUMENTOS                            */}
          {/* ============================================================== */}
          {activeTab === 'dados' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome Completo */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Nome completo do cotista ou cliente..."
                    className="w-full h-10 px-3.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                  />
                </div>

                {/* CPF */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    CPF (ou CNPJ)
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={e => handleCpfChange(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full h-10 px-3.5 rounded-xl border border-stone-200 text-xs text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                  />
                </div>

                {/* Data de Nascimento */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={e => setDataNascimento(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink cursor-pointer"
                  />
                </div>

                {/* RG */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    RG
                  </label>
                  <input
                    type="text"
                    value={rg}
                    onChange={e => setRg(e.target.value)}
                    placeholder="Número do RG..."
                    className="w-full h-10 px-3.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                  />
                </div>

                {/* Órgão Emissor */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Órgão Emissor
                  </label>
                  <input
                    type="text"
                    value={orgaoEmissor}
                    onChange={e => setOrgaoEmissor(e.target.value)}
                    placeholder="Ex: SDS/PE, SSP/SP..."
                    className="w-full h-10 px-3.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                  />
                </div>

                {/* Profissão */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Profissão
                  </label>
                  <input
                    type="text"
                    value={profissao}
                    onChange={e => setProfissao(e.target.value)}
                    placeholder="Ex: Empresário, Engenheiro..."
                    className="w-full h-10 px-3.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                  />
                </div>

                {/* Estado Civil */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Estado Civil
                  </label>
                  <select
                    value={estadoCivil}
                    onChange={e => setEstadoCivil(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 cursor-pointer"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="União Estável">União Estável</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                  </select>
                </div>
              </div>

              {/* Habilitação Náutica (Marinha) */}
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-mx-ink" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Habilitação Náutica (Marinha do Brasil)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-600">Número CHA</label>
                    <input
                      type="text"
                      value={numeroHabilitacao}
                      onChange={e => setNumeroHabilitacao(e.target.value)}
                      placeholder="Nº da carteira de habilitação..."
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-600">Categoria</label>
                    <select
                      value={categoriaHabilitacao}
                      onChange={e => setCategoriaHabilitacao(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 cursor-pointer"
                    >
                      <option value="Motonauta">Motonauta</option>
                      <option value="Arrais Amador">Arrais Amador</option>
                      <option value="Mestre Amador">Mestre Amador</option>
                      <option value="Capitão Amador">Capitão Amador</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-600">Validade da CHA</label>
                    <input
                      type="date"
                      value={validadeHabilitacao}
                      onChange={e => setValidadeHabilitacao(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 4: CONTATOS & ENDEREÇO                                     */}
          {/* ============================================================== */}
          {activeTab === 'endereco' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Contatos Diretos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      Telefone / Celular (WhatsApp)
                    </span>
                    {telefone && (
                      <a
                        href={`https://wa.me/55${telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Testar no WhatsApp
                      </a>
                    )}
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full h-10 px-3.5 rounded-xl border border-stone-200 text-xs text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    E-mail Principal
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="cliente@exemplo.com.br"
                    className="w-full h-10 px-3.5 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                  />
                </div>
              </div>

              {/* Endereço Residencial / Cobrança */}
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-mx-ink" />
                    Endereço de Correspondência
                  </h4>
                  {isSearchingCep && (
                    <span className="text-[11px] text-stone-400 flex items-center gap-1 animate-pulse">
                      Buscando endereço...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* CEP */}
                  <div className="space-y-1 sm:col-span-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-stone-600">CEP</label>
                      {cepError && (
                        <span className="text-[10px] text-rose-500 font-semibold animate-in fade-in">{cepError}</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={cep}
                        onChange={e => handleCepChange(e.target.value)}
                        onBlur={() => searchCep()}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full h-9 pl-3 pr-8 rounded-lg border border-stone-200 text-xs text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                        {isSearchingCep ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-500" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => searchCep()}
                            className="text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                            title="Buscar endereço no ViaCEP"
                          >
                            <Search className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Logradouro */}
                  <div className="space-y-1 sm:col-span-3">
                    <label className="text-[11px] font-semibold text-stone-600">Rua / Avenida</label>
                    <input
                      type="text"
                      value={logradouro}
                      onChange={e => setLogradouro(e.target.value)}
                      placeholder="Nome da rua ou avenida..."
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                    />
                  </div>

                  {/* Número */}
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[11px] font-semibold text-stone-600">Número</label>
                    <input
                      ref={numeroInputRef}
                      type="text"
                      value={numeroEnd}
                      onChange={e => setNumeroEnd(e.target.value)}
                      placeholder="Nº..."
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                    />
                  </div>

                  {/* Complemento */}
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[11px] font-semibold text-stone-600">Complemento</label>
                    <input
                      type="text"
                      value={complemento}
                      onChange={e => setComplemento(e.target.value)}
                      placeholder="Apto, Bloco..."
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                    />
                  </div>

                  {/* Bairro */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-stone-600">Bairro</label>
                    <input
                      type="text"
                      value={bairro}
                      onChange={e => setBairro(e.target.value)}
                      placeholder="Bairro..."
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                    />
                  </div>

                  {/* Cidade */}
                  <div className="space-y-1 sm:col-span-3">
                    <label className="text-[11px] font-semibold text-stone-600">Cidade</label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={e => setCidade(e.target.value)}
                      placeholder="Cidade..."
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                    />
                  </div>

                  {/* Estado */}
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[11px] font-semibold text-stone-600">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={estado}
                      onChange={e => setEstado(e.target.value.toUpperCase())}
                      placeholder="UF"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 uppercase focus:outline-none focus:ring-2 focus:ring-mx-ink/20 text-center font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

          {/* ================= RODAPÉ PRINCIPAL DO MODAL ================= */}
          <footer className="pt-4 border-t border-stone-100 flex items-center justify-between shrink-0">
            <div className="text-xs text-stone-400 hidden sm:block">
              {isEditing ? (
                <span>Editando cotista • ID: {editingClient?.id}</span>
              ) : (
                <span>Preencha as informações para cadastrar</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="h-9 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="h-9 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Cotista'}</span>
                  </>
                )}
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
