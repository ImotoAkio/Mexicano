import React, { useState, useEffect } from 'react';
import { AtividadeFinanceira } from '../../types';
import { Plus, GripVertical, Clock, CheckCircle, Circle, Trash2, RefreshCw } from 'lucide-react';

export default function FinanceKanban() {
  const [atividades, setAtividades] = useState<AtividadeFinanceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRecentConcluido, setShowRecentConcluido] = useState(false);
  const [editingItem, setEditingItem] = useState<AtividadeFinanceira | null>(null);
  const [formData, setFormData] = useState<{ titulo: string; descricao: string; status: 'a_fazer' | 'em_andamento' | 'concluido' }>({
    titulo: '',
    descricao: '',
    status: 'a_fazer'
  });

  const fetchAtividades = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/financeiro/atividades', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const text = await res.text();
        let data = [];
        try {
          data = text ? JSON.parse(text) : [];
        } catch (e) {
          console.warn('Resposta não é um JSON válido em /api/financeiro/atividades');
        }
        setAtividades(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAtividades();
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('atividadeId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: 'a_fazer' | 'em_andamento' | 'concluido') => {
    e.preventDefault();
    const id = e.dataTransfer.getData('atividadeId');
    if (!id) return;

    const atividade = atividades.find(a => a.id === id);
    if (!atividade || atividade.status === newStatus) return;

    const updatedAtividade = { ...atividade, status: newStatus, updatedAt: new Date().toISOString() };
    
    // Update UI immediately (optimistic UI)
    setAtividades(prev => prev.map(a => a.id === id ? updatedAtividade : a));

    // Save to backend
    try {
      const token = localStorage.getItem('admin_token');
      await fetch('/api/financeiro/atividades/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: updatedAtividade })
      });
    } catch (err) {
      console.error(err);
      fetchAtividades(); // revert on failure
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!editingItem;
    const now = new Date().toISOString();
    
    const payload: AtividadeFinanceira = {
      id: isEditing ? editingItem.id : `kanban_${Date.now()}`,
      titulo: formData.titulo,
      descricao: formData.descricao,
      status: formData.status,
      createdAt: isEditing ? editingItem.createdAt : now,
      updatedAt: now
    };

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/financeiro/atividades/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: payload })
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchAtividades();
      }
    } catch (err) {
      console.error("Failed to save", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta atividade?")) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      await fetch('/api/financeiro/atividades/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'delete', data: { id } })
      });
      fetchAtividades();
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (item?: AtividadeFinanceira) => {
    if (item) {
      setEditingItem(item);
      setFormData({ titulo: item.titulo, descricao: item.descricao || '', status: item.status });
    } else {
      setEditingItem(null);
      setFormData({ titulo: '', descricao: '', status: 'a_fazer' });
    }
    setIsModalOpen(true);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'a_fazer': return { label: 'A Fazer', color: 'border-slate-300 bg-slate-50', icon: Circle, iconColor: 'text-slate-400' };
      case 'em_andamento': return { label: 'Em Andamento', color: 'border-indigo-300 bg-indigo-50/30', icon: Clock, iconColor: 'text-indigo-500' };
      case 'concluido': return { label: 'Concluído', color: 'border-emerald-300 bg-emerald-50/30', icon: CheckCircle, iconColor: 'text-emerald-500' };
      default: return { label: 'A Fazer', color: 'border-slate-300 bg-slate-50', icon: Circle, iconColor: 'text-slate-400' };
    }
  };

  const columns: Array<'a_fazer' | 'em_andamento' | 'concluido'> = ['a_fazer', 'em_andamento', 'concluido'];

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Quadro de Atividades</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAtividades(true)}
            className={`p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all shadow-sm flex items-center justify-center ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Atualizar quadro"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            onClick={() => openModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Atividade
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {columns.map(status => {
          const config = getStatusConfig(status);
          let columnItems = atividades.filter(a => a.status === status);

          if (status === 'concluido' && showRecentConcluido) {
            const now = new Date();
            columnItems = columnItems.filter(a => {
              const dateToCompare = new Date(a.updatedAt || a.createdAt);
              const diffHours = (now.getTime() - dateToCompare.getTime()) / (1000 * 60 * 60);
              return diffHours <= 48;
            });
          }

          return (
            <div 
              key={status}
              className={`flex-1 w-full bg-slate-50/80 rounded-[1.5rem] p-4 border border-slate-200/60 min-h-[500px] flex flex-col`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="flex items-center gap-2 mb-4 px-2">
                <config.icon className={`w-5 h-5 ${config.iconColor}`} />
                <h3 className="font-bold text-slate-700">{config.label}</h3>
                
                {status === 'concluido' && (
                  <button
                    onClick={() => setShowRecentConcluido(!showRecentConcluido)}
                    className={`ml-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border transition-all shadow-sm ${
                      showRecentConcluido 
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                    title={showRecentConcluido ? "Mostrando últimas 48h. Clique para ver todos." : "Mostrar apenas atividades das últimas 48h"}
                  >
                    48h
                  </button>
                )}

                <span className="ml-auto bg-white text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                  {columnItems.length}
                </span>
              </div>

              <div className="flex-1 space-y-3">
                {columnItems.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-indigo-200 transition-all group"
                  >
                    <div className="flex gap-2">
                      <div className="mt-1 text-slate-300 group-hover:text-indigo-300 transition-colors cursor-move">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex-1" onClick={() => openModal(item)}>
                        <h4 className="font-semibold text-slate-800 text-sm">{item.titulo}</h4>
                        {item.descricao && (
                          <p className="text-slate-500 text-xs mt-1 line-clamp-2">{item.descricao}</p>
                        )}
                        <div className="text-[10px] text-slate-400 mt-3 font-medium">
                          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">
                {editingItem ? 'Editar Atividade' : 'Nova Atividade'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all">
                <Trash2 className="w-5 h-5 hidden" />
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Título</label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={e => setFormData({...formData, titulo: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-slate-700"
                  placeholder="Ex: Pagar fornecedor X"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Descrição (Opcional)</label>
                <textarea
                  value={formData.descricao}
                  onChange={e => setFormData({...formData, descricao: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-700"
                  placeholder="Detalhes adicionais..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-semibold text-slate-700 appearance-none"
                >
                  <option value="a_fazer">A Fazer</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 hover:text-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
