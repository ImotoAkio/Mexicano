import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import logoSrc from '../assets/images/vale_nauticos_logo_1780256879963.png';
import logoValeSrc from '../assets/images/logo_vale.png';

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

  // Row 3: TIPO and NÚMERO DE PESSOAS A BORDO
  // Col 1 (Left): TIPO
  currentY += rowHeights[1];
  doc.setFont('Helvetica', 'bold');
  doc.text('TIPO:', startX + cellPaddingXLeft, currentY);
  labelWidth = doc.getTextWidth('TIPO: ');
  doc.setFont('Helvetica', 'normal');
  doc.text(fields.tipo.toUpperCase(), startX + cellPaddingXLeft + labelWidth, currentY);

  // Col 2 (Right): NÚMERO DE PESSOAS A BORDO
  doc.setFont('Helvetica', 'bold');
  doc.text('NÚMERO DE PESSOAS A BORDO:', splitX + cellPaddingXRight, currentY);
  labelWidth = doc.getTextWidth('NÚMERO DE PESSOAS A BORDO: ');
  doc.setFont('Helvetica', 'normal');
  doc.text(fields.pessoasABordo, splitX + cellPaddingXRight + labelWidth, currentY);

  // Row 4: NOME DA EMBARCAÇÃO (Full width)
  currentY += rowHeights[2];
  doc.setFont('Helvetica', 'bold');
  doc.text('NOME DA EMBARCAÇÃO:', startX + cellPaddingXLeft, currentY);
  labelWidth = doc.getTextWidth('NOME DA EMBARCAÇÃO: ');
  doc.setFont('Helvetica', 'normal');
  doc.text(fields.nomeEmbarcacao.toUpperCase(), startX + cellPaddingXLeft + labelWidth, currentY);

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



export async function generateOrcamentoOSPDF(
  manutencao: any,
  embarcacao?: any,
  cliente?: any,
  silentMode: boolean = false
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const leftMargin = 20;
  let currentY = 15;

  try {
    const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = logoValeSrc;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
    doc.addImage(logoImg, 'PNG', leftMargin, 8, 25, 25);
  } catch (err) {
    console.error('Erro ao carregar a logo para o PDF:', err);
  }

  // Header Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0); // Black
  doc.text('VALE ADMINISTRADORA NÁUTICA - ORÇAMENTO', leftMargin + 30, currentY + 4);

  currentY += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const osCode = manutencao.codigoOS || ('OS-' + (manutencao.id || '').substring(0, 6).toUpperCase());
  doc.text(`Documento Oficial • Ordem de Serviço: ${osCode}`, leftMargin + 30, currentY);

  currentY += 10;
  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(leftMargin, currentY, 190, currentY);

  currentY += 10;

  // Boat & Owner Data Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(leftMargin, currentY, 170, 32, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftMargin, currentY, 170, 32, 3, 3, 'D');

  let boxY = currentY + 7;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Embarcação: ${embarcacao?.nome || 'N/A'} (${embarcacao?.numero ? 'M' + embarcacao.numero : 'N/A'})`, leftMargin + 5, boxY);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  boxY += 5.5;
  doc.text(`Modelo / Tipo: ${embarcacao?.modelo || 'N/A'} (${embarcacao?.tipo === 'jet' ? 'Jet Ski' : 'Lancha'})`, leftMargin + 5, boxY);

  boxY += 5.5;
  doc.text(`Proprietário / Cliente: ${cliente?.nome || 'Proprietário Registrado'}`, leftMargin + 5, boxY);

  // Show all cotistas if many
  const isCotasInfo = (embarcacao?.donos?.length || embarcacao?.cotistas?.length) > 1;
  const nomesCotistas = isCotasInfo ? 
    (embarcacao.cotistas ? embarcacao.cotistas.map((c:any) => c.nome || '').join(', ') : 'Vários (ver cadastro)') : '';
  if (isCotasInfo) {
    boxY += 5.5;
    doc.text(`Cotistas: ${nomesCotistas.substring(0, 75)}${nomesCotistas.length > 75 ? '...' : ''}`, leftMargin + 5, boxY);
  }

  boxY += 5.5;
  doc.text(`Data de Abertura: ${manutencao.dataChamado ? new Date(manutencao.dataChamado).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')} • Horímetro Entrada: ${manutencao.horasMotorAtual || embarcacao?.horasMotor || 0} h`, leftMargin + 5, boxY);

  currentY += 40;

  // OS Details & Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Descrição do Serviço / Chamado: ${manutencao.tituloChamado || 'Manutenção Geral'}`, leftMargin, currentY);

  if (manutencao.descricaoServico) {
    currentY += 6;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(manutencao.descricaoServico, 170);
    doc.text(splitDesc, leftMargin, currentY);
    currentY += (splitDesc.length * 4.5);
  }

  currentY += 8;

  // Table of Items / Parts
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Detalhamento das Peças & Materiais', leftMargin, currentY);
  currentY += 5;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(leftMargin, currentY, 170, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('Item / Peça', leftMargin + 3, currentY + 5);
  doc.text('Qtd.', leftMargin + 105, currentY + 5, { align: 'right' });
  doc.text('Val. Unitário', leftMargin + 138, currentY + 5, { align: 'right' });
  doc.text('Total', leftMargin + 167, currentY + 5, { align: 'right' });

  currentY += 7;

  const pecasList = manutencao.pecas || [];
  let valorTotal = 0;

  if (pecasList.length === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhum item específico listado (Mão de Obra / Serviço Geral)', leftMargin + 3, currentY + 5);
    currentY += 8;
  } else {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    pecasList.forEach((item: any, idx: number) => {
      const lineTotal = (item.quantidade || 1) * (item.valorUnitario || 0);
      valorTotal += lineTotal;

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(leftMargin, currentY, 170, 6.5, 'F');
      }

      doc.text(String(item.nome || 'Peça'), leftMargin + 3, currentY + 4.5);
      doc.text(String(item.quantidade || 1), leftMargin + 105, currentY + 4.5, { align: 'right' });
      doc.text((item.valorUnitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), leftMargin + 138, currentY + 4.5, { align: 'right' });
      doc.text(lineTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), leftMargin + 167, currentY + 4.5, { align: 'right' });

      currentY += 6.5;
    });
  }

  // Use orcamento if explicitly defined, otherwise sum of pecas
  const totalGeral = manutencao.orcamento && manutencao.orcamento > 0 ? manutencao.orcamento : valorTotal;

  currentY += 5;
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0); // Black line
  doc.line(leftMargin, currentY, 190, currentY);

  currentY += 8;

  const numCotistas = embarcacao?.donos?.length || embarcacao?.cotistas?.length || 1;
  const isCotas = numCotistas > 1;
  const valorPorCota = totalGeral / numCotistas;

  const boxHeight = isCotas ? 28 : 16;

  // Total Display Box (Grays)
  doc.setFillColor(244, 244, 245); // zinc-100
  doc.roundedRect(110, currentY, 80, boxHeight, 2, 2, 'F');
  doc.setDrawColor(161, 161, 170); // zinc-400
  doc.roundedRect(110, currentY, 80, boxHeight, 2, 2, 'D');

  if (isCotas) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(82, 82, 91); // zinc-600
    doc.text('CUSTO TOTAL:', 115, currentY + 6);
    doc.text(totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 185, currentY + 6, { align: 'right' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Dividido por ${numCotistas} cotistas`, 115, currentY + 13);

    doc.setDrawColor(212, 212, 216); // zinc-300
    doc.line(115, currentY + 16, 185, currentY + 16);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0); // Black
    doc.text('VALOR POR COTISTA:', 115, currentY + 23);
    doc.setFontSize(12);
    doc.text(valorPorCota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 185, currentY + 23, { align: 'right' });
  } else {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0); // Black
    doc.text('VALOR TOTAL:', 115, currentY + 11);
    doc.setFontSize(12);
    doc.text(totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 185, currentY + 11, { align: 'right' });
  }

  currentY += (boxHeight + 12);

  // Terms & Approval Signature
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Termos de Aprovação:', leftMargin, currentY);
  currentY += 4.5;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Proposta válida por 15 dias a contar da data de emissão. A aprovação autoriza o início dos serviços.', leftMargin, currentY);

  currentY += 22;
  doc.setLineWidth(0.4);
  doc.setDrawColor(148, 163, 184);
  doc.line(leftMargin + 30, currentY, leftMargin + 140, currentY);
  currentY += 5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Assinatura do Proprietário / Responsável', 105, currentY, { align: 'center' });

  if (!silentMode) {
    // Open PDF Blob URL
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  }

  return doc;
}


export async function generateMarinaCaixaPDF(
  transacoes: any[],
  metrics: any,
  fechamentoHoje: any,
  operador: string,
  periodType: string,
  logoUrl?: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const leftMargin = 15;
  const rightMargin = 195;
  let currentY = 15;

  // Format helpers
  const formatBRL = (val: number) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (dateStr: string) => {
    try {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Header Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('VILA NÁUTICA - RELATÓRIO DO CAIXA', leftMargin, currentY);

  currentY += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Relatório Oficial de Fechamento / Movimentação do Píer', leftMargin, currentY);

  // Draw top line
  currentY += 4;
  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(leftMargin, currentY, rightMargin, currentY);

  currentY += 8;

  // Caixa Info Box (Metadata)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(leftMargin, currentY, 180, 20, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(leftMargin, currentY, 180, 20, 2, 2, 'D');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600

  const boxY = currentY + 6;
  doc.text('Período / Status:', leftMargin + 4, boxY);
  doc.text('Operador de Caixa:', leftMargin + 90, boxY);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  const statusStr = fechamentoHoje?.status === 'aberto' ? 'Caixa Aberto' : (fechamentoHoje?.status === 'fechado' ? 'Caixa Fechado' : 'Não Inicializado');
  doc.text(`${periodType} (${statusStr})`, leftMargin + 4, boxY + 5);
  doc.text(`${operador || 'Usuário Atual'}`, leftMargin + 90, boxY + 5);

  if (fechamentoHoje?.abertoEm) {
     doc.setFont('Helvetica', 'bold');
     doc.setTextColor(71, 85, 105);
     doc.text('Abertura:', leftMargin + 4, boxY + 11);
     doc.setFont('Helvetica', 'normal');
     doc.setTextColor(15, 23, 42);
     doc.text(`${formatDate(fechamentoHoje.data)} às ${fechamentoHoje.abertoEm}`, leftMargin + 20, boxY + 11);
  }

  if (fechamentoHoje?.fechadoEm) {
     doc.setFont('Helvetica', 'bold');
     doc.setTextColor(71, 85, 105);
     doc.text('Fechamento:', leftMargin + 90, boxY + 11);
     doc.setFont('Helvetica', 'normal');
     doc.setTextColor(15, 23, 42);
     doc.text(`${fechamentoHoje.fechadoEm}`, leftMargin + 112, boxY + 11);
  }

  currentY += 28;

  // Resumo de Entradas (Receitas e Saldo)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Resumo Financeiro (Geral)', leftMargin, currentY);

  currentY += 5;
  // Create small summary grid
  // Col 1: Saldo Dinheiro Gaveta
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(leftMargin, currentY, 56, 16, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Fundo + Gaveta', leftMargin + 3, currentY + 6);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(formatBRL(metrics.saldoDinheiroGaveta), leftMargin + 3, currentY + 12);

  // Col 2: Total Recebido / Movido
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(leftMargin + 62, currentY, 56, 16, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Entradas (+)', leftMargin + 65, currentY + 6);
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(formatBRL(metrics.totalEntradas), leftMargin + 65, currentY + 12);

  // Col 3: Total Saídas
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(leftMargin + 124, currentY, 56, 16, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Saídas / Sangria (-)', leftMargin + 127, currentY + 6);
  doc.setFontSize(10);
  doc.setTextColor(244, 63, 94); // rose-500
  doc.text(formatBRL(metrics.totalSaidas + (metrics.sangriasDinheiro || 0)), leftMargin + 127, currentY + 12);

  currentY += 22;

  // Formas de Pagamento
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Composição Entradas: PIX: ${formatBRL(metrics.totalPix)}  |  Cartões (D/C): ${formatBRL(metrics.totalCartoes)}  |  Bolsa Dinheiro: ${formatBRL(metrics.entradasDinheiro)}`, leftMargin, currentY);

  currentY += 7;
  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240);
  doc.line(leftMargin, currentY, rightMargin, currentY);

  currentY += 8;

  // Lista de Transações (Tabela)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Registro de Lançamentos', leftMargin, currentY);

  currentY += 5;

  // Header Tabela
  doc.setFillColor(248, 250, 252); // slate-100
  doc.rect(leftMargin, currentY, 180, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('HORA', leftMargin + 2, currentY + 5);
  doc.text('DESC.', leftMargin + 16, currentY + 5);
  doc.text('PAGTO.', leftMargin + 95, currentY + 5);
  doc.text('TIPO', leftMargin + 120, currentY + 5);
  doc.text('USUÁRIO', leftMargin + 140, currentY + 5);
  doc.text('VALOR (R$)', rightMargin - 4, currentY + 5, { align: 'right' });

  currentY += 9;

  if (!transacoes || transacoes.length === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.text('Ainda não há lançamentos para este período.', leftMargin + 2, currentY + 4);
    currentY += 10;
  } else {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    let rowStriped = false;

    for (let t of transacoes) {
      if (currentY > 270) {
        doc.addPage();
        currentY = 15;
        doc.setFillColor(248, 250, 252);
        doc.rect(leftMargin, currentY, 180, 8, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.text('HORA', leftMargin + 2, currentY + 5);
        doc.text('DESC.', leftMargin + 16, currentY + 5);
        doc.text('PAGTO.', leftMargin + 95, currentY + 5);
        doc.text('TIPO', leftMargin + 120, currentY + 5);
        doc.text('USUÁRIO', leftMargin + 140, currentY + 5);
        doc.text('VALOR (R$)', rightMargin - 4, currentY + 5, { align: 'right' });
        currentY += 9;
        doc.setFont('Helvetica', 'normal');
      }

      if (rowStriped) {
        doc.setFillColor(248, 250, 252);
        doc.rect(leftMargin, currentY, 180, 7.5, 'F');
      }

      const isSaida = t.tipo === 'saida';
      const valorFormatado = (isSaida ? '- ' : '') + formatBRL(t.valor);

      doc.setTextColor(100, 116, 139);
      doc.text(t.hora || '--:--', leftMargin + 2, currentY + 5.2);

      doc.setTextColor(15, 23, 42);
      const shortDesc = doc.splitTextToSize(t.descricao || (t.categoria ? t.categoria.replace(/_/g, ' ') : 'S/N'), 75)[0];
      doc.text(shortDesc, leftMargin + 16, currentY + 5.2);

      doc.setTextColor(71, 85, 105);
      doc.text((t.formaPagamento || 'N/A').toUpperCase(), leftMargin + 95, currentY + 5.2);

      doc.setFont('Helvetica', 'bold');
      if (isSaida) {
        doc.setTextColor(244, 63, 94);
        doc.text('SAÍDA', leftMargin + 120, currentY + 5.2);
      } else {
        doc.setTextColor(16, 185, 129);
        doc.text('ENTRADA', leftMargin + 120, currentY + 5.2);
      }

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(t.operadorNome || 'Operador', leftMargin + 140, currentY + 5.2);

      doc.setTextColor(isSaida ? 244 : 15, isSaida ? 63 : 23, isSaida ? 94 : 42);
      doc.text(valorFormatado, rightMargin - 4, currentY + 5.2, { align: 'right' });

      currentY += 7.5;
      rowStriped = !rowStriped;
    }
  }

  if (currentY > 230) {
    doc.addPage();
    currentY = 15;
  } else {
    currentY += 15;
  }

  // Footer / Signatures
  doc.setDrawColor(203, 213, 225);

  if (fechamentoHoje && fechamentoHoje.status === 'fechado') {
     doc.setFont('Helvetica', 'bold');
     doc.setFontSize(9);
     doc.setTextColor(15, 23, 42);
     doc.text('Conferência de Fechamento', leftMargin, currentY);
     currentY += 6;

     doc.setFont('Helvetica', 'normal');
     doc.setFontSize(8);
     doc.setTextColor(71, 85, 105);
     doc.text('Valor declarado pelo operador no fechamento da gaveta:', leftMargin, currentY);
     doc.setFont('Helvetica', 'bold');
     doc.text(`${formatBRL(fechamentoHoje.saldoContadoDinheiro)}`, leftMargin + 85, currentY);

     currentY += 5;
     doc.setFont('Helvetica', 'normal');
     doc.text('Diferença / Divergência (Sistema vs Gaveta):', leftMargin, currentY);

     const diferenca = fechamentoHoje.diferencaDinheiro || 0;
     doc.setFont('Helvetica', 'bold');
     if (diferenca < 0) {
       doc.setTextColor(244, 63, 94);
     } else if (diferenca > 0) {
       doc.setTextColor(16, 185, 129);
     } else {
       doc.setTextColor(15, 23, 42);
     }
     doc.text(`${formatBRL(diferenca)}`, leftMargin + 70, currentY);

     currentY += 15;
  }

  const signLineY = currentY + 12;
  doc.setLineWidth(0.4);
  doc.line(leftMargin + 15, signLineY, leftMargin + 75, signLineY);
  doc.line(leftMargin + 105, signLineY, leftMargin + 165, signLineY);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Assinatura do Operador (Caixa)', leftMargin + 45, signLineY + 5, { align: 'center' });
  doc.text('Visto da Gerência / Financeiro', leftMargin + 135, signLineY + 5, { align: 'center' });

  // Open PDF window
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');

  return doc;
}

export async function generateAdminReportPDF(
  title: string,
  subtitle: string,
  columns: string[],
  rows: any[][],
  metrics?: { label: string; value: string }[],
  logoUrl?: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const leftMargin = 15;
  const rightMargin = 282; // Landscape has 297 width
  let currentY = 15;

  // Header Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); 
  doc.text(title, leftMargin, currentY);

  currentY += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); 
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`${subtitle} - Gerado em: ${dateStr}`, leftMargin, currentY);

  currentY += 4;
  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240);
  doc.line(leftMargin, currentY, rightMargin, currentY);

  currentY += 8;

  // Metrics (if any)
  if (metrics && metrics.length > 0) {
    const boxWidth = ((rightMargin - leftMargin) / metrics.length) - 4;
    let startX = leftMargin;
    
    metrics.forEach(m => {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX, currentY, boxWidth, 18, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(startX, currentY, boxWidth, 18, 2, 2, 'D');
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(m.label, startX + 4, currentY + 7);
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(m.value, startX + 4, currentY + 14);
      
      startX += boxWidth + 5;
    });
    
    currentY += 24;
  }

  // Tabela
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: currentY,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { top: 15, left: leftMargin, right: 297 - rightMargin },
  });

  // Open PDF window
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
  
  return doc;
}

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
  doc.text(`Empresa: ${params.empresa}`, 14, 30);
  doc.text(`Filtro (Aba): ${params.tab}`, 14, 35);
  
  let pText = 'Todo o período';
  if (params.dataInicio && params.dataFim) {
     pText = `${params.dataInicio.split('-').reverse().join('/')} até ${params.dataFim.split('-').reverse().join('/')}`;
  } else if (params.dataInicio) {
     pText = `A partir de ${params.dataInicio.split('-').reverse().join('/')}`;
  } else if (params.dataFim) {
     pText = `Até ${params.dataFim.split('-').reverse().join('/')}`;
  }
  doc.text(`Período: ${pText}`, 14, 40);

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
      `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ];
  });

  const saldo = totalReceitas - totalDespesas;

  doc.setFillColor(245, 245, 247);
  doc.rect(14, 45, 182, 15, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Receitas: R$ ${totalReceitas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 20, 54);
  doc.text(`Despesas: R$ ${totalDespesas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 80, 54);
  doc.text(`Saldo: R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 140, 54);

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

  doc.save(`Relatorio_Finance_${params.empresa.replace(/\s+/g,'_')}.pdf`);
}
