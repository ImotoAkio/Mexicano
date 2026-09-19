const fs = require('fs');
const path = 'src/components/MarinaCaixaView.tsx';
let code = fs.readFileSync(path, 'utf8');

const target = `      setModalClienteTipo('cotista');
      setIsModalOpen(true);
      setModalType('entrada');
      setModalDescricao('Venda de Gelo');
      setModalValor('');
      setModalFormaPagto('pix');
      setModalClienteTipo('avulso');
      setIsModalOpen(true);
      setModalType('entrada');
      setModalDescricao('Venda de Bebidas');
      setModalValor('');
      setModalFormaPagto('pix');
      setModalClienteTipo('avulso');
      setIsModalOpen(true);
    } else if (presetKey === 'taxa_limpeza') {`;

const replacement = `      setModalClienteTipo('cotista');
      setIsModalOpen(true);
    } else if (presetKey === 'taxa_limpeza') {`;

code = code.replace(target, replacement);

fs.writeFileSync(path, code);
