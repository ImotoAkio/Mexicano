const fs = require('fs');

let content = fs.readFileSync('src/components/finance/FinanceFluxoCaixa.tsx', 'utf8');

// Imports
content = content.replace(
  "import FinanceLancamentoDrawer from './FinanceLancamentoDrawer';",
  "import FinanceLancamentoDrawer from './FinanceLancamentoDrawer';\nimport TransactionDetailsModal from './TransactionDetailsModal';"
)

// Add state for viewingTransaction
content = content.replace(
  "const [dataFim, setDataFim] = useState<string>('');",
  "const [dataFim, setDataFim] = useState<string>('');\n  const [viewingTransaction, setViewingTransaction] = useState<TransacaoFinanceira | null>(null);"
)

// Add modal render at the end
content = content.replace(
  `      <FilterDrawer`,
  `      {viewingTransaction && (
        <TransactionDetailsModal
          transacao={viewingTransaction}
          cliente={viewingTransaction.clienteId ? clientDB.getById(viewingTransaction.clienteId) : undefined}
          onClose={() => setViewingTransaction(null)}
          onEdit={() => {
            console.log('Edit', viewingTransaction);
            setViewingTransaction(null);
          }}
          onDelete={() => {
            console.log('Delete', viewingTransaction);
            setViewingTransaction(null);
          }}
          onApprove={() => {
            console.log('Approve', viewingTransaction);
            setViewingTransaction(null);
          }}
          onConfirmPayment={() => {
            handleBaixaManual(viewingTransaction);
            setViewingTransaction(null);
          }}
          onUploadReceipt={() => {
            console.log('Upload receipt', viewingTransaction);
          }}
          isUploading={false}
        />
      )}

      <FilterDrawer`
)

// Add onClick to tr and fixing px sizes
content = content.replace(
  /className="group hover:bg-\[#f5f5f7\]\/50 transition-colors cursor-pointer"/g,
  `className="group hover:bg-[#f5f5f7]/50 transition-colors cursor-pointer" onClick={() => setViewingTransaction(t)}`
)

content = content.replace(/px-4 py-3/g, 'px-3 py-3');

// Keep RowActions stopPropagation
content = content.replace(
  /<RowActions\s/g,
  `<div onClick={(e) => e.stopPropagation()}><RowActions `
)
content = content.replace(
  /onEnviarWhatsApp=\{\(\) => console\.log\('Wpp', t\)\}\s+\/>/g,
  `onEnviarWhatsApp={() => console.log('Wpp', t)} /></div>`
)

fs.writeFileSync('src/components/finance/FinanceFluxoCaixa.tsx', content, 'utf8');
