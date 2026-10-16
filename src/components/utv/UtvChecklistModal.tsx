import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Gauge,
  Fuel,
  Sparkles,
  Camera,
  AlertTriangle,
  CheckCircle,
  FileText,
  Upload,
  User,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { UtvUso, UtvVeiculo } from '../../types';
import { fetchWithAuth } from '../../utils/apiAuth';
import { formatHorimetroDecimal, formatKm, calcularDelta } from '../../utils/utvUtils';

interface UtvChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  uso: UtvUso | null;
  mode: 'saida' | 'devolucao' | 'visualizar';
  veiculo?: UtvVeiculo | null;
}

export default function UtvChecklistModal({
  isOpen,
  onClose,
  onSuccess,
  uso,
  mode,
  veiculo
}: UtvChecklistModalProps) {
  // Campos de Saída
  const [horaSaida, setHoraSaida] = useState('');
  const [kmInicial, setKmInicial] = useState<number | ''>('');
  const [horimetroInicial, setHorimetroInicial] = useState<number | ''>('');
  const [limpezaSaida, setLimpezaSaida] = useState<'limpo' | 'regular' | 'sujo'>('limpo');
  const [fotosSaida, setFotosSaida] = useState<string[]>([]);
  const [observacoesSaida, setObservacoesSaida] = useState('');
  const [operadorSaida, setOperadorSaida] = useState('');

  // Campos de Chegada
  const [horaChegada, setHoraChegada] = useState('');
  const [kmFinal, setKmFinal] = useState<number | ''>('');
  const [horimetroFinal, setHorimetroFinal] = useState<number | ''>('');
  const [limpezaChegada, setLimpezaChegada] = useState<'limpo' | 'regular' | 'sujo'>('limpo');
  const [tanqueCheioDevolvido, setTanqueCheioDevolvido] = useState(true);
  const [comprovanteAbastecimentoUrl, setComprovanteAbastecimentoUrl] = useState('');
  const [avarias, setAvarias] = useState('');
  const [fotosChegada, setFotosChegada] = useState<string[]>([]);
  const [observacoesChegada, setObservacoesChegada] = useState('');
  const [operadorChegada, setOperadorChegada] = useState('');

  // Estados de upload e submissão
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && uso) {
      setError(null);
      const agoraHora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const currentAdminName = localStorage.getItem('admin_username') || localStorage.getItem('admin_name') || 'Admin';

      // Inicializa saída
      setHoraSaida(uso.horaSaida || agoraHora);
      const initialKm = uso.kmInicial !== null && uso.kmInicial !== undefined ? uso.kmInicial : (veiculo?.kmAtual || 0);
      const initialHorim = uso.horimetroInicial !== null && uso.horimetroInicial !== undefined ? uso.horimetroInicial : (veiculo?.horimetroAtual || 0);
      setKmInicial(initialKm);
      setHorimetroInicial(initialHorim);
      setLimpezaSaida(uso.limpezaSaida || 'limpo');
      setFotosSaida(uso.fotosSaida || []);
      setObservacoesSaida(uso.observacoesSaida || '');
      setOperadorSaida(uso.operadorSaida || currentAdminName);

      // Inicializa chegada
      setHoraChegada(uso.horaChegada || agoraHora);
      setKmFinal(uso.kmFinal !== null && uso.kmFinal !== undefined ? uso.kmFinal : initialKm);
      setHorimetroFinal(uso.horimetroFinal !== null && uso.horimetroFinal !== undefined ? uso.horimetroFinal : initialHorim);
      setLimpezaChegada(uso.limpezaChegada || 'limpo');
      setTanqueCheioDevolvido(uso.tanqueCheioDevolvido !== undefined ? uso.tanqueCheioDevolvido : true);
      setComprovanteAbastecimentoUrl(uso.comprovanteAbastecimentoUrl || '');
      setAvarias(uso.avarias || '');
      setFotosChegada(uso.fotosChegada || []);
      setObservacoesChegada(uso.observacoesChegada || '');
      setOperadorChegada(uso.operadorChegada || currentAdminName);
    }
  }, [isOpen, uso, veiculo, mode]);

  if (!isOpen || !uso) return null;

  // Cálculos dinâmicos de delta
  const deltaKm = calcularDelta(Number(kmInicial), Number(kmFinal));
  const deltaHoras = calcularDelta(Number(horimetroInicial), Number(horimetroFinal));

  // Upload de fotos
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSaida: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('image', files[i]);

        const res = await fetchWithAuth('/api/upload/checklist-image', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (data.success && data.imageUrl) {
          uploadedUrls.push(data.imageUrl);
        }
      }

      if (isSaida) {
        setFotosSaida(prev => [...prev, ...uploadedUrls]);
      } else {
        setFotosChegada(prev => [...prev, ...uploadedUrls]);
      }
    } catch (err: any) {
      setError('Erro ao enviar foto: ' + (err.message || 'Falha no upload.'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Upload de comprovante de combustível
  const handleComprovanteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingComprovante(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('comprovante', file);

      const res = await fetchWithAuth('/api/upload/comprovante', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success && data.url) {
        setComprovanteAbastecimentoUrl(data.url);
      } else {
        setError(data.message || 'Erro ao enviar comprovante de abastecimento.');
      }
    } catch (err: any) {
      setError('Falha ao enviar comprovante: ' + err.message);
    } finally {
      setUploadingComprovante(false);
    }
  };

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'saida') {
        if (kmInicial === '' || horimetroInicial === '') {
          setError('Informe o KM inicial e o Horímetro inicial.');
          setLoading(false);
          return;
        }

        const res = await fetchWithAuth('/api/utv/usos/retirada', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: uso.id,
            horaSaida,
            kmInicial: Number(kmInicial),
            horimetroInicial: Number(horimetroInicial),
            limpezaSaida,
            fotosSaida,
            observacoesSaida,
            operadorSaida
          })
        });

        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.message || 'Erro ao registrar saída.');
      } else if (mode === 'devolucao') {
        if (kmFinal === '' || horimetroFinal === '') {
          setError('Informe o KM final e o Horímetro final.');
          setLoading(false);
          return;
        }

        if (Number(kmFinal) < Number(kmInicial)) {
          setError(`KM final (${kmFinal}) não pode ser inferior ao KM inicial (${kmInicial}).`);
          setLoading(false);
          return;
        }

        if (Number(horimetroFinal) < Number(horimetroInicial)) {
          setError(`Horímetro final (${horimetroFinal} h) não pode ser inferior ao inicial (${horimetroInicial} h).`);
          setLoading(false);
          return;
        }

        if (!comprovanteAbastecimentoUrl) {
          setError('É obrigatório anexar o comprovante de abastecimento no retorno (Regra Tanque Cheio → Tanque Cheio).');
          setLoading(false);
          return;
        }

        const res = await fetchWithAuth('/api/utv/usos/devolucao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: uso.id,
            horaChegada,
            kmFinal: Number(kmFinal),
            horimetroFinal: Number(horimetroFinal),
            limpezaChegada,
            tanqueCheioDevolvido,
            comprovanteAbastecimentoUrl,
            avarias,
            fotosChegada,
            observacoesChegada,
            operadorChegada
          })
        });

        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.message || 'Erro ao registrar devolução.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao processar checklist.');
    } finally {
      setLoading(false);
    }
  };

  const isVisualizar = mode === 'visualizar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className={`px-6 py-5 text-white flex items-center justify-between ${
          mode === 'saida'
            ? 'bg-gradient-to-r from-blue-600 to-indigo-700'
            : mode === 'devolucao'
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
            : 'bg-gradient-to-r from-slate-700 to-slate-900'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Gauge className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {mode === 'saida' && 'Checklist de Retirada (Saída)'}
                {mode === 'devolucao' && 'Checklist de Devolução (Retorno)'}
                {mode === 'visualizar' && 'Espelho Completo de Uso do UTV'}
              </h3>
              <p className="text-xs text-white/80">
                {uso.cotistaNome || 'Cotista'} ({uso.cotistaCota || 'Cota'}) • Data: {uso.dataUso}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-700 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ════════════ SEÇÃO 1: RETIRADA / SAÍDA ════════════ */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <div className="flex items-center space-x-2 font-bold text-sm text-slate-800">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>1. Dados de Retirada (Saída)</span>
              </div>
              {uso.horaSaida && (
                <span className="text-xs text-slate-500 font-medium">Saída às {uso.horaSaida}</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Horário de Saída */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Horário de Saída
                </label>
                <input
                  type="time"
                  value={horaSaida}
                  onChange={(e) => setHoraSaida(e.target.value)}
                  disabled={isVisualizar || mode === 'devolucao'}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:bg-slate-100"
                />
              </div>

              {/* KM Inicial */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  KM Inicial
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={kmInicial}
                  onChange={(e) => setKmInicial(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={isVisualizar || mode === 'devolucao'}
                  required
                  placeholder="0.0"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:bg-slate-100"
                />
              </div>

              {/* Horímetro Inicial */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Horímetro Inicial (h)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={horimetroInicial}
                  onChange={(e) => setHorimetroInicial(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={isVisualizar || mode === 'devolucao'}
                  required
                  placeholder="0.0"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:bg-slate-100"
                />
                <span className="text-[10px] text-slate-500">
                  {horimetroInicial !== '' ? formatHorimetroDecimal(Number(horimetroInicial)) : '0.0 h'}
                </span>
              </div>
            </div>

            {/* Condição de Limpeza e Tanque Saída */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Limpeza na Saída
                </label>
                <select
                  value={limpezaSaida}
                  onChange={(e) => setLimpezaSaida(e.target.value as any)}
                  disabled={isVisualizar || mode === 'devolucao'}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:bg-slate-100"
                >
                  <option value="limpo">Limpo (Lavado / Pronto)</option>
                  <option value="regular">Regular (Poeira leve)</option>
                  <option value="sujo">Sujo</option>
                </select>
              </div>

              {/* Regra Tanque Cheio */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Combustível na Saída
                </label>
                <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                  <Fuel className="w-4 h-4 text-emerald-600" />
                  <span>Tanque 100% Cheio (Conferido)</span>
                </div>
              </div>
            </div>

            {/* Fotos de Saída */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 flex items-center justify-between">
                <span>Fotos da Retirada ({fotosSaida.length})</span>
                {!isVisualizar && mode === 'saida' && (
                  <label className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1 cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Adicionar Fotos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, true)}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                )}
              </label>

              {fotosSaida.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {fotosSaida.map((url, idx) => (
                    <div key={idx} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                      <img src={url} alt="Foto saída" className="w-full h-full object-cover" />
                      {!isVisualizar && mode === 'saida' && (
                        <button
                          type="button"
                          onClick={() => setFotosSaida(fotosSaida.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">Nenhuma foto anexada na saída.</p>
              )}
            </div>

            {/* Observações de Saída */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Observações de Saída
              </label>
              <textarea
                value={observacoesSaida}
                onChange={(e) => setObservacoesSaida(e.target.value)}
                disabled={isVisualizar || mode === 'devolucao'}
                rows={1}
                placeholder="Ex: Pneus calibrados em 14 psi, nível de óleo OK..."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* ════════════ SEÇÃO 2: DEVOLUÇÃO / RETORNO ════════════ */}
          {(mode === 'devolucao' || isVisualizar) && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <div className="flex items-center space-x-2 font-bold text-sm text-slate-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>2. Dados de Devolução (Retorno & Fechamento)</span>
                </div>
                {uso.horaChegada && (
                  <span className="text-xs text-slate-500 font-medium">Chegada às {uso.horaChegada}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Horário de Chegada */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Horário de Chegada
                  </label>
                  <input
                    type="time"
                    value={horaChegada}
                    onChange={(e) => setHoraChegada(e.target.value)}
                    disabled={isVisualizar}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:bg-slate-100"
                  />
                </div>

                {/* KM Final */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    KM Final
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={kmFinal}
                    onChange={(e) => setKmFinal(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={isVisualizar}
                    required
                    placeholder="0.0"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:bg-slate-100"
                  />
                </div>

                {/* Horímetro Final */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Horímetro Final (h)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={horimetroFinal}
                    onChange={(e) => setHorimetroFinal(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={isVisualizar}
                    required
                    placeholder="0.0"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:bg-slate-100"
                  />
                  <span className="text-[10px] text-slate-500">
                    {horimetroFinal !== '' ? formatHorimetroDecimal(Number(horimetroFinal)) : '0.0 h'}
                  </span>
                </div>
              </div>

              {/* CARD RESUMO DE USO REAL */}
              <div className="p-3 bg-white border border-emerald-200 rounded-xl grid grid-cols-2 gap-4 shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Distância Rodada (Δ KM)
                  </span>
                  <span className="text-lg font-black text-slate-800">
                    {formatKm(deltaKm)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Horas de Motor Efetivas (Δ Horímetro)
                  </span>
                  <span className="text-lg font-black text-amber-600">
                    {formatHorimetroDecimal(deltaHoras)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    (0,1 h = 6 minutos)
                  </span>
                </div>
              </div>

              {/* Limpeza e Confirmação de Tanque Cheio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Condição de Limpeza
                  </label>
                  <select
                    value={limpezaChegada}
                    onChange={(e) => setLimpezaChegada(e.target.value as any)}
                    disabled={isVisualizar}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:bg-slate-100"
                  >
                    <option value="limpo">Limpo</option>
                    <option value="regular">Regular (Poeira normal)</option>
                    <option value="sujo">Com muita lama / Necessita lavagem especial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Regra Tanque Cheio → Cheio
                  </label>
                  <label className="flex items-center space-x-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tanqueCheioDevolvido}
                      onChange={(e) => setTanqueCheioDevolvido(e.target.checked)}
                      disabled={isVisualizar}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Devolvido com Tanque 100% Cheio</span>
                  </label>
                </div>
              </div>

              {/* COMPROVANTE DE ABASTECIMENTO (REGRA OBRIGATÓRIA utv.md) */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-xs text-amber-900">
                    <Fuel className="w-4 h-4 text-amber-600" />
                    <span>Comprovante de Abastecimento (Obrigatório)</span>
                  </div>
                  {!isVisualizar && (
                    <label className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center space-x-1 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{comprovanteAbastecimentoUrl ? 'Substituir Anexo' : 'Anexar Cupom'}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleComprovanteUpload}
                        className="hidden"
                        disabled={uploadingComprovante}
                      />
                    </label>
                  )}
                </div>

                {comprovanteAbastecimentoUrl ? (
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs text-slate-700 truncate">Comprovante anexado com sucesso</span>
                    </div>
                    <a
                      href={comprovanteAbastecimentoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center space-x-1 ml-2"
                    >
                      <span>Visualizar</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-800">
                    ⚠️ Atenção: É obrigatório anexar o cupom/foto do posto comprovando que o veículo retornou abastecido.
                  </p>
                )}
              </div>

              {/* Avarias ou Observações de Trilha */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Registro de Avarias / Incidentes na Trilha
                </label>
                <textarea
                  value={avarias}
                  onChange={(e) => setAvarias(e.target.value)}
                  disabled={isVisualizar}
                  rows={2}
                  placeholder="Relate caso haja riscos na carenagem, furo de pneu, quebra de gaiola ou problemas mecânicos..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 disabled:bg-slate-100"
                />
              </div>

              {/* Fotos de Chegada */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 flex items-center justify-between">
                  <span>Fotos da Devolução ({fotosChegada.length})</span>
                  {!isVisualizar && (
                    <label className="text-[11px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center space-x-1 cursor-pointer">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Adicionar Fotos</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, false)}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </label>

                {fotosChegada.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {fotosChegada.map((url, idx) => (
                      <div key={idx} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                        <img src={url} alt="Foto devolução" className="w-full h-full object-cover" />
                        {!isVisualizar && (
                          <button
                            type="button"
                            onClick={() => setFotosChegada(fotosChegada.filter((_, i) => i !== idx))}
                            className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Nenhuma foto anexada na devolução.</p>
                )}
              </div>
            </div>
          )}

          {/* Botões do Rodapé */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Fechar
            </button>

            {!isVisualizar && (
              <button
                type="submit"
                disabled={loading || uploadingImage || uploadingComprovante}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer ${
                  mode === 'saida'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>
                  {mode === 'saida' && 'Liberar Veículo (Registrar Saída)'}
                  {mode === 'devolucao' && 'Finalizar Devolução & Baixar Franquia'}
                </span>
              </button>
            )}
          </div>

        </form>

      </div>
    </div>
  );
}
