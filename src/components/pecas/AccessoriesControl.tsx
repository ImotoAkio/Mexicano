import React, { useState } from 'react';
import { Package, Search, Ship, CheckSquare, Square, Save } from 'lucide-react';
import { Embarcacao, Manutencao } from '../../types';
import { boatDB } from '../../db';

interface AccessoriesControlProps {
  embarcacoes: Embarcacao[];
  manutencoes: Manutencao[];
  onRefresh: () => void;
}

export default function AccessoriesControl({ embarcacoes, onRefresh }: AccessoriesControlProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State for editing
  const [acessorios, setAcessorios] = useState<{
    tenda?: boolean;
    mesa?: boolean;
    bancosCadeiras?: boolean;
    churrasqueira?: boolean;
    observacoes?: string;
  }>({});
  const [isSaving, setIsSaving] = useState(false);

  const filteredBoats = embarcacoes.filter(b => 
    b.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (b.numero && b.numero.includes(searchTerm))
  ).sort((a, b) => a.nome.localeCompare(b.nome));

  const handleEditClick = (boat: Embarcacao) => {
    setEditingId(boat.id);
    setAcessorios(boat.acessorios || {});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setAcessorios({});
  };

  const handleSave = async (id: string) => {
    setIsSaving(true);
    try {
      await boatDB.update(id, { acessorios });
      setEditingId(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving accessories:', error);
      alert('Erro ao salvar acessórios.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAcessorio = (key: keyof typeof acessorios) => {
    setAcessorios(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Conferência de Acessórios
        </h2>
        
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Buscar embarcação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200">Embarcação</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200 text-center">Tenda</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200 text-center">Mesa</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200 text-center">Bancos/Cadeiras</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200 text-center">Churrasqueira</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200">Observações</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBoats.map(boat => {
                const isEditing = editingId === boat.id;
                const acc = isEditing ? acessorios : (boat.acessorios || {});

                return (
                  <tr key={boat.id} className={`hover:bg-slate-50/50 transition-colors ${isEditing ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                          <Ship className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{boat.nome}</div>
                          <div className="text-xs text-slate-500">M{boat.numero}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <button 
                        disabled={!isEditing}
                        onClick={() => toggleAcessorio('tenda')}
                        className={`inline-flex p-1 rounded-md transition-colors ${!isEditing ? 'cursor-default opacity-80' : 'hover:bg-slate-200 cursor-pointer'} ${acc.tenda ? 'text-green-600' : 'text-slate-300'}`}
                      >
                        {acc.tenda ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        disabled={!isEditing}
                        onClick={() => toggleAcessorio('mesa')}
                        className={`inline-flex p-1 rounded-md transition-colors ${!isEditing ? 'cursor-default opacity-80' : 'hover:bg-slate-200 cursor-pointer'} ${acc.mesa ? 'text-green-600' : 'text-slate-300'}`}
                      >
                        {acc.mesa ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        disabled={!isEditing}
                        onClick={() => toggleAcessorio('bancosCadeiras')}
                        className={`inline-flex p-1 rounded-md transition-colors ${!isEditing ? 'cursor-default opacity-80' : 'hover:bg-slate-200 cursor-pointer'} ${acc.bancosCadeiras ? 'text-green-600' : 'text-slate-300'}`}
                      >
                        {acc.bancosCadeiras ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        disabled={!isEditing}
                        onClick={() => toggleAcessorio('churrasqueira')}
                        className={`inline-flex p-1 rounded-md transition-colors ${!isEditing ? 'cursor-default opacity-80' : 'hover:bg-slate-200 cursor-pointer'} ${acc.churrasqueira ? 'text-green-600' : 'text-slate-300'}`}
                      >
                        {acc.churrasqueira ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                      </button>
                    </td>
                    
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={acessorios.observacoes || ''}
                          onChange={(e) => setAcessorios(prev => ({ ...prev, observacoes: e.target.value }))}
                          placeholder="Faltando 1 cadeira..."
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      ) : (
                        <span className="text-sm text-slate-500 line-clamp-2">{acc.observacoes || '-'}</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleCancelEdit}
                            className="text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSave(boat.id)}
                            disabled={isSaving}
                            className="text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                          >
                            <Save className="w-4 h-4" />
                            Salvar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditClick(boat)}
                          className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {filteredBoats.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma embarcação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
