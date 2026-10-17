import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, CheckCircle, XCircle, Trash2, Building, GripHorizontal,
  Building2, User, Landmark, Layers, Briefcase, AlertCircle, Save, X
} from 'lucide-react';
import { CentroDeCusto } from "../../types";

interface ContaBancaria {
  id?: string;
  nome: string;
  empresa: string;
  banco: string;
  agencia: string;
  conta: string;
  saldoInicial?: number;
  status: 'ativo' | 'inativo';
  asaasWalletId?: string;
  asaasSplitAtivo?: boolean;
  asaasSplitTipo?: 'PERCENTAGE' | 'FIXED';
  asaasSplitValor?: number;
  isContaPrincipalAsaas?: boolean;
}

interface PlanoDeConta {
  id?: string;
  codigoContabil: string;
  descricao: string;
  tipo: 'receita' | 'despesa';
  empresa: string;
  status: 'ativo' | 'inativo';
}

interface Fornecedor {
  id?: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpjCpf: string;
  empresaId: string;
  dadosBancarios: string;
  status: 'ativo' | 'inativo';
}

export default function FinanceConfig({
  isAdmin,
  isFinanceiro,
  empresa
}: {
  isAdmin: boolean;
  isFinanceiro: boolean;
  empresa: string;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'contas_bancarias' | 'planos_contas' | 'centros_custo' | 'fornecedores' | 'configuracoes_gerais'>('contas_bancarias');

  // Data States
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [planosContas, setPlanosContas] = useState<PlanoDeConta[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroDeCusto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [allContasBancarias, setAllContasBancarias] = useState<ContaBancaria[]>([]);
  const [allPlanosContas, setAllPlanosContas] = useState<PlanoDeConta[]>([]);
  const [allCentrosCusto, setAllCentrosCusto] = useState<CentroDeCusto[]>([]);
  const [globalConfig, setGlobalConfig] = useState<{
    taxaJurosMensal: string;
    taxaMultaAtraso?: string;
    asaasContaBancariaId?: string;
    fin_asaas_split_enabled?: boolean;
    diasFaturaAtual?: string;
    billingTypePadrao?: string;
    registrarTaxaGateway?: boolean;
    vendaPadraoEmpresa?: string;
    vendaPadraoPlanoContasId?: string;
    vendaPadraoCentroCustoId?: string;
    vendaPadraoContaBancariaId?: string;
    vendaPadraoCategoria?: string;
    taxaAdmPadraoEmpresa?: string;
    taxaAdmPadraoPlanoContasId?: string;
    taxaAdmPadraoCentroCustoId?: string;
    taxaAdmPadraoContaBancariaId?: string;
    taxaAdmPadraoCategoria?: string;
    taxaAdmPadraoValor?: string;
  }>({
    taxaJurosMensal: "2.2",
    taxaMultaAtraso: "2.0",
    asaasContaBancariaId: "",
    fin_asaas_split_enabled: false,
    diasFaturaAtual: "30",
    billingTypePadrao: "PIX",
    registrarTaxaGateway: true,
    vendaPadraoEmpresa: "Mexicano",
    vendaPadraoPlanoContasId: "",
    vendaPadraoCentroCustoId: "",
    vendaPadraoContaBancariaId: "",
    vendaPadraoCategoria: "Venda de Cota",
    taxaAdmPadraoEmpresa: "Vale Administradora",
    taxaAdmPadraoPlanoContasId: "",
    taxaAdmPadraoCentroCustoId: "",
    taxaAdmPadraoContaBancariaId: "",
    taxaAdmPadraoCategoria: "Taxa de Administração",
    taxaAdmPadraoValor: "850.00"
  });
  const [loading, setLoading] = useState(false);

  // Modals / Form State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Edit items
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);
  const [editingPlano, setEditingPlano] = useState<PlanoDeConta | null>(null);
  const [editingCentro, setEditingCentro] = useState<CentroDeCusto | null>(null);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);

  // Form States
  const [contaForm, setContaForm] = useState<Partial<ContaBancaria>>({
    nome: '',
    empresa: empresa && empresa !== 'Todos' ? empresa : 'Marina Velho Chico',
    banco: '',
    agencia: '',
    conta: '',
    saldoInicial: 0,
    status: 'ativo',
    asaasWalletId: '',
    asaasSplitAtivo: false,
    asaasSplitTipo: 'PERCENTAGE',
    asaasSplitValor: 100,
    isContaPrincipalAsaas: false
  });

  const [centroForm, setCentroForm] = useState<Partial<CentroDeCusto>>({
    nome: '',
    empresa: empresa && empresa !== 'Todos' ? empresa : 'Marina Velho Chico',
    status: 'ativo'
  });

  const [planoForm, setPlanoForm] = useState<Partial<PlanoDeConta>>({
    codigoContabil: '',
    descricao: '',
    tipo: 'despesa',
    empresa: empresa && empresa !== 'Todos' ? empresa : 'Todos',
    status: 'ativo'
  });

  const [fornecedorForm, setFornecedorForm] = useState<Partial<Fornecedor>>({
    nomeFantasia: '',
    razaoSocial: '',
    cnpjCpf: '',
    empresaId: empresa && empresa !== 'Todos' ? empresa : 'Marina Velho Chico',
    dadosBancarios: '',
    status: 'ativo'
  });

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };


  const handleSaveCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingCentro?.id ? { id: editingCentro.id } : {}),
        ...centroForm
      };
      const res = await fetch('/api/financeiro/centros-custo/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          action: 'upsert',
          data: payload
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        alert('Erro ao salvar registro');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao comunicar com o servidor');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = empresa && empresa !== 'Todos' ? `?empresa=${encodeURIComponent(empresa)}` : '';

      const [resContas, resPlanos, resFornecedores, resCentros, resConfig, resAllContas, resAllPlanos, resAllCentros] = await Promise.all([
        fetch(`/api/financeiro/contas-bancarias${q}`, { credentials: 'include', headers: getAuthHeader() }),
        fetch(`/api/financeiro/planos-contas${q}`, { credentials: 'include', headers: getAuthHeader() }),
        fetch(`/api/financeiro/fornecedores${q}`, { credentials: 'include', headers: getAuthHeader() }),
        fetch(`/api/financeiro/centros-custo${q}`, { credentials: 'include', headers: getAuthHeader() }),
        fetch(`/api/financeiro/configuracoes`, { credentials: 'include', headers: getAuthHeader() }),
        fetch(`/api/financeiro/contas-bancarias?empresa=Todos`, { credentials: 'include', headers: getAuthHeader() }),
        fetch(`/api/financeiro/planos-contas?empresa=Todos`, { credentials: 'include', headers: getAuthHeader() }),
        fetch(`/api/financeiro/centros-custo?empresa=Todos`, { credentials: 'include', headers: getAuthHeader() })
      ]);

      if (resConfig.ok) {
        const { configuracoes } = await resConfig.json();
        if (configuracoes) {
          setGlobalConfig(prev => ({
            ...prev,
            ...configuracoes
          }));
        }
      }

      if (resContas.ok) {
        const data = await resContas.json();
        setContasBancarias(data);
      }
      if (resPlanos.ok) {
        const data = await resPlanos.json();
        setPlanosContas(data);
      }
      if (resFornecedores.ok) {
        const data = await resFornecedores.json();
        setFornecedores(data);
      }
      if (resCentros.ok) {
        const data = await resCentros.json();
        setCentrosCusto(data);
      }
      if (resAllContas.ok) {
        const data = await resAllContas.json();
        setAllContasBancarias(Array.isArray(data) ? data : []);
      }
      if (resAllPlanos.ok) {
        const data = await resAllPlanos.json();
        setAllPlanosContas(Array.isArray(data) ? data : []);
      }
      if (resAllCentros.ok) {
        const data = await resAllCentros.json();
        setAllCentrosCusto(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao buscar dados das configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [empresa]);

  const handleOpenCreateModal = () => {
    if (activeSubTab === 'contas_bancarias') {
      setEditingConta(null);
      setContaForm({
        nome: '',
        empresa: empresa && empresa !== 'Todos' ? empresa : 'Marina Velho Chico',
        banco: '',
        agencia: '',
        conta: '',
        saldoInicial: 0,
        status: 'ativo',
        asaasWalletId: '',
        asaasSplitAtivo: false,
        asaasSplitTipo: 'PERCENTAGE',
        asaasSplitValor: 100,
        isContaPrincipalAsaas: false
      });
    } else if (activeSubTab === 'planos_contas') {
      setEditingPlano(null);
      setPlanoForm({
        codigoContabil: '',
        descricao: '',
        tipo: 'despesa',
        empresa: empresa && empresa !== 'Todos' ? empresa : 'Todos',
        status: 'ativo'
      });
    } else if (activeSubTab === 'centros_custo') {
      setEditingCentro(null);
      setCentroForm({
        nome: '',
        empresa: empresa && empresa !== 'Todos' ? empresa : 'Marina Velho Chico',
        status: 'ativo'
      });
    } else {
      setEditingFornecedor(null);
      setFornecedorForm({
        nomeFantasia: '',
        razaoSocial: '',
        cnpjCpf: '',
        empresaId: empresa && empresa !== 'Todos' ? empresa : 'Marina Velho Chico',
        dadosBancarios: '',
        status: 'ativo'
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenEditConta = (conta: ContaBancaria) => {
    setEditingConta(conta);
    setContaForm({
      ...conta,
      asaasWalletId: conta.asaasWalletId || '',
      asaasSplitAtivo: conta.asaasSplitAtivo !== undefined ? Boolean(conta.asaasSplitAtivo) : Boolean(conta.asaasWalletId),
      asaasSplitTipo: conta.asaasSplitTipo || 'PERCENTAGE',
      asaasSplitValor: conta.asaasSplitValor !== undefined ? Number(conta.asaasSplitValor) : 100,
      isContaPrincipalAsaas: Boolean(conta.isContaPrincipalAsaas)
    });
    setIsModalOpen(true);
  };

  const handleOpenEditPlano = (plano: PlanoDeConta) => {
    setEditingPlano(plano);
    setPlanoForm({ ...plano });
    setIsModalOpen(true);
  };


  const handleOpenEditFornecedor = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setFornecedorForm({ ...fornecedor });
    setIsModalOpen(true);
  };

  const handleOpenEditCentro = (centro: CentroDeCusto) => {
    setEditingCentro(centro);
    setCentroForm({ ...centro });
    setIsModalOpen(true);
  };

  const handleDelete = async (type: 'contas-bancarias' | 'planos-contas' | 'centros-custo' | 'fornecedores', id: string) => {
    if (!confirm('Deseja realmente excluir este registro?')) return;
    try {
      const res = await fetch(`/api/financeiro/${type}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          action: 'delete',
          data: { id }
        })
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Erro ao excluir registro');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao comunicar com o servidor');
    }
  };

  const handleSaveConta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingConta?.id ? { id: editingConta.id } : {}),
        ...contaForm
      };
      const res = await fetch('/api/financeiro/contas-bancarias/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          action: 'upsert',
          data: payload
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        alert('Erro ao salvar conta bancária');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar dados');
    }
  };

  const handleSavePlano = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingPlano?.id ? { id: editingPlano.id } : {}),
        ...planoForm
      };
      const res = await fetch('/api/financeiro/planos-contas/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          action: 'upsert',
          data: payload
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        alert('Erro ao salvar plano de contas');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar dados');
    }
  };

  const handleSaveFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingFornecedor?.id ? { id: editingFornecedor.id } : {}),
        ...fornecedorForm
      };
      const res = await fetch('/api/financeiro/fornecedores/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          action: 'upsert',
          data: payload
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        alert('Erro ao salvar fornecedor');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar dados');
    }
  };

  const handleSaveGlobalConfig = async () => {
    try {
      const res = await fetch('/api/financeiro/configuracoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          taxaJurosMensal: parseFloat(globalConfig.taxaJurosMensal || '0'),
          taxaMultaAtraso: parseFloat(globalConfig.taxaMultaAtraso || '0'),
          asaasContaBancariaId: globalConfig.asaasContaBancariaId,
          fin_asaas_split_enabled: globalConfig.fin_asaas_split_enabled ? '1' : '0',
          diasFaturaAtual: parseInt(globalConfig.diasFaturaAtual || '30', 10) || 30,
          billingTypePadrao: globalConfig.billingTypePadrao || 'PIX',
          registrarTaxaGateway: globalConfig.registrarTaxaGateway !== false ? '1' : '0',
          vendaPadraoEmpresa: globalConfig.vendaPadraoEmpresa || 'Mexicano',
          vendaPadraoPlanoContasId: globalConfig.vendaPadraoPlanoContasId || '',
          vendaPadraoCentroCustoId: globalConfig.vendaPadraoCentroCustoId || '',
          vendaPadraoContaBancariaId: globalConfig.vendaPadraoContaBancariaId || '',
          vendaPadraoCategoria: globalConfig.vendaPadraoCategoria || 'Venda de Cota',
          taxaAdmPadraoEmpresa: globalConfig.taxaAdmPadraoEmpresa || 'Vale Administradora',
          taxaAdmPadraoPlanoContasId: globalConfig.taxaAdmPadraoPlanoContasId || '',
          taxaAdmPadraoCentroCustoId: globalConfig.taxaAdmPadraoCentroCustoId || '',
          taxaAdmPadraoContaBancariaId: globalConfig.taxaAdmPadraoContaBancariaId || '',
          taxaAdmPadraoCategoria: globalConfig.taxaAdmPadraoCategoria || 'Taxa de Administração',
          taxaAdmPadraoValor: globalConfig.taxaAdmPadraoValor || '850.00'
        })
      });
      if (res.ok) {
        alert('Configurações salvas com sucesso!');
        fetchData();
      } else {
        alert('Erro ao salvar configurações');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar configurações');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header Tabs & Actions */}
      <div className="bg-white border border-slate-100/80 p-5 rounded-[1.5rem] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl gap-1 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('contas_bancarias')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'contas_bancarias'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-4 h-4" />
            Contas Bancárias
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('planos_contas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'planos_contas'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Plano de Contas
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('centros_custo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'centros_custo'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Centros de Custo
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('fornecedores')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'fornecedores'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Fornecedores
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveSubTab('configuracoes_gerais')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeSubTab === 'configuracoes_gerais'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Configurações Gerais
            </button>
          )}
        </div>

        {activeSubTab !== 'configuracoes_gerais' && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {activeSubTab === 'contas_bancarias' && 'Nova Conta Bancária'}
              {activeSubTab === 'planos_contas' && 'Novo Plano de Contas'}
              {activeSubTab === 'centros_custo' && 'Novo Centro de Custo'}
              {activeSubTab === 'fornecedores' && 'Novo Fornecedor'}
            </span>
          </button>
        )}
      </div>

      {/* Main Table Content */}
      <div className="bg-white border border-slate-100/80 rounded-[1.5rem] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold animate-pulse">
            Carregando registros...
          </div>
        ) : (
          <>
            {/* SUBTAB 1: CONTAS BANCARIAS */}
            {activeSubTab === 'contas_bancarias' && (
              <div className="overflow-x-auto">
                {contasBancarias.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    Nenhuma conta bancária cadastrada.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Nome da Conta</th>
                        <th className="px-6 py-4">Banco</th>
                        <th className="px-6 py-4">Agência / Conta</th>
                        <th className="px-6 py-4">Empresa</th>
                        <th className="px-6 py-4">Integração Asaas / Split</th>
                        <th className="px-6 py-4 text-right">Saldo Inicial</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {contasBancarias.map((conta) => (
                        <tr key={conta.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{conta.nome}</td>
                          <td className="px-6 py-4 text-slate-600">{conta.banco}</td>
                          <td className="px-6 py-4 text-slate-600">
                            {conta.agencia} / {conta.conta}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {conta.empresa}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {conta.isContaPrincipalAsaas ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Conta Principal Asaas
                              </span>
                            ) : conta.asaasWalletId && conta.asaasSplitAtivo ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title={`Wallet: ${conta.asaasWalletId}`}
                              >
                                Split Ativo ({conta.asaasSplitTipo === 'FIXED' ? `R$ ${Number(conta.asaasSplitValor || 0).toFixed(2)}` : `${conta.asaasSplitValor ?? 100}%`})
                              </span>
                            ) : conta.asaasWalletId ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                                title={`Wallet: ${conta.asaasWalletId}`}
                              >
                                Split Desativado
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Sem vínculo</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-800">
                            R$ {(conta.saldoInicial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                conta.status === 'ativo'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                  conta.status === 'ativo' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              {conta.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditConta(conta)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => conta.id && handleDelete('contas-bancarias', conta.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* SUBTAB 2: PLANOS DE CONTAS */}
            {activeSubTab === 'planos_contas' && (
              <div className="overflow-x-auto">
                {planosContas.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    Nenhum plano de contas cadastrado.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Código Contábil</th>
                        <th className="px-6 py-4">Descrição</th>
                        <th className="px-6 py-4">Tipo</th>
                        <th className="px-6 py-4">Empresa</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {planosContas.map((plano) => (
                        <tr key={plano.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800 font-mono">
                            {plano.codigoContabil}
                          </td>
                          <td className="px-6 py-4 text-slate-700 font-semibold">{plano.descricao}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                plano.tipo === 'receita'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}
                            >
                              {plano.tipo === 'receita' ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {plano.empresa}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                plano.status === 'ativo'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                  plano.status === 'ativo' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              {plano.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPlano(plano)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => plano.id && handleDelete('planos-contas', plano.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* SUBTAB 3: FORNECEDORES */}
            
            {activeSubTab === 'centros_custo' && (
              <div className="overflow-x-auto">
                {centrosCusto.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    Nenhum Centro de Custo cadastrado.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">Empresa</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {centrosCusto.map((centro) => (
                        <tr key={centro.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{centro.nome}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {centro.empresa}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              centro.status === 'ativo' ? 'bg-emerald-100/50 text-emerald-700' : 'bg-rose-100/50 text-rose-700'
                            }`}>
                              {centro.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditCentro(centro)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete('centros-custo', centro.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeSubTab === 'fornecedores' && (
              <div className="overflow-x-auto">
                {fornecedores.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    Nenhum fornecedor cadastrado.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Nome Fantasia / Razão Social</th>
                        <th className="px-6 py-4">CNPJ / CPF</th>
                        <th className="px-6 py-4">Empresa</th>
                        <th className="px-6 py-4">Dados Bancários / PIX</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fornecedores.map((forn) => (
                        <tr key={forn.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{forn.nomeFantasia}</div>
                            <div className="text-[10px] text-slate-400">{forn.razaoSocial}</div>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600">{forn.cnpjCpf}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {forn.empresaId}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={forn.dadosBancarios}>
                            {forn.dadosBancarios || '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                forn.status === 'ativo'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                  forn.status === 'ativo' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              {forn.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditFornecedor(forn)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => forn.id && handleDelete('fornecedores', forn.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* SUBTAB 5: CONFIGURACOES GERAIS */}
            {activeSubTab === 'configuracoes_gerais' && (
              <div className="p-6">
                <div className="max-w-4xl bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-indigo-500" />
                    Parâmetros Globais do Financeiro & Comercial
                  </h3>

                  <div className="space-y-6">
                    {/* Card 1: Juros, Multa e Asaas */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Taxa de Juros Mensal Padrão (%)
                      </label>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        Esta taxa será utilizada como referência global para cálculo de juros e mora em operações financeiras e faturamentos em atraso que não possuam taxa específica configurada.
                      </p>
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Juros Mensal (%)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                value={globalConfig.taxaJurosMensal}
                                onChange={(e) => setGlobalConfig(prev => ({ ...prev, taxaJurosMensal: e.target.value }))}
                                className="pl-4 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all w-40"
                                placeholder="2.20"
                              />
                              <span className="absolute left-32 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Multa de Atraso Padrão (%)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                value={globalConfig.taxaMultaAtraso || ''}
                                onChange={(e) => setGlobalConfig(prev => ({ ...prev, taxaMultaAtraso: e.target.value }))}
                                className="pl-4 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all w-40"
                                placeholder="2.00"
                              />
                              <span className="absolute left-32 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Conta Bancária Padrão do Asaas (Fallback)
                            </label>
                            <select
                              value={globalConfig.asaasContaBancariaId || ''}
                              onChange={(e) => setGlobalConfig(prev => ({ ...prev, asaasContaBancariaId: e.target.value }))}
                              className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all w-full"
                            >
                              <option value="">-- Não Definida --</option>
                              {(allContasBancarias.length > 0 ? allContasBancarias : contasBancarias).map(c => (
                                <option key={c.id} value={c.id}>{c.nome} ({c.banco} - {c.empresa})</option>
                              ))}
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Usada quando o lançamento não tiver conta definida.
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Forma de Cobrança Padrão Asaas
                            </label>
                            <select
                              value={globalConfig.billingTypePadrao || 'PIX'}
                              onChange={(e) => setGlobalConfig(prev => ({ ...prev, billingTypePadrao: e.target.value }))}
                              className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all w-full"
                            >
                              <option value="PIX">PIX (QR Code + Copia e Cola)</option>
                              <option value="BOLETO">Boleto Bancário + PIX</option>
                              <option value="UNDEFINED">Link Completo (Cliente escolhe no Asaas)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Janela da "Fatura Atual" (Dias à frente)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={globalConfig.diasFaturaAtual || '30'}
                              onChange={(e) => setGlobalConfig(prev => ({ ...prev, diasFaturaAtual: e.target.value }))}
                              className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all w-full"
                              placeholder="30"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                              Filtra vencidos + próximos X dias na Fatura Atual do cliente.
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 mt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="block text-sm font-bold text-slate-700">
                              Chave Geral de Split Payment Asaas
                            </label>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Ativa ou desativa globalmente a divisão automática de pagamentos entre as contas bancárias configuradas com Wallet ID e Split Ativo.
                            </p>
                            <label className="relative inline-flex items-center cursor-pointer mt-1">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={globalConfig.fin_asaas_split_enabled || false}
                                onChange={(e) => setGlobalConfig(prev => ({ ...prev, fin_asaas_split_enabled: e.target.checked }))}
                              />
                              <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                              <span className="ml-3 text-xs font-bold text-slate-700">
                                {globalConfig.fin_asaas_split_enabled ? "Split Global Ativado" : "Split Global Desativado"}
                              </span>
                            </label>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="block text-sm font-bold text-slate-700">
                              Lançar Despesa Automática de Taxa Asaas
                            </label>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Quando ativado, o Webhook registra automaticamente uma despesa na categoria "Taxas Asaas" com a diferença entre valor bruto e líquido.
                            </p>
                            <label className="relative inline-flex items-center cursor-pointer mt-1">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={globalConfig.registrarTaxaGateway !== false}
                                onChange={(e) => setGlobalConfig(prev => ({ ...prev, registrarTaxaGateway: e.target.checked }))}
                              />
                              <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                              <span className="ml-3 text-xs font-bold text-slate-700">
                                {globalConfig.registrarTaxaGateway !== false ? "Registro de Taxa Ativado" : "Registro de Taxa Desativado"}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Configuração Padrão de Lançamento de Venda (Mexicano) */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">
                        Lançamento Padrão de Venda (Comercial → Mexicano)
                      </h4>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        Estes parâmetros são aplicados automaticamente aos lançamentos financeiros de <strong>Entrada</strong> e <strong>Parcelas de Cota</strong> gerados quando o Comercial registra uma nova venda.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Empresa Destino
                          </label>
                          <select
                            value={globalConfig.vendaPadraoEmpresa || 'Mexicano'}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, vendaPadraoEmpresa: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                          >
                            <option value="Mexicano">Mexicano</option>
                            <option value="Vale Administradora">Vale Administradora</option>
                            <option value="Marina Velho Chico">Marina Velho Chico</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Categoria Padrão
                          </label>
                          <input
                            type="text"
                            value={globalConfig.vendaPadraoCategoria || ''}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, vendaPadraoCategoria: e.target.value }))}
                            placeholder="Ex: Venda de Cota"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Plano de Contas (Receita)
                          </label>
                          <select
                            value={globalConfig.vendaPadraoPlanoContasId || ''}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, vendaPadraoPlanoContasId: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                          >
                            <option value="">-- Selecionar Plano de Contas --</option>
                            {(allPlanosContas.length > 0 ? allPlanosContas : planosContas)
                              .filter(p => p.status === 'ativo' && (p.empresa === 'Todos' || !globalConfig.vendaPadraoEmpresa || p.empresa === globalConfig.vendaPadraoEmpresa))
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.codigoContabil ? `${p.codigoContabil} - ` : ''}{p.descricao} ({p.tipo})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Centro de Custo Padrão
                          </label>
                          <select
                            value={globalConfig.vendaPadraoCentroCustoId || ''}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, vendaPadraoCentroCustoId: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                          >
                            <option value="">-- Selecionar Centro de Custo --</option>
                            {(allCentrosCusto.length > 0 ? allCentrosCusto : centrosCusto)
                              .filter(c => c.status === 'ativo' && (c.empresa === 'Todos' || !globalConfig.vendaPadraoEmpresa || c.empresa === globalConfig.vendaPadraoEmpresa))
                              .map(c => (
                                <option key={c.id} value={c.id}>{c.nome} ({c.empresa})</option>
                              ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Conta Bancária Padrão de Recebimento
                          </label>
                          <select
                            value={globalConfig.vendaPadraoContaBancariaId || ''}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, vendaPadraoContaBancariaId: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                          >
                            <option value="">-- Selecionar Conta Bancária --</option>
                            {(allContasBancarias.length > 0 ? allContasBancarias : contasBancarias)
                              .filter(cb => cb.status === 'ativo' && (!globalConfig.vendaPadraoEmpresa || cb.empresa === globalConfig.vendaPadraoEmpresa))
                              .map(cb => (
                                <option key={cb.id} value={cb.id}>{cb.nome} ({cb.banco} - {cb.empresa})</option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Configuração Padrão de Taxa de Administração */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">
                        Lançamento Padrão de Taxa de Administração (Opcional na Venda)
                      </h4>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        Parâmetros utilizados quando o Comercial opta por já gerar as parcelas mensais da Taxa de Administração no momento da venda.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Empresa Destino
                          </label>
                          <select
                            value={globalConfig.taxaAdmPadraoEmpresa || 'Vale Administradora'}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, taxaAdmPadraoEmpresa: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-400 outline-none transition-all"
                          >
                            <option value="Vale Administradora">Vale Administradora</option>
                            <option value="Mexicano">Mexicano</option>
                            <option value="Marina Velho Chico">Marina Velho Chico</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Valor Mensal Sugerido (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={globalConfig.taxaAdmPadraoValor || ''}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, taxaAdmPadraoValor: e.target.value }))}
                            placeholder="850.00"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-400 outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Categoria Padrão
                          </label>
                          <input
                            type="text"
                            value={globalConfig.taxaAdmPadraoCategoria || ''}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, taxaAdmPadraoCategoria: e.target.value }))}
                            placeholder="Ex: Taxa de Administração"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-400 outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Plano de Contas (Receita)
                          </label>
                          <select
                            value={globalConfig.taxaAdmPadraoPlanoContasId || ''}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, taxaAdmPadraoPlanoContasId: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-400 outline-none transition-all"
                          >
                            <option value="">-- Selecionar Plano de Contas --</option>
                            {(allPlanosContas.length > 0 ? allPlanosContas : planosContas)
                              .filter(p => p.status === 'ativo' && (p.empresa === 'Todos' || !globalConfig.taxaAdmPadraoEmpresa || p.empresa === globalConfig.taxaAdmPadraoEmpresa))
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.codigoContabil ? `${p.codigoContabil} - ` : ''}{p.descricao} ({p.tipo})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Centro de Custo Padrão
                          </label>
                          <select
                            value={globalConfig.taxaAdmPadraoCentroCustoId || ''}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, taxaAdmPadraoCentroCustoId: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-400 outline-none transition-all"
                          >
                            <option value="">-- Selecionar Centro de Custo --</option>
                            {(allCentrosCusto.length > 0 ? allCentrosCusto : centrosCusto)
                              .filter(c => c.status === 'ativo' && (c.empresa === 'Todos' || !globalConfig.taxaAdmPadraoEmpresa || c.empresa === globalConfig.taxaAdmPadraoEmpresa))
                              .map(c => (
                                <option key={c.id} value={c.id}>{c.nome} ({c.empresa})</option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Conta Bancária Padrão
                          </label>
                          <select
                            value={globalConfig.taxaAdmPadraoContaBancariaId || ''}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, taxaAdmPadraoContaBancariaId: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-400 outline-none transition-all"
                          >
                            <option value="">-- Selecionar Conta Bancária --</option>
                            {(allContasBancarias.length > 0 ? allContasBancarias : contasBancarias)
                              .filter(cb => cb.status === 'ativo' && (!globalConfig.taxaAdmPadraoEmpresa || cb.empresa === globalConfig.taxaAdmPadraoEmpresa))
                              .map(cb => (
                                <option key={cb.id} value={cb.id}>{cb.nome} ({cb.banco} - {cb.empresa})</option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-4">
                      <button
                        type="button"
                        onClick={handleSaveGlobalConfig}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-indigo-100 hover:shadow active:scale-95 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Salvar Todas as Configurações</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-lg">
                {activeSubTab === 'contas_bancarias' && (editingConta ? 'Editar Conta Bancária' : 'Nova Conta Bancária')}
                {activeSubTab === 'planos_contas' && (editingPlano ? 'Editar Plano de Contas' : 'Novo Plano de Contas')}
                {activeSubTab === 'centros_custo' && (editingCentro ? 'Editar Centro de Custo' : 'Novo Centro de Custo')}
                {activeSubTab === 'fornecedores' && (editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Forms */}
            <div className="p-6 overflow-y-auto flex-1">

              {/* FORM: CONTA BANCARIA */}
              {activeSubTab === 'contas_bancarias' && (
                <form id="form-conta" onSubmit={handleSaveConta} className="space-y-4 text-xs font-semibold text-slate-700">
                  <div>
                    <label className="block mb-1.5">Nome Identificador da Conta *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Itaú - Marina Principal"
                      value={contaForm.nome || ''}
                      onChange={(e) => setContaForm({ ...contaForm, nome: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5">Banco *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Banco Itaú (341)"
                        value={contaForm.banco || ''}
                        onChange={(e) => setContaForm({ ...contaForm, banco: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5">Empresa *</label>
                      <select
                        value={contaForm.empresa || 'Marina Velho Chico'}
                        onChange={(e) => setContaForm({ ...contaForm, empresa: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      >
                        <option value="Marina Velho Chico">Marina Velho Chico</option>
                        <option value="Vale Administradora">Vale Administradora</option>
                        <option value="Mexicano">Mexicano</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5">Agência *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 1234"
                        value={contaForm.agencia || ''}
                        onChange={(e) => setContaForm({ ...contaForm, agencia: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5">Conta com Dígito *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 56789-0"
                        value={contaForm.conta || ''}
                        onChange={(e) => setContaForm({ ...contaForm, conta: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5">Saldo Inicial (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={contaForm.saldoInicial !== undefined ? contaForm.saldoInicial : ''}
                        onChange={(e) => setContaForm({ ...contaForm, saldoInicial: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5">Status</label>
                      <select
                        value={contaForm.status || 'ativo'}
                        onChange={(e) => setContaForm({ ...contaForm, status: e.target.value as 'ativo' | 'inativo' })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>
                  </div>

                  {/* SEÇÃO CONFIGURÁVEL ASAAS & SPLIT */}
                  <div className="pt-3 mt-2 border-t border-slate-200 space-y-3 bg-slate-50/70 p-3.5 rounded-2xl border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900">Configuração Asaas & Split desta Conta</span>
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">100% Configurável</span>
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-xl bg-white border border-slate-200/80">
                      <input
                        type="checkbox"
                        checked={Boolean(contaForm.isContaPrincipalAsaas)}
                        onChange={(e) =>
                          setContaForm({
                            ...contaForm,
                            isContaPrincipalAsaas: e.target.checked,
                            ...(e.target.checked ? { asaasSplitAtivo: false } : {})
                          })
                        }
                        className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">
                          Esta é a Conta Principal (Emissora da API Key) no Asaas
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal leading-relaxed">
                          Marque se as cobranças são emitidas diretamente por esta conta no Asaas. A conta principal recebe o saldo líquido automaticamente sem precisar de regra de Split.
                        </span>
                      </div>
                    </label>

                    {!contaForm.isContaPrincipalAsaas && (
                      <div className="space-y-3 pt-1">
                        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl bg-white border border-slate-200/80">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800">Ativar Split Payment para esta Conta</span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              Direciona pagamentos vinculados a esta conta para a Wallet abaixo.
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(contaForm.asaasSplitAtivo)}
                            onChange={(e) => setContaForm({ ...contaForm, asaasSplitAtivo: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </label>

                        <div>
                          <label className="block mb-1 flex items-center gap-2 text-slate-700">
                            Wallet ID no Asaas
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: f5c4d1b2-... (ID da Carteira Asaas desta conta)"
                            value={contaForm.asaasWalletId || ''}
                            onChange={(e) =>
                              setContaForm({
                                ...contaForm,
                                asaasWalletId: e.target.value,
                                ...(e.target.value.trim() && contaForm.asaasSplitAtivo === undefined
                                  ? { asaasSplitAtivo: true }
                                  : {})
                              })
                            }
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal font-mono text-[11px]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block mb-1 text-slate-700">Tipo de Repasse (Split)</label>
                            <select
                              value={contaForm.asaasSplitTipo || 'PERCENTAGE'}
                              onChange={(e) =>
                                setContaForm({
                                  ...contaForm,
                                  asaasSplitTipo: e.target.value as 'PERCENTAGE' | 'FIXED'
                                })
                              }
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                            >
                              <option value="PERCENTAGE">Percentual (%)</option>
                              <option value="FIXED">Valor Fixo (R$)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block mb-1 text-slate-700">
                              {contaForm.asaasSplitTipo === 'FIXED' ? 'Valor Fixo (R$)' : 'Percentual do Split (%)'}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={contaForm.asaasSplitTipo === 'FIXED' ? undefined : '100'}
                              value={contaForm.asaasSplitValor !== undefined ? contaForm.asaasSplitValor : 100}
                              onChange={(e) =>
                                setContaForm({
                                  ...contaForm,
                                  asaasSplitValor: parseFloat(e.target.value) || 0
                                })
                              }
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              )}

              {/* FORM: PLANO DE CONTAS */}
              {activeSubTab === 'planos_contas' && (
                <form id="form-plano" onSubmit={handleSavePlano} className="space-y-4 text-xs font-semibold text-slate-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5">Código Contábil *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 1.01.001"
                        value={planoForm.codigoContabil || ''}
                        onChange={(e) => setPlanoForm({ ...planoForm, codigoContabil: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5">Tipo *</label>
                      <select
                        value={planoForm.tipo || 'despesa'}
                        onChange={(e) => setPlanoForm({ ...planoForm, tipo: e.target.value as 'receita' | 'despesa' })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      >
                        <option value="despesa">Despesa</option>
                        <option value="receita">Receita</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5">Descrição / Categoria *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Manutenção de Motores e Peças"
                      value={planoForm.descricao || ''}
                      onChange={(e) => setPlanoForm({ ...planoForm, descricao: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5">Empresa</label>
                      <select
                        value={planoForm.empresa || 'Todos'}
                        onChange={(e) => setPlanoForm({ ...planoForm, empresa: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      >
                        <option value="Todos">Todas as Empresas</option>
                        <option value="Marina Velho Chico">Marina Velho Chico</option>
                        <option value="Vale Administradora">Vale Administradora</option>
                        <option value="Mexicano">Mexicano</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1.5">Status</label>
                      <select
                        value={planoForm.status || 'ativo'}
                        onChange={(e) => setPlanoForm({ ...planoForm, status: e.target.value as 'ativo' | 'inativo' })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>
                  </div>
                </form>
              )}

              {/* FORM: FORNECEDORES */}
              
              {activeSubTab === 'centros_custo' && (
                <form id="form-centro" onSubmit={handleSaveCentro} className="space-y-4 text-xs font-semibold text-slate-700">
                  <div>
                    <label className="block mb-1.5">Nome do Centro de Custo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Comercial, Manutenção, Combustível, etc."
                      value={centroForm.nome || ''}
                      onChange={(e) => setCentroForm({ ...centroForm, nome: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5">Empresa *</label>
                      <select
                        required
                        value={centroForm.empresa || 'Marina Velho Chico'}
                        onChange={(e) => setCentroForm({ ...centroForm, empresa: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      >
                        <option value="Marina Velho Chico">Marina Velho Chico</option>
                        <option value="Vale Administradora">Vale Administradora</option>
                        <option value="Mexicano">Mexicano</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1.5">Status *</label>
                      <select
                        required
                        value={centroForm.status || 'ativo'}
                        onChange={(e) => setCentroForm({ ...centroForm, status: e.target.value as 'ativo'|'inativo' })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>
                  </div>
                </form>
              )}

              {activeSubTab === 'fornecedores' && (
                <form id="form-fornecedor" onSubmit={handleSaveFornecedor} className="space-y-4 text-xs font-semibold text-slate-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5">Nome Fantasia *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Posto Marina Náutica"
                        value={fornecedorForm.nomeFantasia || ''}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, nomeFantasia: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5">Razão Social</label>
                      <input
                        type="text"
                        placeholder="Ex: Posto Marina Comercio de Combustiveis LTDA"
                        value={fornecedorForm.razaoSocial || ''}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, razaoSocial: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5">CNPJ / CPF *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 00.000.000/0001-00"
                        value={fornecedorForm.cnpjCpf || ''}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, cnpjCpf: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5">Empresa *</label>
                      <select
                        value={fornecedorForm.empresaId || 'Marina Velho Chico'}
                        onChange={(e) => setFornecedorForm({ ...fornecedorForm, empresaId: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                      >
                        <option value="Marina Velho Chico">Marina Velho Chico</option>
                        <option value="Vale Administradora">Vale Administradora</option>
                        <option value="Mexicano">Mexicano</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5">Dados Bancários / Chave PIX</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Banco Itaú Ag 1234 CC 5678-9 / Chave PIX: financeiro@fornecedor.com.br"
                      value={fornecedorForm.dadosBancarios || ''}
                      onChange={(e) => setFornecedorForm({ ...fornecedorForm, dadosBancarios: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal resize-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5">Status</label>
                    <select
                      value={fornecedorForm.status || 'ativo'}
                      onChange={(e) => setFornecedorForm({ ...fornecedorForm, status: e.target.value as 'ativo' | 'inativo' })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-normal"
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                </form>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form={
                  activeSubTab === 'contas_bancarias' ? 'form-conta' : activeSubTab === 'planos_contas' ? 'form-plano' : activeSubTab === 'centros_custo' ? 'form-centro' : 'form-fornecedor'
                }
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-200 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
