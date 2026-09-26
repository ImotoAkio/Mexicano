const fs = require('fs');
const content = fs.readFileSync('src/components/pecas/MaintenanceListView.tsx', 'utf8');

const importReplacement = `import { maintenanceDB } from '../../db';
import MaintenanceCheckoutModal from './MaintenanceCheckoutModal';`;

const stateReplacement = `  const [checkoutItem, setCheckoutItem] = React.useState<Manutencao | null>(null);

  const filteredManutencoes = useMemo(() => {`;

const statusChangeReplacement = `  const handleStatusChange = async (id: string, newStatus: string) => {
    const item = manutencoes.find(m => m.id === id);
    if (!item) return;

    if (newStatus === 'concluido') {
      const isMissingFinance = item.gerarFinanceiro === false || (!item.valorRepassado && !item.custo && !item.orcamento);
      if (isMissingFinance) {
        setCheckoutItem(item);
        return; // wait for modal
      }
    }

    try {
      await maintenanceDB.update(id, { status: newStatus as any });
      onRefresh();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };`;
  
const modalReplacement = `  return (
    <div className="p-6 overflow-y-auto h-full font-sans bg-[#f3f7f5]/80 custom-scrollbar space-y-4">
      {checkoutItem && (
        <MaintenanceCheckoutModal 
          item={checkoutItem}
          onClose={() => setCheckoutItem(null)}
          onSuccess={() => {
            setCheckoutItem(null);
            onRefresh();
          }}
        />
      )}`;

// We also need to add the Badge near the title in the table
const renderCardReplacement = `                          {m.tituloChamado || m.descricaoServico || 'Ordem de Serviço s/ Título'}
                        </p>
                        <div className="flex gap-2">
                          <span className="text-[10px] bg-[#186b77]/10 text-[#186b77] font-semibold px-2 py-0.5 rounded uppercase mt-0.5 inline-block">
                            {catMap[m.categoria || 'preventiva']}
                          </span>
                          {/* Badge Faturamento */}
                          {m.status === 'concluido' && (
                            <span className={\`text-[10px] font-semibold px-2 py-0.5 rounded uppercase mt-0.5 inline-block flex items-center gap-1 \${
                              m.gerarFinanceiro && (m.valorRepassado || m.custo || m.orcamento) 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-slate-100 text-slate-500'}\`}
                            >
                              {m.gerarFinanceiro && (m.valorRepassado || m.custo || m.orcamento) ? (
                                <><DollarSign className="w-3 h-3" /> Faturado</>
                              ) : (
                                <><CheckCircle className="w-3 h-3" /> Cortesia</>
                              )}
                            </span>
                          )}
                        </div>`;

let newContent = content.replace("import { maintenanceDB } from '../../db';", importReplacement);
newContent = newContent.replace("  const filteredManutencoes = useMemo(() => {", stateReplacement);
newContent = newContent.replace(/  const handleStatusChange = async \([^]*?  };/, statusChangeReplacement);
newContent = newContent.replace('  return (\n    <div className="p-6 overflow-y-auto h-full font-sans bg-[#f3f7f5]/80 custom-scrollbar space-y-4">', modalReplacement);

const searchTitleRender = `                          {m.tituloChamado || m.descricaoServico || 'Ordem de Serviço s/ Título'}
                        </p>
                        <span className="text-[10px] bg-[#186b77]/10 text-[#186b77] font-semibold px-2 py-0.5 rounded uppercase mt-0.5 inline-block">
                          {catMap[m.categoria || 'preventiva']}
                        </span>`;
newContent = newContent.replace(searchTitleRender, renderCardReplacement);

fs.writeFileSync('src/components/pecas/MaintenanceListView.tsx', newContent);
