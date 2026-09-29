import fs from 'fs';

const path = "src/components/pecas/MaintenanceListView.tsx";
let code = fs.readFileSync(path, 'utf8');

// handleStatusChange
code = code.replace(
  /if \(newStatus === 'orcamento_pendente'\) \{[\s\S]*?else if \(newStatus === 'em_andamento'\) \{/,
  `if (newStatus === 'aguardando_aprovacao') {
      if (!item.mecanico) {
        setTransitionItem({ item, target: 'aguardando_aprovacao' as any });
        return;
      }
    } else if (newStatus === 'em_execucao') {`
);

code = code.replace(
  /target: 'em_andamento'/g,
  "target: 'em_execucao' as any"
);

// getStatusBadge
code = code.replace(
  /case 'fila_espera':[\s\S]*?return \{ label: '1\. Fila \/ Agendado', bg: 'bg-pink-100 text-pink-900 border-pink-200' \};/,
  "case 'aguardando_orcamento':\n        return { label: '1. Aguardando Orçamento', bg: 'bg-pink-100 text-pink-900 border-pink-200' };"
);
code = code.replace(
  /case 'orcamento_pendente':[\s\S]*?return \{ label: '2\. Orçamento \(Aprovação\)', bg: 'bg-amber-100 text-amber-900 border-amber-200' \};/,
  "case 'aguardando_aprovacao':\n        return { label: '2. Aguardando Aprovação', bg: 'bg-amber-100 text-amber-900 border-amber-200' };"
);
code = code.replace(
  /case 'em_andamento':\s*case 'aguardando_pecas':\s*case 'na_oficina':\s*return \{ label: '3\. Em Manutenção', bg: 'bg-blue-100 text-blue-900 border-blue-200' \};/,
  "case 'em_execucao':\n        return { label: '3. Execução da OS', bg: 'bg-blue-100 text-blue-900 border-blue-200' };\n      case 'reprovado':\n        return { label: 'Reprovado', bg: 'bg-red-100 text-red-900 border-red-200' };"
);

// <select> options in the render loop
code = code.replace(
  /<option value="fila_espera">1\. Fila \/ Agendado<\/option>[\s\S]*?<option value="orcamento_pendente">2\. Orçamento \(Aprovação\)<\/option>[\s\S]*?<option value="em_andamento">3\. Em Manutenção<\/option>/g,
  `<option value="aguardando_orcamento">1. Aguardando Orçamento</option>
                        <option value="aguardando_aprovacao">2. Aguardando Aprovação Cliente</option>
                        <option value="em_execucao">3. Execução da OS</option>
                        <option value="reprovado">Cancelado / Reprovado</option>`
);

// fallback mapping in select
code = code.replace(/value=\{m\.status || 'em_andamento'\}/, "value={m.status || 'aguardando_orcamento'}");

fs.writeFileSync(path, code);
