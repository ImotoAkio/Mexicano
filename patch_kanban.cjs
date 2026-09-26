const fs = require('fs');
const content = fs.readFileSync('src/components/pecas/KanbanBoard.tsx', 'utf8');

const importReplacement = `import { maintenanceDB, chamadoDB } from '../../db';
import MaintenanceCheckoutModal from './MaintenanceCheckoutModal';`;

const stateReplacement = `  const [checkoutItem, setCheckoutItem] = React.useState<Manutencao | null>(null);

  // Unified 4 Columns Workflow (Chamado -> Orçamento -> Em Manutenção -> Concluído)`;

const dropReplacement = `  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;

    const item = manutencoes.find(m => m.id === id);
    if (!item) return;

    let targetStatus = columnId;
    if (columnId === 'em_manutencao') {
      targetStatus = 'em_andamento';
    }

    // Intercept drop to "concluido"
    if (targetStatus === 'concluido') {
      const isMissingFinance = item.gerarFinanceiro === false || (!item.valorRepassado && !item.custo && !item.orcamento);
      if (isMissingFinance) {
        setCheckoutItem(item);
        return; // wait for modal
      }
    }

    try {
      await maintenanceDB.update(id, { status: targetStatus as Manutencao['status'] });
      onRefresh();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };`;
  
const modalReplacement = `    <div className="h-full w-full flex overflow-x-auto p-6 gap-6 custom-scrollbar items-start bg-[#f3f7f5]/80 font-sans">
      {checkoutItem && (
        <MaintenanceCheckoutModal 
          item={checkoutItem}
          onClose={() => setCheckoutItem(null)}
          onSuccess={() => {
            setCheckoutItem(null);
            onRefresh();
          }}
        />
      )}
      {columns.map(col => {`;
      
const renderCardReplacement = `            <div 
              key={m.id}
              draggable
              onDragStart={(e) => handleDragStart(e, m.id)}
              onClick={() => onOpenCard(m)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60 cursor-pointer hover:shadow-md hover:border-[#186b77]/30 transition-all group flex flex-col gap-3"
            >
              {/* Header: OS Code, User and Status */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {codeStr}
                </span>

                {/* Badge de Faturamento Financeiro (Apenas para Concluídos ou visíveis em geral) */}
                {m.status === 'concluido' && (
                  <div className="flex items-center gap-1">
                    {m.gerarFinanceiro && (m.valorRepassado || m.custo || m.orcamento) ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1" title="Faturado no Financeiro">
                        <DollarSign className="w-3 h-3" /> Faturado
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-slate-100 border border-dashed border-slate-300 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1" title="Cortesia / Sem Cobrança">
                        <CheckCircle className="w-3 h-3" /> Sem Cobrança
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Title & Description */}`;

let newContent = content.replace("import { maintenanceDB, chamadoDB } from '../../db';", importReplacement);
newContent = newContent.replace("  // Unified 4 Columns Workflow (Chamado -> Orçamento -> Em Manutenção -> Concluído)", stateReplacement);
newContent = newContent.replace(/  const handleDrop = async \([^]*?  };/, dropReplacement);
newContent = newContent.replace('    <div className="h-full w-full flex overflow-x-auto p-6 gap-6 custom-scrollbar items-start bg-[#f3f7f5]/80 font-sans">\n      {columns.map(col => {', modalReplacement);

// Render card replacement
const searchCardRender = `            <div 
              key={m.id}
              draggable
              onDragStart={(e) => handleDragStart(e, m.id)}
              onClick={() => onOpenCard(m)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60 cursor-pointer hover:shadow-md hover:border-[#186b77]/30 transition-all group flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {codeStr}
                </span>
                
              </div>`;

newContent = newContent.replace(searchCardRender, renderCardReplacement);
fs.writeFileSync('src/components/pecas/KanbanBoard.tsx', newContent);
