const fs = require('fs');

const path = "src/components/pecas/KanbanBoard.tsx";
let code = fs.readFileSync(path, 'utf8');

// Replace state
code = code.replace(
  "target: 'orcamento_pendente' | 'em_andamento'",
  "target: 'aguardando_aprovacao' | 'em_execucao'"
);

// Replace columns
code = code.replace(
  /const columns = \[[\s\S]*?\];/,
`const columns = [
    {
      id: 'aguardando_orcamento',
      label: '1. Aguardando Orçamento',
      dotColor: 'bg-pink-500',
      containerBg: 'bg-pink-100/60 border-pink-200/60',
      textColor: 'text-pink-900',
      progress: 15
    },
    {
      id: 'aguardando_aprovacao',
      label: '2. Aguardando Aprovação',
      dotColor: 'bg-amber-500',
      containerBg: 'bg-amber-100/60 border-amber-200/60',
      textColor: 'text-amber-900',
      progress: 40
    },
    {
      id: 'em_execucao',
      label: '3. Execução da OS',
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
    }
  ];`
);

// Replace handleDrop content inside
code = code.replace(
  /let targetStatus = columnId;[\s\S]*?try {/m,
`let targetStatus = columnId;

    // Modal intercept for specific stages
    if (targetStatus === 'aguardando_aprovacao') {
      if (!item.mecanico) {
        setTransitionItem({ item, target: 'aguardando_aprovacao' });
        return;
      }
    } else if (targetStatus === 'em_execucao') {
      const needsBudgetConf = (!item.orcamento && item.orcamento !== 0) || item.orcamentoStatus !== 'aprovado';
      if (needsBudgetConf || !item.mecanico) {
        setTransitionItem({ item, target: 'em_execucao' });
        return;
      }
    } else if (targetStatus === 'concluido') {
      // Checkout Modal applies validation of Horímetro and Finances
      setCheckoutItem(item);
      return;
    }

    try {`
);

// In the map where cards are filtered
code = code.replace(
  /const allCards = filteredManutencoes\.filter\(m => \{[\s\S]*?\}\);/m,
`const allCards = filteredManutencoes.filter(m => {
          const currentStatus = m.status || 'aguardando_orcamento';
          return currentStatus === col.id;
        });`
);

fs.writeFileSync(path, code);
