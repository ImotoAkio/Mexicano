const fs = require('fs');
const filepath = 'src/components/finance/FinanceFluxoCaixa.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const oldFetch = `      await fetch('/api/financeiro/lancamentos/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ lancamentos: withIds })
      });`;

const newFetch = `      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ action: 'upsert', data: withIds })
      });`;

content = content.replace(oldFetch, newFetch);
fs.writeFileSync(filepath, content);
