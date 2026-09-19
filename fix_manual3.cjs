const fs = require('fs');
const filepath = 'src/components/WhatsAppPage.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const downloadFunc = `  const handleDownloadExtrato = async (clientId: string, clientName: string) => {
    try {
      const captureEl = document.getElementById(\`bloqueio-invoice-capture-\${clientId}\`);
      if (captureEl) {
        // Mostra toast indicando inicio
        console.log("Gerando imagem do extrato para download...");
        await new Promise(r => setTimeout(r, 100)); // aguarda render extra
        
        let base64Image = null;
        try {
          base64Image = await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 2, skipFonts: true, cacheBust: true });
        } catch(e) {
          await new Promise(r => setTimeout(r, 500));
          base64Image = await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 1.5, skipFonts: true, cacheBust: true });
        }

        if (base64Image) {
          const a = document.createElement('a');
          a.href = base64Image;
          a.download = \`Extrato_Debitos_\${clientName.replace(/\s+/g, '_')}.png\`;
          a.click();
        }
      } else {
        alert("Erro: Não foi possível localizar o modelo de extrato na página.");
      }
    } catch (err) {
      console.error(err);
      alert("Falha ao gerar o extrato.");
    }
  };

`;

const funcInsertPos = content.indexOf('const handlePreviewMensagem =');
if(funcInsertPos !== -1) {
  content = content.slice(0, funcInsertPos) + downloadFunc + content.slice(funcInsertPos);
}

// Add the button to the row
const rowTarget = `<div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {res.dataFormatada}
                            </span>`;
const rowReplace = `<div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium w-full">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {res.dataFormatada}
                            </span>`;

content = content.replace(rowTarget, rowReplace);

// Now for the explicit button
const beforeStatus = `{status === 'success' && <span className="text-emerald-500 text-xs font-bold flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-md border border-emerald-100"><CheckCircle2 className="w-3.5 h-3.5" /> Enviado</span>}
                        </div>
                      </div>`;
                      
const afterStatus = `{status === 'success' && <span className="text-emerald-500 text-xs font-bold flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-md border border-emerald-100"><CheckCircle2 className="w-3.5 h-3.5" /> Enviado</span>}
                          
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDownloadExtrato(res.clienteId, client?.nome || 'Cliente'); }}
                            className="ml-auto text-[11px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> Baixar Extrato
                          </button>
                        </div>
                      </div>`;
                      
content = content.replace(beforeStatus, afterStatus);

fs.writeFileSync(filepath, content);
