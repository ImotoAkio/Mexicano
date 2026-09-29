import React, { useMemo } from 'react';
import { 
  Wrench, 
  Ship, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight, 
  TrendingUp, 
  FileText,
  Building2,
  Calendar
} from 'lucide-react';
import { Manutencao, Embarcacao, Mecanico } from '../../types';
import { getBoatCode } from '../../utils/boatUtils';

interface MaintenanceOverviewProps {
  manutencoes: Manutencao[];
  embarcacoes: Embarcacao[];
  mecanicos: Mecanico[];
  onOpenOS: (item: Manutencao) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function MaintenanceOverview({
  manutencoes,
  embarcacoes,
  mecanicos,
  onOpenOS,
  onNavigateToTab
}: MaintenanceOverviewProps) {

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = manutencoes.length;
    const emManutencao = manutencoes.filter(m => m.status === 'aguardando_orcamento' || m.status === 'aguardando_aprovacao' || m.status === 'em_execucao').length;
    const orcamentosPendentes = manutencoes.filter(m => m.status === 'aguardando_aprovacao').length;
    const concluidos = manutencoes.filter(m => m.status === 'concluido').length;
    
    const valorTotalOrcado = manutencoes.reduce((acc, m) => acc + (m.orcamento || 0), 0);
    const valorAprovado = manutencoes.filter(m => m.orcamentoStatus === 'aprovado' || m.status === 'concluido').reduce((acc, m) => acc + (m.orcamento || 0), 0);

    return {
      total,
      emManutencao,
      orcamentosPendentes,
      concluidos,
      valorTotalOrcado,
      valorAprovado
    };
  }, [manutencoes]);

  // Stage distribution
  const stageDistribution = useMemo(() => {
    const counts = {
      aguardando_orcamento: manutencoes.filter(m => m.status === 'aguardando_orcamento').length,
      aguardando_aprovacao: manutencoes.filter(m => m.status === 'aguardando_aprovacao').length,
      em_execucao: manutencoes.filter(m => m.status === 'em_execucao').length,
      concluido: manutencoes.filter(m => m.status === 'concluido').length
    };
    const total = manutencoes.length || 1;
    return [
      { label: '1. Aguardando Orçamento', count: counts.aguardando_orcamento, pct: Math.round((counts.aguardando_orcamento / total) * 100), color: 'bg-pink-500', barBg: 'bg-pink-100' },
      { label: '2. Aguardando Aprovação', count: counts.aguardando_aprovacao, pct: Math.round((counts.aguardando_aprovacao / total) * 100), color: 'bg-amber-500', barBg: 'bg-amber-100' },
      { label: '3. Execução da OS', count: counts.em_execucao, pct: Math.round((counts.em_execucao / total) * 100), color: 'bg-blue-500', barBg: 'bg-blue-100' },
      { label: '4. Concluído & Liberado', count: counts.concluido, pct: Math.round((counts.concluido / total) * 100), color: 'bg-purple-500', barBg: 'bg-purple-100' }
    ];
  }, [manutencoes]);

  // Urgency distribution
  const urgencyDistribution = useMemo(() => {
    const counts = {
      critica: manutencoes.filter(m => m.urgencia === 'critica').length,
      alta: manutencoes.filter(m => m.urgencia === 'alta').length,
      media: manutencoes.filter(m => m.urgencia === 'media' || !m.urgencia).length,
      baixa: manutencoes.filter(m => m.urgencia === 'baixa').length
    };
    return counts;
  }, [manutencoes]);

  // Boats currently unavailable/in maintenance
  const boatsInMaintenance = useMemo(() => {
    return manutencoes
      .filter(m => m.status === 'aguardando_orcamento' || m.status === 'aguardando_aprovacao' || m.status === 'em_execucao')
      .map(m => {
        const boat = embarcacoes.find(b => b.id === m.embarcacaoId);
        const mecanicoObj = mecanicos.find(mec => mec.id === m.mecanico);
        return {
          os: m,
          boat,
          mecanicoObj
        };
      });
  }, [manutencoes, embarcacoes, mecanicos]);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full font-sans bg-[#f3f7f5]/80 custom-scrollbar">
      
      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total OSs */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Total Ordens Serviço</span>
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-[#186b77] border border-teal-200/60 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{metrics.total}</div>
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <span className="text-teal-700 font-bold">{metrics.concluidos} concluídas</span>
            <span>• Em todo histórico</span>
          </div>
        </div>

        {/* KPI 2: Embarcações Paradas */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600">Em Manutenção</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center">
              <Ship className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{metrics.emManutencao}</div>
          <div className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-blue-500" />
            <span>Embarcações indisponíveis</span>
          </div>
        </div>

        {/* KPI 3: Orçamentos Pendentes */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-600">Orçamentos Pendentes</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{metrics.orcamentosPendentes}</div>
          <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
            <span>Aguardando aceite do cliente</span>
          </div>
        </div>

        {/* KPI 4: Investimento Total */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700">Valor Orçado Total</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {metrics.valorTotalOrcado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Aprovado: {metrics.valorAprovado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </div>

      </div>

      {/* Grid Layout: Stage Distribution & Urgency Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Stages Progress Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Distribuição por Estágio do Fluxo</h2>
              <p className="text-xs text-slate-400 font-medium">Acompanhamento do gargalo operacional da marina</p>
            </div>
            <button 
              onClick={() => onNavigateToTab('board')}
              className="text-xs font-bold text-[#186b77] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Kanban</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {stageDistribution.map((st, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                    {st.label}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-600">
                    {st.count} OSs ({st.pct}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${st.color} transition-all duration-500`}
                    style={{ width: `${Math.max(st.pct, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Urgency Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Nível de Urgência</h2>
            <p className="text-xs text-slate-400 font-medium">Criticidade dos chamados ativos</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200/80 text-center space-y-1">
              <span className="text-[10px] font-black text-red-700 uppercase tracking-wider block">Crítica</span>
              <span className="text-2xl font-black text-red-900">{urgencyDistribution.critica}</span>
            </div>

            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200/80 text-center space-y-1">
              <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider block">Alta</span>
              <span className="text-2xl font-black text-orange-900">{urgencyDistribution.alta}</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-center space-y-1">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">Média</span>
              <span className="text-2xl font-black text-amber-900">{urgencyDistribution.media}</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-center space-y-1">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">Baixa</span>
              <span className="text-2xl font-black text-emerald-900">{urgencyDistribution.baixa}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Table of Boats Currently in Maintenance */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Ship className="w-5 h-5 text-[#186b77]" />
              Embarcações Atualmente em Manutenção ({boatsInMaintenance.length})
            </h2>
            <p className="text-xs text-slate-400 font-medium">Lista de embarcações bloqueadas para uso e saídas</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Código OS</th>
                <th className="pb-3 px-3">Embarcação</th>
                <th className="pb-3 px-3">Tipo de Serviço</th>
                <th className="pb-3 px-3">Mecânico / Oficina</th>
                <th className="pb-3 px-3">Horímetro Entrada</th>
                <th className="pb-3 px-3">Previsão Conclusão</th>
                <th className="pb-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {boatsInMaintenance.map(({ os, boat, mecanicoObj }) => (
                <tr key={os.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-mono text-xs font-black bg-teal-50 text-[#186b77] px-2.5 py-1 rounded-lg border border-teal-200/80">
                      {os.codigoOS || ('OS-' + os.id.substring(0, 6).toUpperCase())}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <strong className="text-slate-900 font-extrabold block">
                      {getBoatCode(boat)}
                    </strong>
                    <span className="text-[10px] text-slate-400 font-medium">{boat?.modelo || boat?.tipo}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-800 font-extrabold">
                    {os.tituloChamado || 'Manutenção Geral'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {mecanicoObj?.nome || 'Oficina Responsável'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">
                    {os.horasMotorAtual || boat?.horasMotor || 0} h
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {os.prazoEntrega ? (
                      <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg font-bold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(os.prazoEntrega).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Sem prazo</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onOpenOS(os)}
                      className="px-3 py-1.5 bg-[#186b77] hover:bg-[#12555f] text-white font-extrabold rounded-xl text-xs shadow-2xs transition-all cursor-pointer"
                    >
                      Gerenciar OS
                    </button>
                  </td>
                </tr>
              ))}

              {boatsInMaintenance.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-medium">
                    Nenhuma embarcação em manutenção no momento. Todas as embarcações estão disponíveis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
