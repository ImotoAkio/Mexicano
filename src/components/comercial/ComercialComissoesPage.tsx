import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Settings,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSignature,
  Paperclip,
  Sparkles,
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
import { clientDB, boatDB, syncWithRemote, onDbUpdate, getAdminToken } from '../../db';
import {
  DEFAULT_MOTOR_COMISSOES_CONFIG,
  avaliarProcessosVenda,
  AvaliacaoProcessosVenda
} from '../../utils/comissaoUtils';
import ComercialComissoesConfigModal from './ComercialComissoesConfigModal';
import ComercialContratoViewerModal from './ComercialContratoViewerModal';
import ClientProfileModal from '../ClientProfileModal';
import ComercialVendaDrawer from './ComercialVendaDrawer';

export { avaliarProcessosVenda };
export type { AvaliacaoProcessosVenda };

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
    const token = getAdminToken() || localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadLocalStores = () => {
    setClients([...clientDB.getAll()]);
    setBoats([...boatDB.getAll()]);
  };

  const notifySidebarSync = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('comercial-comissoes-updated'));
    }
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
    notifySidebarSync();
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

    const cotasPorSemana: number[] = Array(numSemanasMes).fill(0);
    if (simuladorAtivo) {
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

    // 1. Faixa de Comissão por Cota (Escalonada e Retroativa)
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

    const proximaFaixaComissao =
      [...config.faixasComissao]
        .sort((a, b) => a.minCotas - b.minCotas)
        .find(f => f.minCotas > cotasMes) || null;

    // 2. Bônus Semanal (Progressivo e Acumulativo + Superávit/Déficit)
    const metaSem = Math.max(1, config.metaSemanalCotas || 4);
    const calcularMetasSemanaisBatidas = (totalCotasAcumuladas: number, isFullMonth: boolean) => {
      if (config.regraSuperavitSemanal) {
        return Math.min(numSemanasMes, Math.floor(totalCotasAcumuladas / metaSem));
      }
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

    // 3. Bônus Mensal de Volume Total (Não acumulativo — vale a maior faixa)
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

    const comissaoPagaQ1 = fechQ1Salvo ? fechQ1Salvo.comissaoBasePorVendedor : comissaoBrutaQ1;
    const bonusSemanalPagoQ1 = fechQ1Salvo ? fechQ1Salvo.bonusSemanalPorVendedor : bonusSemanalQ1;
    const bonusMensalPagoQ1 = fechQ1Salvo ? fechQ1Salvo.bonusMensalPorVendedor : bonusMensalQ1;
    const totalPagoQ1PorVendedor = fechQ1Salvo ? fechQ1Salvo.totalVariavelPorVendedor : variavelTotalQ1Calculado;
    const taxaUnitariaAplicadaQ1 = fechQ1Salvo ? fechQ1Salvo.valorUnitarioFaixa : faixaQ1.valorPorCota;
    const cotasBaseQ1 = fechQ1Salvo ? fechQ1Salvo.cotasTotalPeriodo : cotasQ1;

    const comissaoTotalMes = cotasMes * faixaFinal.valorPorCota;
    const comissaoNovasVendasQ2 = cotasQ2 * faixaFinal.valorPorCota;
    const diferencaRetroativaQ1 = Math.max(0, comissaoTotalMes - comissaoPagaQ1 - comissaoNovasVendasQ2);
    const subiuFaixaRetroativa = faixaFinal.valorPorCota > taxaUnitariaAplicadaQ1 && cotasBaseQ1 > 0;

    const saldoBonusSemanalQ2 = Math.max(0, bonusSemanalTotalMes - bonusSemanalPagoQ1);
    const saldoBonusMensalQ2 = Math.max(0, bonusMensalTotalMes - bonusMensalPagoQ1);

    const totalVariavelMesPorVendedor = comissaoTotalMes + bonusSemanalTotalMes + bonusMensalTotalMes;
    const totalAPagarQ2PorVendedor = Math.max(0, totalVariavelMesPorVendedor - totalPagoQ1PorVendedor);

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
        notifySidebarSync();
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
        notifySidebarSync();
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
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. CABEÇALHO SÓBRIO NO PADRÃO VILA NÁUTICA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">
            Comissões & Bonificações
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Apuração quinzenal (dia {config.diaCorteQuinzena1} e fim do mês), progressão de metas semanais e folha da equipe comercial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Seletor de Competência (Mês / Ano) */}
          <div className="h-9 px-1 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleChangeMonth(-1)}
              className="w-7 h-7 rounded-lg hover:bg-white hover:shadow-2xs flex items-center justify-center text-stone-500 hover:text-stone-900 transition-all cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="px-2.5 flex items-center gap-1.5 text-xs font-semibold text-stone-900 tabular-nums min-w-[124px] justify-center">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>
                {MESES_NOMES[compMonth]} {compYear}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleChangeMonth(1)}
              className="w-7 h-7 rounded-lg hover:bg-white hover:shadow-2xs flex items-center justify-center text-stone-500 hover:text-stone-900 transition-all cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-3.5 h-3.5" />
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
            className={`h-9 px-3.5 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
              simuladorAtivo
                ? 'bg-stone-900 border-stone-900 text-white'
                : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 opacity-70" />
            <span>{simuladorAtivo ? 'Sair da Simulação' : 'Simular'}</span>
          </button>

          {/* Sincronizar */}
          <button
            type="button"
            onClick={() => fetchAllData()}
            disabled={isRefreshing}
            className="h-9 px-3.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
            title="Atualizar vendas e apuração"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          {/* Configurar Regras */}
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="h-9 px-4 rounded-xl bg-[#2D0A16] hover:bg-[#3B0D1E] text-white flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 opacity-80" />
            <span>Regras</span>
          </button>
        </div>
      </div>

      {/* BARRA DO SIMULADOR INTERATIVO (QUANDO ATIVO) */}
      {simuladorAtivo && (
        <div className="bg-white border border-stone-300 rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-stone-900 text-white text-[10px] font-semibold">
                Modo Simulação
              </span>
              <h3 className="text-xs font-semibold text-stone-900">
                Simule o efeito retroativo de faixas e bônus semanais
              </h3>
            </div>
            <p className="text-[11px] text-stone-500">
              Ajuste o volume de cotas na 1ª e 2ª quinzena para testar os valores sem alterar os dados reais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-stone-50 rounded-xl border border-stone-200/80 px-3.5 py-2 flex items-center gap-3">
              <div>
                <span className="text-[10px] font-medium text-stone-500 block">
                  1ª Quinzena (até dia {config.diaCorteQuinzena1})
                </span>
                <span className="text-xs font-semibold text-stone-900 tabular-nums">
                  {simCotasQ1} {simCotasQ1 === 1 ? 'cota' : 'cotas'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={simCotasQ1}
                onChange={e => setSimCotasQ1(parseInt(e.target.value, 10) || 0)}
                className="w-24 accent-[#2D0A16] cursor-pointer"
              />
              <input
                type="number"
                min={0}
                max={50}
                value={simCotasQ1}
                onChange={e => setSimCotasQ1(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-14 h-8 px-2 rounded-lg bg-white border border-stone-200 text-center text-xs font-semibold text-stone-900 tabular-nums"
              />
            </div>

            <div className="bg-stone-50 rounded-xl border border-stone-200/80 px-3.5 py-2 flex items-center gap-3">
              <div>
                <span className="text-[10px] font-medium text-stone-500 block">
                  2ª Quinzena (dia {config.diaCorteQuinzena1 + 1} ao fim)
                </span>
                <span className="text-xs font-semibold text-stone-900 tabular-nums">
                  +{simCotasQ2} {simCotasQ2 === 1 ? 'cota' : 'cotas'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={simCotasQ2}
                onChange={e => setSimCotasQ2(parseInt(e.target.value, 10) || 0)}
                className="w-24 accent-[#2D0A16] cursor-pointer"
              />
              <input
                type="number"
                min={0}
                max={50}
                value={simCotasQ2}
                onChange={e => setSimCotasQ2(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-14 h-8 px-2 rounded-lg bg-white border border-stone-200 text-center text-xs font-semibold text-stone-900 tabular-nums"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. KPIs DE APURAÇÃO (SILENCIOSOS, SEM PÍLULAS COLORIDAS COMPETITIVAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Cotas Concluídas no Mês */}
        <div className="bg-white rounded-2xl border border-stone-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Cotas Concluídas</span>
            <span className="text-[11px] font-medium text-stone-400 tabular-nums">
              {formatBRL(apuracao.faixaFinal.valorPorCota)} / cota
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 tabular-nums tracking-tight">
              {apuracao.cotasMes}
            </span>
            <span className="text-xs text-stone-400 tabular-nums">
              ({apuracao.cotasQ1} na 1ª Q • {apuracao.cotasQ2} na 2ª Q)
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between gap-2 tabular-nums">
            <span className="truncate">
              {vendasDoMes.length === 0 && !simuladorAtivo
                ? 'Sem vendas no período'
                : apuracao.pendentesCount > 0
                ? `${apuracao.pendentesCount} em validação`
                : `${apuracao.concluidasCount} vendas validadas`}
            </span>
            {apuracao.proximaFaixaComissao && (
              <span className="text-stone-600 font-medium shrink-0">
                +{apuracao.proximaFaixaComissao.minCotas - apuracao.cotasMes} p/ {formatBRL(apuracao.proximaFaixaComissao.valorPorCota)}
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: 1º Pagamento (Dia 15) */}
        <div className="bg-white rounded-2xl border border-stone-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">
              1º Pagamento (Dia {config.diaCorteQuinzena1})
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                statusQ1 === 'pago'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                  : 'bg-stone-100 text-stone-600 border-stone-200/60'
              }`}
            >
              {statusQ1 === 'pago' ? 'Quitado' : statusQ1 === 'fechado' ? 'Fechado' : 'Aberto'}
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-stone-900 tabular-nums tracking-tight">
              {formatBRL(apuracao.totalPagoQ1PorVendedor)}
            </span>
            <span className="text-xs text-stone-400">/ vendedor</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-400 tabular-nums truncate">
            Comissão {formatBRL(apuracao.comissaoPagaQ1)} • Bônus {formatBRL(apuracao.bonusSemanalPagoQ1 + apuracao.bonusMensalPagoQ1)}
          </div>
        </div>

        {/* KPI 3: 2º Pagamento (Fim do Mês) */}
        <div className="bg-white rounded-2xl border border-stone-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">2º Pagamento (Fim do Mês)</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                statusQ2 === 'pago'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                  : 'bg-stone-100 text-stone-600 border-stone-200/60'
              }`}
            >
              {statusQ2 === 'pago' ? 'Quitado' : statusQ2 === 'fechado' ? 'Fechado' : '2ª Quinzena'}
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-stone-900 tabular-nums tracking-tight">
              {formatBRL(apuracao.totalAPagarQ2PorVendedor)}
            </span>
            <span className="text-xs text-stone-400">/ vendedor</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-400 tabular-nums truncate">
            {apuracao.diferencaRetroativaQ1 > 0
              ? `Inclui +${formatBRL(apuracao.diferencaRetroativaQ1)} retroativo da 1ª Q`
              : 'Novas vendas + saldo de bônus'}
          </div>
        </div>

        {/* KPI 4: Remuneração Total por Vendedor */}
        <div className="bg-white rounded-2xl border border-stone-200/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Pacote Mensal / Vendedor</span>
            <span className="text-[11px] font-medium text-stone-400 tabular-nums">
              + VR {formatBRL(config.valeRefeicao)}
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900 tabular-nums tracking-tight">
              {formatBRL(apuracao.pacoteMensalIndividual)}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-400 tabular-nums truncate">
            Fixo {formatBRL(config.salarioBase)} + Variável {formatBRL(apuracao.totalVariavelMesPorVendedor)}
          </div>
        </div>
      </div>

      {/* 3. QUADRO UNIFICADO DE REGRAS E PROGRESSÃO (SEM CARDS ANINHADOS OU CORES GRITANTES) */}
      <div className="bg-white rounded-2xl border border-stone-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-stone-200/70">
          {/* Coluna 1: Comissão por Cotas (Retroativa) */}
          <div className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-900">
                  Comissão por Cotas (Retroativa)
                </h3>
                <span className="text-sm font-bold text-stone-900 tabular-nums">
                  {formatBRL(apuracao.comissaoTotalMes)}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                A faixa atingida multiplica todas as {apuracao.cotasMes} cotas do mês.
              </p>

              <div className="mt-4 divide-y divide-stone-100 border-t border-b border-stone-100">
                {config.faixasComissao.map(faixa => {
                  const isCurrent = apuracao.faixaFinal.id === faixa.id;
                  const labelRange =
                    faixa.maxCotas === null
                      ? `${faixa.minCotas}+ cotas`
                      : `${faixa.minCotas} a ${faixa.maxCotas} cotas`;

                  return (
                    <div
                      key={faixa.id}
                      className={`py-2.5 px-2.5 -mx-2.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                        isCurrent
                          ? 'bg-stone-100/90 text-stone-900 font-semibold'
                          : 'text-stone-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCurrent ? 'bg-[#2D0A16]' : 'bg-stone-300'
                          }`}
                        />
                        <span className="tabular-nums">{labelRange}</span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className={isCurrent ? 'text-stone-900 font-semibold' : ''}>
                          {formatBRL(faixa.valorPorCota)} / cota
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-white border border-stone-200/80 text-[10px] font-medium text-stone-700">
                            Atual
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between text-xs text-stone-500 tabular-nums">
              <span>Acumulado no mês</span>
              <strong className="font-semibold text-stone-800">
                {apuracao.cotasMes} × {formatBRL(apuracao.faixaFinal.valorPorCota)} = {formatBRL(apuracao.comissaoTotalMes)}
              </strong>
            </div>
          </div>

          {/* Coluna 2: Bônus Semanal (Acumulativo) */}
          <div className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-900">
                  Bônus Semanal (Acumulativo)
                </h3>
                <span className="text-sm font-bold text-stone-900 tabular-nums">
                  +{formatBRL(apuracao.bonusSemanalTotalMes)}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Meta de {apuracao.metaSem} cotas/semana ({apuracao.metasSemanaisMes} de {apuracao.numSemanasMes} batidas).
              </p>

              <div className="mt-4 divide-y divide-stone-100 border-t border-b border-stone-100">
                {Array.from({ length: apuracao.numSemanasMes }).map((_, idx) => {
                  const metaNum = idx + 1;
                  const batida = apuracao.metasSemanaisMes >= metaNum;
                  const valorPremio =
                    config.bonusSemanalProgressivo[idx] ??
                    config.bonusSemanalProgressivo[config.bonusSemanalProgressivo.length - 1] ??
                    0;
                  const vendasNaSemanaCalendario = apuracao.cotasPorSemana[idx] || 0;

                  return (
                    <div
                      key={metaNum}
                      className={`py-2 px-2.5 -mx-2.5 rounded-lg flex items-center justify-between text-xs ${
                        batida ? 'bg-stone-100/80 text-stone-900 font-semibold' : 'text-stone-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            batida ? 'bg-emerald-500' : 'bg-stone-300'
                          }`}
                        />
                        <span className="tabular-nums truncate">
                          {metaNum}ª Meta ({metaNum * apuracao.metaSem} cotas)
                        </span>
                        <span className="text-[11px] text-stone-400 tabular-nums shrink-0">
                          • S{metaNum}: {vendasNaSemanaCalendario}v
                        </span>
                      </div>
                      <span className="tabular-nums shrink-0">
                        +{formatBRL(valorPremio)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between text-xs text-stone-500 tabular-nums">
              <span>Progresso p/ próxima meta</span>
              <strong className="font-semibold text-stone-800">
                {apuracao.metasSemanaisMes >= apuracao.numSemanasMes
                  ? 'Todas atingidas'
                  : `${apuracao.cotasMes % apuracao.metaSem} de ${apuracao.metaSem} cotas`}
              </strong>
            </div>
          </div>

          {/* Coluna 3: Bônus Mensal de Volume Total */}
          <div className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-900">
                  Prêmio Mensal de Volume
                </h3>
                <span className="text-sm font-bold text-stone-900 tabular-nums">
                  +{formatBRL(apuracao.bonusMensalTotalMes)}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Prêmio extra por volume total no mês (vale a maior faixa).
              </p>

              <div className="mt-4 divide-y divide-stone-100 border-t border-b border-stone-100">
                {config.faixasBonusMensal.map(bm => {
                  const isCurrent = apuracao.faixaBonusMensalFinal?.id === bm.id;
                  const rangeText =
                    bm.maxCotas === null
                      ? `${bm.minCotas}+ cotas no mês`
                      : `${bm.minCotas} a ${bm.maxCotas} cotas no mês`;

                  return (
                    <div
                      key={bm.id}
                      className={`py-2.5 px-2.5 -mx-2.5 rounded-lg flex items-center justify-between text-xs ${
                        isCurrent
                          ? 'bg-stone-100/90 text-stone-900 font-semibold'
                          : 'text-stone-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCurrent ? 'bg-[#2D0A16]' : 'bg-stone-300'
                          }`}
                        />
                        <span className="tabular-nums">{rangeText}</span>
                      </div>
                      <span className="tabular-nums">+{formatBRL(bm.valorBonus)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between text-xs text-stone-500 tabular-nums">
              <span>Status do prêmio</span>
              <strong className="font-semibold text-stone-800">
                {apuracao.faixaBonusMensalFinal
                  ? `Ativo: +${formatBRL(apuracao.bonusMensalTotalMes)}`
                  : config.faixasBonusMensal[0]
                  ? `Faltam ${Math.max(0, config.faixasBonusMensal[0].minCotas - apuracao.cotasMes)} cotas`
                  : 'Não configurado'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FOLHA DA EQUIPE COMERCIAL & CONTROLE DE FECHAMENTO QUINZENAL */}
      <div className="bg-white rounded-2xl border border-stone-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-stone-400" />
              Folha de Comissões da Equipe ({apuracao.qtdVendedores}{' '}
              {apuracao.qtdVendedores === 1 ? 'vendedor ativo' : 'vendedores ativos'})
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Apuração coletiva dividida entre 1ª Quinzena (dia {config.diaCorteQuinzena1}) e 2ª Quinzena (fim do mês com ajuste retroativo).
            </p>
          </div>

          {/* Controles Rápidos de Fechamento Quinzenal */}
          {!simuladorAtivo && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Controle Q1 */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-50 border border-stone-200/80 text-xs">
                <span className="text-stone-500 font-medium">1ª Q:</span>
                {statusQ1 === 'aberto' ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'fech_1'}
                    onClick={() => handleFecharQuinzena(1, 'fechado')}
                    className="px-2 py-0.5 rounded bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Lock className="w-3 h-3 text-stone-400" />
                    <span>Fechar Dia {config.diaCorteQuinzena1}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'fech_1'}
                    onClick={() => handleFecharQuinzena(1, 'aberto')}
                    className="px-2 py-0.5 rounded bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Unlock className="w-3 h-3 text-stone-400" />
                    <span>Reabrir</span>
                  </button>
                )}
                {statusQ1 !== 'pago' && (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'fech_1'}
                    onClick={() => handleFecharQuinzena(1, 'pago')}
                    className="px-2 py-0.5 rounded bg-stone-900 hover:bg-stone-800 text-white font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Quitar</span>
                  </button>
                )}
              </div>

              {/* Controle Q2 */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-50 border border-stone-200/80 text-xs">
                <span className="text-stone-500 font-medium">2ª Q:</span>
                {statusQ2 === 'aberto' ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'fech_2'}
                    onClick={() => handleFecharQuinzena(2, 'fechado')}
                    className="px-2 py-0.5 rounded bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Lock className="w-3 h-3 text-stone-400" />
                    <span>Fechar Mês</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'fech_2'}
                    onClick={() => handleFecharQuinzena(2, 'aberto')}
                    className="px-2 py-0.5 rounded bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Unlock className="w-3 h-3 text-stone-400" />
                    <span>Reabrir</span>
                  </button>
                )}
                {statusQ2 !== 'pago' && (
                  <button
                    type="button"
                    disabled={actionLoadingId === 'fech_2'}
                    onClick={() => handleFecharQuinzena(2, 'pago')}
                    className="px-2 py-0.5 rounded bg-stone-900 hover:bg-stone-800 text-white font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Quitar</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-stone-50/80 text-stone-500 font-medium uppercase tracking-wider border-b border-stone-200/70 text-[10px]">
              <tr>
                <th className="px-5 py-3">Vendedor / Consultor</th>
                <th className="px-4 py-3 text-right">Salário Base</th>
                <th className="px-4 py-3 text-right">1º Pagto (Dia {config.diaCorteQuinzena1})</th>
                <th className="px-4 py-3 text-right">2º Pagto (Fim do Mês)</th>
                <th className="px-4 py-3 text-right">Total Variável</th>
                <th className="px-4 py-3 text-right">Salário + Variável</th>
                <th className="px-5 py-3 text-right">Vale Refeição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {apuracao.vendedoresAtivos.map(membro => {
                const sal = membro.salarioBaseCustom ?? config.salarioBase;
                const vr = membro.vrCustom ?? config.valeRefeicao;
                const totalGeral = sal + apuracao.totalVariavelMesPorVendedor;
                return (
                  <tr key={membro.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-stone-900">{membro.nome}</div>
                      <div className="text-[11px] text-stone-400">{membro.cargo}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600 tabular-nums">
                      {formatBRL(sal)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-800 tabular-nums">
                      {formatBRL(apuracao.totalPagoQ1PorVendedor)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-800 tabular-nums">
                      {formatBRL(apuracao.totalAPagarQ2PorVendedor)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-900 tabular-nums">
                      {formatBRL(apuracao.totalVariavelMesPorVendedor)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900 tabular-nums">
                      {formatBRL(totalGeral)}
                    </td>
                    <td className="px-5 py-3 text-right text-stone-500 tabular-nums">
                      {formatBRL(vr)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-stone-50/70 border-t border-stone-200/70 font-semibold text-stone-900">
              <tr>
                <td className="px-5 py-3">Total da Equipe ({apuracao.qtdVendedores} vendedores)</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatBRL(config.salarioBase * apuracao.qtdVendedores)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatBRL(apuracao.custoTotalVariavelEquipeQ1)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatBRL(apuracao.custoTotalVariavelEquipeQ2)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatBRL(apuracao.custoTotalVariavelEquipeMes)}
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">
                  {formatBRL(apuracao.custoTotalFolhaComercialMes)}
                </td>
                <td className="px-5 py-3 text-right text-stone-500 tabular-nums">
                  {formatBRL(config.valeRefeicao * apuracao.qtdVendedores)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. AUDITORIA DE VENDAS DO MÊS & VALIDAÇÃO DE PROCESSOS */}
      <div className="bg-white rounded-2xl border border-stone-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">
              Vendas Registradas & Validação ({MESES_NOMES[compMonth]} {compYear})
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Vendas com todos os requisitos concluídos entram automaticamente no cálculo das comissões e no card da barra lateral.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex p-0.5 bg-stone-100 rounded-xl border border-stone-200/70 text-xs">
              {[
                { id: 'all', label: `Todas (${vendasDoMes.length})` },
                { id: 'concluidas', label: `Validadas (${apuracao.concluidasCount})` },
                { id: 'pendentes', label: `Em validação (${apuracao.pendentesCount})` },
                { id: 'q1', label: '1ª Q' },
                { id: 'q2', label: '2ª Q' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAuditFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                    auditFilter === tab.id
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsVendaDrawerOpen(true)}
              className="h-8 px-3 rounded-xl bg-[#2D0A16] hover:bg-[#3B0D1E] text-white inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Venda</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-stone-400 text-xs">
            Carregando vendas do período...
          </div>
        ) : vendasAuditFiltradas.length === 0 ? (
          <div className="p-10 text-center space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-sm font-semibold text-stone-800">
              Nenhuma venda ativa em {MESES_NOMES[compMonth]} de {compYear}
            </div>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              Lance uma nova venda ou utilize o modo <strong>Simular</strong> no topo para projetar os ganhos da equipe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-stone-50/80 text-stone-500 font-medium uppercase tracking-wider border-b border-stone-200/70 text-[10px]">
                <tr>
                  <th className="px-5 py-3">Venda / Período</th>
                  <th className="px-4 py-3">Cotista & Embarcação</th>
                  <th className="px-4 py-3">Requisitos de Validação</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">VGV / Comissão</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {vendasAuditFiltradas.map(venda => {
                  const av = venda.avaliacao;
                  const clientObj = clients.find(c => c.id === venda.clienteId) || null;
                  const isUpdating = actionLoadingId === venda.id;

                  return (
                    <tr key={venda.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* Venda / Período */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900 tabular-nums">
                            {venda.codigoVenda}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 text-[10px] font-medium tabular-nums">
                            {venda.quinzena}ª Q • S{venda.semana}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5 tabular-nums">
                          {formatDateBR(venda.dataVenda)}
                        </div>
                      </td>

                      {/* Cliente & Embarcação */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-stone-900">{venda.clienteNome || 'Cliente'}</div>
                        <div className="text-[11px] text-stone-400 flex items-center gap-1.5 mt-0.5">
                          <span>{venda.embarcacaoNome || 'Embarcação'}</span>
                          <span className="px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 text-[10px] font-medium tabular-nums">
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
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                              av.entradaPagaOk
                                ? 'bg-stone-50 text-stone-700 border-stone-200/80'
                                : 'bg-amber-50/70 text-amber-800 border-amber-200/70 hover:bg-amber-100/70 cursor-pointer'
                            }`}
                          >
                            {av.entradaPagaOk ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-600" />
                            )}
                            <span>Entrada</span>
                          </button>

                          {/* 2. Comprovante */}
                          {venda.comprovanteEntrada ? (
                            <a
                              href={venda.comprovanteEntrada}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-50 text-stone-700 border border-stone-200/80 hover:underline"
                            >
                              <Paperclip className="w-3 h-3 text-emerald-600" />
                              <span>Comprovante</span>
                            </a>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                av.comprovanteOk
                                  ? 'bg-stone-50 text-stone-700 border-stone-200/80'
                                  : 'bg-amber-50/70 text-amber-800 border-amber-200/70'
                              }`}
                            >
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              <span>Comprovante</span>
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
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors cursor-pointer ${
                              av.contratoAquisicaoOk
                                ? 'bg-stone-50 text-stone-700 border-stone-200/80 hover:bg-stone-100'
                                : 'bg-amber-50/70 text-amber-800 border-amber-200/70 hover:bg-amber-100/70'
                            }`}
                          >
                            <FileSignature className={`w-3 h-3 ${av.contratoAquisicaoOk ? 'text-emerald-600' : 'text-amber-600'}`} />
                            <span>Aquisição</span>
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
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors cursor-pointer ${
                              av.contratoAdmOk
                                ? 'bg-stone-50 text-stone-700 border-stone-200/80 hover:bg-stone-100'
                                : 'bg-amber-50/70 text-amber-800 border-amber-200/70 hover:bg-amber-100/70'
                            }`}
                          >
                            <FileSignature className={`w-3 h-3 ${av.contratoAdmOk ? 'text-emerald-600' : 'text-amber-600'}`} />
                            <span>Gestão</span>
                          </button>
                        </div>
                      </td>

                      {/* Status na Comissão */}
                      <td className="px-4 py-3.5 text-center">
                        {av.todosProcessosConcluidos ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3" />
                            Validada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                            <Clock className="w-3 h-3" />
                            Pendente ({av.etapasPendentes.length})
                          </span>
                        )}
                      </td>

                      {/* Valor da Venda & Comissão Unitária */}
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <div className="font-semibold text-stone-900">
                          {av.todosProcessosConcluidos
                            ? `+${formatBRL(apuracao.faixaFinal.valorPorCota)} / vend.`
                            : 'Aguardando'}
                        </div>
                        <div className="text-[11px] text-stone-400">
                          VGV {formatBRL(venda.valorTotal)}
                        </div>
                      </td>

                      {/* Ações do Administrador */}
                      <td className="px-5 py-3.5 text-right">
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
                              className="h-7 px-2.5 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-[11px] font-medium transition-colors cursor-pointer"
                              title="Validar processos e contabilizar venda na comissão"
                            >
                              Validar
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
                              className="h-7 px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              Reverter
                            </button>
                          ) : null}

                          {clientObj && (
                            <button
                              type="button"
                              onClick={() => setProfileClient(clientObj)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Abrir ficha do cotista"
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
          notifySidebarSync();
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
            notifySidebarSync();
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
            notifySidebarSync();
          }}
        />
      )}
    </div>
  );
}
