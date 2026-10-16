import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Anchor, Ship, User, Phone, Droplets,
  Search, Sparkles, Check, AlertCircle, ArrowDownCircle
} from 'lucide-react';
import { boatDB, clientDB } from '../db';
import { Embarcacao, Cliente } from '../types';

interface AdicionarFilaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reserva: any) => void;
}

export default function AdicionarFilaModal({
  isOpen,
  onClose,
  onSuccess
}: AdicionarFilaModalProps) {
  const [tipo, setTipo] = useState<'marina' | 'avulso'>('marina');

  // Marina boat
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [boatSearch, setBoatSearch] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  // Avulso fields
  const [nomeAvulso, setNomeAvulso] = useState('');
  const [telefoneAvulso, setTelefoneAvulso] = useState('');
  const [modeloAvulso, setModeloAvulso] = useState('');
  const [tipoAvulso, setTipoAvulso] = useState<'jet' | 'lancha'>('lancha');

  // Shared
  const [previsaoSaida, setPrevisaoSaida] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  });
  const [combustivelModo, setCombustivelModo] = useState<'nivel_atual' | 'tanque_cheio' | 'especifico'>('nivel_atual');
  const [litrosAbastecer, setLitrosAbastecer] = useState('');
  const [observacoesDescida, setObservacoesDescida] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);

  useEffect(() => {
    if (isOpen) {
      setBoats(boatDB.getAll() || []);
      setClients(clientDB.getAll() || []);
      setSelectedBoatId('');
      setBoatSearch('');
      setIsSelectOpen(false);
      setNomeAvulso('');
      setTelefoneAvulso('');
      setModeloAvulso('');
      setTipoAvulso('lancha');
      setCombustivelModo('nivel_atual');
      setLitrosAbastecer('');
      setObservacoesDescida('');
      setErrorMsg('');
      const now = new Date();
      setPrevisaoSaida(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [isOpen]);

  const filteredBoats = useMemo(() => {
    const term = boatSearch.toLowerCase().trim();
    return boats.filter(b => {
      return !term || b.nome.toLowerCase().includes(term) || (b.vaga && b.vaga.toLowerCase().includes(term)) || (b.modelo && b.modelo.toLowerCase().includes(term));
    }).sort((a, b) => {
      const aIsMarina = a.empresas?.includes('MARINA') ? 1 : 0;
      const bIsMarina = b.empresas?.includes('MARINA') ? 1 : 0;
      if (aIsMarina !== bIsMarina) return bIsMarina - aIsMarina;
      return a.nome.localeCompare(b.nome);
    });
  }, [boats, boatSearch]);

  const selectedBoat = boats.find(b => b.id === selectedBoatId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (tipo === 'marina' && !selectedBoatId) {
      setErrorMsg('Selecione uma embarcação da marina.');
      return;
    }

    if (tipo === 'avulso') {
      if (!nomeAvulso.trim()) {
        setErrorMsg('Informe o nome do cliente.');
        return;
      }
      if (!modeloAvulso.trim()) {
        setErrorMsg('Informe o modelo/nome do barco.');
        return;
      }
    }

    setLoading(true);

    const payload = {
      embarcacaoId: tipo === 'marina' ? selectedBoatId : 'embarcacao_avulsa',
      clienteId: tipo === 'marina' ? (selectedBoat?.donos?.[0] || selectedBoat?.clienteId || 'cliente_marina') : 'cliente_avulso',
      origem: tipo,
      nomeAvulso: tipo === 'avulso' ? nomeAvulso.trim() : null,
      telefoneAvulso: tipo === 'avulso' ? telefoneAvulso.trim() : null,
      modeloAvulso: tipo === 'avulso' ? modeloAvulso.trim() : null,
      tipoAvulso: tipo === 'avulso' ? tipoAvulso : (selectedBoat?.tipo || 'lancha'),
      previsaoSaida: previsaoSaida || null,
      combustivelInicial: combustivelModo === 'tanque_cheio' ? 'tanque_cheio' : combustivelModo === 'especifico' ? 'abastecer_previamente' : 'descer_como_esta',
      litrosAbastecerPrevio: combustivelModo === 'especifico' && litrosAbastecer ? litrosAbastecer : null,
      observacoesDescida: observacoesDescida.trim() || null
    };

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/marina/fila/adicionar-imediato', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Erro ao colocar barco na fila.');

      onSuccess(json.reservation);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Colocar na Fila de Descida Imediata
              </h2>
              <p className="text-[11px] text-slate-500">
                Adiciona o barco na ordem do trator/rampa para hoje
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto subtle-scrollbar">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Toggle Type */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTipo('marina')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tipo === 'marina'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ship className="w-3.5 h-3.5" />
              <span>Embarcação da Marina</span>
            </button>
            <button
              type="button"
              onClick={() => setTipo('avulso')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tipo === 'avulso'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Visitante Avulso</span>
            </button>
          </div>

          {/* Marina Boat Selector */}
          {tipo === 'marina' ? (
            <div className="relative">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Selecione o Barco da Marina *
              </label>
              <button
                type="button"
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
              >
                {selectedBoat ? (
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-extrabold text-slate-900">{selectedBoat.nome}</span>
                    {selectedBoat.vaga && <span className="text-blue-600 font-bold">• Vaga {selectedBoat.vaga}</span>}
                  </div>
                ) : (
                  <span className="text-slate-400">Buscar barco por nome, vaga ou modelo...</span>
                )}
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {isSelectOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Filtrar barco ou vaga..."
                      value={boatSearch}
                      onChange={(e) => setBoatSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1 space-y-0.5 subtle-scrollbar">
                    {filteredBoats.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSelectedBoatId(b.id);
                          setIsSelectOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left cursor-pointer transition-colors ${
                          b.id === selectedBoatId ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="truncate font-semibold">{b.nome}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {b.vaga && <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">Vaga {b.vaga}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Avulso Inputs */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nome do Visitante *
                </label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={nomeAvulso}
                  onChange={(e) => setNomeAvulso(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={telefoneAvulso}
                    onChange={(e) => setTelefoneAvulso(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Modelo do Barco *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Jet Sea-Doo"
                    value={modeloAvulso}
                    onChange={(e) => setModeloAvulso(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Time & Fuel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Horário Previsto para Saída
              </label>
              <input
                type="time"
                value={previsaoSaida}
                onChange={(e) => setPrevisaoSaida(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Combustível Prévio
              </label>
              <select
                value={combustivelModo}
                onChange={(e) => setCombustivelModo(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="nivel_atual">Descer no Nível Atual</option>
                <option value="tanque_cheio">Completar Tanque Cheio</option>
                <option value="especifico">Abastecer Litros Específicos</option>
              </select>
            </div>
          </div>

          {combustivelModo === 'especifico' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Litros a Abastecer Antes da Descida:
              </label>
              <input
                type="number"
                placeholder="Ex: 40"
                value={litrosAbastecer}
                onChange={(e) => setLitrosAbastecer(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Observação para a Rampa / Trator
            </label>
            <input
              type="text"
              placeholder="Ex: Cliente aguardando no píer..."
              value={observacoesDescida}
              onChange={(e) => setObservacoesDescida(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowDownCircle className="w-4 h-4" />
              )}
              <span>Adicionar na Fila</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
