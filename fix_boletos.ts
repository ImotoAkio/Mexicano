import fs from 'fs';

const p = 'src/components/finance/BoletosPage.tsx';
let code = fs.readFileSync(p, 'utf8');

if (!code.includes('generateCobrancasReportPDF')) {
  // Add import
  code = code.replace(
    "import { clientDB } from '../../db';",
    "import { clientDB } from '../../db';\nimport { generateCobrancasReportPDF } from '../../utils/pdfGenerator';"
  );

  // Add the button next to "Gerar Cobranças e Notificar"
  const oldBtnHtml = `           <button
             onClick={handleProcessBulk}
             disabled={selectedClientIds.size === 0 || isProcessing}`;
             
  const newBtnHtml = `           <button
             onClick={() => generateCobrancasReportPDF(activeClients.filter(g => selectedClientIds.size === 0 || selectedClientIds.has(g.cliente.id)))}
             className="px-6 py-2.5 bg-white border border-black/[0.08] hover:bg-[#f5f5f7] text-[#1d1d1f] flex items-center gap-2 rounded-full font-semibold text-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98]"
           >
             <FileText className="w-5 h-5" />
             Relatório
           </button>
           <button
             onClick={handleProcessBulk}
             disabled={selectedClientIds.size === 0 || isProcessing}`;
             
  code = code.replace(oldBtnHtml, newBtnHtml);
  fs.writeFileSync(p, code);
  console.log('Added button to BoletosPage');
} else {
  console.log('Button probably already exists or import missing');
}
