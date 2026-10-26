import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Ship, User, Phone, Droplets,
  Search, Sparkles, Check, AlertCircle, ArrowDownCircle,
  Compass, Printer, Clock, MapPin, Users
} from 'lucide-react';
import { boatDB, clientDB } from '../db';
import { Embarcacao, Cliente } from '../types';
import { generateAvisoSaidaPDF } from '../utils/pdfGenerator';
import { getBoatCode } from '../utils/boatUtils';
import logoMarinaSrc from '../../logos/logo_marina.svg';

interface AdicionarFilaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reserva: any) => void;
}

const DESTINO_SUGESTOES = [
  'Ilha do Maroto',
  'Ilha do Rodeadouro',
  'Ponte Presidente Dutra'
];

export default function AdicionarFilaModal({
  isOpen,
  onClose,
  onSuccess
}: AdicionarFilaModalProps) {
  const [tipo, setTipo] = useState<'marina' | 'avulso'>('marina');

  // Marina boat
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [boatSearch, setBoatSearch] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  // Avulso fields
  const [nomeAvulso, setNomeAvulso] = useState('');
  const [telefoneAvulso, setTelefoneAvulso] = useState('');
  const [modeloAvulso, setModeloAvulso] = useState('');
  const [tipoAvulso, setTipoAvulso] = useState<'jet' | 'lancha'>('lancha');

  // Navigation Plan Fields (NORMAM-211)
  const [previsaoSaida, setPrevisaoSaida] = useState('');
  const [previsaoChegada, setPrevisaoChegada] = useState('17:00');
  const [destino, setDestino] = useState('');
  const [pessoasABordo, setPessoasABordo] = useState<number | string>(2);
  const [marinheiroPiloto, setMarinheiroPiloto] = useState('');

  // Marina Operational fields
  const [combustivelModo, setCombustivelModo] = useState<'nivel_atual' | 'tanque_cheio' | 'especifico'>('nivel_atual');
  const [litrosAbastecer, setLitrosAbastecer] = useState('');
  const [observacoesDescida, setObservacoesDescida] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'save' | 'print' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);

  useEffect(() => {
    if (isOpen) {
      setBoats(boatDB.getAll() || []);
      setClients(clientDB.getAll() || []);
      setSelectedBoatId('');
      setSelectedClienteId('');
      setBoatSearch('');
      setIsSelectOpen(false);
      setNomeAvulso('');
      setTelefoneAvulso('');
      setModeloAvulso('');
      setTipoAvulso('lancha');
      setCombustivelModo('nivel_atual');
      setLitrosAbastecer('');
      setObservacoesDescida('');
      setDestino('Ilha do Rodeadouro');
      setPessoasABordo(2);
      setMarinheiroPiloto('');
      setErrorMsg('');

      const now = new Date();
      const currentHour = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setPrevisaoSaida(currentHour);

      const returnTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      setPrevisaoChegada(returnTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [isOpen]);

  const isBoatMarina = (b: Embarcacao) => {
    const bEmpresas = b.empresas || ['VALE'];
    if (bEmpresas.includes('MARINA')) return true;
    return clients.some(c => 
      (c.embarcacaoId === b.id || (Array.isArray(c.embarcacoes) && c.embarcacoes.some(eb => eb.embarcacaoId === b.id)) || (Array.isArray(b.donos) && b.donos.includes(c.id))) &&
      (c.empresas || ['VALE']).includes('MARINA')
    );
  };

  const filteredBoats = useMemo(() => {
    const term = boatSearch.toLowerCase().trim();
    return boats.filter(b => {
      if (!isBoatMarina(b)) return false;
      return (
        !term ||
        b.nome.toLowerCase().includes(term) ||
        (b.vaga && b.vaga.toLowerCase().includes(term)) ||
        (b.modelo && b.modelo.toLowerCase().includes(term))
      );
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [boats, clients, boatSearch]);

  const selectedBoat = boats.find(b => b.id === selectedBoatId);

  // Identify owners/cotistas for the selected boat
  const boatOwners = useMemo(() => {
    if (!selectedBoat) return [];
    const directOwners: string[] = Array.isArray(selectedBoat.donos) ? [...selectedBoat.donos] : [];
    if (selectedBoat.clienteId && !directOwners.includes(selectedBoat.clienteId)) {
      directOwners.push(selectedBoat.clienteId);
    }
    const matched = clients.filter(c => 
      directOwners.includes(c.id) ||
      (Array.isArray(c.embarcacoes) && c.embarcacoes.some(eb => eb.embarcacaoId === selectedBoat.id))
    );
    return matched;
  }, [selectedBoat, clients]);

  // Update default client and capacity when boat changes
  const handleSelectBoat = (boat: Embarcacao) => {
    setSelectedBoatId(boat.id);
    setIsSelectOpen(false);

    // Auto-select first owner
    const owners: string[] = Array.isArray(boat.donos) ? [...boat.donos] : [];
    if (boat.clienteId && !owners.includes(boat.clienteId)) owners.push(boat.clienteId);
    const firstClient = clients.find(c => owners.includes(c.id) || (Array.isArray(c.embarcacoes) && c.embarcacoes.some(eb => eb.embarcacaoId === boat.id)));
    if (firstClient) {
      setSelectedClienteId(firstClient.id);
      setMarinheiroPiloto(firstClient.nome);
    } else {
      setSelectedClienteId('');
      setMarinheiroPiloto('');
    }

    if (boat.capacidadePassageiros) {
      setPessoasABordo(Math.min(2, boat.capacidadePassageiros));
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClienteId);

  const handleSubmit = async (action: 'save' | 'print') => {
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
    setLoadingAction(action);

    const payload = {
      embarcacaoId: tipo === 'marina' ? selectedBoatId : 'embarcacao_avulsa',
      clienteId: tipo === 'marina' ? (selectedClienteId || selectedBoat?.donos?.[0] || selectedBoat?.clienteId || 'cliente_marina') : 'cliente_avulso',
      origem: tipo,
      nomeAvulso: tipo === 'avulso' ? nomeAvulso.trim() : null,
      telefoneAvulso: tipo === 'avulso' ? telefoneAvulso.trim() : null,
      modeloAvulso: tipo === 'avulso' ? modeloAvulso.trim() : null,
      tipoAvulso: tipo === 'avulso' ? tipoAvulso : (selectedBoat?.tipo || 'lancha'),
      previsaoSaida: previsaoSaida || null,
      previsaoChegada: previsaoChegada || null,
      destino: destino.trim() || 'Ilha do Rodeadouro',
      pessoasABordo: pessoasABordo ? Number(pessoasABordo) : 2,
      marinheiroPiloto: marinheiroPiloto.trim() || null,
      acessoriosSolicitados: null,
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

      // If user chose to print the navigation plan immediately
      if (action === 'print') {
        try {
          const now = new Date();
          const day = String(now.getDate()).padStart(2, '0');
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const year = now.getFullYear();
          const formattedDate = `${day} / ${month} / ${year}`;

          const effectiveClientName = tipo === 'marina' 
            ? (selectedClient?.nome || selectedBoat?.nome || 'Cliente')
            : (nomeAvulso.trim() || 'Visitante Avulso');

          const effectiveBoatCode = tipo === 'marina' && selectedBoat
            ? getBoatCode(selectedBoat)
            : (modeloAvulso.trim() || 'Embarcação');

          const effectiveBoatType = (tipo === 'avulso' ? tipoAvulso : selectedBoat?.tipo) === 'jet' ? 'Jetski' : 'Lancha';

          const savedLogo = localStorage.getItem('avisos_saida_customLogo');
          const savedLogoOption = localStorage.getItem('avisos_saida_logoOption');
          let effectiveLogo: string | undefined;
          if (savedLogoOption === 'empty') {
            effectiveLogo = 'empty';
          } else if (savedLogoOption === 'custom' && savedLogo) {
            effectiveLogo = savedLogo;
          } else {
            effectiveLogo = logoMarinaSrc;
          }

          const effectiveBanner = localStorage.getItem('avisos_saida_bannerText') || 'MARINA CLUB VELHO CHICO';

          await generateAvisoSaidaPDF({
            data: formattedDate,
            nome: effectiveClientName,
            tipo: effectiveBoatType,
            nomeEmbarcacao: effectiveBoatCode,
            pessoasABordo: String(pessoasABordo || '02').padStart(2, '0'),
            destino: destino.trim() || 'Ilha do Rodeadouro',
            previsaoSaida: previsaoSaida || '09:00',
            previsaoChegada: previsaoChegada || '17:00',
            observacao: observacoesDescida.trim() || 'Nenhuma'
          }, {
            autoPrint: true,
            logoUrl: effectiveLogo,
            bannerText: effectiveBanner
          });
        } catch (pdfErr) {
          console.error('Erro ao gerar PDF do aviso de saída:', pdfErr);
        }
      }

      onSuccess(json.reservation);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar inclusão na fila.');
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden text-slate-800 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Executive & Quiet */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#B69D74]/15 text-[#B69D74] flex items-center justify-center border border-[#B69D74]/20">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Inserir Embarcação na Fila de Descida
              </h2>
              <p className="text-xs text-slate-500">
                Inclusão imediata no trator com Plano de Navegação (NORMAM-211)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto subtle-scrollbar text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Origem Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTipo('marina')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tipo === 'marina'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ship className="w-4 h-4 text-[#B69D74]" />
              <span>Embarcação da Marina</span>
            </button>
            <button
              type="button"
              onClick={() => setTipo('avulso')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tipo === 'avulso'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Visitante Avulso / Rampa</span>
            </button>
          </div>

          {/* Section 1: Embarcação e Cliente */}
          {tipo === 'marina' ? (
            <div className="space-y-3">
              <div className="relative">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Selecione o Barco da Marina <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsSelectOpen(!isSelectOpen)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B69D74]/20 shadow-xs"
                >
                  {selectedBoat ? (
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-extrabold text-slate-900">{selectedBoat.nome}</span>
                      {selectedBoat.vaga && <span className="text-[#B69D74] font-bold">• Vaga {selectedBoat.vaga}</span>}
                      {selectedBoat.modelo && <span className="text-slate-400 font-normal">({selectedBoat.modelo})</span>}
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
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-[#B69D74]"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1 space-y-0.5 subtle-scrollbar">
                      {filteredBoats.length > 0 ? (
                        filteredBoats.map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelectBoat(b)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left cursor-pointer transition-colors ${
                              b.id === selectedBoatId ? 'bg-[#B69D74]/10 text-slate-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="truncate font-semibold">{b.nome}</div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {b.vaga && <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">Vaga {b.vaga}</span>}
                              <span className="text-[9px] font-extrabold bg-[#B69D74]/15 text-[#8f774e] px-1.5 py-0.5 rounded uppercase">Marina</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400">
                          Nenhuma embarcação vinculada à Marina encontrada.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Seletor de Cotista / Responsável se houver cotistas */}
              {selectedBoat && boatOwners.length > 0 && (
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#B69D74]" />
                      <span>Responsável / Cotista a Bordo:</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {boatOwners.length > 1 ? `${boatOwners.length} cotistas vinculados` : 'Proprietário único'}
                    </span>
                  </div>

                  {boatOwners.length === 1 ? (
                    <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="font-bold text-slate-900">{boatOwners[0].nome}</span>
                      {boatOwners[0].telefone && (
                        <span className="text-slate-500 font-medium">{boatOwners[0].telefone}</span>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {boatOwners.map(owner => (
                        <button
                          key={owner.id}
                          type="button"
                          onClick={() => {
                            setSelectedClienteId(owner.id);
                            setMarinheiroPiloto(owner.nome);
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            selectedClienteId === owner.id
                              ? 'bg-[#B69D74]/10 border-[#B69D74] text-slate-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <span className="truncate">{owner.nome}</span>
                          {selectedClienteId === owner.id && (
                            <Check className="w-3.5 h-3.5 text-[#B69D74] shrink-0 ml-1.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nome do Visitante / Dono <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nome completo do responsável"
                    value={nomeAvulso}
                    onChange={(e) => {
                      setNomeAvulso(e.target.value);
                      if (!marinheiroPiloto) setMarinheiroPiloto(e.target.value);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#B69D74]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Telefone para Contato
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={telefoneAvulso}
                    onChange={(e) => setTelefoneAvulso(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#B69D74]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Modelo ou Nome da Embarcação <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Lancha Coral 26 / Jet GTI 130"
                    value={modeloAvulso}
                    onChange={(e) => setModeloAvulso(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#B69D74]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tipo de Embarcação
                  </label>
                  <select
                    value={tipoAvulso}
                    onChange={(e) => setTipoAvulso(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#B69D74]"
                  >
                    <option value="lancha">Lancha</option>
                    <option value="jet">Jetski</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Dados do Plano de Navegação (NORMAM-211) */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#B69D74]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Plano de Navegação • NORMAM-211
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Geração automática do Anexo 4-A
              </span>
            </div>

            {/* Horários e Pessoas a Bordo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Saída Prevista
                </label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="time"
                    value={previsaoSaida}
                    onChange={(e) => setPrevisaoSaida(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#B69D74]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Retorno Previsto
                </label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="time"
                    value={previsaoChegada}
                    onChange={(e) => setPrevisaoChegada(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#B69D74]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Pessoas a Bordo
                  </label>
                  {selectedBoat?.capacidadePassageiros && (
                    <span className="text-[10px] text-slate-400">
                      Cap: {selectedBoat.capacidadePassageiros}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Users className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="number"
                    min="1"
                    max={selectedBoat?.capacidadePassageiros || 20}
                    value={pessoasABordo}
                    onChange={(e) => setPessoasABordo(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#B69D74]"
                  />
                </div>
              </div>
            </div>

            {/* Destino Previsto com Sugestões Rápidas */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#B69D74]" />
                  <span>Destino Previsto</span>
                </label>
                <span className="text-[10px] text-slate-400">Clique para preencher rápido</span>
              </div>
              <input
                type="text"
                placeholder="Ex: Ilha do Maroto, Ilha do Rodeadouro, Ponte Presidente Dutra..."
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#B69D74] mb-2"
              />
              <div className="flex flex-wrap gap-1.5">
                {DESTINO_SUGESTOES.map(sugestao => (
                  <button
                    key={sugestao}
                    type="button"
                    onClick={() => setDestino(sugestao)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                      destino === sugestao
                        ? 'bg-[#B69D74] text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>

            {/* Condutor / Marinheiro */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Comandante / Marinheiro Condutor
              </label>
              <input
                type="text"
                placeholder="Nome do marinheiro ou 'O próprio cliente'"
                value={marinheiroPiloto}
                onChange={(e) => setMarinheiroPiloto(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#B69D74]"
              />
            </div>
          </div>

          {/* Section 3: Operação da Marina (Combustível & Observações) */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
              Instruções de Rampa / Trator
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Combustível Prévio
                </label>
                <select
                  value={combustivelModo}
                  onChange={(e) => setCombustivelModo(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#B69D74]"
                >
                  <option value="nivel_atual">Descer no Nível Atual</option>
                  <option value="tanque_cheio">Completar Tanque Cheio</option>
                  <option value="especifico">Abastecer Litros Específicos</option>
                </select>
              </div>

              {combustivelModo === 'especifico' ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Litros a Abastecer:
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 40"
                    value={litrosAbastecer}
                    onChange={(e) => setLitrosAbastecer(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#B69D74]"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Observação de Descida
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cliente aguardando no píer..."
                    value={observacoesDescida}
                    onChange={(e) => setObservacoesDescida(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#B69D74]"
                  />
                </div>
              )}
            </div>

            {combustivelModo === 'especifico' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Observação de Descida
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cliente aguardando no píer..."
                  value={observacoesDescida}
                  onChange={(e) => setObservacoesDescida(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#B69D74]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit('save')}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading && loadingAction === 'save' ? (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowDownCircle className="w-4 h-4 text-slate-500" />
              )}
              <span>Adicionar na Fila</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('print')}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-[#B69D74] hover:bg-[#a38b63] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-[#B69D74]/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading && loadingAction === 'print' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>Adicionar e Imprimir Plano NORMAM</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
