import React, { useState } from 'react';
import { X, Clock, Calendar, Plus, Trash2, History, Ship, AlertCircle } from 'lucide-react';
import { Embarcacao, RegistroHoras } from '../../types';
import { boatDB } from '../../db';

import { getBoatCode } from '../../utils/boatUtils';

interface HistoricoHorasModalProps {
  boat: Embarcacao;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function HistoricoHorasModal({ boat, isOpen, onClose, onRefresh }: HistoricoHorasModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [novasHoras, setNovasHoras] = useState<number | ''>(boat.horasMotor || 0);
  const [dataRegistro, setDataRegistro] = useState<string>(() => {
    const now = new Date();
    // format YYYY-MM-THH:mm for datetime-local
    return now.toISOString().slice(0, 16);
  });
  const [observacao, setObservacao] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const historico: RegistroHoras[] = [...(boat.historicoHoras || [])].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  const handleAddRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novasHoras === '' || novasHoras < 0) return;

    setIsSaving(true);
    try {
      const timestamp = new Date(dataRegistro).toISOString();
      (boatDB as any).registrarHoras(
        boat.id,
        Number(novasHoras),
        observacao || 'Atualização manual',
        timestamp
      );
      setIsAdding(false);
      setObservacao('');
      onRefresh();
    } catch (err) {
      console.error('Erro ao registrar horas:', err);
      alert('Erro ao registrar horas.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRegistro = async (registroId: string) => {
    if (!confirm('Deseja excluir este registro de horas do histórico?')) return;

    try {
      const novoHistorico = (boat.historicoHoras || []).filter(r => r.id !== registroId);
      
      // Determine the latest hours if the most recent entry was deleted
      const sorted = [...novoHistorico].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      const ultimaHoras = sorted.length > 0 ? sorted[0].horas : boat.horasMotor;
      const ultimaData = sorted.length > 0 ? sorted[0].data : boat.ultimaAtualizacaoHoras;

      boatDB.update(boat.id, {
        horasMotor: ultimaHoras,
        ultimaAtualizacaoHoras: ultimaData,
        historicoHoras: novoHistorico
      });

      onRefresh();
    } catch (err) {
      console.error('Erro ao excluir registro:', err);
      alert('Erro ao excluir registro.');
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{getBoatCode(boat)}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'} • {boat.modelo} ({boat.fabricante})
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Hours & Add CTA bar */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Horímetro Atual</span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold text-slate-900">{boat.horasMotor || 0} h</span>
              <span className="text-xs text-slate-500">
                Última atualização: <strong className="text-slate-700">{formatDate(boat.ultimaAtualizacaoHoras)}</strong>
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsAdding(!isAdding);
              setNovasHoras(boat.horasMotor || 0);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isAdding ? 'Cancelar Novo Registro' : 'Novo Registro de Horas'}
          </button>
        </div>

        {/* Form: Add Record */}
        {isAdding && (
          <form onSubmit={handleAddRegistro} className="p-5 bg-blue-50/70 border-b border-blue-200 space-y-4">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              Lançar Novo Controle Semanal / Periódico
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Horas do Motor (h)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={novasHoras}
                  onChange={(e) => setNovasHoras(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 125.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Data e Hora do Registro
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dataRegistro}
                  onChange={(e) => setDataRegistro(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observação (Opcional)
              </label>
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Leitura semanal efetuada após passeio de domingo"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar Registro com Data'}
              </button>
            </div>
          </form>
        )}

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Histórico de Lançamentos ({historico.length})
            </h4>
          </div>

          {historico.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 space-y-2">
              <History className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Nenhum histórico registrado ainda.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ao atualizar as horas do motor, os registros ficarão salvos aqui com a data e hora em que foram inseridos.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {historico.map((item, index) => {
                const prevItem = historico[index + 1];
                const diff = prevItem ? item.horas - prevItem.horas : null;

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl shadow-2xs flex items-center justify-between gap-4 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 font-mono font-bold text-xs">
                        #{historico.length - index}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold text-slate-900">{item.horas} h</span>
                          {diff !== null && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diff >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                              {diff >= 0 ? `+${diff.toFixed(1)} h` : `${diff.toFixed(1)} h`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(item.data)}</span>
                          {item.observacao && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 italic max-w-xs truncate">{item.observacao}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteRegistro(item.id)}
                      title="Excluir este registro"
                      className="text-slate-300 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
