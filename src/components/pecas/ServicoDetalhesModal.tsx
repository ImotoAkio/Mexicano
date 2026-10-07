import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  Ship,
  ClipboardList,
  DollarSign,
  Clock,
  Wrench,
  CheckCircle,
  ChevronRight,
  AlertTriangle,
  FileText,
  Building2,
  User,
  Calendar,
  Printer,
  ArrowRight,
  Ban,
  Lock,
  Unlock,
  Save,
  Plus,
  Edit2,
  Trash2,
  Package,
  Layers,
  Sparkles,
  Calculator
} from 'lucide-react';
import Select from 'react-select';
import { Chamado, Embarcacao, Cliente, Manutencao, Mecanico, PecaItem, Fornecedor } from '../../types';
import { getBoatCode } from '../../utils/boatUtils';
import { chamadoDB, boatDB, maintenanceDB, clientDB, getAdminToken, fornecedorDB } from '../../db';
import { generateOrcamentoPDF, generateOrdemServicoPDF } from '../../utils/pdfGenerator';
import FornecedoresModal from './FornecedoresModal';

// ─── Stepper phase definitions ───
type Phase = 'triagem' | 'orcamento' | 'aprovacao' | 'execucao' | 'concluido';

const PHASES: { id: Phase; label: string; icon: React.ElementType }[] = [
  { id: 'triagem',   label: 'Triagem',    icon: ClipboardList },
  { id: 'orcamento', label: 'Orçamento',  icon: DollarSign },
  { id: 'aprovacao', label: 'Aprovação',  icon: Clock },
  { id: 'execucao',  label: 'Execução',   icon: Wrench },
  { id: 'concluido', label: 'Concluído',  icon: CheckCircle },
];

function getCurrentPhase(chamado: Chamado | null, os: Manutencao | null): Phase {
  if (os) {
    switch (os.status) {
      case 'aguardando_orcamento': return 'orcamento';
      case 'aguardando_aprovacao': return 'aprovacao';
      case 'em_execucao': return 'execucao';
      case 'concluido': return 'concluido';
      default: return 'orcamento';
    }
  }
  return 'triagem';
}

function getPhaseIndex(phase: Phase): number {
  return PHASES.findIndex(p => p.id === phase);
}

// ─── Props ───
interface ServicoDetalhesModalProps {
  chamado: Chamado | null;
  os: Manutencao | null;
  embarcacoes: Embarcacao[];
  clientes: Cliente[];
  chamados: Chamado[];
  manutencoes: Manutencao[];
  mecanicos: Mecanico[];
  fornecedores?: Fornecedor[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function ServicoDetalhesModal({
  chamado,
  os,
  embarcacoes,
  clientes,
  chamados,
  manutencoes,
  mecanicos,
  fornecedores,
  onClose,
  onRefresh,
}: ServicoDetalhesModalProps) {
  const currentPhase = getCurrentPhase(chamado, os);
  const currentPhaseIdx = getPhaseIndex(currentPhase);

  // Fornecedores state
  const [fornecedoresList, setFornecedoresList] = useState<Fornecedor[]>(() => {
    if (fornecedores && fornecedores.length > 0) return fornecedores;
    return fornecedorDB.getAll();
  });
  const [fornecedorId, setFornecedorId] = useState<string>(os?.fornecedorId || '');
  const [showFornecedoresModal, setShowFornecedoresModal] = useState(false);
  const [modalInitialEditId, setModalInitialEditId] = useState<string | undefined>(undefined);

  // Form state for stepper actions
  const [analiseNotes, setAnaliseNotes] = useState(chamado?.observacoesAnalise || '');
  const [oficinaNome, setOficinaNome] = useState(os?.oficinaNome || '');
  const [custoReal, setCustoReal] = useState(os?.custoReal?.toString() || '');
  const [valorRepassado, setValorRepassado] = useState(os?.valorRepassado?.toString() || '');
  const [descricaoServico, setDescricaoServico] = useState(os?.descricaoServico || '');
  const [saving, setSaving] = useState(false);

  // Itens discriminados do orçamento (peças, materiais, serviços/mão de obra)
  const [itensOrcamento, setItensOrcamento] = useState<PecaItem[]>(() => {
    if (os?.pecas && Array.isArray(os.pecas) && os.pecas.length > 0) {
      return os.pecas.map((p, idx) => ({
        id: p.id || `item_${idx}_${Date.now()}`,
        nome: p.nome || '',
        quantidade: p.quantidade !== undefined ? Number(p.quantidade) : 1,
        valorUnitario: p.valorUnitario !== undefined ? Number(p.valorUnitario) : 0,
        custoUnitario: p.custoUnitario !== undefined ? Number(p.custoUnitario) : undefined,
        tipo: p.tipo || 'peca'
      }));
    }
    return [];
  });

  // Atualizar itens caso a OS seja recarregada
  useEffect(() => {
    if (os?.pecas && Array.isArray(os.pecas) && os.pecas.length > 0) {
      setItensOrcamento(os.pecas.map((p, idx) => ({
        id: p.id || `item_${idx}_${Date.now()}`,
        nome: p.nome || '',
        quantidade: p.quantidade !== undefined ? Number(p.quantidade) : 1,
        valorUnitario: p.valorUnitario !== undefined ? Number(p.valorUnitario) : 0,
        custoUnitario: p.custoUnitario !== undefined ? Number(p.custoUnitario) : undefined,
        tipo: p.tipo || 'peca'
      })));
    }
  }, [os]);

  // Soma automática dos subtotais dos itens (Custo Final do Cliente)
  const subtotalItensCliente = useMemo(() => {
    return itensOrcamento.reduce((acc, it) => acc + ((Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0)), 0);
  }, [itensOrcamento]);

  // Soma automática dos custos da oficina se informados
  const subtotalItensOficina = useMemo(() => {
    return itensOrcamento.reduce((acc, it) => acc + ((Number(it.quantidade) || 0) * (Number(it.custoUnitario) || 0)), 0);
  }, [itensOrcamento]);

  // Adicionar novo item
  const handleAddItem = (nomePreset: string = '', tipoPreset: 'peca' | 'servico' | 'material' = 'peca', valorUnitarioPreset: number = 0) => {
    const newItem: PecaItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nome: nomePreset,
      quantidade: 1,
      valorUnitario: valorUnitarioPreset,
      custoUnitario: undefined,
      tipo: tipoPreset
    };
    setItensOrcamento(prev => {
      const updated = [...prev, newItem];
      if (valorUnitarioPreset > 0) {
        const total = updated.reduce((acc, it) => acc + ((Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0)), 0);
        setValorRepassado(total.toFixed(2));
      }
      return updated;
    });
  };

  // Atualizar campo de um item
  const handleUpdateItem = (id: string, field: keyof PecaItem, val: any) => {
    setItensOrcamento(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          return { ...item, [field]: val };
        }
        return item;
      });

      // Recalcular automaticamente o custo final do cliente (valor repassado)
      const novoTotalCliente = updated.reduce((acc, it) => acc + ((Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0)), 0);
      if (novoTotalCliente > 0 || updated.length > 0) {
        setValorRepassado(novoTotalCliente.toFixed(2));
      }

      // Se houver algum custo unitário de oficina preenchido, recalcular custoReal
      const temCustoOficina = updated.some(it => it.custoUnitario !== undefined && it.custoUnitario !== null && Number(it.custoUnitario) > 0);
      if (temCustoOficina) {
        const novoTotalOficina = updated.reduce((acc, it) => acc + ((Number(it.quantidade) || 0) * (Number(it.custoUnitario) || 0)), 0);
        setCustoReal(novoTotalOficina.toFixed(2));
      }

      return updated;
    });
  };

  // Remover item
  const handleRemoveItem = (id: string) => {
    setItensOrcamento(prev => {
      const updated = prev.filter(item => item.id !== id);
      const novoTotalCliente = updated.reduce((acc, it) => acc + ((Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0)), 0);
      if (updated.length > 0) {
        setValorRepassado(novoTotalCliente.toFixed(2));
      } else {
        setValorRepassado('0.00');
      }
      return updated;
    });
  };

  // Converter valor já digitado anteriormente em item único
  const handleConvertValorEmItem = () => {
    const val = parseFloat(valorRepassado) || 0;
    if (val > 0) {
      handleAddItem('Serviço / Manutenção Geral', 'servico', val);
    } else {
      handleAddItem('', 'peca', 0);
    }
  };

  // Carregar fornecedores atualizados da API caso necessário
  const fetchFornecedores = useCallback(async () => {
    try {
      const token = getAdminToken();
      const res = await fetch('/api/financeiro/fornecedores', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setFornecedoresList(data);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar lista de fornecedores da API:', err);
    }
  }, []);

  useEffect(() => {
    fetchFornecedores();
  }, [fetchFornecedores]);

  // Sincronizar fornecedorId e oficinaNome quando a OS ou a lista de fornecedores carrega
  useEffect(() => {
    if (fornecedoresList.length > 0) {
      if (os?.fornecedorId) {
        setFornecedorId(os.fornecedorId);
        const match = fornecedoresList.find(f => f.id === os.fornecedorId);
        if (match) {
          setOficinaNome(match.nomeFantasia || match.razaoSocial || '');
        }
      } else if (os?.oficinaNome && !fornecedorId) {
        const match = fornecedoresList.find(f =>
          (f.nomeFantasia && f.nomeFantasia.toLowerCase() === os.oficinaNome?.toLowerCase()) ||
          (f.razaoSocial && f.razaoSocial.toLowerCase() === os.oficinaNome?.toLowerCase())
        );
        if (match) {
          setFornecedorId(match.id);
        }
      }
    }
  }, [fornecedoresList, os]);

  const handleFornecedorChange = (newId: string) => {
    setFornecedorId(newId);
    const selected = fornecedoresList.find(f => f.id === newId);
    if (selected) {
      setOficinaNome(selected.nomeFantasia || selected.razaoSocial || '');
    } else {
      setOficinaNome('');
    }
  };

  const boat = embarcacoes.find(b => b.id === (os?.embarcacaoId || chamado?.embarcacaoId));
  const donos = useMemo(() => {
    if (!boat) return [];
    return (boat.donos || []).map(id => clientes.find(c => c.id === id)).filter(Boolean) as Cliente[];
  }, [boat, clientes]);

  // Cotistas selecionados para o rateio/financeiro
  const [cotistasSelecionadosIds, setCotistasSelecionadosIds] = useState<string[]>(() => {
    if (os?.cotistasSelecionados && Array.isArray(os.cotistasSelecionados) && os.cotistasSelecionados.length > 0) {
      return os.cotistasSelecionados;
    }
    return [];
  });

  // Inicializar com todos os donos se não houver seleção prévia
  useEffect(() => {
    if (os?.cotistasSelecionados && Array.isArray(os.cotistasSelecionados) && os.cotistasSelecionados.length > 0) {
      setCotistasSelecionadosIds(os.cotistasSelecionados);
    } else if (donos.length > 0 && cotistasSelecionadosIds.length === 0) {
      setCotistasSelecionadosIds(donos.map(d => d.id));
    }
  }, [os, donos]);

  const handleToggleCotista = (donoId: string) => {
    setCotistasSelecionadosIds(prev => {
      if (prev.includes(donoId)) {
        return prev.filter(id => id !== donoId);
      } else {
        return [...prev, donoId];
      }
    });
  };

  const handleSelectAllCotistas = () => {
    setCotistasSelecionadosIds(donos.map(d => d.id));
  };

  const handleDeselectAllCotistas = () => {
    setCotistasSelecionadosIds([]);
  };

  const donosSelecionados = useMemo(() => {
    return donos.filter(d => cotistasSelecionadosIds.includes(d.id));
  }, [donos, cotistasSelecionadosIds]);

  const linkedChamado = chamado || (os?.chamadoId ? chamados.find(c => c.id === os.chamadoId) : null);
  const linkedOS = os || (chamado ? manutencoes.find(m => m.chamadoId === chamado.id) : null);

  const titulo = linkedOS?.tituloChamado || linkedOS?.titulo || linkedChamado?.titulo || 'Serviço';
  const codigo = linkedOS?.codigoOS || linkedChamado?.codigoChamado || '—';

  // ─── Computed margin ───
  const margem = useMemo(() => {
    const c = parseFloat(custoReal) || 0;
    const v = parseFloat(valorRepassado) || 0;
    if (c === 0 && v === 0) return null;
    return v - c;
  }, [custoReal, valorRepassado]);

  // ─── Validation for advancing ───
  const canAdvanceFromTriagem = Boolean(linkedChamado && boat);

  const canAdvanceFromOrcamento = Boolean(
    (fornecedorId || oficinaNome.trim()) &&
    ((custoReal.trim() && parseFloat(custoReal) > 0) || subtotalItensOficina > 0) &&
    ((valorRepassado.trim() && parseFloat(valorRepassado) > 0) || subtotalItensCliente > 0)
  );

  const canAdvanceFromAprovacao = true; // Manual confirmation only

  const canAdvanceFromExecucao = true; // Manual confirmation only

  // ─── Actions ───
  const handleGerarOS = async () => {
    if (!linkedChamado || !boat) return;
    setSaving(true);

    try {
      const newOS = maintenanceDB.create({
        embarcacaoId: linkedChamado.embarcacaoId,
        tituloChamado: `[${linkedChamado.codigoChamado}] ${linkedChamado.titulo}`,
        descricaoServico: `Chamado: ${linkedChamado.codigoChamado}\nSolicitante: ${linkedChamado.solicitanteNome}\n\nDescrição da Avaria:\n${linkedChamado.descricaoAvaria}${analiseNotes ? `\n\nObservações da Análise:\n${analiseNotes}` : ''}`,
        chamadoId: linkedChamado.id,
        status: 'aguardando_orcamento',
        urgencia: linkedChamado.urgencia,
        dataSaida: new Date().toISOString().split('T')[0],
        horasMotorAtual: boat.horasMotor || 0,
        createdAt: new Date().toISOString(),
      } as any);

      // Update chamado status
      chamadoDB.update(linkedChamado.id, {
        status: 'os_gerada',
        observacoesAnalise: analiseNotes || linkedChamado.observacoesAnalise,
        osIds: [...(linkedChamado.osIds || []), newOS.id],
        bloqueouEmbarcacao: true,
        dataBloqueio: new Date().toISOString(),
      });

      // Block the vessel
      boatDB.update(boat.id, {
        statusOperacional: 'em_manutencao',
        motivoStatus: `Manutenção OS ${newOS.codigoOS} — ${linkedChamado.titulo}`,
        dataAlteracaoStatus: new Date().toISOString(),
        emManutencao: true,
      });

      alert(`✅ OS ${newOS.codigoOS} gerada com sucesso!\n\nEmbarcação ${getBoatCode(boat)} bloqueada.\nAvance para a aba "Orçamento" para registrar os valores.`);
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Erro ao gerar OS:', err);
      alert('Erro ao gerar Ordem de Serviço.');
    } finally {
      setSaving(false);
    }
  };

  const handleSalvarOrcamento = () => {
    if (!linkedOS) return;
    setSaving(true);

    const validPecas = itensOrcamento
      .filter(it => it.nome && it.nome.trim().length > 0)
      .map(it => ({
        ...it,
        nome: it.nome.trim(),
        quantidade: Number(it.quantidade) || 1,
        valorUnitario: Number(it.valorUnitario) || 0,
        custoUnitario: it.custoUnitario !== undefined ? Number(it.custoUnitario) : undefined
      }));

    const finalValorRepassado = parseFloat(valorRepassado) || subtotalItensCliente || 0;
    const finalCustoReal = parseFloat(custoReal) || (subtotalItensOficina > 0 ? subtotalItensOficina : 0);

    try {
      maintenanceDB.update(linkedOS.id, {
        fornecedorId,
        oficinaNome,
        custoReal: finalCustoReal,
        valorRepassado: finalValorRepassado,
        orcamento: finalValorRepassado,
        margemLucro: finalValorRepassado - finalCustoReal,
        descricaoServico: descricaoServico || linkedOS.descricaoServico,
        pecas: validPecas,
        cotistasSelecionados: cotistasSelecionadosIds,
      });
      alert('💾 Dados do orçamento, itens e cotistas salvos com sucesso!');
      onRefresh();
    } catch (err) {
      alert('Erro ao salvar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarParaAprovacao = () => {
    if (!linkedOS || !canAdvanceFromOrcamento) return;
    setSaving(true);

    const validPecas = itensOrcamento
      .filter(it => it.nome && it.nome.trim().length > 0)
      .map(it => ({
        ...it,
        nome: it.nome.trim(),
        quantidade: Number(it.quantidade) || 1,
        valorUnitario: Number(it.valorUnitario) || 0,
        custoUnitario: it.custoUnitario !== undefined ? Number(it.custoUnitario) : undefined
      }));

    const finalValorRepassado = parseFloat(valorRepassado) || subtotalItensCliente || 0;
    const finalCustoReal = parseFloat(custoReal) || (subtotalItensOficina > 0 ? subtotalItensOficina : 0);
    const numCotistasCobrados = donosSelecionados.length > 0 ? donosSelecionados.length : Math.max(donos.length, 1);

    try {
      maintenanceDB.update(linkedOS.id, {
        status: 'aguardando_aprovacao',
        fornecedorId,
        oficinaNome,
        custoReal: finalCustoReal,
        valorRepassado: finalValorRepassado,
        orcamento: finalValorRepassado,
        margemLucro: finalValorRepassado - finalCustoReal,
        dataEnvioOrcamento: new Date().toISOString(),
        descricaoServico: descricaoServico || linkedOS.descricaoServico,
        orcamentoStatus: 'enviado',
        pecas: validPecas,
        cotistasSelecionados: cotistasSelecionadosIds,
      });

      alert(
        `✅ Orçamento enviado para aprovação dos sócios!\n\n` +
        `• Valor Total: R$ ${finalValorRepassado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
        `• Cotistas selecionados (${numCotistasCobrados}): R$ ${(finalValorRepassado / numCotistasCobrados).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} cada`
      );
      onRefresh();
      onClose();
    } catch (err) {
      alert('Erro ao avançar para aprovação.');
    } finally {
      setSaving(false);
    }
  };

  const handleAprovar = () => {
    if (!linkedOS) return;
    if (!window.confirm('Confirma que os sócios aprovaram o orçamento?\n\nA oficina será autorizada a iniciar o serviço.')) return;
    setSaving(true);

    try {
      maintenanceDB.update(linkedOS.id, {
        status: 'em_execucao',
        dataAprovacao: new Date().toISOString(),
        dataInicioServico: new Date().toISOString(),
        orcamentoStatus: 'aprovado',
        aprovadoPor: 'Peças & Serviços',
        cotistasSelecionados: cotistasSelecionadosIds,
      });

      alert('✅ Orçamento aprovado! Serviço autorizado.\n\nA embarcação permanece bloqueada até a conclusão.');
      onRefresh();
      onClose();
    } catch (err) {
      alert('Erro ao aprovar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleReprovar = () => {
    if (!linkedOS) return;
    if (!window.confirm('Reprovar o orçamento? A embarcação será liberada e a OS será encerrada.')) return;
    setSaving(true);

    try {
      maintenanceDB.update(linkedOS.id, {
        status: 'reprovado',
        orcamentoStatus: 'reprovado',
      });

      // Unblock vessel
      if (boat) {
        const hasOtherActiveOS = manutencoes.some(m =>
          m.embarcacaoId === boat.id &&
          m.id !== linkedOS.id &&
          m.status !== 'concluido' &&
          m.status !== 'reprovado'
        );

        if (!hasOtherActiveOS) {
          boatDB.update(boat.id, {
            statusOperacional: 'disponivel',
            motivoStatus: undefined,
            dataAlteracaoStatus: new Date().toISOString(),
            emManutencao: false,
          });
        }
      }

      alert('❌ Orçamento reprovado. Embarcação liberada.');
      onRefresh();
      onClose();
    } catch (err) {
      alert('Erro ao reprovar.');
    } finally {
      setSaving(false);
    }
  };

  const handleConcluirServico = async () => {
    if (!linkedOS || !boat) return;

    const donosParaCobrar = donos.filter(d => cotistasSelecionadosIds.includes(d.id));
    if (donosParaCobrar.length === 0) {
      alert('⚠️ Por favor, selecione pelo menos um cotista para receber a cobrança financeira desta Ordem de Serviço.');
      return;
    }

    const valorTotal = linkedOS.valorRepassado || parseFloat(valorRepassado) || 0;
    const valorPorCotista = valorTotal / donosParaCobrar.length;

    if (!window.confirm(
      `Confirma a conclusão do serviço ${linkedOS.codigoOS}?\n\n` +
      `Isso vai:\n` +
      `• Liberar a embarcação ${getBoatCode(boat)}\n` +
      `• Gerar ${donosParaCobrar.length} lançamento(s) financeiro(s) apenas para o(s) cotista(s) selecionado(s):\n` +
      `  ${donosParaCobrar.map(d => `→ ${d.nome}`).join('\n')}\n\n` +
      `• Valor por cotista: R$ ${valorPorCotista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Total: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
    )) return;
    setSaving(true);

    try {
      const transacoesIds: string[] = [];

      // Generate financial transactions only for selected owners
      const token = getAdminToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      for (const dono of donosParaCobrar) {
        try {
          const cotaDesc = donosParaCobrar.length === 1 ? 'Integral (Responsável Direto)' : `Cota (1/${donosParaCobrar.length})`;
          const transacao = {
            tipo: 'receita',
            categoria: 'manutencao_embarcacao',
            valor: valorPorCotista,
            dataVencimento: new Date().toISOString().split('T')[0],
            status: 'lancado',
            descricao: `Manutenção ${linkedOS.codigoOS} — ${titulo} (${getBoatCode(boat)}) — ${cotaDesc}`,
            clienteId: dono.id,
            embarcacaoId: boat.id,
          };

          const res = await fetch('/api/financeiro/transacoes/save', {
            method: 'POST',
            headers,
            body: JSON.stringify({ action: 'create', data: transacao }),
          });

          if (res.ok) {
            const result = await res.json();
            if (result.id) transacoesIds.push(result.id);
          }
        } catch (err) {
          console.warn(`Erro ao gerar lançamento para ${dono.nome}:`, err);
        }
      }

      // Update OS to concluded
      maintenanceDB.update(linkedOS.id, {
        status: 'concluido',
        dataConclusao: new Date().toISOString(),
        concluidoPor: 'Peças & Serviços',
        transacoesGeradas: transacoesIds,
        custoReal: linkedOS.custoReal || parseFloat(custoReal) || undefined,
        valorRepassado: valorTotal || undefined,
        margemLucro: (valorTotal) - (linkedOS.custoReal || parseFloat(custoReal) || 0),
        cotistasSelecionados: cotistasSelecionadosIds,
      });

      // Update linked chamado
      if (linkedChamado) {
        chamadoDB.update(linkedChamado.id, {
          status: 'concluido',
          dataResolucao: new Date().toISOString(),
        });
      }

      // Unblock vessel
      const hasOtherActiveOS = manutencoes.some(m =>
        m.embarcacaoId === boat.id &&
        m.id !== linkedOS.id &&
        m.status !== 'concluido' &&
        m.status !== 'reprovado'
      );

      if (!hasOtherActiveOS) {
        boatDB.update(boat.id, {
          statusOperacional: 'disponivel',
          motivoStatus: undefined,
          observacaoStatus: `Liberada após conclusão da OS ${linkedOS.codigoOS}`,
          dataAlteracaoStatus: new Date().toISOString(),
          emManutencao: false,
        });
      }

      alert(
        `✅ Serviço ${linkedOS.codigoOS} concluído!\n\n` +
        `${transacoesIds.length > 0 ? `${transacoesIds.length} lançamento(s) financeiro(s) gerado(s) para os cotistas selecionados.` : 'Lançamento(s) financeiro(s) processado(s).'}\n` +
        `Embarcação ${getBoatCode(boat)} liberada.`
      );
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Erro ao concluir serviço:', err);
      alert('Erro ao concluir o serviço.');
    } finally {
      setSaving(false);
    }
  };

  const handleDescartarChamado = () => {
    if (!linkedChamado) return;
    if (!window.confirm(`Descartar o chamado ${linkedChamado.codigoChamado}?\n\nIsto indica que a avaria não requer intervenção.`)) return;

    chamadoDB.update(linkedChamado.id, { status: 'descartado' });
    onRefresh();
    onClose();
  };

  // ─── Render ───
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl overflow-hidden font-sans flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#186b77] border border-teal-200/70 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-slate-900 truncate">{titulo}</h3>
                <span className="font-mono text-xs font-bold bg-teal-100 text-[#186b77] px-2 py-0.5 rounded border border-teal-200 shrink-0">
                  {codigo}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                <Ship className="w-3 h-3" /> {getBoatCode(boat)}
                {boat?.modelo && <span className="text-slate-400">• {boat.modelo}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Stepper ── */}
        <div className="px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            {PHASES.map((phase, idx) => {
              const PhaseIcon = phase.icon;
              const isCompleted = idx < currentPhaseIdx;
              const isCurrent = idx === currentPhaseIdx;
              const isFuture = idx > currentPhaseIdx;

              return (
                <React.Fragment key={phase.id}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                      isCurrent ? 'bg-[#186b77] border-[#186b77] text-white ring-4 ring-[#186b77]/20' :
                      'bg-slate-100 border-slate-200 text-slate-400'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : <PhaseIcon className="w-4 h-4" />}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider text-center ${
                      isCompleted ? 'text-emerald-600' :
                      isCurrent ? 'text-[#186b77]' :
                      'text-slate-400'
                    }`}>
                      {phase.label}
                    </span>
                  </div>
                  {idx < PHASES.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${
                      idx < currentPhaseIdx ? 'bg-emerald-400' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

          {/* ── Summary Box ── */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
            {linkedChamado && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Chamado</span>
                  <span className="font-mono font-bold text-[#186b77]">{linkedChamado.codigoChamado}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Solicitante</span>
                  <span className="font-semibold text-slate-800">{linkedChamado.solicitanteNome}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Urgência</span>
                  <span className="font-extrabold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                    {linkedChamado.urgencia}
                  </span>
                </div>
              </>
            )}
            {linkedOS && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Código OS</span>
                  <span className="font-mono font-bold text-blue-700">{linkedOS.codigoOS}</span>
                </div>
                {(linkedOS.oficinaNome || linkedOS.fornecedorId) && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Fornecedor / Oficina</span>
                    <span className="font-semibold text-slate-800">
                      {linkedOS.oficinaNome || fornecedoresList.find(f => f.id === linkedOS.fornecedorId)?.nomeFantasia || '—'}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Cotistas</span>
              <span className="font-semibold text-slate-800">
                {donos.length > 0 ? donos.map(d => d.nome).join(', ') : 'Nenhum cotista vinculado'}
              </span>
            </div>
            {boat && (
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status Embarcação</span>
                <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${
                  boat.statusOperacional === 'em_manutencao' ? 'text-red-700 bg-red-100' :
                  boat.statusOperacional === 'pendencia' ? 'text-amber-700 bg-amber-100' :
                  'text-emerald-700 bg-emerald-100'
                }`}>
                  {boat.statusOperacional === 'em_manutencao' ? '🔒 Bloqueada' :
                   boat.statusOperacional === 'pendencia' ? '⚠️ Pendência' :
                   '✅ Disponível'}
                </span>
              </div>
            )}
          </div>

          {/* ── Description ── */}
          {(linkedChamado?.descricaoAvaria || linkedOS?.descricaoServico) && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Descrição</span>
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium whitespace-pre-wrap">
                {linkedOS?.descricaoServico || linkedChamado?.descricaoAvaria}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ── Phase-specific content ── */}
          {/* ══════════════════════════════════════════════════════════ */}

          {/* ── TRIAGEM Phase ── */}
          {currentPhase === 'triagem' && linkedChamado && (
            <div className="space-y-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                Análise Técnica
              </h4>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Observações da Análise
                </label>
                <textarea
                  rows={3}
                  value={analiseNotes}
                  onChange={(e) => setAnaliseNotes(e.target.value)}
                  placeholder="Registre aqui suas observações técnicas, diagnóstico inicial..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none resize-none focus:ring-2 focus:ring-[#186b77]"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleGerarOS}
                  disabled={saving || !canAdvanceFromTriagem}
                  className="flex-1 px-4 py-2.5 bg-[#186b77] hover:bg-[#12555f] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
                  Gerar OS e Bloquear Embarcação
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDescartarChamado}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-200 hover:border-red-200"
                >
                  Descartar
                </button>
              </div>
              <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Ao gerar a OS, a embarcação será automaticamente bloqueada (sem reservas).
              </p>
            </div>
          )}

          {/* ── ORÇAMENTO Phase ── */}
          {currentPhase === 'orcamento' && linkedOS && (
            <div className="space-y-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-200/60">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Dados do Orçamento
              </h4>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Fornecedor / Oficina *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setModalInitialEditId(undefined);
                      setShowFornecedoresModal(true);
                    }}
                    className="text-xs font-bold text-[#186b77] hover:text-[#12555f] flex items-center gap-1 cursor-pointer transition-colors"
                    title="Cadastrar novo fornecedor ou oficina"
                  >
                    <Plus className="w-3.5 h-3.5" /> Novo Fornecedor
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={fornecedorId}
                    onChange={(e) => handleFornecedorChange(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#186b77] cursor-pointer"
                  >
                    <option value="">Selecione o fornecedor...</option>
                    {fornecedoresList
                      .filter(f => f.status !== 'inativo')
                      .map(f => (
                        <option key={f.id} value={f.id}>
                          {f.nomeFantasia || f.razaoSocial} {f.cnpjCpf ? `(${f.cnpjCpf})` : ''}
                        </option>
                      ))}
                    {fornecedorId && !fornecedoresList.some(f => f.id === fornecedorId) && (
                      <option value={fornecedorId}>
                        {oficinaNome || 'Fornecedor vinculado'}
                      </option>
                    )}
                  </select>

                  {fornecedorId && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setModalInitialEditId(fornecedorId);
                          setShowFornecedoresModal(true);
                        }}
                        className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                        title="Editar este fornecedor"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const f = fornecedoresList.find(item => item.id === fornecedorId);
                          const nome = f?.nomeFantasia || oficinaNome || 'este fornecedor';
                          if (window.confirm(`Deseja realmente remover o fornecedor "${nome}"?`)) {
                            await fornecedorDB.delete(fornecedorId);
                            handleFornecedorChange('');
                            await fetchFornecedores();
                            if (onRefresh) onRefresh();
                          }
                        }}
                        className="p-2.5 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                        title="Excluir este fornecedor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {fornecedorId && (
                  <div className="text-[11px] text-slate-500 font-medium pl-1">
                    {(() => {
                      const f = fornecedoresList.find(item => item.id === fornecedorId);
                      if (!f) return null;
                      return (
                        <span>
                          {f.razaoSocial && f.razaoSocial !== f.nomeFantasia ? `${f.razaoSocial} • ` : ''}
                          {f.cnpjCpf ? `CNPJ/CPF: ${f.cnpjCpf}` : ''}
                        </span>
                      );
                    })()}
                  </div>
                )}
                {fornecedoresList.length === 0 && (
                  <p className="text-[11px] text-amber-600 font-medium pl-1">
                    Nenhum fornecedor cadastrado. Clique em "+ Novo Fornecedor" para cadastrar a oficina.
                  </p>
                )}
              </div>

              {/* DETALHAMENTO DE ITENS, PEÇAS E SERVIÇOS DO ORÇAMENTO */}
              <div className="space-y-3 pt-3 border-t border-blue-200/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-blue-600" />
                      Itens & Serviços do Orçamento ({itensOrcamento.length})
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Descreva cada peça e serviço. O custo final do cliente e o rateio por cotista são calculados automaticamente.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddItem()}
                    className="px-3 py-1.5 bg-[#186b77] hover:bg-[#12555f] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Item
                  </button>
                </div>

                {/* Sugestões Rápidas (Chips) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] custom-scrollbar">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Atalhos:
                  </span>
                  {[
                    { label: 'Óleo 4T Náutico', tipo: 'peca' as const, valor: 95 },
                    { label: 'Filtro de Óleo', tipo: 'peca' as const, valor: 140 },
                    { label: 'Filtro Combustível', tipo: 'peca' as const, valor: 180 },
                    { label: 'Velas de Ignição', tipo: 'peca' as const, valor: 85 },
                    { label: 'Mão de Obra de Revisão', tipo: 'servico' as const, valor: 450 },
                    { label: 'Revisão de Turbina / Cinta', tipo: 'servico' as const, valor: 650 },
                    { label: 'Reparo Elétrico / Chicote', tipo: 'servico' as const, valor: 350 },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddItem(preset.label, preset.tipo, preset.valor)}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-lg shrink-0 font-medium transition-colors cursor-pointer"
                      title={`Adicionar ${preset.label}`}
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>

                {/* Tabela ou Empty State */}
                {itensOrcamento.length === 0 ? (
                  <div className="p-5 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-2.5">
                    <Package className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      Nenhum item discriminado ainda no orçamento.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddItem()}
                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        + Adicionar Primeiro Item
                      </button>
                      {parseFloat(valorRepassado) > 0 && (
                        <button
                          type="button"
                          onClick={handleConvertValorEmItem}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Converter valor atual (R$ {parseFloat(valorRepassado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white custom-scrollbar">
                      <table className="w-full text-left text-xs min-w-[760px]">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-3 min-w-[340px]">Descrição da Peça ou Serviço</th>
                            <th className="py-3 px-2 w-24 text-center">Tipo</th>
                            <th className="py-3 px-2 w-16 text-center">Qtd</th>
                            <th className="py-3 px-2 w-32 text-right">Val. Unitário (R$)</th>
                            <th className="py-3 px-2 w-28 text-right text-slate-400 font-normal">Custo Ofic. (R$)</th>
                            <th className="py-3 px-3 w-32 text-right font-bold text-slate-800">Subtotal Cliente</th>
                            <th className="py-3 px-2 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {itensOrcamento.map((item, idx) => {
                            const subtotal = (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
                            return (
                              <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-2.5 px-3 min-w-[340px]">
                                  <input
                                    type="text"
                                    value={item.nome}
                                    onChange={(e) => handleUpdateItem(item.id || String(idx), 'nome', e.target.value)}
                                    placeholder="Nome da peça ou serviço (ex: Troca de Óleo Yamalube 4T 20W-50)..."
                                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#186b77] focus:border-[#186b77] transition-all shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
                                  />
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <select
                                    value={item.tipo || 'peca'}
                                    onChange={(e) => handleUpdateItem(item.id || String(idx), 'tipo', e.target.value as any)}
                                    className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
                                  >
                                    <option value="peca">Peça</option>
                                    <option value="servico">Serviço</option>
                                    <option value="material">Material</option>
                                  </select>
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={item.quantidade}
                                    onChange={(e) => handleUpdateItem(item.id || String(idx), 'quantidade', parseFloat(e.target.value) || 1)}
                                    className="w-16 px-2 py-2 text-center bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#186b77]"
                                  />
                                </td>
                                <td className="py-2.5 px-2 text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.valorUnitario}
                                    onChange={(e) => handleUpdateItem(item.id || String(idx), 'valorUnitario', parseFloat(e.target.value) || 0)}
                                    placeholder="0,00"
                                    className="w-28 px-3 py-2 text-right bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#186b77]"
                                  />
                                </td>
                                <td className="py-2.5 px-2 text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.custoUnitario !== undefined ? item.custoUnitario : ''}
                                    onChange={(e) => handleUpdateItem(item.id || String(idx), 'custoUnitario', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                                    placeholder="Opcional"
                                    className="w-24 px-2.5 py-2 text-right bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:ring-1 focus:ring-slate-400"
                                    title="Custo unitário cobrado pela oficina (opcional)"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-[#186b77] text-xs sm:text-sm">
                                  {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(item.id || String(idx))}
                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Remover item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {itensOrcamento.length > 0 && (
                          <tfoot className="bg-slate-50/80 font-bold text-xs border-t border-slate-200">
                            <tr>
                              <td colSpan={5} className="py-3 px-3 text-right uppercase text-[10px] tracking-wider text-slate-500">
                                Soma Total dos Itens:
                              </td>
                              <td className="py-3 px-3 text-right text-sm font-black text-[#186b77]">
                                {subtotalItensCliente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleAddItem()}
                        className="text-xs font-bold text-[#186b77] hover:text-[#12555f] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Outro Item
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RESUMO DE VALORES E CUSTO FINAL DO CLIENTE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Custo Real (Oficina) *</span>
                    <span className="text-[10px] font-normal text-slate-400">Total pago ao fornecedor</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={custoReal}
                      onChange={(e) => setCustoReal(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#186b77]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Custo Final do Cliente *</span>
                    {itensOrcamento.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> Calculado dos Itens
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={valorRepassado}
                      onChange={(e) => setValorRepassado(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#186b77]"
                    />
                  </div>
                </div>
              </div>

              {/* SELEÇÃO DE COTISTAS RESPONSÁVEIS PELO FINANCEIRO */}
              {donos.length > 0 && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-4 h-4 text-[#186b77]" />
                        Cotistas Responsáveis pelo Pagamento ({donosSelecionados.length} de {donos.length})
                      </label>
                      <span className="text-[10px] text-slate-500">
                        Marque quais cotistas devem pagar esta OS (permite cobrança exclusiva ou rateio seletivo).
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={handleSelectAllCotistas}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Marcar Todos
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllCotistas}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* Cards / Toggles de Cotistas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {donos.map(dono => {
                      const isSelected = cotistasSelecionadosIds.includes(dono.id);
                      const cotaValor = donosSelecionados.length > 0
                        ? (parseFloat(valorRepassado) || subtotalItensCliente || 0) / donosSelecionados.length
                        : 0;

                      return (
                        <div
                          key={dono.id}
                          onClick={() => handleToggleCotista(dono.id)}
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-teal-50/80 border-[#186b77] text-slate-900 shadow-2xs font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-[#186b77] focus:ring-[#186b77] cursor-pointer shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="truncate block font-bold text-slate-900">{dono.nome}</span>
                              {dono.cota && <span className="text-[10px] text-slate-400 font-mono">Cota: {dono.cota}</span>}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="text-right shrink-0">
                              <span className="text-[9px] uppercase font-bold text-teal-800 block">Cota:</span>
                              <span className="font-mono font-bold text-[#186b77]">
                                {cotaValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Informativo de Rateio Seletivo */}
                  <div className="text-[11px] p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-medium">
                    {donosSelecionados.length === 0 ? (
                      <span className="text-red-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Nenhum cotista selecionado! O financeiro não poderá ser gerado.
                      </span>
                    ) : donosSelecionados.length === 1 ? (
                      <span className="text-teal-800 font-semibold">
                        🎯 <strong>Cobrança Exclusiva:</strong> 100% cobrado apenas de <strong>{donosSelecionados[0].nome}</strong>.
                      </span>
                    ) : donosSelecionados.length === donos.length ? (
                      <span className="text-slate-600">
                        👥 <strong>Rateio Geral:</strong> Dividido igualmente entre todos os {donos.length} cotistas.
                      </span>
                    ) : (
                      <span className="text-amber-800 font-semibold">
                        ⚖️ <strong>Rateio Seletivo ({donosSelecionados.length} de {donos.length} cotistas):</strong> Cobrança dividida apenas entre os sócios marcados.
                      </span>
                    )}

                    {donosSelecionados.length > 0 && valorRepassado && parseFloat(valorRepassado) > 0 && (
                      <span className="font-black text-[#186b77] shrink-0 sm:ml-2">
                        R$ {((parseFloat(valorRepassado) || 0) / donosSelecionados.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / cotista
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* CARDS DE MARGEM E RATEIO POR COTISTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Margem */}
                {margem !== null && (
                  <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-2xs ${
                    margem >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Margem da Empresa</span>
                      <span className="text-sm font-black">R$ {margem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${margem >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {custoReal && parseFloat(custoReal) > 0 ? `${((margem / parseFloat(custoReal)) * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                )}

                {/* Valor por Cotista Selecionado */}
                {donos.length > 0 && valorRepassado && (
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-white text-xs shadow-2xs flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        Valor por Cotista ({donosSelecionados.length > 0 ? `${donosSelecionados.length} selecionado(s)` : 'Nenhum'})
                      </span>
                      <span className="text-sm font-black text-[#186b77]">
                        R$ {((parseFloat(valorRepassado) || 0) / Math.max(donosSelecionados.length, 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {donosSelecionados.length > 0 ? `${(100 / donosSelecionados.length).toFixed(0)}% / cota` : '0%'}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Descrição do Serviço / Observações
                </label>
                <textarea
                  rows={2}
                  value={descricaoServico}
                  onChange={(e) => setDescricaoServico(e.target.value)}
                  placeholder="Detalhes adicionais sobre o serviço a realizar..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none resize-none focus:ring-2 focus:ring-[#186b77]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSalvarOrcamento}
                  disabled={saving}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Salvar Rascunho
                </button>
                <button
                  onClick={handleEnviarParaAprovacao}
                  disabled={saving || !canAdvanceFromOrcamento}
                  className="flex-1 px-4 py-2.5 bg-[#186b77] hover:bg-[#12555f] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar para Aprovação dos Sócios
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {!canAdvanceFromOrcamento && (
                <p className="text-[11px] text-red-600 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> Preencha o fornecedor e informe os itens ou valores do orçamento para avançar.
                </p>
              )}
            </div>
          )}

          {/* ── APROVAÇÃO Phase ── */}
          {currentPhase === 'aprovacao' && linkedOS && (
            <div className="space-y-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-200/60">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                Aguardando Aprovação dos Sócios
              </h4>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Fornecedor / Oficina:</span>
                  <span className="font-semibold text-slate-800">
                    {linkedOS.oficinaNome || fornecedoresList.find(f => f.id === linkedOS.fornecedorId)?.nomeFantasia || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Custo Real:</span>
                  <span className="font-semibold text-slate-800">R$ {(linkedOS.custoReal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Valor Repasse:</span>
                  <span className="font-semibold text-slate-800">R$ {(linkedOS.valorRepassado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Valor por Cotista:</span>
                  <span className="font-bold text-[#186b77]">
                    R$ {((linkedOS.valorRepassado || 0) / Math.max(donosSelecionados.length > 0 ? donosSelecionados.length : donos.length, 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    {donosSelecionados.length > 0 && donosSelecionados.length < donos.length && ` (${donosSelecionados.length} de ${donos.length} selecionados)`}
                  </span>
                </div>
              </div>

              {/* Cotistas Selecionados para esta Aprovação */}
              {donos.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px] block">
                    Cotistas Responsáveis ({donosSelecionados.length} de {donos.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {donos.map(d => {
                      const isSel = cotistasSelecionadosIds.includes(d.id);
                      return (
                        <span
                          key={d.id}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
                            isSel
                              ? 'bg-teal-50 border-teal-200 text-[#186b77] font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                          }`}
                        >
                          {d.nome} {isSel ? '✓' : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Itens detalhados do orçamento */}
              {linkedOS.pecas && linkedOS.pecas.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px] block">
                    Itens Orçados ({linkedOS.pecas.length})
                  </span>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto custom-scrollbar">
                    {linkedOS.pecas.map((it: any, pIdx: number) => {
                      const itemSubtotal = (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0);
                      return (
                        <div key={pIdx} className="py-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-700 truncate pr-2">
                            <span className="font-bold text-slate-900">{it.quantidade}x</span> {it.nome}
                          </span>
                          <span className="font-bold text-[#186b77] whitespace-nowrap">
                            {itemSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleAprovar}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Sócios Aprovaram
                </button>
                <button
                  onClick={handleReprovar}
                  disabled={saving}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-red-200"
                >
                  <Ban className="w-4 h-4" />
                  Reprovar
                </button>
              </div>
            </div>
          )}

          {/* ── EXECUÇÃO Phase ── */}
          {currentPhase === 'execucao' && linkedOS && (
            <div className="space-y-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-200/60">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-purple-600" />
                Serviço em Andamento
              </h4>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Fornecedor / Oficina:</span>
                  <span className="font-semibold text-slate-800">
                    {linkedOS.oficinaNome || fornecedoresList.find(f => f.id === linkedOS.fornecedorId)?.nomeFantasia || '—'}
                  </span>
                </div>
                {linkedOS.dataAprovacao && (
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-500">Aprovado em:</span>
                    <span className="font-semibold text-slate-800">{new Date(linkedOS.dataAprovacao).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {linkedOS.dataInicioServico && (
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-500">Início do Serviço:</span>
                    <span className="font-semibold text-slate-800">{new Date(linkedOS.dataInicioServico).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Valor Repassado aos Sócios:</span>
                  <span className="font-bold text-[#186b77]">R$ {(linkedOS.valorRepassado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Itens detalhados do serviço */}
              {linkedOS.pecas && linkedOS.pecas.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px] block">
                    Peças & Serviços em Execução ({linkedOS.pecas.length})
                  </span>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto custom-scrollbar">
                    {linkedOS.pecas.map((it: any, pIdx: number) => {
                      const itemSubtotal = (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0);
                      return (
                        <div key={pIdx} className="py-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-700 truncate pr-2">
                            <span className="font-bold text-slate-900">{it.quantidade}x</span> {it.nome}
                          </span>
                          <span className="font-bold text-[#186b77] whitespace-nowrap">
                            {itemSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={handleConcluirServico}
                disabled={saving}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" />
                Concluir Serviço e Liberar Embarcação
              </button>
              <p className="text-[11px] text-purple-700 font-medium flex items-center gap-1.5">
                <Unlock className="w-3 h-3" /> Ao concluir, a embarcação será liberada e os lançamentos financeiros serão gerados automaticamente.
              </p>
            </div>
          )}

          {/* ── CONCLUÍDO Phase ── */}
          {currentPhase === 'concluido' && linkedOS && (
            <div className="space-y-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/60">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Serviço Concluído
              </h4>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                {linkedOS.dataConclusao && (
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-500">Concluído em:</span>
                    <span className="font-semibold text-slate-800">{new Date(linkedOS.dataConclusao).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Custo Real:</span>
                  <span className="font-semibold text-slate-800">R$ {(linkedOS.custoReal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Valor Repassado:</span>
                  <span className="font-semibold text-slate-800">R$ {(linkedOS.valorRepassado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Margem:</span>
                  <span className={`font-bold ${(linkedOS.margemLucro || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    R$ {(linkedOS.margemLucro || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {linkedOS.transacoesGeradas && linkedOS.transacoesGeradas.length > 0 && (
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-500">Lançamentos Gerados:</span>
                    <span className="font-semibold text-emerald-700">{linkedOS.transacoesGeradas.length} transação(ões)</span>
                  </div>
                )}
              </div>

              {/* Itens concluídos do serviço */}
              {linkedOS.pecas && linkedOS.pecas.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px] block">
                    Detalhamento dos Itens Finalizados ({linkedOS.pecas.length})
                  </span>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto custom-scrollbar">
                    {linkedOS.pecas.map((it: any, pIdx: number) => {
                      const itemSubtotal = (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0);
                      return (
                        <div key={pIdx} className="py-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-700 truncate pr-2">
                            <span className="font-bold text-slate-900">{it.quantidade}x</span> {it.nome}
                          </span>
                          <span className="font-bold text-[#186b77] whitespace-nowrap">
                            {itemSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PDF Buttons (always visible when OS exists) ── */}
          {linkedOS && (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => generateOrcamentoPDF(linkedOS, boat, donosSelecionados.length > 0 ? donosSelecionados : donos)}
                className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 hover:border-slate-300"
              >
                <Printer className="w-4 h-4" />
                PDF Orçamento
              </button>
              <button
                onClick={() => generateOrdemServicoPDF(linkedOS, boat)}
                className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 hover:border-slate-300"
              >
                <Printer className="w-4 h-4" />
                PDF Ordem de Serviço
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* ── Modal de Gestão de Fornecedores ── */}
      {showFornecedoresModal && (
        <FornecedoresModal
          selectedId={fornecedorId}
          initialEditFornecedorId={modalInitialEditId}
          onClose={() => {
            setShowFornecedoresModal(false);
            setModalInitialEditId(undefined);
          }}
          onSelect={(forn) => {
            handleFornecedorChange(forn.id);
            fetchFornecedores();
          }}
          onRefresh={() => {
            fetchFornecedores();
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
