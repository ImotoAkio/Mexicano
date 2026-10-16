import React, { useState, useEffect } from 'react';
import { X, Truck, Gauge, AlertTriangle, CheckCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { UtvVeiculo } from '../../types';
import { fetchWithAuth } from '../../utils/apiAuth';
import { formatHorimetroDecimal } from '../../utils/utvUtils';

interface UtvVeiculoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  veiculoToEdit?: UtvVeiculo | null;
}

export default function UtvVeiculoModal({
  isOpen,
  onClose,
  onSuccess,
  veiculoToEdit
}: UtvVeiculoModalProps) {
  const [nome, setNome] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState<number | ''>(new Date().getFullYear());
  const [placaChassi, setPlacaChassi] = useState('');
  const [kmAtual, setKmAtual] = useState<number | ''>(0);
  const [horimetroAtual, setHorimetroAtual] = useState<number | ''>(0);
  const [status, setStatus] = useState<'disponivel' | 'em_uso' | 'manutencao'>('disponivel');
  const [imagemUrl, setImagemUrl] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (veiculoToEdit) {
        setNome(veiculoToEdit.nome || '');
        setModelo(veiculoToEdit.modelo || '');
        setAno(veiculoToEdit.ano || new Date().getFullYear());
        setPlacaChassi(veiculoToEdit.placa_chassi || '');
        setKmAtual(veiculoToEdit.kmAtual !== undefined ? veiculoToEdit.kmAtual : 0);
        setHorimetroAtual(veiculoToEdit.horimetroAtual !== undefined ? veiculoToEdit.horimetroAtual : 0);
        setStatus(veiculoToEdit.status || 'disponivel');
        setImagemUrl(veiculoToEdit.imagemUrl || '');
        setObservacoes(veiculoToEdit.observacoes || '');
      } else {
        setNome('UTV Can-Am Maverick X3');
        setModelo('Maverick X3 Turbo');
        setAno(new Date().getFullYear());
        setPlacaChassi('');
        setKmAtual(0);
        setHorimetroAtual(0);
        setStatus('disponivel');
        setImagemUrl('');
        setObservacoes('');
      }
    }
  }, [isOpen, veiculoToEdit]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetchWithAuth('/api/upload/boat-image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setImagemUrl(data.imageUrl);
      } else {
        setError(data.message || 'Erro ao enviar foto do veículo.');
      }
    } catch (err: any) {
      setError('Falha ao enviar imagem: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) {
      setError('O nome do veículo é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth('/api/utv/veiculos/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: veiculoToEdit?.id,
          nome,
          modelo,
          ano: ano !== '' ? Number(ano) : null,
          placa_chassi: placaChassi,
          kmAtual: kmAtual !== '' ? Number(kmAtual) : 0,
          horimetroAtual: horimetroAtual !== '' ? Number(horimetroAtual) : 0,
          status,
          imagemUrl,
          observacoes
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.message || 'Erro ao salvar veículo UTV.');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação ao salvar veículo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Truck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {veiculoToEdit ? 'Editar Veículo UTV' : 'Novo Veículo UTV'}
              </h3>
              <p className="text-xs text-slate-300">Cadastro da máquina de trilha e métricas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-700 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome e Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nome do Veículo
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Ex: UTV Can-Am 01"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Modelo / Fabricante
              </label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ex: Can-Am Maverick X3"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>
          </div>

          {/* Ano e Placa/Chassi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Ano de Fabricação
              </label>
              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2024"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                N° Chassi / Placa
              </label>
              <input
                type="text"
                value={placaChassi}
                onChange={(e) => setPlacaChassi(e.target.value)}
                placeholder="Ex: 3JBL... / ABC-1234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>
          </div>

          {/* Métricas: KM e Horímetro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Quilometragem Atual (KM)
              </label>
              <input
                type="number"
                step="0.1"
                value={kmAtual}
                onChange={(e) => setKmAtual(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.0"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Horímetro Atual (Horas decimais)
              </label>
              <input
                type="number"
                step="0.1"
                value={horimetroAtual}
                onChange={(e) => setHorimetroAtual(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.0"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
              <span className="text-[10px] text-amber-700 font-medium block mt-1">
                {horimetroAtual !== '' ? formatHorimetroDecimal(Number(horimetroAtual)) : '0.0 h'}
              </span>
            </div>
          </div>

          {/* Status Operacional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Status Operacional
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            >
              <option value="disponivel">Disponível para Trilha</option>
              <option value="em_uso">Em Uso (Em Trilha)</option>
              <option value="manutencao">Em Manutenção / Revisão</option>
            </select>
          </div>

          {/* Foto do UTV */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
              <span>Foto do Veículo</span>
              <label className="text-xs text-amber-600 hover:text-amber-800 font-bold flex items-center space-x-1 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Imagem</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
            </label>
            {imagemUrl && (
              <div className="mt-2 w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                <img src={imagemUrl} alt="UTV" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Observações Adicionais
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Detalhes mecânicos, histórico de revisão, acessórios instalados..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </div>

          {/* Botões */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              )}
              <span>Salvar Veículo</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
