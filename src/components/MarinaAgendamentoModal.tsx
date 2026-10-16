import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Calendar, Clock, Anchor, Ship, User, Phone,
  Droplets, Users, MapPin, Compass, AlertCircle,
  CheckCircle2, Search, Sparkles, Plus, Save
} from 'lucide-react';
import { boatDB, clientDB } from '../db';
import { Embarcacao, Cliente } from '../types';
import { getBoatCode } from '../utils/boatUtils';

interface MarinaAgendamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reserva: any) => void;
  editingAgendamento?: any | null;
  initialDate?: string;
}

export default function MarinaAgendamentoModal({
  isOpen,
  onClose,
  onSuccess,
  editingAgendamento = null,
  initialDate
}: MarinaAgendamentoModalProps) {
  const [tipoAgendamento, setTipoAgendamento] = useState<'marina' | 'avulso'>('marina');

  // Marina Boat state
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [boatSearch, setBoatSearch] = useState('');
  const [isBoatSelectOpen, setIsBoatSelectOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');

  // Avulso fields
  const [nomeAvulso, setNomeAvulso] = useState('');
  const [telefoneAvulso, setTelefoneAvulso] = useState('');
  const [modeloAvulso, setModeloAvulso] = useState('');
  const [tipoAvulso, setTipoAvulso] = useState<'jet' | 'lancha'>('lancha');

  // Shared fields
  const [data, setData] = useState(() => initialDate || new Date().toISOString().split('T')[0]);
  const [previsaoSaida, setPrevisaoSaida] = useState('09:00');
  const [previsaoChegada, setPrevisaoChegada] = useState('');
  const [marinheiroPiloto, setMarinheiroPiloto] = useState('');
  const [destino, setDestino] = useState('');
  const [pessoasABordo, setPessoasABordo] = useState('');

  // Fuel preparation
  const [combustivelModo, setCombustivelModo] = useState<'nivel_atual' | 'tanque_cheio' | 'especifico'>('nivel_atual');
  const [litrosAbastecer, setLitrosAbastecer] = useState('');

  // Accessories & Notes
  const [acessorios, setAcessorios] = useState({
    gelo: false,
    churrasqueira: false,
    tenda: false,
    mesa: false
  });
  const [observacoesDescida, setObservacoesDescida] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load boats and clients from local DB
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);

  useEffect(() => {
    if (isOpen) {
      const allBoats = boatDB.getAll() || [];
      const allClients = clientDB.getAll() || [];
      setBoats(allBoats);
      setClients(allClients);

      if (editingAgendamento) {
        const isAv = editingAgendamento.origem === 'avulso';
        setTipoAgendamento(isAv ? 'avulso' : 'marina');
        setSelectedBoatId(editingAgendamento.embarcacaoId || '');
        setSelectedClientId(editingAgendamento.clienteId || '');
        setNomeAvulso(editingAgendamento.nomeAvulso || '');
        setTelefoneAvulso(editingAgendamento.telefoneAvulso || '');
        setModeloAvulso(editingAgendamento.modeloAvulso || '');
        setTipoAvulso(editingAgendamento.tipoAvulso || 'lancha');
        setData(editingAgendamento.data || new Date().toISOString().split('T')[0]);
        setPrevisaoSaida(editingAgendamento.previsaoSaida || '09:00');
        setPrevisaoChegada(editingAgendamento.previsaoChegada || '');
        setMarinheiroPiloto(editingAgendamento.marinheiroPiloto || '');
        setDestino(editingAgendamento.destino || '');
        setPessoasABordo(editingAgendamento.pessoasABordo?.toString() || '');
        setCombustivelModo(editingAgendamento.combustivelInicial === 'tanque_cheio' ? 'tanque_cheio' : editingAgendamento.litrosAbastecerPrevio ? 'especifico' : 'nivel_atual');
        setLitrosAbastecer(editingAgendamento.litrosAbastecerPrevio || '');
        setObservacoesDescida(editingAgendamento.observacoesDescida || editingAgendamento.observacoes || '');
      } else {
        setTipoAgendamento('marina');
        setSelectedBoatId('');
        setSelectedClientId('');
        setNomeAvulso('');
        setTelefoneAvulso('');
        setModeloAvulso('');
        setTipoAvulso('lancha');
        setData(initialDate || new Date().toISOString().split('T')[0]);
        setPrevisaoSaida('09:00');
        setPrevisaoChegada('');
        setMarinheiroPiloto('');
        setDestino('');
        setPessoasABordo('');
        setCombustivelModo('nivel_atual');
        setLitrosAbastecer('');
        setObservacoesDescida('');
        setAcessorios({ gelo: false, churrasqueira: false, tenda: false, mesa: false });
      }
      setErrorMsg('');
    }
  }, [isOpen, editingAgendamento, initialDate]);

  // When boat is picked, auto-populate client if boat has owner
  const handleSelectBoat = (boat: Embarcacao) => {
    setSelectedBoatId(boat.id);
    setIsBoatSelectOpen(false);
    if (boat.donos && boat.donos.length > 0) {
      setSelectedClientId(boat.donos[0]);
    } else if (boat.clienteId) {
      setSelectedClientId(boat.clienteId);
    } else {
      setSelectedClientId('');
    }
  };

  // Filter boats: prioritize MARINA boats or boats with vaga
  const filteredBoats = useMemo(() => {
    const term = boatSearch.toLowerCase().trim();
    return boats.filter(b => {
      const matchTerm = !term || b.nome.toLowerCase().includes(term) || (b.vaga && b.vaga.toLowerCase().includes(term)) || (b.modelo && b.modelo.toLowerCase().includes(term));
      return matchTerm;
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

    if (tipoAgendamento === 'marina' && !selectedBoatId) {
      setErrorMsg('Por favor, selecione uma embarcação da marina.');
      return;
    }

    if (tipoAgendamento === 'avulso') {
      if (!nomeAvulso.trim()) {
        setErrorMsg('Informe o nome do cliente/responsável visitante.');
        return;
      }
      if (!modeloAvulso.trim()) {
        setErrorMsg('Informe o modelo ou nome da embarcação avulsa.');
        return;
      }
    }

    if (!data) {
      setErrorMsg('Informe a data do agendamento.');
      return;
    }

    setLoading(true);

    const payload = {
      embarcacaoId: tipoAgendamento === 'marina' ? selectedBoatId : 'embarcacao_avulsa',
      clienteId: tipoAgendamento === 'marina' ? selectedClientId : 'cliente_avulso',
      origem: tipoAgendamento,
      nomeAvulso: tipoAgendamento === 'avulso' ? nomeAvulso.trim() : null,
      telefoneAvulso: tipoAgendamento === 'avulso' ? telefoneAvulso.trim() : null,
      modeloAvulso: tipoAgendamento === 'avulso' ? modeloAvulso.trim() : null,
      tipoAvulso: tipoAgendamento === 'avulso' ? tipoAvulso : (selectedBoat?.tipo || 'lancha'),
      data,
      previsaoSaida: previsaoSaida || null,
      previsaoChegada: previsaoChegada || null,
      marinheiroPiloto: marinheiroPiloto.trim() || null,
      destino: destino.trim() || null,
      pessoasABordo: pessoasABordo ? parseInt(pessoasABordo, 10) : null,
      combustivelInicial: combustivelModo === 'tanque_cheio' ? 'tanque_cheio' : combustivelModo === 'especifico' ? 'abastecer_previamente' : 'descer_como_esta',
      litrosAbastecerPrevio: combustivelModo === 'especifico' && litrosAbastecer ? litrosAbastecer : null,
      acessoriosSolicitados: acessorios,
      observacoesDescida: observacoesDescida.trim() || null
    };

    try {
      const token = localStorage.getItem('admin_token');
      const url = editingAgendamento
        ? `/api/marina/agendamentos/${editingAgendamento.id}`
        : `/api/marina/agendamentos`;
      const method = editingAgendamento ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Erro ao salvar agendamento.');
      }

      onSuccess(json.reservation);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingAgendamento ? 'Editar Agendamento de Descida' : 'Novo Agendamento de Descida'}
              </h2>
              <p className="text-xs text-slate-500">
                Programação de descida na rampa e preparação para o píer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 subtle-scrollbar">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Toggle: Marina vs Avulso */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Tipo de Embarcação
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setTipoAgendamento('marina')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tipoAgendamento === 'marina'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Ship className="w-4 h-4" />
                <span>Embarcação da Marina (Mensalista / Vaga)</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoAgendamento('avulso')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tipoAgendamento === 'avulso'
                    ? 'bg-white text-amber-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Visitante Avulso (Rampa Externa)</span>
              </button>
            </div>
          </div>

          {/* MARINA BOAT SELECTION */}
          {tipoAgendamento === 'marina' ? (
            <div className="space-y-3 p-4 rounded-xl bg-blue-50/40 border border-blue-100">
              <div className="relative">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1.5">
                  <span>Selecionar Embarcação da Marina *</span>
                  {selectedBoat?.vaga && (
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                      Vaga: {selectedBoat.vaga}
                    </span>
                  )}
                </label>

                {/* Dropdown trigger button */}
                <button
                  type="button"
                  onClick={() => setIsBoatSelectOpen(!isBoatSelectOpen)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs cursor-pointer"
                >
                  {selectedBoat ? (
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-extrabold text-slate-900">{selectedBoat.nome}</span>
                      <span className="text-slate-500 font-normal">({selectedBoat.modelo || selectedBoat.tipo})</span>
                      {selectedBoat.vaga && <span className="text-blue-600 font-bold">• Vaga {selectedBoat.vaga}</span>}
                    </div>
                  ) : (
                    <span className="text-slate-400">Clique para buscar barco por nome, vaga ou modelo...</span>
                  )}
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {/* Dropdown search container */}
                {isBoatSelectOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Filtrar por nome, modelo ou vaga..."
                        value={boatSearch}
                        onChange={(e) => setBoatSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1 space-y-0.5 subtle-scrollbar">
                      {filteredBoats.length > 0 ? (
                        filteredBoats.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelectBoat(b)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left cursor-pointer transition-colors ${
                              b.id === selectedBoatId ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-bold">{b.nome}</span>
                              <span className="text-[11px] text-slate-400">({b.modelo || b.tipo})</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {b.vaga && (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                  Vaga {b.vaga}
                                </span>
                              )}
                              {b.empresas?.includes('MARINA') && (
                                <span className="text-[9px] font-extrabold bg-blue-100 text-blue-700 px-1 py-0.2 rounded uppercase">
                                  Marina
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="p-3 text-center text-xs text-slate-400">Nenhuma embarcação encontrada.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Owner / Client select */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Proprietário / Responsável Vinculado
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="">Selecione o proprietário...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.telefone ? `(${c.telefone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* AVULSO FIELDS */
            <div className="space-y-3 p-4 rounded-xl bg-amber-50/50 border border-amber-200/80">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nome do Cliente / Responsável *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: Carlos Mendonça"
                      value={nomeAvulso}
                      onChange={(e) => setNomeAvulso(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="(74) 99999-9999"
                      value={telefoneAvulso}
                      onChange={(e) => setTelefoneAvulso(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Embarcação (Modelo / Nome) *
                  </label>
                  <div className="relative">
                    <Ship className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: Sea-Doo GTI / Fibrafort 240"
                      value={modeloAvulso}
                      onChange={(e) => setModeloAvulso(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tipo de Embarcação
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoAvulso('lancha')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        tipoAvulso === 'lancha'
                          ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Lancha
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoAvulso('jet')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        tipoAvulso === 'jet'
                          ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Jet Ski
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Date and Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Data da Descida *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Previsão de Descida / Saída *
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  value={previsaoSaida}
                  onChange={(e) => setPrevisaoSaida(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Previsão de Retorno
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  value={previsaoChegada}
                  onChange={(e) => setPrevisaoChegada(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Navigation & Pilot info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Marinheiro / Condutor
              </label>
              <input
                type="text"
                placeholder="Ex: Próprio dono / Marinheiro João"
                value={marinheiroPiloto}
                onChange={(e) => setMarinheiroPiloto(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Destino Estimado
              </label>
              <div className="relative">
                <Compass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ex: Ilha do Rodeadouro"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Pessoas a Bordo (NORMAM)
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  placeholder="Ex: 6"
                  min="1"
                  max="30"
                  value={pessoasABordo}
                  onChange={(e) => setPessoasABordo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Fuel Preparation Settings */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-600" />
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Preparação de Combustível Antes da Descida
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCombustivelModo('nivel_atual')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                  combustivelModo === 'nivel_atual'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="block font-bold">Descer no Nível Atual</span>
                <span className="text-[10px] opacity-80 block">Não abastecer previamente</span>
              </button>

              <button
                type="button"
                onClick={() => setCombustivelModo('tanque_cheio')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                  combustivelModo === 'tanque_cheio'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="block font-bold">Completar Tanque</span>
                <span className="text-[10px] opacity-80 block">Encher antes de descer na água</span>
              </button>

              <button
                type="button"
                onClick={() => setCombustivelModo('especifico')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                  combustivelModo === 'especifico'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="block font-bold">Litros Específicos</span>
                <span className="text-[10px] opacity-80 block">Informar quantidade exata</span>
              </button>
            </div>

            {combustivelModo === 'especifico' && (
              <div className="pt-2 animate-in fade-in duration-150">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Quantidade de Litros a Abastecer:
                </label>
                <input
                  type="number"
                  placeholder="Ex: 50"
                  value={litrosAbastecer}
                  onChange={(e) => setLitrosAbastecer(e.target.value)}
                  className="w-48 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Accessories Checkbox list */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Acessórios e Equipamentos Solicitados
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'gelo', label: 'Gelo' },
                { id: 'churrasqueira', label: 'Churrasqueira' },
                { id: 'tenda', label: 'Tenda' },
                { id: 'mesa', label: 'Mesa / Cadeiras' }
              ].map(item => (
                <label
                  key={item.id}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    (acessorios as any)[item.id] ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={(acessorios as any)[item.id]}
                    onChange={(e) => setAcessorios(prev => ({ ...prev, [item.id]: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Operational Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Observações para o Tratorista / Rampa / Píer
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Barco precisa de auxílio para manobrar na vaga, levar boia circular extra, conferir cabo de âncora..."
              value={observacoesDescida}
              onChange={(e) => setObservacoesDescida(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{editingAgendamento ? 'Salvar Alterações' : 'Confirmar Agendamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
