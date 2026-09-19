const fs = require('fs');
let code = fs.readFileSync('src/components/MarinaCaixaView.tsx', 'utf8');

// The line is `tipo === 'saida' ? 'entrada' : 'entrada'` which is causing overlap error or something like that.
code = code.replace(/t\.tipo === 'saida' \? 'entrada' : 'entrada'/g, "t.tipo === 'saida' ? 'saida' : 'entrada'");
fs.writeFileSync('src/components/MarinaCaixaView.tsx', code);
