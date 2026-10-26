import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Lock,
  ArrowRightLeft,
  RotateCcw,
  History,
  Ship,
  User,
  Users,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Check,
  Tag,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { Embarcacao, Cliente, HistoricoCota, LeadComercial } from '../../types';
import { DEFAULT_MEXICANO_CLIENT_ID, isMexicanoClient, formatBoatName } from '../../utils/constants';
import { syncWithRemote, getAdminToken } from '../../db';
import { normalizeCotaCode } from '../../utils/cotaUtils';

export interface ComercialCotaTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedBoatId?: string | null;
  preselectedCota?: string | null;
  initialMode?: 'reserva' | 'repasse' | 'transferencia' | 'recompra' | 'historico';
  boats: Embarcacao[];
  clients: Cliente[];
  onSuccess?: () => void;
}

type ModalTab = 'reserva' | 'repasse' | 'transferencia' | 'historico';

export default function ComercialCotaTransferModal({
  isOpen,
  onClose,
  preselectedBoatId,
  preselectedCota,
  initialMode = 'reserva',
  boats = [],
  clients = [],
  onSuccess
}: ComercialCotaTransferModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>(() => {
    if (initialMode === 'repasse') return 'repasse';
    if (initialMode === 'historico') return 'historico';
    if (initialMode === 'recompra' || initialMode === 'transferencia') return 'transferencia';
    return 'reserva';
  });

  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [selectedCota, setSelectedCota] = useState<string>('C1');

  // Modo Reserva 48h
  const [leads, setLeads] = useState<LeadComercial[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedLeadNome, setSelectedLeadNome] = useState('');
  const [selectedLeadTelefone, setSelectedLeadTelefone] = useState('');
  const [vendedorNome, setVendedorNome] = useState(() => {
    return localStorage.getItem('admin_nome') || localStorage.getItem('admin_user') || 'Equipe Comercial';
  });
  const [motivoReserva, setMotivoReserva] = useState('Emissão de proposta e negociação comercial exclusiva de 48h');
  const [horasBloqueio, setHorasBloqueio] = useState<number>(48);

  // Modo Repasse
  const [isEmRepasse, setIsEmRepasse] = useState(true);
  const [valorRepasse, setValorRepasse] = useState<string>('');

  // Modo Transferência / Recompra
  const [tipoOperacao, setTipoOperacao] = useState<'recompra' | 'transferencia'>('recompra');
  const [targetClientId, setTargetClientId] = useState<string>('');
  const [valorNegociado, setValorNegociado] = useState<string>('');
  const [dataOperacao, setDataOperacao] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState<string>('');

  // Estados de feedback
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Histórico
  const [historicoList, setHistoricoList] = useState<HistoricoCota[]>([]);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState<boolean>(false);

  const getAuthHeader = (): Record<string, string> => {
    const token = getAdminToken() || localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Carregar Leads para a reserva
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingLeads(true);
    fetch('/api/leads', { headers: getAuthHeader() })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLeads(data);
        else if (data && Array.isArray(data.leads)) setLeads(data.leads);
      })
      .catch(err => console.error('Erro ao buscar leads:', err))
      .finally(() => setIsLoadingLeads(false));
  }, [isOpen]);

  // Carregar dados iniciais ao abrir
  useEffect(() => {
    if (!isOpen) return;

    const initialBoat = preselectedBoatId || (boats.length > 0 ? boats[0].id : '');
    setSelectedBoatId(initialBoat);
    setSelectedCota(preselectedCota ? normalizeCotaCode(preselectedCota) : 'C1');

    if (initialMode === 'repasse') setActiveTab('repasse');
    else if (initialMode === 'historico') setActiveTab('historico');
    else if (initialMode === 'recompra' || initialMode === 'transferencia') {
      setActiveTab('transferencia');
      setTipoOperacao(initialMode === 'transferencia' ? 'transferencia' : 'recompra');
    } else {
      setActiveTab('reserva');
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedLeadId('');
    setSelectedLeadNome('');
    setSelectedLeadTelefone('');
    setValorRepasse('');
    setValorNegociado('');
    setObservacoes('');

    if (initialBoat) {
      loadHistorico(initialBoat);
    }
  }, [isOpen, preselectedBoatId, preselectedCota, initialMode]);

  const loadHistorico = async (boatId?: string) => {
    setIsLoadingHistorico(true);
    try {
      const url = boatId
        ? `/api/comercial/cotas/historico?embarcacaoId=${encodeURIComponent(boatId)}`
        : '/api/comercial/cotas/historico';
      const res = await fetch(url, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setHistoricoList(data.historico || []);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de cotas:', err);
    } finally {
      setIsLoadingHistorico(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'historico' && isOpen) {
      loadHistorico(selectedBoatId || undefined);
    }
  }, [activeTab, isOpen, selectedBoatId]);

  // Embarcação atualmente selecionada
  const currentBoat = useMemo(() => {
    return boats.find(b => b.id === selectedBoatId) || null;
  }, [boats, selectedBoatId]);

  // Slots e Titulares da embarcação atual
  const boatCotasMap = useMemo(() => {
    const map = new Map<string, { clienteId: string; clienteNome: string; isMexicano: boolean; emRepasse?: boolean; valorRepasse?: number }>();
    if (!currentBoat) return map;

    clients.forEach(c => {
      if (c.status === 'inativo') return;
      const isMex = isMexicanoClient(c);

      let ebs: any[] = [];
      if (c.embarcacoes) {
        try {
          ebs = typeof c.embarcacoes === 'string' ? JSON.parse(c.embarcacoes) : c.embarcacoes;
        } catch (e) {
          ebs = [];
        }
      }

      if (Array.isArray(ebs) && ebs.length > 0) {
        ebs.forEach(eb => {
          if (eb && eb.embarcacaoId === currentBoat.id && eb.cota) {
            const code = normalizeCotaCode(eb.cota);
            map.set(code, {
              clienteId: c.id,
              clienteNome: c.nome,
              isMexicano: isMex,
              emRepasse: Boolean(eb.emRepasse),
              valorRepasse: eb.valorRepasse ? Number(eb.valorRepasse) : undefined
            });
          }
        });
      } else if (c.embarcacaoId === currentBoat.id && c.cota) {
        const code = normalizeCotaCode(c.cota);
        map.set(code, {
          clienteId: c.id,
          clienteNome: c.nome,
          isMexicano: isMex,
          emRepasse: Boolean(c.emRepasse),
          valorRepasse: (c as any).valorRepasse ? Number((c as any).valorRepasse) : undefined
        });
      }
    });

    return map;
  }, [currentBoat, clients]);

  // Lista de slots (C1 a C8 ou total configurado)
  const slotsList = useMemo(() => {
    const total = Math.max(4, Math.min(8, Number(currentBoat?.totalCotas) || 8));
    const list = [];
    for (let i = 1; i <= total; i++) {
      const slotCode = `C${i}`;
      const occupant = boatCotasMap.get(slotCode);
      const isDisponivel = !occupant || occupant.isMexicano;
      list.push({
        slot: slotCode,
        occupant,
        isDisponivel,
        isRepasse: Boolean(occupant?.emRepasse)
      });
    }
    return list;
  }, [currentBoat, boatCotasMap]);

  // Informações do titular atual da cota selecionada
  const currentOccupant = useMemo(() => {
    return boatCotasMap.get(normalizeCotaCode(selectedCota)) || null;
  }, [boatCotasMap, selectedCota]);

  // Atualizar valores do repasse ao trocar de cota
  useEffect(() => {
    if (currentOccupant && currentOccupant.emRepasse && currentOccupant.valorRepasse) {
      setValorRepasse(currentOccupant.valorRepasse.toString());
      setIsEmRepasse(true);
    } else if (currentBoat?.valorCota) {
      setValorRepasse(currentBoat.valorCota.toString());
      setIsEmRepasse(true);
    }
  }, [selectedCota, currentOccupant, currentBoat]);

  // Filtro de Leads para seleção rápida
  const filteredLeads = useMemo(() => {
    const term = leadSearch.toLowerCase().trim();
    if (!term) return leads.slice(0, 10);
    return leads.filter(l =>
      l.nome?.toLowerCase().includes(term) ||
      l.telefone?.includes(term) ||
      l.email?.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [leads, leadSearch]);

  // -------------------------------------------------------------
  // Ações de Submissão
  // -------------------------------------------------------------

  // 1. Criar Reserva Comercial 48h
  const handleCriarReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedBoatId) {
      setErrorMessage('Por favor, selecione uma embarcação.');
      return;
    }
    if (!selectedCota) {
      setErrorMessage('Selecione uma cota para reservar.');
      return;
    }
    if (!selectedLeadNome.trim()) {
      setErrorMessage('Informe o nome do Lead ou selecione um contato da lista.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        embarcacaoId: selectedBoatId,
        cota: normalizeCotaCode(selectedCota),
        leadId: selectedLeadId || undefined,
        leadNome: selectedLeadNome.trim(),
        vendedorNome: vendedorNome.trim(),
        motivoReserva: motivoReserva.trim(),
        horasExpiracao: horasBloqueio
      };

      const res = await fetch('/api/comercial/cotas-reservadas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || 'Falha ao reservar cota');
      }

      setSuccessMessage(`✅ Cota ${selectedCota} bloqueada com exclusividade por ${horasBloqueio}h para ${selectedLeadNome}!`);
      await syncWithRemote().catch(() => {});
      if (onSuccess) onSuccess();
      loadHistorico(selectedBoatId);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao realizar bloqueio de cota');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Salvar Status de Repasse
  const handleSalvarRepasse = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentOccupant || currentOccupant.isMexicano) {
      setErrorMessage('Apenas cotas já vendidas a clientes titulares podem ser colocadas em repasse.');
      return;
    }

    const valorLimpo = parseFloat(valorRepasse.replace(/\./g, '').replace(',', '.')) || 0;
    if (isEmRepasse && valorLimpo <= 0) {
      setErrorMessage('Informe o valor pedido na revenda da cota.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        clienteId: currentOccupant.clienteId,
        embarcacaoId: selectedBoatId,
        cota: normalizeCotaCode(selectedCota),
        emRepasse: isEmRepasse,
        valorRepasse: isEmRepasse ? valorLimpo : undefined
      };

      const res = await fetch('/api/comercial/cotas-repasse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || 'Falha ao atualizar repasse da cota');
      }

      setSuccessMessage(
        isEmRepasse
          ? `✅ Cota ${selectedCota} de ${currentOccupant.clienteNome} aberta para Repasse Comercial!`
          : `✅ Cota ${selectedCota} removida do repasse comercial.`
      );
      await syncWithRemote().catch(() => {});
      if (onSuccess) onSuccess();
      loadHistorico(selectedBoatId);
      setTimeout(() => {
        onClose();
      }, 1300);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao atualizar repasse');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Executar Recompra ou Transferência
  const handleExecutarTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedBoatId || !selectedCota) {
      setErrorMessage('Selecione a embarcação e a cota.');
      return;
    }

    if (!currentOccupant) {
      setErrorMessage('Esta cota não possui titular registrado.');
      return;
    }

    if (tipoOperacao === 'recompra' && currentOccupant.isMexicano) {
      setErrorMessage('Esta cota já pertence ao estoque próprio da El Mexicano.');
      return;
    }

    if (tipoOperacao === 'transferencia' && !targetClientId) {
      setErrorMessage('Selecione o cotista que receberá a cota.');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = tipoOperacao === 'recompra'
        ? '/api/comercial/cotas/recomprar'
        : '/api/comercial/cotas/transferir';

      const valorLimpo = parseFloat(valorNegociado.replace(/\./g, '').replace(',', '.')) || 0;

      const payload = {
        embarcacaoId: selectedBoatId,
        cota: normalizeCotaCode(selectedCota),
        clienteOrigemId: currentOccupant.clienteId,
        clienteDestinoId: tipoOperacao === 'transferencia' ? targetClientId : undefined,
        valor: valorLimpo,
        dataOperacao,
        observacoes: observacoes.trim()
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || 'Falha ao processar operação');
      }

      setSuccessMessage(
        tipoOperacao === 'recompra'
          ? `✅ Cota ${selectedCota} recomprada com sucesso para o estoque da El Mexicano!`
          : `✅ Cota ${selectedCota} transferida para o novo cotista!`
      );
      await syncWithRemote().catch(() => {});
      if (onSuccess) onSuccess();
      loadHistorico(selectedBoatId);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao processar transferência');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header no Padrão Vila Náutica */}
        <header className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D0A16] text-white flex items-center justify-center shadow-sm">
              {activeTab === 'reserva' ? (
                <Lock className="w-5 h-5 text-amber-300" />
              ) : activeTab === 'repasse' ? (
                <Tag className="w-5 h-5 text-sky-300" />
              ) : activeTab === 'transferencia' ? (
                <ArrowRightLeft className="w-5 h-5 text-emerald-300" />
              ) : (
                <History className="w-5 h-5 text-stone-300" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
                Gestão de Cota & Fração Náutica
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700">
                  {selectedCota}
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                {currentBoat ? `${currentBoat.nome} (${currentBoat.modelo || currentBoat.tipo})` : 'Selecione uma embarcação'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Abas */}
        <div className="px-6 border-b border-stone-200/70 bg-white flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('reserva')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'reserva'
                ? 'border-[#2D0A16] text-[#2D0A16] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Bloqueio 48h (Reserva)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('repasse')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'repasse'
                ? 'border-[#2D0A16] text-[#2D0A16] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Tag className="w-4 h-4 text-sky-500" />
            <span>Colocar em Repasse</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transferencia')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'transferencia'
                ? 'border-[#2D0A16] text-[#2D0A16] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
            <span>Transferência / Recompra</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'historico'
                ? 'border-[#2D0A16] text-[#2D0A16] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <History className="w-4 h-4 text-stone-500" />
            <span>Histórico</span>
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Seletor de Embarcação e Cota */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                Embarcação
              </label>
              <select
                value={selectedBoatId}
                onChange={e => setSelectedBoatId(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20"
              >
                {boats.map(b => (
                  <option key={b.id} value={b.id}>
                    {formatBoatName(b.nome)} {b.numero ? `(Nº ${b.numero})` : ''} — {b.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                Fração / Cota
              </label>
              <select
                value={selectedCota}
                onChange={e => setSelectedCota(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-stone-200 rounded-lg text-xs font-bold text-[#2D0A16] focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20"
              >
                {slotsList.map(s => (
                  <option key={s.slot} value={s.slot}>
                    {s.slot} {s.isDisponivel ? '— Livre (Mexicano)' : s.isRepasse ? '— Em Repasse' : `— ${s.occupant?.clienteNome?.split(' ')[0] || 'Vendida'}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Status atual do titular da cota selecionada */}
            <div className="sm:col-span-3 pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs">
              <span className="text-stone-500">Titular Atual:</span>
              <span className="font-semibold text-stone-800">
                {currentOccupant
                  ? currentOccupant.isMexicano
                    ? '⭐ El Mexicano (Estoque Próprio Disponível)'
                    : `${currentOccupant.clienteNome} ${currentOccupant.emRepasse ? '(Em Repasse)' : '(Cotista Titular)'}`
                  : '⭐ El Mexicano (Estoque Próprio Disponível)'}
              </span>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* ABA 1: BLOQUEIO 48H (RESERVA DE COTA) */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'reserva' && (
            <form onSubmit={handleCriarReserva} className="space-y-4">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Regra de Bloqueio Comercial:</strong> A cota {selectedCota} ficará travada por 48 horas exclusivamente para este Lead, impedindo que outro vendedor lance propostas para a mesma fração simultaneamente.
                </p>
              </div>

              {/* Busca / Seleção de Lead */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Vincular ao Lead Comercial *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Buscar lead por nome ou digite um novo..."
                    value={leadSearch}
                    onChange={e => {
                      setLeadSearch(e.target.value);
                      setSelectedLeadNome(e.target.value);
                    }}
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2D0A16]/20 focus:bg-white"
                  />
                </div>

                {/* Lista de Leads encontrados */}
                {leadSearch && filteredLeads.length > 0 && (
                  <div className="border border-stone-200 rounded-xl p-1 bg-white shadow-md max-h-36 overflow-y-auto divide-y divide-stone-100">
                    {filteredLeads.map(l => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setSelectedLeadId(l.id);
                          setSelectedLeadNome(l.nome);
                          setSelectedLeadTelefone(l.telefone || '');
                          setLeadSearch(l.nome);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-stone-50 flex items-center justify-between text-xs cursor-pointer rounded-lg"
                      >
                        <div>
                          <p className="font-semibold text-stone-900">{l.nome}</p>
                          <p className="text-[10px] text-stone-400">{l.telefone || l.email || 'Sem contato'}</p>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 uppercase">
                          {l.etapaFunil || 'Lead'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 block">
                    Vendedor Responsável
                  </label>
                  <input
                    type="text"
                    value={vendedorNome}
                    onChange={e => setVendedorNome(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800 focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 block">
                    Prazo de Bloqueio
                  </label>
                  <select
                    value={horasBloqueio}
                    onChange={e => setHorasBloqueio(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800 font-semibold focus:outline-none focus:bg-white"
                  >
                    <option value={24}>24 Horas (1 dia)</option>
                    <option value={48}>48 Horas (Padrão Comercial)</option>
                    <option value={72}>72 Horas (Fim de Semana)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 block">
                  Motivo da Reserva / Observações
                </label>
                <textarea
                  rows={2}
                  value={motivoReserva}
                  onChange={e => setMotivoReserva(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isLoading ? 'Bloqueando cota...' : `Confirmar Bloqueio de ${horasBloqueio}h`}</span>
                </button>
              </div>
            </form>
          )}

          {/* ------------------------------------------------------------- */}
          {/* ABA 2: REPASSE COMERCIAL */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'repasse' && (
            <form onSubmit={handleSalvarRepasse} className="space-y-4">
              <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2.5">
                <Tag className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Cota em Repasse:</strong> Fração pertencente a um cotista real que deseja revender com intermediação da equipe comercial El Mexicano.
                </p>
              </div>

              {currentOccupant?.isMexicano ? (
                <div className="p-4 rounded-xl bg-stone-100 text-center text-xs text-stone-600">
                  Esta cota pertence ao <strong>Estoque Próprio da El Mexicano</strong> e já está disponível para venda direta. O repasse só se aplica a cotas de cotistas externos.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">Sinalizar Cota em Repasse</span>
                      <span className="text-[11px] text-stone-500">Exibir como disponível para venda na frota comercial</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEmRepasse}
                        onChange={e => setIsEmRepasse(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2D0A16]"></div>
                    </label>
                  </div>

                  {isEmRepasse && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 block">
                        Valor Pedido na Revenda (R$) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">R$</span>
                        <input
                          type="number"
                          step="1000"
                          placeholder="Ex: 180000"
                          value={valorRepasse}
                          onChange={e => setValorRepasse(e.target.value)}
                          className="w-full h-10 pl-9 pr-3 rounded-lg bg-stone-50 border border-stone-200 text-xs font-bold text-stone-900 focus:outline-none focus:bg-white"
                        />
                      </div>
                      <p className="text-[10px] text-stone-400">
                        Valor sugerido da cota no catálogo: {currentBoat?.valorCota ? `R$ ${Number(currentBoat.valorCota).toLocaleString('pt-BR')}` : 'Não cadastrado'}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-5 py-2.5 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Tag className="w-3.5 h-3.5 text-sky-300" />
                      <span>{isLoading ? 'Salvando...' : 'Salvar Status de Repasse'}</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* ------------------------------------------------------------- */}
          {/* ABA 3: TRANSFERÊNCIA OU RECOMPRA */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'transferencia' && (
            <form onSubmit={handleExecutarTransferencia} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200/80 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTipoOperacao('recompra')}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tipoOperacao === 'recompra'
                      ? 'bg-white text-[#2D0A16] shadow-xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Recompra (Estoque Mexicano)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoOperacao('transferencia')}
                  className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tipoOperacao === 'transferencia'
                      ? 'bg-white text-[#2D0A16] shadow-xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                  <span>Transferência de Cotista</span>
                </button>
              </div>

              {tipoOperacao === 'transferencia' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 block">
                    Cotista Destino (Comprador) *
                  </label>
                  <select
                    value={targetClientId}
                    onChange={e => setTargetClientId(e.target.value)}
                    className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 focus:outline-none focus:bg-white"
                  >
                    <option value="">Selecione o cotista que assumirá a cota...</option>
                    {clients
                      .filter(c => c.status !== 'inativo' && !isMexicanoClient(c) && c.id !== currentOccupant?.clienteId)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.cpf ? `• CPF: ${c.cpf}` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 block">
                    Valor da Operação (R$)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    placeholder="0,00"
                    value={valorNegociado}
                    onChange={e => setValorNegociado(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-900 focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 block">
                    Data da Transferência
                  </label>
                  <input
                    type="date"
                    value={dataOperacao}
                    onChange={e => setDataOperacao(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 block">
                  Observações / Motivo
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações contratuais ou justificativa da operação..."
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{isLoading ? 'Processando...' : tipoOperacao === 'recompra' ? 'Efetivar Recompra para Estoque' : 'Confirmar Transferência'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ------------------------------------------------------------- */}
          {/* ABA 4: HISTÓRICO */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'historico' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-700">Movimentações Registradas</span>
                <button
                  type="button"
                  onClick={() => loadHistorico(selectedBoatId)}
                  className="text-stone-500 hover:text-stone-800 text-[11px] underline cursor-pointer"
                >
                  Atualizar
                </button>
              </div>

              {isLoadingHistorico ? (
                <div className="p-8 text-center text-xs text-stone-400">Carregando histórico...</div>
              ) : historicoList.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-stone-200/80">
                  Nenhuma movimentação registrada para esta embarcação ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {historicoList.map(h => (
                    <div
                      key={h.id}
                      className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#2D0A16] px-1.5 py-0.5 rounded bg-stone-200/70 text-[10px]">
                            {h.cota}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            h.tipoOperacao === 'reserva_48h'
                              ? 'bg-amber-100 text-amber-800'
                              : h.tipoOperacao === 'repasse'
                              ? 'bg-sky-100 text-sky-800'
                              : h.tipoOperacao === 'recompra'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}>
                            {h.tipoOperacao.toUpperCase().replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(h.createdAt || h.dataOperacao).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-stone-700 font-medium">
                          {h.observacoes || `${h.clienteOrigemNome || ''} ➔ ${h.clienteDestinoNome || ''}`}
                        </p>
                        {h.registradoPor && (
                          <p className="text-[10px] text-stone-400">Por: {h.registradoPor}</p>
                        )}
                      </div>

                      {Number(h.valorNegociado || 0) > 0 && (
                        <span className="font-bold text-stone-900 shrink-0 tabular-nums">
                          R$ {Number(h.valorNegociado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
