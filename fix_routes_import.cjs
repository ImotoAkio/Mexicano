const fs = require('fs');
const file = 'server-routes/chamados.routes.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { requireAnyAuth, requireClientAuth, requireAnyAuth,',
  'import { requireAnyAuth, requireClientAuth,'
);

fs.writeFileSync(file, content);
console.log('fixed import');
