import fs from 'fs';

const path = "src/components/pecas/MaintenanceOverview.tsx";
let code = fs.readFileSync(path, 'utf8');

// Update KPIs
code = code.replace(
  /const emManutencao = manutencoes\.filter\(.*?\)\.length;/g,
  "const emManutencao = manutencoes.filter(m => m.status === 'aguardando_orcamento' || m.status === 'aguardando_aprovacao' || m.status === 'em_execucao').length;"
);

code = code.replace(
  /const orcamentosPendentes = manutencoes\.filter\(m => m\.status === 'orcamento_pendente'.*?\)\.length;/g,
  "const orcamentosPendentes = manutencoes.filter(m => m.status === 'aguardando_aprovacao').length;"
);

// Update Stage Distribution Counts
code = code.replace(
  /chamado_aberto: manutencoes\.filter\(m => m\.status === 'fila_espera'\)\.length,/,
  "aguardando_orcamento: manutencoes.filter(m => m.status === 'aguardando_orcamento').length,"
);
code = code.replace(
  /orcamento_pendente: manutencoes\.filter\(m => m\.status === 'orcamento_pendente'\)\.length,/,
  "aguardando_aprovacao: manutencoes.filter(m => m.status === 'aguardando_aprovacao').length,"
);
code = code.replace(
  /em_manutencao: manutencoes\.filter\(m => m\.status === 'em_andamento' \|\| m\.status === 'na_oficina' \|\| m\.status === 'aguardando_pecas'\)\.length,/,
  "em_execucao: manutencoes.filter(m => m.status === 'em_execucao').length,"
);

// Update Stage Distribution Array Mapping
code = code.replace(
  /\{ label: '1\. Fila \/ Agendado', count: counts\.chamado_aberto, pct: Math\.round\(\(counts\.chamado_aberto \/ total\) \* 100\), color: 'bg-pink-500', barBg: 'bg-pink-100' \},/,
  "{ label: '1. Aguardando Orçamento', count: counts.aguardando_orcamento, pct: Math.round((counts.aguardando_orcamento / total) * 100), color: 'bg-pink-500', barBg: 'bg-pink-100' },"
);
code = code.replace(
  /\{ label: '2\. Orçamento \(Aprovação\)', count: counts\.orcamento_pendente, pct: Math\.round\(\(counts\.orcamento_pendente \/ total\) \* 100\), color: 'bg-amber-500', barBg: 'bg-amber-100' \},/,
  "{ label: '2. Aguardando Aprovação', count: counts.aguardando_aprovacao, pct: Math.round((counts.aguardando_aprovacao / total) * 100), color: 'bg-amber-500', barBg: 'bg-amber-100' },"
);
code = code.replace(
  /\{ label: '3\. Em Manutenção', count: counts\.em_manutencao, pct: Math\.round\(\(counts\.em_manutencao \/ total\) \* 100\), color: 'bg-blue-500', barBg: 'bg-blue-100' \},/,
  "{ label: '3. Execução da OS', count: counts.em_execucao, pct: Math.round((counts.em_execucao / total) * 100), color: 'bg-blue-500', barBg: 'bg-blue-100' },"
);

// Update Boats in Maintenance
code = code.replace(
  /\.filter\(m => m\.status === 'em_andamento' \|\| m\.status === 'na_oficina' \|\| m\.status === 'aguardando_pecas'\)/g,
  ".filter(m => m.status === 'aguardando_orcamento' || m.status === 'aguardando_aprovacao' || m.status === 'em_execucao')"
);

fs.writeFileSync(path, code);
