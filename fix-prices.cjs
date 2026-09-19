const fs = require('fs');
const file = 'src/components/MarinaDashboard.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace('R$ 9,00/L (Caixa Físico)', 'R$ {getFuelPrice(\'dinheiro\').toFixed(2).replace(\'.\', \',\')}/L (Caixa Físico)');
txt = txt.replace('R$ 9,00/L (Conta Bancária)', 'R$ {getFuelPrice(\'pix\').toFixed(2).replace(\'.\', \',\')}/L (Conta Bancária)');
txt = txt.replace('R$ 10,00/L (Maquininha)', 'R$ {getFuelPrice(\'cartao_credito\').toFixed(2).replace(\'.\', \',\')}/L (Maquininha)');
txt = txt.replace('R$ 9,00/L (Maquininha)', 'R$ {getFuelPrice(\'cartao_debito\').toFixed(2).replace(\'.\', \',\')}/L (Maquininha)');

fs.writeFileSync(file, txt);
