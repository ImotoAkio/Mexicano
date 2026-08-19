import React, { useState } from 'react';
import { X, Package, Calendar, Clock, Plus, Trash2, History, CheckCircle, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { Embarcacao, RegistroAcessorios } from '../../types';
import { boatDB } from '../../db';

interface HistoricoAcessoriosModalProps {
  boat: Embarcacao;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function HistoricoAcessoriosModal({ boat, isOpen, onClose, onRefresh }: HistoricoAcessoriosModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [novasHoras, setNovasHoras] = useState<number | ''>(boat.horasMotor || 0);
  const [dataRegistro, setDataRegistro] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  
  const [acessoriosState, setAcessoriosState] = useState({
    tenda: boat.acessorios?.tenda ?? true,
    mesa: boat.acessorios?.mesa ?? true,
    bancosCadeiras: boat.acessorios?.bancosCadeiras ?? true,
    churrasqueira: boat.acessorios?.churrasqueira ?? true,
    observacoes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const historico: RegistroAcessorios[] = [...(boat.acessorios?.historico || [])].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  const handleAddRegistro = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      const timestamp = new Date(dataRegistro).toISOString();
      boatDB.registrarConferenciaAcessorios(
        boat.id,
        {
          tenda: acessoriosState.tenda,
          mesa: acessoriosState.mesa,
          bancosCadeiras: acessoriosState.bancosCadeiras,
          churrasqueira: acessoriosState.churrasqueira,
          observacoes: acessoriosState.observacoes || 'Conferência manual registrada'
        },
        novasHoras !== '' ? Number(novasHoras) : undefined,
        timestamp
      );
      setIsAdding(false);
      setAcessoriosState(prev => ({ ...prev, observacoes: '' }));
      onRefresh();
    } catch (err) {
      console.error('Erro ao registrar conferência de acessórios:', err);
      alert('Erro ao salvar registro de conferência.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRegistro = async (registroId: string) => {
    if (!confirm('Deseja realmente excluir este registro do histórico de acessórios?')) return;

    try {
      const novoHistorico = (boat.acessorios?.historico || []).filter(r => r.id !== registroId);
      const sorted = [...novoHistorico].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      const ultimaConf = sorted.length > 0 ? sorted[0].data : undefined;
      const ultimoReg = sorted.length > 0 ? sorted[0] : undefined;

      const updatedAcessorios = {
        ...boat.acessorios,
        tenda: ultimoReg ? ultimoReg.tenda : boat.acessorios?.tenda,
        mesa: ultimoReg ? ultimoReg.mesa : boat.acessorios?.mesa,
        bancosCadeiras: ultimoReg ? ultimoReg.bancosCadeiras : boat.acessorios?.bancosCadeiras,
        churrasqueira: ultimoReg ? ultimoReg.churrasqueira : boat.acessorios?.churrasqueira,
        observacoes: ultimoReg ? ultimoReg.observacoes : boat.acessorios?.observacoes,
        ultimaConferencia: ultimaConf,
        historico: novoHistorico
      };

      boatDB.update(boat.id, { acessorios: updatedAcessorios });
      onRefresh();
    } catch (err) {
      console.error('Erro ao excluir registro:', err);
      alert('Erro ao excluir registro do histórico.');
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] font-sans">
        
        {/* Header Modal */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{boat.nome}</h3>
                <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 text-xs font-semibold rounded-full border border-teal-400/30">
                  M{boat.numero}
                </span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-400/30">
                  Lancha
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {boat.modelo || 'Sem Modelo'} ({boat.fabricante || 'Sem Fabricante'})
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info & Action Bar */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
              Última Conferência Semanal
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-800">
                {formatDate(boat.acessorios?.ultimaConferencia)}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                • Horímetro: <strong className="text-slate-900 font-mono">{boat.horasMotor || 0} h</strong>
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsAdding(!isAdding);
              setNovasHoras(boat.horasMotor || 0);
            }}
            className="px-4 py-2 bg-[#186b77] hover:bg-[#12555f] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isAdding ? 'Cancelar Lançamento' : 'Nova Conferência Semanal'}
          </button>
        </div>

        {/* Form para Nova Conferência */}
        {isAdding && (
          <form onSubmit={handleAddRegistro} className="p-5 bg-teal-50/60 border-b border-teal-200/80 space-y-4">
            <h4 className="text-xs font-bold text-[#186b77] uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#186b77]" />
              Registrar Conferência Semanal de Acessórios & Horímetro
            </h4>

            {/* Checklist de Itens */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-teal-200/60">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={acessoriosState.tenda}
                  onChange={(e) => setAcessoriosState(prev => ({ ...prev, tenda: e.target.checked }))}
                  className="w-4 h-4 rounded text-[#186b77] focus:ring-[#186b77]"
                />
                <span>Tenda</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={acessoriosState.mesa}
                  onChange={(e) => setAcessoriosState(prev => ({ ...prev, mesa: e.target.checked }))}
                  className="w-4 h-4 rounded text-[#186b77] focus:ring-[#186b77]"
                />
                <span>Mesa</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={acessoriosState.bancosCadeiras}
                  onChange={(e) => setAcessoriosState(prev => ({ ...prev, bancosCadeiras: e.target.checked }))}
                  className="w-4 h-4 rounded text-[#186b77] focus:ring-[#186b77]"
                />
                <span>Bancos/Cadeiras</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={acessoriosState.churrasqueira}
                  onChange={(e) => setAcessoriosState(prev => ({ ...prev, churrasqueira: e.target.checked }))}
                  className="w-4 h-4 rounded text-[#186b77] focus:ring-[#186b77]"
                />
                <span>Churrasqueira</span>
              </label>
            </div>

            {/* Inputs de Horímetro & Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Horímetro Atual (Horas do Motor)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={novasHoras}
                  onChange={(e) => setNovasHoras(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-[#186b77] outline-none"
                  placeholder="Ex: 154.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Data e Hora da Conferência
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dataRegistro}
                  onChange={(e) => setDataRegistro(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#186b77] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observações / Faltas / Avarias (Opcional)
              </label>
              <input
                type="text"
                value={acessoriosState.observacoes}
                onChange={(e) => setAcessoriosState(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Ex: Mesa higienizada; Faltando 1 banco de apoio..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#186b77] outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-[#186b77] hover:bg-[#12555f] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar Registro no Histórico'}
              </button>
            </div>
          </form>
        )}

        {/* Lista de Registros do Histórico */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Histórico de Conferências Semanal ({historico.length})
            </h4>
          </div>

          {historico.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 space-y-2">
              <Package className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma conferência registrada no histórico.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ao registrar novas conferências semanais de acessórios, cada verificação ficará salva aqui para controle e acompanhamento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historico.map((item, index) => {
                const isOK = item.tenda !== false && item.mesa !== false && item.bancosCadeiras !== false && item.churrasqueira !== false;

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-slate-200 hover:border-teal-300 rounded-xl shadow-2xs space-y-3 transition-all group"
                  >
                    {/* Header da linha do tempo */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 font-mono font-bold text-xs">
                          #{historico.length - index}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {formatDate(item.data)}
                            </span>
                            {item.horasMotor !== undefined && (
                              <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                {item.horasMotor} h
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isOK ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            Conforme (100% OK)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            Com Pendência
                          </span>
                        )}

                        <button
                          onClick={() => handleDeleteRegistro(item.id)}
                          title="Excluir este registro"
                          className="text-slate-300 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Status individual dos 4 itens */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs">
                      <div className={`flex items-center gap-1.5 font-medium ${item.tenda !== false ? 'text-emerald-700' : 'text-red-600 font-bold'}`}>
                        {item.tenda !== false ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-red-500" />}
                        <span>Tenda</span>
                      </div>

                      <div className={`flex items-center gap-1.5 font-medium ${item.mesa !== false ? 'text-emerald-700' : 'text-red-600 font-bold'}`}>
                        {item.mesa !== false ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-red-500" />}
                        <span>Mesa</span>
                      </div>

                      <div className={`flex items-center gap-1.5 font-medium ${item.bancosCadeiras !== false ? 'text-emerald-700' : 'text-red-600 font-bold'}`}>
                        {item.bancosCadeiras !== false ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-red-500" />}
                        <span>Bancos/Cadeiras</span>
                      </div>

                      <div className={`flex items-center gap-1.5 font-medium ${item.churrasqueira !== false ? 'text-emerald-700' : 'text-red-600 font-bold'}`}>
                        {item.churrasqueira !== false ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-red-500" />}
                        <span>Churrasqueira</span>
                      </div>
                    </div>

                    {/* Observação */}
                    {item.observacoes && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 italic">
                        <strong className="not-italic text-slate-700 font-semibold">Obs:</strong> {item.observacoes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Modal */}
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
