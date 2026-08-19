import React, { useMemo } from 'react';
import { 
  Plus, 
  Clock, 
  Wrench, 
  AlertTriangle, 
  FileText, 
  CheckCircle, 
  Ship, 
  MapPin,
  MoreHorizontal,
  User,
  Paperclip,
  MessageSquare,
  DollarSign,
  ClipboardList
} from 'lucide-react';
import { Manutencao, Embarcacao, Mecanico } from '../../types';
import { maintenanceDB, chamadoDB } from '../../db';

interface KanbanBoardProps {
  manutencoes: Manutencao[];
  embarcacoes: Embarcacao[];
  mecanicos: Mecanico[];
  onOpenCard: (item?: Manutencao) => void;
  onRefresh: () => void;
  searchTerm?: string;
  sortBy?: string;
}

export default function KanbanBoard({ 
  manutencoes, 
  embarcacoes, 
  mecanicos, 
  onOpenCard, 
  onRefresh,
  searchTerm = '',
  sortBy = 'stage'
}: KanbanBoardProps) {
  
  // Unified 4 Columns Workflow (Chamado -> Orçamento -> Em Manutenção -> Concluído)
  const columns = [
    { 
      id: 'chamado_aberto', 
      label: '1. Triagem & Chamado', 
      dotColor: 'bg-pink-500', 
      containerBg: 'bg-pink-100/60 border-pink-200/60', 
      textColor: 'text-pink-900', 
      progress: 15 
    },
    { 
      id: 'orcamento_pendente', 
      label: '2. Orçamento (Aprovação)', 
      dotColor: 'bg-amber-500', 
      containerBg: 'bg-amber-100/60 border-amber-200/60', 
      textColor: 'text-amber-900', 
      progress: 40 
    },
    { 
      id: 'em_manutencao', 
      label: '3. Em Manutenção', 
      dotColor: 'bg-blue-500', 
      containerBg: 'bg-blue-100/60 border-blue-200/60', 
      textColor: 'text-blue-900', 
      progress: 75 
    },
    { 
      id: 'concluido', 
      label: '4. Concluído & Liberado', 
      dotColor: 'bg-purple-500', 
      containerBg: 'bg-purple-100/60 border-purple-200/60', 
      textColor: 'text-purple-900', 
      progress: 100 
    },
  ];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;

    let targetStatus = columnId;
    if (columnId === 'em_manutencao') {
      targetStatus = 'em_andamento';
    }

    try {
      await maintenanceDB.update(id, { status: targetStatus as Manutencao['status'] });
      onRefresh();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getBoatInfo = (boatId: string) => {
    return embarcacoes.find(b => b.id === boatId);
  };

  const allChamados = useMemo(() => chamadoDB.getAll(), [manutencoes]);

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

  return (
    <div className="h-full w-full flex overflow-x-auto p-6 gap-6 custom-scrollbar items-start bg-[#f3f7f5]/80 font-sans">
      {columns.map(col => {
        const cards = filteredManutencoes.filter(m => {
          const currentStatus = m.status || 'em_andamento';
          if (col.id === 'em_manutencao') {
            return currentStatus === 'em_andamento' || currentStatus === 'na_oficina' || currentStatus === 'aguardando_pecas';
          }
          return currentStatus === col.id;
        });

        return (
          <div 
            key={col.id} 
            className={`flex-shrink-0 w-84 rounded-3xl p-4 border transition-all flex flex-col max-h-[85vh] ${col.containerBg}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column Header */}
            <div className="px-2 py-2 flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                <h3 className={`font-black text-sm tracking-tight ${col.textColor}`}>
                  {col.label}
                </h3>
              </div>
              
              <div className="flex items-center gap-1.5">
                <span className="bg-white/80 backdrop-blur-xs text-slate-700 text-xs font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                  {cards.length}
                </span>
                <button 
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-white/40 transition-colors"
                  title="Opções da coluna"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cards Column Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3.5 p-0.5">
              {cards.map(card => {
                const boat = getBoatInfo(card.embarcacaoId);
                const isLate = card.prazoEntrega && new Date(card.prazoEntrega) < new Date();
                const pecasCount = card.pecas ? card.pecas.length : 0;
                const osCode = card.codigoOS || ('OS-' + card.id.substring(0, 6).toUpperCase());

                // Linked ticket info
                const linkedChamado = card.chamadoId ? allChamados.find(c => c.id === card.chamadoId) : null;

                // Priority Badge Color
                const urgencia = linkedChamado?.urgencia || card.urgencia || (isLate ? 'alta' : 'media');
                const priorityBadge = 
                  urgencia === 'critica'
                    ? { label: 'Crítica', bg: 'bg-red-600 text-white font-black' }
                    : urgencia === 'alta'
                    ? { label: 'Alta', bg: 'bg-red-50 text-red-700 border-red-200' }
                    : urgencia === 'media'
                    ? { label: 'Média', bg: 'bg-amber-50 text-amber-800 border-amber-200' }
                    : { label: 'Baixa', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.id)}
                    onClick={() => onOpenCard(card)}
                    className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md border border-white hover:border-slate-200/90 cursor-pointer transition-all duration-200 active:cursor-grabbing group flex flex-col justify-between space-y-3"
                  >
                    {/* Top Row: Priority Badge & OS / Chamado Codes */}
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${priorityBadge.bg}`}>
                        {priorityBadge.label}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {linkedChamado && (
                          <span className="font-mono text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                            {linkedChamado.codigoChamado}
                          </span>
                        )}
                        <span className="font-mono text-[10px] font-extrabold bg-teal-50 text-[#186b77] border border-teal-200/80 px-2 py-0.5 rounded-md">
                          {osCode}
                        </span>
                      </div>
                    </div>

                    {/* Card Title & Boat Info */}
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm tracking-tight line-clamp-2 group-hover:text-[#186b77] transition-colors">
                        {card.tituloChamado || 'Manutenção Geral'}
                      </h4>
                      
                      {/* Boat Info */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mt-1.5">
                        <Ship className="w-3.5 h-3.5 text-[#186b77] shrink-0" />
                        <span className="truncate">
                          {boat ? `${boat.nome} ${boat.numero ? `(M${boat.numero})` : ''}` : 'Embarcação'}
                        </span>
                      </div>

                      {/* Horímetro Entrada & Solicitante */}
                      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-100 text-slate-500 font-semibold">
                        <div>
                          <span className="text-slate-400 block uppercase text-[9px] font-bold">Horímetro</span>
                          <strong className="text-slate-800 font-extrabold">{card.horasMotorAtual || boat?.horasMotor || 0} h</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase text-[9px] font-bold">Solicitante</span>
                          <strong className="text-slate-800 truncate block font-bold">{linkedChamado?.solicitanteNome || 'Marina'}</strong>
                        </div>
                      </div>

                      {/* Orçamento Info if present */}
                      {card.orcamento && card.orcamento > 0 ? (
                        <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50/70 border border-emerald-200/70 p-2 rounded-xl">
                          <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-emerald-600" /> Orçamento:
                          </span>
                          <strong className="text-emerald-900 font-black">
                            {card.orcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </strong>
                        </div>
                      ) : null}

                      {/* Localização Badge (Interna vs Oficina Externa) */}
                      {card.localizacao === 'oficina_externa' ? (
                        <div className="mt-2 text-[10px] text-purple-700 font-bold bg-purple-50 border border-purple-200 px-2 py-1 rounded-xl flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-purple-600 shrink-0" />
                            Oficina Externa
                          </span>
                          {card.prazoEntrega && (
                            <span className="font-mono text-[9px]">Retorno: {new Date(card.prazoEntrega).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 text-[10px] text-blue-700 font-bold bg-blue-50/60 border border-blue-200/60 px-2 py-1 rounded-xl flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>Oficina Interna da Marina</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar Component */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>Progresso do Fluxo</span>
                        <span className="text-slate-700 font-extrabold">{col.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${col.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Card Bottom Meta */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      {/* Avatar / Mecânico */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] border border-slate-200">
                          {card.mecanico ? (mecanicos.find(m => m.id === card.mecanico)?.nome?.charAt(0) || 'M') : 'P'}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[90px]">
                          {card.mecanico ? (mecanicos.find(m => m.id === card.mecanico)?.nome || 'Mecânico') : 'Peças & Serv.'}
                        </span>
                      </div>

                      {/* Icons: Peças / Histórico */}
                      <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-bold">
                        <span className="flex items-center gap-1 hover:text-slate-600" title="Peças / Materiais">
                          <Paperclip className="w-3 h-3" />
                          {pecasCount}
                        </span>
                        <span className="flex items-center gap-1 hover:text-slate-600" title="Histórico">
                          <MessageSquare className="w-3 h-3" />
                          {card.status === 'concluido' ? '1' : '2'}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}

              {cards.length === 0 && (
                <div className="flex flex-col items-center justify-center h-28 text-slate-400 text-xs font-semibold border-2 border-dashed border-white/80 rounded-2xl bg-white/40 p-4 text-center">
                  <span>Nenhuma OS nesta etapa</span>
                  <span className="text-[10px] text-slate-300 mt-0.5">Arraste tarefas para cá</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
