import { VendaComercial, ConfigMotorComissoes } from '../types';

export const DEFAULT_MOTOR_COMISSOES_CONFIG: ConfigMotorComissoes = {
  salarioBase: 1621.0,
  valeRefeicao: 250.0,
  diaCorteQuinzena1: 15,
  metaSemanalCotas: 4,
  semanasNoMesModo: 'auto',
  regraSuperavitSemanal: true,
  faixasComissao: [
    { id: 'fx_1', minCotas: 0, maxCotas: 4, valorPorCota: 0, descricao: '0 a 4 cotas (Sem comissão)' },
    { id: 'fx_2', minCotas: 5, maxCotas: 8, valorPorCota: 100, descricao: '5 a 8 cotas (Retroativa)' },
    { id: 'fx_3', minCotas: 9, maxCotas: 12, valorPorCota: 150, descricao: '9 a 12 cotas (Retroativa)' },
    { id: 'fx_4', minCotas: 13, maxCotas: null, valorPorCota: 200, descricao: '13 a 21+ cotas (Retroativa)' }
  ],
  bonusSemanalProgressivo: [100, 200, 300, 400, 500],
  faixasBonusMensal: [
    { id: 'bm_1', minCotas: 16, maxCotas: 20, valorBonus: 300, descricao: '16 a 20 cotas no mês' },
    { id: 'bm_2', minCotas: 21, maxCotas: 24, valorBonus: 1000, descricao: '21 a 24 cotas no mês' },
    { id: 'bm_3', minCotas: 25, maxCotas: null, valorBonus: 2000, descricao: '25+ cotas no mês' }
  ],
  requisitosVendaConcluida: {
    exigirEntradaPaga: true,
    exigirComprovanteEntrada: true,
    exigirContratoAquisicaoAssinado: true,
    exigirContratoAdmAssinado: true
  },
  equipeComercial: [
    { id: 'vend_1', nome: 'Consultor Comercial 01', cargo: 'Vendedor Comercial', ativo: true, salarioBaseCustom: null, vrCustom: null },
    { id: 'vend_2', nome: 'Consultor Comercial 02', cargo: 'Vendedor Comercial', ativo: true, salarioBaseCustom: null, vrCustom: null }
  ]
};

export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export interface ComissoesResumoRealTime {
  competencia: string;
  totalCotasMes: number;
  faturamentoRealMes: number;
  valorUnitarioFaixa: number;
  faixaDescricao: string;
  comissaoCotasTotal: number;
  metasSemanaisBatidas: number;
  bonusSemanalTotal: number;
  bonusMensalTotal: number;
  totalVariavelPorVendedor: number;
  remuneracaoTotalPorVendedor: number;
  salarioBase: number;
  valeRefeicao: number;
}

export function calculateComissoesResumo(
  vendas: VendaComercial[],
  config: ConfigMotorComissoes = DEFAULT_MOTOR_COMISSOES_CONFIG,
  competencia: string = getCurrentMonthKey()
): ComissoesResumoRealTime {
  const activeSales = vendas.filter(v => {
    if (v.status === 'cancelada') return false;
    const dv = (v.dataVenda || '').slice(0, 7);
    return dv === competencia;
  });

  const faturamentoRealMes = activeSales.reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);
  const totalCotasMes = activeSales.length;

  // Faixa de comissão por cota
  const sortedFaixas = [...(config.faixasComissao || DEFAULT_MOTOR_COMISSOES_CONFIG.faixasComissao)].sort(
    (a, b) => a.minCotas - b.minCotas
  );

  let faixaAtual = sortedFaixas[0] || { minCotas: 0, maxCotas: 4, valorPorCota: 0, descricao: '0 a 4 cotas' };
  for (const f of sortedFaixas) {
    if (totalCotasMes >= f.minCotas && (f.maxCotas === null || totalCotasMes <= f.maxCotas)) {
      faixaAtual = f;
      break;
    }
    if (totalCotasMes >= f.minCotas && f.maxCotas === null) {
      faixaAtual = f;
    }
  }

  const comissaoCotasTotal = totalCotasMes * (Number(faixaAtual.valorPorCota) || 0);

  // Bônus semanal acumulativo
  const metaSem = Math.max(1, config.metaSemanalCotas || 4);
  const metasSemanaisBatidas = Math.min(5, Math.floor(totalCotasMes / metaSem));
  let bonusSemanalTotal = 0;
  const progBonus = config.bonusSemanalProgressivo || DEFAULT_MOTOR_COMISSOES_CONFIG.bonusSemanalProgressivo;
  for (let i = 0; i < metasSemanaisBatidas; i++) {
    bonusSemanalTotal += Number(progBonus[i] || 0);
  }

  // Bônus mensal de volume total (não acumulativo, maior faixa)
  let bonusMensalTotal = 0;
  const sortedBm = [...(config.faixasBonusMensal || DEFAULT_MOTOR_COMISSOES_CONFIG.faixasBonusMensal)].sort(
    (a, b) => a.minCotas - b.minCotas
  );
  for (const bm of sortedBm) {
    if (totalCotasMes >= bm.minCotas && (bm.maxCotas === null || totalCotasMes <= bm.maxCotas)) {
      bonusMensalTotal = Number(bm.valorBonus) || 0;
    }
  }

  const totalVariavelPorVendedor = comissaoCotasTotal + bonusSemanalTotal + bonusMensalTotal;
  const salarioBase = Number(config.salarioBase) || 1621.0;
  const valeRefeicao = Number(config.valeRefeicao) || 250.0;
  const remuneracaoTotalPorVendedor = salarioBase + totalVariavelPorVendedor;

  return {
    competencia,
    totalCotasMes,
    faturamentoRealMes,
    valorUnitarioFaixa: Number(faixaAtual.valorPorCota) || 0,
    faixaDescricao: faixaAtual.descricao || `${totalCotasMes} cotas`,
    comissaoCotasTotal,
    metasSemanaisBatidas,
    bonusSemanalTotal,
    bonusMensalTotal,
    totalVariavelPorVendedor,
    remuneracaoTotalPorVendedor,
    salarioBase,
    valeRefeicao
  };
}
