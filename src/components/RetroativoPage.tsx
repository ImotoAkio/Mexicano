import React, { useState, useEffect } from 'react';
import { Funcionario } from '../types';
import { funcionarioDB } from '../db';
import { Shield, Printer, Calendar, Wand2 } from 'lucide-react';

const EPI_POOL = [
  { descricao: 'Camisa UV', ca: '10001' },
  { descricao: 'Luva de Proteção', ca: '10002' },
  { descricao: 'Óculos de Segurança', ca: '10003' },
  { descricao: 'Protetor Solar', ca: 'Isento' },
  { descricao: 'Chapéu Safari', ca: 'Isento' },
  { descricao: 'Bota de Borracha', ca: '10004' },
  { descricao: 'Protetor Auricular', ca: '10005' },
  { descricao: 'Calça de Brim', ca: 'Isento' },
  { descricao: 'Capa de Chuva', ca: '10006' },
  { descricao: 'Mascara PFF2', ca: '10007' }
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function RetroativoPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selectedFuncId, setSelectedFuncId] = useState<string>('');
  const [startMonth, setStartMonth] = useState<string>('');
  const [generatedMonths, setGeneratedMonths] = useState<any[]>([]);

  // Dados fixos da empresa
  const EMPRESA = "C L S DE CASTRO MARINA CLUB VELHO CHICO";
  const CNPJ = "65.614.161/0001-10";

  useEffect(() => {
    const list = funcionarioDB.getAll();
    setFuncionarios(list);
  }, []);

  const handleGenerateBatch = () => {
    if (!selectedFuncId || !startMonth) {
      alert("Selecione o funcionário e o mês/ano de início.");
      return;
    }

    const [startYearStr, startMonthStr] = startMonth.split('-');
    const startY = parseInt(startYearStr, 10);
    const startM = parseInt(startMonthStr, 10) - 1; // 0-indexed

    const now = new Date();
    const currentY = now.getFullYear();
    const currentM = now.getMonth();

    if (startY > currentY || (startY === currentY && startM > currentM)) {
      alert("O mês de início não pode ser no futuro.");
      return;
    }

    const batches = [];
    let y = startY;
    let m = startM;

    while (y < currentY || (y === currentY && m <= currentM)) {
      // Sorteia o dia entre 2 e 5
      const randomDay = Math.floor(Math.random() * 4) + 2;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(randomDay).padStart(2, '0')}`;
      
      // Sorteia de 6 a 9 EPIs (para preencher mais a ficha)
      const itemsCount = Math.floor(Math.random() * 4) + 6;
      const shuffledPool = [...EPI_POOL].sort(() => 0.5 - Math.random());
      const selectedEpis = shuffledPool.slice(0, itemsCount).map((epi, i) => ({
        id: `sim_${y}_${m}_${i}`,
        descricao: epi.descricao,
        ca: epi.ca,
        quantidade: '1',
        dataEntrega: dateStr,
        dataDevolucao: '',
        status: 'em_uso'
      }));

      batches.push({
        id: `${y}_${m}`,
        month: m,
        year: y,
        day: randomDay,
        dateStr,
        epis: selectedEpis
      });

      // Avança 2 meses para diminuir o número de impressões
      m += 2;
      if (m > 11) {
        m = m - 12;
        y++;
      }
    }

    setGeneratedMonths(batches);
  };

  const selectedFunc = funcionarios.find(f => f.id === selectedFuncId);

  const handlePrint = async () => {
    if (!selectedFunc || generatedMonths.length === 0) {
      alert("Gere os meses primeiro.");
      return;
    }

    const element = document.getElementById('print-area');
    if (!element) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups neste site para imprimir.');
      return;
    }
    
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');
      
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fichas Retroativas de EPI</title>
          ${styles}
          <style>
            body { background: white; margin: 0; padding: 0; }
            #print-area { 
              position: static !important; 
              width: 100% !important; 
              z-index: 1 !important; 
              display: block !important; 
            }
            @media print {
              @page { size: A4 portrait; margin: 5mm; }
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
          <script>
            let printed = false;
            const doPrint = () => {
              if (printed) return;
              printed = true;
              window.print();
              window.close();
            };
            window.onload = () => {
              setTimeout(doPrint, 500);
            };
            setTimeout(doPrint, 1500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
      <div className="bg-yellow-100 border-b border-yellow-300 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-2xl font-bold text-yellow-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-yellow-600" />
            Simulador de EPI Retroativo
          </h1>
          <p className="text-sm text-yellow-700 mt-1">Gere múltiplas fichas de meses passados automaticamente. Os dados não são salvos no banco.</p>
        </div>
        <button 
          onClick={handlePrint}
          disabled={!selectedFunc || generatedMonths.length === 0}
          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          <Printer className="w-5 h-5" />
          Imprimir Fichas Geradas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 z-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Selecionar Funcionário</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-yellow-500 outline-none"
                value={selectedFuncId}
                onChange={(e) => setSelectedFuncId(e.target.value)}
              >
                <option value="">Selecione um funcionário...</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>{f.nome} - {f.cargo}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Mês/Ano de Início</label>
              <input 
                type="month"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-yellow-500 outline-none"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
              />
            </div>
            <button 
              onClick={handleGenerateBatch}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-medium transition-all h-full"
            >
              <Wand2 className="w-5 h-5" />
              Gerar Lote
            </button>
          </div>

          {selectedFuncId && generatedMonths.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-yellow-500" />
                  Fichas Geradas ({generatedMonths.length} meses)
                </h2>
              </div>

              <div className="space-y-4">
                {generatedMonths.map((batch) => (
                  <div key={batch.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                      <span className="font-bold text-slate-700">{MONTH_NAMES[batch.month]} de {batch.year}</span>
                      <span className="text-sm font-medium text-slate-500">
                        Data de entrega: {String(batch.day).padStart(2, '0')}/{String(batch.month + 1).padStart(2, '0')}/{batch.year}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      {batch.epis.map((epi: any) => (
                        <div key={epi.id} className="flex justify-between items-center text-sm text-slate-600 bg-white border border-slate-100 p-2 rounded-lg">
                          <span className="font-medium text-slate-700">{epi.descricao} <span className="text-slate-400 font-normal">(CA: {epi.ca})</span></span>
                          <span className="text-xs">Qtd: 1</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-0 overflow-hidden z-[-1]">
        <div id="print-area">
          {generatedMonths.map((batch, index) => (
            <div key={batch.id} className="bg-white p-6 max-w-[210mm] mx-auto text-slate-900 font-sans print:w-full print:p-0 print:m-0" style={{ pageBreakAfter: index === generatedMonths.length - 1 ? 'auto' : 'always' }}>
              <div className="text-center border-2 border-emerald-700 mb-4 rounded-sm">
                <div className="bg-emerald-700 text-white font-bold py-1.5 px-4 text-[13px] uppercase tracking-wider">
                  Ficha de Controle de Fornecimento de EPI - EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL
                </div>
              </div>

              <div className="border-2 border-emerald-700 rounded-sm mb-4">
                <div className="grid grid-cols-12 border-b border-emerald-700">
                  <div className="col-span-8 p-1.5 border-r border-emerald-700 flex items-center bg-emerald-50/30">
                    <span className="font-bold mr-2 text-xs uppercase text-emerald-900">Empresa:</span>
                    <span className="text-xs uppercase font-medium">{EMPRESA}</span>
                  </div>
                  <div className="col-span-4 p-1.5 flex items-center bg-emerald-50/30">
                    <span className="font-bold mr-2 text-xs uppercase text-emerald-900">CNPJ:</span>
                    <span className="text-xs font-medium">{CNPJ}</span>
                  </div>
                </div>
                <div className="grid grid-cols-12 border-b border-emerald-700">
                  <div className="col-span-8 p-1.5 border-r border-emerald-700 flex items-center">
                    <span className="font-bold mr-2 text-xs uppercase text-emerald-900">Colaborador:</span>
                    <span className="text-xs uppercase font-medium">{selectedFunc?.nome || ''}</span>
                  </div>
                  <div className="col-span-4 p-1.5 flex items-center">
                    <span className="font-bold mr-2 text-xs uppercase text-emerald-900">CPF:</span>
                    <span className="text-xs font-medium">{selectedFunc?.cpf || ''}</span>
                  </div>
                </div>
                <div className="grid grid-cols-12">
                  <div className="col-span-8 p-1.5 border-r border-emerald-700 flex items-center bg-emerald-50/30">
                    <span className="font-bold mr-2 text-xs uppercase text-emerald-900">Cargo:</span>
                    <span className="text-xs uppercase font-medium">{selectedFunc?.cargo || ''}</span>
                  </div>
                  <div className="col-span-4 p-1.5 flex items-center bg-emerald-50/30">
                    <span className="font-bold mr-2 text-xs uppercase text-emerald-900">Admissão:</span>
                    <span className="text-xs font-medium">{selectedFunc?.admissao ? selectedFunc.admissao.split('-').reverse().join('/') : ''}</span>
                  </div>
                </div>
              </div>

              <table className="w-full border-2 border-emerald-700 mb-4 text-sm rounded-sm">
                <thead>
                  <tr className="bg-emerald-700 text-white">
                    <th className="border border-emerald-700 p-1 text-center w-12 text-[10px] uppercase leading-tight">Qtd</th>
                    <th className="border border-emerald-700 p-1 text-center text-[10px] uppercase leading-tight">Descrição do Equipamento de Proteção Individual (EPI)</th>
                    <th className="border border-emerald-700 p-1 text-center w-16 text-[10px] uppercase leading-tight">C.A.</th>
                    <th className="border border-emerald-700 p-1 text-center w-16 text-[10px] uppercase leading-tight">Entrega</th>
                    <th className="border border-emerald-700 p-1 text-center w-16 text-[10px] uppercase leading-tight">Devol.</th>
                    <th className="border border-emerald-700 p-1 text-center w-24 text-[10px] uppercase leading-tight">Assinatura</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(7, batch.epis.length) }).map((_, i) => {
                    const item = batch.epis[i];
                    return (
                      <tr key={item ? item.id : `empty-${i}`} className="even:bg-emerald-50/20">
                        <td className="border border-emerald-700 p-1 text-center text-[11px] h-7 text-emerald-900 font-medium">{item?.quantidade || ''}</td>
                        <td className="border border-emerald-700 p-1 text-[11px] h-7 text-emerald-900">{item?.descricao || ''}</td>
                        <td className="border border-emerald-700 p-1 text-center text-[11px] h-7 text-emerald-900">{item?.ca || ''}</td>
                        <td className="border border-emerald-700 p-1 text-center text-[11px] h-7 text-emerald-900">{item?.dataEntrega ? item.dataEntrega.split('-').reverse().join('/') : ''}</td>
                        <td className="border border-emerald-700 p-1 text-center text-[11px] h-7 text-emerald-900">{item?.dataDevolucao ? item.dataDevolucao.split('-').reverse().join('/') : ''}</td>
                        <td className="border border-emerald-700 p-1 text-center h-7"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="text-[9px] leading-tight text-justify space-y-1 mb-6 mt-2">
                <h3 className="font-bold text-center text-[11px] mb-2">Declaro estar de posse e ter recebido treinamento quanto ao uso dos EPIs listados como "Em Uso".</h3>
                <p className="font-bold uppercase mb-2 text-[8px]">DECLARO PARA TODOS EFEITOS LEGAIS QUE ESTOU EM POSSE E/OU RECEBI OS EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL CONSTANTES NA LISTA ACIMA COMO "EM USO", EM PERFEITAS CONDIÇÕES DE USO, E QUE ESTOU CIENTE DAS OBRIGAÇÕES DESCRITAS NA NR 06, BAIXADA PELA PORTARIA MTB 3214/78, SUB-ITEM 6.7, A SABER:</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-bold mb-1">NR 06: 6.6 Responsabilidades do trabalhador.</p>
                    <p>a) usar o fornecido pela organização, observado o disposto no item 6.5.2;</p>
                    <p>b) utilizar apenas para a finalidade a que se destina;</p>
                    <p>c) responsabilizar-se pela limpeza, guarda e conservação;</p>
                    <p>d) comunicar à organização quando extraviado, danificado ou qualquer alteração que o torne impróprio para uso; e</p>
                    <p>e) cumprir as determinações da organização sobre o uso adequado.</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-[8px] mb-2">DECLARO AINDA QUE ESTOU CIENTE DAS DISPOSIÇÕES DO ARTIGO 158, ALÍNEA 'A', DA CLT, E DO ITEM 1.8 DA NR 01, EM ESPECIAL DAQUELA DO SUBITEM 1.8.1.</p>
                    <p className="font-bold mb-1">NR 01: 1.4.2 Cabe ao trabalhador:</p>
                    <p>a) cumprir as disposições legais e regulamentares sobre segurança e saúde no trabalho;</p>
                    <p>b) submeter-se aos exames médicos previstos nas NR;</p>
                    <p>c) colaborar com a organização na aplicação das NR; e usar o EPI fornecido.</p>
                    <p>1.4.2.1 Constitui ato faltoso a recusa injustificada do empregado.</p>
                  </div>
                </div>

                <p className="mt-2 font-medium">Declaro, também, que estou ciente das disposições do Art. 462 e § 1º da CLT, e autorizo o desconto salarial proporcional aos custos de reparação do dano que os EPI's aos meus cuidados venham apresentar. (CLT, Art. 462 e § 1º - em caso de dano causado pelo empregado, o desconto será lícito).</p>
              </div>

              <div className="mt-12 pt-6">
                <div className="flex justify-between items-end px-8">
                  <div className="w-[40%] text-center border-t border-emerald-700 pt-1">
                    <span className="font-bold uppercase text-[10px] text-emerald-900">(Assinatura do colaborador)</span>
                  </div>
                  
                  <div className="w-[40%] text-center border-t border-emerald-700 pt-1">
                    <span className="font-bold uppercase text-[10px] text-emerald-900">(Assinatura do responsável)</span>
                  </div>
                </div>
                <div className="text-center mt-8 text-emerald-900">
                   <span className="text-[11px] font-medium border-b border-emerald-900 inline-block px-10 pb-0.5">
                     ___________________, {String(batch.day).padStart(2, '0')} de {MONTH_NAMES[batch.month]} de {batch.year}
                   </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
