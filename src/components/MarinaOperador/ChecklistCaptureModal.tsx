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
  FileText,
  AlertTriangle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { uploadPhotoToStorage } from '../../utils/checklistStorage';
import { getBoatCode } from '../../utils/boatUtils';

/* ──────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────── */

export interface ChecklistAngle {
  id: string;
  angleKey: string;
  name: string;
  description: string;
  required: boolean;
  svgPath?: string;
}

export interface ChecklistCaptureData {
  tipo: 'descida' | 'subida' | 'saida' | 'retorno' | 'avulso';
  fotos: { [angleKey: string]: string };
  fotosExtras: string[];
  itensSeguranca?: {
    coletes: boolean;
    extintor: boolean;
    cortaCorrente: boolean;
    ancora: boolean;
    documento: boolean;
    boiaCircular?: boolean;
    primeirosSocorros?: boolean;
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

/* ──────────────────────────────────────────────
   ANGLE DEFINITIONS
   ────────────────────────────────────────────── */

const ANGLES_JET: ChecklistAngle[] = [
  { id: 'frente',       angleKey: 'frente',       name: 'Frente (Proa)',            description: 'Bico e casco frontal',                          required: true,  svgPath: '/checklist/jet/frente.png' },
  { id: 'popa',         angleKey: 'popa',         name: 'Traseira (Popa/Turbina)',  description: 'Bocal de turbina e traseira',                    required: true,  svgPath: '/checklist/jet/tras.png' },
  { id: 'bombordo',     angleKey: 'bombordo',     name: 'Lateral Bombordo',         description: 'Costado lateral esquerdo completo',              required: true,  svgPath: '/checklist/jet/esquerda.png' },
  { id: 'boreste',      angleKey: 'boreste',      name: 'Lateral Boreste',          description: 'Costado lateral direito completo',               required: true,  svgPath: '/checklist/jet/direita.png' },
  { id: '45_bb_proa',   angleKey: '45_bb_proa',   name: '45° Bombordo Proa',        description: 'Diagonal esquerda frontal',                      required: true },
  { id: '45_bb_popa',   angleKey: '45_bb_popa',   name: '45° Bombordo Popa',        description: 'Diagonal esquerda traseira',                     required: true },
  { id: '45_be_proa',   angleKey: '45_be_proa',   name: '45° Boreste Proa',         description: 'Diagonal direita frontal',                       required: true },
  { id: '45_be_popa',   angleKey: '45_be_popa',   name: '45° Boreste Popa',         description: 'Diagonal direita traseira',                      required: true },
  { id: 'painel',       angleKey: 'painel',       name: 'Painel / Guidão / Display',description: 'Display digital, botões e guidão',               required: true,  svgPath: '/checklist/jet/painel.png' },
  { id: 'casco',        angleKey: 'casco',        name: 'Casco Inferior / Fundo',   description: "Linha d'água e fundo do casco",                 required: true,  svgPath: '/checklist/jet/casco.png' },
];

const ANGLES_LANCHA: ChecklistAngle[] = [
  { id: 'proa',           angleKey: 'proa',           name: 'Proa Frontal',             description: 'Vista frontal completa da proa e bico',         required: true,  svgPath: '/checklist/lancha/proa.svg' },
  { id: 'costado_bb_proa',angleKey: 'costado_bb_proa',name: 'Costado Bombordo Proa',    description: 'Lado esquerdo, seção da proa',                  required: true,  svgPath: '/checklist/lancha/esquerda.svg' },
  { id: 'costado_bb_popa',angleKey: 'costado_bb_popa',name: 'Costado Bombordo Popa',    description: 'Lado esquerdo, seção da popa',                  required: true },
  { id: 'costado_be_proa',angleKey: 'costado_be_proa',name: 'Costado Boreste Proa',     description: 'Lado direito, seção da proa',                   required: true,  svgPath: '/checklist/lancha/direita.svg' },
  { id: 'costado_be_popa',angleKey: 'costado_be_popa',name: 'Costado Boreste Popa',     description: 'Lado direito, seção da popa',                   required: true },
  { id: 'popa',           angleKey: 'popa',           name: 'Popa / Motores / Rabeta',  description: 'Motores, rabeta, escada e popa completa',       required: true,  svgPath: '/checklist/lancha/popa.svg' },
  { id: 'painel',         angleKey: 'painel',         name: 'Painel de Comando',        description: 'Instrumentos, manetes, rádio e eletrônica',     required: true,  svgPath: '/checklist/lancha/painel.svg' },
  { id: 'casco',          angleKey: 'casco',          name: 'Casco / Fundo / Hélice',   description: 'Linha d\'água, fundo e hélice',                 required: true,  svgPath: '/checklist/lancha/casco.svg' },
  { id: 'conves',         angleKey: 'conves',         name: 'Convés / Cabine',          description: 'Cobertura do convés, assentos e cabine',        required: false },
];

const SAFETY_ITEMS = [
  { key: 'coletes',           label: 'Coletes Salva-Vidas presentes e conformes' },
  { key: 'extintor',          label: 'Extintor de Incêndio na validade e pressurizado' },
  { key: 'cortaCorrente',     label: 'Chave de segurança / Corta-corrente funcional' },
  { key: 'ancora',            label: 'Âncora, corrente e cabos inspecionados' },
  { key: 'documento',         label: 'Documentação / TIE a bordo' },
  { key: 'boiaCircular',      label: 'Boia circular com retinida' },
  { key: 'primeirosSocorros', label: 'Kit de primeiros socorros' },
];

const QUICK_OBS_PRESETS = [
  'Tudo em ordem e sem avarias',
  'Risco leve pré-existente no casco',
  'Estofamento com marcas de uso',
  'Capa molhada no compartimento',
  'Hélice com pequeno desgaste',
  'Cliente já conferiu no local',
];

/* ──────────────────────────────────────────────
   COMPONENT
   ────────────────────────────────────────────── */

// Switch UI component to look like native iOS/Android toggle
const NativeSwitch = ({ checked }: { checked: boolean }) => (
  <div className={`w-14 h-8 rounded-full transition-colors duration-200 flex items-center px-1 shrink-0 ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}>
    <div className={`w-6 h-6 bg-white rounded-full transition-transform duration-200 shadow-md ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
  </div>
);

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

  // Step wizard: 0 = fotos, 1 = segurança (lancha only), 2 = observações, 3 = revisão
  const [step, setStep] = useState(0);

  // Active angle being captured (full-screen capture card)
  const [activeAngleIdx, setActiveAngleIdx] = useState(0);

  // Preview modal state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [refGuideAngle, setRefGuideAngle] = useState<ChecklistAngle | null>(null);

  // Safety items (only used for lanchas)
  const [itensSeguranca, setItensSeguranca] = useState({
    coletes: false,
    extintor: false,
    cortaCorrente: false,
    ancora: false,
    documento: false,
    boiaCircular: false,
    primeirosSocorros: false,
  });

  const [observacoes, setObservacoes] = useState('');

  const fileInputRefs = useRef<{ [angleKey: string]: HTMLInputElement | null }>({});
  const extraFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const embarcacao = embarcacaoTarget || reservaTarget?.embarcacao || {};
  const isJetSki = /jet/i.test(embarcacao.tipo || embarcacao.nome || '');
  const angles = isJetSki ? ANGLES_JET : ANGLES_LANCHA;

  const totalRequired = angles.filter(a => a.required).length;
  const filledRequired = angles.filter(a => a.required && fotos[a.angleKey]).length;
  const isComplete = filledRequired >= totalRequired;
  const progressPct = totalRequired > 0 ? (filledRequired / totalRequired) * 100 : 0;

  const getTipoLabel = () => {
    switch (tipo) {
      case 'descida': return { label: 'Checklist de Descida', sub: 'Descida para a água / Rampa', color: 'bg-blue-100 text-blue-700 border-blue-300' };
      case 'subida':  return { label: 'Checklist de Subida', sub: 'Retorno da água / Vaga Seca', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
      case 'saida':   return { label: 'Checklist de Saída', sub: 'Partida para navegação no mar', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' };
      case 'retorno': return { label: 'Checklist de Chegada', sub: 'Retorno da navegação', color: 'bg-amber-100 text-amber-700 border-amber-300' };
      default:        return { label: 'Checklist Operacional', sub: 'Vistoria e Registro', color: 'bg-purple-100 text-purple-700 border-purple-300' };
    }
  };

  /* ── HANDLERS ── */

  const handleCaptureAngle = async (angleKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setFotos(prev => ({ ...prev, [angleKey]: localUrl }));

    try {
      setUploadingAngle(angleKey);
      const url = await uploadPhotoToStorage(file);
      setFotos(prev => ({ ...prev, [angleKey]: url }));
      setTimeout(() => URL.revokeObjectURL(localUrl), 1000);
    } catch (err: any) {
      console.error('Erro ao enviar foto:', err);
      alert('Falha ao processar foto. Tente novamente.');
      setFotos(prev => {
        const next = { ...prev };
        delete next[angleKey];
        return next;
      });
      URL.revokeObjectURL(localUrl);
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

    const localUrl = URL.createObjectURL(file);
    setFotosExtras(prev => [...prev, localUrl]);

    try {
      setUploadingExtra(true);
      const url = await uploadPhotoToStorage(file);
      setFotosExtras(prev => prev.map(f => f === localUrl ? url : f));
      setTimeout(() => URL.revokeObjectURL(localUrl), 1000);
    } catch (err: any) {
      console.error('Erro ao enviar foto extra:', err);
      alert('Falha ao processar foto extra. Tente novamente.');
      setFotosExtras(prev => prev.filter(f => f !== localUrl));
      URL.revokeObjectURL(localUrl);
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
        itensSeguranca: isJetSki ? undefined : itensSeguranca,
        observacoes,
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

  // Step configuration
  const totalSteps = isJetSki ? 3 : 4;
  // 0: fotos, 1: segurança (lanchas), 2/1: observações, 3/2: revisão final
  const stepLabels = isJetSki
    ? ['Fotos', 'Observações', 'Revisão']
    : ['Fotos', 'Segurança', 'Observações', 'Revisão'];

  const activeAngle = angles[activeAngleIdx];
  const totalPhotos = Object.keys(fotos).length;

  const canAdvanceFromPhotos = isComplete;

  const handleNextStep = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };
  const handlePrevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const goToAngle = (idx: number) => {
    setActiveAngleIdx(idx);
    setStep(0);
  };

  // Step indexes mapped
  const STEP_FOTOS = 0;
  const STEP_SEGURANCA = isJetSki ? -1 : 1;
  const STEP_OBS = isJetSki ? 1 : 2;
  const STEP_REVIEW = isJetSki ? 2 : 3;

  /* ── RENDER ── */

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* ═══════ NATIVE-STYLE TOP BAR ═══════ */}
      <div className="bg-white border-b border-slate-100 shrink-0">
        {/* Status row */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <button
            onClick={step === 0 ? onClose : handlePrevStep}
            className="flex items-center gap-1 text-blue-600 font-semibold text-sm active:opacity-60 transition py-1 -ml-1"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{step === 0 ? 'Fechar' : 'Voltar'}</span>
          </button>

          <div className="text-center flex-1 min-w-0 px-2">
            <h1 className="text-base font-extrabold text-slate-900 truncate">
              {embarcacao.nome || 'Embarcação'}
              {boatCode && <span className="text-slate-400 font-mono text-sm ml-1.5">#{boatCode}</span>}
            </h1>
          </div>

          <button
            onClick={onClose}
            className="p-2 -mr-1 text-slate-400 active:opacity-60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator pills */}
        <div className="px-4 pb-3 flex items-center gap-2">
          {stepLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => {
                // Allow going back freely, forward only if photos done or going to photos
                if (i <= step || (i > 0 && canAdvanceFromPhotos)) setStep(i);
              }}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div className={`h-1 w-full rounded-full transition-colors duration-300 ${
                i < step ? 'bg-emerald-500' : i === step ? 'bg-blue-600' : 'bg-slate-200'
              }`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                i === step ? 'text-blue-600' : i < step ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ MAIN CONTENT AREA ═══════ */}
      <div className="flex-1 overflow-y-auto overscroll-contain">

        {/* ────────── STEP: FOTOS ────────── */}
        {step === STEP_FOTOS && (
          <div className="flex flex-col h-full">
            {/* Capture Card — Full Width, Big */}
            <div className="px-4 pt-4 pb-3 flex-1 flex flex-col">
              {/* Current angle as big capture card */}
              <div className="flex-1 flex flex-col">
                {/* Reference image or capture area */}
                <div
                  className={`relative flex-1 min-h-[280px] rounded-2xl overflow-hidden border-2 transition-all ${
                    fotos[activeAngle.angleKey]
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-dashed border-slate-300 bg-slate-50'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={(el) => { fileInputRefs.current[activeAngle.angleKey] = el; }}
                    className="hidden"
                    onChange={(e) => handleCaptureAngle(activeAngle.angleKey, e)}
                  />

                  {fotos[activeAngle.angleKey] ? (
                    /* ── Photo captured ── */
                    <>
                      <img
                        src={fotos[activeAngle.angleKey]}
                        alt={activeAngle.name}
                        className="w-full h-full object-cover absolute inset-0"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                      {/* Status badge */}
                      <div className="absolute top-3 left-3">
                        <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                          <CheckCircle2 className="w-4 h-4" /> Foto capturada
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                        <button
                          onClick={() => setPreviewImage(fotos[activeAngle.angleKey])}
                          className="flex-1 py-3 bg-white/95 text-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.97] transition backdrop-blur-sm"
                        >
                          <Eye className="w-5 h-5" /> Ver Foto
                        </button>
                        <button
                          onClick={() => fileInputRefs.current[activeAngle.angleKey]?.click()}
                          className="flex-1 py-3 bg-white/95 text-blue-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.97] transition backdrop-blur-sm"
                        >
                          <RotateCcw className="w-5 h-5" /> Refazer
                        </button>
                        <button
                          onClick={(e) => handleDeleteAnglePhoto(activeAngle.angleKey, e)}
                          className="py-3 px-4 bg-red-500/90 text-white rounded-xl shadow-lg active:scale-[0.97] transition backdrop-blur-sm"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  ) : uploadingAngle === activeAngle.angleKey ? (
                    /* ── Uploading ── */
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 absolute inset-0">
                      <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-base font-bold text-blue-600">Enviando foto...</span>
                    </div>
                  ) : (
                    /* ── Empty — tap to capture ── */
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRefs.current[activeAngle.angleKey]?.click()}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 active:bg-slate-100 transition cursor-pointer"
                    >
                      {/* Show reference SVG large if available */}
                      {activeAngle.svgPath ? (
                        <>
                          <img
                            src={activeAngle.svgPath}
                            alt={`Referência ${activeAngle.name}`}
                            className="w-32 h-32 object-contain opacity-40"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(activeAngle.svgPath!);
                            }}
                            className="absolute top-4 right-4 py-2 px-4 bg-white/90 text-blue-600 rounded-full font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition"
                          >
                            <Eye className="w-4 h-4" /> Ver Exemplo
                          </button>
                        </>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
                          <Camera className="w-10 h-10 text-blue-400" />
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-lg font-extrabold text-slate-800">Toque para fotografar</p>
                        <p className="text-sm text-slate-500 mt-1">{activeAngle.description}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Angle name & counter below the card */}
                <div className="flex items-center justify-between mt-3 px-1">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 leading-tight">{activeAngle.name}</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {activeAngle.required ? 'Obrigatória' : 'Opcional'} · {activeAngleIdx + 1} de {angles.length}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-black ${isComplete ? 'text-emerald-500' : 'text-slate-300'}`}>
                      {filledRequired}/{totalRequired}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontal scroll mini-thumbnails for all angles */}
            <div className="border-t border-slate-100 bg-white px-2 py-3 shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none">
                {angles.map((angle, idx) => {
                  const hasPhoto = !!fotos[angle.angleKey];
                  const isActive = idx === activeAngleIdx;

                  return (
                    <button
                      key={angle.id}
                      onClick={() => setActiveAngleIdx(idx)}
                      className={`shrink-0 snap-center w-16 h-16 rounded-xl overflow-hidden border-2 transition-all active:scale-95 relative ${
                        isActive
                          ? 'border-blue-600 shadow-md shadow-blue-200'
                          : hasPhoto
                          ? 'border-emerald-400'
                          : 'border-slate-200'
                      }`}
                    >
                      {hasPhoto ? (
                        <>
                          <img src={fotos[angle.angleKey]} alt="" className="w-full h-full object-cover" />
                          <div className="absolute top-0.5 right-0.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 drop-shadow" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                          {angle.svgPath ? (
                            <img src={angle.svgPath} alt="" className="w-8 h-8 object-contain opacity-30" />
                          ) : (
                            <Camera className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                      )}
                      {/* Active indicator dot */}
                      {isActive && (
                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600" />
                      )}
                    </button>
                  );
                })}

                {/* Extra photos button in the strip */}
                <button
                  onClick={() => extraFileInputRef.current?.click()}
                  disabled={uploadingExtra}
                  className="shrink-0 snap-center w-16 h-16 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition"
                >
                  {uploadingExtra ? (
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-amber-500" />
                      <span className="text-[8px] font-bold text-amber-600 uppercase">Extra</span>
                      {fotosExtras.length > 0 && (
                        <span className="text-[8px] font-bold text-amber-700">{fotosExtras.length}</span>
                      )}
                    </>
                  )}
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
            </div>

            {/* Navigation arrows between angles + advance button */}
            <div className="border-t border-slate-100 bg-white p-4 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setActiveAngleIdx(Math.max(0, activeAngleIdx - 1))}
                disabled={activeAngleIdx === 0}
                className="w-14 h-14 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center active:scale-95 transition disabled:opacity-30"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>

              {activeAngleIdx < angles.length - 1 ? (
                <button
                  onClick={() => setActiveAngleIdx(activeAngleIdx + 1)}
                  className="flex-1 h-14 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition shadow-sm"
                >
                  Próximo Ângulo <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleNextStep}
                  disabled={!canAdvanceFromPhotos}
                  className={`flex-1 h-14 rounded-xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition shadow-sm ${
                    canAdvanceFromPhotos
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {canAdvanceFromPhotos ? (
                    <>Avançar <ChevronRight className="w-5 h-5" /></>
                  ) : (
                    <>Faltam {totalRequired - filledRequired} fotos</>
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveAngleIdx(Math.min(angles.length - 1, activeAngleIdx + 1))}
                disabled={activeAngleIdx === angles.length - 1}
                className="w-14 h-14 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center active:scale-95 transition disabled:opacity-30"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </div>
          </div>
        )}

        {/* ────────── STEP: SEGURANÇA (lanchas) ────────── */}
        {step === STEP_SEGURANCA && !isJetSki && (
          <div className="px-4 py-5 space-y-4">
            <div className="text-center mb-2">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Equipamentos de Segurança</h2>
              <p className="text-sm text-slate-500 mt-1">Confirme cada item verificado a bordo</p>
            </div>

            <div className="space-y-2">
              {SAFETY_ITEMS.map((item) => {
                const checked = (itensSeguranca as any)[item.key] ?? false;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setItensSeguranca(prev => ({
                        ...prev,
                        [item.key]: !checked,
                      }))
                    }
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                      checked
                        ? 'bg-emerald-50 border-emerald-400'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <span className={`text-sm font-semibold pr-4 leading-snug ${checked ? 'text-emerald-800' : 'text-slate-700'}`}>
                      {item.label}
                    </span>
                    <NativeSwitch checked={checked} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ────────── STEP: OBSERVAÇÕES ────────── */}
        {step === STEP_OBS && (
          <div className="px-4 py-5 space-y-5">
            <div className="text-center mb-2">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Observações</h2>
              <p className="text-sm text-slate-500 mt-1">Adicione notas sobre o estado da embarcação</p>
            </div>

            {/* Quick presets as chips */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Notas rápidas</label>
              <div className="flex flex-wrap gap-2">
                {QUICK_OBS_PRESETS.map((preset, idx) => {
                  const isSelected = observacoes.includes(preset);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setObservacoes(prev => prev.replace(preset, '').replace(/\.\s*\./g, '.').replace(/^\.\s*/, '').trim());
                        } else {
                          setObservacoes(prev => (prev ? `${prev}. ${preset}` : preset));
                        }
                      }}
                      className={`px-4 py-2.5 rounded-full text-sm font-semibold transition active:scale-95 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}{preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Free-text */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Observação livre</label>
              <textarea
                rows={4}
                placeholder="Descreva detalhes do estado da embarcação..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-4 text-base text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 resize-none transition"
              />
            </div>

            {/* Extra photos section */}
            {fotosExtras.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Fotos extras adicionadas ({fotosExtras.length})
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {fotosExtras.map((url, idx) => (
                    <div key={idx} className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-slate-200 relative group cursor-pointer" onClick={() => setPreviewImage(url)}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => handleDeleteExtraPhoto(idx, e)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 group-active:opacity-100 transition shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ────────── STEP: REVISÃO FINAL ────────── */}
        {step === STEP_REVIEW && (
          <div className="px-4 py-5 space-y-5">
            <div className="text-center mb-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${isComplete ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                {isComplete
                  ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  : <AlertCircle className="w-8 h-8 text-amber-600" />
                }
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Revisão Final</h2>
              <p className="text-sm text-slate-500 mt-1">{typeInfo.label} — {embarcacao.nome || 'Embarcação'}</p>
            </div>

            {/* Photos grid review */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Fotos ({totalPhotos} capturadas)
                </span>
                <span className={`text-xs font-bold ${isComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {filledRequired}/{totalRequired} obrigatórias
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {angles.map((angle, idx) => {
                  const hasPhoto = !!fotos[angle.angleKey];
                  return (
                    <button
                      key={angle.id}
                      onClick={() => hasPhoto ? setPreviewImage(fotos[angle.angleKey]) : goToAngle(idx)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 relative transition active:scale-95 ${
                        hasPhoto ? 'border-emerald-400' : angle.required ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      {hasPhoto ? (
                        <>
                          <img src={fotos[angle.angleKey]} alt="" className="w-full h-full object-cover" />
                          <div className="absolute top-1 right-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 drop-shadow" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-1">
                          <Camera className="w-5 h-5 text-slate-300 mb-1" />
                          <span className="text-[8px] font-bold text-slate-400 text-center leading-tight">{angle.name}</span>
                          {angle.required && <span className="text-[8px] font-bold text-red-400 mt-0.5">Faltando</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Safety summary (lanchas) */}
            {!isJetSki && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Segurança
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    {Object.values(itensSeguranca).filter(Boolean).length}/{SAFETY_ITEMS.length} OK
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SAFETY_ITEMS.map(item => {
                    const ok = (itensSeguranca as any)[item.key];
                    return (
                      <span key={item.key} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {ok ? '✓' : '✗'} {item.label.split(' ')[0]}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Observations summary */}
            {observacoes && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Observações</span>
                <p className="text-sm text-slate-700 font-medium">{observacoes}</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ═══════ BOTTOM ACTION BAR (not on photo step — that has its own nav) ═══════ */}
      {step !== STEP_FOTOS && (
        <div className="border-t border-slate-100 bg-white p-4 shrink-0">
          {step === STEP_REVIEW ? (
            /* Final submit */
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isComplete || isSubmitting}
              className={`w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                isComplete
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Gravando...
                </>
              ) : isComplete ? (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  Concluir e Salvar Checklist
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5" />
                  Faltam {totalRequired - filledRequired} fotos obrigatórias
                </>
              )}
            </button>
          ) : (
            /* Next step */
            <button
              onClick={handleNextStep}
              className="w-full h-14 rounded-2xl bg-blue-600 text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition shadow-sm"
            >
              Continuar <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* ═══════ FULLSCREEN IMAGE PREVIEW ═══════ */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="absolute top-4 right-4 z-[10000]">
            <button
              onClick={() => setPreviewImage(null)}
              className="p-3 bg-white/20 text-white rounded-full backdrop-blur-md active:opacity-60 transition shadow-xl"
            >
              <X className="w-8 h-8" />
            </button>
          </div>

          <img
            src={previewImage}
            alt="Preview"
            className="w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <p className="absolute bottom-6 text-white/70 text-sm font-bold bg-black/50 px-4 py-2 rounded-full">
            Toque fora para fechar
          </p>
        </div>
      )}
    </div>
  );
};
