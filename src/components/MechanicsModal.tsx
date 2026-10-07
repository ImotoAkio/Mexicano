import React, { useState } from 'react';
import { XCircle, Save, Trash2, Edit2, Wrench, Check, Plus } from 'lucide-react';
import { Mecanico } from '../types';
import { mecanicoDB } from '../db';

interface MechanicsModalProps {
  onClose: () => void;
  onSelect?: (mecanico: Mecanico) => void;
}

export default function MechanicsModal({ onClose, onSelect }: MechanicsModalProps) {
  const [mecanicos, setMecanicos] = useState<Mecanico[]>(mecanicoDB.getAll());
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Mecanico>>({ nome: '', cnpj: '' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome?.trim()) return;

    if (formData.id) {
      mecanicoDB.update(formData.id, formData);
      const updated = mecanicoDB.getAll();
      setMecanicos(updated);
      if (onSelect) {
        const found = updated.find(m => m.id === formData.id);
        if (found) onSelect(found);
      }
    } else {
      const novoMecanico = mecanicoDB.create(formData);
      setMecanicos(mecanicoDB.getAll());
      if (onSelect) {
        onSelect(novoMecanico);
        onClose();
        return;
      }
    }
    setFormData({ nome: '', cnpj: '' });
    setIsEditing(false);
  };

  const handleEdit = (m: Mecanico) => {
    setFormData(m);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este prestador de serviço?')) {
      mecanicoDB.delete(id);
      setMecanicos(mecanicoDB.getAll());
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-slate-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-[#f3f7f5]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#186b77]/10 flex items-center justify-center text-[#186b77]">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Prestadores de Serviço & Oficinas</h2>
              <p className="text-xs text-slate-500">Cadastre oficinas, mecânicos e terceirizados de manutenção</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Formulário de Cadastro / Edição */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#186b77]" />
              {isEditing ? 'Editar Prestador' : 'Novo Prestador de Serviço'}
            </h3>
            <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Nome da Oficina / Prestador *"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#186b77] focus:border-[#186b77] outline-none"
                  required
                />
              </div>
              <div className="sm:w-48">
                <input
                  type="text"
                  placeholder="CNPJ ou CPF (opcional)"
                  value={formData.cnpj || ''}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#186b77] focus:border-[#186b77] outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#186b77] hover:bg-[#12555f] text-white rounded-lg transition-colors flex items-center justify-center font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setFormData({ nome: '', cnpj: '' }); }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors font-bold text-xs"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de Prestadores */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Cadastrados ({mecanicos.length})
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Nome / Razão</th>
                  <th className="px-4 py-2.5">CNPJ / CPF</th>
                  <th className="px-4 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mecanicos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 font-medium">
                      Nenhum prestador de serviço cadastrado até o momento.
                    </td>
                  </tr>
                ) : (
                  mecanicos.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{m.nome}</td>
                      <td className="px-4 py-3 text-slate-500 font-medium">{m.cnpj || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onSelect && (
                            <button
                              onClick={() => { onSelect(m); onClose(); }}
                              className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Selecionar este prestador"
                            >
                              <Check className="w-3 h-3" />
                              Selecionar
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(m)}
                            className="p-1.5 text-slate-400 hover:text-[#186b77] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
