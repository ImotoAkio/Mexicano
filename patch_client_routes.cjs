const fs = require('fs');
const file = 'server-routes/client.routes.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "if (r.clienteId !== userId || r.status === 'cancelado') return false;",
  "if (r.clienteId !== userId || r.embarcacaoId !== embarcacaoId || r.status === 'cancelado') return false;"
);

code = code.replace(
  "r.clienteId === userId && r.status !== 'cancelado' && r.data >= todayStr",
  "r.clienteId === userId && r.embarcacaoId === embarcacaoId && r.status !== 'cancelado' && r.data >= todayStr"
);

code = code.replace(
  'return res.status(400).json({ error: true, message: "Você atingiu o limite máximo de 2 reservas ativas simultâneas." });',
  'return res.status(400).json({ error: true, message: "Você atingiu o limite máximo de 2 reservas ativas simultâneas para esta embarcação." });'
);

code = code.replace(
  'return res.status(400).json({ error: true, message: `Você já possui um agendamento para um ${dayName} neste mês.` });',
  'return res.status(400).json({ error: true, message: `Você já possui um agendamento para um ${dayName} neste mês com esta embarcação.` });'
);

fs.writeFileSync(file, code);
