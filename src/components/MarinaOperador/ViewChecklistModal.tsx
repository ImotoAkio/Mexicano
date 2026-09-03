import React, { useState } from 'react';
import { X, Shield, FileText, Anchor, Activity, Pocket } from 'lucide-react';
import { getBoatCode } from '../../utils/boatUtils';

export interface ViewChecklistModalProps {
  reserva: any;
  getEmbarcacao: (id: string) => any;
  getCliente: (id: string) => any;
  onClose: () => void;
  onOpenChecklistForDescida: (reserva: any) => void;
  onOpenChecklistForSubida: (reserva: any) => void;
}

const renderSafetyItem = (reserva: any, key: string, label: string, IconClass: any) => {
  const status = reserva.checklistEquipamentos?.[key];
  const isOk = status !== false; // Considera undefined como OK por padrão no legado
  return (
    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
      isOk ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
    }`}>
      <span className="flex items-center gap-1 truncate"><IconClass className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{label}</span></span>
      <span className="shrink-0 ml-1">{isOk ? '✓ OK' : '⚠️ Avaria'}</span>
    </div>
  );
};

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

  const formatAngleLabel = (key: string) => {
    const labels: Record<string, string> = {
      'frente': 'Frente',
      'traseira': 'Traseira',
      'lat_esquerda': 'Lat. Esquerda',
      'lat_direita': 'Lat. Direita',
      'painel': 'Painel',
      'casco_inferior': 'Casco Inferior',
      'casco_traseiro': 'Casco Traseiro',
      'porta_objetos': 'Porta Objetos',
      'frente_proa': 'Frente - Proa',
      'frente_conves': 'Frente - Convés',
      'traseira_popa': 'Traseira - Popa',
      'traseira_plataforma': 'Traseira - Plataforma',
      'lat_esq_proa': 'Lat. Esq - Proa',
      'lat_esq_popa': 'Lat. Esq - Popa',
      'lat_dir_proa': 'Lat. Dir - Proa',
      'lat_dir_popa': 'Lat. Dir - Popa',
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const parseFotos = (fotos: any, extras: any = []) => {
    let arr: { label: string, url: string }[] = [];
    if (Array.isArray(fotos)) {
      arr = fotos.map((url, i) => ({ label: `Foto ${i + 1}`, url }));
    } else if (fotos && typeof fotos === 'object') {
      arr = Object.entries(fotos)
        .filter(([_, v]) => typeof v === 'string')
        .map(([k, v]) => ({ label: formatAngleLabel(k), url: v as string }));
    }
    if (Array.isArray(extras)) {
      extras.forEach((url, i) => {
        if (typeof url === 'string') {
          arr.push({ label: `Extra ${i + 1}`, url });
        }
      });
    }
    return arr;
  };

  const fotosDescida = parseFotos(reserva.fotosChecklistDescida, reserva.fotosExtrasDescida);
  const fotosSubida = parseFotos(reserva.fotosChecklistSubida, reserva.fotosExtrasSubida);

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
                  {fotosDescida.length} foto(s)
                </span>
              </h4>
              {fotosDescida.length === 0 ? (
                <p className="text-slate-400 italic text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Nenhuma foto gravada na descida.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {fotosDescida.map((foto, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-pointer" onClick={() => setZoomedPhoto(foto.url)}>
                      <img src={foto.url} alt={`Descida ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] p-1 truncate text-center backdrop-blur-sm">
                        {foto.label}
                      </div>
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
                  {fotosSubida.length} foto(s)
                </span>
              </h4>
              {fotosSubida.length === 0 ? (
                <p className="text-slate-400 italic text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Nenhuma foto gravada na subida.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {fotosSubida.map((foto, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-pointer" onClick={() => setZoomedPhoto(foto.url)}>
                      <img src={foto.url} alt={`Subida ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] p-1 truncate text-center backdrop-blur-sm">
                        {foto.label}
                      </div>
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
                    {renderSafetyItem(reserva, 'coletes', 'Coletes', Shield)}
                    {renderSafetyItem(reserva, 'extintor', 'Extintor', Flame)}
                    {renderSafetyItem(reserva, 'cortaCorrente', 'Corta-Corrente', Activity)}
                    {renderSafetyItem(reserva, 'ancora', 'Âncora', Anchor)}
                    {renderSafetyItem(reserva, 'documento', 'Documentos', FileText)}
                    {renderSafetyItem(reserva, 'boiaCircular', 'Bóia Circular', LifeBuoy)}
                    {renderSafetyItem(reserva, 'primeirosSocorros', 'P. Socorros', Pocket)}
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
