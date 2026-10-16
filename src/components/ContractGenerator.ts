import { jsPDF } from 'jspdf';
import { formatBoatName } from '../utils/constants';
import { compileTemplateToSections } from '../utils/contratoTemplates';
// @ts-ignore
import logoValeSrc from '../assets/images/vale_nauticos_logo_1780256879963.png';
// @ts-ignore
import logoMexicanoSrc from '../assets/images/logo_mexicano_trim.png';

export interface ClientData {
  nome?: string;
  cpf?: string;
  rg?: string;
  orgaoEmissor?: string;
  nacionalidade?: string;
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
  dataAssinatura?: string;
  dataCadastro?: string;
}

export interface BoatData {
  nome?: string;
  modelo?: string;
  chassi?: string;
  inscricao?: string;
  tipo_propulsao?: string;
  potencia?: string;
  tipo?: 'jet' | 'lancha' | string;
  capacidadePassageiros?: number | string;
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
  taxaMensalAdm?: string;
  taxaMensalAdmTotal?: string;
  isCustomPaymentText?: boolean;
  customPaymentText?: string;
}

const getLogoImage = async (type: 'adm' | 'aquisicao'): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = type === 'adm' ? logoValeSrc : logoMexicanoSrc;
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

export const formatAddress = (data: ClientData) => {
  const parts: string[] = [];
  if (data.logradouro) parts.push(data.logradouro.trim().toUpperCase());
  if (data.numeroEnd) parts.push(`N° ${data.numeroEnd.trim()}`);
  if (data.complemento) parts.push(data.complemento.trim().toUpperCase());
  if (data.bairro) parts.push(`BAIRRO: ${data.bairro.trim().toUpperCase()}`);
  if (data.cidade && data.estado) parts.push(`${data.cidade.trim().toUpperCase()}-${data.estado.trim().toUpperCase()}`);
  if (data.cep) parts.push(`CEP: ${data.cep.trim().replace(/\s+/g, '')}`);
  return parts.length > 0 ? parts.join(', ') : 'NÃO INFORMADO';
};

export function formatDateDDMMAAAA(dateStr?: string): string {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr.trim())) {
    return dateStr.trim();
  }
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('pt-BR');
  }
  return dateStr;
}

export function formatDateExtenso(dateStr?: string): string {
  let date = new Date();
  if (dateStr) {
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) date = d;
    }
  }
  const meses = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = meses[date.getMonth()];
  const ano = date.getFullYear();
  return `${dia} DE ${mes} DE ${ano}`;
}

export function formatDateExtensoMin(dateStr?: string): string {
  let date = new Date();
  if (dateStr) {
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) date = d;
    }
  }
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = meses[date.getMonth()];
  const ano = date.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

export interface ContractSections {
  type: 'aquisicao' | 'adm';
  title: string;
  clientStr: string;
  vendorStr: string;
  introStr?: string;
  clauses: string[];
  signCompany: {
    name: string;
    cnpj?: string;
  };
  signClient: {
    name: string;
    cpf: string;
  };
}

export function getContractSections(
  type: 'adm' | 'aquisicao',
  clientData: ClientData,
  boatData: BoatData,
  paymentData?: PaymentData,
  customSections?: ContractSections
): ContractSections {
  if (customSections) {
    return customSections;
  }
  try {
    return compileTemplateToSections(type, clientData, boatData, paymentData);
  } catch (err) {
    console.warn('[ContractGenerator] Falha ao compilar template dinâmico, usando fallback:', err);
  }

  const fullAddress = formatAddress(clientData);

  const formatR$ = (val?: string) => {
    if (!val) return '';
    const trimmed = val.trim();
    if (trimmed.startsWith('R$')) return trimmed;
    return `R$ ${trimmed}`;
  };

  if (type === 'aquisicao') {
    const title = 'CONTRATO DE AQUISIÇÃO DE COPROPRIEDADE DE EMBARCAÇÃO';
    const rgFormatted = clientData.rg
      ? `${clientData.rg.trim()}${clientData.orgaoEmissor ? ' ' + clientData.orgaoEmissor.trim() : ''}`
      : 'NÃO INFORMADO';
    const estCivil = clientData.estadoCivil ? clientData.estadoCivil.toLowerCase() : 'não informado';
    const clientStr = `COMPRADOR: Nome: <b>${clientData.nome || 'NÃO INFORMADO'}</b>, Nacionalidade: <b>${(clientData.nacionalidade || 'BRASILEIRO').toUpperCase()}</b>, Estado civil: <b>${estCivil}</b>, Profissão: <b>${clientData.profissao || 'NÃO INFORMADO'}</b>, inscrito no CPF sob o nº <b>${clientData.cpf || 'NÃO INFORMADO'}</b>, portador da carteira de identidade nº <b>${rgFormatted}</b>, Endereço: <b>${fullAddress}</b>, contato (WhatsApp): <b>${clientData.telefone || 'NÃO INFORMADO'}</b>.`;
    const vendorStr = `VENDEDOR: <b>MEXICANO LANCHAS LTDA</b>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <b>42.206.594/0001-31</b> com sede, situada na cidade de <b>Petrolina-PE, no Loteamento Lote 190, nº 190, Estrada da Tapera, CEP: 56334-899</b>, endereço eletrônico: <b>vendasmexicanolanchas@gmail.com</b>, WhatsApp: <b>(87)9 9655-2883</b>.`;
    const introStr = `As partes acima identificadas têm, entre si, justo e acertado o presente contrato para aquisição de cota de embarcação, que se regerá pelas cláusulas a seguir descritas.`;

    const cotaPercentual = clientData.cota || '25%';
    let cotaExtenso = 'vinte e cinco por cento';
    let outrosCotistasStr = '3 (três)';
    if (cotaPercentual === '12.5%' || cotaPercentual === '12,5%') {
      cotaExtenso = 'doze vírgula cinco por cento';
      outrosCotistasStr = '7 (sete)';
    } else if (cotaPercentual === '50%') {
      cotaExtenso = 'cinquenta por cento';
      outrosCotistasStr = '1 (um)';
    } else if (cotaPercentual === '100%') {
      cotaExtenso = 'cem por cento';
      outrosCotistasStr = '0 (zero)';
    }

    const isJet = boatData.tipo === 'jet' || /jet|moto\s*aqu[aá]tica|yamaha\s*1100|sea[\s-]*doo/i.test(`${boatData.nome || ''} ${boatData.modelo || ''}`);
    const boatNameRaw = formatBoatName(boatData.nome) || 'MEXICANO';
    const boatName = /^(moto aquática|lancha|embarcação)/i.test(boatNameRaw)
      ? boatNameRaw
      : `${isJet ? 'MOTO AQUÁTICA' : 'EMBARCAÇÃO'} ${boatNameRaw}`;
    const boatModelo = boatData.modelo || (isJet ? 'YAMAHA 1100' : 'N/A');
    const boatChassi = boatData.chassi || 'N/A';
    const boatPropulsao = boatData.tipo_propulsao || (isJet ? 'MOTOR' : 'MOTOR CENTRO-RABETA');

    // Pagamento
    const vTotal = formatR$(paymentData?.valorTotal || '9.900,00');
    const vEntrada = paymentData?.valorEntrada ? formatR$(paymentData.valorEntrada) : '';
    const vRemanescente = paymentData?.valorRemanescente ? formatR$(paymentData.valorRemanescente) : '';
    const vRemExtenso = paymentData?.valorRemanescenteExtenso || '';
    const nParc = paymentData?.numParcelas;
    const nParcExtenso = paymentData?.numParcelasExtenso || '';
    const vParcela = paymentData?.valorParcela ? formatR$(paymentData.valorParcela) : '';
    const vParcExtenso = paymentData?.valorParcelaExtenso || '';
    const formaPag = paymentData?.formaPagamento || 'cartão de crédito';
    const diaVenc = paymentData?.diaVencimento || '10';

    const clause3_1 = `3.1. O COMPRADOR pagará pela aquisição de <b>${cotaPercentual} (${cotaExtenso})</b> da propriedade da embarcação, objeto deste contrato, o valor de <b>${vTotal}</b> a ser efetuado da seguinte forma:`;
    
    let paymentSubItems: string[] = [];
    if (paymentData?.isCustomPaymentText && paymentData.customPaymentText) {
      paymentSubItems = [paymentData.customPaymentText];
    } else if (vEntrada && vRemanescente && nParc && parseInt(nParc, 10) > 1) {
      paymentSubItems = [
        `a) Pagamento de <b>${vEntrada}</b> a título de entrada, que será pago à vista no momento da assinatura do presente contrato.`,
        `b) O valor remanescente de <b>${vRemanescente}${vRemExtenso ? ` (${vRemExtenso})` : ''}</b>, deverá ser pago em <b>${nParc}${nParcExtenso ? ` (${nParcExtenso})` : ''} parcelas de ${vParcela}${vParcExtenso ? ` (${vParcExtenso})` : ''}</b>, mediante <b>${formaPag}</b>, com o vencimento para o <b>dia ${diaVenc} de cada mês</b>, servindo comprovante de pagamento/transferência como recibo de quitação.`
      ];
    } else {
      const vTotalExtenso = paymentData?.valorRemanescenteExtenso || paymentData?.valorParcelaExtenso || 'nove mil e novecentos reais';
      paymentSubItems = [
        `a) O COMPRADOR pagará o valor de <b>${vTotal}${vTotalExtenso ? ` (${vTotalExtenso})` : ''}</b>, referente à aquisição da cota da embarcação <b>${boatName}</b>, em parcela única, por meio de <b>${formaPag}</b>. A quitação do valor ficará condicionada à aprovação.`
      ];
    }

    const clauses: string[] = [
      // 1. OBJETO
      "<b>1. <u>OBJETO</u></b>",
      `1.1. Este contrato tem como objeto a aquisição de copropriedade de embarcação, correspondente a <b>${cotaPercentual} (${cotaExtenso})</b> do total, pelo COMPRADOR, qual seja: <b>${boatName}</b> modelo: <b>${boatModelo}</b>, Nº de serie do CHASSI: <b>${boatChassi}</b>, Tipo de propulsão: <b>${boatPropulsao}</b>,`,

      // 2. DAS CONDIÇÕES DE AQUISIÇÃO E UTILIZAÇÃO DA EMBARCAÇÃO
      "<b>2. <u>DAS CONDIÇÕES DE AQUISIÇÃO E UTILIZAÇÃO DA EMBARCAÇÃO</u></b>",
      `2.1. O COMPRADOR está ciente que a presente compra se dará de modo compartilhado, juntamente com <b>mais ${outrosCotistasStr} coproprietários</b>, não possuindo o COMPRADOR nenhum poder de intervir na escolha dos demais coproprietários, sendo estes escolhidos por liberalidade única e exclusiva do VENDEDOR, os quais firmarão individualmente negócio jurídico com a <b>MEXICANO LANCHAS</b>.`,
      `2.2. Os custos gerados para manutenção e utilização da embarcação, serão <b>rateados pelos COPROPRIETÁRIOS</b>, na proporção da participação de cada um, salvo em caso de negligência, imperícia ou imprudência praticada, no qual o COPROPRIETÁRIO infrator, arcará individualmente com o reparo dos danos.`,
      `2.3. O COMPRADOR se compromete a firmar contrato para <b>ADMINISTRAÇÃO da embarcação</b> juntamente a <b>MEXICANO LANCHAS</b>, visto que por se tratar de uma compra de embarcação de modo compartilhado, para manter a organização e isonomia do seu uso, se faz necessário a manutenção do bem por empresa especializada.`,
      `2.3.1. A embarcação só poderá ser administrada por outra empresa que não seja integrante do grupo MEXICANO LANCHAS, <b>após a quitação de 100% (cem por cento) do valor total da embarcação</b>, bem como outros débitos relacionados a manutenção, serviço, abastecimentos e demais custos decorrentes da embarcação devidos a MEXICANO LANCHAS.`,
      `2.4. Ao firmar o presente contrato, o COMPRADOR garante que cumprirá todas as <b>normas internas de utilização da embarcação e do Estatuto dos Cotistas</b>, passadas pela ADMINISTRADORA e/ou VENDEDOR.`,
      `2.5. O COMPRADOR tem ciência que para utilização de Moto Aquática, deverá obrigatoriamente possuir <b>Carteira de Habilitação de Motonauta (MTA)</b>, devendo estar regular e adimplente perante os órgãos fiscalizadores, estando seu acesso ao sistema de agendamento/reservas condicionado a apresentação da referida habilitação.`,
      `2.5.1. Caso o COMPRADOR ainda não possua a carteira de habilitação de Motonauta (MTA), poderá adquirir a cota, porém <b>só terá seu acesso ao sistema de agendamento liberado após apresentação do referido documento de habilitação</b>.`,
      `2.6. É vedado a qualquer COPROPRIETÁRIO da embarcação: (i)remover a embarcação da marina ou da água para transitar por terra; (ii) uso da embarcação para fins comerciais/exploração econômica ou qualquer fim ilícito; (iv) cessão ou empréstimo da embarcação para terceiros sem a presença do COMPRADOR ou alguns de seus dependentes, devidamente identificados junto a ADMINISTRADORA; (vii) uso para empurrar, puxar ou rebocar outra embarcação ;(viii)uso para transporte de produtos inflamáveis ou explosivos; (ix)permitir que a pilotagem ou condução da embarcação em estado de embriagues, por si ou por terceiros; (x)uso ou porte de substância psicotrópica, narcótica ou similar.`,
      `2.6.1. Em caso de descumprimento dos itens elencados no item 2.6, a parte infratora arcará com <b>multa no valor de 2 (dois) salários mínimos vigentes a época</b>, que serão destinados a ADMINISTRADORA para custos de manutenção e conservação da embarcação.`,
      `2.6.2. Além da multa acima prevista, eventuais danos ocasionados ao bem ou a terceiros pela prática de algum dos itens descritos no item 2.6, a parte infratora <b>arcará individualmente com estes</b>, sem direito a ressarcimento pelos demais coproprietários.`,

      // 3. DO PREÇO, FORMA DE PAGAMENTO E INADIMPLÊNCIA
      "<b>3. <u>DO PREÇO, FORMA DE PAGAMENTO E INADIMPLÊNCIA</u></b>",
      clause3_1,
      ...paymentSubItems,
      `3.1. Em caso de inadimplência incidirá <b>multa no importe de 10% (dez por cento)</b> do valor da parcela e <b>juros de mora correspondente a 1% (um por cento) ao mês</b>.`,
      `3.2. Caso a inadimplência persista por prazo superior a <b>30(trinta) dias</b>, será facultado ao VENDEDOR, visando assegurar o seu crédito, independente de notificação prévia, inscrever o nome do inadimplente em bancos de dados cadastrais (SPC/SERASA/DPC ou órgão equivalente), protestar o débito, valer-se de firma especializada ou contratar advogados. Sendo que, neste caso, o COMPRADOR responderá pelos honorários destes profissionais.`,
      `3.3. A falta de pagamento por prazo superior a <b>60 (sessenta) dias</b>, poderá acarretar na rescisão deste contrato, por liberalidade do VENDEDOR, sendo aplicado o disposto no item 8.3, além de <b>multa rescisória de 30% do valor do contrato</b> a título de utilização do bem, que será convertido em taxa de locação da embarcação, com agravante da reparação dos danos que porventura causar ao bem objeto deste contrato.`,
      `3.4. Enquanto o COMPRADOR estiver em situação de inadimplemento, <b>ficará impedido de utilizar a embarcação</b>, até efetiva quitação do débito, sem direito a qualquer indenização, reclamação ou reposição dos dias em que deixou de utilizar o bem.`,
      `3.4.1. A suspensão do uso da embarcação acima previsto, <b>não isenta o COMPRADOR</b> de arcar com os custos de revisões, manutenções e demais despesas mensais fixas da embarcação.`,
      `3.5. Eventuais custos com revisões, reparos, manutenções, consertos, troca de peças ou acessórios e melhorias, não estão inclusos no valor disposto no item 3.1, sendo tais valores cobrados a parte e rateado entre os coproprietários, na proporção de suas cotas.`,

      // 4. DA TRANSFERÊNCIA DE TITULARIDADE DA COTA
      "<b>4. <u>DA TRANSFERÊNCIA DE TITULARIDADE DA COTA</u></b>",
      `4.1. O registro de propriedade da embarcação está em nome do VENDEDOR, após quitação total do valor da embarcação, poderá ser transferida para o nome de algum dos coproprietários ou terceiro indicado por estes, mediante prévia anuência de todos os cotistas, correndo por conta destes todos os custos para transferência.`,
      `4.2. O COMPRADOR/COTISTA poderá vender sua cota, respeitando o limite de sua participação, <b>desde que tenha quitado o valor total correspondente a sua cota perante o VENDEDOR</b>, salvo mediante prévia anuência do VENDEDOR para prosseguir diferente.`,
      `4.3. O FUTURO COTISTA/COMPRADOR deverá aderir integralmente aos termos e disposições deste contrato.`,
      `4.4. Para novo cadastro ou transferência da titularidade da COTA, será devido a ADMINISTRADORA uma <b>taxa de transferência, no importe de R$ 350,00 (trezentos e cinquenta reais) se a embarcação for moto aquática e R$ 650,00 (seiscentos e cinquenta reais) se for lancha</b>, pagos diretamente à ADMINISTRADORA pelo futuro COMPRADOR, para fins de elaboração dos documentos, disponibilização do sistema/aplicativo, 03 (três) aulas práticas (no mesmos moldes acordados neste instrumentos) e demais custos pertinentes a transferência.`,
      `4.5. O futuro COMPRADOR/COTISTA só poderá ter acesso ao sistema de reservas da embarcação e utilização desta, após pagamento da taxa de transferência à ADMINISTRADORA, continuando o COMPRADOR responsável pela manutenção e conservação da embarcação até a quitação da referida taxa, assinatura do “contrato de aquisição de copropriedade de embarcação” pelo novo comprador e ciências dos termos do Manual de Condutas e Procedimentos internos, ambos disponibilizados junto a MEXICANO LANCHAS LTDA.`,
      `4.5.1. O FUTURO COMPRADOR/COTISTA deverá ter ciência que em caso de inadimplência da taxa de transferência incorrerá no previsto no item 3.2.`,

      // 5. DAS OBRIGAÇÕES DO COMPRADOR
      "<b>5. <u>DAS OBRIGAÇÕES DO COMPRADOR</u></b>",
      `5.1. O COMPRADOR será responsável pela condução e conservação da embarcação adquirida, devendo garantir a utilização do bem em conformidade com as normas internas da ADMINISTRADORA, do Estatuto Do Cotista, das especificações do fabricante, das disposições deste contrato e da legislação vigente.`,
      `5.2. O COMPRADOR se compromete, de modo pessoal e irrestrito, a reparar todos os danos e prejuízos ocorridos em virtude do uso da embarcação, por si, seus dependentes ou terceiros que tenham acesso a embarcação por meio do COMPRADOR.`,
      `5.3. Em caso de qualquer sinistro/acidente envolvendo a embarcação, objeto deste contrato, o COMPRADOR fica obrigado a comunicar imediatamente ao VENDEDOR e a ADMINISTRADORA.`,
      `5.4. O COMPRADOR tem ciência que a embarcação adquirida <b>não possui nenhum seguro contratado</b>, devendo os coproprietários da embarcação decidirem pela contratação dos seguros, sendo dividido igualmente entre estes o respectivo valor.`,
      `5.5. Na eventualidade do VENDEDOR ser interpelado judicial ou extrajudicialmente para o pagamento de dívida de qualquer natureza contraída pelo COMPRADOR, este deverá imediatamente providenciar o pagamento, sob pena de ser considerada infração ao presente contrato.`,
      `5.5.1. Caso haja controvérsia com relação aos valores retro mencionados e o VENDEDOR esteja sendo demandado judicialmente em decorrência dos mesmos, o COMPRADOR será chamado a intervir no processo para assisti-lo, sendo que se não comparecer, não poderá alegar em juízo, para se eximir de suas responsabilidades, que a defesa promovida pelo VENDEDOR foi mal feita ou que o acompanhamento foi insatisfatório. O COMPRADOR reconhece, desde já, como sua exclusiva dívida, o valor líquido e certo que for apurado em execução de sentença judicial, ou o valor que for ajustado entre o VENDEDOR e o reclamante, na hipótese de acordo efetuado nos autos do processo, obrigando-se a proceder ao seu pagamento.`,
      `5.5.2. As despesas processuais e honorários advocatícios, contratuais e de sucumbência, despendidos pelo VENDEDOR nas ações judiciais mencionadas nessas clausulas, serão única e exclusivamente suportadas pelo COMPRADOR, servindo os comprovantes, guias ou notas, como valor de débito líquido, certo e exigível, em favor do VENDEDOR.`,
      `5.5.3. Caso o COMPRADOR não proceda ao pagamento dos valores previstos nesta cláusula, fica facultado ao VENDEDOR proceder ao pagamento dos valores devidos ao reclamante e posteriormente cobrá-los do COMPRADOR, mediante a incidência de multa moratória de 10% (dez por cento), devidamente corrigidos pelo INPC e computados juros moratórios de 1% (um por cento) ao mês, tudo contado do efetivo desembolso.`,

      // 6. DAS AULAS PRÁTICAS
      "<b>6. <u>DAS AULAS PRÁTICAS</u></b>",
      `6.1. Está incluso na taxa de cadastro/transferência o direito a <b>3 (três) aulas práticas</b> para instruções de condução e utilização da embarcação adquirida, bem como para conhecimento do percurso fluvial da região do Vale do São Francisco, limitando-se as cidades de Petrolina e Juazeiro.`,
      `6.2. A empresa contratada para administrar a embarcação de uso compartilhado disponibilizará profissional experiente e com conhecimento adequado para realização das aulas práticas, sem custos ao COMPRADOR.`,
      `6.3. As aulas poderão ser agendadas de quarta a sexta-feira, das 09hrs às 16hrs, com <b>duração máxima de 60 (sessenta) minutos cada aula</b>, conforme disponibilidade prévia da embarcação e do profissional indicado pela MEXICANO LANCHAS, ocorrendo a marcação através do aplicativo (APP MEXICANO LANCHAS).`,
      `6.4. Caso o COMPRADOR não posso comparecer, e não comunique a MEXICANO LANCHAS, com antecedência prévia de 24(vinte e quatro) horas da data agendada, arcará com o pagamento de <b>taxa de desistência de R$ 50,00 (cinquenta reais)</b>.`,
      `6.5. O COMPRADOR será responsável por custear todo o combustível necessário para realização das aulas práticas.`,
      `6.6. As aulas deverão ser marcadas no prazo de até <b>6 (seis) meses</b>, contados da assinatura do presente instrumento, após este período o COMPRADOR perderá as aulas ofertadas, sem restituição de valores.`,
      `6.7. As aulas são validas apenas para o COMPRADOR titular, não se estendendo aos seus dependentes ou terceiros.`,

      // 7. DA GARANTIA
      "<b>7. <u>DA GARANTIA</u></b>",
      `7.1. A Embarcação terá cobertura de <b>GARANTIA DE 3 (TRÊS) meses</b>, fornecido pela (MEXICANO LANCHAS), para defeitos de fabricação, todavia, para isso, o COMPRADOR deverá seguir as regras contidas nos manuais e demais instruções emitidas pelo FABRICANTE e informadas no termo de garantia disponibilizado para os cotistas, bem como as normas internas passadas pela ADMINISTRADORA, sob pena de perder a garantia concedida.`,
      `7.2. Em casos de mau uso, conservação inadequada, impactos, riscos e eletrólise, seja por ação ou omissão, a garantia não cobrirá os danos, sendo responsabilidade do COPROPRIETÁRIO causador custeá-los.`,

      // 8. DA VIGÊNCIA, RESCISÃO E DESISTÊNCIA DA AQUISIÇÃO
      "<b>8. <u>DA VIGÊNCIA, RESCISÃO E DESISTÊNCIA DA AQUISIÇÃO</u></b>",
      `8.1. Este contrato iniciará sua vigência na data de sua assinatura e terminará com o cumprimento de todas as obrigações aqui contraídas.`,
      `8.2. O presente contrato poderá ser rescindido pelo VENDEDOR, independentemente de justificação ou interpelação judicial ou extrajudicial, caso o COMPRADOR descumpra quaisquer das cláusulas ou condições deste instrumento ou da ADMINISTRADORA da embarcação.`,
      `8.3. Havendo rescisão deste instrumento, o COMPRADOR deverá restituir imediatamente ao VENDEDOR ou pessoa por ele indicada, a propriedade e posse da embarcação, no limite das suas cotas, devendo a embarcação estar em perfeito estado de uso e conservação, salvo desgaste natural por uso, sendo devido ao COMPRADOR a restituição apenas do valor efetivamente pago ao VENDEDOR, com <b>decréscimo de 30% (trinta por cento)</b>, sem direito ao ressarcimento dos valores gastos com manutenção, reparos, consertos ou taxa de administração.`,
      `8.4. Após o pagamento da entrada, caso o COMPRADOR desista da aquisição da cota-parte da embarcação, deverá notificar por escrito o VENDEDOR, sendo devido ao COMPRADOR apenas a <b>restituição de 50% (cinquenta por cento) do valor pago a título de entrada</b>, sendo o valor remanescente convertido em multa rescisória.`,

      // 9. DISPOSIÇÕES FINAIS
      "<b>9. <u>DISPOSIÇÕES FINAIS</u></b>",
      `9.1. O COMPRADOR declara neste ato que realizou a vistoria da embarcação adquirida, reconhecendo plenamente o seu estado e funcionamento, atestando que a embarcação se encontra em perfeitas condições de uso, não podendo alegar posteriormente defeitos, vícios ocultos ou falta de informação a respeito do bem.`,
      `9.2. Este instrumento e os eventuais anexos que o integram constituem o inteiro teor do acordo entre as Partes e substitui todas as outras comunicações com relação ao objeto do presente instrumento.`,
      `9.3. Salvo disposição específica, na hipótese de infração dos termos deste instrumento, a parte infratora deverá realizar o <b>pagamento de multa no valor de 30% (trinta por cento) do valor do contrato</b>, além de eventuais perdas e danos a que der causa, independente de decisão judicial ou notificação extrajudicial.`,
      `9.4. O COMPRADOR, por meio do presente instrumento, autoriza, à título gratuito, o VENDEDOR, a utilizar a imagem da embarcação adquirida, em qualquer material, entre os quais vídeos, fotos e publicações, referentes a divulgação dos serviços prestados pelo VENDEDOR, a qualquer tempo, mesmo que com intuito comercial, sem qualquer limitação de número de reproduções.`,
      `9.5. O VENDEDOR não se responsabiliza pelo uso indevido das imagens captadas por terceiros em exibições e/ou reproduções ocorridas.`,
      `9.6. Todas as informações, dados, valores, projetos, documentos e demais informações trocadas durante e em razão deste Contrato, deverão ser tratados como informações sigilosas e restritas, e nenhuma das Partes deverá permitir que seus colaboradores ou terceiros sob a sua responsabilidade façam uso destas informações para fins diversos do objeto do presente acordo, sem o prévio e expresso consentimento da outra Parte, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).`,
      `9.7. Todas as notificações e comunicações relacionadas ao presente Contrato deverão ser feitas por escrito e serão consideradas como recebidas: (a) no dia em que tiverem sido enviadas, se transmitidas por Whatsapp ou e-mail; (b) a contar da comprovação do recebimento, se enviadas por carta via serviço postal ou courrier; ou (c) no dia em que a Parte notificada acusar o recebimento (protocolo), se entregues pessoalmente. As notificações deverão ser remetidas aos endereços indicados no cabeçalho deste instrumento.`,
      `9.7.1. Ocorrendo qualquer alteração no endereço eletrônico ou postal, obriga-se o respectivo contratante a informar imediatamente o outro, sob pena de permanecer válida, para os fins ora previstos, a comunicação enviada ao endereço anterior.`,
      `9.8. O presente Contrato é celebrado em caráter irrevogável e irretratável, obrigando não só as Partes como também seus herdeiros e legais sucessores.`,
      `9.9. O presente Contrato poderá ser alterado e aditado em quaisquer de suas cláusulas e condições, desde que seja de comum acordo entre as partes, por escrito, não valendo como alteração qualquer tolerância ao cumprimento de suas cláusulas.`,
      `9.10. Aplica-se o disposto no <b>Artigo 784, III, do Código de Processo Civil Brasileiro</b>, haja vista o caráter de título executivo extrajudicial do presente instrumento.`,
      `9.11. Fica eleito o foro central da <b>Comarca de Petrolina, no Estado de Pernambuco</b>, para dirimir quaisquer questões ou controvérsia derivada deste contrato.`,
      `E, por estarem assim justos e contratados, as partes assinam na presença de 2(duas) testemunhas, o presente termo, em 2 (duas) vias de igual teor e forma.`
    ];

    return {
      type: 'aquisicao',
      title,
      clientStr,
      vendorStr,
      introStr,
      clauses,
      signCompany: {
        name: 'MEXICANO LANCHAS LTDA',
        cnpj: 'CNPJ: 42.206.594/0001-31'
      },
      signClient: {
        name: `${(clientData.nome || 'COMPRADOR').toUpperCase()}, ${(clientData.nacionalidade || 'BRASILEIRO').toUpperCase()}`,
        cpf: clientData.cpf ? `CPF: ${clientData.cpf}` : 'N/A'
      }
    };
  } else {
    // ══════════════════════════════════════════════════════════════════════
    // CONTRATO DE ADMINISTRAÇÃO PARA EMBARCAÇÃO DE USO COMPARTILHADO
    // Texto base oficial Vale Administradora de Bens Náuticos (8 Páginas)
    // ══════════════════════════════════════════════════════════════════════
    const title = 'CONTRATO DE ADMINISTRAÇÃO PARA EMBARCAÇÃO DE USO COMPARTILHADO';

    const rgFormatted = clientData.rg 
      ? `${clientData.rg.trim()}${clientData.orgaoEmissor ? ' ' + clientData.orgaoEmissor.trim() : ''}` 
      : 'NÃO INFORMADO';
    const chaFormatted = clientData.cnh_cha || clientData.numeroHabilitacao || 'NÃO INFORMADO';
    const validadeFormatted = clientData.validadeHabilitacao || 'NÃO INFORMADO';
    const emissorFormatted = clientData.orgaoEmissorHabilitacao || 'NÃO INFORMADO';
    const nacFormatted = (clientData.nacionalidade || 'BRASILEIRO').toUpperCase();
    const estCivilFormatted = (clientData.estadoCivil || 'NÃO INFORMADO').toUpperCase();
    const profFormatted = (clientData.profissao || 'NÃO INFORMADO').toUpperCase();
    const telFormatted = clientData.telefone || 'NÃO INFORMADO';

    const clientStr = `CONTRATANTE: Nome: <b>${clientData.nome || 'NÃO INFORMADO'}</b>, Nacionalidade: <b>${nacFormatted}</b>, Estado civil: <b>${estCivilFormatted}</b>, Profissão: <b>${profFormatted}</b> Carteira Náutica nº: <b>${chaFormatted}</b>, válida até: <b>${validadeFormatted}</b>, órgão emissor: <b>${emissorFormatted}</b>, inscrito no CPF sob o nº <b>${clientData.cpf || 'NÃO INFORMADO'}</b>, portador da carteira de identidade nº <b>${rgFormatted}</b>, Endereço: <b>${fullAddress}</b>, contato (WhatsApp): <b>${telFormatted}</b>.`;

    const vendorStr = `CONTRATADO/ADMINISTRADOR: <b>VALE ADMINISTRADORA NAUTICA</b>, pessoa jurídica de direito privado, CNPJ: <b>62.794.642/0001-67</b> com sede situada na cidade de <b>PETROLINA-PE</b>, no <b>LOTEAMENTO LOTE 190, Nº 190, ESTRADA DA TAPERA, CEP: 56.334-899</b>, endereço eletrônico: <b>atendimentovaleadm@gmail.com</b>, WhatsApp: <b>(87)9 9109-0051</b>.`;

    const boatName = formatBoatName(boatData.nome) || 'MEXICANO';
    const boatInscricao = boatData.inscricao || 'NÃO INFORMADO';
    const boatPropulsao = boatData.tipo_propulsao || (boatData.tipo === 'jet' ? 'TURBO JATO' : 'MOTOR');
    const boatSerie = boatData.chassi || 'NÃO INFORMADO';

    // Capacidade de Passageiros
    const capNum = boatData.capacidadePassageiros || (boatData.tipo === 'jet' ? 2 : 8);
    const capExtenso = capNum === 8 ? '8 (OITO)' : capNum === 2 ? '2 (DOIS)' : `${capNum}`;
    const capacidadeStr = `${capExtenso} passageiros + 01 (UM) TRIPULANTE`;

    // Cota e valores de rateio da administração
    const cotaPercent = clientData.cota || '25%';
    let numProprietarios = 4;
    let percentualProprietario = '25% (vinte e cinco por cento)';
    if (cotaPercent === '12.5%' || cotaPercent === '12,5%') {
      numProprietarios = 8;
      percentualProprietario = '12,5% (doze vírgula cinco por cento)';
    } else if (cotaPercent === '50%') {
      numProprietarios = 2;
      percentualProprietario = '50% (cinquenta por cento)';
    } else if (cotaPercent === '100%') {
      numProprietarios = 1;
      percentualProprietario = '100% (cem por cento)';
    }

    const taxaIndividualRaw = paymentData?.taxaMensalAdm || '491,55';
    const taxaIndividualClean = taxaIndividualRaw.replace('R$', '').trim();
    let valorTotalAdm = paymentData?.taxaMensalAdmTotal;
    if (!valorTotalAdm) {
      const numVal = parseFloat(taxaIndividualClean.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(numVal) && numVal > 0) {
        valorTotalAdm = (numVal * numProprietarios).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        valorTotalAdm = '1.966,20';
      }
    }
    const valorTotalAdmFormatado = formatR$(valorTotalAdm);
    const valorIndividualAdmFormatado = formatR$(taxaIndividualClean);

    // Data de celebração da aquisição mencionada na cláusula 14.2
    const dataAquisicaoFormatada = formatDateDDMMAAAA(clientData.dataCadastro || clientData.dataAssinatura) || '09/10/2026';

    const introStr = `<u>CONSIDERANDO</u> que o CONTRATANTE firmou contrato para aquisição de copropriedade da embarcação <b>${boatName}</b>, se comprometendo a pactuar contrato de administração da embarcação com empresa <b>VALE ADMINISTRADORA NÁUTICA</b>, obrigatoriamente até a quitação integral do valor da embarcação por todos os coproprietários;\n\n<u>CONSIDERANDO</u> que apesar de se tratar de embarcação de uso compartilhado, os coproprietários são pessoas independentes, sendo cada um responsável pelo cumprimento de seus direitos e obrigações individuais e coletivos;\n\n<u>CONSIDERANDO</u> que os Coproprietários estão de acordo com a gestão da embarcação por uma empresa especializada por se tratar de aquisição em “uso compartilhado” e a <b>VALE ADMINISTRADORA DE BENS NÁUTICOS</b> possui a expertise necessária para o referido serviço.\n\nAs partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Administração Para Embarcação de Uso Compartilhado, que se regerá pelas cláusulas a seguir descritas.`;

    const clauses = [
      // 1. DO OBJETO
      "<b>1. <u>DO OBJETO</u></b>",
      `1.1. Constitui-se objeto deste contrato o serviço de gerenciamento completo da embarcação: Nº de inscrição: <b>${boatInscricao}</b>, Tipo de propulsão: <b>${boatPropulsao}</b>, Nº de Série: <b>${boatSerie}</b>, por parte do ADMINISTRADOR em favor do CONTRATANTE, o qual possui copropriedade do referido bem, possuindo direitos e obrigações individuais e coletivos.`,
      `1.2. O ADMINISTRADOR desempenhará as seguintes funções:\na) Comunicação e suporte nas tratativas entre os coproprietários;\nb) Acompanhamento de manutenções corretivas e preventivas do bem;\nc) Gestão financeira referente a embarcação;\nd) Controle de inadimplência dos coproprietários, uso e reserva da embarcação;\ne) Gerenciamento do aplicativo de reservas;\nf) Controle e fiscalização do cumprimento das normas que constam no Manual de Condutas e Procedimentos internos;\ng) Contratação de empresa especializada ou prestador de serviços autônomo para locação de vaga para guarda da embarcação, limpeza, manutenção e demais serviços necessários a conservação e funcionamento da embarcação, prestando auxílio e suporte aos terceirizados;\nh) Solicitações e tratativas com a Marina responsável por alocar o bem, inclusive para solicitar descida e subida da embarcação para utilização pelo CONTRATANTE.`,

      // 2. DAS CONDIÇÕES DE UTILIZAÇÃO DA EMBARCAÇÃO
      "<b>2. <u>DAS CONDIÇÕES DE UTILIZAÇÃO DA EMBARCAÇÃO</u></b>",
      `2.1. O CONTRATANTE deverá realizar a reserva para utilização da embarcação através do <b>SISTEMA DE RESERVAS DA VALE ADMINISTRADORA DE BENS NÁUTICOS</b>, com direito a <b>01 (um) sábado e 01 (um) domingo por mês</b>, podendo utilizar de quarta a sexta-feira livremente, conforme disponibilidade prévia, porem limitando-se a até <b>2 (duas) datas agendadas simultaneamente</b>.`,
      `2.2. O CONTRATANTE que não utilizar o seu sábado e/ou domingo mensal não terá direito a compensação no mês seguinte, bem como não se eximirá do rateio de quaisquer custos comuns a utilização da embarcação.`,
      `2.3. O uso da embarcação deverá obedecer ao <b>Manual de Condutas e Procedimentos internos</b> da <b>VALE ADMINISTRADORA DE BENS NAUTICOS</b>.`,
      `2.4. A embarcação estará disponível para utilização de quarta a domingo, podendo o CONTRATANTE solicitar a reserva no mesmo dia em que irá utilizar, respeitando o horário de <b>09h às 17h</b>.`,
      `2.5. A <b>VALE ADMINISTRADORA DE BENS NÁUTICOS</b> passará relatório das embarcações sempre que solicitados pela Marinha do Brasil referente a embarcações que permanecem navegando e que realizaram retorno e outras informações solicitadas.`,
      `2.6. Ao receber a embarcação, o CONTRATANTE recebe também uma relação impressa indicativa dos certificados, manuais e outros documentos, além de equipamentos, aparelhos, acessórios e utensílios existentes na embarcação, sendo devido também que o CONTRATANTE inspecione a embarcação na água, antes da partida. Cabe ao CONTRATANTE fazer a respectiva conferência e anotar a(s) ressalva(s) cabíveis no verso da relação entregue e devolvê-la assinada ao ADMINISTRADOR, pontua-se que, caso não haja ressalva, entende-se que a embarcação se encontra em estado satisfatório e adequado para uso, com exceção de defeitos ocultos (perceptíveis no curso da jornada ou condução da embarcação) e ocorrência de caso fortuito ou de força maior.`,
      `2.7. Antes de embarcar, o CONTRATANTE deverá apresentar, ao ADMINISTRADOR, plano de navegação, assim como relação dos passageiros que o acompanharão, contendo nome completo, CPF e data de nascimento.`,
      `2.8. É vedado ao CONTRATANTE ultrapassar a capacidade máxima da embarcação, que é de <b>${capacidadeStr}</b>, sabendo que crianças também são incluídas no somatório, independentemente de sua idade.`,
      `2.9. O CONTRATANTE deverá manter rigorosa fiscalização perante seus convidados e dependentes, evitando assim possíveis exageros e danos à embarcação, pois o CONTRATANTE possui <b>total responsabilidade civil e criminal</b> por quaisquer danos ocasionadas a embarcação ou a terceiros, seja por ação ou omissão, que venham a ocorrer durante o período em que embarcação estiver ou devesse estar em sua posse, seja direta ou indiretamente (através de terceiros sob sua responsabilidade).`,
      `2.10. O CONTRATANTE é responsável pela solicitação automática de abastecimento assim que chegar de volta do seu passeio, devendo realizar o acompanhamento do abastecimento imediato para devolução da embarcação a marina. O valor do combustível deverá ser pago ao CONTRATADO obrigatoriamente logo após o ato.`,
      `2.11. Os custos gerados para manutenção e utilização da embarcação, serão <b>rateados pelos coproprietários</b>, ora CONTRATANTES, na proporção da participação de cada um, salvo em caso de negligência, imperícia ou imprudência praticada, no qual o COPROPRIETÁRIO/CONTRATANTE infrator, arcará única e exclusivamente com o reparo dos danos.`,
      `2.12. A contratação do marinheiro é de responsabilidade do CONTRATANTE, sendo o marinheiro um prestador de serviço autônomo, que executará seu serviço individualmente e diretamente para o CONTRATANTE, estando o ADMINISTRADOR isento de quaisquer responsabilizações por falha na prestação do serviço, seja por dolo ou culpa, ainda que tenha realizado a indicação do profissional.`,
      `2.13. O CONTRATANTE tem ciência que é <b>VEDADO a condução da embarcação por pessoa não habilitada</b>, devendo o condutor estar regular e adimplente perante os órgãos fiscalizadores, possuindo conhecimento necessário da área de navegação, para condução da embarcação em segurança.`,
      `2.14. É de responsabilidade do CONTRATANTE realizar ou garantir que o Marinheiro/Condutor realize os procedimentos de segurança necessários para utilização da embarcação antes e depois do passeio, quais sejam: (EX: verificar motor, vistoria da embarcação, conferência dos equipamentos de segurança, vistoria do casco, documentos, etc).`,
      `2.15. É vedado a qualquer COPROPRIETÁRIO da embarcação: (i) o uso da embarcação fora do território de navegação entre Petrolina e juazeiro, e em locais ou regiões que não apresentem boas condições para navegar; (ii) uso da embarcação para fins comerciais/exploração econômica ou qualquer fim ilícito; (iv) cessão ou empréstimo da embarcação para terceiros sem a presença do COPROPRIETÁRIO ou seus dependentes, devidamente identificados junto ao ADMINISTRADOR; (vii) uso para empurrar, puxar ou rebocar outra embarcação; (viii) uso para transporte de produtos inflamáveis ou explosivos; (ix) permitir a pilotagem ou condução da embarcação em estado de embriagues, por si ou por terceiros; (x) uso ou porte de substância psicotrópica, narcótica ou similar; (xi) uso ou condução em terra; (xii) uso em testes de velocidade ou em competição de qualquer espécie.`,
      `2.16. Fica proibido retirar a embarcação da marina para utilização como transporte terrestre, sob pena de <b>multa de 2 (dois) salários mínimos vigentes na época</b>, a serem revertidos para custear despesas extras comuns a todos os coproprietários da embarcação.`,
      `2.17. O CONTRATANTE tem ciência que as embarcações estão sujeitas a desgastes naturais e eventuais problemas mecânicos, os quais são inevitáveis e independem do controle do ADMINISTRADOR.`,
      `2.17.1. Em casos de falhas em componentes que exijam importação de peças ou reparos prolongados, poderá ocorrer atraso na manutenção, incluindo a necessidade de múltiplos envios à oficina autorizada, não possuindo o ADMINISTRADOR nenhuma responsabilidade por atrasos ou impossibilidade de uso da embarcação.`,
      `2.17.2. Nessas situações, apesar de o ADMINISTRADOR não ter nenhuma responsabilidade por atrasos, empenhará esforços para supervisionar os prestadores de serviços terceirizados, buscando celeridade e qualidade no serviço.`,
      `2.17.3. Caso o CONTRATANTE solicite, mediante concordância dos demais coproprietários, o ADMINISTRADOR poderá tomar as medidas legais cabíveis contra os prestadores de serviços em nome do grupo.`,
      `2.18. Em eventual necessidade de manutenção e/ou revisão, em que a embarcação não possa ser utilizada, o ADMINISTRADOR entrará em contato com os coproprietários previamente, salvo defeito superveniente, que não foi possível constatar anteriormente, neste caso, o ADMINISTRADOR comunicará assim que tiver conhecimento, estando o CONTRATANTE ciente que a embarcação ficará sujeita a suspensão do seu uso, não incorrendo o ADMINISTRADOR em nenhuma penalidade ou indenização em decorrência disso.`,
      `2.19. Se ocorrerem danos a embarcação devido ao mau uso por parte do CONTRATANTE e seus dependentes/convidados, o ADMINISTRADOR fica autorizado, desde já, a realizar o reparo ou conserto do dano, para manter a operacionalidade da embarcação, servindo os comprovantes de pagamento como débito líquido, certo e exigível, do CONTRATANTE em favor do ADMINISTRADOR.`,
      `2.19.1 Sendo constatado a autoria do dano e o coproprietário não realizando o pagamento, terá o seu uso da embarcação suspenso até que seja negociado e/ou pago os valores em aberto.`,
      `2.20. Em eventual ocorrência de danos na embarcação, não sendo possível apurar o causador, os custos oriundos deste serão rateados entre os COPROPRIETÁRIOS, em observância a participação de cada um.`,
      `2.21. O ADMINISTRADOR não responde, de nenhum modo, pela presença, perda, subtração, desaparecimento ou por dano qualquer que haja com relação a valor, pertence, aparelho e outros bens ou objetos, levados para a EMBARCAÇÃO pelo CONTRATANTE ou terceiros sob sua responsabilidade.`,
      `2.22. O ADMINISTRADOR, como responsável pela gestão e preservação do bem, poderá não liberar a embarcação para uso do CONTRATANTE na data reservada, em decorrência de fatores climáticos, que entenda tornar a utilização do bem arriscada.`,
      `2.23. É assegurado ao ADMINISTRADOR e seus prepostos, vistoriar a embarcação sem aviso prévio e em qualquer local, podendo retomar a posse da embarcação a qualquer momento, caso seja constatado: a) abandono do bem; b) utilização em local proibido ou em desobediência ao disposto neste contrato ou ao Manual de Condutas e Procedimentos internos da VALE ADMINISTRADORA DE BENS NÁUTICOS.`,

      // 3. DA RESERVA
      "<b>3. <u>DA RESERVA</u></b>",
      `3.1. Para utilização da embarcação, o CONTRATANTE deverá realizar a reserva da data, sendo permitido apenas <b>02 (duas) reservas simultâneas</b>, sendo necessário utilizar ou desmarcar alguma para conseguir agendar outra, em atenção ao disposto no item 2.1.`,
      `3.2. Caso o CONTRATANTE necessite cancelar a reserva, sem penalidades, deverá comunicar ao ADMINISTRADOR até as <b>18 (dezoito) horas do dia anterior</b> a referida data, sob pena de pagamento de taxa de desistência no importe de <b>R$ 50,00 (cinquenta reais)</b>.`,
      `3.2.1. Caso o dia cancelado seja um sábado ou domingo, o CONTRATANTE perderá seu direito de utilizar outro sábado/domingo (conforme dia cancelado) no mesmo mês, salvo se algum coproprietário não utilizar o seu ou autorizar cedê-lo.`,
      `3.2.2. A taxa de desistência acima mencionada será cobrada juntamente com o próximo pagamento da taxa mensal devida pelo CONTRATANTE em decorrência dos serviços objeto deste contrato.`,
      `3.3. Caso algum coproprietário ja tenha utilizado o seu sábado e/ou domingo mensal e reserve outra data no sábado ou domingo do mesmo mês, o coproprietário que ainda nao utilizou o seu sábado e/ou domingo mensal terá o prazo de <b>18 (dezoito) horas anteriores</b> a referida data para alterar a reserva no aplicativo para o seu nome, após este prazo, será entendido como renúncia ao direito de um sábado e/ou domingo mensal, estando os coproprietários cientes que não haverá compensação, restituição de valores ou acumulo para o mês seguinte.`,
      `3.4. O ADMINISTRADOR não poderá garantir o passeio pelo CONTRATANTE no dia da sua reserva, fatores climáticos, manutenções emergenciais, quebra de equipamento no local de guarda, erro inesperado pelo sistema de reservas e diversos outros fatores imprevisíveis, que fogem totalmente do controle do ADMINISTRADOR podem inviabilizar a realização do passeio e não cabem nenhum tipo de responsabilização do ADMINISTRADOR.`,
      `3.5. Eventual ocorrência de caso fortuito ou de força maior, impeditivos da utilização da reserva pelo CONTRATANTE no seu sábado ou domingo mensal não poderá atrapalhar o direito dos demais coproprietários utilizarem o seu sábado ou domingo mensal, devendo o CONTRATANTE sujeitar-se a disponibilidade das demais data, não configurando o infortúnio como descumprimento contratual.`,

      // 4. DAS DELIBERAÇÕES SOBRE OS CUSTOS DA EMBARCAÇÃO E RATEIO
      "<b>4. <u>DAS DELIBERAÇÕES SOBRE OS CUSTOS DA EMBARCAÇÃO E RATEIO</u></b>",
      `4.1. Os custos gerados pela embarcação serão rateados pelos coproprietários, na medida do percentual da propriedade de cada um. Além dos custos gerados pela embarcação, os coproprietários pagarão, individualmente, uma <b>Taxa de Administração para o ADMINISTRADOR</b>.`,
      `4.1.1. O ADMINISTRADOR enviará para cada coproprietário o valor devido por cada um, referente aos custos de manutenção e eventuais reparos da embarcação, juntamente com a taxa de administração.`,
      `4.2. A Vale, como ADMINISTRADORA do patrimônio de terceiros, além de realizar a gestão de todos os custos mensais da embarcação, recolherá os valores arrecadados mensalmente e realizará os pagamentos devidos.`,
      `4.2.1. As faturas mensais serão emitidas até o último dia de cada mês, para o pagamento até o <b>dia 10 (DEZ) do mês subsequente</b>.`,
      `4.3. Havendo necessidade de reparos emergenciais, inclusive por danos ocasionados por mau uso de algum dos coproprietários, denominados de “custos extras”, serão emitidas faturas avulsas, que deverão ser pagas em até <b>48 (quarenta e oito) horas úteis</b> após a emissão, ou conforme prazo indicado pelo ADMINISTRADOR.`,
      `4.3.1. Caso o coproprietário causador do dano não realize o pagamento do valor devido no prazo de 48 (quarenta e oito) horas após a apresentação do orçamento, haverá aplicação de multa correspondente a <b>30% (trinta por cento)</b> do valor total para reparação do dano, sendo devido neste caso, o valor do prejuízo acrescido da multa.`,
      `4.3.2. Quando houver dano a embarcação causado por suposto mau uso, não sendo possível constatar o responsável de imediato, o ADMINISTRADOR poderá providenciar o reparo, que será rateado e custeado por todos os coproprietários do grupo. O valor poderá ser custeado antecipadamente pelo ADMINISTRADOR (orçamentos de até um salário mínimo) e posteriormente ressarcido pelos coproprietários, conforme disponibilidade orçamentária da <b>VALE ADMINISTRADORA DE BENS NÁUTICOS</b>, e caso não seja possível, os coproprietários deverão custear o valor total do prejuízo no prazo indicado pelo ADMINISTRADOR.`,
      `4.3.3. Após constatação do dano, o ADMINISTRADOR realizará vistoria na embarcação, bem como tentará apurar os fatos e relatos de terceiros que tiveram contato com a embarcação no dia do fato danoso, de modo juntar o maior acervo probatório possível e levar a conhecimento dos coproprietários, para que estes decidam como prosseguir.`,
      `4.3.4. Caso os coproprietários, por maioria absoluta, decidam pelo mesmo suposto causador do dano e este não assuma a culpa, os coproprietários poderão adotar as medidas judiciais cabíveis para apuração das perdas e danos, podendo, o ADMINISTRADOR prestar o auxílio necessário, contudo, todos os custos correrão por conta dos coproprietários.`,
      `4.4. As faturas emitidas, sejam das mensalidades recorrentes ou as avulsas, ficam disponíveis nos canais de atendimento via whatsapp, no ato da emissão e no aplicativo da <b>VALE ADMINISTRADORA DE BENS NÁUTICOS</b>. O sistema enviará um alerta por e-mail e/ou WhatsApp notificando o CONTRATANTE.`,
      `4.4.1. Caso o CONTRATANTE não receba as faturas até o último dia do mês, deverá entrar em contato com o ADMINISTRADOR, solicitando o envio da fatura, visto que o vencimento desta continuará sendo até o <b>dia 10 de cada mês</b>, e o não recebimento das faturas não servirá como justo motivo para atraso no pagamento, sendo devido os juros e multa previstos no item 8.1.`,
      `4.4.2. O pagamento das faturas mensais ou avulsas serão realizados unicamente através de boleto bancário, não sendo aceita nenhuma outra forma de pagamento, salvo autorização prévia e expressa do ADMINISTRADOR.`,
      `4.5. Em caso de venda da cota do CONTRATANTE por intermédio do ADMINISTRADOR, será cobrado <b>10% (dez por cento)</b>, a título de comissão, do valor recebido pelo coproprietário vendedor da cota, comissão esta que não se confunde ou abona a taxa de transferência.`,
      `4.6. Caso haja contratação de securitizadora ou administração de danos, será cobrado a taxa de <b>30% (trinta por cento)</b> do valor total das peças e serviços, acrescidos de juros de 2% (dois por cento) ao mês.`,
      `4.7. A taxa de administração e custos extras não serão, em nenhuma hipótese, passíveis de devolução por parte do ADMINISTRADOR.`,
      `4.8. O CONTRATANTE não tem direito a reembolso, restituição ou indenização referente a despesas de qualquer natureza que não tenham sido autorizadas prévia e expressamente pelo ADMINISTRADOR, cabendo a responsabilidade pelo pagamento exclusivamente ao CONTRATANTE.`,

      // 5. DOS VALORES DEVIDO AO ADMINISTRADOR
      "<b>5. <u>DOS VALORES DEVIDO AO ADMINISTRADOR</u></b>",
      `5.1. Em decorrência do serviço prestado pelo ADMINISTRADOR, será devido o pagamento mensal de <b>${valorTotalAdmFormatado}</b>, o qual será dividido e custeado da seguinte forma:\na) Embarcação possuindo <b>${numProprietarios} PROPRIETÁRIOS</b>: cada um arcará com <b>${percentualProprietario}</b> do valor da mensalidade, que corresponde a <b>${valorIndividualAdmFormatado}</b>.`,
      `5.2. O pagamento será realizado através de boleto bancário, até o <b>dia 10 de cada mês</b>.`,
      `5.3. Em caso de deslocamento do ADMINISTRADOR para realização de serviços referentes a embarcação, limitando-se as cidades de Petrolina e Juazeiro, será devido taxa de deslocamento de <b>R$ 50,00 (cinquenta reais) ida e R$ 50,00 (cinquenta reais) volta</b>.`,
      `5.4. Os valores referentes à taxa de administração serão reajustados anualmente no mês de janeiro, com base nos reajustes dos fornecedores e prestadores de serviços.`,

      // 6. RESPONSABILIDADES DO ADMINISTRADOR
      "<b>6. <u>RESPONSABILIDADES DO ADMINISTRADOR</u></b>",
      `6.1. Fazer cumprir as regras do compartilhamento da embarcação no que tange ao uso pelos coproprietários e seus dependentes, atuando de forma imparcial, visando a utilização igualitária do bem por seus coproprietários, evitando o uso em desconformidade com este contrato e o Manual de Condutas e Procedimentos internos da VALE ADMINISTRADORA DE BENS NÁUTICOS, bem como realizando a aplicação das penalidades em cada caso.`,
      `6.2. Fica expressamente autorizado nos termos deste contrato que o ADMINISTRADOR poderá, sem prévia comunicação e aprovação do grupo de CONDÔMINO/COTISTA, aprovar serviços essenciais ao bom funcionamento da embarcação, principalmente os que podem impedir a utilização da mesma.`,
      `6.2.1. Em caso de serviços urgentes, que necessitem de reparos imediatos, o ADMINISTRADOR, fica desde já, autorizado a realizá-los, visto que, a demora pode ocasionar a irreversibilidade do dano, devendo os coproprietários custearem os valores para reparação do dano, em observância ao disposto no item 4.3.`,
      `6.3. O ADMINISTRADOR realizará a indicação de fornecedores e prestadores de serviços, todavia, não se responsabilizando por eventuais danos oriundos de falha do serviço prestado ou materiais adquiridos, todavia, prestará suporte aos coproprietários para eventuais tratativas necessárias a resolução do problema.`,
      `6.4. Realizará a apuração dos responsáveis por dano ao patrimônio comum, com imputação ao causador o custo do dano, entretanto, quando não conseguir identificar o responsável, o valor será rateado entre todos os coproprietários, no limite de suas participações.`,
      `6.5. Supervisionar a utilização da embarcação pelo CONTRATANTE e seus dependentes, verificando se estão atuando com observância ao Manual de Condutas e Procedimentos internos da VALE ADMINISTRADORA DE BENS NÁUTICOS e demais instruções passadas pelo ADMINISTRADOR, aplicando as penalidades cabíveis, em conformidade com o previsto neste instrumento.`,
      `6.6. O ADMINISTRADOR não responderá ou assumirá qualquer responsabilidade por eventuais danos causados pelo CONTRATANTE, seus dependentes, convidados ou terceiros sob responsabilidade do CONTRATANTE, sejam entre si ou à terceiros, bem como por danos causados por terceiros ao CONTRATANTE, seus dependentes, convidados ou terceiros sob responsabilidade do CONTRATANTE.`,
      `6.7. O ADMINISTRADOR custeará a cobertura de déficit provocado por inadimplência de algum coproprietário em relação ao pagamento das despesas mensais e extraordinárias, sendo cobrado do coproprietário inadimplente o ressarcimento dos valores adiantados, acrescidos de juros, multa e correção monetária previstos neste contrato.`,
      `6.8. O ADMINISTRADOR providenciará junto à rede autorizada local para que sejam feitas as revisões e manutenção na embarcação conforme exigido pela fabricante, mantendo as condições de garantia de motor e casco, com a responsabilidade de solicitar a troca das peças exigidas na revisão.`,
      `6.8.1. Quando necessário e em obediência ao prazo de garantia, o ADMINISTRADOR acionará os fornecedores para exigir as condições desta.`,

      // 7. RESPONSABILIDADES DO CONTRATANTE
      "<b>7. <u>RESPONSABILIDADES DO CONTRATANTE</u></b>",
      `7.1. O CONTRATANTE obriga-se a usar a embarcação com estrita observância das instruções recebidas do ADMINISTRADOR, das especificações determinadas pelo fabricante e vendedor da embarcação e constantes em manuais e outras publicações que acompanhem o bem, utilizando-o sempre em conformidade com as disposições deste contrato e da legislação aplicável.`,
      `7.2. O CONTRATANTE se compromete a comunicar imediatamente ao ADMINISTRADOR qualquer irregularidade ocorrida no aplicativo que impossibilite a perfeita funcionalidade do mesmo, exemplificando, mas não se limitado a: realização de reservas, remarcação, emissão de boletos, etc., para que o ADMINISTRADOR tome as medidas cabíveis e apresente a conduta a ser seguida pelo CONTRATANTE.`,
      `7.2.1. O CONTRATANTE não poderá alegar falha do aplicativo como motivo justo para ausência de pagamento ou descumprimento contratual.`,
      `7.3. O CONTRATANTE, como coproprietário do bem, no limite da sua cota, poderá vender, permutar ou doar sua parte, desde que mediante prévia autorização do ADMINISTRADOR, contudo não poderá utilizar o bem para fins comerciais e lucrativos (ex: locação da embarcação para festas/passeios).`,
      `7.4. O CONTRATANTE deverá entregar ao ADMINISTRADOR cópia autêntica de toda documentação referente a habilitação náutica e autorizações necessárias para utilização da embarcação, bem como demais documentos solicitados pelo ADMINISTRADOR, devendo o CONTRATANTE entregar a VALE ADMINISTRADORA DE BENS NÁUTICOS todas as atualizações e renovações, sempre que ocorrerem.`,
      `7.5. O CONTRATANTE tem ciência que não poderá realizar na embarcação nenhuma modificação, reparo ou qualquer outra conduta que envolva despesas ou modificação estrutural de qualquer natureza, sem autorização prévia do ADMINISTRADOR.`,
      `7.6. Cabe ao CONTRATANTE comunicar de imediato ao ADMINISTRADOR qualquer sinistro que ocorrer na embarcação durante a utilização desta, ciente que ocultar o ocorrido poderá trazer prejuízos irreversíveis ao bem, devendo realizar as seguintes condutas:\na) coletar dados pertinentes com relação a outra(s) embarcação(ões) envolvidas, ao respectivo condutor, bilhete de seguro, vítimas e testemunhas;\nb) providenciar boletim de ocorrência ou documento equivalente junto as autoridades competentes;\nc) providenciar a condução da embarcação, como seja o caso e possível, para local apropriado, inclusive arcando com todas as despesas decorrentes.`,
      `7.7. O CONTRATANTE, como legítimo coproprietário da embarcação, autoriza o ADMINISTRADOR a contratar de imediato serviços urgentes essenciais a conservação e funcionalidade do bem, obrigando-se a realizar o pagamento dos custos.`,
      `7.8. Na hipótese de o ADMINISTRADOR ser demandado judicialmente, a qualquer tempo, em razão de fatos de responsabilidades do CONTRATANTE, obriga-se o CONTRATANTE a intervir no feito, pleiteando a exclusão do ADMINISTRADOR da lide, assumindo a responsabilidade integral e exclusiva pelo pagamento e providências reclamadas.`,
      `7.9. Caso queiram, os coproprietários, ora CONTRATANTES, poderão votar e decidir com no mínimo 3/4 dos votos dos coproprietários, pela criação de uma SPE (Sociedade de Propósito Específico) para ser detentora da titularidade da embarcação. Todos os custos pontuais e recorrentes (abertura da Pessoa Jurídica, contabilidade recorrente e afins) serão imputados aos coproprietários, pois não estão incluídos na Taxa de Administração da VALE ADMINISTRADORA DE BENS NÁUTICOS.`,
      `7.10. A responsabilidade do CONTRATANTE não está limitada ao seu percentual de participação na propriedade da embarcação. Sem prejuízo das prestações pecuniárias previstas de modo específico em cláusulas deste instrumento, fica justo e acordado, desde já, que a parte que causar danos ou prejuízos a embarcação, seus coproprietários ou terceiros, seja por ação ou omissão, ficará obrigada a repará-lo, assumindo integralmente a responsabilidade.`,
      `7.11. O CONTRATANTE, por meio do presente instrumento, autoriza, à título gratuito, o ADMINISTRADOR, a utilizar a imagem da embarcação, em qualquer material, entre os quais vídeos, fotos e publicações, referentes a divulgação dos serviços prestados pelo ADMINISTRADOR, a qualquer tempo, mesmo que com intuito comercial, sem qualquer limitação de número de reproduções.`,
      `7.11.1. O ADMINISTRADOR não se responsabiliza pelo uso indevido das imagens captadas por terceiros em exibições e/ou reproduções ocorrida.`,

      // 8. DA INADIMPLÊNCIA
      "<b>8. <u>DA INADIMPLÊNCIA</u></b>",
      `8.1. A falta de pagamento até o dia do vencimento de quaisquer valores devidos ao ADMINISTRADOR em decorrência deste contrato, acarretará na aplicação de <b>multa de 2% (dois por cento)</b> sobre o valor do débito e <b>juros de 1% (um por cento) ao mês</b>, até quitação dos valores em aberto, sendo facultado ao ADMINISTRADOR, visando assegurar o seu crédito, independente de notificação extrajudicial, inscrever o nome do inadimplente em bancos de dados cadastrais (SPC/SERASA/DPC ou órgão equivalente), protestar o débito, valer-se de firma especializada ou contratar advogados. Sendo que, neste caso, o CONTRATANTE responderá pelos honorários destes profissionais.`,
      `8.2. Caso o CONTRATANTE fique inadimplente por prazo superior a <b>48 (quarenta e oito) horas</b> de quaisquer valores devidos a <b>VALE ADMINISTRADORA DE BENS NÁUTICOS</b>, inclusive refentes as parcelas de aquisição da copropriedade da embarcação, terá seu direito a utilização da embarcação suspenso, até quitação dos débitos.`,
      `8.3. Caso o CONTRATANTE fique inadimplente por prazo superior a <b>72 (setenta e duas) horas</b>, terá todas as suas reservas cadastradas no aplicativo imediatamente canceladas, so podendo voltar a fazer novas reservas após o pagamento dos valores em aberto. As reservas canceladas não serão passíveis de retorno, salvo se ainda estiverem disponíveis no calendário da embarcação.`,
      `8.4. Caso o CONTRATANTE fique inadimplente por quaisquer valores referentes a utilização da embarcação e os custos por esta gerados, por prazo superior a <b>90 (noventa) dias</b>, sua cota poderá ser vendida direta ou indiretamente, inclusive podendo ser objeto de leilão virtual, sendo vendida por no mínimo <b>50% (cinquenta por cento)</b> do valor pago pelo CONTRATANTE na aquisiçao da cota.`,
      `8.4.1. O ADMINISTRADOR restituirá ao CONTRATANTE a importância apurada com a venda, descontando os valores em atraso, acrescidos de juros e multa, até a data de concretização da venda.`,
      `8.4.2. Para que a cota seja colocada a venda bastará que o ADMINISTRADOR comunique ao CONTRATANTE inadimplente através do e-mail ou WhatsApp/Telefone informado neste contrato e cadastrado junto a VALE ADMINISTRADORA DE BENS NÁUTICOS.`,
      `8.4.3. Se o valor arrecado com a venda da cota for insuficiente para quitar a dívida, o CONTRATANTE deverá liquidar o valor restante no prazo máximo de 48 (quarenta e oito) horas, sob pena de incorrer no previsto no item 8.1 e item 9.1.`,
      `8.5. O ADMINISTRADOR prestará o serviço de inadimplência diretamente ou poderá contratar terceiros para cobrança.`,

      // 9. NOTIFICAÇÕES E PENALIDADES
      "<b>9. <u>NOTIFICAÇÕES E PENALIDADES</u></b>",
      `9.1. Salvo disposição específica, em caso de descumprimento dos termos e condições dispostos neste instrumento e/ou Manual de Condutas e Procedimentos internos, quando possível o seu saneamento, o ADMINISTRADOR notificará o CONTRATANTE, para que este arque com os valores necessários para o reparo ou realize as condutas devidas para regularização da sua situação, no prazo informado pelo ADMINISTRADOR, o qual será improrrogável, sob pena de <b>multa diária no importe de R$ 500,00 (quinhentos reais)</b>, até efetiva resolução do problema.`,
      `9.2. Havendo sinistro ou qualquer dano irreparável a embarcação, levando a perda total do bem, seja por dolo ou culpa do CONTRATANTE, este deverá restituir o valor total do bem, devidamente atualizado, descontado a sua porcentagem de participação, sendo o valor remanescente repartido entre os demais coproprietários, no limite de suas participações.`,
      `9.3. Com exceção da multa aplicada ao atraso na taxa de administração, os demais valores de multa previsto neste instrumento serão utilizados para custear o dano e o remanescente será revertido para custeio dos custos comuns de utilização do bem, incluindo, a taxa de administração e outros valores devidos ao ADMINISTRADOR.`,

      // 10. DA TRANSFERÊNCIA DE TITULARIDADE DA COTA
      "<b>10. <u>DA TRANSFERÊNCIA DE TITULARIDADE DA COTA</u></b>",
      `10.1. O CONTRATANTE poderá transferir a titularidade de sua propriedade (a cota da Embarcação) para um terceiro a qualquer tempo, desde que o valor da cota esteja quitado e esteja regular com sua parte nos custos da Embarcação. Caso o CONTRATANTE possua valores em aberto e queira realizar a venda da cota quitando os débitos no ato da venda, deverá solicitar previamente autorização do ADMINISTRADOR.`,
      `10.2. Para a transferência da cota, o ADMINISTRADOR receberá do novo coproprietário uma taxa de transferência no valor equivalente a <b>R$ 350,00 (trezentos e cinquenta reais) se for Jetski</b> e <b>R$ 650,00 (seiscentos e cinquenta reais) se for Lancha</b>.`,
      `10.2.1. Constitui-se obrigação do CONTRATANTE informar ao novo coproprietário que além de pagar o valor referente a aquisição da cota, pagará diretamente à VALE ADMINISTRADORA DE BENS NÁUTICOS a taxa de transferência.`,
      `10.2.2. A taxa de transferência servirá para regularização da situação cadastral do novo coproprietário perante o ADMINISTRADOR, como elaboração de documentos, regularização e disponibilização do sistema/aplicativo, 03 (três) aulas práticas e demais custos pertinentes a transferência.`,
      `10.2.3. O combustível das aulas práticas será por conta do coproprietário que irá usufruir destas, estando incluso no valor da transferência apenas o serviço de instrução.`,
      `10.3. O CONTRATANTE tem ciência que o pagamento da taxa de administração faz parte do modelo de negócios desenvolvido pela VALE ADMINISTRADORA DE BENS NÁUTICOS, porem, caso queira, o CONTRATANTE poderá, antecipadamente, efetuar o pagamento da taxa de transferência e isentar o novo coproprietário deste pagamento.`,
      `10.4. Em caso de inadimplência pelo CONTRATANTE durante a transferência de titularidade, o ADMINISTRADOR poderá restringir o acesso do novo coproprietário ao aplicativo, bem como a utilização da embarcação, permitindo acesso apenas após a adimplemento das obrigações contraídas pelo CONTRATANTE.`,
      `10.5. A Taxa de Transferência será abonada caso a cota seja transferida para o DEPENDENTE, ascendentes, descendentes de primeiro grau ou cônjuge.`,
      `10.6. Em caso de transferência de titularidade da embarcação para um terceiro, o ADMINISTRADOR não oferece garantia referente a problemas eletrônicos e motorização que possam vir a surgir, devendo o novo titular ter ciência do estado de conservação dos demais itens da embarcação no ato de assinatura do contrato de administração junto a VALE ADMINISTRADORA DE BENS NÁUTICOS, inclusive de eventuais danos ocultos que possam aparecer no decorrer da utilização do bem.`,

      // 11. FISCALIZAÇÃO E MULTAS
      "<b>11. <u>FISCALIZAÇÃO E MULTAS</u></b>",
      `11.1. Em caso de Fiscalização da Autoridade Marítima brasileira, se a documentação do CONTRATANTE ou da embarcação estiver em desacordo ou se este houver infringido alguma regulamentação da Marinha, será lavrada a notificação.`,
      `11.2. Ao ser notificado por irregularidade, o notificado deverá comunicar o ocorrido imediatamente ao ADMINISTRADOR assim que retornar do passeio. O prazo para defesa prévia junto à Marinha é de até <b>8 (oito) dias corridos</b>. Ao findar o prazo, o auto de infração é lavrado e a notificação é automaticamente convertida em multa. Nesses casos, o ADMINISTRADOR irá solicitar o boleto para pagamento e será enviado ao CONTRATANTE para pagamento em até 48(quarenta e oito) horas úteis.`,
      `11.3. No caso de pagamento de multa ou pena pecuniária pelo CONTRATANTE, fica este obrigado a enviar ao ADMINISTRADOR os comprovantes respectivos, original ou por cópia autenticada, dentro do prazo de 48(quarenta e oito) horas úteis seguintes ao dia do pagamento.`,
      `11.4. Quando possível, o ADMINISTRADOR contratará despachante para fazer recurso, nesse caso o custo do despachante será do responsável pela notificação.`,
      `11.5. Caso a notificação seja efetuada por algum item da embarcação pelo qual o CONTRATANTE não tenha responsabilidade direta (validade do extintor, quantidade de coletes, documento vencido, e afins), o ADMINISTRADOR se responsabilizará na resolução e arcará com qualquer custo que venha a surgir no que se refere à notificação, desde que tenha culpa, excluídos os custos com a compra ou reposição do item em desacordo com as normas.`,

      // 12. DAS RESPONSABILIDADES SOBRE AVARIAS E VISTORIAS
      "<b>12. <u>DAS RESPONSABILIDADES SOBRE AVARIAS E VISTORIAS</u></b>",
      `12.1. O ADMINISTRADOR recomenda, para se resguardar, que o CONTRATANTE faça a vistoria e grave um vídeo para registro do estado geral da embarcação em todos os passeios, na saída e no retorno.`,
      `12.2. Caso algum dos coproprietários não registrem avarias aparentes existentes no casco e equipamentos antes da utilização da embarcação, e o coproprietário que seja o próximo a utilizar venha a registrar avarias antes da saída para o passeio, os custos para o reparo das avarias poderão ser imputados ao ultimo coproprietário que utilizou o bem, conforme definição entre os demais coproprietários e ADMINISTRADOR.`,

      // 13. DAS AULAS PRÁTICAS
      "<b>13. <u>DAS AULAS PRÁTICAS</u></b>",
      `13.1. O ADMINISTRADOR concederá ao CONTRATANTE <b>03 (três) aulas práticas</b> para instruções de condução e utilização da embarcação, bem como para conhecimento do percurso fluvial da região do Vale do São Francisco, limitando-se as cidades de Petrolina e Juazeiro.`,
      `13.2. As aulas terão duração de <b>60(sessenta) minutos cada</b>, sendo permitido apenas uma por dia, devendo serem marcadas de quarta a sexta-feira, durante horário de funcionamento da VALE ADMINISTRADORA DE BENS NÁUTICOS.`,
      `13.3. O CONTRATANTE deverá agendar sua aula com antecedência, conforme disponibilidade prévia da embarcação.`,
      `13.4. Caso o CONTRATANTE não posso comparecer, e não comunique ao ADMINISTRADOR com antecedência prévia de 24(vinte e quatro) horas da data, arcará com o pagamento de <b>taxa de desistência de R$ 50,00 (cinquenta reais)</b>.`,
      `13.5. O combustível será por conta do CONTRATANTE, sendo disponibilizado pelo ADMINISTRADOR apenas o profissional responsável para condução das aulas.`,

      // 14. DA VIGÊNCIA E RESCISÃO DESTE CONTRATO
      "<b>14. <u>DA VIGÊNCIA E RESCISÃO DESTE CONTRATO</u></b>",
      `14.1. Este contrato entra em vigor na data da assinatura e <b>vigorará por prazo indeterminado</b>.`,
      `14.2. O CONTRATANTE está ciente e de acordo que este contrato NÃO poderá ser rescindido até a quitação integral do valor da embarcação, conforme avençado no “CONTRATO DE AQUISIÇÃO DE COPROPRIEDADE DE EMBARCAÇÃO”, firmado em <b>${dataAquisicaoFormatada}</b>, com a VALE ADMINISTRADORA DE BENS NÁUTICOS LTDA, com exceção da ocorrência do previsto no item 8.4.`,
      `14.3. Após a quitação integral do valor da embarcação pelos proprietários, este instrumento poderá ser rescindido mediante comunicação por escrito a outra parte, com antecedência de 30 (trinta) dias da data pretendida para resolução deste contrato, nos seguintes caso:\nI. Concordância de todos os proprietários da embarcação, mediante notificação por escrito e assinada por todos;\nII. Por liberalidade do ADMINISTRADOR.`,
      `14.4. Em caso de rescisão, eventuais débitos do CONTRATANTE serão considerados antecipadamente vencidos em sua integralidade, devendo este quita-los, estando ciente que a rescisão só será efetivada após o pagamento.`,
      `14.5. O término do prazo de vigência deste contrato, por qualquer motivo que for, não terá qualquer efeito liberatório em relação a obrigações assumidas nos termos deste contrato, por qualquer das partes, e ou a ela exigíveis no curso do seu prazo de vigência.`,

      // 15. DAS DISPOSIÇÕES FINAIS
      "<b>15. <u>DAS DISPOSIÇÕES FINAIS</u></b>",
      `15.1. Todas as informações, dados, valores, projetos, documentos e demais informações trocadas durante e em razão deste Contrato, deverão ser tratados como informações sigilosas e restritas, e nenhuma das Partes deverá permitir que terceiros sob a sua responsabilidade façam uso destas informações para fins diversos do objeto do presente acordo, sem o prévio e expresso consentimento da outra Parte, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).`,
      `15.2. Todas as notificações e comunicações relacionadas ao presente Contrato deverão ser feitas por escrito e serão consideradas como recebidas: (a) no dia em que tiverem sido enviadas, se transmitidas por Whatsapp ou e-mail; (b) a contar da comprovação do recebimento, se enviadas por carta via serviço postal ou courrier; ou (c) no dia em que a Parte notificada acusar o recebimento (protocolo), se entregues pessoalmente. As notificações deverão ser remetidas aos endereços indicados no cabeçalho deste instrumento.`,
      `15.3. Ocorrendo qualquer alteração no endereço eletrônico ou postal, obriga-se o respectivo contratante a informar imediatamente o outro, sob pena de permanecer válida, para os fins ora previstos, a comunicação enviada ao endereço anterior.`,
      `15.4. O presente Contrato obriga não só as Partes como também seus herdeiros e legais sucessores.`,
      `15.5. O CONTRATANTE poderá ceder ou transferir os direitos relativos a este contrato desde que mediante autorização prévia do ADMINISTRADOR. Somente o titular da cota terá acesso as informações e participará do grupo da embarcação.`,
      `15.6. O presente Contrato poderá ser alterado e aditado em quaisquer de suas cláusulas e condições, desde que seja de comum acordo entre as partes, por escrito, não valendo como alteração qualquer tolerância ao cumprimento de suas cláusulas.`,
      `15.7. Havendo criação de nova empresa para integrar o GRUPO VALE ADMINISTRADORA DE BENS NAUTICOS, o CONTRATADO poderá ser imediatamente substituído pela nova empresa, a qual se vinculará a todos os direitos e obrigações deste contrato.`,
      `15.8. Havendo fusão ou incorporação do ADMINISTRADOR por outra empresa, o “novo” administrador terá o compromisso de cumprir todas as cláusulas convencionadas neste contrato, sem quaisquer prejuízos para os cotistas e grupos, devendo a nova empresa arcar com a obrigação, imediata, de providenciar nova documentação perante a Marinha do Brasil.`,
      `15.9. Em caso de falência do ADMINISTRADOR, os cotistas decidirão, por maioria (50% + 1 COTISTA), o que fazer com a embarcação da qual são coproprietários. As embarcações não fazem parte do ativo da VALE ADMINISTRADORA DE BENS NAUTICOS, atuando essa apenas como fiel depositária da embarcação.`,
      `15.10. Fica eleito o foro central da <b>Comarca de Petrolina, no Estado de Pernambuco</b>, para dirimir quaisquer questões ou controvérsia derivada deste contrato.`,
      `E, por estarem assim justos e contratados, as partes assinam na presença de 2(duas) testemunhas, o presente termo, em 2 (duas) vias de igual teor e forma.`
    ];

    return {
      type: 'adm',
      title,
      clientStr,
      vendorStr,
      introStr,
      clauses,
      signCompany: {
        name: 'VALE ADMINISTRADORA DE BENS NÁUTICOS LTDA',
        cnpj: 'CNPJ: 62.794.642/0001-67'
      },
      signClient: {
        name: clientData.nome?.toUpperCase() || 'CONTRATANTE',
        cpf: clientData.cpf ? `CPF: ${clientData.cpf}` : 'N/A'
      }
    };
  }
}

export async function buildContractDoc(
  type: 'adm' | 'aquisicao',
  clientData: ClientData,
  boatData: BoatData,
  paymentData?: PaymentData,
  customSections?: ContractSections
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const margins = { top: 20, left: 20, right: 20, bottom: 20 };
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const textWidth = pageWidth - margins.left - margins.right;
  let cursorY = margins.top;

  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await getLogoImage(type);
  } catch (e) {
    console.error("Falha ao carregar logo do contrato", e);
  }

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margins.bottom) {
      doc.addPage();
      if (logoImg) {
        const miniW = 24;
        const miniH = 15;
        doc.addImage(logoImg, 'PNG', (pageWidth - miniW) / 2, 7, miniW, miniH);
        cursorY = 26;
      } else {
        cursorY = margins.top;
      }
    }
  };

  const drawHeaderLogo = () => {
    if (logoImg) {
      const imgW = 34;
      const imgH = 22;
      doc.addImage(logoImg, 'PNG', (pageWidth - imgW) / 2, 10, imgW, imgH);
      cursorY = 36;
    }
  };

  const writeTitle = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(title, textWidth);
    checkPageBreak(lines.length * 5 + 6);
    doc.text(lines, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += lines.length * 5 + 6;
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
      const isSubItem = /^[a-z]\)\s/i.test(rawSubline.trim()) || /^-\s/.test(rawSubline.trim()) || /^I{1,3}\.\s/.test(rawSubline.trim());
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

  const sections = customSections || getContractSections(type, clientData, boatData, paymentData);

  drawHeaderLogo();
  writeTitle(sections.title);
  writeRichParagraph(sections.clientStr);
  writeRichParagraph(sections.vendorStr);
  if (sections.introStr) {
    writeRichParagraph(sections.introStr);
  }

  sections.clauses.forEach(c => {
    writeRichParagraph(c);
  });

  // Seção de Assinaturas
  checkPageBreak(58);
  cursorY += 8;

  const dateExtensoMin = formatDateExtensoMin(clientData.dataAssinatura);
  const dateExtensoCaps = formatDateExtenso(clientData.dataAssinatura);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  const cityDateStr = type === 'aquisicao'
    ? `Petrolina/PE, ${dateExtensoMin}.`
    : `PETROLINA-PE, ${dateExtensoCaps}`;
  doc.text(cityDateStr, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 16;

  // Assinatura Empresa
  doc.setFont("helvetica", "normal");
  doc.text('______________________________________', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 5;
  doc.setFont("helvetica", "bold");
  doc.text(sections.signCompany.name, pageWidth / 2, cursorY, { align: 'center' });
  if (sections.signCompany.cnpj) {
    cursorY += 5;
    doc.setFont("helvetica", "normal");
    doc.text(sections.signCompany.cnpj, pageWidth / 2, cursorY, { align: 'center' });
  }
  cursorY += 14;

  // Assinatura Cliente
  doc.setFont("helvetica", "normal");
  doc.text('______________________________________', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 5;
  doc.setFont("helvetica", "bold");
  doc.text(sections.signClient.name, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 5;
  doc.setFont("helvetica", "normal");
  doc.text(sections.signClient.cpf, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 12;

  // Testemunhas
  checkPageBreak(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text('TESTEMUNHAS:', margins.left, cursorY);
  cursorY += 8;
  doc.setFont("helvetica", "normal");
  doc.text('Nome: ____________________________________    Nome: ____________________________________', margins.left, cursorY);
  cursorY += 6;
  doc.text('CPF:   ____________________________________    CPF:   ____________________________________', margins.left, cursorY);

  // Rodapé Oficial em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const clientNameUpper = (clientData.nome || 'CONTRATANTE').toUpperCase();
    const footerText = type === 'adm'
      ? `Página ${p} de ${totalPages} integrante e indissociável do CONTRATO DE ADMINISTRAÇÃO PARA EMBARCAÇÃO DE USO COMPARTILHADO entre VALE ADMINISTRADORA DE BENS NÁUTICOS e (${clientNameUpper}).`
      : `Página ${p} de ${totalPages} integrante e indissociável do CONTRATO DE AQUISIÇÃO DE COPROPRIEDADE DE EMBARCAÇÃO NOVA firmado entre MEXICANO LANCHAS e COMPRADOR.`;
    doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: 'center', maxWidth: textWidth });
  }

  return doc;
}

export async function generateContract(type: 'adm' | 'aquisicao', clientData: ClientData, boatData: BoatData, paymentData?: PaymentData, customSections?: ContractSections) {
  const doc = await buildContractDoc(type, clientData, boatData, paymentData, customSections);
  doc.save(`Contrato_${type}_${clientData.nome || 'Cliente'}.pdf`);
  return doc;
}

export async function getContractPdfBlob(type: 'adm' | 'aquisicao', clientData: ClientData, boatData: BoatData, paymentData?: PaymentData, customSections?: ContractSections): Promise<Blob> {
  const doc = await buildContractDoc(type, clientData, boatData, paymentData, customSections);
  return doc.output('blob');
}

export async function getContractPdfDataUri(type: 'adm' | 'aquisicao', clientData: ClientData, boatData: BoatData, paymentData?: PaymentData, customSections?: ContractSections): Promise<string> {
  const doc = await buildContractDoc(type, clientData, boatData, paymentData, customSections);
  return doc.output('datauristring');
}
