import React, { useState } from 'react';
import { Ship, X, Search, Check, FileQuestion, User as UserIcon, Droplets } from 'lucide-react';
import { getBoatCode } from '../../utils/boatUtils';

export interface AvulsoFuelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // { boats: any[] }
  getCliente: (id: string) => any;
  onConfirm: (payload: { type: 'embarcacao', boat: any, client: any } | { type: 'avulso', name: string }) => void;
}

export const AvulsoFuelSelectorModal: React.FC<AvulsoFuelSelectorModalProps> = ({
  isOpen,
  onClose,
  data,
  getCliente,
  onConfirm
}) => {
  const [mode, setMode] = useState<'embarcacao' | 'avulso'>('embarcacao');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBoat, setSelectedBoat] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [avulsoName, setAvulsoName] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (mode === 'embarcacao' && selectedBoat && selectedClient) {
      onConfirm({ type: 'embarcacao', boat: selectedBoat, client: selectedClient });
    } else if (mode === 'avulso' && avulsoName.trim()) {
      onConfirm({ type: 'avulso', name: avulsoName.trim() });
    }
  };

  const isConfirmDisabled = (mode === 'embarcacao' && (!selectedBoat || !selectedClient)) || (mode === 'avulso' && !avulsoName.trim());

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 focus:outline-none">
              <Droplets className="w-4 h-4 text-cyan-600 fill-current" />
              <span>Novo Abastecimento</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Selecione para quem é o combustível</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100/50 hover:bg-slate-200 rounded-xl cursor-pointer transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-1 subtle-scrollbar text-xs">

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMode('embarcacao')}
              className={`py-2 px-3 rounded-lg text-xs tracking-wider transition-all flex items-center justify-center gap-2 font-black ${
                mode === 'embarcacao' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Ship className="w-4 h-4" />
              <span>Da Marina</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('avulso')}
              className={`py-2 px-3 rounded-lg text-xs tracking-wider transition-all flex items-center justify-center gap-2 font-black ${
                mode === 'avulso' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileQuestion className="w-4 h-4" />
              <span>Visitante</span>
            </button>
          </div>

          {mode === 'embarcacao' ? (
            <div className="space-y-4 animate-in fade-in">
              {!selectedBoat ? (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nome, vaga, número..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 bg-slate-100 hover:bg-slate-200 rounded-full p-1">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto subtle-scrollbar border border-slate-200 rounded-2xl p-2 bg-slate-50 shadow-inner">
                    {(data?.boats || [])
                      .filter((b: any) => {
                        if (!searchTerm.trim()) return true;
                        const q = searchTerm.trim().toLowerCase();
                        return (b.nome || '').toLowerCase().includes(q) ||
                               (b.numero || '').toString().toLowerCase().includes(q) ||
                               (b.vaga || '').toLowerCase().includes(q);
                      })
                      .map((b: any) => {
                        const client = getCliente(b.clienteId);
                        return (
                          <div
                            key={b.id}
                            onClick={() => setSelectedBoat(b)}
                            className="p-3 rounded-xl border bg-white border-slate-200 hover:border-cyan-300 transition-all cursor-pointer flex items-center justify-between active:scale-95"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-slate-100 text-slate-400">
                                <Ship className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-extrabold text-xs uppercase text-slate-900">{getBoatCode(b)}</span>
                                <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                                  {client?.nome || 'Cliente não informado'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {(data?.boats || []).length === 0 && (
                       <div className="p-4 text-center text-slate-500 text-xs font-semibold">
                          Nenhuma embarcação cadastrada na marina.
                       </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <div className="flex items-center gap-3 bg-cyan-50 border border-cyan-200 rounded-xl p-3">
                    <button onClick={() => { setSelectedBoat(null); setSelectedClient(null); }} className="p-1.5 bg-white text-cyan-600 rounded-lg hover:bg-cyan-100">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-cyan-700 uppercase">Embarcação</span>
                      <span className="text-sm font-black text-cyan-950 uppercase">{getBoatCode(selectedBoat)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Selecione o Cliente</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto subtle-scrollbar border border-slate-200 rounded-2xl p-2 bg-slate-50 shadow-inner">
                      {(() => {
                        const donosIds = selectedBoat.donos && selectedBoat.donos.length > 0 ? selectedBoat.donos : (selectedBoat.clienteId ? [selectedBoat.clienteId] : []);
                        if (donosIds.length === 0) {
                           return <div className="p-3 text-center text-xs text-slate-500">Nenhum cliente vinculado.</div>;
                        }
                        return donosIds.map((clientId: string) => {
                          const client = getCliente(clientId);
                          if (!client) return null;
                          const isSelected = selectedClient?.id === client.id;
                          return (
                            <div
                              key={client.id}
                              onClick={() => setSelectedClient(client)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between active:scale-95 ${
                                isSelected ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                  <UserIcon className="w-5 h-5" />
                                </div>
                                <span className="font-extrabold text-xs uppercase text-slate-900">{client.nome}</span>
                              </div>
                              {isSelected && <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in pt-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Identificação do Visitante</span>
                <div className="relative">
                   <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input
                     type="text"
                     placeholder="Ex: Lancha X (Nome ou Indivíduo)"
                     value={avulsoName}
                     onChange={(e) => setAvulsoName(e.target.value)}
                     className="w-full bg-white border border-slate-200 rounded-xl pl-9 py-4 font-bold text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                   />
                </div>
              </label>

              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium p-3 rounded-xl mt-2 leading-relaxed">
                 <strong className="block mb-1 text-xs">Nota:</strong>
                 Abastecimentos avulsos <strong>não podem ficar pendentes</strong> e deverão ser cobrados imediatamente na próxima etapa.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <button
            type="button"
            disabled={isConfirmDisabled}
            onClick={handleConfirm}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>Prosseguir com Litragem</span>
          </button>
        </div>

      </div>
    </div>
  );
};
