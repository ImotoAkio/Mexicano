const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/finance/FinanceFluxoCaixa.tsx');
let content = fs.readFileSync(file, 'utf8');

// Ensure clientDB import exists
if (!content.includes('import { clientDB }')) {
  content = content.replace(
    "import { generateFinanceReportPDF } from '../../utils/pdfGenerator';",
    "import { generateFinanceReportPDF } from '../../utils/pdfGenerator';\nimport { clientDB } from '../../db';"
  );
}

// Replace table headers
content = content.replace(
  /<th className="px-6 py-4/g,
  '<th className="px-4 py-3'
);
content = content.replace(
  /<td className="px-6 py-4/g,
  '<td className="px-4 py-3'
);

// Add Cliente/Fornec column header
content = content.replace(
  /<th className="px-4 py-3 text-\[12px\] font-semibold text-\[#86868b\] uppercase tracking-\[0.05em\] border-b border-black\/\[0.04\]">Descrição<\/th>/,
  '<th className="px-4 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] border-b border-black/[0.04]">Descrição</th>\n                    <th className="px-4 py-3 text-[12px] font-semibold text-[#86868b] uppercase tracking-[0.05em] border-b border-black/[0.04]">Cliente/Fornec.</th>'
);

// Add Cliente/Fornec column cell
content = content.replace(
  /<td className="px-4 py-3">\s*<div className="text-\[15px\] font-semibold text-\[#1d1d1f\] truncate max-w-\[250px\]">\s*\{t\.descricao\}\s*<\/div>\s*\{t\.empresa && \(\s*<div className="text-\[12px\] text-\[#86868b\] font-medium mt-0\.5 flex items-center gap-1">\s*\{t\.empresa\}.*?\s*<\/div>\s*\)\}\s*<\/td>/s,
  match => {
    return match + `\n                        <td className="px-4 py-3">\n                          <div className="text-[14px] font-medium text-[#1d1d1f] truncate max-w-[150px]">\n                            {t.clienteId ? (clientDB.getById(t.clienteId)?.nome || t.clienteId) : t.fornecedorId || 'Não informado'}\n                          </div>\n                        </td>`;
  }
);

fs.writeFileSync(file, content, 'utf8');
console.log('Success');
