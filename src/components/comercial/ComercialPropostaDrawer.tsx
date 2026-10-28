import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  DollarSign,
  Ship,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Percent,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  Sparkles,
  Award,
  ChevronDown,
  Repeat
} from 'lucide-react';
import {
  LeadComercial,
  Embarcacao,
  Cliente,
  PropostaComercial,
  BalaoIntermediario,
  ComparativoCustoInfo
} from '../../types';
import { boatDB, clientDB } from '../../db';
import { getBoatCotasStatusList, getBoatEstoqueResumo, getFirstAvailableCota } from '../../utils/cotaUtils';
import { getTaxaAdmMensal } from '../../utils/boatUtils';

interface ComercialPropostaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialLead?: LeadComercial | null;
  initialBoatId?: string | null;
  initialCota?: string | null;
  onPropostaCreated?: (proposta: PropostaComercial) => void;
}

export default function ComercialPropostaDrawer({
  isOpen,
  onClose,
  initialLead,
  initialBoatId,
  initialCota,
  onPropostaCreated
}: ComercialPropostaDrawerProps) {
  const boats = useMemo(() => boatDB.getAll() as Embarcacao[], []);
  const clients = useMemo(() => clientDB.getAll() as Cliente[], []);

  // Form State
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLead?.id || '');
  const [leadNome, setLeadNome] = useState<string>(initialLead?.nome || '');
  const [leadTelefone, setLeadTelefone] = useState<string>(initialLead?.telefone || '');
  const [leadEmail, setLeadEmail] = useState<string>(initialLead?.email || '');
  const [leadCpf, setLeadCpf] = useState<string>(initialLead?.cpf || '');

  const [selectedBoatId, setSelectedBoatId] = useState<string>(
    initialBoatId || (boats.length > 0 ? boats[0].id : '')
  );
  const [selectedCota, setSelectedCota] = useState<string>(initialCota || 'C1');
  const [tipoCota, setTipoCota] = useState<'estoque_mexicano' | 'repasse'>('estoque_mexicano');
  const [reservar48h, setReservar48h] = useState<boolean>(true);

  // Valores Financeiros
  const [valorTotal, setValorTotal] = useState<number>(180000);
  const [valorEntrada, setValorEntrada] = useState<number>(50000);
  const [dataVencimentoEntrada, setDataVencimentoEntrada] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [formaPagamentoEntrada, setFormaPagamentoEntrada] = useState<string>('pix');

  const [numParcelas, setNumParcelas] = useState<number>(24);
  const [diaVencimento, setDiaVencimento] = useState<number>(10);
  const [formaPagamentoParcelas, setFormaPagamentoParcelas] = useState<string>('boleto');

  // Balões Intermediários
  const [baloes, setBaloes] = useState<BalaoIntermediario[]>([]);

  // Permuta (Trade-in)
  const [temPermuta, setTemPermuta] = useState<boolean>(false);
  const [permutaTipo, setPermutaTipo] = useState<string>('jet_ski');
  const [permutaMarcaModelo, setPermutaMarcaModelo] = useState<string>('');
  const [permutaAno, setPermutaAno] = useState<number>(new Date().getFullYear() - 2);
  const [permutaValorProposto, setPermutaValorProposto] = useState<number>(45000);

  // Taxa de Condomínio / Vale Administradora
  const [taxaAdmMensal, setTaxaAdmMensal] = useState<number>(1200);

  // Observações
  const [observacoes, setObservacoes] = useState<string>('');

  // Status de envio e feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [propostaGerada, setPropostaGerada] = useState<PropostaComercial | null>(null);
  const [copiado, setCopiado] = useState<boolean>(false);

  // Atualiza lead quando props mudam
  useEffect(() => {
    if (initialLead) {
      setSelectedLeadId(initialLead.id);
      setLeadNome(initialLead.nome);
      setLeadTelefone(initialLead.telefone || '');
      setLeadEmail(initialLead.email || '');
      setLeadCpf(initialLead.cpf || '');
    }
  }, [initialLead]);

  useEffect(() => {
    if (initialBoatId) {
      setSelectedBoatId(initialBoatId);
    }
  }, [initialBoatId]);

  useEffect(() => {
    if (initialCota) {
      setSelectedCota(initialCota);
    }
  }, [initialCota]);

  // Embarcação selecionada e suas cotas
  const selectedBoat = useMemo(() => {
    return boats.find(b => b.id === selectedBoatId) || boats[0];
  }, [boats, selectedBoatId]);

  const cotasStatusList = useMemo(() => {
    if (!selectedBoat) return [];
    return getBoatCotasStatusList(selectedBoat.id, clients, selectedBoat);
  }, [selectedBoat, clients]);

  // Escolhe primeira cota livre automaticamente ao mudar de barco
  useEffect(() => {
    if (selectedBoat) {
      const freeCota = getFirstAvailableCota(selectedBoat.id, clients, selectedBoat);
      setSelectedCota(freeCota);

      // Preço de referência sugerido baseado no tamanho
      const basePrice = (selectedBoat.tamanho ? Number(selectedBoat.tamanho) : 26) * 7500;
      setValorTotal(basePrice > 0 ? basePrice : 180000);
      setValorEntrada(Math.round((basePrice > 0 ? basePrice : 180000) * 0.3));
      setTaxaAdmMensal(getTaxaAdmMensal(selectedBoat));
    }
  }, [selectedBoatId]);

  // Atualiza tipoCota baseado no status da cota selecionada
  useEffect(() => {
    const cotaInfo = cotasStatusList.find(c => c.cota === selectedCota);
    if (cotaInfo?.status === 'em_repasse') {
      setTipoCota('repasse');
    } else {
      setTipoCota('estoque_mexicano');
    }
  }, [selectedCota, cotasStatusList]);

  // Total dos balões
  const totalBaloes = useMemo(() => {
    return baloes.reduce((sum, b) => sum + (Number(b.valor) || 0), 0);
  }, [baloes]);

  // Saldo a parcelar = Total - Entrada - TotalBaloes - (ValorPermuta se houver)
  const saldoFinanciado = useMemo(() => {
    const permutaDeducao = temPermuta ? permutaValorProposto : 0;
    const saldo = valorTotal - valorEntrada - totalBaloes - permutaDeducao;
    return Math.max(0, saldo);
  }, [valorTotal, valorEntrada, totalBaloes, temPermuta, permutaValorProposto]);

  const valorParcelaCalculada = useMemo(() => {
    if (numParcelas <= 0) return 0;
    return Math.round((saldoFinanciado / numParcelas) * 100) / 100;
  }, [saldoFinanciado, numParcelas]);

  // Comparativo de Custo (100% individual vs Cota El Mexicano)
  const comparativoCusto: ComparativoCustoInfo = useMemo(() => {
    const custoBarco100 = valorTotal * 8; // Barco integral equivalente a 8 cotas
    const marinaMensal100 = 3500;
    const seguroAnual100 = 18000;
    const revisaoAnual100 = 12000;
    const custoAno1Individual = custoBarco100 + (marinaMensal100 * 12) + seguroAnual100 + revisaoAnual100;

    const custoAno1Mexicano = valorTotal + (taxaAdmMensal * 12);
    const economiaAno1 = custoAno1Individual - custoAno1Mexicano;

    return {
      custoBarcoIndividual: custoBarco100,
      custoMarinaIndividualMensal: marinaMensal100,
      custoSeguroIndividualAnual: seguroAnual100,
      custoRevisaoIndividualAnual: revisaoAnual100,
      custoTotalPrimeiroAnoIndividual: custoAno1Individual,
      custoCotaMexicano: valorTotal,
      taxaMensalRateada: taxaAdmMensal,
      economiaEstimadaPrimeiroAno: economiaAno1
    };
  }, [valorTotal, taxaAdmMensal]);

  // Adicionar balão
  const handleAddBalao = () => {
    const nextIdx = baloes.length + 1;
    setBaloes([
      ...baloes,
      {
        id: `balao_${Date.now()}`,
        mesAno: `${nextIdx * 6}º mês`,
        valor: Math.round(valorTotal * 0.05),
        descricao: `Intermediária Semestral ${nextIdx}`
      }
    ]);
  };

  const handleRemoveBalao = (id: string) => {
    setBaloes(baloes.filter(b => b.id !== id));
  };

  const handleUpdateBalao = (id: string, field: keyof BalaoIntermediario, val: any) => {
    setBaloes(baloes.map(b => b.id === id ? { ...b, [field]: val } : b));
  };

  // Gerar Proposta via API
  const handleGerarProposta = async () => {
    if (!leadNome.trim()) {
      alert("Informe o nome do lead / cliente.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        leadId: selectedLeadId || undefined,
        leadNome,
        leadTelefone,
        leadEmail,
        leadCpf,
        embarcacaoId: selectedBoat?.id,
        cota: selectedCota,
        tipoCota,
        valorTotal,
        valorEntrada,
        dataVencimentoEntrada,
        formaPagamentoEntrada,
        numParcelas,
        valorParcela: valorParcelaCalculada,
        diaVencimento,
        formaPagamentoParcelas,
        baloesIntermediarios: baloes,
        permutaInfo: temPermuta ? {
          temPermuta: true,
          tipoBem: permutaTipo,
          marcaModelo: permutaMarcaModelo,
          ano: permutaAno,
          valorPropostoCliente: permutaValorProposto,
          statusAvaliacao: 'aguardando_avaliacao'
        } : undefined,
        taxaAdmEstimada: taxaAdmMensal,
        comparativoCustoInfo: comparativoCusto,
        reservarCota48h: reservar48h,
        observacoes: observacoes.trim() || undefined
      };

      const res = await fetch('/api/comercial/propostas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.proposta) {
          setPropostaGerada(data.proposta);
          if (onPropostaCreated) onPropostaCreated(data.proposta);
        }
      } else {
        const errData = await res.json();
        alert(`Erro ao gerar proposta: ${errData.message || 'Falha no servidor'}`);
      }
    } catch (e: any) {
      console.error(e);
      alert("Falha de conexão ao gerar proposta comercial.");
    } finally {
      setLoading(false);
    }
  };

  const copyPublicLink = () => {
    if (!propostaGerada) return;
    const url = `${window.location.origin}/proposta/${propostaGerada.tokenPublico}`;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Fecha com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden cursor-default"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-mx-ink-100 text-mx-ink flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Simulador & Proposta Comercial</h2>
              <p className="text-[11px] text-stone-500">
                Estruture sinal, parcelamento, balões, permuta (trade-in) e comparativo de custo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Proposta já gerada com Sucesso */}
        {propostaGerada ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">Proposta Gerada com Sucesso!</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Código: <span className="font-mono font-bold text-stone-800">{propostaGerada.codigoProposta}</span>.
                A proposta está pronta para ser compartilhada com o cliente.
              </p>
            </div>

            {/* Card com Link Público Rastreável */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800">Link Interativo do Cliente</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  Rastreamento Ativo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/proposta/${propostaGerada.tokenPublico}`}
                  className="w-full text-xs font-mono bg-white border border-stone-200 rounded-lg p-2 text-stone-700 select-all"
                />
                <button
                  type="button"
                  onClick={copyPublicLink}
                  className="px-3 py-2 bg-mx-ink text-white rounded-lg text-xs font-semibold hover:bg-mx-ink-700 transition-colors cursor-pointer shrink-0"
                >
                  {copiado ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="text-[11px] text-stone-500">
                O cliente poderá visualizar a proposta digitalmente e clicar em <strong>"Aceitar Proposta"</strong>, avançando o Lead para Análise Jurídica / Contrato automaticamente.
              </p>
            </div>

            {/* Resumo da Proposta */}
            <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Resumo Estruturado</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-stone-400 text-[10px] block">Embarcação / Cota</span>
                  <span className="font-bold text-stone-800">{propostaGerada.embarcacaoNome} • {propostaGerada.cota}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px] block">Valor Total da Cota</span>
                  <span className="font-bold text-stone-800">R$ {Number(propostaGerada.valorTotal).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px] block">Entrada / Sinal</span>
                  <span className="font-bold text-stone-800">R$ {Number(propostaGerada.valorEntrada).toLocaleString('pt-BR')} ({propostaGerada.formaPagamentoEntrada?.toUpperCase()})</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px] block">Parcelamento Mensal</span>
                  <span className="font-bold text-stone-800">{propostaGerada.numParcelas}x de R$ {Number(propostaGerada.valorParcela).toLocaleString('pt-BR')}</span>
                </div>
                {propostaGerada.permutaInfo?.temPermuta && (
                  <div className="col-span-2 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Permuta Cadastrada (Trade-in):</span>
                    <span className="text-xs font-semibold text-amber-900">
                      {propostaGerada.permutaInfo.marcaModelo} ({propostaGerada.permutaInfo.ano}) • Proposta: R$ {Number(propostaGerada.permutaInfo.valorPropostoCliente || 0).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-amber-700 block mt-0.5">Aguardando aprovação formal da Diretoria Comercial.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPropostaGerada(null)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Gerar Nova Proposta
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-mx-ink text-white rounded-xl text-xs font-semibold hover:bg-mx-ink-700 transition-colors cursor-pointer shadow-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          /* Formulário Interativo do Simulador */
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 1. Seleção do Lead */}
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-2.5">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-mx-ink text-white text-[10px] flex items-center justify-center font-bold">1</span>
                Dados do Lead / Comprador
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-stone-700 block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={leadNome}
                    onChange={e => setLeadNome(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-400"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-stone-700 block mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={leadTelefone}
                    onChange={e => setLeadTelefone(e.target.value)}
                    placeholder="(48) 99999-9999"
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">E-mail</label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={e => setLeadEmail(e.target.value)}
                    placeholder="email@cliente.com"
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">CPF</label>
                  <input
                    type="text"
                    value={leadCpf}
                    onChange={e => setLeadCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-400"
                  />
                </div>
              </div>
            </div>

            {/* 2. Seleção da Embarcação e Cota Específica */}
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-2.5">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-mx-ink text-white text-[10px] flex items-center justify-center font-bold">2</span>
                Embarcação & Fração Desejada
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-stone-700 block mb-1">Embarcação</label>
                  <select
                    value={selectedBoatId}
                    onChange={e => setSelectedBoatId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-400 bg-white"
                  >
                    {boats.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.nome} ({b.modelo || 'Lancha'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-stone-700 block mb-1">Fração / Cota</label>
                  <select
                    value={selectedCota}
                    onChange={e => setSelectedCota(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-400 bg-white font-bold"
                  >
                    {cotasStatusList.map(c => {
                      const labelStatus =
                        c.status === 'disponivel_mexicano'
                          ? 'Estoque Mexicano (Livre)'
                          : c.status === 'em_repasse'
                          ? 'Cota de Repasse (Revenda)'
                          : c.status === 'reservada'
                          ? 'Reservada 48h'
                          : 'Vendida';
                      return (
                        <option
                          key={c.cota}
                          value={c.cota}
                          disabled={c.status === 'vendida' || c.status === 'reservada'}
                        >
                          {c.cota} - {labelStatus}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Opção de Bloqueio 48h */}
              <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={reservar48h}
                  onChange={e => setReservar48h(e.target.checked)}
                  className="rounded text-mx-ink focus:ring-0"
                />
                <span className="font-medium">
                  Bloquear esta cota temporariamente (48h) no Mapa societário durante a negociação
                </span>
              </label>
            </div>

            {/* 3. Estruturação do Pagamento */}
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-3">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-mx-ink text-white text-[10px] flex items-center justify-center font-bold">3</span>
                Condições Comerciais & Pagamento
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Valor Total da Cota (R$)</label>
                  <input
                    type="number"
                    value={valorTotal}
                    onChange={e => setValorTotal(Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg font-bold text-stone-900 focus:outline-hidden focus:border-stone-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Taxa Condomínio Vale Estimada (R$/mês)</label>
                  <input
                    type="number"
                    value={taxaAdmMensal}
                    onChange={e => setTaxaAdmMensal(Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg font-semibold text-stone-800 focus:outline-hidden focus:border-stone-400"
                  />
                </div>

                {/* Entrada / Sinal */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Entrada / Sinal (R$)</label>
                  <input
                    type="number"
                    value={valorEntrada}
                    onChange={e => setValorEntrada(Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg font-bold text-emerald-700 focus:outline-hidden focus:border-stone-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Meio de Pagamento (Entrada)</label>
                  <select
                    value={formaPagamentoEntrada}
                    onChange={e => setFormaPagamentoEntrada(e.target.value)}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-400 bg-white"
                  >
                    <option value="pix">PIX Instantâneo</option>
                    <option value="ted">TED / Transferência</option>
                    <option value="boleto">Boleto à Vista</option>
                    <option value="cartao">Cartão de Crédito</option>
                  </select>
                </div>

                {/* Parcelamento Mensal */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Nº de Parcelas Mensais</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={numParcelas}
                    onChange={e => setNumParcelas(Number(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg font-bold text-stone-900 focus:outline-hidden focus:border-stone-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Dia do Vencimento</label>
                  <select
                    value={diaVencimento}
                    onChange={e => setDiaVencimento(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-400 bg-white"
                  >
                    <option value={5}>Dia 05</option>
                    <option value={10}>Dia 10</option>
                    <option value={15}>Dia 15</option>
                    <option value={20}>Dia 20</option>
                    <option value={25}>Dia 25</option>
                  </select>
                </div>
              </div>

              {/* Seção de Balões / Intermediárias */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-stone-600">Intermediárias / Balões Semestrais</span>
                  <button
                    type="button"
                    onClick={handleAddBalao}
                    className="flex items-center gap-1 text-[11px] font-semibold text-mx-ink hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Balão
                  </button>
                </div>

                {baloes.length > 0 ? (
                  <div className="space-y-2">
                    {baloes.map(b => (
                      <div key={b.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-stone-200 text-xs">
                        <input
                          type="text"
                          value={b.descricao || ''}
                          onChange={e => handleUpdateBalao(b.id, 'descricao', e.target.value)}
                          placeholder="Ex: Balão 6º mês"
                          className="flex-1 px-2 py-1 border border-stone-200 rounded text-xs"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-stone-400 text-xs">R$</span>
                          <input
                            type="number"
                            value={b.valor}
                            onChange={e => handleUpdateBalao(b.id, 'valor', Number(e.target.value) || 0)}
                            className="w-24 px-2 py-1 border border-stone-200 rounded text-xs font-bold text-stone-900"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBalao(b.id)}
                          className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 italic">Nenhum balão intermediário cadastrado.</p>
                )}
              </div>

              {/* Simulação Consolidada */}
              <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">Parcela Mensal Calculada</span>
                  <span className="text-base font-extrabold text-emerald-950">
                    {numParcelas}x de R$ {valorParcelaCalculada.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="text-right text-[11px] text-emerald-800">
                  <div>Saldo Financiado: <strong>R$ {saldoFinanciado.toLocaleString('pt-BR')}</strong></div>
                  {totalBaloes > 0 && <div>Total Balões: <strong>R$ {totalBaloes.toLocaleString('pt-BR')}</strong></div>}
                </div>
              </div>
            </div>

            {/* 4. Gestão de Permuta (Trade-in) */}
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-mx-ink text-white text-[10px] flex items-center justify-center font-bold">4</span>
                  Permuta como Parte de Pagamento (Trade-in)
                </h3>
                <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={temPermuta}
                    onChange={e => setTemPermuta(e.target.checked)}
                    className="rounded text-mx-ink focus:ring-0"
                  />
                  <span className="font-semibold">Incluir Permuta</span>
                </label>
              </div>

              {temPermuta && (
                <div className="grid grid-cols-2 gap-3 text-xs bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Tipo de Bem</label>
                    <select
                      value={permutaTipo}
                      onChange={e => setPermutaTipo(e.target.value)}
                      className="w-full px-3 py-1.5 border border-stone-200 rounded-lg bg-white"
                    >
                      <option value="jet_ski">Jet Ski (Sea-Doo / Yamaha)</option>
                      <option value="lancha">Lancha Menor</option>
                      <option value="carro">Veículo / Carro</option>
                      <option value="imovel">Imóvel / Terreno</option>
                      <option value="outro">Outro Bem</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Marca / Modelo / Motorização</label>
                    <input
                      type="text"
                      value={permutaMarcaModelo}
                      onChange={e => setPermutaMarcaModelo(e.target.value)}
                      placeholder="Ex: Sea-Doo GTI 130hp"
                      className="w-full px-3 py-1.5 border border-stone-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Ano de Fabricação</label>
                    <input
                      type="number"
                      value={permutaAno}
                      onChange={e => setPermutaAno(Number(e.target.value) || 2020)}
                      className="w-full px-3 py-1.5 border border-stone-200 rounded-lg bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Valor Proposto pelo Cliente (R$)</label>
                    <input
                      type="number"
                      value={permutaValorProposto}
                      onChange={e => setPermutaValorProposto(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-stone-200 rounded-lg bg-white font-bold text-amber-900"
                    />
                  </div>
                  <div className="col-span-2 text-[10px] text-amber-800">
                    O valor do bem será deduzido do saldo a parcelar e ficará pendente de avaliação/aprovação formal pela Diretoria Comercial da El Mexicano.
                  </div>
                </div>
              )}
            </div>

            {/* 5. Comparativo Automático de Custo (Argumento de Venda) */}
            <div className="bg-stone-900 text-white p-4 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Sparkles className="w-4 h-4" />
                Argumento de Venda: Aquisição 100% vs Cota El Mexicano
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-800/80 p-3 rounded-lg border border-stone-700 space-y-1">
                  <span className="text-[10px] text-stone-400 font-bold uppercase block">Barco Individual (100%)</span>
                  <div className="text-sm font-bold text-rose-300">
                    R$ {comparativoCusto.custoTotalPrimeiroAnoIndividual.toLocaleString('pt-BR')} <span className="text-[10px] text-stone-400">1º ano</span>
                  </div>
                  <ul className="text-[10px] text-stone-400 space-y-0.5 pt-1">
                    <li>• Compra integral do ativo</li>
                    <li>• Marina 100%: R$ 3.500/mês</li>
                    <li>• Seguro náutico integral</li>
                    <li>• Manutenção e revisão exclusivas</li>
                  </ul>
                </div>

                <div className="bg-mx-ink-900/90 p-3 rounded-lg border border-mx-ink-700 space-y-1">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block">Cota Náutica El Mexicano</span>
                  <div className="text-sm font-bold text-emerald-300">
                    R$ {(comparativoCusto.custoCotaMexicano + (comparativoCusto.taxaMensalRateada * 12)).toLocaleString('pt-BR')} <span className="text-[10px] text-stone-300">1º ano</span>
                  </div>
                  <ul className="text-[10px] text-stone-300 space-y-0.5 pt-1">
                    <li>• Apenas a fração real de uso</li>
                    <li>• Taxa rateada na Vale Administradora</li>
                    <li>• Gestão náutica profissional inclusa</li>
                    <li>• Economia de ~80% no desembolso</li>
                  </ul>
                </div>
              </div>

              <div className="text-center text-xs text-amber-200 font-semibold bg-stone-800/60 py-1.5 rounded-lg border border-amber-900/50">
                Economia estimada no primeiro ano: R$ {comparativoCusto.economiaEstimadaPrimeiroAno.toLocaleString('pt-BR')}
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="font-semibold text-stone-700 text-xs block mb-1">Observações Internas da Proposta</label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Condições especiais acordadas com o cliente, brindes ou prazos..."
                rows={2}
                className="w-full text-xs p-2.5 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-400"
              />
            </div>
          </div>
        )}

        {/* Footer com Botão de Ação */}
        {!propostaGerada && (
          <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleGerarProposta}
              disabled={loading || !leadNome.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-mx-ink text-white rounded-xl text-xs font-bold hover:bg-mx-ink-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <DollarSign className="w-4 h-4" />
              {loading ? 'Gerando Proposta...' : 'Gerar Proposta Oficial'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
