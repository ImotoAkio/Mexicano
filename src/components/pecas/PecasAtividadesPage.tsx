import React from 'react';
import FinanceKanban from '../finance/FinanceKanban';

export default function PecasAtividadesPage() {
  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-slate-800">Quadro de Atividades (Peças e Serviços)</h2>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie as tarefas gerais e atividades exclusivas da sua equipe.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <FinanceKanban setor="pecas_servicos" />
      </div>
    </div>
  );
}
