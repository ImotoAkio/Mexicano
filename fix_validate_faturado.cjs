const fs = require('fs');
const file = 'src/components/MarinaCaixaView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `if (!modalDescricao.trim()) {
      alert('Por favor, preencha a descrição do lançamento.');
      return;
    }`;

const replacementStr = `if (!modalDescricao.trim()) {
      alert('Por favor, preencha a descrição do lançamento.');
      return;
    }
    if (modalFormaPagto === 'faturado' && !modalClienteId) {
      alert('Para lançamentos "Faturados (Pendurar)" é obrigatório selecionar um cliente.');
      return;
    }`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync(file, code);
