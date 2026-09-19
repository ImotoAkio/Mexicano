const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

const target = code.substring(code.indexOf('// ──────────── Centros de Custo ────────────'), code.lastIndexOf('// ──────────── Centros de Custo ────────────'));

if (target.includes('Centros de Custo')) {
  code = code.replace(target, '');
  fs.writeFileSync('server-db.ts', code);
  console.log('Removed duplicate code');
}
