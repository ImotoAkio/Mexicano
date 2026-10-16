import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { UtvCotista, Cliente } from '../../types';
import { fetchWithAuth } from '../../utils/apiAuth';
import { clientDB } from '../../db';

interface UtvCotistaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cotistaToEdit?: UtvCotista | null;
}

export default function UtvCotistaModal({
  isOpen,
  onClose,
  onSuccess,
  cotistaToEdit
}: UtvCotistaModalProps) {
  const [nome, setNome] = useState('');
  const [cotaNumero, setCotaNumero] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [limiteDiasAnual, setLimiteDiasAnual] = useState<number>(30);
  const [anoExercicio, setAnoExercicio] = useState<number>(new Date().getFullYear());
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [selectedClienteId, setSelectedClienteId] = useState('');

  const [clientesBase, setClientesBase] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setClientesBase(clientDB.getAll() || []);

      if (cotistaToEdit) {
        setNome(cotistaToEdit.nome || '');
        setCotaNumero(cotistaToEdit.cotaNumero || '');
        setTelefone(cotistaToEdit.telefone || '');
        setEmail(cotistaToEdit.email || '');
        setCpf(cotistaToEdit.cpf || '');
        setLimiteDiasAnual(cotistaToEdit.limiteDiasAnual !== undefined ? cotistaToEdit.limiteDiasAnual : 30);
        setAnoExercicio(cotistaToEdit.anoExercicio || new Date().getFullYear());
        setStatus(cotistaToEdit.status || 'ativo');
        setSelectedClienteId(cotistaToEdit.clienteId || '');
      } else {
        setNome('');
        setCotaNumero('Cota 01');
        setTelefone('');
        setEmail('');
        setCpf('');
        setLimiteDiasAnual(30);
        setAnoExercicio(new Date().getFullYear());
        setStatus('ativo');
        setSelectedClienteId('');
      }
    }
  }, [isOpen, cotistaToEdit]);

  if (!isOpen) return null;

  // Quando seleciona um cliente da base náutica existente, preenche os dados automaticamente
  const handleSelectClienteExistente = (clienteId: string) => {
    setSelectedClienteId(clienteId);
    if (!clienteId) return;
    const cli = clientesBase.find(c => c.id === clienteId);
    if (cli) {
      setNome(cli.nome);
      if (cli.telefone) setTelefone(cli.telefone);
      if (cli.email) setEmail(cli.email);
      if (cli.cpf) setCpf(cli.cpf);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !cotaNumero) {
      setError('Nome e número da cota são obrigatórios.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth('/api/utv/cotistas/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cotistaToEdit?.id,
          clienteId: selectedClienteId || null,
          nome,
          cotaNumero,
          telefone,
          email,
          cpf,
          limiteDiasAnual: Number(limiteDiasAnual) || 30,
          anoExercicio: Number(anoExercicio) || new Date().getFullYear(),
          status
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.message || 'Erro ao salvar cotista.');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação ao salvar cotista.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {cotistaToEdit ? 'Editar Cotista UTV' : 'Novo Cotista UTV'}
              </h3>
              <p className="text-xs text-amber-100">Controle de franquia anual (30 dias) e cotas</p>
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

          {/* Importar de Cliente Existente */}
          {clientesBase.length > 0 && !cotistaToEdit && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Vincular a Cliente Existente da Base Náutica (Opcional)
              </label>
              <select
                value={selectedClienteId}
                onChange={(e) => handleSelectClienteExistente(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
              >
                <option value="">Nenhum (Cadastrar cotista avulso)</option>
                {clientesBase.map(cli => (
                  <option key={cli.id} value={cli.id}>
                    {cli.nome} {cli.cpf ? `(CPF: ${cli.cpf})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nome e Cota */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nome do Cotista
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Ex: João da Silva"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Identificação da Cota
              </label>
              <input
                type="text"
                value={cotaNumero}
                onChange={(e) => setCotaNumero(e.target.value)}
                required
                placeholder="Ex: Cota 01, Cota A..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>
          </div>

          {/* Telefone e Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>
          </div>

          {/* CPF */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              CPF
            </label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </div>

          {/* Franquia de Dias e Ano de Exercício */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-200">
            <div>
              <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                Limite Anual de Dias
              </label>
              <input
                type="number"
                value={limiteDiasAnual}
                onChange={(e) => setLimiteDiasAnual(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-black text-amber-900"
              />
              <span className="text-[10px] text-amber-700 mt-1 block">
                Padrão operacional: 30 dias por ano
              </span>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                Ano de Exercício
              </label>
              <input
                type="number"
                value={anoExercicio}
                onChange={(e) => setAnoExercicio(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-black text-amber-900"
              />
              <span className="text-[10px] text-amber-700 mt-1 block">
                Ano vigente da cota
              </span>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Status do Cotista
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="ativo">Ativo (Habilitado para reservas)</option>
              <option value="inativo">Inativo (Bloqueado)</option>
            </select>
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
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>Salvar Cotista</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
