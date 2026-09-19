const fs = require('fs');
const path = require('path');

const modalPath = path.join(__dirname, 'src/components/finance/TransactionDetailsModal.tsx');
let modalCode = fs.readFileSync(modalPath, 'utf8');

if (!modalCode.includes('onTransferToAdmin')) {
  // Add prop
  modalCode = modalCode.replace(
    'onGenerateAsaas?: (billingType: \'PIX\' | \'BOLETO\' | \'CREDIT_CARD\') => Promise<void>;',
    "onGenerateAsaas?: (billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD') => Promise<void>;\n  onTransferToAdmin?: () => void;"
  );

  modalCode = modalCode.replace(
    'onGenerateAsaas\n}: TransactionDetailsModalProps)',
    "onGenerateAsaas,\n  onTransferToAdmin\n}: TransactionDetailsModalProps)"
  );

  // Add button to Footer Actions
  const btnHTML = `
              {isUnpaid && transacao.categoria === 'Combustível' && transacao.tipo === 'receita' && transacao.metodoPagamento !== 'admin' && onTransferToAdmin && (
                <button 
                  onClick={() => { if (confirm("Transferir cobrança para a Administradora (Recalcula para R$ 13/L)?")) { onTransferToAdmin(); onClose(); } }}
                  className="flex-1 w-full mt-1 mb-1 min-w-[120px] px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <Building2 className="w-3 h-3" /> Faturar p/ Administradora
                </button>
              )}
`;

  if (!modalCode.includes('Faturar p/ Administradora')) {
    modalCode = modalCode.replace(
      '<div className="flex flex-wrap gap-2">',
      '<div className="flex flex-wrap gap-2">\n' + btnHTML
    );
    // Add Building2 import
    if (!modalCode.includes('Building2')) {
      modalCode = modalCode.replace('ExternalLink', 'ExternalLink, Building2');
    }
  }
  fs.writeFileSync(modalPath, modalCode, 'utf8');
  console.log("TransactionDetailsModal.tsx updated.");
}

const fluxoPath = path.join(__dirname, 'src/components/finance/FinanceFluxoCaixa.tsx');
let fluxoCode = fs.readFileSync(fluxoPath, 'utf8');

if (!fluxoCode.includes('handleTransferToAdmin')) {
  // inject handler function before return
  const handler = `
  const handleTransferToAdmin = async (t: TransacaoFinanceira) => {
    // extract liters
    const match = t.descricao?.match(/(\d+(?:\.\d+)?)\s*L/i);
    const litrosNum = match ? parseFloat(match[1]) : 0;
    
    if (litrosNum <= 0) {
      alert('Não foi possível identificar os litros no abastecimento para recálculo.');
      return;
    }

    const priceAdmin = 13.0; // CONSTANT FROM getFuelPrice('admin')
    const novoValor = litrosNum * priceAdmin;
    const novaDescricao = \`Abastecimento Marina (Faturado / Administradora): \${litrosNum}L a R$\${priceAdmin.toFixed(2)}/L\`;
    const newTx = {
      ...t,
      valor: novoValor,
      metodoPagamento: 'admin',
      descricao: novaDescricao
    };

    try {
      if (t.reservaId) {
        // Find existing record and update
        const stored = await clientDB.getAll('combustivel_transacoes');
        const existingTrans = stored.find((x:any) => x.id === t.id);
        if (existingTrans) {
           existingTrans.valor = novoValor;
           existingTrans.metodoPagamento = 'admin';
           existingTrans.descricao = novaDescricao;
           await clientDB.update('combustivel_transacoes', existingTrans);
        } else {
           await clientDB.update('transacoes', newTx);
        }
      } else {
        await clientDB.update('transacoes', newTx);
      }
      loadTransacoes();
    } catch (e) {
      console.error(e);
      alert('Erro ao transferir para a administradora.');
    }
  };
`;
  
  fluxoCode = fluxoCode.replace('return (', handler + '\n  return (');
  
  // Add prop to Modal
  fluxoCode = fluxoCode.replace(
    'onGenerateAsaas={handleGenerateAsaas}',
    'onGenerateAsaas={handleGenerateAsaas}\n          onTransferToAdmin={() => handleTransferToAdmin(viewingTransaction)}'
  );

  fs.writeFileSync(fluxoPath, fluxoCode, 'utf8');
  console.log("FinanceFluxoCaixa.tsx updated.");
}
