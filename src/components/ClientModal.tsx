import React, { useState, useEffect, useMemo } from 'react';
import { User, Ship, Building2, Plus, X, Check, Loader2, FileText, Compass, MapPin, Lock, AlertTriangle, ChevronRight } from 'lucide-react';
import { clientDB, boatDB } from '../db';
import { Cliente, Embarcacao } from '../types';
import {
  normalizeCotaCode,
  getBoatCotaOccupancyMap,
  getBoatCotasList,
  getBoatTotalCotas
} from '../utils/cotaUtils';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedClient: Cliente) => void;
  editingClient?: Cliente | null;
  boats?: Embarcacao[];
  defaultEmpresas?: string[];
  lockEmpresa?: string;
  userRole?: string;
}

type TabType = 'dados' | 'veiculos' | 'documentos';

export default function ClientModal({
  isOpen,
  onClose,
  onSave,
  editingClient = null,
  boats: propBoats,
  defaultEmpresas,
  lockEmpresa,
  userRole
}: ClientModalProps) {
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dados');

  // Identifica se o usuário atual é da Marina
  const isMarinaUser = lockEmpresa === 'MARINA' || userRole === 'marina_gerente' || userRole === 'marina_operador' || userRole === 'marina' || (() => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role === 'marina_gerente' || payload.role === 'marina_operador' || payload.role === 'marina';
    } catch {
      return false;
    }
  })();

  // Verifica se uma embarcação pertence à Marina
  const isBoatMarina = (b: Embarcacao): boolean => {
    const emp = b.empresas && b.empresas.length > 0 ? b.empresas : ['VALE'];
    return emp.includes('MARINA');
  };

  // Se o usuário for da Marina, ele só pode vincular embarcações da frota da Marina
  const selectableBoats = isMarinaUser
    ? boats.filter(isBoatMarina)
    : boats;

  // Verifica se o cliente a ser editado pertence exclusivamente à Vale (somente leitura para Marina)
  const isValeReadOnly = Boolean(
    isMarinaUser &&
    editingClient &&
    (() => {
      const emps = Array.isArray(editingClient.empresas) && editingClient.empresas.length > 0
        ? editingClient.empresas.map(e => e.toUpperCase().trim())
        : ['VALE'];
      return !emps.includes('MARINA');
    })()
  );

  // Lista de outros clientes para controle de cotas ocupadas
  const otherClients = useMemo(() => {
    return clientDB.getAll().filter(c => c.id !== editingClient?.id);
  }, [editingClient, isOpen]);

  // Helper para encontrar a próxima cota livre considerando os outros clientes ativos + as demais cotas já adicionadas neste formulário
  const findNextFreeCotaForBoat = (
    boatId: string,
    currentList: Array<{ embarcacaoId: string; cota: string; [key: string]: any }>,
    ignoreIndex?: number
  ): string => {
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
  
  // Form States
  const [name, setName] = useState('');
  const [clientBoats, setClientBoats] = useState<Array<{
    embarcacaoId: string;
    cota: string;
    acessorios?: {
      tenda?: boolean;
      mesa?: boolean;
      churrasqueira?: boolean;
      bancosCadeiras?: boolean;
      observacoes?: string;
    };
    plano?: 'normal' | 'completo';
  }>>([{ embarcacaoId: '', cota: '', plano: 'normal' }]);
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
  const [empresas, setEmpresas] = useState<string[]>(['VALE']);

  const normalizeEmpresas = (raw: any): string[] => {
    let list: string[] = [];
    if (Array.isArray(raw)) {
      list = raw.map(x => String(x).toUpperCase().trim()).filter(Boolean);
    } else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed.map(x => String(x).toUpperCase().trim()).filter(Boolean);
        } else {
          list = [String(raw).toUpperCase().trim()];
        }
      } catch {
        list = raw.split(',').map(x => x.toUpperCase().trim()).filter(Boolean);
      }
    }
    list = list.filter(e => e !== 'MEXICANO');
    if (list.length === 0) {
      list = ['VALE'];
    }
    return list;
  };

  // Gestão de autenticação do cliente (Admin)
  const [authStatus, setAuthStatus] = useState<{ hasAuth: boolean; createdAt?: string } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [showSetPasswordInput, setShowSetPasswordInput] = useState(false);
  const [manualPassword, setManualPassword] = useState('');
  const [authActionLoading, setAuthActionLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (isOpen && editingClient?.id) {
      setIsLoadingAuth(true);
      fetch(`/api/auth/client/admin-status/${editingClient.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || localStorage.getItem('token') || ''}`
        }
      })
        .then(r => r.json())
        .then(d => {
          if (d.success) setAuthStatus({ hasAuth: d.hasAuth, createdAt: d.createdAt });
        })
        .catch(console.error)
        .finally(() => setIsLoadingAuth(false));
    } else {
      setAuthStatus(null);
      setShowSetPasswordInput(false);
      setManualPassword('');
    }
  }, [isOpen, editingClient]);

  const handleAdminResetPassword = async () => {
    if (!editingClient?.id) return;
    if (!confirm(`Deseja resetar o acesso de ${editingClient.nome}? O cliente poderá definir uma nova senha no próximo login digitando seu CPF.`)) return;

    setAuthActionLoading(true);
    try {
      const res = await fetch(`/api/auth/client/admin-reset/${editingClient.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || localStorage.getItem('token') || ''}`
        }
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.message || 'Falha ao resetar acesso.');
      showToast('Acesso resetado! O cliente fará ativação no próximo acesso.', 'success');
      setAuthStatus({ hasAuth: false });
    } catch (err: any) {
      showToast(err.message || 'Erro ao resetar acesso.', 'error');
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleAdminSetManualPassword = async () => {
    if (!editingClient?.id) return;
    if (manualPassword.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }

    setAuthActionLoading(true);
    try {
      const res = await fetch(`/api/auth/client/admin-set-password/${editingClient.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ password: manualPassword })
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.message || 'Falha ao definir senha.');
      showToast('Nova senha salva com sucesso para o cliente!', 'success');
      setAuthStatus({ hasAuth: true });
      setShowSetPasswordInput(false);
      setManualPassword('');
    } catch (err: any) {
      showToast(err.message || 'Erro ao definir senha.', 'error');
    } finally {
      setAuthActionLoading(false);
    }
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
      setActiveTab('dados');
      if (editingClient) {
        setEditingId(editingClient.id);
        setName(editingClient.nome || '');
        setStatus(editingClient.status || 'ativo');
        if (editingClient.embarcacoes && editingClient.embarcacoes.length > 0) {
          setClientBoats(editingClient.embarcacoes.map((eb, idx) => ({
            embarcacaoId: eb.embarcacaoId || '',
            cota: normalizeCotaCode(eb.cota, idx + 1),
            plano: eb.plano || editingClient.plano || 'normal',
            acessorios: eb.acessorios || {
              tenda: editingClient.acessorios?.tenda || false,
              mesa: editingClient.acessorios?.mesa || false,
              churrasqueira: editingClient.acessorios?.churrasqueira || false,
              bancosCadeiras: editingClient.acessorios?.bancosCadeiras || false,
              observacoes: editingClient.acessorios?.observacoes || ''
            }
          })));
        } else if (editingClient.embarcacaoId) {
          setClientBoats([{
            embarcacaoId: editingClient.embarcacaoId || '',
            cota: normalizeCotaCode(editingClient.cota, 1),
            plano: editingClient.plano || 'normal',
            acessorios: editingClient.acessorios || undefined
          }]);
        } else {
          setClientBoats([]);
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

        if (isMarinaUser) {
          setEmpresas(['MARINA']);
        } else {
          setEmpresas(normalizeEmpresas(editingClient.empresas));
        }
      } else {
        setEditingId(null);
        setName('');
        setStatus('ativo');

        if (isMarinaUser) {
          const marinaBoats = (propBoats && propBoats.length > 0 ? propBoats : boatDB.getAll()).filter(isBoatMarina);
          const defaultBoatId = marinaBoats[0]?.id || '';
          const nextFree = defaultBoatId ? findNextFreeCotaForBoat(defaultBoatId, []) : 'C1';
          setClientBoats([{ embarcacaoId: defaultBoatId, cota: nextFree, plano: 'normal' }]);
          setEmpresas(['MARINA']);
        } else {
          const availableBoats = propBoats && propBoats.length > 0 ? propBoats : boatDB.getAll();
          const defaultBoatId = availableBoats[0]?.id || '';
          const nextFree = defaultBoatId ? findNextFreeCotaForBoat(defaultBoatId, []) : 'C1';
          setClientBoats([{ embarcacaoId: defaultBoatId, cota: nextFree, plano: 'normal' }]);
          setEmpresas(defaultEmpresas && defaultEmpresas.length > 0 ? defaultEmpresas : ['VALE']);
        }

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
      }
    }
  }, [isOpen, editingClient, defaultEmpresas, isMarinaUser]);

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
    if (isMarinaUser && isValeReadOnly) {
      showToast('Clientes exclusivos da Vale Administradora não podem ser alterados na Marina.', 'error');
      return;
    }

    if (!name.trim()) {
      showToast('O nome é obrigatório.', 'error');
      setActiveTab('dados');
      return;
    }
    
    const validBoats = clientBoats.filter(cb => cb.embarcacaoId);
    if (validBoats.length > 0 && validBoats.some(cb => !cb.cota.trim())) {
      showToast('Selecione uma cota válida para todas as embarcações selecionadas.', 'error');
      setActiveTab('veiculos');
      return;
    }

    // Validar conflitos e duplicidades de cotas
    const otherActiveClients = clientDB.getAll().filter(c => c.id !== (editingId || editingClient?.id));
    const seenPairs = new Set<string>();

    for (let i = 0; i < validBoats.length; i++) {
      const item = validBoats[i];
      const normCode = normalizeCotaCode(item.cota, i + 1);
      const pairKey = `${item.embarcacaoId}::${normCode}`;
      const boatObj = boats.find(b => b.id === item.embarcacaoId);
      const boatLabel = boatObj?.nome || 'Embarcação';

      if (seenPairs.has(pairKey)) {
        showToast(`A cota ${normCode} da embarcação ${boatLabel} foi selecionada mais de uma vez para este cliente.`, 'error');
        setActiveTab('veiculos');
        return;
      }
      seenPairs.add(pairKey);

      const occupiedMap = getBoatCotaOccupancyMap(item.embarcacaoId, otherActiveClients, boatObj);
      const occupant = occupiedMap.get(normCode);
      if (occupant && occupant.clienteId !== (editingId || editingClient?.id)) {
        showToast(`A cota ${normCode} (${boatLabel}) já pertence ao cotista ${occupant.clienteNome}.`, 'error');
        setActiveTab('veiculos');
        return;
      }
    }

    try {
      const normalizedCotasList = validBoats.map((cb, idx) => ({
        embarcacaoId: cb.embarcacaoId,
        cota: normalizeCotaCode(cb.cota, idx + 1),
        plano: cb.plano || 'normal',
        acessorios: boats.find(b => b.id === cb.embarcacaoId)?.tipo === 'lancha' ? cb.acessorios : undefined
      }));

      const primaryBoat = normalizedCotasList[0];
      let saved: Cliente;

      const finalEmpresas = isMarinaUser
        ? ['MARINA']
        : normalizeEmpresas(empresas);

      const clientDataPayload = {
        nome: name.toUpperCase(),
        embarcacaoId: primaryBoat?.embarcacaoId || '',
        cota: primaryBoat?.cota || '',
        embarcacoes: normalizedCotasList,
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
        plano: (validBoats.some(cb => cb.plano === 'completo') ? 'completo' : 'normal') as ('normal' | 'completo'),
        empresas: finalEmpresas,
        status
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

  const validBoatsCount = clientBoats.filter(b => b.embarcacaoId).length;

  return (
    <div id="client-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-[max(1rem,env(safe-area-inset-top))] right-4 z-60 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Superior */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50/80 border border-blue-100/90 flex items-center justify-center text-blue-600 shadow-2xs">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 leading-tight">
                  {editingId ? 'Editar Cadastro do Cliente' : 'Novo Cliente'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isMarinaUser
                    ? 'Cadastro restrito aos clientes e cotistas com vínculo na Marina Club'
                    : editingId
                    ? 'Gerencie as informações pessoais, embarcações e documentação'
                    : 'Preencha os dados organizados em etapas para registrar o cliente'}
                </p>
              </div>
            </div>
            <button
              id="close-client-modal"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navegação por Abas Estruturais */}
          <div className="flex items-center gap-1 mt-5 border-b border-slate-100 -mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('dados')}
              className={`pb-3 px-3 text-xs font-medium transition-all relative cursor-pointer flex items-center gap-2 ${
                activeTab === 'dados'
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${activeTab === 'dados' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>1. Identificação & Contato</span>
              {activeTab === 'dados' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('veiculos')}
              className={`pb-3 px-3 text-xs font-medium transition-all relative cursor-pointer flex items-center gap-2 ${
                activeTab === 'veiculos'
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Compass className={`w-3.5 h-3.5 ${activeTab === 'veiculos' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>2. Embarcações & Empresas</span>
              {validBoatsCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold transition-colors ${
                  activeTab === 'veiculos' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {validBoatsCount}
                </span>
              )}
              {activeTab === 'veiculos' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('documentos')}
              className={`pb-3 px-3 text-xs font-medium transition-all relative cursor-pointer flex items-center gap-2 ${
                activeTab === 'documentos'
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 ${activeTab === 'documentos' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>3. Documentação & Endereço</span>
              {activeTab === 'documentos' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Banner Informativo se Cotista Exclusivo da Vale */}
        {isValeReadOnly && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-xs text-amber-900">
            <Lock className="w-4 h-4 shrink-0 text-amber-700" />
            <div>
              <span className="font-semibold block">Cadastro Exclusivo da Vale Administradora (Somente Leitura)</span>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Usuários da Marina Club têm permissão apenas para consulta deste cotista. Modificações ou novos vínculos devem ser solicitados à administração da Vale.
              </p>
            </div>
          </div>
        )}

        {/* Corpo do Formulário com Scroll Suave */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto subtle-scrollbar flex flex-col justify-between">
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* ============================================================== */}
            {/* PARTE 1: IDENTIFICAÇÃO E CONTATO                               */}
            {/* ============================================================== */}
            {activeTab === 'dados' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                {/* Status e Acesso */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Status do Cadastro */}
                  <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">Status do Cadastro</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {status === 'ativo' ? 'Cliente habilitado para agendar e navegar' : 'Acesso bloqueado temporariamente'}
                      </p>
                    </div>
                    <div className="inline-flex p-1 bg-slate-200/70 rounded-xl shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setStatus('ativo')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                          status === 'ativo'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Ativo
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus('inativo')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                          status === 'inativo'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200/90 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Inativo
                      </button>
                    </div>
                  </div>

                  {/* Acesso ao Aplicativo / Portal (Apenas na Edição) */}
                  {editingId ? (
                    <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-slate-900">Acesso ao Aplicativo</h4>
                        <span className="text-[11px] text-slate-500">
                          {isLoadingAuth ? 'Consultando...' : authStatus?.hasAuth ? 'Senha configurada' : 'Primeiro acesso pendente'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {authStatus?.hasAuth && (
                          <button
                            type="button"
                            onClick={handleAdminResetPassword}
                            disabled={authActionLoading}
                            className="flex-1 py-1.5 px-2.5 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Resetar Senha
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowSetPasswordInput(!showSetPasswordInput)}
                          className="flex-1 py-1.5 px-2.5 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          {showSetPasswordInput ? 'Cancelar' : 'Definir Senha Manual'}
                        </button>
                      </div>

                      {showSetPasswordInput && (
                        <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={manualPassword}
                              onChange={(e) => setManualPassword(e.target.value)}
                              placeholder="Nova senha (mínimo 6 dígitos)"
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={handleAdminSetManualPassword}
                              disabled={authActionLoading || manualPassword.length < 6}
                              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col justify-center">
                      <h4 className="text-xs font-semibold text-slate-900">Primeiro Acesso</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Ao salvar o cadastro com CPF, o cliente poderá ativar a própria senha no portal de agendamentos.
                      </p>
                    </div>
                  )}
                </div>

                {/* Campos Pessoais Principais */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Nome Completo *
                    </label>
                    <input
                      id="input-client-name"
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Telefone / Celular (WhatsApp)
                      </label>
                      <input
                        id="input-client-phone"
                        type="text"
                        placeholder="(11) 99999-9999"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Endereço de Email
                      </label>
                      <input
                        id="input-client-email"
                        type="email"
                        placeholder="cliente@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        CPF
                      </label>
                      <input
                        id="input-client-cpf"
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Data de Nascimento
                      </label>
                      <input
                        id="input-client-data-nascimento"
                        type="date"
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Estado Civil
                      </label>
                      <select
                        value={estadoCivil}
                        onChange={(e) => setEstadoCivil(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      >
                        <option value="Solteiro(a)">Solteiro(a)</option>
                        <option value="Casado(a)">Casado(a)</option>
                        <option value="Divorciado(a)">Divorciado(a)</option>
                        <option value="União Estável">União Estável</option>
                        <option value="Viúvo(a)">Viúvo(a)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Profissão / Ocupação
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Engenheiro, Médico, Empresário"
                        value={profissao}
                        onChange={(e) => setProfissao(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* PARTE 2: EMBARCAÇÕES, COTAS & UNIDADES                         */}
            {/* ============================================================== */}
            {activeTab === 'veiculos' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                {/* Cabeçalho da Seção de Veículos */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Embarcações Vinculadas</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Associe o cliente a uma ou mais embarcações com sua cota e plano de uso semanal.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultBoatId = selectableBoats[0]?.id || '';
                      const nextFree = defaultBoatId ? findNextFreeCotaForBoat(defaultBoatId, clientBoats) : 'C1';
                      setClientBoats([...clientBoats, { embarcacaoId: defaultBoatId, cota: nextFree, plano: 'normal' }]);
                    }}
                    disabled={Boolean(isValeReadOnly)}
                    className="inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/70 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Adicionar Veículo
                  </button>
                </div>

                {/* Cards de Embarcações */}
                <div className="space-y-4">
                  {clientBoats.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      Nenhuma embarcação vinculada a este cliente. Clique em "Adicionar Veículo" acima.
                    </div>
                  )}

                  {clientBoats.map((cb, idx) => {
                    const selectedBoat = boats.find(b => b.id === cb.embarcacaoId);
                    const isLancha = selectedBoat?.tipo === 'lancha';

                    return (
                      <div key={idx} className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200/70 text-blue-700 text-xs font-semibold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-900">
                              {selectedBoat?.nome || `Embarcação #${idx + 1}`}
                            </span>
                          </div>

                          {clientBoats.length > 1 && !isValeReadOnly && (
                            <button
                              type="button"
                              onClick={() => setClientBoats(clientBoats.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors cursor-pointer"
                              title="Remover esta embarcação"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Seleção da Embarcação */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">
                            Embarcação *
                          </label>
                          <select
                            value={cb.embarcacaoId}
                            disabled={Boolean(isValeReadOnly)}
                            onChange={(e) => {
                              const newBoatId = e.target.value;
                              const nextFree = newBoatId ? findNextFreeCotaForBoat(newBoatId, clientBoats, idx) : '';
                              const newList = [...clientBoats];
                              newList[idx].embarcacaoId = newBoatId;
                              newList[idx].cota = nextFree;
                              setClientBoats(newList);
                            }}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                          >
                            <option value="">Selecione uma embarcação...</option>
                            {[...selectableBoats].sort((a, b) => a.nome.localeCompare(b.nome)).map(b => (
                              <option key={b.id} value={b.id}>
                                {b.nome} ({b.tipo === 'jet' ? 'Jet Ski' : 'Lancha'})
                              </option>
                            ))}
                          </select>
                          {selectableBoats.length === 0 && (
                            <p className="text-[11px] text-amber-700 mt-1">
                              Nenhuma embarcação vinculada à Marina Club encontrada.
                            </p>
                          )}
                        </div>

                        {/* Seleção Padronizada da Cota (C1..CN) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-medium text-slate-700">
                              Identificação da Cota Padronizada *
                            </label>
                            <span className="text-[10px] text-slate-400">
                              {cb.embarcacaoId ? 'Clique em uma cota disponível' : 'Selecione uma embarcação primeiro'}
                            </span>
                          </div>

                          {!cb.embarcacaoId ? (
                            <div className="p-3 bg-slate-100/60 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                              Escolha uma embarcação acima para visualizar as cotas disponíveis.
                            </div>
                          ) : (
                            (() => {
                              const boatObj = boats.find(b => b.id === cb.embarcacaoId);
                              const occMap = getBoatCotaOccupancyMap(cb.embarcacaoId, otherClients, boatObj);
                              const currentNorm = normalizeCotaCode(cb.cota, idx + 1);
                              const currentSlotNum = parseInt(currentNorm.replace(/\D/g, ''), 10) || 0;
                              const neededTotal = Math.max(occMap.size, currentSlotNum);
                              const slots = getBoatCotasList(boatObj, neededTotal);

                              return (
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                                  {slots.map(slot => {
                                    const occ = occMap.get(slot);
                                    const occupiedByOtherClient = !!(occ && occ.clienteId !== editingClient?.id);
                                    const usedInOtherRow = clientBoats.some(
                                      (other, otherIdx) =>
                                        otherIdx !== idx &&
                                        other.embarcacaoId &&
                                        other.embarcacaoId === cb.embarcacaoId &&
                                        normalizeCotaCode(other.cota, otherIdx + 1) === slot
                                    );
                                    const isSelected = currentNorm === slot;
                                    const isDisabled = Boolean(isValeReadOnly) || occupiedByOtherClient || usedInOtherRow;

                                    return (
                                      <button
                                        key={slot}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => {
                                          const newList = [...clientBoats];
                                          newList[idx].cota = slot;
                                          setClientBoats(newList);
                                        }}
                                        title={
                                          occupiedByOtherClient
                                            ? `Ocupada por ${occ?.clienteNome}`
                                            : usedInOtherRow
                                            ? 'Já selecionada em outra cota deste cliente'
                                            : `Selecionar cota ${slot}`
                                        }
                                        className={`py-2 px-1.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all tabular-nums ${
                                          isSelected
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20 cursor-pointer'
                                            : isDisabled
                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50/60 hover:border-blue-300 cursor-pointer'
                                        }`}
                                      >
                                        <span className="font-mono">{slot}</span>
                                        <span
                                          className={`text-[9px] font-medium truncate max-w-full ${
                                            isSelected
                                              ? 'text-blue-100'
                                              : isDisabled
                                              ? 'text-slate-400'
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
                            })()
                          )}
                        </div>

                        {/* Plano de Acesso Semanal */}
                        <div className="pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-800">
                              Plano Semanal de Acesso
                            </label>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Define se o cotista tem permissão para navegar nas segundas e terças-feiras
                            </p>
                          </div>

                          <div className="inline-flex p-1 bg-slate-200/70 rounded-xl shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const newList = [...clientBoats];
                                newList[idx].plano = 'normal';
                                setClientBoats(newList);
                              }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                                (cb.plano || 'normal') === 'normal'
                                  ? 'bg-white text-slate-800 shadow-2xs border border-slate-200 font-semibold'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Padrão (Qua a Dom)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newList = [...clientBoats];
                                newList[idx].plano = 'completo';
                                setClientBoats(newList);
                              }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                                cb.plano === 'completo'
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs font-semibold'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Completo (+ Seg/Ter)
                            </button>
                          </div>
                        </div>

                        {/* Acessórios da Cota (apenas para lanchas) */}
                        {isLancha && (
                          <div className="pt-3 border-t border-slate-200/70 space-y-2.5">
                            <label className="block text-xs font-medium text-slate-800">
                              Acessórios Vinculados a esta Cota
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                { key: 'tenda', label: 'Tenda' },
                                { key: 'mesa', label: 'Mesa' },
                                { key: 'bancosCadeiras', label: 'Bancos' },
                                { key: 'churrasqueira', label: 'Churrasqueira' }
                              ].map(item => (
                                <label key={item.key} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={(cb.acessorios as any)?.[item.key] || false}
                                    onChange={(e) => {
                                      const newList = [...clientBoats];
                                      if (!newList[idx].acessorios) newList[idx].acessorios = {};
                                      (newList[idx].acessorios as any)[item.key] = e.target.checked;
                                      setClientBoats(newList);
                                    }}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span className="font-normal">{item.label}</span>
                                </label>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={cb.acessorios?.observacoes || ''}
                              onChange={(e) => {
                                const newList = [...clientBoats];
                                if (!newList[idx].acessorios) newList[idx].acessorios = {};
                                newList[idx].acessorios!.observacoes = e.target.value;
                                setClientBoats(newList);
                              }}
                              placeholder="Observações complementares dos acessórios desta cota..."
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Empresas Vinculadas */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Empresas e Unidades *</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isMarinaUser
                        ? 'O usuário da Marina gerencia exclusivamente clientes vinculados à Marina Club.'
                        : 'Defina onde este cliente poderá ser visualizado e operado na plataforma.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Marina Club */}
                    <div
                      onClick={() => {
                        if (isMarinaUser) {
                          showToast('O cotista cadastrado na Marina deve obrigatoriamente manter o vínculo com a Marina Club.', 'info');
                          return;
                        }
                        if (!empresas.includes('MARINA')) {
                          setEmpresas([...empresas, 'MARINA']);
                        } else {
                          if (empresas.length === 1) {
                            showToast('O cliente precisa estar vinculado a pelo menos 1 empresa.', 'error');
                            return;
                          }
                          setEmpresas(empresas.filter(x => x !== 'MARINA'));
                        }
                      }}
                      className="p-4 rounded-xl border border-blue-200/90 bg-blue-50/40 text-blue-950 shadow-2xs flex items-start gap-3 select-none cursor-pointer hover:border-blue-300 transition-colors"
                    >
                      <div className="w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 bg-blue-600 border border-blue-600 text-white">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-semibold leading-tight text-blue-950">
                            <Ship className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                            <span>Marina Club</span>
                          </div>
                          {isMarinaUser && (
                            <span className="text-[10px] text-blue-700 bg-blue-100/80 border border-blue-200/90 px-2 py-0.5 rounded-full font-bold">
                              Obrigatório
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-blue-900/70 font-normal mt-1 leading-snug">
                          Controle de vagas, hangar e serviços de marina
                        </p>
                      </div>
                    </div>

                    {/* Vale Administradora */}
                    {isMarinaUser ? (
                      <div
                        onClick={() => {
                          showToast('Usuários da Marina não têm permissão para vincular ou alterar clientes da Vale Administradora.', 'error');
                        }}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 text-slate-400 opacity-60 flex items-start gap-3 select-none cursor-not-allowed"
                        title="Vínculo exclusivo para administradores da Vale"
                      >
                        <div className="w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 bg-slate-100 border border-slate-300 text-slate-400">
                          <Lock className="w-2.5 h-2.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold leading-tight text-slate-500">
                              <Building2 className="w-3.5 h-3.5 shrink-0 opacity-50" />
                              <span>Vale Administradora</span>
                            </div>
                            <span className="text-[10px] text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                              Bloqueado
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-normal mt-1 leading-snug">
                            Gestão restrita aos administradores da Vale
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          const isChecked = empresas.includes('VALE');
                          if (!isChecked) {
                            setEmpresas([...empresas, 'VALE']);
                          } else {
                            if (empresas.length === 1) {
                              showToast('O cliente precisa estar vinculado a pelo menos 1 empresa.', 'error');
                              return;
                            }
                            setEmpresas(empresas.filter(x => x !== 'VALE'));
                          }
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                          empresas.includes('VALE')
                            ? 'border-slate-900 bg-slate-50/70 text-slate-900 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 border transition-all ${
                            empresas.includes('VALE')
                              ? 'bg-slate-900 border-slate-900 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {empresas.includes('VALE') && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold leading-tight">
                            <Building2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            <span>Vale Administradora</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-normal mt-1 leading-snug">
                            Gestão náutica principal e controle de cotas
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* PARTE 3: DOCUMENTAÇÃO NÁUTICA, ENDEREÇO & NOTAS                */}
            {/* ============================================================== */}
            {activeTab === 'documentos' && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                
                {/* Habilitação Naval e Documento */}
                <div className="space-y-4">
                  <div className="pb-1 border-b border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Habilitação Náutica & Documentos
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Registro de habilitação amador (CHA) emitido pela Capitania dos Portos e documento civil.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Nº da Habilitação (Arrais / CHA)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 381M2021005"
                        value={numeroHabilitacao}
                        onChange={(e) => setNumeroHabilitacao(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Categoria da CHA
                      </label>
                      <select
                        value={categoriaHabilitacao}
                        onChange={(e) => setCategoriaHabilitacao(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Validade da Habilitação
                      </label>
                      <input
                        type="date"
                        value={validadeHabilitacao}
                        onChange={(e) => setValidadeHabilitacao(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Capitania / Órgão Emissor CHA
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Capitania Fluvial de Juazeiro"
                        value={orgaoEmissorHabilitacao}
                        onChange={(e) => setOrgaoEmissorHabilitacao(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Número do RG
                      </label>
                      <input
                        type="text"
                        placeholder="12.345.678-9"
                        value={rg}
                        onChange={(e) => setRg(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Órgão Emissor do RG
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: SSP/BA"
                        value={orgaoEmissor}
                        onChange={(e) => setOrgaoEmissor(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Endereço Residencial */}
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="pb-1">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Endereço Residencial
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Endereço cadastrado para envio de correspondências e faturas.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 relative">
                      <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                        <span>CEP</span>
                        {isFetchingCep && <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />}
                      </label>
                      <input
                        id="input-client-cep"
                        type="text"
                        placeholder="00000-000"
                        value={cep}
                        onChange={handleCepChange}
                        onBlur={handleCepBlur}
                        maxLength={9}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={isFetchingCep || cep.replace(/\D/g, '').length !== 8}
                        onClick={() => fetchCep(cep.replace(/\D/g, ''))}
                        className="w-full py-2 text-xs font-semibold text-center bg-blue-50/80 hover:bg-blue-100 text-blue-700 disabled:opacity-40 disabled:hover:bg-blue-50/80 rounded-xl border border-blue-200/80 transition-colors h-[38px] cursor-pointer shadow-2xs"
                      >
                        Buscar CEP
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Logradouro (Rua / Avenida)
                    </label>
                    <input
                      id="input-client-logradouro"
                      type="text"
                      placeholder="Ex: Avenida Beira Mar"
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Número
                      </label>
                      <input
                        id="input-client-numero-end"
                        type="text"
                        placeholder="100"
                        value={numeroEnd}
                        onChange={(e) => setNumeroEnd(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Complemento
                      </label>
                      <input
                        id="input-client-complemento"
                        type="text"
                        placeholder="Ex: Apto 302, Bloco B"
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Bairro
                      </label>
                      <input
                        id="input-client-bairro"
                        type="text"
                        placeholder="Bairro"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Cidade
                      </label>
                      <input
                        id="input-client-cidade"
                        type="text"
                        placeholder="Cidade"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Estado (UF)
                      </label>
                      <input
                        id="input-client-estado"
                        type="text"
                        placeholder="UF"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                        maxLength={2}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 uppercase focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Observações Financeiras & Administrativas */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <label className="block text-xs font-medium text-slate-800">
                    Observações Administrativas & Financeiras
                  </label>
                  <textarea
                    placeholder="Anotações internas sobre acordos, mensalidades ou particularidades do cotista..."
                    value={observacoesFinanceiras}
                    onChange={(e) => setObservacoesFinanceiras(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rodapé com Ações de Navegação e Salvamento */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/60 shrink-0">
            <button
              id="cancel-save-client"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2.5">
              {activeTab !== 'dados' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'documentos') setActiveTab('veiculos');
                    else if (activeTab === 'veiculos') setActiveTab('dados');
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                  Voltar
                </button>
              )}

              {activeTab !== 'documentos' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'dados') {
                      if (!name.trim()) {
                        showToast('Preencha o nome do cliente antes de prosseguir.', 'error');
                        return;
                      }
                      setActiveTab('veiculos');
                    } else if (activeTab === 'veiculos') {
                      setActiveTab('documentos');
                    }
                  }}
                  className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                >
                  <span>Próxima Etapa</span>
                  <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                </button>
              )}

              <button
                id="submit-save-client"
                type="submit"
                disabled={Boolean(isValeReadOnly)}
                className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5 active:scale-95 ${
                  isValeReadOnly
                    ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-75'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isValeReadOnly ? 'Somente Leitura' : editingId ? 'Salvar Alterações' : 'Salvar Cadastro'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
