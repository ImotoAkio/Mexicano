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
  const [activeSubTab, setActiveSubTab] = useState<'contas_bancarias' | 'planos_contas' | 'centros_custo' | 'fornecedores'>('contas_bancarias');

  // Data States
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [planosContas, setPlanosContas] = useState<PlanoDeConta[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroDeCusto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [globalConfig, setGlobalConfig] = useState<{ taxaJurosMensal: string }>({ taxaJurosMensal: "2.2" });
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
    status: 'ativo'
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

      const [resContas, resPlanos, resFornecedores, resCentros, resConfig] = await Promise.all([
        fetch(`/api/financeiro/contas-bancarias${q}`, { credentials: 'include', headers: getAuthHeader() }),
        fetch(`/api/financeiro/planos-contas${q}`, { credentials: 'include', headers: getAuthHeader() }),
        fetch(`/api/financeiro/fornecedores${q}`, { credentials: 'include', headers: getAuthHeader() }),
        fetch(`/api/financeiro/centros-custo${q}`, { credentials: 'include', headers: getAuthHeader() }),
        fetch(`/api/financeiro/configuracoes`, { credentials: 'include', headers: getAuthHeader() })
      ]);

      if (resConfig.ok) {
        const { configuracoes } = await resConfig.json();
        if (configuracoes) setGlobalConfig(configuracoes);
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
        status: 'ativo'
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
    setContaForm({ ...conta });
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
        </div>

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
