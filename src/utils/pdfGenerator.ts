import { jsPDF } from 'jspdf';
// @ts-ignore
import logoSrc from '../assets/images/vale_nauticos_logo_1780256879963.png';

interface PDFData {
  data: string;          // DD / MM / YYYY
  nome: string;          // Owner/Comandante Name
  tipo: string;          // Jetski or Lancha
  nomeEmbarcacao: string;// e.g., M44
  pessoasABordo: string; // e.g., 02
  destino: string;       // e.g., Iate Club - Rodeadouro
  previsaoSaida: string; // e.g., 11:30
  previsaoChegada: string;// e.g., 17:28
  observacao: string;    // e.g., Nenhuma
}

export async function generateAvisoSaidaPDF(
  fields: PDFData,
  options?: { 
    autoPrint?: boolean; 
    download?: boolean; 
    logoUrl?: string; 
    bannerText?: string; 
  }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const shouldAutoPrint = options?.autoPrint !== false;
  const shouldDownload = options?.download === true;

  // Enable auto print metadata in PDF
  if (shouldAutoPrint) {
    doc.autoPrint();
  }

  // Margins
  const leftMargin = 20;

  // Base font
  doc.setFont('Helvetica', 'normal');

  // Load logo image and add to PDF
  if (options?.logoUrl !== 'empty') {
    try {
      const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.src = options?.logoUrl || logoSrc;
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
      });
      // Draw logo at top-left: x=20, y=10, w=35, h=25 (highly elegant placement)
      doc.addImage(logoImg, 'PNG', 20, 10, 35, 25);
    } catch (err) {
      console.error('Erro ao carregar a logo para o PDF:', err);
    }
  }

  // Top Right Aligned Header
  doc.setFontSize(10.5);
  doc.setFont('Helvetica', 'bold');
  doc.text('NORMAM-211/DPC', 190, 20, { align: 'right' });

  // Centered headers
  doc.setFontSize(11.5);
  doc.text('ANEXO 4-A', 105, 30, { align: 'center' });
  doc.setFontSize(15);
  doc.text('AVISO DE SAÍDA', 105, 37, { align: 'center' });

  // Table Configuration (Matching user template exactly)
  const startY = 46;
  const startX = 20;
  const endX = 190;
  const tableWidth = endX - startX; // 170mm
  const splitX = 110; // Splitting at 110mm (Left width = 90, Right width = 80)

  // Height definitions for each of the 7 rows (generous vertical spacing)
  const rowHeights = [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 12.5];
  const tableHeight = rowHeights.reduce((sum, h) => sum + h, 0); // 75.5mm total table height

  // Draw table outline & horizontal grid borders
  doc.setDrawColor(0, 0, 0); // Solid black guidelines
  doc.setLineWidth(0.40);
  doc.rect(startX, startY, tableWidth, tableHeight);

  // Draw interior horizontal dividing rows
  let tempY = startY;
  for (let i = 0; i < rowHeights.length - 1; i++) {
    tempY += rowHeights[i];
    doc.line(startX, tempY, endX, tempY);
  }

  // Draw interior vertical dividing lines for specific split rows (Row 1, Row 3, and Row 6)
  // Row 1 vertical line
  doc.line(splitX, startY, splitX, startY + rowHeights[0]);
  // Row 3 vertical line (startY + row 1 + row 2)
  const row3Start = startY + rowHeights[0] + rowHeights[1];
  doc.line(splitX, row3Start, splitX, row3Start + rowHeights[2]);
  // Row 6 vertical line (startY + row 1 + row 2 + row 3 + row 4 + row 5)
  const row6Start = startY + rowHeights[0] + rowHeights[1] + rowHeights[2] + rowHeights[3] + rowHeights[4];
  doc.line(splitX, row6Start, splitX, row6Start + rowHeights[5]);

  // Insert structured text within the table grids with padded styling
  const cellPaddingXLeft = 3;
  const cellPaddingXRight = 3;
  const textBaselineOffset = 6.8;

  // Set font size for table labels & values matching the document (increased for readability)
  doc.setFontSize(11);

  // Row 1: DATA and MARINA/CLUB Banner
  // Col 1 (Left): DATA
  let currentY = startY + textBaselineOffset;
  doc.setFont('Helvetica', 'bold');
  doc.text('DATA:', startX + cellPaddingXLeft, currentY);
  let labelWidth = doc.getTextWidth('DATA: ');
  doc.setFont('Helvetica', 'normal');
  doc.text(fields.data, startX + cellPaddingXLeft + labelWidth, currentY);

  // Col 2 (Right): VILA NÁUTICA / CLUB BANNER (capitalized)
  doc.setFont('Helvetica', 'bold');
  doc.text((options?.bannerText || 'VILA NÁUTICA').toUpperCase(), splitX + cellPaddingXRight, currentY);

  // Row 2: NOME (Full width)
  currentY += rowHeights[0];
  doc.setFont('Helvetica', 'bold');
  doc.text('NOME:', startX + cellPaddingXLeft, currentY);
  labelWidth = doc.getTextWidth('NOME: ');
  doc.setFont('Helvetica', 'normal');
  doc.text(fields.nome.toUpperCase(), startX + cellPaddingXLeft + labelWidth, currentY);

  // Row 3: TIPO and NOME DA EMBARCAÇÃO
  // Col 1 (Left): TIPO
  currentY += rowHeights[1];
  doc.setFont('Helvetica', 'bold');
  doc.text('TIPO:', startX + cellPaddingXLeft, currentY);
  labelWidth = doc.getTextWidth('TIPO: ');
  doc.setFont('Helvetica', 'normal');
  doc.text(fields.tipo.toUpperCase(), startX + cellPaddingXLeft + labelWidth, currentY);

  // Col 2 (Right): NOME DA EMBARCAÇÃO
  doc.setFont('Helvetica', 'bold');
  doc.text('NOME DA EMBARCAÇÃO:', splitX + cellPaddingXRight, currentY);
  labelWidth = doc.getTextWidth('NOME DA EMBARCAÇÃO: ');
  doc.setFont('Helvetica', 'normal');
  doc.text(fields.nomeEmbarcacao.toUpperCase(), splitX + cellPaddingXRight + labelWidth, currentY);

  // Row 4: NÚMERO DE PESSOAS A BORDO (Full width)
  currentY += rowHeights[2];
  doc.setFont('Helvetica', 'bold');
  doc.text('NÚMERO DE PESSOAS A BORDO:', startX + cellPaddingXLeft, currentY);
  labelWidth = doc.getTextWidth('NÚMERO DE PESSOAS A BORDO:  ');
  doc.setFont('Helvetica', 'normal');
  doc.text(fields.pessoasABordo, startX + cellPaddingXLeft + labelWidth, currentY);

  // Row 5: DESTINO DA EMBARCAÇÃO (Full width)
  currentY += rowHeights[3];
  doc.setFont('Helvetica', 'bold');
  doc.text('DESTINO DA EMBARCAÇÃO:', startX + cellPaddingXLeft, currentY);
  labelWidth = doc.getTextWidth('DESTINO DA EMBARCAÇÃO: ');
  doc.setFont('Helvetica', 'normal');
  doc.text(fields.destino.toUpperCase(), startX + cellPaddingXLeft + labelWidth, currentY);

  // Row 6: PREVISÃO DE SAÍDA and PREVISÃO DE CHEGADA
  // Col 1 (Left): PREVISÃO DE SAÍDA
  currentY += rowHeights[4];
  doc.setFont('Helvetica', 'bold');
  doc.text('PREVISÃO DE SAÍDA:', startX + cellPaddingXLeft, currentY);
  labelWidth = doc.getTextWidth('PREVISÃO DE SAÍDA: ');
  doc.setFont('Helvetica', 'normal');
  doc.text(fields.previsaoSaida, startX + cellPaddingXLeft + labelWidth, currentY);

  // Col 2 (Right): PREVISÃO DE CHEGADA
  doc.setFont('Helvetica', 'bold');
  doc.text('PREVISÃO DE CHEGADA:', splitX + cellPaddingXRight, currentY);
  labelWidth = doc.getTextWidth('PREVISÃO DE CHEGADA: ');
  doc.setFont('Helvetica', 'normal');
  doc.text(fields.previsaoChegada, splitX + cellPaddingXRight + labelWidth, currentY);

  // Row 7: OBSERVAÇÃO (Full width with slightly shift baseline for height comfort)
  currentY += rowHeights[5] + 1;
  doc.setFont('Helvetica', 'bold');
  doc.text('OBSERVAÇÃO:', startX + cellPaddingXLeft, currentY);
  labelWidth = doc.getTextWidth('OBSERVAÇÃO: ');
  doc.setFont('Helvetica', 'normal');
  const obsClean = fields.observacao && fields.observacao.trim() !== 'Nenhuma' ? fields.observacao.toUpperCase() : '';
  doc.text(obsClean, startX + cellPaddingXLeft + labelWidth, currentY);

  // Text contents after table block (Starts at starting position calculated below)
  let footerY = startY + tableHeight + 10;

  // Responsibility Statement Block (with increased font sizes)
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  const responsibilityText = 'É responsabilidade do comandante da embarcação ter a bordo o material de navegação e de salvatagem compatível com a singradura que irá realizar e o número de pessoas a bordo.';
  const splitResponsibility = doc.splitTextToSize(responsibilityText, 170);
  doc.text(splitResponsibility, leftMargin, footerY);
  footerY += (splitResponsibility.length * 5) + 10; // Extra spacing

  // Signature Field (Centered relative to the page area)
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Comandante da Embarcação', 105, footerY, { align: 'center' });
  
  footerY += 22; // INCREASED SPACE FOR PHYSICALLY SIGNING/STAMPING (Generous page gap)
  doc.text('_________________________________________________________________', 105, footerY, { align: 'center' });
  
  footerY += 15; // Spacing before Observations

  // Observations Footer Section
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Observações:', leftMargin, footerY);
  footerY += 5.5;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  const obsText1 = 'O aviso de saída deve ser entregue ao clube ou marina, antes da saída da embarcação ou transmitido via rádio, sendo responsabilidade do clube ou marina o registro e arquivamento das informações. Poderá ainda, ser entregue a uma pessoa de confiança.';
  const splitObs1 = doc.splitTextToSize(obsText1, 170);
  doc.text(splitObs1, leftMargin, footerY);
  footerY += (splitObs1.length * 3.8) + 3;

  const obsText2 = 'Em substituição a este anexo, o comandante da embarcação de esporte e recreio poderá realizar o registro no aplicativo "NAVSEG" (disponível nas lojas de aplicativos), para dispositivos móveis, desenvolvido pela Marinha do Brasil, bem como compartilhar o seu plano de viagem por meio digital.';
  const splitObs2 = doc.splitTextToSize(obsText2, 170);
  doc.text(splitObs2, leftMargin, footerY);

  // Handle auto print or download based on options
  if (shouldAutoPrint) {
    try {
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.warn('Erro na preparação do arquivo de impressão, efetuando o download do arquivo:', error);
      try {
        const filename = `Aviso_de_Saida_${fields.nomeEmbarcacao || 'Embarcacao'}_${(fields.data || '').replace(/\s+/g, '').replace(/\//g, '-')}.pdf`;
        doc.save(filename);
      } catch (saveErr) {
        console.error('Falha extrema na gravação do PDF:', saveErr);
      }
    }
  } else if (shouldDownload) {
    try {
      const filename = `Aviso_de_Saida_${fields.nomeEmbarcacao || 'Embarcacao'}_${(fields.data || '').replace(/\s+/g, '').replace(/\//g, '-')}.pdf`;
      doc.save(filename);
    } catch (saveErr) {
      console.error('Falha ao baixar o PDF:', saveErr);
    }
  }

  return doc;
}
