import React, { useState } from 'react';
import { XCircle, Save, Trash2, Edit2 } from 'lucide-react';
import { Mecanico } from '../types';
import { mecanicoDB } from '../db';

interface MechanicsModalProps {
  onClose: () => void;
  onSelect?: (mecanicoName: string) => void; // Optional: If we want to auto-select after creating
}

export default function MechanicsModal({ onClose, onSelect }: MechanicsModalProps) {
  const [mecanicos, setMecanicos] = useState<Mecanico[]>(mecanicoDB.getAll());
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Mecanico>>({ nome: '', cnpj: '' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return;

    if (formData.id) {
      mecanicoDB.update(formData.id, formData);
    } else {
      const novoMecanico = mecanicoDB.create(formData);
      if (onSelect) {
        onSelect(novoMecanico.nome);
      }
    }
    setMecanicos(mecanicoDB.getAll());
    setFormData({ nome: '', cnpj: '' });
    setIsEditing(false);
  };

  const handleEdit = (m: Mecanico) => {
    setFormData(m);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este mecânico?')) {
      mecanicoDB.delete(id);
      setMecanicos(mecanicoDB.getAll());
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Gerenciar Mecânicos</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Formulário */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              {isEditing ? 'Editar Mecânico' : 'Novo Mecânico'}
            </h3>
            <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Nome do Mecânico *"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="CNPJ (opcional)"
                  value={formData.cnpj || ''}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center font-medium"
                >
                  <Save className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Salvar</span>
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setFormData({ nome: '', cnpj: '' }); }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">CNPJ</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mecanicos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      Nenhum mecânico cadastrado.
                    </td>
                  </tr>
                ) : (
                  mecanicos.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{m.nome}</td>
                      <td className="px-4 py-3 text-slate-600">{m.cnpj || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEdit(m)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors mr-2"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
