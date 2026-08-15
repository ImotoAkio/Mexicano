import React, { useState } from 'react';
import { Search, Ship, Clock, AlertTriangle, Save, CheckCircle } from 'lucide-react';
import { Embarcacao, Manutencao } from '../../types';
import { boatDB } from '../../db';

interface EngineHoursControlProps {
  embarcacoes: Embarcacao[];
  manutencoes: Manutencao[];
  onRefresh: () => void;
}

export default function EngineHoursControl({ embarcacoes, manutencoes, onRefresh }: EngineHoursControlProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredBoats = embarcacoes.filter(b => 
    b.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (b.numero && b.numero.includes(searchTerm)) ||
    (b.fabricante && b.fabricante.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => (b.horasMotor || 0) - (a.horasMotor || 0));

  const handleEditClick = (boat: Embarcacao) => {
    setEditingId(boat.id);
    setEditValue(boat.horasMotor || 0);
  };

  const handleSave = async (id: string) => {
    if (editValue === '') return;
    setIsSaving(true);
    try {
      await boatDB.update(id, { horasMotor: Number(editValue) });
      setEditingId(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving engine hours:', error);
      alert('Erro ao salvar horímetro.');
    } finally {
      setIsSaving(false);
    }
  };

  const getLatestMaintenance = (boatId: string) => {
    return manutencoes
      .filter(m => m.embarcacaoId === boatId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Controle de Horas do Motor
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
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200">Modelo / Ano</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200">Horas Atuais</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200">Próx. Revisão (Est.)</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200">Última Atualização</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBoats.map(boat => {
                const latestMaint = getLatestMaintenance(boat.id);
                const isNearingRevision = latestMaint && latestMaint.proximaRevisaoHoras 
                  ? ((boat.horasMotor || 0) >= (latestMaint.proximaRevisaoHoras - 10)) 
                  : false;

                return (
                  <tr key={boat.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                          <Ship className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{boat.nome}</div>
                          <div className="text-xs text-slate-500">M{boat.numero}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700">{boat.modelo}</div>
                      <div className="text-xs text-slate-500">{boat.fabricante} {boat.ano ? `- ${boat.ano}` : ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === boat.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSave(boat.id)}
                          />
                          <button 
                            onClick={() => handleSave(boat.id)}
                            disabled={isSaving}
                            className="text-green-600 hover:bg-green-50 p-1 rounded transition-colors"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-semibold text-slate-800">{boat.horasMotor || 0} h</span>
                          {isNearingRevision && (
                            <span title="Próximo da revisão!" className="text-orange-500">
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {latestMaint?.proximaRevisaoHoras ? (
                        <span className={`font-mono ${isNearingRevision ? 'text-orange-600 font-semibold' : 'text-slate-600'}`}>
                          {latestMaint.proximaRevisaoHoras} h
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Não definida</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {latestMaint ? new Date(latestMaint.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId !== boat.id && (
                        <button
                          onClick={() => handleEditClick(boat)}
                          className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          Atualizar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {filteredBoats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
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
