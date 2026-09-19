import fs from 'fs';

const p = 'src/utils/pdfGenerator.ts';
let code = fs.readFileSync(p, 'utf8');

const newFunc = `
export async function generateCobrancasReportPDF(clientesFiltrados: any[]) {
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Relatório de Faturamento (Cobranças)', 14, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(\`Data de emissão: \${new Date().toLocaleDateString('pt-BR')}\`, 14, 30);
  
  let tempTotal = 0;
  let qtdePendencias = 0;

  const tableData = clientesFiltrados.map(group => {
    tempTotal += group.totalValue;
    qtdePendencias += group.transacoes.length;
    return [
      group.cliente.nome,
      group.cliente.telefone || '-',
      group.transacoes.length.toString(),
      \`R$ \${group.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`
    ];
  });

  doc.setFillColor(245, 245, 247);
  doc.rect(14, 35, 182, 15, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.text(\`Clientes: \${clientesFiltrados.length}\`, 20, 44);
  doc.text(\`Pendências: \${qtdePendencias}\`, 80, 44);
  doc.text(\`Total a Receber: R$ \${tempTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\`, 140, 44);

  autoTable(doc, {
    startY: 55,
    head: [['Cliente/Contato', 'Telefone', 'Pendências', 'Valor Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 113, 227] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 40 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' }
    }
  });

  doc.save(\`Relatorio_Cobrancas_\${new Date().getTime()}.pdf\`);
}
`;

if(!code.includes('generateCobrancasReportPDF')) {
  fs.writeFileSync(p, code + newFunc);
  console.log('Added generateCobrancasReportPDF');
} else {
  console.log('Already exists');
}
