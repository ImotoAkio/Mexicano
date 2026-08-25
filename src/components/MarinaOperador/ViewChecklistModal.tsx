import React, { useState } from 'react';
import { X, Shield, Volume2, LifeBuoy, Flame } from 'lucide-react';
import { getBoatCode } from '../../utils/boatUtils';

export interface ViewChecklistModalProps {
  reserva: any;
  getEmbarcacao: (id: string) => any;
  getCliente: (id: string) => any;
  onClose: () => void;
  onOpenChecklistForDescida: (reserva: any) => void;
  onOpenChecklistForSubida: (reserva: any) => void;
}

export const ViewChecklistModal: React.FC<ViewChecklistModalProps> = ({
  reserva,
  getEmbarcacao,
  getCliente,
  onClose,
  onOpenChecklistForDescida,
  onOpenChecklistForSubida
}) => {
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  if (!reserva) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base uppercase">
                  {reserva.barcoNome || getEmbarcacao(reserva.embarcacaoId)?.nome || 'Embarcação'}
                </h3>
                <span className="bg-slate-900 text-white font-mono text-xs px-2 py-0.5 rounded font-bold">
                  #{getEmbarcacao(reserva.embarcacaoId)?.numero || '58'}
                </span>
              </div>
              <p className="text-xs text-blue-600 font-bold uppercase mt-0.5">
                {getCliente(reserva.clienteId)?.nome || reserva.clienteNome || 'Cliente'}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Photos and Details */}
          <div className="p-4 overflow-y-auto space-y-4 flex-1 subtle-scrollbar text-xs">
            {/* Horários */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono text-[11px]">
              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Hora Descida</span>
                <span className="font-bold text-slate-800">{reserva.horaDescida || '--:--'}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Hora Subida</span>
                <span className="font-bold text-slate-800">{reserva.horaSubida || '--:--'}</span>
              </div>
            </div>

            {/* Fotos de Descida */}
            <div className="space-y-2">
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>Fotos Checklist Descida</span>
                <span className="text-slate-400 font-mono font-bold">
                  {(reserva.fotosChecklistDescida?.length || 0)} foto(s)
                </span>
              </h4>
              {(reserva.fotosChecklistDescida?.length || 0) === 0 ? (
                <p className="text-slate-400 italic text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Nenhuma foto gravada na descida.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {reserva.fotosChecklistDescida.map((url: string, idx: number) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-pointer" onClick={() => setZoomedPhoto(url)}>
                      <img src={url} alt={`Descida ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fotos de Subida */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>Fotos Checklist Subida</span>
                <span className="text-slate-400 font-mono font-bold">
                  {(reserva.fotosChecklistSubida?.length || 0)} foto(s)
                </span>
              </h4>
              {(reserva.fotosChecklistSubida?.length || 0) === 0 ? (
                <p className="text-slate-400 italic text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Nenhuma foto gravada na subida.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {reserva.fotosChecklistSubida.map((url: string, idx: number) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-pointer" onClick={() => setZoomedPhoto(url)}>
                      <img src={url} alt={`Subida ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Equipamentos & Segurança da Lancha (Apenas para Lanchas) */}
            {(() => {
              const viewBoat = reserva ? getEmbarcacao(reserva.embarcacaoId) : null;
              const viewIsJet = viewBoat
                ? (viewBoat.tipo === 'jet' || (viewBoat.nome || '').toLowerCase().includes('jet'))
                : (reserva?.embarcacaoTipo === 'jet' || (reserva?.barcoNome || '').toLowerCase().includes('jet'));

              if (viewIsJet) {
                return reserva.checklistObservacoes ? (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 font-medium">
                      <span className="font-bold text-slate-900 block text-[10px] uppercase">Observações do Marinheiro:</span>
                      <p className="mt-0.5">{reserva.checklistObservacoes}</p>
                    </div>
                  </div>
                ) : null;
              }

              return (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>Segurança & Equipamentos da Lancha</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      reserva.checklistEquipamentos?.som !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}>
                      <span className="flex items-center gap-1"><Volume2 className="w-3.5 h-3.5" /> Som</span>
                      <span>{reserva.checklistEquipamentos?.som !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                    </div>
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      reserva.checklistEquipamentos?.boias !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}>
                      <span className="flex items-center gap-1"><LifeBuoy className="w-3.5 h-3.5" /> Bóias</span>
                      <span>{reserva.checklistEquipamentos?.boias !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                    </div>
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      reserva.checklistEquipamentos?.coletes !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}>
                      <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Coletes</span>
                      <span>{reserva.checklistEquipamentos?.coletes !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                    </div>
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      reserva.checklistEquipamentos?.extintor !== false ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}>
                      <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> Extintor</span>
                      <span>{reserva.checklistEquipamentos?.extintor !== false ? '✓ OK' : '⚠️ Avaria'}</span>
                    </div>
                  </div>
                  {reserva.checklistObservacoes && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 font-medium mt-1">
                      <span className="font-bold text-slate-900 block text-[10px] uppercase">Observações do Marinheiro:</span>
                      <p className="mt-0.5">{reserva.checklistObservacoes}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Footer Actions */}
          <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onClose();
                onOpenChecklistForDescida(reserva);
              }}
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer text-center active:scale-95 shadow-sm"
            >
              Checklist Descida
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenChecklistForSubida(reserva);
              }}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer text-center active:scale-95 shadow-sm"
            >
              Checklist Subida
            </button>
          </div>
        </div>
      </div>

      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-2 cursor-pointer"
          onClick={() => setZoomedPhoto(null)}
        >
          <img src={zoomedPhoto} alt="Zoom" className="max-w-full max-h-full object-contain rounded-lg" />
          <button
            className="absolute top-4 right-4 bg-white/10 text-white p-2 rounded-full backdrop-blur hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); setZoomedPhoto(null); }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </>
  );
};
