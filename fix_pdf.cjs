const fs = require('fs');

const path = 'src/utils/pdfGenerator.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('generateFinanceReportPDF')) {
  code += `\n
export async function generateFinanceReportPDF(params: {
  empresa: string;
  tab: string;
  dataInicio: string;
  dataFim: string;
  transacoes: any[];
}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Relatório Financeiro', 14, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(\`Empresa: \${params.empresa}\`, 14, 30);
  doc.text(\`Filtro (Aba): \${params.tab}\`, 14, 35);
  
  let pText = 'Todo o período';
  if (params.dataInicio && params.dataFim) {
     pText = \`\${params.dataInicio.split('-').reverse().join('/')} até \${params.dataFim.split('-').reverse().join('/')}\`;
  } else if (params.dataInicio) {
     pText = \`A partir de \${params.dataInicio.split('-').reverse().join('/')}\`;
  } else if (params.dataFim) {
     pText = \`Até \${params.dataFim.split('-').reverse().join('/')}\`;
  }
  doc.text(\`Período: \${pText}\`, 14, 40);

  let totalReceitas = 0;
  let totalDespesas = 0;

  const tableData = params.transacoes.map(t => {
    const val = Number(t.valor) || 0;
    if (t.tipo === 'receita') totalReceitas += val;
    if (t.tipo === 'despesa') totalDespesas += val;

    let dtRef = '';
    if (t.dataVencimento) {
      dtRef = t.dataVencimento.split('-').reverse().join('/');
    }

    return [
      dtRef,
      t.descricao || '-',
      t.categoria || '-',
      t.tipo === 'receita' ? 'Rec' : 'Desp',
      t.status.toUpperCase(),
      \`R$ \${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`
    ];
  });

  const saldo = totalReceitas - totalDespesas;

  doc.setFillColor(245, 245, 247);
  doc.rect(14, 45, 182, 15, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.text(\`Receitas: R$ \${totalReceitas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\`, 20, 54);
  doc.text(\`Despesas: R$ \${totalDespesas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\`, 80, 54);
  doc.text(\`Saldo: R$ \${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\`, 140, 54);

  autoTable(doc, {
    startY: 65,
    head: [['Data', 'Descrição', 'Categoria', 'T', 'Status', 'Valor']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 113, 227] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 60 },
      2: { cellWidth: 35 },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 22 },
      5: { cellWidth: 35, halign: 'right' }
    }
  });

  doc.save(\`Relatorio_Finance_\${params.empresa.replace(/\s+/g,'_')}.pdf\`);
}
`;
  fs.writeFileSync(path, code);
  console.log('generateFinanceReportPDF added to pdfGenerator.ts');
} else {
  console.log('Already exists');
}
