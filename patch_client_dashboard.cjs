const fs = require('fs');
const filepath = 'src/components/ClientDashboardPage.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const anchorStart = "{/* Lista de Transações */}";
const startIdx = content.indexOf(anchorStart);
if (startIdx === -1) {
  console.log("Not found start");
  process.exit(1);
}

// Search for the end of the IIFE
// The IIFE ends with `          })()` followed by `}` inside a div
const endMarker = "          })()}\r\n        </div>";
let endIdx = content.indexOf(endMarker, startIdx);
let lengthToEnd = endMarker.length - 14; 
if (endIdx === -1) {
    const endMarkerLF = "          })()}\n        </div>";
    endIdx = content.indexOf(endMarkerLF, startIdx);
    lengthToEnd = endMarkerLF.length - 14;
}

if (endIdx === -1) {
  console.log("Not found end");
  process.exit(1);
}

const before = content.substring(0, startIdx + anchorStart.length);
const after = content.substring(endIdx + lengthToEnd); // keep the ` </div>`

const newBlock = `
        <div className="space-y-4">
          {(() => {
            const filteredTransacoes = transacoes.filter(t => {
              if (financeTab === 'fatura') {
                return t.status !== 'pago' && t.status !== 'cancelado';
              }
              return t.status === 'pago';
            });

            if (filteredTransacoes.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/[0.02] border border-white/5 border-dashed rounded-3xl">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-5 h-5 text-white/20" />
                  </div>
                  <p className="text-sm text-white/40 text-center font-medium">Nenhuma movimentação por aqui.</p>
                  <p className="text-xs text-white/30 text-center mt-1">Você está com tudo em dia.</p>
                </div>
              );
            }

            const sortedTransacoes = [...filteredTransacoes].sort((a, b) => {
              const dateA = a.dataVencimento ? new Date(a.dataVencimento + "T12:00:00").getTime() : 0;
              const dateB = b.dataVencimento ? new Date(b.dataVencimento + "T12:00:00").getTime() : 0;
              return financeTab === 'extrato' ? dateB - dateA : dateA - dateB;
            });

            let currentList = sortedTransacoes;
            let futureList: any[] = [];

            if (financeTab === 'fatura') {
              const thirtyDaysFromNow = new Date();
              thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

              currentList = sortedTransacoes.filter(t => {
                if (!t.dataVencimento) return true;
                const vDate = new Date(t.dataVencimento + "T12:00:00");
                return vDate <= thirtyDaysFromNow || t.status === 'vencido';
              });

              futureList = sortedTransacoes.filter(t => {
                if (!t.dataVencimento) return false;
                const vDate = new Date(t.dataVencimento + "T12:00:00");
                return vDate > thirtyDaysFromNow && t.status !== 'vencido';
              });
            }

            const renderTransaction = (t: any) => (
              <div 
                key={t.id} 
                onClick={() => setSelectedTransactionDetails(t)}
                className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl p-4 transition-all duration-300 overflow-hidden cursor-pointer flex-shrink-0"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    {getTransactionIcon(t.categoria)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="text-sm font-medium text-white truncate pr-2">{t.descricao || t.categoria}</span>
                      <span className="text-sm font-semibold whitespace-nowrap text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[11px] text-white/40">
                        Vencimento: <span className="text-white/60 font-medium">{t.dataVencimento ? t.dataVencimento.split('-').reverse().join('/') : ''}</span>
                      </span>
                      <span className={\`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full \${
                        t.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400' :
                        t.status === 'vencido' ? 'bg-rose-500/10 text-rose-400' :
                        t.status === 'cancelado' ? 'bg-white/10 text-white/50' :
                        'bg-yellow-500/10 text-yellow-400'
                      }\`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );

            return (
              <div className="space-y-3">
                {financeTab === 'fatura' && currentList.length > 1 && currentList.length > 0 && (
                  <button 
                    onClick={handleOpenBulkPixPayment}
                    className="w-full mb-2 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#B69D74]/20 to-[#B69D74]/10 hover:from-[#B69D74]/30 hover:to-[#B69D74]/20 border border-[#B69D74]/20 rounded-2xl text-xs font-bold uppercase tracking-widest text-[#B69D74] transition-all duration-300 shadow-lg"
                  >
                    <QrCode className="w-4 h-4" />
                    Pagar Fatura Atual ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentList.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0))})
                  </button>
                )}

                {currentList.map(renderTransaction)}

                {futureList.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowFutureInvoices(!showFutureInvoices)}
                      className="w-full flex items-center justify-center gap-2 py-2 text-[11px] uppercase tracking-wider font-bold text-white/30 hover:text-white/60 transition-colors mt-2"
                    >
                      {showFutureInvoices ? 'Ocultar Lançamentos Futuros' : \`Ver Lançamentos Futuros (\${futureList.length})\`}
                    </button>
                    {showFutureInvoices && (
                       <div className="space-y-3 mt-3">
                         {futureList.map(renderTransaction)}
                       </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>`;

fs.writeFileSync(filepath, before + newBlock + after);
console.log("Patched successfully");
