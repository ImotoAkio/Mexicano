const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

const parentInput = `<div>
                    <label className="block mb-1.5">Plano de Conta Pai</label>
                    <select
                      value={planoForm.parentId || ''}
                      onChange={e => setPlanoForm({...planoForm, parentId: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                    >
                      <option value="">Nenhum (Raiz)</option>
                      {planosContas
                        .filter(c => c.id !== editingPlano?.id && c.tipo === (planoForm.tipo || 'despesa') && (c.empresa === planoForm.empresa || c.empresa === 'Todos' || planoForm.empresa === 'Todos'))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.codigoContabil} - {c.descricao}</option>
                        ))
                      }
                    </select>
                  </div>`;

// Find where Descrição is in the form-plano, it looks like:
/*
<div>
  <label className="block mb-1.5">Descrição *</label>
  <input
    ...
    value={planoForm.descricao || ''}
*/
const regex = /(<input[^>]+value=\{planoForm\.descricao \|\| ''\}[^>]*\/>\s*<\/div>)/;
code = code.replace(regex, `$1\n\n                  ${parentInput}`);

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('Plano form parentId added!');
