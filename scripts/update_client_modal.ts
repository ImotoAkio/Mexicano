import * as fs from 'fs';

const file = 'C:/Users/Akio/Documents/mexicano/src/components/ClientModal.tsx';
let txt = fs.readFileSync(file, 'utf8');

// 1. Remove separate states
txt = txt.replace(/const \[tenda, setTenda\] = useState\(false\);\r?\n\s*const \[mesa, setMesa\] = useState\(false\);\r?\n\s*const \[bancosCadeiras, setBancosCadeiras\] = useState\(false\);\r?\n\s*const \[churrasqueira, setChurrasqueira\] = useState\(false\);\r?\n\s*const \[observacoesAcessorios, setObservacoesAcessorios\] = useState\(''\);\r?\n/, '');

// 2. Fix setClientBoats types
txt = txt.replace(/const \[clientBoats, setClientBoats\] = useState<Array<\{ embarcacaoId: string; cota: string \}>>\(\[\{ embarcacaoId: '', cota: '' \}\]\);/, `const [clientBoats, setClientBoats] = useState<Array<{
    embarcacaoId: string;
    cota: string;
    acessorios?: {
      tenda?: boolean;
      mesa?: boolean;
      churrasqueira?: boolean;
      bancosCadeiras?: boolean;
      observacoes?: string;
    };
  }>>([{ embarcacaoId: '', cota: '' }]);`);

// 3. Fix editing initialization
txt = txt.replace(/setClientBoats\(editingClient\.embarcacoes\.map\(eb => \(\{\r?\n\s*embarcacaoId: eb\.embarcacaoId \|\| '',\r?\n\s*cota: eb\.cota \|\| ''\r?\n\s*\}\)\)\);/g, `setClientBoats(editingClient.embarcacoes.map(eb => ({
            embarcacaoId: eb.embarcacaoId || '',
            cota: eb.cota || '',
            acessorios: eb.acessorios || {
              tenda: editingClient.acessorios?.tenda || false,
              mesa: editingClient.acessorios?.mesa || false,
              churrasqueira: editingClient.acessorios?.churrasqueira || false,
              bancosCadeiras: editingClient.acessorios?.bancosCadeiras || false,
              observacoes: editingClient.acessorios?.observacoes || ''
            }
          })));`);

txt = txt.replace(/setClientBoats\(\[\{ embarcacaoId: editingClient\.embarcacaoId \|\| '', cota: editingClient\.cota \|\| '' \}\]\);/g, `setClientBoats([{
            embarcacaoId: editingClient.embarcacaoId || '',
            cota: editingClient.cota || '',
            acessorios: editingClient.acessorios || undefined
          }]);`);

// 4. Fix non-editing init
txt = txt.replace(/setTenda\(editingClient\.acessorios\?\.tenda \|\| false\);\r?\n\s*setMesa\(editingClient\.acessorios\?\.mesa \|\| false\);\r?\n\s*setBancosCadeiras\(editingClient\.acessorios\?\.bancosCadeiras \|\| false\);\r?\n\s*setChurrasqueira\(editingClient\.acessorios\?\.churrasqueira \|\| false\);\r?\n\s*setObservacoesAcessorios\(editingClient\.acessorios\?\.observacoes \|\| ''\);/g, '');
txt = txt.replace(/setTenda\(false\);\r?\n\s*setMesa\(false\);\r?\n\s*setBancosCadeiras\(false\);\r?\n\s*setChurrasqueira\(false\);\r?\n\s*setObservacoesAcessorios\(''\);/g, '');

// 5. Fix handleSave
txt = txt.replace(/const acessorios = hasLancha \? \{\r?\n\s*tenda,\r?\n\s*mesa,\r?\n\s*bancosCadeiras,\r?\n\s*churrasqueira,\r?\n\s*observacoes: observacoesAcessorios\r?\n\s*\} : undefined;/g, '');

txt = txt.replace(/embarcacoes: clientBoats\.map\(cb => \(\{\r?\n\s*embarcacaoId: cb\.embarcacaoId,\r?\n\s*cota: cb\.cota\.toUpperCase\(\)\r?\n\s*\}\)\),/g, `embarcacoes: clientBoats.map(cb => ({
          embarcacaoId: cb.embarcacaoId,
          cota: cb.cota.toUpperCase(),
          acessorios: boats.find(b => b.id === cb.embarcacaoId)?.tipo === 'lancha' ? cb.acessorios : undefined
        })),`);

txt = txt.replace(/acessorios\r?\n\s*\};/g, `// acessorios removed from root payload\r\n      };`);

// 6. UI adjustments
// Replace max-h-56 with max-h-[60vh]
txt = txt.replace(/max-h-56 overflow-y-auto subtle-scrollbar pr-1/g, 'max-h-[60vh] overflow-y-auto subtle-scrollbar pr-2');

// Inside clientBoats map, under the cota div
const cotaReplaceRegex = /<div>\s*<label className="block text-\[10px\] font-semibold text-slate-500 mb-1">Cota #\{idx \+ 1\}<\/label>([\s\S]*?)<\/div>\s*<\/div>/;

const cotaReplaceContent = `<div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Cota #{idx + 1}</label>$1</div>
                      </div>

                      {boats.find(b => b.id === cb.embarcacaoId)?.tipo === 'lancha' && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex-1 w-full">
                          <label className="block text-[10px] font-semibold text-indigo-800 uppercase tracking-wider mb-2 flex items-center">
                            <Package className="w-3 h-3 mr-1 text-indigo-600" /> Acessórios desta Cota
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                            <label className="flex items-center space-x-1.5 text-xs text-indigo-900 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={cb.acessorios?.tenda || false}
                                onChange={(e) => {
                                  const newList = [...clientBoats];
                                  if (!newList[idx].acessorios) newList[idx].acessorios = {};
                                  newList[idx].acessorios!.tenda = e.target.checked;
                                  setClientBoats(newList);
                                }}
                                className="w-3.5 h-3.5 text-indigo-600 bg-white border-indigo-200 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="font-medium text-[10px]">Tenda</span>
                            </label>

                            <label className="flex items-center space-x-1.5 text-xs text-indigo-900 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={cb.acessorios?.mesa || false}
                                onChange={(e) => {
                                  const newList = [...clientBoats];
                                  if (!newList[idx].acessorios) newList[idx].acessorios = {};
                                  newList[idx].acessorios!.mesa = e.target.checked;
                                  setClientBoats(newList);
                                }}
                                className="w-3.5 h-3.5 text-indigo-600 bg-white border-indigo-200 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="font-medium text-[10px]">Mesa</span>
                            </label>

                            <label className="flex items-center space-x-1.5 text-xs text-indigo-900 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={cb.acessorios?.bancosCadeiras || false}
                                onChange={(e) => {
                                  const newList = [...clientBoats];
                                  if (!newList[idx].acessorios) newList[idx].acessorios = {};
                                  newList[idx].acessorios!.bancosCadeiras = e.target.checked;
                                  setClientBoats(newList);
                                }}
                                className="w-3.5 h-3.5 text-indigo-600 bg-white border-indigo-200 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="font-medium text-[10px]">Bancos</span>
                            </label>

                            <label className="flex items-center space-x-1.5 text-xs text-indigo-900 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={cb.acessorios?.churrasqueira || false}
                                onChange={(e) => {
                                  const newList = [...clientBoats];
                                  if (!newList[idx].acessorios) newList[idx].acessorios = {};
                                  newList[idx].acessorios!.churrasqueira = e.target.checked;
                                  setClientBoats(newList);
                                }}
                                className="w-3.5 h-3.5 text-indigo-600 bg-white border-indigo-200 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="font-medium text-[10px]">Churrasq.</span>
                            </label>
                          </div>

                          <textarea
                            value={cb.acessorios?.observacoes || ''}
                            onChange={(e) => {
                                const newList = [...clientBoats];
                                if (!newList[idx].acessorios) newList[idx].acessorios = {};
                                newList[idx].acessorios!.observacoes = e.target.value;
                                setClientBoats(newList);
                            }}
                            placeholder="Obs. dos acessórios"
                            className="w-full h-10 px-2 py-1 text-[10px] border border-indigo-100 rounded bg-white text-indigo-900 placeholder-indigo-300 focus:ring-1 focus:ring-indigo-500 resize-none"
                          />
                        </div>
                      )}`;

txt = txt.replace(cotaReplaceRegex, cotaReplaceContent);
txt = txt.replace(/<div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5">/g, '<div className="flex-1 w-full min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5">');
txt = txt.replace(/<div key=\{idx\} className="flex items-start bg-white border border-slate-200 p-3 rounded-lg relative space-x-2\.5 shadow-xs">/g, '<div key={idx} className="flex flex-col bg-white border border-slate-200 p-3 rounded-lg relative shadow-xs">');

const deleteBtnRegex = /\{clientBoats\.length > 1 && \(\s*<button[\s\S]*?<\/button>\s*\)\}/;
// move delete btn next to Embarcação #
const titleRegex = /<label className="block text-\[10px\] font-semibold text-slate-500 mb-1">Embarcação #\{idx \+ 1\}<\/label>/;
txt = txt.replace(deleteBtnRegex, '');
txt = txt.replace(titleRegex, `<div className="flex items-center justify-between mb-1"><label className="block text-[10px] font-semibold text-slate-500 mb-0">Embarcação #{idx + 1}</label>
                          {clientBoats.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setClientBoats(clientBoats.filter((_, i) => i !== idx));
                              }}
                              className="text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                              title="Remover veículo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          </div>`);

// Remove the standalone Acessórios da Lancha section
txt = txt.replace(/\{\/\* Acessórios da Lancha \*\/\}\s*\{hasLancha && \([\s\S]*?\)\}/, '');

fs.writeFileSync(file, txt);
console.log('Fixed ClientModal.tsx');
