import { jsPDF } from 'jspdf';
import { formatBoatName } from '../utils/constants';
// @ts-ignore
import logoSrc from '../assets/images/vale_nauticos_logo_1780256879963.png';

interface ClientData {
  nome?: string;
  cpf?: string;
  rg?: string;
  orgaoEmissor?: string;
  cnh_cha?: string;
  numeroHabilitacao?: string;
  validadeHabilitacao?: string;
  orgaoEmissorHabilitacao?: string;
  categoriaHabilitacao?: string;
  estadoCivil?: string;
  profissao?: string;
  logradouro?: string;
  numeroEnd?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  cota?: string;
}

interface BoatData {
  nome?: string;
  modelo?: string;
  chassi?: string;
  inscricao?: string;
  tipo_propulsao?: string;
  potencia?: string;
}

export interface PaymentData {
  valorTotal?: string;
  valorEntrada?: string;
  valorRemanescente?: string;
  valorRemanescenteExtenso?: string;
  numParcelas?: string;
  numParcelasExtenso?: string;
  valorParcela?: string;
  valorParcelaExtenso?: string;
  formaPagamento?: string;
  diaVencimento?: string;
  isCustomPaymentText?: boolean;
  customPaymentText?: string;
}

const getLogoImage = async (): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = logoSrc;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });
};

interface StyledSpan {
  text: string;
  bold: boolean;
  underline: boolean;
  highlight: boolean;
}

interface WordToken {
  text: string;
  bold: boolean;
  underline: boolean;
  highlight: boolean;
  width: number;
}

function parseParagraphSpans(input: string): StyledSpan[] {
  const spans: StyledSpan[] = [];
  let bold = false;
  let underline = false;
  let highlight = false;

  const tagRegex = /(<\/?(?:b|u|mark|yellow)>)/gi;
  const parts = input.split(tagRegex);

  for (const part of parts) {
    if (!part) continue;
    const lower = part.toLowerCase();
    if (lower === '<b>') bold = true;
    else if (lower === '</b>') bold = false;
    else if (lower === '<u>') underline = true;
    else if (lower === '</u>') underline = false;
    else if (lower === '<mark>' || lower === '<yellow>') highlight = true;
    else if (lower === '</mark>' || lower === '</yellow>') highlight = false;
    else {
      spans.push({ text: part, bold, underline, highlight });
    }
  }
  return spans;
}

const formatAddress = (data: ClientData) => {
  const parts: string[] = [];
  if (data.logradouro) parts.push(data.logradouro.trim().toUpperCase());
  if (data.numeroEnd) parts.push(`N°${data.numeroEnd.trim()}`);
  if (data.complemento) parts.push(data.complemento.trim().toUpperCase());
  if (data.bairro) parts.push(`BAIRRO: ${data.bairro.trim().toUpperCase()}`);
  if (data.cidade && data.estado) parts.push(`${data.cidade.trim().toUpperCase()}-${data.estado.trim().toUpperCase()}`);
  if (data.cep) parts.push(`CEP:${data.cep.trim().replace(/\s+/g, '')}`);
  return parts.length > 0 ? parts.join(', ') : 'NÃO INFORMADO';
};

export async function generateContract(type: 'adm' | 'aquisicao', clientData: ClientData, boatData: BoatData, paymentData?: PaymentData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const margins = { top: 25, left: 20, right: 20, bottom: 20 };
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const textWidth = pageWidth - margins.left - margins.right;
  let cursorY = margins.top;

  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await getLogoImage();
  } catch (e) {
    console.error("Failed to load logo", e);
  }

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margins.bottom) {
      doc.addPage();
      cursorY = margins.top;
    }
  };

  const drawHeaderLogo = () => {
    if (logoImg) {
      const imgW = 38;
      const imgH = 24;
      doc.addImage(logoImg, 'PNG', (pageWidth - imgW) / 2, 10, imgW, imgH);
      cursorY = 40;
    }
  };

  const writeTitle = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(title, textWidth);
    checkPageBreak(lines.length * 5 + 8);
    doc.text(lines, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += lines.length * 5 + 7;
  };

  const writeRichParagraph = (
    text: string,
    fontSize = 9.5,
    align: 'left' | 'justify' | 'center' = 'justify',
    extraSpacingBottom = 3
  ) => {
    doc.setFontSize(fontSize);

    const sublines = text.split('\n');

    for (let sIdx = 0; sIdx < sublines.length; sIdx++) {
      const rawSubline = sublines[sIdx];
      const isSubItem = /^[a-z]\)\s/i.test(rawSubline.trim()) || /^-\s/.test(rawSubline.trim());
      const indent = isSubItem ? 6 : 0;
      const availableWidth = textWidth - indent;

      const spans = parseParagraphSpans(rawSubline);
      const words: WordToken[] = [];

      for (const span of spans) {
        const spanWords = span.text.split(/(\s+)/);
        for (const w of spanWords) {
          if (!w) continue;
          if (/^\s+$/.test(w)) continue;
          doc.setFont("helvetica", span.bold ? "bold" : "normal");
          const wWidth = doc.getTextWidth(w);
          words.push({
            text: w,
            bold: span.bold,
            underline: span.underline,
            highlight: span.highlight,
            width: wWidth
          });
        }
      }

      if (words.length === 0) {
        cursorY += 2.5;
        continue;
      }

      doc.setFont("helvetica", "normal");
      const spaceWidth = doc.getTextWidth(' ');

      const lines: WordToken[][] = [];
      let currentLine: WordToken[] = [];
      let currentLineWidth = 0;

      for (const word of words) {
        const neededSpace = currentLine.length > 0 ? spaceWidth : 0;
        if (currentLine.length > 0 && currentLineWidth + neededSpace + word.width > availableWidth) {
          lines.push(currentLine);
          currentLine = [word];
          currentLineWidth = word.width;
        } else {
          currentLine.push(word);
          currentLineWidth += neededSpace + word.width;
        }
      }
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }

      for (let lIdx = 0; lIdx < lines.length; lIdx++) {
        checkPageBreak(5.2);
        const lineWords = lines[lIdx];
        const isLastLine = lIdx === lines.length - 1;

        let lineWordsWidth = 0;
        for (const w of lineWords) lineWordsWidth += w.width;

        let gap = spaceWidth;
        let startX = margins.left + indent;

        if (align === 'center') {
          const totalW = lineWordsWidth + (lineWords.length - 1) * spaceWidth;
          startX = margins.left + indent + (availableWidth - totalW) / 2;
        } else if (align === 'justify' && !isLastLine && lineWords.length > 1) {
          const remaining = availableWidth - lineWordsWidth;
          gap = remaining / (lineWords.length - 1);
          if (gap > spaceWidth * 2.5) gap = spaceWidth * 2.5;
        }

        let curX = startX;
        for (let wIdx = 0; wIdx < lineWords.length; wIdx++) {
          const w = lineWords[wIdx];

          if (w.highlight) {
            doc.setFillColor(255, 235, 59);
            doc.rect(curX - 0.4, cursorY - 3.2, w.width + 0.8, 4.3, 'F');
          }

          doc.setFont("helvetica", w.bold ? "bold" : "normal");
          doc.setTextColor(0, 0, 0);
          doc.text(w.text, curX, cursorY);

          if (w.underline) {
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.25);
            doc.line(curX, cursorY + 0.6, curX + w.width, cursorY + 0.6);
          }

          curX += w.width + gap;
        }

        cursorY += 4.8;
      }

      cursorY += 1.2;
    }

    cursorY += extraSpacingBottom;
  };

  const fullAddress = formatAddress(clientData);

  if (type === 'aquisicao') {
    drawHeaderLogo();
    writeTitle('CONTRATO DE AQUISIÇÃO DE COPROPRIEDADE DE EMBARCAÇÃO');
    
    const clientStr = `COMPRADOR: Nome: <b>${clientData.nome || 'N/A'}</b>, Nacionalidade: <b>BRASILEIRO</b>, Estado civil: <b>${clientData.estadoCivil || 'N/A'}</b>, Profissão: <b>${clientData.profissao || 'N/A'}</b>, inscrito no CPF sob o nº <b>${clientData.cpf || 'N/A'}</b>, portador da carteira de identidade nº <b>${clientData.rg || 'N/A'}</b>, Endereço: <b>${fullAddress}</b>, contato (WhatsApp): <b>${clientData.telefone || 'N/A'}</b>.`;
    const vendorStr = `VENDEDOR: <b>MEXICANO LANCHAS LTDA</b>, pessoa jurídica de direito privado, inscrita no <b>CNPJ sob o nº 42.206.594/0001-31</b> com sede, situada na cidade de <b>Petrolina-PE, no Loteamento Lote 190, nº 190, Estrada da Tapera, CEP: 56334-899</b>, endereço eletrônico: <b>vendasmexicanolanchas@gmail.com</b>, WhatsApp: <b>(87)9 9655-2883</b>.`;
    const introStr = `As partes acima identificadas têm, entre si, justo e acertado o presente contrato para aquisição de cota de embarcação, que se regerá pelas cláusulas a seguir descritas.`;

    writeRichParagraph(clientStr);
    writeRichParagraph(vendorStr);
    writeRichParagraph(introStr);

    const cotaPercentual = clientData.cota || '25%';
    let cotaExtenso = 'vinte e cinco por cento';
    if (cotaPercentual === '12.5%' || cotaPercentual === '12,5%') {
      cotaExtenso = 'doze vírgula cinco por cento';
    } else if (cotaPercentual === '50%') {
      cotaExtenso = 'cinquenta por cento';
    } else if (cotaPercentual === '100%') {
      cotaExtenso = 'cem por cento';
    }

    const formatR$ = (val?: string) => {
      if (!val) return '';
      const trimmed = val.trim();
      if (trimmed.startsWith('R$')) return trimmed;
      return `R$ ${trimmed}`;
    };

    const vTotal = formatR$(paymentData?.valorTotal || '55.000,00');
    const vEntrada = formatR$(paymentData?.valorEntrada || '12.040,00');
    const vRemanescente = formatR$(paymentData?.valorRemanescente || '42.960,00');
    const vRemExtenso = paymentData?.valorRemanescenteExtenso || 'QUARENTA E DOIS MIL NOVECENTOS E SESSENTA REAIS';
    const nParc = paymentData?.numParcelas || '24';
    const nParcExtenso = paymentData?.numParcelasExtenso || 'VINTE E QUATRO';
    const vParcela = formatR$(paymentData?.valorParcela || '1.790,00');
    const vParcExtenso = paymentData?.valorParcelaExtenso || 'MIL E SETECENTOS E NOVENTA REAIS';
    const formaPag = paymentData?.formaPagamento || 'boleto/transferência bancária/depósito/espécie';
    const diaVenc = paymentData?.diaVencimento || '10';

    const clause3_1 = `<mark>3.1.</mark> O COMPRADOR pagará pela aquisição de <b>${cotaPercentual} (${cotaExtenso})</b> da propriedade da embarcação, objeto deste contrato, o valor de <b>${vTotal}</b> a ser efetuado da seguinte forma:`;
    const clause3_1_a = `a) Pagamento de <b>${vEntrada}</b> a título de entrada, que será pago à vista no momento da assinatura do presente contrato.`;
    const clause3_1_b = `b) O valor remanescente de <b>${vRemanescente} (${vRemExtenso})</b>, deverá ser pago em <b>${nParc} (${nParcExtenso}) parcelas de ${vParcela} (${vParcExtenso})</b>, mediante <b>${formaPag}</b>, com o vencimento para o <b>dia ${diaVenc} de cada mês</b>, servindo comprovante de pagamento/transferência como recibo de quitação.`;

    const clauses = [
      "<b>1. <u>OBJETO</u></b>",
      `<mark>1.1.</mark> Este contrato tem como objeto a aquisição de copropriedade de embarcação, correspondente a <b>${clientData.cota || '25%'}</b> do total, pelo COMPRADOR, qual seja: <b>${formatBoatName(boatData.nome) || 'N/A'}</b> modelo: <b>${boatData.modelo || 'N/A'}</b>, Nº do chassi: <b>${boatData.chassi || 'N/A'}</b>.`,
      `<mark>1.2.</mark> NÚMERO DE INSCRIÇÃO: <b>${boatData.inscricao || 'N/A'}</b>, Tipo de propulsão: <b>${boatData.tipo_propulsao || 'MOTOR'}</b>, potencia: <b>${boatData.potencia || 'N/A'}</b>.`,
      "<b>2. <u>DAS CONDIÇÕES DE AQUISIÇÃO E UTILIZAÇÃO DA EMBARCAÇÃO</u></b>",
      `<mark>2.1.</mark> O COMPRADOR está ciente que a presente compra se dará de modo compartilhado, juntamente com <b>mais 3 (três) coproprietários</b>, não possuindo o COMPRADOR nenhum poder de intervir na escolha dos demais coproprietários, sendo estes escolhidos por liberalidade única e exclusiva do VENDEDOR, os quais firmarão individualmente negócio jurídico com a <b>MEXICANO LANCHAS</b>.`,
      `<mark>2.2.</mark> Os custos gerados para manutenção e utilização da embarcação, serão <b>rateados pelos COPROPRIETÁRIOS</b>, na proporção da participação de cada um, salvo em caso de negligência, imperícia ou imprudência praticada, no qual o COPROPRIETÁRIO infrator, arcará individualmente com o reparo dos danos.`,
      `<mark>2.3.</mark> O COMPRADOR se compromete a firmar contrato para <b>ADMINISTRAÇÃO da embarcação</b> juntamente a <b>MEXICANO LANCHAS</b>, visto que por se tratar de uma compra de embarcação de modo compartilhado, para manter a organização e isonomia do seu uso, se faz necessário a manutenção do bem por empresa especializada.`,
      `<mark>2.3.1.</mark> A embarcação só poderá ser administrada por outra empresa que não seja integrante do grupo MEXICANO LANCHAS, <b>após a quitação de 100% (cem por cento) do valor total da embarcação</b>, bem como outros débitos relacionados a manutenção, serviço, abastecimentos e demais custos decorrentes da embarcação devidos a MEXICANO LANCHAS.`,
      `<mark>2.4.</mark> Ao firmar o presente contrato, o COMPRADOR garante que cumprirá todas as <b>normas internas de utilização da embarcação e do Estatuto dos Cotistas</b>, passadas pela ADMINISTRADORA e/ou VENDEDOR.`,
      `<mark>2.5.</mark> O COMPRADOR tem ciência que para utilização de Moto Aquática, deverá obrigatoriamente possuir <b>Carteira de Habilitação de Motonauta (MTA)</b>, devendo estar regular e adimplente perante os órgãos fiscalizadores, estando seu acesso ao sistema de agendamento/reservas condicionado a apresentação da referida habilitação.`,
      `<mark>2.5.1.</mark> Caso o COMPRADOR ainda não possua a carteira de habilitação de Motonauta (MTA), poderá adquirir a cota, porém <b>só terá seu acesso ao sistema de agendamento liberado após apresentação do referido documento de habilitação</b>.`,
      `<mark>2.6.</mark> É vedado a qualquer COPROPRIETÁRIO da embarcação: (i)remover a embarcação da marina ou da água para transitar por terra; (ii) uso da embarcação para fins comerciais/exploração econômica ou qualquer fim ilícito; (iv) cessão ou empréstimo da embarcação para terceiros sem a presença do COMPRADOR ou alguns de seus dependentes, devidamente identificados junto a ADMINISTRADORA; (vii) uso para empurrar, puxar ou rebocer outra embarcação; (viii)uso para transporte de produtos inflamáveis ou explosivos; (ix)permitir que a pilotagem ou condução da embarcação em estado de embriagues, por si ou por terceiros; (x)uso ou porte de substância psicotrópica, narcótica ou similar.`,
      `<mark>2.6.1.</mark> Em caso de descumprimento dos itens elencados no item 2.6, a parte infratora arcará com <b>multa no valor de 2 (dois) salários mínimos vigentes a época</b>, que serão destinados a ADMINISTRADORA para custos de manutenção e conservação da embarcação.`,
      `<mark>2.6.2.</mark> Além da multa acima prevista, eventuais danos ocasionados ao bem ou a terceiros pela prática de algum dos itens descritos no item 2.6, a parte infratora <b>arcará individualmente com estes</b>, sem direito a ressarcimento pelos demais coproprietários.`,
      "<b>3. <u>DO PREÇO, FORMA DE PAGAMENTO E INADIMPLÊNCIA</u></b>",
      clause3_1,
      clause3_1_a,
      clause3_1_b,
      `<mark>3.2.</mark> Em caso de inadimplência incidirá <b>multa no importe de 10% (dez por cento)</b> do valor da parcela e <b>juros de mora correspondente a 1% (um por cento) ao mês</b>.`,
      `<mark>3.3.</mark> Caso a inadimplência persista por prazo superior a <b>30 (trinta) dias</b>, será facultado ao VENDEDOR, visando assegurar o seu crédito, independente de notificação prévia, inscrever o nome do inadimplente em bancos de dados cadastrais (SPC/SERASA/DPC ou órgão equivalente), protestar o débito, valer-se de firma especializada ou contratar advogados. Sendo que, neste caso, o COMPRADOR responderá pelos honorários destes profissionais.`,
      `<mark>3.4.</mark> A falta de pagamento por prazo superior a <b>60 (sessenta) dias</b>, poderá acarretar na rescisão deste contrato, por liberalidade do VENDEDOR.`,
      `<mark>3.5.</mark> Enquanto o COMPRADOR estiver em situação de inadimplemento, <b>ficará impedido de utilizar a embarcação</b>, até efetiva quitação do débito, sem direito a qualquer indenização, reclamação ou reposição dos dias em que deixou de utilizar o bem.`,
      `<mark>3.6.</mark> Eventuais custos com revisões, reparos, manutenções, consertos, troca de peças ou acessórios e melhorias não estão inclusos no valor de aquisição.`,
      "<b>4. <u>DA TRANSFERÊNCIA DE TITULARIDADE DA COTA</u></b>",
      `<mark>4.1.</mark> O registro de propriedade da embarcação está em nome do VENDEDOR, após quitação total do valor da embarcação, poderá ser transferida para o nome de algum dos coproprietários ou terceiro indicado por estes.`,
      `<mark>4.2.</mark> O COMPRADOR/COTISTA poderá vender sua cota, respeitando o limite de sua participação, <b>desde que tenha quitado o valor total</b> correspondente a sua cota perante o VENDEDOR.`,
      `<mark>4.4.</mark> Para novo cadastro ou transferência da titularidade da COTA, será devido a ADMINISTRADORA uma <b>taxa de transferência</b>, pagos diretamente à ADMINISTRADORA pelo futuro COMPRADOR.`,
      "<b>5. <u>DAS OBRIGAÇÕES DO COMPRADOR</u></b>",
      `<mark>5.1.</mark> O COMPRADOR será responsável pela condução e conservação da embarcação adquirida, devendo garantir a utilização do bem em conformidade com as normas internas.`,
      `<mark>5.2.</mark> O COMPRADOR se compromete, de modo pessoal e irrestrito, a reparar todos os danos e prejuízos ocorridos em virtude do uso da embarcação, por si, seus dependentes ou terceiros.`,
      `<mark>5.3.</mark> Em caso de qualquer sinistro/acidente envolvendo a embarcação, o COMPRADOR fica obrigado a comunicar imediatamente ao VENDEDOR e a ADMINISTRADORA.`,
      "<b>6. <u>DAS AULAS PRÁTICAS</u></b>",
      `<mark>6.1.</mark> Está incluso na taxa de cadastro/transferência o direito a <b>3 (três) aulas práticas</b> para instruções de condução e utilização da embarcação.`,
      "<b>7. <u>DA GARANTIA</u></b>",
      `<mark>7.1.</mark> A Embarcação terá cobertura de <b>GARANTIA DE 3 (TRÊS) meses</b>, fornecido pela (MEXICANO LANCHAS), para defeitos de fabricação.`,
      "<b>8. <u>DA VIGÊNCIA, RESCISÃO E DESISTÊNCIA DA AQUISIÇÃO</u></b>",
      `<mark>8.1.</mark> Este contrato iniciará sua vigência na data de sua assinatura e terminará com o cumprimento de todas as obrigações aqui contraídas.`,
      "<b>9. <u>DISPOSIÇÕES FINAIS</u></b>",
      `<mark>9.1.</mark> O COMPRADOR declara neste ato que realizou a vistoria da embarcação adquirida, reconhecendo plenamente o seu estado e funcionamento.`,
      `<mark>9.11.</mark> Fica eleito o foro central da <b>Comarca de Petrolina, no Estado de Pernambuco</b>, para dirimir quaisquer questões ou controvérsia derivada deste contrato. E, por estarem assim justos e contratados, as partes assinam na presença de 2(duas) testemunhas, o presente termo.`
    ];

    clauses.forEach(c => {
      writeRichParagraph(c);
    });

    checkPageBreak(45);
    cursorY += 15;
    
    doc.text('______________________________________', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.setFont("helvetica", "bold");
    doc.text('MEXICANO LANCHAS LTDA', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 15;
    
    doc.setFont("helvetica", "normal");
    doc.text('______________________________________', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`${clientData.nome?.toUpperCase() || 'COMPRADOR'}`, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`CPF: ${clientData.cpf || 'N/A'}`, pageWidth / 2, cursorY, { align: 'center' });
    
  } else {
    drawHeaderLogo();
    writeTitle('CONTRATO DE ADMINISTRAÇÃO PARA EMBARCAÇÃO DE USO COMPARTILHADO');

    const rgFormatted = clientData.rg ? `${clientData.rg.trim()}${clientData.orgaoEmissor ? ` ${clientData.orgaoEmissor.trim()}` : ''}` : 'NÃO INFORMADA';
    const chaFormatted = clientData.cnh_cha || clientData.numeroHabilitacao || 'NÃO INFORMADA';
    const validadeFormatted = clientData.validadeHabilitacao || 'NÃO INFORMADA';
    const emissorFormatted = clientData.orgaoEmissorHabilitacao || 'NÃO INFORMADA';
    const emailFormatted = clientData.email ? clientData.email.trim().toUpperCase() : 'NÃO INFORMADO';
    const telFormatted = clientData.telefone || 'NÃO INFORMADO';
    const cidadeUfFormatted = clientData.cidade && clientData.estado ? `${clientData.cidade.trim().toUpperCase()}-${clientData.estado.trim().toUpperCase()}` : (clientData.cidade?.toUpperCase() || 'PETROLINA-PE');

    const clientStr = `CONTRATANTE: <b>${clientData.nome || 'NÃO INFORMADO'}</b>, inscrito sob CPF nº: <b>${clientData.cpf || 'NÃO INFORMADO'}</b>, RG: <b>${rgFormatted}</b>, Carteira Náutica nº <b>${chaFormatted}</b>, válida até: <b>${validadeFormatted}</b>, órgão emissor: <b>${emissorFormatted}</b>, residente e domiciliado na <b>${fullAddress}</b>, cidade: <b>${cidadeUfFormatted}</b>, endereço eletrônico: <b>${emailFormatted}</b>, WhatsApp: <b>${telFormatted}</b>.`;
    const vendorStr = `CONTRATADO/ADMINISTRADOR: <b>VALE ADMINISTRADORA NAUTICA</b>, pessoa jurídica de direito privado, <b>CNPJ: 62.794.642/0001-67</b> com sede situada na cidade de <b>PETROLINA-PE</b>, no <b>LOTEAMENTO LOTE 190, Nº 190, ESTRADA DA TAPERA, CEP: 56.334-899</b>, endereço eletrônico: <b>atendimentovaleadm@gmail.com</b>, WhatsApp: <b>(87)9 9109-0051</b>.`;
    
    writeRichParagraph(clientStr);
    writeRichParagraph(vendorStr);

    const clauses = [
      `<u>CONSIDERANDO</u> que o CONTRATANTE firmou contrato para aquisição de copropriedade da embarcação <b>${formatBoatName(boatData.nome) || 'N/A'}</b>, se comprometendo a pactuar contrato de administração da embarcação com empresa <b>VALE ADMINISTRADORA NÁUTICA</b>, obrigatoriamente até a quitação integral do valor da embarcação por todos os coproprietários;`,
      "<u>CONSIDERANDO</u> que apesar de se tratar de embarcação de uso compartilhado, os coproprietários são pessoas independentes, sendo cada um responsável pelo cumprimento de seus direitos e obrigações individuais e coletivos;",
      "<u>CONSIDERANDO</u> que os Coproprietários estão de acordo com a gestão da embarcação por uma empresa especializada por se tratar de aquisição em “uso compartilhado” e a <b>VALE ADMINISTRADORA DE BENS NÁUTICOS</b> possui a expertise necessária para o referido serviço.",
      "As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Administração Para Embarcação de Uso Compartilhado, que se regerá pelas cláusulas a seguir descritas.",
      "<b>1. <u>DO OBJETO</u></b>",
      `1.1. Constitui-se objeto deste contrato o serviço de gerenciamento completo da embarcação: Nº de inscrição: <b>${boatData.inscricao || 'N/A'}</b>, Tipo de propulsão: <b>${boatData.tipo_propulsao || 'MOTOR'}</b>, potência: <b>${boatData.potencia || 'N/A'}</b>, Nº de CHASSI: <b>${boatData.chassi || 'N/A'}</b>, por parte do ADMINISTRADOR em favor do CONTRATANTE, o qual possui copropriedade do referido bem, possuindo direitos e obrigações individuais e coletivos.`,
      `<mark>1.2.</mark> <b>O ADMINISTRADOR desempenhará as seguintes funções:</b>\na) Comunicação e suporte nas tratativas entre os coproprietários;\nb) Acompanhamento de manutenções corretivas e preventivas do bem;\nc) Gestão financeira referente a embarcação;\nd) Controle de inadimplência dos coproprietários, uso e reserva da embarcação;\ne) Gerenciamento do aplicativo de reservas;\nf) Controle e fiscalização do cumprimento das normas que constam no Manual de Condutas e Procedimentos internos;\ng) Contratação de empresa especializada ou prestador de serviços autônomo para locação de vaga para guarda da embarcação, limpeza, manutenção e demais serviços necessários a conservação e funcionamento da embarcação, prestando auxílio e suporte aos terceirizados;\nh) Solicitações e tratativas com a Marina responsável por alocar o bem, inclusive para solicitar descida e subida da embarcação para utilização pelo CONTRATANTE.`,
      "<b>2. <u>DAS CONDIÇÕES DE UTILIZAÇÃO DA EMBARCAÇÃO</u></b>",
      `<mark>2.1.</mark> O CONTRATANTE deverá realizar a reserva para utilização da embarcação através do <b>SISTEMA DE RESERVAS DA VALE ADMINISTRADORA DE BENS NÁUTICOS</b>, com direito a <b>01 (um) sábado e 01 (um) domingo por mês</b>, podendo utilizar de <b>quarta a sexta-feira livremente</b>, conforme disponibilidade prévia, porem limitando-se a até <b>2 (duas) datas agendadas simultaneamente</b>.`,
      `<mark>2.2.</mark> O CONTRATANTE que não utilizar o seu sábado e/ou domingo mensal <b>não terá direito a compensação no mês seguinte</b>, bem como não se eximirá do rateio de quaisquer custos comuns a utilização da embarcação.`,
      `<mark>2.3.</mark> O uso da embarcação deverá obedecer ao <b>Manual de Condutas e Procedimentos internos</b> da <b>VALE ADMINISTRADORA DE BENS NAUTICOS</b>.`,
      `<mark>2.4.</mark> A embarcação estará disponível para utilização de <b>quarta a domingo</b>, podendo o CONTRATANTE solicitar a reserva no mesmo dia em que irá utilizar, respeitando o horário de <b>09h às 17h</b>.`,
      `<mark>2.6.</mark> Ao receber a embarcação, o CONTRATANTE recebe também uma <b>relação impressa indicativa dos certificados, manuais e outros documentos</b>, além de equipamentos, aparelhos, acessórios e utensílios existentes na embarcação, sendo devido também que o CONTRATANTE <b>inspecione a embarcação na água, antes da partida</b>.`,
      `<mark>2.7.</mark> Antes de embarcar, o CONTRATANTE deverá apresentar, ao ADMINISTRADOR, <b>plano de navegação</b>, assim como <b>relação dos passageiros</b> que o acompanharão.`,
      `<mark>2.8.</mark> É vedado ao CONTRATANTE ultrapassar a capacidade máxima da embarcação, que é de <b>2 (Dois) passageiros + 01 (UM) TRIPULANTE</b>, sabendo que crianças também são incluídas no somatório, independentemente de sua idade.`,
      `<mark>2.9.</mark> O CONTRATANTE deverá manter rigorosa fiscalização perante seus convidados e dependentes, evitando assim possíveis exageros e danos à embarcação, pois o CONTRATANTE possui <b>total responsabilidade civil e criminal</b> por quaisquer danos ocasionadas a embarcação ou a terceiros.`,
      `<mark>2.10.</mark> O CONTRATANTE é responsável pela <b>solicitação automática de abastecimento assim que chegar de volta do seu passeio</b>, devendo realizar o acompanhamento do abastecimento imediato para devolução da embarcação a marina.`,
      `<mark>2.11.</mark> Os custos gerados para manutenção e utilização da embarcação, serão <b>rateados pelos coproprietários</b>, ora CONTRATANTES, na proporção da participação de cada um, salvo em caso de negligência.`,
      "<b>3. <u>DA RESERVA</u></b>",
      `<mark>3.1.</mark> Para utilização da embarcação, o CONTRATANTE deverá realizar a reserva da data, sendo permitido apenas <b>02 (duas) reservas simultâneas</b>, sendo necessário utilizar ou desmarcar alguma para conseguir agendar outra, em atenção ao disposto no item 2.1.`,
      `<mark>3.2.</mark> Caso o CONTRATANTE necessite cancelar a reserva, sem penalidades, deverá comunicar ao ADMINISTRADOR até as <b>18 (dezoito) horas do dia anterior</b> a referida data, sob pena de pagamento de <b>taxa de desistência no importe de R$ 50,00 (cinquenta reais)</b>.`,
      "<b>4. <u>DAS DELIBERAÇÕES SOBRE OS CUSTOS DA EMBARCAÇÃO E RATEIO</u></b>",
      `<mark>4.1.</mark> Os custos gerados pela embarcação serão <b>rateados pelos coproprietários</b>, na medida do percentual da propriedade de cada um. Além dos custos gerados pela embarcação, os coproprietários pagarão, individualmente, uma <b>Taxa de Administração para o ADMINISTRADOR</b>.`,
      "<b>5. <u>DOS VALORES DEVIDO AO ADMINISTRADOR</u></b>",
      `<mark>5.1.</mark> Em decorrência do serviço prestado pelo ADMINISTRADOR, será devido o <b>pagamento mensal de R$ 1.260,00</b>, o qual será dividido e custeado da seguinte forma:\na) Embarcação possuindo 4 PROPRIETÁRIOS: cada um arcará com <b>25% (vinte e cinco por cento) do valor da mensalidade, que corresponde a R$ 315,00</b>.`,
      "<b>6. <u>RESPONSABILIDADES DO ADMINISTRADOR</u></b>",
      `<mark>6.1.</mark> <b>Fazer cumprir as regras do compartilhamento da embarcação</b> no que tange ao uso pelos coproprietários e seus dependentes, atuando de forma imparcial.`,
      "<b>7. <u>RESPONSABILIDADES DO CONTRATANTE</u></b>",
      `<mark>7.1.</mark> O CONTRATANTE obriga-se a <b>usar a embarcação com estrita observância das instruções recebidas do ADMINISTRADOR</b>.`,
      "<b>8. <u>DA INADIMPLÊNCIA</u></b>",
      `<mark>8.1.</mark> A falta de pagamento até o dia do vencimento de quaisquer valores devidos ao ADMINISTRADOR em decorrência deste contrato, acarretará na aplicação de <b>multa de 2% (dois por cento)</b> sobre o valor do débito e <b>juros de 1% (um por cento) ao mês</b>.`,
      "<b>9. <u>NOTIFICAÇÕES E PENALIDADES</u></b>",
      `<mark>9.1.</mark> Salvo disposição específica, em caso de descumprimento dos termos e condições dispostos neste instrumento e/ou Manual de Condutas e Procedimentos internos, quando possível o seu saneamento, o ADMINISTRADOR notificará o CONTRATANTE.`,
      "<b>10. <u>DA TRANSFERÊNCIA DE TITULARIDADE DA COTA</u></b>",
      `<mark>10.1.</mark> O CONTRATANTE poderá transferir a titularidade de sua propriedade (a cota da Embarcação) para um terceiro a qualquer tempo, <b>desde que o valor da cota esteja quitado</b>.`,
      "<b>11. <u>FISCALIZAÇÃO E MULTAS</u></b>",
      `<mark>11.1.</mark> Em caso de Fiscalização da Autoridade Marítima brasileira, se a documentação do CONTRATANTE ou da embarcação estiver em desacordo ou se este houver infringido alguma regulamentação da Marinha, será lavrada a notificação.`,
      "<b>12. <u>DAS RESPONSABILIDADES SOBRE AVARIAS E VISTORIAS</u></b>",
      `<mark>12.1.</mark> O ADMINISTRADOR recomenda, para se resguardar, que o CONTRATANTE <b>faça a vistoria e grave um vídeo para registro do estado geral da embarcação em todos os passeios</b>, na saída e no retorno.`,
      "<b>13. <u>DAS AULAS PRÁTICAS</u></b>",
      `<mark>13.1.</mark> O ADMINISTRADOR concederá ao CONTRATANTE <b>03 (três) aulas práticas</b> para instruções de condução e utilização da embarcação.`,
      "<b>14. <u>DA VIGÊNCIA E RESCISÃO DESTE CONTRATO</u></b>",
      `<mark>14.1.</mark> Este contrato entra em vigor na data da assinatura e <b>vigorará por prazo indeterminado</b>.`,
      "<b>15. <u>DAS DISPOSIÇÕES FINAIS</u></b>",
      `<mark>15.10.</mark> Fica eleito o foro central da <b>Comarca de Petrolina, no Estado de Pernambuco</b>, para dirimir quaisquer questões ou controvérsia derivada deste contrato.`
    ];

    clauses.forEach(c => {
      writeRichParagraph(c);
    });

    checkPageBreak(45);
    cursorY += 15;
    
    doc.text('______________________________________', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.setFont("helvetica", "bold");
    doc.text('VALE ADMINISTRADORA DE BENS NÁUTICOS LTDA', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 15;
    
    doc.setFont("helvetica", "normal");
    doc.text('______________________________________', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`${clientData.nome?.toUpperCase() || 'CONTRATANTE'}`, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.text(`CPF: ${clientData.cpf || 'N/A'}`, pageWidth / 2, cursorY, { align: 'center' });
  }

  // Save the PDF
  doc.save(`Contrato_${type}_${clientData.nome || 'Cliente'}.pdf`);
}
