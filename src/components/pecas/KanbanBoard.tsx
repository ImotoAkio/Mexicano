import React, { useState } from 'react';
import { Plus, Clock, Wrench, AlertTriangle, FileText, CheckCircle, Ship, MapPin } from 'lucide-react';
import { Manutencao, Embarcacao, Mecanico } from '../../types';
import { maintenanceDB } from '../../db';

interface KanbanBoardProps {
  manutencoes: Manutencao[];
  embarcacoes: Embarcacao[];
  mecanicos: Mecanico[];
  onOpenCard: (item?: Manutencao) => void;
  onRefresh: () => void;
}

export default function KanbanBoard({ manutencoes, embarcacoes, mecanicos, onOpenCard, onRefresh }: KanbanBoardProps) {
  
  const columns = [
    { id: 'chamado_aberto', label: 'Novo Chamado', color: 'bg-slate-100 border-slate-200 text-slate-800' },
    { id: 'orcamento_pendente', label: 'Orçamento', color: 'bg-orange-50 border-orange-200 text-orange-800' },
    { id: 'aguardando_pecas', label: 'Aguard. Peças', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
    { id: 'em_andamento', label: 'Em Execução', color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { id: 'na_oficina', label: 'Na Oficina Ext.', color: 'bg-purple-50 border-purple-200 text-purple-800' },
    { id: 'concluido', label: 'Concluído', color: 'bg-green-50 border-green-200 text-green-800' },
  ];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;

    try {
      await maintenanceDB.update(id, { status: statusId as Manutencao['status'] });
      onRefresh();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getBoatInfo = (boatId: string) => {
    return embarcacoes.find(b => b.id === boatId);
  };

  return (
    <div className="h-full w-full flex overflow-x-auto p-6 gap-6 custom-scrollbar items-start bg-slate-50/50">
      {columns.map(col => {
        const cards = manutencoes.filter(m => (m.status || 'em_andamento') === col.id);
        
        return (
          <div 
            key={col.id} 
            className="flex-shrink-0 w-80 h-full flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className={`px-4 py-3 rounded-t-lg border border-b-0 font-semibold flex items-center justify-between ${col.color}`}>
              <span>{col.label}</span>
              <span className="bg-white/50 text-xs px-2 py-0.5 rounded-full">{cards.length}</span>
            </div>
            
            <div className={`flex-1 overflow-y-auto p-3 bg-white border border-t-0 rounded-b-lg border-slate-200 custom-scrollbar flex flex-col gap-3 min-h-[200px]`}>
              {cards.map(card => {
                const boat = getBoatInfo(card.embarcacaoId);
                const isLate = card.prazoEntrega && new Date(card.prazoEntrega) < new Date();
                
                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.id)}
                    onClick={() => onOpenCard(card)}
                    className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all active:cursor-grabbing group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                        <Ship className="w-4 h-4" />
                        {boat ? `${boat.nome} ${boat.numero ? `(M${boat.numero})` : ''}` : 'Embarcação Excluída'}
                      </div>
                      {isLate && col.id !== 'concluido' && (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> Atrasado
                        </span>
                      )}
                    </div>
                    
                    <h4 className="font-semibold text-slate-800 text-sm mb-2 line-clamp-2">
                      {card.tituloChamado || 'Manutenção Geral'}
                    </h4>

                    {card.mecanico && (
                      <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        {mecanicos.find(m => m.id === card.mecanico)?.nome || 'Mecânico'}
                      </div>
                    )}

                    {card.localizacao === 'oficina_externa' && (
                      <div className="text-xs text-purple-600 font-medium mb-2 flex items-center gap-1 bg-purple-50 px-2 py-1 rounded inline-flex">
                        <MapPin className="w-3 h-3" /> Oficina Externa
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1" title="Data do Chamado">
                        <FileText className="w-3 h-3" />
                        {card.dataChamado ? new Date(card.dataChamado).toLocaleDateString('pt-BR') : new Date(card.dataSaida).toLocaleDateString('pt-BR')}
                      </div>
                      
                      {card.prazoEntrega && (
                        <div className={`flex items-center gap-1 font-medium ${isLate && col.id !== 'concluido' ? 'text-red-600' : ''}`} title="Prazo de Entrega">
                          <Clock className="w-3 h-3" />
                          {new Date(card.prazoEntrega).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {cards.length === 0 && (
                <div className="flex items-center justify-center h-20 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                  Arraste cards para cá
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
