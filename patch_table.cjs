const fs = require('fs');

let content = fs.readFileSync('src/components/finance/FinanceLancamentos.tsx', 'utf8');

const tableCode = `
            <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
              <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Embarcação</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransacoes.map((t) => {
                  const cliente = clientes.find(c => c.id === t.clienteId);
                  const barco = embarcacoes.find(b => b.id === t.embarcacaoId);
                  
                  let nomesEmbarcacoes = barco ? barco.nome : '';
                  if (!nomesEmbarcacoes && cliente) {
                    const clientBoats: string[] = [];
                    if (cliente.embarcacaoId) {
                      const b = embarcacoes.find(x => x.id === cliente.embarcacaoId);
                      if (b) clientBoats.push(b.nome);
                    }
                    if (cliente.embarcacoes?.length) {
                      cliente.embarcacoes.forEach(cb => {
                        if (cb.embarcacaoId !== cliente.embarcacaoId) {
                          const b = embarcacoes.find(x => x.id === cb.embarcacaoId);
                          if (b) clientBoats.push(b.nome);
                        }
                      });
                    }
                    nomesEmbarcacoes = clientBoats.join(' / ');
                  }

                  const hasComprovante = !!t.comprovante;
                  const isUnpaid = t.status === 'lancado' || t.status === 'vencido';

                  return (
                    <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setViewingTransaction(t)}>
                      <td className="px-6 py-4 whitespace-normal min-w-[200px]">
                        {cliente ? (
                          <span className="font-bold text-slate-700 block leading-tight">{cliente.nome}</span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-normal min-w-[150px]">
                        {nomesEmbarcacoes ? (
                          <span className="font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded-md w-fit inline-block leading-tight">
                            {nomesEmbarcacoes}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{t.categoria}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700 mb-1">
                          {new Date(t.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        {getStatusBadge(t)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-base tracking-tight">
                            <span className="text-xs opacity-50 font-normal mr-1">R$</span>{Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {(() => {
                            const { days, interest, total } = calculateTransactionInterest(t);
                            if (days > 0) {
                              return (
                                <span className="text-[10px] text-rose-600 font-bold mt-0.5">
                                  + {interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({days}d)
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); openModal(t); }}
                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                            title="Visualizar/Editar"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
`;

content = content.replace(
  /<table className="w-full text-left border-collapse">[\s\S]*?<\/table>/,
  tableCode.trim()
);

fs.writeFileSync('src/components/finance/FinanceLancamentos.tsx', content, 'utf8');

