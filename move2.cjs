const fs = require('fs');

const p = 'src/components/finance/TransactionDetailsModal.tsx';
let txt = fs.readFileSync(p, 'utf8');

const targetStr = `{isUnpaid && transacao.categoria === 'Combustível' && transacao.tipo === 'receita' && transacao.metodoPagamento !== 'admin' && onTransferToAdmin && (
                <button 
                  onClick={() => { if (confirm("Transferir cobrança para a Administradora (Recalcula para R$ 13/L)?")) { onTransferToAdmin(); onClose(); } }}
                  className="flex-1 w-full mt-1 mb-1 min-w-[120px] px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <Building2 className="w-3 h-3" /> Faturar p/ Administradora
                </button>
              )}`;

txt = txt.replace(targetStr, "");

txt = txt.replace(
  '{isUnpaid && (\n                <button \n                  onClick={() => { onConfirmPayment(); onClose(); }}',
  targetStr + '\n              {isUnpaid && (\n                <button \n                  onClick={() => { onConfirmPayment(); onClose(); }}'
);

fs.writeFileSync(p, txt, 'utf8');
