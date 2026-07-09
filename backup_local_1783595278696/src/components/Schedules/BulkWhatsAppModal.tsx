import React from 'react';
import { Reserva } from '../../types';
import { clientDB, boatDB } from '../../db';
import { RefreshCw, AlertTriangle, Send } from 'lucide-react';

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulkReservationsList: Reserva[];
  selectedBulkResIds: string[];
  bulkSendingStatus: 'idle' | 'sending' | 'completed';
  bulkSendResults: Record<string, 'success' | 'error' | 'pending' | 'sending'>;
  bulkMessageTemplate: string;
  setBulkMessageTemplate: (t: string) => void;
  toggleSelectAllBulkRes: () => void;
  toggleSelectBulkRes: (id: string) => void;
  onSend: () => void;
}

export default function BulkWhatsAppModal({
  isOpen,
  onClose,
  bulkReservationsList,
  selectedBulkResIds,
  bulkSendingStatus,
  bulkSendResults,
  bulkMessageTemplate,
  setBulkMessageTemplate,
  toggleSelectAllBulkRes,
  toggleSelectBulkRes,
  onSend
}: BulkWhatsAppModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header banner */}
        <div className="bg-emerald-50/50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base font-sans">
                Confirmação em Massa (WhatsApp)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-sans">
              Envie uma mensagem padrão para todos os clientes agendados neste dia para confirmarem a presença e preencherem dados de embarque.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto subtle-scrollbar space-y-6 flex-1">
          {/* Template editor */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">
              Template da Mensagem (pode ser editado)
            </label>
            <div className="relative">
              <textarea
                value={bulkMessageTemplate}
                onChange={(e) => setBulkMessageTemplate(e.target.value)}
                rows={12}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 text-slate-800 font-sans font-medium leading-relaxed resize-none"
              />
              <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                Variáveis: {"{cliente}"}, {"{barco}"}
              </div>
            </div>
          </div>

          {/* Day's Reservations List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">
                Clientes Agendados ({bulkReservationsList.length})
              </span>
              
              {bulkReservationsList.length > 0 && bulkSendingStatus !== 'sending' && (
                <button
                  onClick={toggleSelectAllBulkRes}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  {selectedBulkResIds.length === bulkReservationsList.filter(r => !!clientDB.getById(r.clienteId)?.telefone).length 
                    ? 'Desmarcar Todos' 
                    : 'Selecionar Todos'}
                </button>
              )}
            </div>

            {bulkReservationsList.length === 0 ? (
              <p className="text-center text-slate-500 py-6 font-medium">Não há agendamentos ativos cadastrados para esta data.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {bulkReservationsList.map((res) => {
                  const client = clientDB.getById(res.clienteId);
                  const boat = boatDB.getById(res.embarcacaoId);
                  const boatCode = boat ? (boat.numero ? `M${boat.numero}` : boat.nome.split(' ')[0]) : 'M00';
                  const clientName = client ? client.nome : 'Desconhecido';
                  const clientPhone = client?.telefone || '';
                  
                  const hasPhone = !!clientPhone;
                  const isSelected = selectedBulkResIds.includes(res.id);
                  const status = bulkSendResults[res.id] || 'pending';
                  
                  return (
                    <div 
                      key={res.id} 
                      className={`p-3 border rounded-xl flex items-center justify-between gap-4 transition-colors ${
                        !hasPhone 
                          ? 'border-rose-100 bg-rose-50/10' 
                          : isSelected
                            ? 'border-emerald-200 bg-emerald-50/10'
                            : 'border-slate-150 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!hasPhone || bulkSendingStatus === 'sending'}
                          onChange={() => toggleSelectBulkRes(res.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-xs text-slate-900">
                              {boatCode}
                            </span>
                            <span className="text-slate-500 text-xs">•</span>
                            <span className="font-semibold text-slate-900 truncate">
                              {clientName}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {hasPhone ? (
                              <span className="text-[10px] font-mono text-slate-500">
                                {clientPhone}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Sem Telefone
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0 font-semibold font-sans text-xs">
                        {status === 'sending' && (
                          <span className="text-blue-600 flex items-center gap-1">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando...
                          </span>
                        )}
                        {status === 'success' && (
                          <span className="text-emerald-650 flex items-center gap-0.5 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase">
                            ✓ Enviado
                          </span>
                        )}
                        {status === 'error' && (
                          <span className="text-rose-650 flex items-center gap-0.5 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase">
                            ❌ Erro
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="text-slate-400 font-mono text-[9px] uppercase">
                            Aguardando
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={bulkSendingStatus === 'sending'}
            className="px-5 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={bulkSendingStatus === 'sending' || selectedBulkResIds.length === 0}
            onClick={onSend}
            className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
          >
            {bulkSendingStatus === 'sending' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Enviando ({selectedBulkResIds.filter(id => bulkSendResults[id] === 'success' || bulkSendResults[id] === 'error').length}/{selectedBulkResIds.length})...</span>
              </>
            ) : (
              <span>Confirmar e Enviar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
