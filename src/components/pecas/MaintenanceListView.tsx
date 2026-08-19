import React, { useMemo } from 'react';
import { 
  FileText, 
  Ship, 
  Wrench, 
  DollarSign, 
  Send, 
  Calendar, 
  Clock, 
  Building2, 
  ChevronRight,
  Filter,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Manutencao, Embarcacao, Mecanico } from '../../types';
import { generateOrcamentoOSPDF } from '../../utils/pdfGenerator';
import { maintenanceDB } from '../../db';

interface MaintenanceListViewProps {
  manutencoes: Manutencao[];
  embarcacoes: Embarcacao[];
  mecanicos: Mecanico[];
  onOpenOS: (item: Manutencao) => void;
  onRefresh: () => void;
  searchTerm?: string;
}

export default function MaintenanceListView({
  manutencoes,
  embarcacoes,
  mecanicos,
  onOpenOS,
  onRefresh,
  searchTerm = ''
}: MaintenanceListViewProps) {

  const filteredManutencoes = useMemo(() => {
    return manutencoes.filter(m => {
      const boat = embarcacoes.find(b => b.id === m.embarcacaoId);
      const searchLower = searchTerm.toLowerCase();
      const codeStr = m.codigoOS || ('OS-' + m.id.substring(0, 6));
      
      return (
        (m.tituloChamado && m.tituloChamado.toLowerCase().includes(searchLower)) ||
        (m.descricaoServico && m.descricaoServico.toLowerCase().includes(searchLower)) ||
        (codeStr.toLowerCase().includes(searchLower)) ||
        (boat && boat.nome.toLowerCase().includes(searchLower)) ||
        (boat && boat.numero && boat.numero.toLowerCase().includes(searchLower))
      );
    });
  }, [manutencoes, embarcacoes, searchTerm]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await maintenanceDB.update(id, { status: newStatus as any });
      onRefresh();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'chamado_aberto':
        return { label: '1. Triagem & Chamado', bg: 'bg-pink-100 text-pink-900 border-pink-200' };
      case 'orcamento_pendente':
        return { label: '2. Orçamento (Aprovação)', bg: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'em_andamento':
      case 'aguardando_pecas':
      case 'na_oficina':
        return { label: '3. Em Manutenção', bg: 'bg-blue-100 text-blue-900 border-blue-200' };
      case 'concluido':
        return { label: '4. Concluído & Liberado', bg: 'bg-purple-100 text-purple-900 border-purple-200' };
      default:
        return { label: 'Em Manutenção', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div className="p-6 overflow-y-auto h-full font-sans bg-[#f3f7f5]/80 custom-scrollbar space-y-4">
      
      {/* Desktop Data Table */}
      <div className="hidden md:block bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Tabela de Ordens de Serviço</h2>
            <p className="text-xs text-slate-400 font-medium">Gestão integrada com troca rápida de status em 1 clique</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {filteredManutencoes.length} Registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Código OS</th>
                <th className="pb-3 px-3">Embarcação</th>
                <th className="pb-3 px-3">Tipo de Serviço</th>
                <th className="pb-3 px-3">Mecânico / Oficina</th>
                <th className="pb-3 px-3">Horímetro</th>
                <th className="pb-3 px-3">Orçamento R$</th>
                <th className="pb-3 px-3">Estágio (Kanban)</th>
                <th className="pb-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {filteredManutencoes.map(m => {
                const boat = embarcacoes.find(b => b.id === m.embarcacaoId);
                const mecanicoObj = mecanicos.find(mec => mec.id === m.mecanico);
                const badge = getStatusBadge(m.status);

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Código OS */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-xs font-black bg-teal-50 text-[#186b77] px-2 py-0.5 rounded-md border border-teal-200/80">
                        {m.codigoOS || ('OS-' + m.id.substring(0, 6).toUpperCase())}
                      </span>
                    </td>

                    {/* Embarcação */}
                    <td className="py-3.5 px-3">
                      <strong className="text-slate-900 font-extrabold block">
                        {boat?.nome || 'Embarcação'} (M{boat?.numero || '00'})
                      </strong>
                      <span className="text-[10px] text-slate-400 font-medium">{boat?.modelo || boat?.tipo}</span>
                    </td>

                    {/* Tipo de Serviço */}
                    <td className="py-3.5 px-3 text-slate-800 font-extrabold">
                      {m.tituloChamado || 'Manutenção Geral'}
                    </td>

                    {/* Mecânico / Oficina */}
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {mecanicoObj?.nome || 'Pátio Marina'}
                      </span>
                    </td>

                    {/* Horímetro */}
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-800">
                      {m.horasMotorAtual || boat?.horasMotor || 0} h
                    </td>

                    {/* Orçamento R$ */}
                    <td className="py-3.5 px-3">
                      {m.orcamento && m.orcamento > 0 ? (
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                          {m.orcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Pendente</span>
                      )}
                    </td>

                    {/* Quick Inline Status Change Dropdown */}
                    <td className="py-3.5 px-3">
                      <select
                        value={m.status || 'em_andamento'}
                        onChange={(e) => handleStatusChange(m.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer ${badge.bg}`}
                      >
                        <option value="chamado_aberto">1. Triagem & Chamado</option>
                        <option value="orcamento_pendente">2. Orçamento (Aprovação)</option>
                        <option value="em_andamento">3. Em Manutenção</option>
                        <option value="concluido">4. Concluído & Liberado</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {m.orcamento && m.orcamento > 0 ? (
                          <button
                            onClick={() => generateOrcamentoOSPDF(m, boat)}
                            className="p-1.5 text-slate-500 hover:text-[#186b77] hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Gerar PDF do Orçamento"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        ) : null}

                        <button
                          onClick={() => onOpenOS(m)}
                          className="px-3 py-1.5 bg-[#186b77] hover:bg-[#12555f] text-white font-extrabold rounded-xl text-xs shadow-2xs transition-all cursor-pointer"
                        >
                          Abrir OS
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredManutencoes.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-medium">
                    Nenhuma Ordem de Serviço encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Card View (block md:hidden) */}
      <div className="block md:hidden space-y-3">
        {filteredManutencoes.map(m => {
          const boat = embarcacoes.find(b => b.id === m.embarcacaoId);
          const badge = getStatusBadge(m.status);

          return (
            <div key={m.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black bg-teal-50 text-[#186b77] px-2 py-0.5 rounded border border-teal-200">
                  {m.codigoOS || ('OS-' + m.id.substring(0, 6).toUpperCase())}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                  {badge.label}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">{m.tituloChamado || 'Manutenção'}</h4>
                <span className="text-xs text-slate-500 font-medium block mt-0.5">{boat?.nome} (M{boat?.numero})</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700">
                  {m.orcamento ? m.orcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Sem orçamento'}
                </span>
                <button
                  onClick={() => onOpenOS(m)}
                  className="px-3 py-1.5 bg-[#186b77] text-white font-extrabold rounded-xl text-xs"
                >
                  Abrir OS
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
