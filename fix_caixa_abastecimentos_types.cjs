const fs = require('fs');

const path = 'server-routes/marina-caixa.routes.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "caixaTransacao.descricao =",
  "(caixaTransacao as any).descricao ="
).replace(
  "caixaTransacao.dataVencimento =",
  "(caixaTransacao as any).dataVencimento ="
);

fs.writeFileSync(path, code);
