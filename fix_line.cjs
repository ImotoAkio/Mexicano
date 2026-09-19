const fs = require('fs');
let code = fs.readFileSync('src/components/MarinaDashboard.tsx', 'utf-8');
code = code.replace(
    "&& !comprovanteUrl)&& !comprovanteUrl) !comprovanteUrl && !selectedReserva?.abastecimentoComprovanteUrl)}",
    "&& (!comprovanteUrl && !selectedReserva?.abastecimentoComprovanteUrl))}"
);
fs.writeFileSync('src/components/MarinaDashboard.tsx', code);
