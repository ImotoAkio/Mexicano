import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Settings,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  SlidersHorizontal,
  FileSignature,
  Paperclip,
  Wallet,
  Sparkles,
  ArrowUpRight,
  Lock,
  Unlock,
  Check,
  Eye,
  Plus
} from 'lucide-react';
import {
  VendaComercial,
  Cliente,
  Embarcacao,
  ConfigMotorComissoes,
  FechamentoQuinzenaComissao
} from '../../types';
import { clientDB, boatDB, syncWithRemote, onDbUpdate } from '../../db';
import ComercialComissoesConfigModal, {
  DEFAULT_MOTOR_COMISSOES_CONFIG
} from './ComercialComissoesConfigModal';
import ComercialContratoViewerModal from './ComercialContratoViewerModal';
import ClientProfileModal from '../ClientProfileModal';
import ComercialVendaDrawer from './ComercialVendaDrawer';

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

function getDaysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

function getWeeksCountInMonth(year: number, monthZeroIndexed: number, modo: 'auto' | '4' | '5'): 4 | 5 {
  if (modo === '4') return 4;
  if (modo === '5') return 5;
  const totalDays = getDaysInMonth(year, monthZeroIndexed);
  return totalDays >= 29 ? 5 : 4;
}

function getWeekOfMonthFromDateStr(dateStr: string): number {
  const parts = (dateStr || '').split('T')[0].split('-').map(Number);
  const day = parts[2] || 1;
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  if (day <= 28) return 4;
  return 5;
}

export interface AvaliacaoProcessosVenda {
  vendaAtiva: boolean;
  entradaPagaOk: boolean;
  comprovanteOk: boolean;
  contratoAquisicaoOk: boolean;
  contratoAdmOk: boolean;
  liberadaManual: boolean;
  todosProcessosConcluidos: boolean;
  etapasPendentes: string[];
}

export function avaliarProcessosVenda(
  venda: VendaComercial,
  config: ConfigMotorComissoes
): AvaliacaoProcessosVenda {
  const vendaAtiva = venda.status !== 'cancelada';
  const req = config.requisitosVendaConcluida;

  const isEntradaPaid =
    Number(venda.valorEntrada) <= 0 ||
    Boolean(venda.entradaPaga) ||
    venda.statusEntradaFinanceiro === 'pago';

  const hasComprovante =
    Number(venda.valorEntrada) <= 0 || Boolean(venda.comprovanteEntrada);

  const isAqSigned = venda.clienteContratoAquisicaoStatus === 'assinado';
  const isAdmSigned = venda.clienteContratoAdmStatus === 'assinado';
  const liberadaManual = Boolean(venda.comissaoLiberadaManual);

  const etapasPendentes: string[] = [];
  if (req.exigirEntradaPaga && !isEntradaPaid) {
    etapasPendentes.push('Entrada Paga');
  }
  if (req.exigirComprovanteEntrada && !hasComprovante) {
    etapasPendentes.push('Comprovante');
  }
  if (req.exigirContratoAquisicaoAssinado && !isAqSigned) {
    etapasPendentes.push('Contrato Aquisição');
  }
  if (req.exigirContratoAdmAssinado && !isAdmSigned) {
    etapasPendentes.push('Contrato Gestão');
  }

  const todosProcessosConcluidos =
    vendaAtiva && (liberadaManual || etapasPendentes.length === 0);

  return {
    vendaAtiva,
    entradaPagaOk: isEntradaPaid,
    comprovanteOk: hasComprovante,
    contratoAquisicaoOk: isAqSigned,
    contratoAdmOk: isAdmSigned,
    liberadaManual,
    todosProcessosConcluidos,
    etapasPendentes
  };
}

export default function ComercialComissoesPage() {
  const [vendas, setVendas] = useState<VendaComercial[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [config, setConfig] = useState<ConfigMotorComissoes>(() => {
    try {
      const saved = localStorage.getItem('comercial_motor_comissoes_config');
      if (saved) return { ...DEFAULT_MOTOR_COMISSOES_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_MOTOR_COMISSOES_CONFIG;
  });
  const [fechamentos, setFechamentos] = useState<FechamentoQuinzenaComissao[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Competência selecionada (YYYY-MM)
  const [competencia, setCompetencia] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modo Simulador Interativo
  const [simuladorAtivo, setSimuladorAtivo] = useState<boolean>(false);
  const [simCotasQ1, setSimCotasQ1] = useState<number>(6);
  const [simCotasQ2, setSimCotasQ2] = useState<number>(10);

  // Filtros da tabela de auditoria de vendas
  const [auditFilter, setAuditFilter] = useState<'all' | 'concluidas' | 'pendentes' | 'q1' | 'q2'>('all');

  // Modais
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isVendaDrawerOpen, setIsVendaDrawerOpen] = useState<boolean>(false);
  const [contractViewerTarget, setContractViewerTarget] = useState<{
    client: Cliente;
    type: 'aquisicao' | 'adm';
  } | null>(null);
  const [profileClient, setProfileClient] = useState<Cliente | null>(null);

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadLocalStores = () => {
    setClients([...clientDB.getAll()]);
    setBoats([...boatDB.getAll()]);
  };

  const fetchAllData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const headers = getAuthHeader();
      const [vendasRes, cfgRes, fechRes] = await Promise.all([
        fetch('/api/comercial/vendas', { credentials: 'include', headers }),
        fetch('/api/comercial/comissoes/config', { credentials: 'include', headers }),
        fetch(`/api/comercial/comissoes/fechamentos?competencia=${competencia}`, {
          credentials: 'include',
          headers
        })
      ]);

      if (vendasRes.ok) {
        const vData = await vendasRes.json();
        if (Array.isArray(vData.vendas)) setVendas(vData.vendas);
      }

      if (cfgRes.ok) {
        const cData = await cfgRes.json();
        if (cData.config) {
          setConfig(cData.config);
          localStorage.setItem('comercial_motor_comissoes_config', JSON.stringify(cData.config));
        }
      }

      if (fechRes.ok) {
        const fData = await fechRes.json();
        if (Array.isArray(fData.fechamentos)) {
          setFechamentos(fData.fechamentos);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados do módulo de comissões:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLocalStores();
    fetchAllData();

    const unsub = onDbUpdate(() => {
      loadLocalStores();
    });

    if (clientDB.getAll().length === 0) {
      syncWithRemote().then(loadLocalStores).catch(() => {});
    }

    return () => unsub();
  }, [competencia]);

  // Navegação de Mês/Ano
  const [compYear, compMonth] = useMemo(() => {
    const [y, m] = competencia.split('-').map(Number);
    return [y || new Date().getFullYear(), (m || 1) - 1];
  }, [competencia]);

  const handleChangeMonth = (delta: number) => {
    const d = new Date(compYear, compMonth + delta, 1);
    const nextComp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setCompetencia(nextComp);
  };

  // Salvar configuração do Administrador
  const handleSaveConfig = async (newConfig: ConfigMotorComissoes) => {
    setConfig(newConfig);
    localStorage.setItem('comercial_motor_comissoes_config', JSON.stringify(newConfig));
    const res = await fetch('/api/comercial/comissoes/config', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(newConfig)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.config) setConfig(data.config);
    }
  };

  // Vendas filtradas pela competência selecionada
  const vendasDoMes = useMemo(() => {
    return vendas
      .filter(v => {
        if (v.status === 'cancelada') return false;
        const dv = (v.dataVenda || '').slice(0, 7);
        return dv === competencia;
      })
      .map(v => {
        const avaliacao = avaliarProcessosVenda(v, config);
        const dia = parseInt((v.dataVenda || '').split('T')[0].split('-')[2] || '1', 10) || 1;
        const quinzena: 1 | 2 = dia <= config.diaCorteQuinzena1 ? 1 : 2;
        const semana = getWeekOfMonthFromDateStr(v.dataVenda);
        return {
          ...v,
          avaliacao,
          diaVenda: dia,
          quinzena,
          semana
        };
      });
  }, [vendas, competencia, config]);

  // Cálculo completo do Motor de Comissões e Bonificações
  const apuracao = useMemo(() => {
    const numSemanasMes = getWeeksCountInMonth(compYear, compMonth, config.semanasNoMesModo);
    const concluidasReais = vendasDoMes.filter(v => v.avaliacao.todosProcessosConcluidos);
    const pendentesReais = vendasDoMes.filter(v => !v.avaliacao.todosProcessosConcluidos);

    const cotasQ1Real = concluidasReais.filter(v => v.quinzena === 1).length;
    const cotasQ2Real = concluidasReais.filter(v => v.quinzena === 2).length;

    const cotasQ1 = simuladorAtivo ? Math.max(0, simCotasQ1) : cotasQ1Real;
    const cotasQ2 = simuladorAtivo ? Math.max(0, simCotasQ2) : cotasQ2Real;
    const cotasMes = cotasQ1 + cotasQ2;

    // Distribuição por semana (1..5)
    const cotasPorSemana: number[] = Array(numSemanasMes).fill(0);
    if (simuladorAtivo) {
      // Distribuir simulação proporcionalmente entre as semanas da Q1 (Sem 1 e 2) e Q2 (Sem 3, 4, 5)
      cotasPorSemana[0] = Math.ceil(cotasQ1 / 2);
      cotasPorSemana[1] = Math.floor(cotasQ1 / 2);
      const remSemanas = numSemanasMes - 2;
      let restQ2 = cotasQ2;
      for (let i = 2; i < numSemanasMes; i++) {
        const share = i === numSemanasMes - 1 ? restQ2 : Math.round(cotasQ2 / remSemanas);
        cotasPorSemana[i] = Math.max(0, share);
        restQ2 -= share;
      }
    } else {
      concluidasReais.forEach(v => {
        const idx = Math.min(numSemanasMes - 1, Math.max(0, v.semana - 1));
        cotasPorSemana[idx] += 1;
      });
    }

    // 1. Função de Faixa de Comissão por Cota (Escalonada e Retroativa)
    const obterFaixaComissao = (qtdCotas: number) => {
      const sorted = [...config.faixasComissao].sort((a, b) => a.minCotas - b.minCotas);
      let matched = sorted[0] || { id: 'default', minCotas: 0, maxCotas: 4, valorPorCota: 0 };
      for (const f of sorted) {
        const minOk = qtdCotas >= f.minCotas;
        const maxOk = f.maxCotas === null || qtdCotas <= f.maxCotas;
        if (minOk && maxOk) {
          matched = f;
          break;
        }
        if (minOk && f.maxCotas === null) {
          matched = f;
        }
      }
      return matched;
    };

    const faixaQ1 = obterFaixaComissao(cotasQ1);
    const faixaFinal = obterFaixaComissao(cotasMes);

    // Próxima faixa de comissão para incentivar a equipe
    const proximaFaixaComissao = [...config.faixasComissao]
      .sort((a, b) => a.minCotas - b.minCotas)
      .find(f => f.minCotas > cotasMes) || null;

    // 2. Cálculo de Bônus Semanal (Progressivo e Acumulativo + Superávit/Déficit)
    const metaSem = Math.max(1, config.metaSemanalCotas || 4);
    const calcularMetasSemanaisBatidas = (totalCotasAcumuladas: number, isFullMonth: boolean) => {
      if (config.regraSuperavitSemanal) {
        // Com compensação de superávit/déficit, cada múltiplo de metaSem cotas destrava 1 meta semanal (limitado às semanas do mês)
        return Math.min(numSemanasMes, Math.floor(totalCotasAcumuladas / metaSem));
      }
      // Sem compensação entre semanas: conta apenas semanas individuais que atingiram >= metaSem
      const limitWeek = isFullMonth ? numSemanasMes : 2;
      return cotasPorSemana.slice(0, limitWeek).filter(c => c >= metaSem).length;
    };

    const metasSemanaisQ1 = calcularMetasSemanaisBatidas(cotasQ1, false);
    const metasSemanaisMes = calcularMetasSemanaisBatidas(cotasMes, true);

    const somarBonusProgressivo = (qtdMetas: number) => {
      let soma = 0;
      for (let i = 0; i < qtdMetas; i++) {
        const val =
          config.bonusSemanalProgressivo[i] ??
          config.bonusSemanalProgressivo[config.bonusSemanalProgressivo.length - 1] ??
          0;
        soma += Number(val) || 0;
      }
      return soma;
    };

    const bonusSemanalQ1 = somarBonusProgressivo(metasSemanaisQ1);
    const bonusSemanalTotalMes = somarBonusProgressivo(metasSemanaisMes);

    // 3. Cálculo de Bônus Mensal de Volume Total (Não acumulativo — vale a maior faixa)
    const obterFaixaBonusMensal = (qtdCotas: number) => {
      const sorted = [...config.faixasBonusMensal].sort((a, b) => a.minCotas - b.minCotas);
      let matched: (typeof sorted)[0] | null = null;
      for (const bm of sorted) {
        if (qtdCotas >= bm.minCotas && (bm.maxCotas === null || qtdCotas <= bm.maxCotas)) {
          matched = bm;
        }
      }
      return matched;
    };

    const faixaBonusMensalQ1 = obterFaixaBonusMensal(cotasQ1);
    const faixaBonusMensalFinal = obterFaixaBonusMensal(cotasMes);

    const bonusMensalQ1 = faixaBonusMensalQ1 ? Number(faixaBonusMensalQ1.valorBonus) || 0 : 0;
    const bonusMensalTotalMes = faixaBonusMensalFinal ? Number(faixaBonusMensalFinal.valorBonus) || 0 : 0;

    // 4. Apuração 1ª Quinzena (Dia 15) vs 2ª Quinzena (Fim do Mês com Compensação Retroativa)
    const fechQ1Salvo = !simuladorAtivo ? fechamentos.find(f => f.quinzena === 1 && f.status !== 'aberto') : null;
    const fechQ2Salvo = !simuladorAtivo ? fechamentos.find(f => f.quinzena === 2 && f.status !== 'aberto') : null;

    const comissaoBrutaQ1 = cotasQ1 * faixaQ1.valorPorCota;
    const variavelTotalQ1Calculado = comissaoBrutaQ1 + bonusSemanalQ1 + bonusMensalQ1;

    // Se a 1ª Quinzena já foi fechada/paga, respeita o valor que foi efetivamente quitado na Q1 para fazer a compensação exata na Q2
    const comissaoPagaQ1 = fechQ1Salvo ? fechQ1Salvo.comissaoBasePorVendedor : comissaoBrutaQ1;
    const bonusSemanalPagoQ1 = fechQ1Salvo ? fechQ1Salvo.bonusSemanalPorVendedor : bonusSemanalQ1;
    const bonusMensalPagoQ1 = fechQ1Salvo ? fechQ1Salvo.bonusMensalPorVendedor : bonusMensalQ1;
    const totalPagoQ1PorVendedor = fechQ1Salvo ? fechQ1Salvo.totalVariavelPorVendedor : variavelTotalQ1Calculado;
    const taxaUnitariaAplicadaQ1 = fechQ1Salvo ? fechQ1Salvo.valorUnitarioFaixa : faixaQ1.valorPorCota;
    const cotasBaseQ1 = fechQ1Salvo ? fechQ1Salvo.cotasTotalPeriodo : cotasQ1;

    // Recálculo do Mês Inteiro no 2º Fechamento
    const comissaoTotalMes = cotasMes * faixaFinal.valorPorCota;
    const comissaoNovasVendasQ2 = cotasQ2 * faixaFinal.valorPorCota;
    const diferencaRetroativaQ1 = Math.max(0, comissaoTotalMes - comissaoPagaQ1 - comissaoNovasVendasQ2);
    const subiuFaixaRetroativa = faixaFinal.valorPorCota > taxaUnitariaAplicadaQ1 && cotasBaseQ1 > 0;

    const saldoBonusSemanalQ2 = Math.max(0, bonusSemanalTotalMes - bonusSemanalPagoQ1);
    const saldoBonusMensalQ2 = Math.max(0, bonusMensalTotalMes - bonusMensalPagoQ1);

    const totalVariavelMesPorVendedor = comissaoTotalMes + bonusSemanalTotalMes + bonusMensalTotalMes;
    const totalAPagarQ2PorVendedor = Math.max(0, totalVariavelMesPorVendedor - totalPagoQ1PorVendedor);

    // Equipe Comercial (Todos os vendedores ativos recebem da mesma forma)
    const vendedoresAtivos = config.equipeComercial.filter(m => m.ativo);
    const qtdVendedores = Math.max(1, vendedoresAtivos.length);

    const pacoteMensalIndividual = config.salarioBase + totalVariavelMesPorVendedor;
    const custoTotalVariavelEquipeQ1 = totalPagoQ1PorVendedor * qtdVendedores;
    const custoTotalVariavelEquipeQ2 = totalAPagarQ2PorVendedor * qtdVendedores;
    const custoTotalVariavelEquipeMes = totalVariavelMesPorVendedor * qtdVendedores;
    const custoTotalFolhaComercialMes =
      vendedoresAtivos.reduce(
        (acc, m) => acc + (m.salarioBaseCustom ?? config.salarioBase) + totalVariavelMesPorVendedor,
        0
      ) || pacoteMensalIndividual * qtdVendedores;

    return {
      numSemanasMes,
      metaSem,
      concluidasCount: concluidasReais.length,
      pendentesCount: pendentesReais.length,
      cotasQ1,
      cotasQ2,
      cotasMes,
      cotasPorSemana,
      faixaQ1,
      faixaFinal,
      proximaFaixaComissao,
      metasSemanaisQ1,
      metasSemanaisMes,
      bonusSemanalQ1,
      bonusSemanalTotalMes,
      faixaBonusMensalFinal,
      bonusMensalQ1,
      bonusMensalTotalMes,
      comissaoBrutaQ1,
      comissaoPagaQ1,
      bonusSemanalPagoQ1,
      bonusMensalPagoQ1,
      totalPagoQ1PorVendedor,
      taxaUnitariaAplicadaQ1,
      cotasBaseQ1,
      comissaoTotalMes,
      comissaoNovasVendasQ2,
      diferencaRetroativaQ1,
      subiuFaixaRetroativa,
      saldoBonusSemanalQ2,
      saldoBonusMensalQ2,
      totalVariavelMesPorVendedor,
      totalAPagarQ2PorVendedor,
      pacoteMensalIndividual,
      vendedoresAtivos,
      qtdVendedores,
      custoTotalVariavelEquipeQ1,
      custoTotalVariavelEquipeQ2,
      custoTotalVariavelEquipeMes,
      custoTotalFolhaComercialMes,
      fechQ1Salvo,
      fechQ2Salvo
    };
  }, [vendasDoMes, config, compYear, compMonth, simuladorAtivo, simCotasQ1, simCotasQ2, fechamentos]);

  // Salvar fechamento de quinzena (1ª ou 2ª Quinzena)
  const handleFecharQuinzena = async (quinzena: 1 | 2, novoStatus: 'aberto' | 'fechado' | 'pago') => {
    setActionLoadingId(`fech_${quinzena}`);
    try {
      const isQ1 = quinzena === 1;
      const payload = {
        competencia,
        quinzena,
        status: novoStatus,
        cotasTotalPeriodo: isQ1 ? apuracao.cotasQ1 : apuracao.cotasMes,
        cotasNovasQuinzena: isQ1 ? apuracao.cotasQ1 : apuracao.cotasQ2,
        valorUnitarioFaixa: isQ1 ? apuracao.faixaQ1.valorPorCota : apuracao.faixaFinal.valorPorCota,
        comissaoBasePorVendedor: isQ1 ? apuracao.comissaoBrutaQ1 : apuracao.comissaoNovasVendasQ2,
        ajusteRetroativoPorVendedor: isQ1 ? 0 : apuracao.diferencaRetroativaQ1,
        bonusSemanalPorVendedor: isQ1 ? apuracao.bonusSemanalQ1 : apuracao.saldoBonusSemanalQ2,
        bonusMensalPorVendedor: isQ1 ? apuracao.bonusMensalQ1 : apuracao.saldoBonusMensalQ2,
        totalVariavelPorVendedor: isQ1 ? apuracao.totalPagoQ1PorVendedor : apuracao.totalAPagarQ2PorVendedor,
        salarioFixoReferencia: config.salarioBase,
        valeRefeicaoReferencia: config.valeRefeicao,
        qtdVendedoresAtivos: apuracao.qtdVendedores,
        totalFolhaVariavelEquipe: isQ1 ? apuracao.custoTotalVariavelEquipeQ1 : apuracao.custoTotalVariavelEquipeQ2
      };

      const res = await fetch('/api/comercial/comissoes/fechamentos', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchAllData(true);
      }
    } catch (err) {
      console.error('Erro ao fechar quinzena:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Atualizar processo ou liberar venda manualmente
  const handleUpdateProcessoVenda = async (
    vendaId: string,
    body: {
      comissaoLiberadaManual?: boolean;
      marcarEntradaPaga?: boolean;
      marcarContratoAquisicaoAssinado?: boolean;
      marcarContratoAdmAssinado?: boolean;
    }
  ) => {
    setActionLoadingId(vendaId);
    try {
      const res = await fetch(`/api/comercial/vendas/${vendaId}/processos`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await syncWithRemote().catch(() => {});
        loadLocalStores();
        await fetchAllData(true);
      }
    } catch (err) {
      console.error('Erro ao atualizar processo da venda:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const vendasAuditFiltradas = useMemo(() => {
    return vendasDoMes.filter(v => {
      if (auditFilter === 'concluidas' && !v.avaliacao.todosProcessosConcluidos) return false;
      if (auditFilter === 'pendentes' && v.avaliacao.todosProcessosConcluidos) return false;
      if (auditFilter === 'q1' && v.quinzena !== 1) return false;
      if (auditFilter === 'q2' && v.quinzena !== 2) return false;
      return true;
    });
  }, [vendasDoMes, auditFilter]);

  const formatBRL = (val: number) =>
    `R$ ${(Number(val) || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const formatDateBR = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const statusQ1 = apuracao.fechQ1Salvo?.status || 'aberto';
  const statusQ2 = apuracao.fechQ2Salvo?.status || 'aberto';

  return (
    <div className="space-y-5">
      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Motor de Comissões & Bonificações
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-mx-ink-100 text-mx-ink">
              Comissão Coletiva da Equipe
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Apuração quinzenal (Dia {config.diaCorteQuinzena1} e Fim do Mês) com comissão retroativa escalonada, bônus semanal acumulativo e prêmio de volume para todos os vendedores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Seletor de Competência (Mês / Ano) */}
          <div className="h-9 px-1.5 rounded-lg bg-white border border-stone-200/90 flex items-center gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => handleChangeMonth(-1)}
              className="w-7 h-7 rounded-md hover:bg-stone-100 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-2.5 flex items-center gap-1.5 text-xs font-bold text-stone-900 tabular-nums min-w-[130px] justify-center">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <span>
                {MESES_NOMES[compMonth]} {compYear}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleChangeMonth(1)}
              className="w-7 h-7 rounded-md hover:bg-stone-100 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botão Simulador Interativo */}
          <button
            type="button"
            onClick={() => {
              if (!simuladorAtivo) {
                setSimCotasQ1(apuracao.cotasQ1 || 6);
                setSimCotasQ2(apuracao.cotasQ2 || 10);
              }
              setSimuladorAtivo(prev => !prev);
            }}
            className={`h-9 px-3.5 rounded-lg border flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
              simuladorAtivo
                ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                : 'bg-white border-stone-200/90 hover:bg-stone-50 text-stone-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{simuladorAtivo ? 'Sair do Simulador' : 'Simular Cenário'}</span>
          </button>

          {/* Sincronizar */}
          <button
            type="button"
            onClick={() => fetchAllData()}
            disabled={isRefreshing}
            className="h-9 px-3 rounded-lg bg-white border border-stone-200/90 hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
            title="Atualizar vendas e apuração"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          {/* Configurar Regras (Administrador) */}
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="h-9 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white flex items-center gap-2 text-xs font-semibold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configurar Regras</span>
          </button>
        </div>
      </div>

      {/* BARRA DO SIMULADOR INTERATIVO (QUANDO ATIVO) */}
      {simuladorAtivo && (
        <div className="bg-amber-50/90 border border-amber-300/90 rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider">
                Simulador Ativo
              </span>
              <h3 className="text-xs font-bold text-amber-950">
                Teste o cálculo retroativo e os bônus de toda a equipe em tempo real
              </h3>
            </div>
            <p className="text-[11px] text-amber-800">
              Ajuste as cotas vendidas na 1ª e 2ª Quinzena abaixo para visualizar o salto de faixa e a compensação retroativa automática.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-white rounded-xl border border-amber-200 px-3.5 py-2 flex items-center gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-500 block">
                  1ª Quinzena (Até dia {config.diaCorteQuinzena1})
                </span>
                <span className="text-xs font-bold text-stone-900 tabular-nums">
                  {simCotasQ1} {simCotasQ1 === 1 ? 'cota' : 'cotas'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={simCotasQ1}
                onChange={e => setSimCotasQ1(parseInt(e.target.value, 10) || 0)}
                className="w-24 accent-amber-600 cursor-pointer"
              />
              <input
                type="number"
                min={0}
                max={50}
                value={simCotasQ1}
                onChange={e => setSimCotasQ1(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-14 h-8 px-2 rounded-lg border border-stone-200 text-center text-xs font-bold text-stone-900 tabular-nums"
              />
            </div>

            <div className="bg-white rounded-xl border border-amber-200 px-3.5 py-2 flex items-center gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-500 block">
                  2ª Quinzena (Dia {config.diaCorteQuinzena1 + 1} ao Fim)
                </span>
                <span className="text-xs font-bold text-stone-900 tabular-nums">
                  +{simCotasQ2} {simCotasQ2 === 1 ? 'nova cota' : 'novas cotas'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={simCotasQ2}
                onChange={e => setSimCotasQ2(parseInt(e.target.value, 10) || 0)}
                className="w-24 accent-amber-600 cursor-pointer"
              />
              <input
                type="number"
                min={0}
                max={50}
                value={simCotasQ2}
                onChange={e => setSimCotasQ2(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-14 h-8 px-2 rounded-lg border border-stone-200 text-center text-xs font-bold text-stone-900 tabular-nums"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. CARDS DE MÉTRICAS PRINCIPAIS (POR VENDEDOR & EQUIPE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Cotas Concluídas no Mês */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Cotas Concluídas no Mês</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-mx-ink-100 text-mx-ink tabular-nums">
              {formatBRL(apuracao.faixaFinal.valorPorCota)} / cota
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 tabular-nums">
              {apuracao.cotasMes}
            </span>
            <span className="text-xs font-semibold text-stone-500 tabular-nums">
              ({apuracao.cotasQ1} na 1ª Q + {apuracao.cotasQ2} na 2ª Q)
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1 flex items-center justify-between tabular-nums">
            <span>
              {apuracao.pendentesCount > 0
                ? `${apuracao.pendentesCount} aguardando conclusão`
                : 'Todas as vendas concluídas'}
            </span>
            {apuracao.proximaFaixaComissao && (
              <span className="text-emerald-700 font-semibold">
                Faltam {apuracao.proximaFaixaComissao.minCotas - apuracao.cotasMes} p/ {formatBRL(apuracao.proximaFaixaComissao.valorPorCota)}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: 1º Pagamento (Dia 15) */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">
              1º Pagamento (Dia {config.diaCorteQuinzena1})
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                statusQ1 === 'pago'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : statusQ1 === 'fechado'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {statusQ1 === 'pago' ? 'Pago' : statusQ1 === 'fechado' ? 'Fechado' : 'Em Apuração'}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-stone-900 tabular-nums">
              {formatBRL(apuracao.totalPagoQ1PorVendedor)}
              <span className="text-[11px] font-medium text-stone-400 ml-1">/ vendedor</span>
            </div>
            <div className="text-[11px] text-stone-500 mt-1 tabular-nums">
              Comissão: {formatBRL(apuracao.comissaoPagaQ1)} + Bônus: {formatBRL(apuracao.bonusSemanalPagoQ1 + apuracao.bonusMensalPagoQ1)}
            </div>
          </div>
        </div>

        {/* Card 3: 2º Pagamento (Fim do Mês + Retroativo) */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">2º Pagamento (Fim do Mês)</span>
            {apuracao.subiuFaixaRetroativa ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                Retroativo Ativo
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600">
                2ª Quinzena
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-emerald-700 tabular-nums">
              {formatBRL(apuracao.totalAPagarQ2PorVendedor)}
              <span className="text-[11px] font-medium text-stone-400 ml-1">/ vendedor</span>
            </div>
            <div className="text-[11px] text-stone-500 mt-1 tabular-nums">
              {apuracao.diferencaRetroativaQ1 > 0 ? (
                <span className="text-emerald-700 font-semibold">
                  Inclui +{formatBRL(apuracao.diferencaRetroativaQ1)} retroativo da 1ª Q
                </span>
              ) : (
                <span>Novas vendas + saldo de bônus semanais/mensais</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Remuneração Total por Vendedor */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Pacote Mensal / Vendedor</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 tabular-nums">
              + VR {formatBRL(config.valeRefeicao)} à parte
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-stone-900 tabular-nums">
              {formatBRL(apuracao.pacoteMensalIndividual)}
            </div>
            <div className="text-[11px] text-stone-500 mt-1 tabular-nums">
              Fixo {formatBRL(config.salarioBase)} + Variável {formatBRL(apuracao.totalVariavelMesPorVendedor)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. PAINEL VISUAL DOS 3 MÓDULOS DE COMISSÃO E BÔNUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* MÓDULO 1: COMISSÃO POR COTAS (RETROATIVA E ESCALONADA) */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                1. Comissão por Cotas (Retroativa)
              </h3>
              <span className="text-xs font-bold text-stone-900 tabular-nums">
                {formatBRL(apuracao.comissaoTotalMes)}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              A faixa atingida no mês multiplica <strong>todas as {apuracao.cotasMes} cotas</strong> concluídas.
            </p>
          </div>

          <div className="space-y-2">
            {config.faixasComissao.map(faixa => {
              const isCurrent = apuracao.faixaFinal.id === faixa.id;
              const isReached = apuracao.cotasMes >= faixa.minCotas;
              const labelRange =
                faixa.maxCotas === null
                  ? `${faixa.minCotas}+ cotas`
                  : `${faixa.minCotas} a ${faixa.maxCotas} cotas`;

              return (
                <div
                  key={faixa.id}
                  className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition-all ${
                    isCurrent
                      ? 'bg-mx-ink text-white border-mx-ink font-bold'
                      : isReached
                      ? 'bg-emerald-50/60 border-emerald-200 text-stone-800'
                      : 'bg-stone-50/70 border-stone-200/70 text-stone-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isCurrent ? 'bg-emerald-400' : isReached ? 'bg-emerald-500' : 'bg-stone-300'
                      }`}
                    />
                    <span className="tabular-nums">{labelRange}</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span>{formatBRL(faixa.valorPorCota)} / cota</span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-bold">
                        ATUAL
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600 tabular-nums">
            <span>Cálculo acumulado do mês:</span>
            <strong className="text-stone-900">
              {apuracao.cotasMes} cotas × {formatBRL(apuracao.faixaFinal.valorPorCota)} = {formatBRL(apuracao.comissaoTotalMes)}
            </strong>
          </div>
        </div>

        {/* MÓDULO 2: BÔNUS SEMANAL PROGRESSIVO E ACUMULATIVO */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                2. Bônus Semanal (Acumulativo)
              </h3>
              <span className="text-xs font-bold text-emerald-700 tabular-nums">
                +{formatBRL(apuracao.bonusSemanalTotalMes)}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Meta de <strong>{apuracao.metaSem} cotas/semana</strong> com compensação de superávit/déficit ({apuracao.metasSemanaisMes} de {apuracao.numSemanasMes} metas batidas).
            </p>
          </div>

          {/* Escada de Metas Semanais Batidas */}
          <div className="space-y-1.5">
            {Array.from({ length: apuracao.numSemanasMes }).map((_, idx) => {
              const metaNum = idx + 1;
              const batida = apuracao.metasSemanaisMes >= metaNum;
              const valorPremio =
                config.bonusSemanalProgressivo[idx] ??
                config.bonusSemanalProgressivo[config.bonusSemanalProgressivo.length - 1] ??
                0;
              const acumuladoAteAqui = config.bonusSemanalProgressivo
                .slice(0, metaNum)
                .reduce((a, b) => a + (Number(b) || 0), 0);
              const vendasNaSemanaCalendario = apuracao.cotasPorSemana[idx] || 0;

              return (
                <div
                  key={metaNum}
                  className={`px-3 py-1.5 rounded-xl border text-xs flex items-center justify-between ${
                    batida
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-semibold'
                      : 'bg-stone-50/70 border-stone-200/70 text-stone-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {batida ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    )}
                    <span className="tabular-nums">
                      {metaNum}ª Meta ({metaNum * apuracao.metaSem} cotas)
                    </span>
                    <span className="text-[10px] text-stone-400 tabular-nums">
                      • Sem {metaNum}: {vendasNaSemanaCalendario}v
                    </span>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className={batida ? 'font-bold text-emerald-700' : ''}>
                      +{formatBRL(valorPremio)}
                    </span>
                    <span className="text-[10px] text-stone-400 ml-1.5">
                      (Acum: R$ {acumuladoAteAqui})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600 tabular-nums">
            <span>Superávit p/ próxima meta ({(apuracao.metasSemanaisMes + 1) * apuracao.metaSem} cotas):</span>
            <strong className="text-stone-900">
              {apuracao.metasSemanaisMes >= apuracao.numSemanasMes
                ? 'Todas as metas batidas!'
                : `${apuracao.cotasMes % apuracao.metaSem} de ${apuracao.metaSem} cotas`}
            </strong>
          </div>
        </div>

        {/* MÓDULO 3: BÔNUS MENSAL DE VOLUME TOTAL */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                3. Bônus Mensal (Volume Total)
              </h3>
              <span className="text-xs font-bold text-blue-700 tabular-nums">
                +{formatBRL(apuracao.bonusMensalTotalMes)}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Prêmio extra por faixa de volume total no mês (não acumulativo entre si, vale a maior faixa).
            </p>
          </div>

          <div className="space-y-2">
            {config.faixasBonusMensal.map(bm => {
              const isCurrent = apuracao.faixaBonusMensalFinal?.id === bm.id;
              const isPassed = apuracao.cotasMes >= bm.minCotas;
              const rangeText =
                bm.maxCotas === null
                  ? `${bm.minCotas}+ cotas no mês`
                  : `${bm.minCotas} a ${bm.maxCotas} cotas no mês`;

              return (
                <div
                  key={bm.id}
                  className={`px-3 py-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : isPassed
                      ? 'bg-blue-50/60 border-blue-200 text-stone-700'
                      : 'bg-stone-50/70 border-stone-200/70 text-stone-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Award className={`w-4 h-4 ${isCurrent ? 'text-white' : isPassed ? 'text-blue-600' : 'text-stone-400'}`} />
                    <span className="tabular-nums">{rangeText}</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span>+{formatBRL(bm.valorBonus)}</span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-bold">
                        ATINGIDO
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600 tabular-nums">
            <span>Status do Prêmio de Volume:</span>
            <strong className="text-stone-900">
              {apuracao.faixaBonusMensalFinal
                ? `Faixa ativa: +${formatBRL(apuracao.bonusMensalTotalMes)}`
                : config.faixasBonusMensal[0]
                ? `Faltam ${Math.max(0, config.faixasBonusMensal[0].minCotas - apuracao.cotasMes)} cotas p/ +${formatBRL(config.faixasBonusMensal[0].valorBonus)}`
                : 'Nenhuma faixa configurada'}
            </strong>
          </div>
        </div>
      </div>

      {/* 4. DEMONSTRATIVO DE FECHAMENTO QUINZENAL E COMPENSAÇÃO RETROATIVA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1º FECHAMENTO: DIA 15 */}
        <div className="bg-white rounded-xl border border-stone-200/80 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-stone-200/80 text-stone-800 text-[10px] font-bold uppercase">
                    1ª Quinzena
                  </span>
                  <h3 className="text-sm font-bold text-stone-900">
                    1º Pagamento — Fechamento Dia {config.diaCorteQuinzena1}
                  </h3>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Calculado sobre as vendas concluídas do dia 01 até o dia {config.diaCorteQuinzena1}.
                </p>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  statusQ1 === 'pago'
                    ? 'bg-emerald-100 text-emerald-800'
                    : statusQ1 === 'fechado'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {statusQ1 === 'pago' ? 'Quitado' : statusQ1 === 'fechado' ? 'Fechado' : 'Aberto'}
              </span>
            </div>

            <div className="p-5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-600">
                  Cotas Concluídas na 1ª Quinzena (01 a {config.diaCorteQuinzena1})
                </span>
                <span className="font-bold text-stone-900 tabular-nums">
                  {apuracao.cotasBaseQ1} {apuracao.cotasBaseQ1 === 1 ? 'cota' : 'cotas'} (Faixa {formatBRL(apuracao.taxaUnitariaAplicadaQ1)}/cota)
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-600">
                  Comissão por Cotas ({apuracao.cotasBaseQ1} × {formatBRL(apuracao.taxaUnitariaAplicadaQ1)})
                </span>
                <span className="font-semibold text-stone-900 tabular-nums">
                  {formatBRL(apuracao.comissaoPagaQ1)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-600">
                  Bônus Semanal Acumulado até Dia {config.diaCorteQuinzena1} ({apuracao.metasSemanaisQ1} {apuracao.metasSemanaisQ1 === 1 ? 'meta' : 'metas'})
                </span>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  +{formatBRL(apuracao.bonusSemanalPagoQ1)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-600">Bônus Mensal de Volume atingido até Dia {config.diaCorteQuinzena1}</span>
                <span className="font-semibold text-blue-700 tabular-nums">
                  +{formatBRL(apuracao.bonusMensalPagoQ1)}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-900 block">
                    Total 1º Pagamento por Vendedor
                  </span>
                  <span className="text-[11px] text-stone-500 tabular-nums">
                    Folha da Equipe ({apuracao.qtdVendedores} vendedores):{' '}
                    <strong>{formatBRL(apuracao.custoTotalVariavelEquipeQ1)}</strong>
                  </span>
                </div>
                <span className="text-lg font-bold text-stone-900 tabular-nums">
                  {formatBRL(apuracao.totalPagoQ1PorVendedor)}
                </span>
              </div>
            </div>
          </div>

          {!simuladorAtivo && (
            <div className="px-5 py-3 bg-stone-50/70 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-stone-500">
                {apuracao.fechQ1Salvo?.dataFechamento
                  ? `Fechado em ${formatDateBR(apuracao.fechQ1Salvo.dataFechamento)}`
                  : 'Apuração dinâmica em tempo real'}
              </span>
              <div className="flex items-center gap-2">
                {statusQ1 !== 'aberto' && (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'fech_1'}
                    onClick={() => handleFecharQuinzena(1, 'aberto')}
                    className="h-8 px-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-[11px] font-semibold text-stone-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Unlock className="w-3 h-3" />
                    Reabrir
                  </button>
                )}
                {statusQ1 === 'aberto' && (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'fech_1'}
                    onClick={() => handleFecharQuinzena(1, 'fechado')}
                    className="h-8 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    Fechar Dia {config.diaCorteQuinzena1}
                  </button>
                )}
                {statusQ1 !== 'pago' && (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'fech_1'}
                    onClick={() => handleFecharQuinzena(1, 'pago')}
                    className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    Marcar Pago
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2º FECHAMENTO: FIM DO MÊS (COMPENSAÇÃO RETROATIVA AUTOMÁTICA) */}
        <div className="bg-white rounded-xl border border-stone-200/80 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-mx-ink text-white text-[10px] font-bold uppercase">
                    2ª Quinzena + Retroativo
                  </span>
                  <h3 className="text-sm font-bold text-stone-900">
                    2º Pagamento — Fechamento Fim do Mês
                  </h3>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Recalcula o mês inteiro ({apuracao.cotasMes} cotas) e compensa automaticamente diferenças retroativas de faixa e bônus.
                </p>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  statusQ2 === 'pago'
                    ? 'bg-emerald-100 text-emerald-800'
                    : statusQ2 === 'fechado'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {statusQ2 === 'pago' ? 'Quitado' : statusQ2 === 'fechado' ? 'Fechado' : 'Aberto'}
              </span>
            </div>

            <div className="p-5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-600">
                  Novas Vendas na 2ª Quinzena ({apuracao.cotasQ2} cotas × {formatBRL(apuracao.faixaFinal.valorPorCota)})
                </span>
                <span className="font-semibold text-stone-900 tabular-nums">
                  +{formatBRL(apuracao.comissaoNovasVendasQ2)}
                </span>
              </div>

              {/* Linha de Compensação Retroativa em destaque */}
              <div
                className={`flex items-center justify-between py-1.5 px-2.5 -mx-2.5 rounded-lg border ${
                  apuracao.diferencaRetroativaQ1 > 0
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-semibold'
                    : 'border-transparent border-b-stone-100 text-stone-500'
                }`}
              >
                <span>
                  Compensação Retroativa da 1ª Quinzena ({apuracao.cotasBaseQ1} cotas × +{formatBRL(Math.max(0, apuracao.faixaFinal.valorPorCota - apuracao.taxaUnitariaAplicadaQ1))})
                </span>
                <span className="font-bold tabular-nums">
                  +{formatBRL(apuracao.diferencaRetroativaQ1)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-600">
                  Saldo de Bônus Semanal ({formatBRL(apuracao.bonusSemanalTotalMes)} acum. − {formatBRL(apuracao.bonusSemanalPagoQ1)} pago Q1)
                </span>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  +{formatBRL(apuracao.saldoBonusSemanalQ2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-600">
                  Saldo de Bônus Mensal de Volume ({formatBRL(apuracao.bonusMensalTotalMes)} − {formatBRL(apuracao.bonusMensalPagoQ1)} pago Q1)
                </span>
                <span className="font-semibold text-blue-700 tabular-nums">
                  +{formatBRL(apuracao.saldoBonusMensalQ2)}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-900 block">
                    Total Variável 2º Pagamento por Vendedor
                  </span>
                  <span className="text-[11px] text-stone-500 tabular-nums">
                    Folha Variável Equipe ({apuracao.qtdVendedores} vendedores):{' '}
                    <strong>{formatBRL(apuracao.custoTotalVariavelEquipeQ2)}</strong>
                  </span>
                </div>
                <span className="text-lg font-bold text-emerald-700 tabular-nums">
                  {formatBRL(apuracao.totalAPagarQ2PorVendedor)}
                </span>
              </div>
            </div>
          </div>

          {!simuladorAtivo && (
            <div className="px-5 py-3 bg-stone-50/70 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-stone-500">
                {apuracao.fechQ2Salvo?.dataFechamento
                  ? `Fechado em ${formatDateBR(apuracao.fechQ2Salvo.dataFechamento)}`
                  : 'Compensação retroativa automática ativa'}
              </span>
              <div className="flex items-center gap-2">
                {statusQ2 !== 'aberto' && (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'fech_2'}
                    onClick={() => handleFecharQuinzena(2, 'aberto')}
                    className="h-8 px-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-[11px] font-semibold text-stone-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Unlock className="w-3 h-3" />
                    Reabrir
                  </button>
                )}
                {statusQ2 === 'aberto' && (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'fech_2'}
                    onClick={() => handleFecharQuinzena(2, 'fechado')}
                    className="h-8 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    Fechar Fim do Mês
                  </button>
                )}
                {statusQ2 !== 'pago' && (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'fech_2'}
                    onClick={() => handleFecharQuinzena(2, 'pago')}
                    className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    Marcar Pago
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. QUADRO DE DISTRIBUIÇÃO DA EQUIPE COMERCIAL (TODOS RECEBEM IGUAL) */}
      <div className="bg-white rounded-xl border border-stone-200/80 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-stone-600" />
              Folha de Comissões da Equipe Comercial ({apuracao.qtdVendedores}{' '}
              {apuracao.qtdVendedores === 1 ? 'vendedor ativo' : 'vendedores ativos'})
            </h3>
            <p className="text-[11px] text-stone-500">
              Todos os membros ativos da equipe comercial recebem a mesma comissão e bônus sobre o volume total concluído pela operação.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="text-xs font-semibold text-mx-ink hover:underline cursor-pointer self-start sm:self-auto"
          >
            Gerenciar membros da equipe →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-stone-50/90 text-stone-500 uppercase font-bold tracking-wider border-b border-stone-200/80 text-[10px]">
              <tr>
                <th className="px-4 py-3">Vendedor / Consultor</th>
                <th className="px-4 py-3 text-right">Salário Base Fixo</th>
                <th className="px-4 py-3 text-right">1º Pagto (Dia {config.diaCorteQuinzena1})</th>
                <th className="px-4 py-3 text-right">2º Pagto (Fim do Mês)</th>
                <th className="px-4 py-3 text-right">Total Variável (Mês)</th>
                <th className="px-4 py-3 text-right">Total Salário + Variável</th>
                <th className="px-4 py-3 text-right">Vale Refeição (À Parte)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {apuracao.vendedoresAtivos.map(membro => {
                const sal = membro.salarioBaseCustom ?? config.salarioBase;
                const vr = membro.vrCustom ?? config.valeRefeicao;
                const totalGeral = sal + apuracao.totalVariavelMesPorVendedor;
                return (
                  <tr key={membro.id} className="hover:bg-stone-50/70">
                    <td className="px-4 py-3">
                      <div className="font-bold text-stone-900">{membro.nome}</div>
                      <div className="text-[10px] text-stone-400">{membro.cargo}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-700 tabular-nums">
                      {formatBRL(sal)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-800 tabular-nums">
                      {formatBRL(apuracao.totalPagoQ1PorVendedor)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                      {formatBRL(apuracao.totalAPagarQ2PorVendedor)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900 tabular-nums">
                      {formatBRL(apuracao.totalVariavelMesPorVendedor)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-mx-ink tabular-nums">
                      {formatBRL(totalGeral)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-500 tabular-nums">
                      {formatBRL(vr)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-stone-50/90 border-t border-stone-200/80 font-bold text-stone-900">
              <tr>
                <td className="px-4 py-3">Total da Equipe ({apuracao.qtdVendedores} vendedores)</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatBRL(config.salarioBase * apuracao.qtdVendedores)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatBRL(apuracao.custoTotalVariavelEquipeQ1)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-700 tabular-nums">
                  {formatBRL(apuracao.custoTotalVariavelEquipeQ2)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatBRL(apuracao.custoTotalVariavelEquipeMes)}
                </td>
                <td className="px-4 py-3 text-right text-mx-ink tabular-nums">
                  {formatBRL(apuracao.custoTotalFolhaComercialMes)}
                </td>
                <td className="px-4 py-3 text-right text-stone-500 tabular-nums">
                  {formatBRL(config.valeRefeicao * apuracao.qtdVendedores)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 6. AUDITORIA DE VENDAS DO MÊS & CHECKLIST DE CONCLUSÃO DE PROCESSOS */}
      <div className="bg-white rounded-xl border border-stone-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Auditoria de Vendas & Conclusão de Processos ({MESES_NOMES[compMonth]} {compYear})
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Apenas vendas com todos os processos obrigatórios concluídos entram na apuração de cotas do mês. Clique em qualquer etapa pendente para abrir ou validar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `Todas (${vendasDoMes.length})` },
              { id: 'concluidas', label: `Concluídas (${apuracao.concluidasCount})` },
              { id: 'pendentes', label: `Pendentes (${apuracao.pendentesCount})` },
              { id: 'q1', label: `1ª Quinzena` },
              { id: 'q2', label: `2ª Quinzena` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAuditFilter(tab.id as any)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  auditFilter === tab.id
                    ? 'bg-mx-ink text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-stone-400 text-xs font-semibold animate-pulse">
            Auditando vendas e processos do período...
          </div>
        ) : vendasAuditFiltradas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-stone-800">
              Nenhuma venda registrada neste filtro em {MESES_NOMES[compMonth]} de {compYear}
            </div>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Registre novas vendas ou utilize o botão <strong>"Simular Cenário"</strong> no topo para testar a progressão de faixas e bônus.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsVendaDrawerOpen(true)}
                className="h-9 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white inline-flex items-center gap-2 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Lançar Nova Venda</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-stone-50/90 text-stone-500 uppercase font-bold tracking-wider border-b border-stone-200/80 text-[10px]">
                <tr>
                  <th className="px-4 py-3">Venda / Período</th>
                  <th className="px-4 py-3">Cliente & Embarcação</th>
                  <th className="px-4 py-3">Checklist de Conclusão de Processos</th>
                  <th className="px-4 py-3 text-center">Status na Comissão</th>
                  <th className="px-4 py-3 text-right">Valor Cota / Comissão</th>
                  <th className="px-4 py-3 text-right">Ações Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {vendasAuditFiltradas.map(venda => {
                  const av = venda.avaliacao;
                  const clientObj = clients.find(c => c.id === venda.clienteId) || null;
                  const isUpdating = actionLoadingId === venda.id;

                  return (
                    <tr key={venda.id} className="hover:bg-stone-50/80 transition-colors">
                      {/* Venda / Período */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-900 tabular-nums">
                            {venda.codigoVenda}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-bold tabular-nums">
                            {venda.quinzena}ª Q • Sem {venda.semana}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5 tabular-nums">
                          {formatDateBR(venda.dataVenda)}
                        </div>
                      </td>

                      {/* Cliente & Embarcação */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-stone-900">{venda.clienteNome || 'Cliente'}</div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                          <span>{venda.embarcacaoNome || 'Embarcação'}</span>
                          <span className="px-1.5 py-0.2 rounded bg-mx-ink-100 text-mx-ink text-[10px] font-bold tabular-nums">
                            {venda.cota}
                          </span>
                        </div>
                      </td>

                      {/* Checklist de Processos */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* 1. Entrada Paga */}
                          <button
                            type="button"
                            disabled={isUpdating || av.entradaPagaOk}
                            onClick={() =>
                              handleUpdateProcessoVenda(venda.id, { marcarEntradaPaga: true })
                            }
                            title={
                              av.entradaPagaOk
                                ? 'Entrada confirmada no Financeiro'
                                : 'Clique para confirmar pagamento da entrada'
                            }
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                              av.entradaPagaOk
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 cursor-pointer'
                            }`}
                          >
                            {av.entradaPagaOk ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            <span>Entrada Paga</span>
                          </button>

                          {/* 2. Comprovante */}
                          {venda.comprovanteEntrada ? (
                            <a
                              href={venda.comprovanteEntrada}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:underline"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>Comprovante</span>
                            </a>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${
                                av.comprovanteOk
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              <AlertCircle className="w-3 h-3" />
                              <span>Sem Comprovante</span>
                            </span>
                          )}

                          {/* 3. Contrato Aquisição */}
                          <button
                            type="button"
                            onClick={() => {
                              if (clientObj) {
                                setContractViewerTarget({ client: clientObj, type: 'aquisicao' });
                              } else {
                                handleUpdateProcessoVenda(venda.id, {
                                  marcarContratoAquisicaoAssinado: true
                                });
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              av.contratoAquisicaoOk
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            }`}
                            title="Abrir ou validar Contrato de Aquisição"
                          >
                            <FileSignature className="w-3 h-3" />
                            <span>Contrato Aquisição</span>
                          </button>

                          {/* 4. Contrato Gestão (Adm) */}
                          <button
                            type="button"
                            onClick={() => {
                              if (clientObj) {
                                setContractViewerTarget({ client: clientObj, type: 'adm' });
                              } else {
                                handleUpdateProcessoVenda(venda.id, {
                                  marcarContratoAdmAssinado: true
                                });
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              av.contratoAdmOk
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            }`}
                            title="Abrir ou validar Contrato de Gestão (Administração)"
                          >
                            <FileSignature className="w-3 h-3" />
                            <span>Contrato Gestão</span>
                          </button>
                        </div>
                      </td>

                      {/* Status na Comissão */}
                      <td className="px-4 py-3.5 text-center">
                        {av.todosProcessosConcluidos ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            {av.liberadaManual ? 'Liberada pelo Admin' : '100% Concluída'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" />
                            Aguardando ({av.etapasPendentes.length})
                          </span>
                        )}
                      </td>

                      {/* Valor da Venda & Comissão Unitária */}
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <div className="font-bold text-stone-900">
                          {av.todosProcessosConcluidos
                            ? `+${formatBRL(apuracao.faixaFinal.valorPorCota)} / vend.`
                            : 'R$ 0,00 (Pendente)'}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          VGV: {formatBRL(venda.valorTotal)}
                        </div>
                      </td>

                      {/* Ações do Administrador */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {!av.todosProcessosConcluidos ? (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                handleUpdateProcessoVenda(venda.id, {
                                  comissaoLiberadaManual: true,
                                  marcarEntradaPaga: true,
                                  marcarContratoAquisicaoAssinado: true,
                                  marcarContratoAdmAssinado: true
                                })
                              }
                              className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors cursor-pointer"
                              title="Concluir todos os processos e contabilizar venda na comissão"
                            >
                              Concluir & Liberar
                            </button>
                          ) : av.liberadaManual ? (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                handleUpdateProcessoVenda(venda.id, {
                                  comissaoLiberadaManual: false
                                })
                              }
                              className="h-7 px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-600 text-[10px] font-semibold transition-colors cursor-pointer"
                            >
                              Remover Liberação Manual
                            </button>
                          ) : null}

                          {clientObj && (
                            <button
                              type="button"
                              onClick={() => setProfileClient(clientObj)}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Abrir ficha completa do cotista"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Configuração do Motor de Comissões (Administrador) */}
      <ComercialComissoesConfigModal
        open={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={config}
        onSave={handleSaveConfig}
      />

      {/* Drawer de Nova Venda */}
      <ComercialVendaDrawer
        open={isVendaDrawerOpen}
        onClose={() => setIsVendaDrawerOpen(false)}
        onSuccess={() => {
          loadLocalStores();
          fetchAllData(true);
        }}
      />

      {/* Visualizador de Contrato (Aquisição ou Gestão) */}
      {contractViewerTarget && (
        <ComercialContratoViewerModal
          isOpen={!!contractViewerTarget}
          onClose={() => {
            setContractViewerTarget(null);
            loadLocalStores();
            fetchAllData(true);
          }}
          cliente={contractViewerTarget.client}
          embarcacao={
            boats.find(b => b.id === contractViewerTarget.client.embarcacaoId) || null
          }
          initialType={contractViewerTarget.type}
        />
      )}

      {/* Modal de Ficha do Cliente */}
      {profileClient && (
        <ClientProfileModal
          client={profileClient}
          boats={boats}
          onClose={() => {
            setProfileClient(null);
            loadLocalStores();
            fetchAllData(true);
          }}
        />
      )}
    </div>
  );
}
