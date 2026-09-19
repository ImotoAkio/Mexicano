const fs = require('fs');
const path = 'src/components/MarinaCaixaView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /<div className="space-y-2">\s*\{abastecimentosPendentes\.map/,
  '<div className="space-y-2 max-h-60 overflow-y-auto pr-1">\n                  {abastecimentosPendentes.map'
);

code = code.replace(
  /<div className="space-y-2">\s*\{coletesEmUso\.map/,
  '<div className="space-y-2 max-h-60 overflow-y-auto pr-1">\n                  {coletesEmUso.map'
);

fs.writeFileSync(path, code);
