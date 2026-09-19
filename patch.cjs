const fs = require('fs');
const filepath = 'src/components/WhatsAppPage.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Add handleDownloadExtrato function
const targetStr = "  const handleToggleSelectClient = (id: string) => {";
const downloadFunc = `  const handleDownloadExtrato = async (clientId: string, clientName: string) => {
    try {
      const captureEl = document.getElementById(\`extrato-invoice-capture-\${clientId}\`) || document.getElementById(\`bloqueio-invoice-capture-\${clientId}\`);
      if (captureEl) {
        console.log("Gerando imagem do extrato para download...");
        // Pequeno atraso para garantir fontes renderizadas
        await new Promise(r => setTimeout(r, 200));

        let base64Image = null;
        try {
          // @ts-ignore
          base64Image = await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 2, skipFonts: true, cacheBust: true });
        } catch(e) {
          await new Promise(r => setTimeout(r, 600));
          // @ts-ignore
          base64Image = await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 1.5, skipFonts: true, cacheBust: true });
        }

        if (base64Image) {
          const a = document.createElement('a');
          a.href = base64Image;
          a.download = \`Extrato_Debitos_\${clientName.replace(/\\s+/g, '_')}.png\`;
          a.click();
        }
      } else {
        alert("Erro: Não foi possível localizar o modelo de extrato na página. (ID: " + clientId + ")");
      }
    } catch (err) {
      console.error(err);
      alert("Falha ao gerar o extrato: " + err.message);
    }
  };

`;

if (content.indexOf(downloadFunc) === -1) {
  content = content.replace(targetStr, downloadFunc + targetStr);
}

// 2. Extratos tab insertion
content = content.replace(
  /useState\<'confirmations' \| 'bloqueio' \| 'calendars' \| 'custom' \| 'config'\>/,
  "useState<'confirmations' | 'bloqueio' | 'calendars' | 'custom' | 'extratos' | 'config'>"
);

const configTabBtn = `<button
          onClick={() => setActiveMainTab('config')}
          className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all \${
            activeMainTab === 'config' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }\`}
        >
          <Smartphone className="w-4 h-4" /> Config
        </button>`;

const extratosTabBtn = `<button
          onClick={() => setActiveMainTab('extratos')}
          className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all \${
            activeMainTab === 'extratos' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }\`}
        >
          <FileText className="w-4 h-4" /> Extratos
        </button>
        <button
          onClick={() => setActiveMainTab('config')}
          className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all \${
            activeMainTab === 'config' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }\`}
        >
          <Smartphone className="w-4 h-4" /> Config
        </button>`;

if (content.indexOf("setActiveMainTab('extratos')") === -1) {
  content = content.replace(configTabBtn, extratosTabBtn);
}

const stateHooks = `  // Custom MSG Status
  const [customSendingStatus, setCustomSendingStatus] = useState<'idle'|'sending'|'success'|'error'>('idle');`;

const extratosHooks = `  // Extratos Status
  const [extratoSearchQuery, setExtratoSearchQuery] = useState('');

  // Custom MSG Status
  const [customSendingStatus, setCustomSendingStatus] = useState<'idle'|'sending'|'success'|'error'>('idle');`;

if (content.indexOf("extratoSearchQuery") === -1) {
  content = content.replace(stateHooks, extratosHooks);
}

const configTabBlock = `{activeMainTab === 'config' && (`;

const extratosBlock = `{activeMainTab === 'extratos' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Extratos Financeiros</h2>
                <p className="text-sm text-slate-500">Busque um cliente para visualizar ou baixar o extrato de débitos em aberto.</p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={extratoSearchQuery}
                  onChange={(e) => setExtratoSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4 font-bold text-xs text-slate-500 uppercase">Cliente</th>
                      <th className="py-3 px-4 font-bold text-xs text-slate-500 uppercase text-center">Contato</th>
                      <th className="py-3 px-4 font-bold text-xs text-slate-500 uppercase text-right">Pendências</th>
                      <th className="py-3 px-4 font-bold text-xs text-slate-500 uppercase text-right">Valor Aberto</th>
                      <th className="py-3 px-4 font-bold text-xs text-slate-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientDB.getAll()
                      .filter(c =>
                        (c.nome.toLowerCase().includes(extratoSearchQuery.toLowerCase()) ||
                        (c.telefone && c.telefone.includes(extratoSearchQuery))) &&
                        (!extratoSearchQuery ? transacoes.some(t => t.clienteId === c.id && t.status !== 'pago' && t.status !== 'cancelado') : true)
                      )
                      .slice(0, extratoSearchQuery ? 50 : 20)
                      .map(client => {
                        const unpaid = transacoes.filter(t => t.clienteId === client.id && t.status !== 'pago' && t.status !== 'cancelado');
                        const totalDebt = unpaid.reduce((acc, t) => acc + (t.valorFinal || t.valorOriginal), 0);
                        const hasPhone = !!client.telefone;

                        return (
                          <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-sm text-slate-900">{client.nome}</div>
                              <div className="text-xs text-slate-500">{client.email || 'Sem e-mail'}</div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {hasPhone ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                  {client.telefone}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Sem TV/Wpp</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {unpaid.length > 0 ? (
                                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold font-mono">
                                  {unpaid.length}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={\`font-mono text-sm font-bold \${totalDebt > 0 ? 'text-rose-600' : 'text-slate-500'}\`}>
                                R$ {totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {totalDebt > 0 ? (
                                <div className="flex justify-end items-center gap-2">
                                  <button
                                    onClick={() => handleDownloadExtrato(client.id, client.nome)}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                                    title="Baixar imagem PNG"
                                  >
                                    <Download className="w-3.5 h-3.5" /> Baixar PNG
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs font-semibold text-emerald-500 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-md">
                                  Tudo Certo
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                    })}
                    {clientDB.getAll().length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                          Nenhum cliente encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        ${configTabBlock}`;

if (content.indexOf("Extratos Financeiros") === -1) {
  content = content.replace(configTabBlock, extratosBlock);
}

// 3. Insert the hidden rendering block for ALL clients that have unpaid statements
const oldHiddenBlockList = `<div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none aria-hidden">
          {bloqueioReservations.map(res => {`;

const newHiddenBlockList = `<div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none aria-hidden">
        {/* Extratos para visualizacao geral/manual */}
        {clientDB.getAll().map(client => {
          const clientUnpaid = transacoes.filter(t => t.clienteId === client.id && t.status !== 'pago' && t.status !== 'cancelado');
          if (clientUnpaid.length === 0) return null;

          const totalGeral = clientUnpaid.reduce((acc, t) => {
            let total = t.valorOriginal || 0;
            if (t.desconto) total -= t.desconto;
            if (t.taxaMulta) total += t.taxaMulta;
            if (t.taxaJuros) total += t.taxaJuros;
            return acc + total;
          }, 0);

          return (
            <div
              key={\`extrato-invoice-\${client.id}\`}
              id={\`extrato-invoice-capture-\${client.id}\`}
              className="bg-white p-10 w-[800px] text-slate-800 font-sans shadow-none rounded-none border-none"
            >
              <div className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-6">
                <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
                <div className="text-right">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">Extrato de Débitos em Aberto</h1>
                  <p className="text-slate-500 mt-1 font-semibold text-sm">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h2 className="text-2xl font-black text-slate-900">{client.nome}</h2>
                <p className="text-slate-600 text-sm mt-1 font-medium">Telefone: {client.telefone || 'Não informado'}</p>
                {client.email && <p className="text-slate-600 text-sm mt-0.5 font-medium">E-mail: {client.email}</p>}
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wider">
                  ⚠️ Status de Cobrança: INADIMPLENTE
                </div>
              </div>

              {clientUnpaid.length > 0 ? (
                <table className="w-full text-left mb-8 border-collapse">
                  <thead className="bg-slate-100 border-y-2 border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-bold text-xs text-slate-700 uppercase tracking-wider">Categoria / Descrição</th>
                      <th className="py-3 px-4 font-bold text-xs text-slate-700 uppercase tracking-wider">Vencimento</th>
                      <th className="py-3 px-4 font-bold text-xs text-slate-700 uppercase tracking-wider text-right">Valor Orig.</th>
                      <th className="py-3 px-4 font-bold text-xs text-slate-700 uppercase tracking-wider text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 border-b-2 border-slate-800">
                    {clientUnpaid.map(t => {
                      let total = t.valorOriginal || 0;
                      if (t.desconto) total -= t.desconto;
                      if (t.taxaMulta) total += t.taxaMulta;
                      if (t.taxaJuros) total += t.taxaJuros;

                      const dueDateObj = new Date(t.dataVencimento);
                      let isLate = false;
                      if (!isNaN(dueDateObj.getTime())) {
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        if (dueDateObj < today) {
                          isLate = true;
                        }
                      }

                      const jurosMulta = (t.taxaMulta || 0) + (t.taxaJuros || 0);

                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-bold text-slate-800 uppercase text-xs">{t.categoria || 'Sem categoria'}</div>
                            <div className="text-xs text-slate-500 mt-1">{t.descricao || 'Lancto Financeiro'}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={\`font-mono text-sm font-semibold \${isLate ? 'text-rose-600' : 'text-slate-600'}\`}>
                              {t.dataVencimento.split('-').reverse().join('/')}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-slate-500">
                            R$ {(t.valorOriginal || 0).toFixed(2)}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-slate-800 text-sm">
                            R$ {total.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : null}

              <div className="border-t-2 border-slate-900 pt-6 flex justify-between items-center">
                <div className="text-xs text-slate-400 font-medium">
                  Mexicano Gestão Náutica • Central de Atendimento
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Geral Pendente</p>
                  <p className="text-4xl font-black text-rose-600 tracking-tight font-mono">
                    R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {/* Fim dos extratos gerais */}
        {bloqueioReservations.map(res => {`;

if (content.indexOf("extrato-invoice-capture-") === -1) {
  content = content.replace(oldHiddenBlockList, newHiddenBlockList);
}

fs.writeFileSync(filepath, content);
console.log("Done");
