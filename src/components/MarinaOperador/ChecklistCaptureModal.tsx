import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  Plus,
  ShieldCheck,
  Fuel,
  Clock,
  FileText,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { uploadPhotoToStorage } from '../../utils/checklistStorage';
import { getBoatCode } from '../../utils/boatUtils';

export interface ChecklistAngle {
  id: string;
  name: string;
  description: string;
  required: boolean;
  angleKey: string;
}

export interface ChecklistCaptureData {
  tipo: 'descida' | 'subida' | 'saida' | 'retorno' | 'avulso';
  fotos: { [angleKey: string]: string };
  fotosExtras: string[];
  horimetro?: number;
  nivelCombustivel?: string;
  itensSeguranca: {
    coletes: boolean;
    extintor: boolean;
    cortaCorrente: boolean;
    ancora: boolean;
    documento: boolean;
  };
  observacoes: string;
}

interface ChecklistCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'descida' | 'subida' | 'saida' | 'retorno' | 'avulso';
  reservaTarget?: any;
  embarcacaoTarget?: any;
  onSuccess: (data: ChecklistCaptureData) => Promise<void>;
}

const DEFAULT_ANGLES_LANCHA: ChecklistAngle[] = [
  { id: 'proa', angleKey: 'proa', name: 'Proa (Frente)', description: 'Vista frontal completa da proa e bico', required: true },
  { id: 'popa', angleKey: 'popa', name: 'Popa (Traseira/Motor)', description: 'Motores, rabeta, escada e popa', required: true },
  { id: 'bombordo', angleKey: 'bombordo', name: 'Bombordo (Lado Esquerdo)', description: 'Lateral esquerda do costado', required: true },
  { id: 'boreste', angleKey: 'boreste', name: 'Boreste (Lado Direito)', description: 'Lateral direita do costado', required: true },
  { id: 'painel', angleKey: 'painel', name: 'Painel & Comando', description: 'Instrumentos, manetes e rádio', required: true },
  { id: 'casco', angleKey: 'casco', name: 'Casco & Hélice', description: 'Linha d\'água, fundo e hélice', required: false },
];

const DEFAULT_ANGLES_JET: ChecklistAngle[] = [
  { id: 'proa', angleKey: 'proa', name: 'Proa (Frente)', description: 'Bico e casco frontal', required: true },
  { id: 'popa', angleKey: 'popa', name: 'Popa (Traseira/Turbina)', description: 'Traseira, bocal e turbina', required: true },
  { id: 'bombordo', angleKey: 'bombordo', name: 'Bombordo (Esquerdo)', description: 'Costado lateral esquerdo', required: true },
  { id: 'boreste', angleKey: 'boreste', name: 'Boreste (Direito)', description: 'Costado lateral direito', required: true },
  { id: 'painel', angleKey: 'painel', name: 'Guidão & Display', description: 'Painel digital e botões', required: true },
];

const QUICK_OBS_PRESETS = [
  'Tudo em ordem e sem avarias',
  'Risco leve pré-existente no casco',
  'Estofamento com marcas de uso',
  'Capa molhada no compartimento',
  'Hélice com pequeno desgaste',
  'Cliente já conferiu no local'
];

export const ChecklistCaptureModal: React.FC<ChecklistCaptureModalProps> = ({
  isOpen,
  onClose,
  tipo,
  reservaTarget,
  embarcacaoTarget,
  onSuccess
}) => {
  const [fotos, setFotos] = useState<{ [angleKey: string]: string }>({});
  const [fotosExtras, setFotosExtras] = useState<string[]>([]);
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Additional fields
  const [horimetro, setHorimetro] = useState<string>('');
  const [nivelCombustivel, setNivelCombustivel] = useState<string>('3/4');
  const [itensSeguranca, setItensSeguranca] = useState({
    coletes: true,
    extintor: true,
    cortaCorrente: true,
    ancora: true,
    documento: true
  });
  const [observacoes, setObservacoes] = useState('');

  const fileInputRefs = useRef<{ [angleKey: string]: HTMLInputElement | null }>({});
  const extraFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const embarcacao = embarcacaoTarget || (reservaTarget?.embarcacao) || {};
  const isJetSki = (embarcacao.tipo || '').toLowerCase().includes('jet') || (embarcacao.nome || '').toLowerCase().includes('jet');
  const angles = isJetSki ? DEFAULT_ANGLES_JET : DEFAULT_ANGLES_LANCHA;

  const totalRequired = angles.filter(a => a.required).length;
  const filledRequired = angles.filter(a => a.required && fotos[a.angleKey]).length;
  const isComplete = filledRequired >= totalRequired;

  const getTipoLabel = () => {
    switch (tipo) {
      case 'descida': return { label: 'Checklist de Descida', sub: 'Descida para a água / Rampa', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      case 'subida': return { label: 'Checklist de Subida', sub: 'Retorno da água / Vaga Seca', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'saida': return { label: 'Checklist de Saída', sub: 'Partida para navegação no mar', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
      case 'retorno': return { label: 'Checklist de Chegada', sub: 'Retorno da navegação', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      default: return { label: 'Checklist Operacional', sub: 'Vistoria e Registro de Estado', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
    }
  };

  const handleCaptureAngle = async (angleKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAngle(angleKey);
      const url = await uploadPhotoToStorage(file);
      setFotos(prev => ({ ...prev, [angleKey]: url }));
    } catch (err: any) {
      console.error('Erro ao enviar foto:', err);
      alert('Falha ao processar foto. Tente novamente.');
    } finally {
      setUploadingAngle(null);
      if (fileInputRefs.current[angleKey]) {
        fileInputRefs.current[angleKey]!.value = '';
      }
    }
  };

  const handleCaptureExtra = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingExtra(true);
      const url = await uploadPhotoToStorage(file);
      setFotosExtras(prev => [...prev, url]);
    } catch (err: any) {
      console.error('Erro ao enviar foto extra:', err);
      alert('Falha ao processar foto extra. Tente novamente.');
    } finally {
      setUploadingExtra(false);
      if (extraFileInputRef.current) {
        extraFileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAnglePhoto = (angleKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFotos(prev => {
      const next = { ...prev };
      delete next[angleKey];
      return next;
    });
  };

  const handleDeleteExtraPhoto = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFotosExtras(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    if (!isComplete) {
      alert(`Por favor, tire todas as ${totalRequired} fotos obrigatórias antes de finalizar.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSuccess({
        tipo,
        fotos,
        fotosExtras,
        horimetro: horimetro ? parseFloat(horimetro) : undefined,
        nivelCombustivel,
        itensSeguranca,
        observacoes
      });
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar checklist:', err);
      alert(err.message || 'Ocorreu um erro ao salvar o checklist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeInfo = getTipoLabel();
  const boatCode = getBoatCode(embarcacao);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full h-full md:h-auto md:max-h-[92vh] md:max-w-4xl md:rounded-2xl flex flex-col shadow-2xl overflow-hidden">

        {/* TOP BAR / HEADER */}
        <div className="bg-slate-800/90 border-b border-slate-700/80 px-4 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${typeInfo.badge}`}>
              {typeInfo.label}
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{embarcacao.nome || 'Embarcação'}</span>
                {boatCode && (
                  <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded font-mono">
                    #{boatCode}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {embarcacao.modelo || 'Modelo'} {embarcacao.tamanho ? `• ${embarcacao.tamanho} pés` : ''} • {embarcacao.cliente_nome || reservaTarget?.cliente_nome || 'Cliente'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PROGRESS INDICATOR BAR */}
        <div className="bg-slate-800/40 border-b border-slate-700/50 px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isComplete ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-xs font-medium text-slate-300">
              Fotos Obrigatórias: <strong className="text-white font-bold">{filledRequired} de {totalRequired}</strong>
            </span>
          </div>
          <div className="w-32 bg-slate-700/80 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${(filledRequired / totalRequired) * 100}%` }}
            />
          </div>
        </div>

        {/* MAIN SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* SECTION 1: PHOTO ANGLE GRID (TOUCH-FIRST SINGLE SCREEN) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Ângulos da Embarcação</span>
              </h3>
              <span className="text-xs text-slate-400">Toque no quadrado para capturar</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {angles.map((angle) => {
                const photoUrl = fotos[angle.angleKey];
                const isUploading = uploadingAngle === angle.angleKey;

                return (
                  <div
                    key={angle.id}
                    onClick={() => {
                      if (!isUploading) {
                        fileInputRefs.current[angle.angleKey]?.click();
                      }
                    }}
                    className={`relative rounded-xl border-2 transition-all flex flex-col justify-between overflow-hidden cursor-pointer min-h-[140px] group ${
                      photoUrl
                        ? 'border-emerald-500/80 bg-slate-800/80 shadow-md shadow-emerald-950/30'
                        : angle.required
                        ? 'border-dashed border-slate-600 hover:border-cyan-500 bg-slate-800/40 hover:bg-slate-800/70'
                        : 'border-dashed border-slate-700 hover:border-slate-500 bg-slate-800/20'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={(el) => (fileInputRefs.current[angle.angleKey] = el)}
                      className="hidden"
                      onChange={(e) => handleCaptureAngle(angle.angleKey, e)}
                    />

                    {photoUrl ? (
                      /* PHOTO PREVIEW CARD */
                      <>
                        <img
                          src={photoUrl}
                          alt={angle.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-black/30 to-transparent pointer-events-none" />

                        {/* Top Badge */}
                        <div className="relative z-10 p-2 flex items-center justify-between">
                          <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(photoUrl);
                              }}
                              className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition"
                              title="Ver Ampliada"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteAnglePhoto(angle.angleKey, e)}
                              className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg backdrop-blur-sm transition"
                              title="Remover Foto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Label */}
                        <div className="relative z-10 p-2 text-left">
                          <p className="text-xs font-bold text-white leading-tight drop-shadow">
                            {angle.name}
                          </p>
                          <p className="text-[10px] text-emerald-300 font-medium flex items-center gap-1">
                            <RotateCcw className="w-2.5 h-2.5" /> Toque para trocar
                          </p>
                        </div>
                      </>
                    ) : (
                      /* EMPTY ANGLE STATE (PROMPT TO CAPTURE) */
                      <div className="flex-1 flex flex-col items-center justify-center p-3 text-center">
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-[11px] font-bold text-cyan-400">Enviando...</span>
                          </div>
                        ) : (
                          <>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition ${
                              angle.required
                                ? 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white'
                                : 'bg-slate-700/50 text-slate-400'
                            }`}>
                              <Camera className="w-5 h-5" />
                            </div>

                            <p className="text-xs font-bold text-slate-200 group-hover:text-white">
                              {angle.name} {angle.required && <span className="text-red-400">*</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                              {angle.description}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: EXTRA PHOTOS / DEFECTS */}
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/60 p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Fotos Extras & Avarias Detectadas ({fotosExtras.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => extraFileInputRef.current?.click()}
                disabled={uploadingExtra}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{uploadingExtra ? 'Enviando...' : 'Adicionar Foto'}</span>
              </button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={extraFileInputRef}
                className="hidden"
                onChange={handleCaptureExtra}
              />
            </div>

            {fotosExtras.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                {fotosExtras.map((extraUrl, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-700 aspect-square group">
                    <img src={extraUrl} alt={`Extra ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(extraUrl)}
                        className="p-1 bg-black/70 text-white rounded hover:bg-black"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteExtraPhoto(idx, e)}
                        className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-1">
                Nenhuma foto de avaria extra adicionada. Toque em 'Adicionar Foto' caso identifique arranhões, trincas ou detalhes.
              </p>
            )}
          </div>

          {/* SECTION 3: SAFETY ITENS CHECKLIST (LARGE TOUCH SWITCHES) */}
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Conferência de Equipamentos e Segurança</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { key: 'coletes', label: 'Coletes Salva-Vidas presentes e conformes' },
                { key: 'extintor', label: 'Extintor de Incêndio na validade e pressurizado' },
                { key: 'cortaCorrente', label: 'Chave de segurança / Corta-circuito funcional' },
                { key: 'ancora', label: 'Âncora, corrente e cabos inspecionados' },
                { key: 'documento', label: 'Documentação / TIE a bordo' }
              ].map((item) => {
                const checked = (itensSeguranca as any)[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setItensSeguranca(prev => ({
                        ...prev,
                        [item.key]: !checked
                      }))
                    }
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      checked
                        ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span className="text-xs font-medium pr-2">{item.label}</span>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                      checked ? 'bg-emerald-500 text-white' : 'border border-slate-600'
                    }`}>
                      {checked && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: HORÍMETRO, COMBUSTÍVEL & OBSERVAÇÕES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Quick Metrics */}
            <div className="bg-slate-800/40 rounded-xl border border-slate-700/60 p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Horímetro & Nível</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Horímetro Atual (h)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 142.5"
                    value={horimetro}
                    onChange={(e) => setHorimetro(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Nível Tanque</label>
                  <select
                    value={nivelCombustivel}
                    onChange={(e) => setNivelCombustivel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Cheio">Cheio (100%)</option>
                    <option value="3/4">3/4 Tanque</option>
                    <option value="1/2">1/2 Tanque (50%)</option>
                    <option value="1/4">1/4 Tanque</option>
                    <option value="Reserva">Reserva (&lt;10%)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Notes */}
            <div className="bg-slate-800/40 rounded-xl border border-slate-700/60 p-3.5 space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Observações Rápidas</span>
              </h4>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUICK_OBS_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setObservacoes(prev => (prev ? `${prev}. ${preset}` : preset));
                    }}
                    className="text-[10px] bg-slate-700/60 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600/50 transition"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                placeholder="Descreva detalhes relevantes do estado da embarcação..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

          </div>

        </div>

        {/* BOTTOM FIXED ACTION BAR (BIG TOUCH TARGET) */}
        <div className="bg-slate-800/95 border-t border-slate-700/80 p-3 md:p-4 flex items-center justify-between gap-3 shrink-0 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-semibold rounded-xl text-sm transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg transition-all ${
              isComplete
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 active:scale-[0.98]'
                : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Gravando Checklist...</span>
              </>
            ) : isComplete ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Concluir e Salvar Checklist</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5" />
                <span>Faltam {totalRequired - filledRequired} fotos obrigatórias</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* FULLSCREEN IMAGE MODAL PREVIEW */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-3 bg-slate-800/80 text-white rounded-full hover:bg-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Preview Foto"
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
