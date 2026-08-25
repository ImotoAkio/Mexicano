import React, { useState } from 'react';
import { Camera, X, Search, Ship, Check, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { getBoatCode } from '../../utils/boatUtils';

export interface AvulsoChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // { boats: any[] }
  getCliente: (id: string) => any;
  onConfirm: (boat: any, mode: 'descida' | 'subida') => void;
}

export const AvulsoChecklistModal: React.FC<AvulsoChecklistModalProps> = ({
  isOpen,
  onClose,
  data,
  getCliente,
  onConfirm
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBoat, setSelectedBoat] = useState<any>(null);
  const [mode, setMode] = useState<'descida' | 'subida'>('descida');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedBoat) {
      onConfirm(selectedBoat, mode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-blue-600" />
              <span>Realizar Checklist de Embarcação</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Busque e selecione qualquer barco da marina</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100/50 hover:bg-slate-200 rounded-xl cursor-pointer transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-1 subtle-scrollbar text-xs">
          {/* Input de Busca */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Pesquisar Embarcação</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Digite nome, vaga ou número (#)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold transition-all shadow-sm"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-200 rounded-full p-0.5">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Lista Selecionável de Embarcações */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Embarcações Encontradas</label>
            <div className="space-y-2 max-h-60 overflow-y-auto subtle-scrollbar border border-slate-200 rounded-2xl p-2 bg-slate-50 shadow-inner">
              {(data?.boats || [])
                .filter((b: any) => {
                  if (!searchTerm.trim()) return true;
                  const q = searchTerm.trim().toLowerCase();
                  return (b.nome || '').toLowerCase().includes(q) || (b.numero || '').toString().toLowerCase().includes(q) || (b.vaga || '').toLowerCase().includes(q);
                })
                .map((b: any) => {
                  const isSelected = selectedBoat?.id === b.id;
                  const client = getCliente(b.clienteId);
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBoat(b)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between active:scale-95 ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-1 ring-blue-500'
                          : 'bg-white border-slate-200 hover:border-blue-300 text-slate-800 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Ship className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs uppercase text-slate-900">{getBoatCode(b)}</span>
                            {b.numero && (
                              <span className="bg-slate-900 text-white font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                                #{b.numero}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold block mt-0.5 uppercase">
                            {client?.nome || 'Cliente não informado'}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-blue-600 stroke-[3]" />}
                    </div>
                  );
                })}

              {(data?.boats || []).length === 0 && (
                <div className="p-4 text-center text-slate-500 text-xs font-semibold">
                  Nenhuma embarcação cadastrada na marina.
                </div>
              )}
            </div>
          </div>

          {/* Seleção do Tipo de Checklist */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Tipo de Checklist</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('descida')}
                className={`py-3 rounded-xl border-2 text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mode === 'descida'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4" />
                <span>Descida Píer</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('subida')}
                className={`py-3 rounded-xl border-2 text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mode === 'subida'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>Subida Vaga</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <button
            type="button"
            disabled={!selectedBoat}
            onClick={handleConfirm}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Iniciar Checklist</span>
          </button>
        </div>

      </div>
    </div>
  );
};
