import React, { useState, useEffect, useMemo } from 'react';
import {
  XCircle,
  Building2,
  Plus,
  Save,
  Trash2,
  Edit2,
  Search,
  Check,
  AlertCircle,
  X,
  CreditCard,
  FileText
} from 'lucide-react';
import { Fornecedor } from '../../types';
import { fornecedorDB, getAdminToken } from '../../db';

interface FornecedoresModalProps {
  onClose: () => void;
  onSelect?: (fornecedor: Fornecedor) => void;
  selectedId?: string;
  onRefresh?: () => void;
  initialEditFornecedorId?: string;
}

export default function FornecedoresModal({
  onClose,
  onSelect,
  selectedId,
  onRefresh,
  initialEditFornecedorId
}: FornecedoresModalProps) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => fornecedorDB.getAll());
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<Fornecedor>>({
    nomeFantasia: '',
    razaoSocial: '',
    cnpjCpf: '',
    empresaId: 'Vale Administradora',
    dadosBancarios: '',
    status: 'ativo'
  });

  const fetchFornecedores = async () => {
    try {
      setLoading(true);
      const token = getAdminToken();
      const res = await fetch('/api/financeiro/fornecedores', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setFornecedores(data);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar fornecedores da API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFornecedores();
  }, []);

  useEffect(() => {
    if (initialEditFornecedorId && fornecedores.length > 0) {
      const match = fornecedores.find(f => f.id === initialEditFornecedorId);
      if (match) {
        handleEdit(match);
      }
    }
  }, [initialEditFornecedorId, fornecedores]);

  const handleEdit = (forn: Fornecedor) => {
    setFormData({
      id: forn.id,
      nomeFantasia: forn.nomeFantasia || '',
      razaoSocial: forn.razaoSocial || '',
      cnpjCpf: forn.cnpjCpf || '',
      empresaId: forn.empresaId || 'Vale Administradora',
      dadosBancarios: typeof forn.dadosBancarios === 'string'
        ? forn.dadosBancarios
        : (forn.dadosBancarios ? JSON.stringify(forn.dadosBancarios) : ''),
      status: forn.status || 'ativo'
    });
    setEditingId(forn.id);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData({
      nomeFantasia: '',
      razaoSocial: '',
      cnpjCpf: '',
      empresaId: 'Vale Administradora',
      dadosBancarios: '',
      status: 'ativo'
    });
    setEditingId(null);
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomeFantasia?.trim()) {
      alert('O Nome Fantasia / Oficina é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      let savedItem: Fornecedor;
      if (isEditing && editingId) {
        savedItem = await fornecedorDB.update(editingId, {
          ...formData,
          nomeFantasia: formData.nomeFantasia.trim()
        });
      } else {
        savedItem = await fornecedorDB.create({
          ...formData,
          nomeFantasia: formData.nomeFantasia.trim()
        });
      }

      await fetchFornecedores();
      handleCancelEdit();
      if (onRefresh) onRefresh();

      if (onSelect) {
        onSelect(savedItem);
        onClose();
      }
    } catch (err) {
      console.error('Erro ao salvar fornecedor:', err);
      alert('Erro ao salvar o fornecedor. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o fornecedor "${nome}"?`)) {
      return;
    }

    try {
      await fornecedorDB.delete(id);
      await fetchFornecedores();
      if (editingId === id) {
        handleCancelEdit();
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao excluir fornecedor:', err);
      alert('Erro ao excluir fornecedor.');
    }
  };

  const filteredFornecedores = useMemo(() => {
    if (!searchTerm.trim()) return fornecedores;
    const term = searchTerm.toLowerCase();
    return fornecedores.filter(f =>
      (f.nomeFantasia || '').toLowerCase().includes(term) ||
      (f.razaoSocial || '').toLowerCase().includes(term) ||
      (f.cnpjCpf || '').toLowerCase().includes(term)
    );
  }, [fornecedores, searchTerm]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] border border-slate-200">

        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-[#f3f7f5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#186b77]/10 flex items-center justify-center text-[#186b77]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Fornecedores & Prestadores de Serviço
              </h2>
              <p className="text-xs text-slate-500">
                Gerencie oficinas, fornecedores de peças e prestadores de manutenção
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">

          {/* Form Box (Novo / Editar) */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                {isEditing ? (
                  <>
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    Editar Fornecedor
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-[#186b77]" />
                    Novo Fornecedor / Oficina
                  </>
                )}
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Cancelar Edição
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nome Fantasia / Oficina *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mecânica Náutica Silva"
                    value={formData.nomeFantasia || ''}
                    onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#186b77] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Silva & Filhos Manutenções Náuticas LTDA"
                    value={formData.razaoSocial || ''}
                    onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#186b77] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    CNPJ ou CPF
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00 ou CPF"
                    value={formData.cnpjCpf || ''}
                    onChange={(e) => setFormData({ ...formData, cnpjCpf: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#186b77] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Dados Bancários / Chave PIX
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Chave PIX ou Banco/Ag/CC"
                    value={formData.dadosBancarios || ''}
                    onChange={(e) => setFormData({ ...formData, dadosBancarios: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#186b77] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status || 'ativo'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ativo' | 'inativo' })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#186b77] outline-none cursor-pointer"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#186b77] hover:bg-[#12555f] text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Salvando...' : isEditing ? 'Atualizar Fornecedor' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Fornecedores */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#186b77]" />
                Fornecedores Cadastrados ({filteredFornecedores.length})
              </h3>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Buscar por nome ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#186b77] outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {filteredFornecedores.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Nenhum fornecedor encontrado</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Utilize o formulário acima para cadastrar a primeira oficina ou fornecedor.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredFornecedores.map((forn) => {
                  const isCurSelected = selectedId === forn.id;
                  return (
                    <div
                      key={forn.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 bg-white ${
                        isCurSelected
                          ? 'border-[#186b77] ring-1 ring-[#186b77] shadow-xs bg-teal-50/20'
                          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {forn.nomeFantasia}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              forn.status === 'inativo'
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            }`}>
                              {forn.status === 'inativo' ? 'Inativo' : 'Ativo'}
                            </span>
                          </div>
                          {forn.razaoSocial && forn.razaoSocial !== forn.nomeFantasia && (
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                              {forn.razaoSocial}
                            </p>
                          )}
                          {forn.cnpjCpf && (
                            <p className="text-[10px] font-mono font-semibold text-slate-400 mt-0.5">
                              CNPJ/CPF: {forn.cnpjCpf}
                            </p>
                          )}
                          {forn.dadosBancarios && (
                            <p className="text-[10px] text-slate-500 font-medium truncate mt-1 flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                              {typeof forn.dadosBancarios === 'string'
                                ? forn.dadosBancarios
                                : JSON.stringify(forn.dadosBancarios)}
                            </p>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEdit(forn)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar Fornecedor"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(forn.id, forn.nomeFantasia)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Fornecedor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {onSelect && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelect(forn);
                                onClose();
                              }}
                              className={`ml-1 px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                                isCurSelected
                                  ? 'bg-[#186b77] text-white shadow-2xs'
                                  : 'bg-slate-100 hover:bg-[#186b77] hover:text-white text-slate-700'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              {isCurSelected ? 'Selecionado' : 'Selecionar'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-[#f3f7f5] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
