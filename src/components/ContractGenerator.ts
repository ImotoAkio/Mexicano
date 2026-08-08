import { jsPDF } from 'jspdf';
// @ts-ignore
import logoSrc from '../assets/images/vale_nauticos_logo_1780256879963.png';

interface ClientData {
  nome?: string;
  cpf?: string;
  rg?: string;
  cnh_cha?: string;
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
}

// Helper to load image
const getLogoImage = async (): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = logoSrc;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });
};

export async function generateContract(type: 'adm' | 'aquisicao', clientData: ClientData, boatData: BoatData, paymentData?: PaymentData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const margins = { top: 30, left: 20, right: 20, bottom: 20 };
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
      const imgW = 40;
      const imgH = 25;
      doc.addImage(logoImg, 'PNG', (pageWidth - imgW) / 2, 10, imgW, imgH);
      cursorY = 45;
    }
  };

  const writeTitle = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(title, textWidth);
    checkPageBreak(lines.length * 6 + 10);
    doc.text(lines, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += lines.length * 6 + 10;
  };

  const writeParagraph = (text: string, isBold = false, fontSize = 10, align: 'left' | 'justify' | 'center' = 'justify') => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    
    const lines = doc.splitTextToSize(text, textWidth);
    
    for (let i = 0; i < lines.length; i++) {
      checkPageBreak(6);
      doc.text(lines[i], margins.left, cursorY, { align: align === 'center' ? 'center' : 'left', maxWidth: textWidth });
      cursorY += 5; // Line height
    }
    cursorY += 4; // Paragraph spacing
  };

  if (type === 'aquisicao') {
    drawHeaderLogo();
    writeTitle('CONTRATO DE AQUISIÇÃO DE COPROPRIEDADE DE EMBARCAÇÃO');
    
    const clientStr = `COMPRADOR: Nome: ${clientData.nome || 'N/A'}, Nacionalidade: BRASILEIRO, Estado civil: ${clientData.estadoCivil || 'N/A'}, Profissão: ${clientData.profissao || 'N/A'}, inscrito no CPF sob o nº ${clientData.cpf || 'N/A'}, portador da carteira de identidade nº ${clientData.rg || 'N/A'}, Endereço: ${clientData.logradouro || ''}, n°${clientData.numeroEnd || ''}, Bairro: ${clientData.bairro || ''}, Cidade/UF: ${clientData.cidade || ''}/${clientData.estado || ''}, CEP:${clientData.cep || ''}, contato (WhatsApp): ${clientData.telefone || 'N/A'}`;
    const vendorStr = `VENDEDOR: MEXICANO LANCHAS LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 42.206.594/0001-31 com sede, situada na cidade de Petrolina-PE, no Loteamento Lote 190, nº 190, Estrada da Tapera, CEP: 56334-899, endereço eletrônico: vendasmexicanolanchas@gmail.com, WhatsApp: (87)9 9655-2883.`;
    const introStr = `As partes acima identificadas têm, entre si, justo e acertado o presente contrato para aquisição de cota de embarcação, que se regerá pelas cláusulas a seguir descritas.`;

    writeParagraph(clientStr);
    writeParagraph(vendorStr);
    writeParagraph(introStr);

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

    const clause3_1 = `3.1. O COMPRADOR pagará pela aquisição de ${cotaPercentual} (${cotaExtenso}) da propriedade da embarcação, objeto deste contrato, o valor de ${vTotal} a ser efetuado da seguinte forma:`;
    const clause3_1_a = `a) Pagamento de ${vEntrada} a título de entrada, que será pago à vista no momento da assinatura do presente contrato.`;
    const clause3_1_b = `b) O valor remanescente de ${vRemanescente} (${vRemExtenso}), deverá ser pago em ${nParc} (${nParcExtenso}) parcelas de ${vParcela} (${vParcExtenso}), mediante ${formaPag}, com o vencimento para o dia ${diaVenc} de cada mês, servindo comprovante de pagamento/transferência como recibo de quitação.`;

    const clauses = [
      "1. OBJETO",
      `1.1. Este contrato tem como objeto a aquisição de copropriedade de embarcação, correspondente a ${clientData.cota || '25%'} do total, pelo COMPRADOR, qual seja: ${boatData.nome || 'N/A'} modelo: ${boatData.modelo || 'N/A'}, Nº do chassi: ${boatData.chassi || 'N/A'}.`,
      `1.2. NÚMERO DE INSCRIÇÃO: ${boatData.inscricao || 'N/A'}, Tipo de propulsão: ${boatData.tipo_propulsao || 'MOTOR'}, potencia: ${boatData.potencia || 'N/A'}.`,
      "2. DAS CONDIÇÕES DE AQUISIÇÃO E UTILIZAÇÃO DA EMBARCAÇÃO",
      "2.1. O COMPRADOR está ciente que a presente compra se dará de modo compartilhado, juntamente com mais 3 (três) coproprietários, não possuindo o COMPRADOR nenhum poder de intervir na escolha dos demais coproprietários, sendo estes escolhidos por liberalidade única e exclusiva do VENDEDOR, os quais firmarão individualmente negócio jurídico com a MEXICANO LANCHAS.",
      "2.2. Os custos gerados para manutenção e utilização da embarcação, serão rateados pelos COPROPRIETÁRIOS, na proporção da participação de cada um, salvo em caso de negligência, imperícia ou imprudência praticada, no qual o COPROPRIETÁRIO infrator, arcará individualmente com o reparo dos danos.",
      "2.3. O COMPRADOR se compromete a firmar contrato para ADMINISTRAÇÃO da embarcação juntamente a MEXICANO LANCHAS, visto que por se tratar de uma compra de embarcação de modo compartilhado, para manter a organização e isonomia do seu uso, se faz necessário a manutenção do bem por empresa especializada.",
      "2.3.1. A embarcação só poderá ser administrada por outra empresa que não seja integrante do grupo MEXICANO LANCHAS, após a quitação de 100% (cem por cento) do valor total da embarcação, bem como outros débitos relacionados a manutenção, serviço, abastecimentos e demais custos decorrentes da embarcação devidos a MEXICANO LANCHAS.",
      "2.4. Ao firmar o presente contrato, o COMPRADOR garante que cumprirá todas as normas internas de utilização da embarcação e do Estatuto dos Cotistas, passadas pela ADMINISTRADORA e/ou VENDEDOR.",
      "2.5. O COMPRADOR tem ciência que para utilização de Moto Aquática, deverá obrigatoriamente possuir Carteira de Habilitação de Motonauta (MTA), devendo estar regular e adimplente perante os órgãos fiscalizadores, estando seu acesso ao sistema de agendamento/reservas condicionado a apresentação da referida habilitação.",
      "2.5.1. Caso o COMPRADOR ainda não possua a carteira de habilitação de Motonauta (MTA), poderá adquirir a cota, porém só terá seu acesso ao sistema de agendamento liberado após apresentação do referido documento de habilitação.",
      "2.6. É vedado a qualquer COPROPRIETÁRIO da embarcação: (i)remover a embarcação da marina ou da água para transitar por terra; (ii) uso da embarcação para fins comerciais/exploração econômica ou qualquer fim ilícito; (iv) cessão ou empréstimo da embarcação para terceiros sem a presença do COMPRADOR ou alguns de seus dependentes, devidamente identificados junto a ADMINISTRADORA; (vii) uso para empurrar, puxar ou rebocer outra embarcação ;(viii)uso para transporte de produtos inflamáveis ou explosivos; (ix)permitir que a pilotagem ou condução da embarcação em estado de embriagues, por si ou por teceiros; (x)uso ou porte de substância psicotrópica, narcótica ou similar.",
      "2.6.1. Em caso de descumprimento dos itens elencados no item 2.6, a parte infratora arcará com multa no valor de 2 (dois) salários mínimos vigentes a época, que serão destinados a ADMINISTRADORA para custos de manutenção e conservação da embarcação.",
      "2.6.2. Além da multa acima prevista, eventuais danos ocasionados ao bem ou a terceiros pela prática de algum dos itens descritos no item 2.6, a parte infratora arcará individualmente com estes, sem direito a ressarcimento pelos demais coproprietários.",
      "3. DO PREÇO, FORMA DE PAGAMENTO E INADIMPLÊNCIA",
      clause3_1,
      clause3_1_a,
      clause3_1_b,
      "3.2. Em caso de inadimplência incidirá multa no importe de 10% (dez por cento) do valor da parcela e juros de mora correspondente a 1% (um por cento) ao mês.",
      "3.3. Caso a inadimplência persista por prazo superior a 30(trinta) dias, será facultado ao VENDEDOR, visando assegurar o seu crédito, independente de notificação prévia, inscrever o nome do inadimplente em bancos de dados cadastrais (SPC/SERASA/DPC ou órgão equivalente), protestar o débito, valer-se de firma especializada ou contratar advogados. Sendo que, neste caso, o COMPRADOR responderá pelos honorários destes profissionais.",
      "3.4. A falta de pagamento por prazo superior a 60 (sessenta) dias, poderá acarretar na rescisão deste contrato, por liberalidade do VENDEDOR.",
      "3.5. Enquanto o COMPRADOR estiver em situação de inadimplemento, ficará impedido de utilizar a embarcação, até efetiva quitação do débito, sem direito a qualquer indenização, reclamação ou reposição dos dias em que deixou de utilizar o bem.",
      "3.6. Eventuais custos com revisões, reparos, manutenções, consertos, troca de peças ou acessórios e melhorias não estão inclusos no valor de aquisição.",
      "4. DA TRANSFERÊNCIA DE TITULARIDADE DA COTA",
      "4.1. O registro de propriedade da embarcação está em nome do VENDEDOR, após quitação total do valor da embarcação, poderá ser transferida para o nome de algum dos coproprietários ou terceiro indicado por estes.",
      "4.2. O COMPRADOR/COTISTA poderá vender sua cota, respeitando o limite de sua participação, desde que tenha quitado o valor total correspondente a sua cota perante o VENDEDOR.",
      "4.4. Para novo cadastro ou transferência da titularidade da COTA, será devido a ADMINISTRADORA uma taxa de transferência, pagos diretamente à ADMINISTRADORA pelo futuro COMPRADOR.",
      "5. DAS OBRIGAÇÕES DO COMPRADOR",
      "5.1. O COMPRADOR será responsável pela condução e conservação da embarcação adquirida, devendo garantir a utilização do bem em conformidade com as normas internas.",
      "5.2. O COMPRADOR se compromete, de modo pessoal e irrestrito, a reparar todos os danos e prejuízos ocorridos em virtude do uso da embarcação, por si, seus dependentes ou terceiros.",
      "5.3. Em caso de qualquer sinistro/acidente envolvendo a embarcação, o COMPRADOR fica obrigado a comunicar imediatamente ao VENDEDOR e a ADMINISTRADORA.",
      "6. DAS AULAS PRÁTICAS",
      "6.1. Está incluso na taxa de cadastro/transferência o direito a 3 (três) aulas práticas para instruções de condução e utilização da embarcação.",
      "7. DA GARANTIA",
      "7.1. A Embarcação terá cobertura de GARANTIA DE 3 (TRÊS) meses, fornecido pela (MEXICANO LANCHAS), para defeitos de fabricação.",
      "8. DA VIGÊNCIA, RESCISÃO E DESISTÊNCIA DA AQUISIÇÃO",
      "8.1. Este contrato iniciará sua vigência na data de sua assinatura e terminará com o cumprimento de todas as obrigações aqui contraídas.",
      "9. DISPOSIÇÕES FINAIS",
      "9.1. O COMPRADOR declara neste ato que realizou a vistoria da embarcação adquirida, reconhecendo plenamente o seu estado e funcionamento.",
      "9.11. Fica eleito o foro central da Comarca de Petrolina, no Estado de Pernambuco, para dirimir quaisquer questões ou controvérsia derivada deste contrato. E, por estarem assim justos e contratados, as partes assinam na presença de 2(duas) testemunhas, o presente termo."
    ];

    clauses.forEach(c => {
      const isHeader = c.match(/^[0-9]+\. [A-Z]/);
      writeParagraph(c, !!isHeader);
    });

    checkPageBreak(50);
    cursorY += 20;
    
    // Assinaturas
    doc.text('______________________________________', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.text('MEXICANO LANCHAS LTDA', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 15;
    
    doc.text('______________________________________', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.text(`${clientData.nome?.toUpperCase() || 'COMPRADOR'}`, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.text(`CPF: ${clientData.cpf || 'N/A'}`, pageWidth / 2, cursorY, { align: 'center' });
    
  } else {
    // CONTRATO DE ADMINISTRAÇÃO
    drawHeaderLogo();
    writeTitle('CONTRATO DE ADMINISTRAÇÃO PARA EMBARCAÇÃO DE USO COMPARTILHADO');

    const clientStr = `CONTRATANTE: ${clientData.nome || 'N/A'}, inscrito sob CPF nº: ${clientData.cpf || 'N/A'}, RG: ${clientData.rg || 'N/A'}, Carteira Náutica nº ${clientData.cnh_cha || 'NÃO INFORMADA'}, válido até: NÃO INFORMADA, órgão emissor: NÃO INFORMADA, residente e domiciliado na ${clientData.logradouro || ''}, N°${clientData.numeroEnd || ''} BAIRRO: ${clientData.bairro || ''} , ${clientData.cidade || ''}-${clientData.estado || ''}, CEP:${clientData.cep || ''}, cidade: ${clientData.cidade || ''}-${clientData.estado || ''}, endereço eletrônico: ${clientData.email || 'N/A'}, WhatsApp: ${clientData.telefone || 'N/A'}.`;
    const vendorStr = `CONTRATADO/ADMINISTRADOR: VALE ADMINISTRADORA NAUTICA, pessoa jurídica de direito privado, CNPJ: 62.794.642/0001-67 com sede situada na cidade de PETROLINA-PE, no LOTEAMENTO LOTE 190, Nº 190, ESTRADA DA TAPERA, CEP: 56.334-899, endereço eletrônico: atendimentovaleadm@gmail.com, WhatsApp: (87)9 9109-0051.`;
    
    writeParagraph(clientStr);
    writeParagraph(vendorStr);

    const clauses = [
      `CONSIDERANDO que o CONTRATANTE firmou contrato para aquisição de copropriedade da embarcação ${boatData.nome || 'N/A'}, se comprometendo a pactuar contrato de administração da embarcação com empresa VALE ADMINISTRADORA NÁUTICA, obrigatoriamente até a quitação integral do valor da embarcação por todos os coproprietários;`,
      "CONSIDERANDO que apesar de se tratar de embarcação de uso compartilhado, os coproprietários são pessoas independentes, sendo cada um responsável pelo cumprimento de seus direitos e obrigações individuais e coletivos;",
      "CONSIDERANDO que os Coproprietários estão de acordo com a gestão da embarcação por uma empresa especializada por se tratar de aquisição em 'uso compartilhado' e a VALE ADMINISTRADORA DE BENS NÁUTICOS possui a expertise necessária para o referido serviço.",
      "As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Administração Para Embarcação de Uso Compartilhado, que se regerá pelas cláusulas a seguir descritas.",
      "1. DO OBJETO",
      `1.1. Constitui-se objeto deste contrato o serviço de gerenciamento completo da embarcação: Nº de inscrição: ${boatData.inscricao || 'N/A'}, Tipo de propulsão: ${boatData.tipo_propulsao || 'MOTOR'}, potência: ${boatData.potencia || 'N/A'}, Nº de CHASSI: ${boatData.chassi || 'N/A'}, por parte do ADMINISTRADOR em favor do CONTRATANTE, o qual possui copropriedade do referido bem, possuindo direitos e obrigações individuais e coletivos.`,
      "1.2. O ADMINISTRADOR desempenhará as seguintes funções:\na) Comunicação e suporte nas tratativas entre os coproprietários;\nb) Acompanhamento de manutenções corretivas e preventivas do bem;\nc) Gestão financeira referente a embarcação;\nd) Controle de inadimplência dos coproprietários, uso e reserva da embarcação;\ne) Gerenciamento do aplicativo de reservas;\nf) Controle e fiscalização do cumprimento das normas que constam no Manual de Condutas e Procedimentos internos;\ng) Contratação de empresa especializada ou prestador de serviços autônomo para locação de vaga para guarda da embarcação, limpeza, manutenção e demais serviços necessários a conservação e funcionamento da embarcação, prestando auxílio e suporte aos terceirizados;\nh) Solicitações e tratativas com a Marina responsável por alocar o bem, inclusive para solicitar descida e subida da embarcação para utilização pelo CONTRATANTE.",
      "2. DAS CONDIÇÕES DE UTILIZAÇÃO DA EMBARCAÇÃO",
      "2.1. O CONTRATANTE deverá realizar a reserva para utilização da embarcação através do SISTEMA DE RESERVAS DA VALE ADMINISTRADORA DE BENS NÁUTICOS, com direito a 01 (um) sábado e 01 (um) domingo por mês, podendo utilizar de quarta a sexta-feira livremente, conforme disponibilidade prévia, porem limitando-se a até 2 (duas) datas agendadas simultaneamente.",
      "2.2. O CONTRATANTE que não utilizar o seu sábado e/ou domingo mensal não terá direito a compensação no mês seguinte, bem como não se eximirá do rateio de quaisquer custos comuns a utilização da embarcação.",
      "2.3. O uso da embarcação deverá obedecer ao Manual de Condutas e Procedimentos internos da VALE ADMINISTRADORA DE BENS NAUTICOS.",
      "2.4. A embarcação estará disponível para utilização de quarta a domingo, podendo o CONTRATANTE solicitar a reserva no mesmo dia em que irá utilizar, respeitando o horário de 09h às 17h.",
      "2.6. Ao receber a embarcação, o CONTRATANTE recebe também uma relação impressa indicativa dos certificados, manuais e outros documentos, além de equipamentos, aparelhos, acessórios e utensílios existentes na embarcação, sendo devido também que o CONTRATANTE inspecione a embarcação na água, antes da partida.",
      "2.7. Antes de embarcar, o CONTRATANTE deverá apresentar, ao ADMINISTRADOR, plano de navegação, assim como relação dos passageiros que o acompanharão.",
      "2.8. É vedado ao CONTRATANTE ultrapassar a capacidade máxima da embarcação, que é de 2 (Dois) passageiros + 01 (UM) TRIPULANTE, sabendo que crianças também são incluídas no somatório, independentemente de sua idade.",
      "2.9. O CONTRATANTE deverá manter rigorosa fiscalização perante seus convidados e dependentes, evitando assim possíveis exageros e danos à embarcação, pois o CONTRATANTE possui total responsabilidade civil e criminal por quaisquer danos ocasionadas a embarcação ou a terceiros.",
      "2.10. O CONTRATANTE é responsável pela solicitação automática de abastecimento assim que chegar de volta do seu passeio, devendo realizar o acompanhamento do abastecimento imediato para devolução da embarcação a marina.",
      "2.11. Os custos gerados para manutenção e utilização da embarcação, serão rateados pelos coproprietários, ora CONTRATANTES, na proporção da participação de cada um, salvo em caso de negligência.",
      "3. DA RESERVA",
      "3.1. Para utilização da embarcação, o CONTRATANTE deverá realizar a reserva da data, sendo permitido apenas 02 (duas) reservas simultâneas, sendo necessário utilizar ou desmarcar alguma para conseguir agendar outra, em atenção ao disposto no item 2.1.",
      "3.2. Caso o CONTRATANTE necessite cancelar a reserva, sem penalidades, deverá comunicar ao ADMINISTRADOR até as 18 (dezoito) horas do dia anterior a referida data, sob pena de pagamento de taxa de desistência no importe de R$ 50,00 (cinquenta reais).",
      "4. DAS DELIBERAÇÕES SOBRE OS CUSTOS DA EMBARCAÇÃO E RATEIO",
      "4.1. Os custos gerados pela embarcação serão rateados pelos coproprietários, na medida do percentual da propriedade de cada um. Além dos custos gerados pela embarcação, os coproprietários pagarão, individualmente, uma Taxa de Administração para o ADMINISTRADOR.",
      "5. DOS VALORES DEVIDO AO ADMINISTRADOR",
      "5.1. Em decorrência do serviço prestado pelo ADMINISTRADOR, será devido o pagamento mensal de R$ 1.260,00, o qual será dividido e custeado da seguinte forma:\na) Embarcação possuindo 4 PROPRIETÁRIOS: cada um arcará com 25% (vinte e cinco por cento) do valor da mensalidade, que corresponde a R$ 315,00.",
      "6. RESPONSABILIDADES DO ADMINISTRADOR",
      "6.1. Fazer cumprir as regras do compartilhamento da embarcação no que tange ao uso pelos coproprietários e seus dependentes, atuando de forma imparcial.",
      "7. RESPONSABILIDADES DO CONTRATANTE",
      "7.1. O CONTRATANTE obriga-se a usar a embarcação com estrita observância das instruções recebidas do ADMINISTRADOR.",
      "8. DA INADIMPLÊNCIA",
      "8.1. A falta de pagamento até o dia do vencimento de quaisquer valores devidos ao ADMINISTRADOR em decorrência deste contrato, acarretará na aplicação de multa de 2% (dois por cento) sobre o valor do débito e juros de 1% (um por cento) ao mês.",
      "9. NOTIFICAÇÕES E PENALIDADES",
      "9.1. Salvo disposição específica, em caso de descumprimento dos termos e condições dispostos neste instrumento e/ou Manual de Condutas e Procedimentos internos, quando possível o seu saneamento, o ADMINISTRADOR notificará o CONTRATANTE.",
      "10. DA TRANSFERÊNCIA DE TITULARIDADE DA COTA",
      "10.1. O CONTRATANTE poderá transferir a titularidade de sua propriedade (a cota da Embarcação) para um terceiro a qualquer tempo, desde que o valor da cota esteja quitado.",
      "11. FISCALIZAÇÃO E MULTAS",
      "11.1. Em caso de Fiscalização da Autoridade Marítima brasileira, se a documentação do CONTRATANTE ou da embarcação estiver em desacordo ou se este houver infringido alguma regulamentação da Marinha, será lavrada a notificação.",
      "12. DAS RESPONSABILIDADES SOBRE AVARIAS E VISTORIAS",
      "12.1. O ADMINISTRADOR recomenda, para se resguardar, que o CONTRATANTE faça a vistoria e grave um vídeo para registro do estado geral da embarcação em todos os passeios, na saída e no retorno.",
      "13. DAS AULAS PRÁTICAS",
      "13.1. O ADMINISTRADOR concederá ao CONTRATANTE 03 (três) aulas práticas para instruções de condução e utilização da embarcação.",
      "14. DA VIGÊNCIA E RESCISÃO DESTE CONTRATO",
      "14.1. Este contrato entra em vigor na data da assinatura e vigorará por prazo indeterminado.",
      "15. DAS DISPOSIÇÕES FINAIS",
      "15.10. Fica eleito o foro central da Comarca de Petrolina, no Estado de Pernambuco, para dirimir quaisquer questões ou controvérsia derivada deste contrato."
    ];

    clauses.forEach(c => {
      const isHeader = c.match(/^[0-9]+\. [A-Z]/);
      writeParagraph(c, !!isHeader);
    });

    checkPageBreak(50);
    cursorY += 20;
    
    // Assinaturas
    doc.text('______________________________________', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.text('VALE ADMINISTRADORA DE BENS NÁUTICOS LTDA', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 15;
    
    doc.text('______________________________________', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.text(`${clientData.nome?.toUpperCase() || 'CONTRATANTE'}`, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    doc.text(`CPF: ${clientData.cpf || 'N/A'}`, pageWidth / 2, cursorY, { align: 'center' });
  }

  // Save the PDF
  doc.save(`Contrato_${type}_${clientData.nome || 'Cliente'}.pdf`);
}
