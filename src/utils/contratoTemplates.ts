import { ContractSections } from '../types';
import { ClientData, BoatData, PaymentData, formatAddress, formatDateDDMMAAAA, formatDateExtenso, formatDateExtensoMin } from '../components/ContractGenerator';
import { formatBoatName } from './constants';

export interface ContractClauseItem {
  id: string;
  numero: string;
  titulo: string;
  texto: string;
}

export interface ContractModelTemplate {
  id: 'aquisicao' | 'adm';
  tipo: 'aquisicao' | 'adm';
  nome: string;
  titulo: string;
  subtitulo: string;
  empresaNome: string;
  empresaCnpj: string;
  empresaEndereco: string;
  empresaEmail: string;
  empresaTelefone: string;
  intro: string;
  clausulas: ContractClauseItem[];
  updatedAt?: string;
}

export const CONTRATO_TAGS = [
  { tag: '{CLIENTE_NOME}', label: 'Nome do Cliente' },
  { tag: '{CPF}', label: 'CPF' },
  { tag: '{RG}', label: 'RG / Órgão' },
  { tag: '{ESTADO_CIVIL}', label: 'Estado Civil' },
  { tag: '{PROFISSAO}', label: 'Profissão' },
  { tag: '{ENDERECO}', label: 'Endereço Completo' },
  { tag: '{TELEFONE}', label: 'Telefone / WhatsApp' },
  { tag: '{EMAIL}', label: 'E-mail' },
  { tag: '{EMBARCACAO}', label: 'Nome da Embarcação' },
  { tag: '{MODELO}', label: 'Modelo' },
  { tag: '{CHASSI}', label: 'Nº do Chassi' },
  { tag: '{INSCRICAO}', label: 'Nº de Inscrição' },
  { tag: '{PROPULSAO}', label: 'Tipo de Propulsão' },
  { tag: '{COTA}', label: 'Cota (ex: 25%)' },
  { tag: '{COTA_EXTENSO}', label: 'Cota Extenso' },
  { tag: '{OUTROS_COTISTAS}', label: 'Qtd Outros Cotistas' },
  { tag: '{VALOR_TOTAL}', label: 'Valor Total (R$)' },
  { tag: '{VALOR_ENTRADA}', label: 'Valor da Entrada (R$)' },
  { tag: '{VALOR_PARCELA}', label: 'Valor da Parcela (R$)' },
  { tag: '{NUM_PARCELAS}', label: 'Nº de Parcelas' },
  { tag: '{FORMA_PAGTO}', label: 'Forma de Pagamento' },
  { tag: '{DIA_VENCIMENTO}', label: 'Dia do Vencimento' },
  { tag: '{TAXA_ADM_MENSAL}', label: 'Taxa Mensal Adm' },
  { tag: '{DATA_ATUAL}', label: 'Data Atual' },
  { tag: '{DATA_EXTENSO}', label: 'Data Extenso' },
];

const STORAGE_PREFIX = 'contrato_modelo_template_';

// Template Padrão Oficial: Aquisição
export const DEFAULT_TEMPLATE_AQUISICAO: ContractModelTemplate = {
  id: 'aquisicao',
  tipo: 'aquisicao',
  nome: 'Contrato de Aquisição de Copropriedade de Embarcação',
  titulo: 'CONTRATO DE AQUISIÇÃO DE COPROPRIEDADE DE EMBARCAÇÃO',
  subtitulo: 'Mexicano Lanchas LTDA',
  empresaNome: 'MEXICANO LANCHAS LTDA',
  empresaCnpj: '42.206.594/0001-31',
  empresaEndereco: 'situada na cidade de Petrolina-PE, no Loteamento Lote 190, nº 190, Estrada da Tapera, CEP: 56334-899',
  empresaEmail: 'vendasmexicanolanchas@gmail.com',
  empresaTelefone: '(87)9 9655-2883',
  intro: 'As partes acima identificadas têm, entre si, justo e acertado o presente contrato para aquisição de cota de embarcação, que se regerá pelas cláusulas a seguir descritas.',
  clausulas: [
    {
      id: 'aq-1',
      numero: '1',
      titulo: 'OBJETO',
      texto: '1.1. Este contrato tem como objeto a aquisição de copropriedade de embarcação, correspondente a <b>{COTA} ({COTA_EXTENSO})</b> do total, pelo COMPRADOR, qual seja: <b>{EMBARCACAO}</b> modelo: <b>{MODELO}</b>, Nº de serie do CHASSI: <b>{CHASSI}</b>, Tipo de propulsão: <b>{PROPULSAO}</b>.'
    },
    {
      id: 'aq-2',
      numero: '2',
      titulo: 'DAS CONDIÇÕES DE AQUISIÇÃO E UTILIZAÇÃO DA EMBARCAÇÃO',
      texto: `2.1. O COMPRADOR está ciente que a presente compra se dará de modo compartilhado, juntamente com <b>mais {OUTROS_COTISTAS} coproprietários</b>, não possuindo o COMPRADOR nenhum poder de intervir na escolha dos demais coproprietários, sendo estes escolhidos por liberalidade única e exclusiva do VENDEDOR, os quais firmarão individualmente negócio jurídico com a <b>MEXICANO LANCHAS</b>.
2.2. Os custos gerados para manutenção e utilização da embarcação, serão <b>rateados pelos COPROPRIETÁRIOS</b>, na proporção da participação de cada um, salvo em caso de negligência, imperícia ou imprudência praticada, no qual o COPROPRIETÁRIO infrator, arcará individualmente com o reparo dos danos.
2.3. O COMPRADOR se compromete a firmar contrato para <b>ADMINISTRAÇÃO da embarcação</b> juntamente a <b>MEXICANO LANCHAS</b>, visto que por se tratar de uma compra de embarcação de modo compartilhado, para manter a organização e isonomia do seu uso, se faz necessário a manutenção do bem por empresa especializada.
2.3.1. A embarcação só poderá ser administrada por outra empresa que não seja integrante do grupo MEXICANO LANCHAS, <b>após a quitação de 100% (cem por cento) do valor total da embarcação</b>, bem como outros débitos relacionados a manutenção, serviço, abastecimentos e demais custos decorrentes da embarcação devidos a MEXICANO LANCHAS.
2.4. Ao firmar o presente contrato, o COMPRADOR garante que cumprirá todas as <b>normas internas de utilização da embarcação e do Estatuto dos Cotistas</b>, passadas pela ADMINISTRADORA e/ou VENDEDOR.
2.5. O COMPRADOR tem ciência que para utilização de Moto Aquática, deverá obrigatoriamente possuir <b>Carteira de Habilitação de Motonauta (MTA)</b>, devendo estar regular e adimplente perante os órgãos fiscalizadores, estando seu acesso ao sistema de agendamento/reservas condicionado a apresentação da referida habilitação.
2.5.1. Caso o COMPRADOR ainda não possua a carteira de habilitação de Motonauta (MTA), poderá adquirir a cota, porém <b>só terá seu acesso ao sistema de agendamento liberado após apresentação do referido documento de habilitação</b>.
2.6. É vedado a qualquer COPROPRIETÁRIO da embarcação: (i)remover a embarcação da marina ou da água para transitar por terra; (ii) uso da embarcação para fins comerciais/exploração econômica ou qualquer fim ilícito; (iv) cessão ou empréstimo da embarcação para terceiros sem a presença do COMPRADOR ou alguns de seus dependentes, devidamente identificados junto a ADMINISTRADORA; (vii) uso para empurrar, puxar ou rebocar outra embarcação ;(viii)uso para transporte de produtos inflamáveis ou explosivos; (ix)permitir que a pilotagem ou condução da embarcação em estado de embriagues, por si ou por terceiros; (x)uso ou porte de substância psicotrópica, narcótica ou similar.
2.6.1. Em caso de descumprimento dos itens elencados no item 2.6, a parte infratora arcará com <b>multa no valor de 2 (dois) salários mínimos vigentes a época</b>, que serão destinados a ADMINISTRADORA para custos de manutenção e conservação da embarcação.
2.6.2. Além da multa acima prevista, eventuais danos ocasionados ao bem ou a terceiros pela prática de algum dos itens descritos no item 2.6, a parte infratora <b>arcará individualmente com estes</b>, sem direito a ressarcimento pelos demais coproprietários.`
    },
    {
      id: 'aq-3',
      numero: '3',
      titulo: 'DO PREÇO, FORMA DE PAGAMENTO E INADIMPLÊNCIA',
      texto: `3.1. O COMPRADOR pagará pela aquisição de <b>{COTA} ({COTA_EXTENSO})</b> da propriedade da embarcação, objeto deste contrato, o valor total de <b>{VALOR_TOTAL}</b> a ser efetuado da seguinte forma:
a) Pagamento de <b>{VALOR_ENTRADA}</b> a título de entrada, que será pago à vista no momento da assinatura do presente contrato.
b) O valor remanescente deverá ser pago em <b>{NUM_PARCELAS} parcelas de {VALOR_PARCELA}</b>, mediante <b>{FORMA_PAGTO}</b>, com o vencimento para o <b>dia {DIA_VENCIMENTO} de cada mês</b>, servindo comprovante de pagamento/transferência como recibo de quitação.
3.2. Em caso de inadimplência incidirá <b>multa no importe de 10% (dez por cento)</b> do valor da parcela e <b>juros de mora correspondente a 1% (um por cento) ao mês</b>.
3.3. Caso a inadimplência persista por prazo superior a <b>30(trinta) dias</b>, será facultado ao VENDEDOR, visando assegurar o seu crédito, independente de notificação prévia, inscrever o nome do inadimplente em bancos de dados cadastrais (SPC/SERASA/DPC ou órgão equivalente), protestar o débito, valer-se de firma especializada ou contratar advogados. Sendo que, neste caso, o COMPRADOR responderá pelos honorários destes profissionais.
3.4. A falta de pagamento por prazo superior a <b>60 (sessenta) dias</b>, poderá acarretar na rescisão deste contrato, por liberalidade do VENDEDOR, sendo aplicado o disposto no item 8.3, além de <b>multa rescisória de 30% do valor do contrato</b> a título de utilização do bem, que será convertido em taxa de locação da embarcação, com agravante da reparação dos danos que porventura causar ao bem objeto deste contrato.
3.5. Enquanto o COMPRADOR estiver em situação de inadimplemento, <b>ficará impedido de utilizar a embarcação</b>, até efetiva quitação do débito, sem direito a qualquer indenização, reclamação ou reposição dos dias em que deixou de utilizar o bem.`
    },
    {
      id: 'aq-4',
      numero: '4',
      titulo: 'DA TRANSFERÊNCIA DE TITULARIDADE DA COTA',
      texto: `4.1. O registro de propriedade da embarcação está em nome do VENDEDOR, após quitação total do valor da embarcação, poderá ser transferida para o nome de algum dos coproprietários ou terceiro indicado por estes, mediante prévia anuência de todos os cotistas, correndo por conta destes todos os custos para transferência.
4.2. O COMPRADOR/COTISTA poderá vender sua cota, respeitando o limite de sua participação, <b>desde que tenha quitado o valor total correspondente a sua cota perante o VENDEDOR</b>, salvo mediante prévia anuência do VENDEDOR para prosseguir diferente.
4.3. O FUTURO COTISTA/COMPRADOR deverá aderir integralmente aos termos e disposições deste contrato.
4.4. Para novo cadastro ou transferência da titularidade da COTA, será devido a ADMINISTRADORA uma <b>taxa de transferência, no importe de R$ 350,00 se moto aquática e R$ 650,00 se lancha</b>.`
    },
    {
      id: 'aq-5',
      numero: '5',
      titulo: 'DAS OBRIGAÇÕES DO COMPRADOR',
      texto: `5.1. O COMPRADOR será responsável pela condução e conservação da embarcação adquirida, devendo garantir a utilização do bem em conformidade com as normas internas da ADMINISTRADORA, do Estatuto Do Cotista, das especificações do fabricante, das disposições deste contrato e da legislação vigente.
5.2. O COMPRADOR se compromete, de modo pessoal e irrestrito, a reparar todos os danos e prejuízos ocorridos em virtude do uso da embarcação, por si, seus dependentes ou terceiros que tenham acesso a embarcação por meio do COMPRADOR.
5.3. Em caso de qualquer sinistro/acidente envolvendo a embarcação, o COMPRADOR fica obrigado a comunicar imediatamente ao VENDEDOR e a ADMINISTRADORA.`
    },
    {
      id: 'aq-6',
      numero: '6',
      titulo: 'DAS AULAS PRÁTICAS',
      texto: `6.1. Está incluso na taxa de cadastro/transferência o direito a <b>3 (três) aulas práticas</b> para instruções de condução e utilização da embarcação adquirida, bem como para conhecimento do percurso fluvial da região do Vale do São Francisco, limitando-se as cidades de Petrolina e Juazeiro.
6.2. As aulas poderão ser agendadas conforme disponibilidade prévia da embarcação e do profissional indicado pela MEXICANO LANCHAS, com duração máxima de 60 minutos cada aula.`
    },
    {
      id: 'aq-7',
      numero: '7',
      titulo: 'DA GARANTIA',
      texto: `7.1. A Embarcação terá cobertura de <b>GARANTIA DE 3 (TRÊS) meses</b>, fornecido pela (MEXICANO LANCHAS), para defeitos de fabricação, todavia, para isso, o COMPRADOR deverá seguir as regras contidas nos manuais e demais instruções emitidas pelo FABRICANTE e informadas no termo de garantia.
7.2. Em casos de mau uso, conservação inadequada, impactos, riscos e eletrólise, seja por ação ou omissão, a garantia não cobrirá os danos.`
    },
    {
      id: 'aq-8',
      numero: '8',
      titulo: 'DA VIGÊNCIA, RESCISÃO E DESISTÊNCIA DA AQUISIÇÃO',
      texto: `8.1. Este contrato iniciará sua vigência na data de sua assinatura e terminará com o cumprimento de todas as obrigações aqui contraídas.
8.2. O presente contrato poderá ser rescindido pelo VENDEDOR, independentemente de justificação ou interpelação judicial ou extrajudicial, caso o COMPRADOR descumpra quaisquer das cláusulas ou condições deste instrumento.
8.3. Havendo rescisão deste instrumento, o COMPRADOR deverá restituir imediatamente ao VENDEDOR a propriedade e posse da embarcação, no limite das suas cotas, com decréscimo rescisório de 30% sobre os valores pagos.`
    },
    {
      id: 'aq-9',
      numero: '9',
      titulo: 'DISPOSIÇÕES FINAIS',
      texto: `9.1. O COMPRADOR declara neste ato que realizou a vistoria da embarcação adquirida, reconhecendo plenamente o seu estado e funcionamento.
9.2. Aplica-se o disposto no <b>Artigo 784, III, do Código de Processo Civil Brasileiro</b>, haja vista o caráter de título executivo extrajudicial do presente instrumento.
9.3. Fica eleito o foro central da <b>Comarca de Petrolina, no Estado de Pernambuco</b>, para dirimir quaisquer questões ou controvérsia derivada deste contrato.`
    }
  ]
};

// Template Padrão Oficial: Administração
export const DEFAULT_TEMPLATE_ADM: ContractModelTemplate = {
  id: 'adm',
  tipo: 'adm',
  nome: 'Contrato de Administração para Embarcação de Uso Compartilhado',
  titulo: 'CONTRATO DE ADMINISTRAÇÃO PARA EMBARCAÇÃO DE USO COMPARTILHADO',
  subtitulo: 'Vale Administradora de Bens Náuticos LTDA',
  empresaNome: 'VALE ADMINISTRADORA DE BENS NÁUTICOS LTDA',
  empresaCnpj: '62.794.642/0001-67',
  empresaEndereco: 'situada na cidade de Petrolina-PE, no Loteamento Lote 190, nº 190, Estrada da Tapera, CEP: 56334-899',
  empresaEmail: 'atendimentovaleadm@gmail.com',
  empresaTelefone: '(87)9 9109-0051',
  intro: `<u>CONSIDERANDO</u> que o CONTRATANTE firmou contrato para aquisição de copropriedade da embarcação <b>{EMBARCACAO}</b>, se comprometendo a pactuar contrato de administração da embarcação com empresa <b>VALE ADMINISTRADORA NÁUTICA</b>;\n\n<u>CONSIDERANDO</u> que apesar de se tratar de embarcação de uso compartilhado, os coproprietários são pessoas independentes;\n\n<u>CONSIDERANDO</u> que a <b>VALE ADMINISTRADORA DE BENS NÁUTICOS</b> possui a expertise necessária para o referido serviço.\n\nAs partes acima têm justo e acertado o presente Contrato de Administração, regendo-se pelas cláusulas a seguir:`,
  clausulas: [
    {
      id: 'adm-1',
      numero: '1',
      titulo: 'DO OBJETO',
      texto: `1.1. Constitui-se objeto deste contrato o serviço de gerenciamento completo da embarcação: Nº de inscrição: <b>{INSCRICAO}</b>, Tipo de propulsão: <b>{PROPULSAO}</b>, Nº de Série: <b>{CHASSI}</b>, por parte do ADMINISTRADOR em favor do CONTRATANTE.
1.2. O ADMINISTRADOR desempenhará as funções de comunicação, acompanhamento de manutenções, gestão financeira, controle de reservas e suporte perante a Marina.`
    },
    {
      id: 'adm-2',
      numero: '2',
      titulo: 'DAS CONDIÇÕES DE UTILIZAÇÃO DA EMBARCAÇÃO',
      texto: `2.1. O CONTRATANTE deverá realizar a reserva para utilização da embarcação através do <b>SISTEMA DE RESERVAS DA VALE ADMINISTRADORA DE BENS NÁUTICOS</b>, com direito a 01 (um) sábado e 01 (um) domingo por mês, podendo utilizar de quarta a sexta-feira livremente, conforme disponibilidade prévia.
2.2. O uso da embarcação deverá obedecer ao <b>Manual de Condutas e Procedimentos internos</b> da <b>VALE ADMINISTRADORA DE BENS NÁUTICOS</b>.
2.3. O CONTRATANTE é responsável pelo abastecimento logo após a devolução da embarcação.
2.4. Os custos gerados para manutenção serão rateados entre os coproprietários, salvo caso de imprudência comprovada.`
    },
    {
      id: 'adm-3',
      numero: '3',
      titulo: 'DA RESERVA',
      texto: `3.1. Para utilização da embarcação, o CONTRATANTE deverá realizar a reserva da data, sendo permitido apenas <b>02 (duas) reservas simultâneas</b> no sistema.
3.2. Cancelamentos sem penalidade devem ser feitos com no mínimo 18 horas de antecedência.`
    },
    {
      id: 'adm-4',
      numero: '4',
      titulo: 'DAS DELIBERAÇÕES SOBRE OS CUSTOS DA EMBARCAÇÃO E RATEIO',
      texto: `4.1. Os custos gerados pela embarcação serão rateados pelos coproprietários, na medida do percentual da propriedade de cada um.
4.2. As faturas mensais serão emitidas até o último dia de cada mês, para pagamento até o <b>dia 10 de cada mês</b>.
4.3. Havendo necessidade de reparos emergenciais por mau uso, serão emitidas faturas avulsas com vencimento em até 48 horas.`
    },
    {
      id: 'adm-5',
      numero: '5',
      titulo: 'DOS VALORES DEVIDO AO ADMINISTRADOR',
      texto: `5.1. Em decorrência do serviço prestado pelo ADMINISTRADOR, será devida a Taxa Mensal de Administração no valor de <b>{TAXA_ADM_MENSAL}</b> por cotista.
5.2. O pagamento será realizado através de boleto bancário, até o <b>dia {DIA_VENCIMENTO} de cada mês</b>.
5.3. Os valores serão reajustados anualmente no mês de janeiro com base na variação dos custos operacionais.`
    },
    {
      id: 'adm-6',
      numero: '6',
      titulo: 'RESPONSABILIDADES DAS PARTES',
      texto: `6.1. O ADMINISTRADOR se compromete a fiscalizar o uso igualitário e organizar manutenções preventivas e periódicas.
6.2. O CONTRATANTE se compromete a zelar pelo patrimônio, operar somente com habilitação náutica regular e assumir integral responsabilidade por seus convidados.`
    },
    {
      id: 'adm-7',
      numero: '7',
      titulo: 'DA INADIMPLÊNCIA',
      texto: `7.1. A falta de pagamento na data de vencimento acarretará multa de 2% e juros de 1% ao mês.
7.2. Inadimplência superior a 48 horas suspende o direito de uso e agendamento da embarcação.`
    },
    {
      id: 'adm-8',
      numero: '8',
      titulo: 'DISPOSIÇÕES FINAIS E FORO',
      texto: `8.1. O presente contrato vigorará por prazo indeterminado, vinculado à copropriedade do bem.
8.2. Fica eleito o foro da <b>Comarca de Petrolina - Estado de Pernambuco</b> para dirimir quaisquer litígios decorrentes deste contrato.`
    }
  ]
};

// Obter Template Salvo (ou Padrão)
export function getContractModelTemplate(type: 'aquisicao' | 'adm'): ContractModelTemplate {
  if (typeof window === 'undefined') {
    return type === 'aquisicao' ? DEFAULT_TEMPLATE_AQUISICAO : DEFAULT_TEMPLATE_ADM;
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${type}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.clausulas && Array.isArray(parsed.clausulas)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(`Erro ao carregar template do modelo ${type}:`, e);
  }
  return type === 'aquisicao' ? DEFAULT_TEMPLATE_AQUISICAO : DEFAULT_TEMPLATE_ADM;
}

// Salvar Template Personalizado
export function saveContractModelTemplate(template: ContractModelTemplate): void {
  if (typeof window === 'undefined') return;
  try {
    const dataWithTime = {
      ...template,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`${STORAGE_PREFIX}${template.id}`, JSON.stringify(dataWithTime));
    notifyTemplateChange(template.id);
  } catch (e) {
    console.error('Erro ao salvar template do contrato:', e);
  }
}

// Restaurar Template Padrão de Fábrica
export function resetContractModelTemplate(type: 'aquisicao' | 'adm'): ContractModelTemplate {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${type}`);
    } catch {}
  }
  const defaultTpl = type === 'aquisicao' ? DEFAULT_TEMPLATE_AQUISICAO : DEFAULT_TEMPLATE_ADM;
  notifyTemplateChange(type);
  return defaultTpl;
}

// Sistema de Notificação de Mudança de Template
type TemplateChangeListener = (type: 'aquisicao' | 'adm') => void;
const listeners = new Set<TemplateChangeListener>();

export function onContractTemplateChange(callback: TemplateChangeListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyTemplateChange(type: 'aquisicao' | 'adm') {
  listeners.forEach(fn => {
    try {
      fn(type);
    } catch (e) {
      console.warn('Erro ao notificar listener de template:', e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('contrato_template_updated', { detail: { type } }));
  }
}

// Substituir tags em um texto
export function replaceContractTags(text: string, context: Record<string, string>): string {
  if (!text) return '';
  let res = text;
  Object.entries(context).forEach(([key, val]) => {
    const pattern = new RegExp(`\\{${key}\\}`, 'gi');
    res = res.replace(pattern, val || '');
  });
  return res;
}

// Compilar Template para ContractSections com dados dinâmicos do cliente e da embarcação
export function compileTemplateToSections(
  type: 'aquisicao' | 'adm',
  clientData: ClientData,
  boatData: BoatData,
  paymentData?: PaymentData
): ContractSections {
  const template = getContractModelTemplate(type);
  const fullAddress = formatAddress(clientData);

  const formatR$ = (val?: string) => {
    if (!val) return '';
    const trimmed = val.trim();
    if (trimmed.startsWith('R$')) return trimmed;
    return `R$ ${trimmed}`;
  };

  const isJet = boatData.tipo === 'jet' || /jet|moto\s*aqu[aá]tica|yamaha\s*1100|sea[\s-]*doo/i.test(`${boatData.nome || ''} ${boatData.modelo || ''}`);
  const boatNameRaw = formatBoatName(boatData.nome) || 'MEXICANO';
  const boatName = /^(moto aquática|lancha|embarcação)/i.test(boatNameRaw)
    ? boatNameRaw
    : `${isJet ? 'MOTO AQUÁTICA' : 'EMBARCAÇÃO'} ${boatNameRaw}`;

  const boatModelo = boatData.modelo || (isJet ? 'YAMAHA 1100' : 'N/A');
  const boatChassi = boatData.chassi || 'N/A';
  const boatInscricao = boatData.inscricao || 'N/A';
  const boatPropulsao = boatData.tipo_propulsao || (isJet ? 'TURBO JATO' : 'MOTOR CENTRO-RABETA');

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

  const vTotal = formatR$(paymentData?.valorTotal || '55.000,00');
  const vEntrada = formatR$(paymentData?.valorEntrada || '12.040,00');
  const nParc = paymentData?.numParcelas || '24';
  const vParcela = formatR$(paymentData?.valorParcela || '1.790,00');
  const formaPag = paymentData?.formaPagamento || 'boleto / transferência bancária';
  const diaVenc = paymentData?.diaVencimento || '10';
  const taxaAdm = formatR$(paymentData?.taxaMensalAdm || '491,55');

  const dataAtual = formatDateDDMMAAAA(clientData.dataAssinatura || new Date().toISOString().split('T')[0]);
  const dataExtenso = type === 'aquisicao'
    ? formatDateExtensoMin(clientData.dataAssinatura)
    : formatDateExtenso(clientData.dataAssinatura);

  const tagsContext: Record<string, string> = {
    CLIENTE_NOME: clientData.nome || 'NÃO INFORMADO',
    CPF: clientData.cpf || 'NÃO INFORMADO',
    RG: clientData.rg ? `${clientData.rg.trim()}${clientData.orgaoEmissor ? ' ' + clientData.orgaoEmissor.trim() : ''}` : 'NÃO INFORMADO',
    ESTADO_CIVIL: (clientData.estadoCivil || 'solteiro(a)').toLowerCase(),
    PROFISSAO: (clientData.profissao || 'não informado').toLowerCase(),
    ENDERECO: fullAddress,
    TELEFONE: clientData.telefone || 'NÃO INFORMADO',
    EMAIL: clientData.email || 'NÃO INFORMADO',
    EMBARCACAO: boatName,
    MODELO: boatModelo,
    CHASSI: boatChassi,
    INSCRICAO: boatInscricao,
    PROPULSAO: boatPropulsao,
    COTA: cotaPercentual,
    COTA_EXTENSO: cotaExtenso,
    OUTROS_COTISTAS: outrosCotistasStr,
    VALOR_TOTAL: vTotal,
    VALOR_ENTRADA: vEntrada,
    NUM_PARCELAS: nParc,
    VALOR_PARCELA: vParcela,
    FORMA_PAGTO: formaPag,
    DIA_VENCIMENTO: diaVenc,
    TAXA_ADM_MENSAL: taxaAdm,
    DATA_ATUAL: dataAtual,
    DATA_EXTENSO: dataExtenso
  };

  const rgFormatted = tagsContext.RG;
  const estCivil = tagsContext.ESTADO_CIVIL;

  // Montagem do preâmbulo
  const clientStr = type === 'aquisicao'
    ? `COMPRADOR: Nome: <b>${clientData.nome || 'NÃO INFORMADO'}</b>, Nacionalidade: <b>${(clientData.nacionalidade || 'BRASILEIRO').toUpperCase()}</b>, Estado civil: <b>${estCivil}</b>, Profissão: <b>${clientData.profissao || 'NÃO INFORMADO'}</b>, inscrito no CPF sob o nº <b>${clientData.cpf || 'NÃO INFORMADO'}</b>, portador da carteira de identidade nº <b>${rgFormatted}</b>, Endereço: <b>${fullAddress}</b>, contato (WhatsApp): <b>${clientData.telefone || 'NÃO INFORMADO'}</b>.`
    : `CONTRATANTE: Nome: <b>${clientData.nome || 'NÃO INFORMADO'}</b>, Nacionalidade: <b>${(clientData.nacionalidade || 'BRASILEIRO').toUpperCase()}</b>, Estado civil: <b>${estCivil.toUpperCase()}</b>, Profissão: <b>${(clientData.profissao || 'NÃO INFORMADO').toUpperCase()}</b>, inscrito no CPF sob o nº <b>${clientData.cpf || 'NÃO INFORMADO'}</b>, portador da carteira de identidade nº <b>${rgFormatted}</b>, Endereço: <b>${fullAddress}</b>, contato (WhatsApp): <b>${clientData.telefone || 'NÃO INFORMADO'}</b>.`;

  const vendorStr = type === 'aquisicao'
    ? `VENDEDOR: <b>${template.empresaNome}</b>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <b>${template.empresaCnpj}</b>, ${template.empresaEndereco}, endereço eletrônico: <b>${template.empresaEmail}</b>, WhatsApp: <b>${template.empresaTelefone}</b>.`
    : `CONTRATADO/ADMINISTRADOR: <b>${template.empresaNome}</b>, pessoa jurídica de direito privado, CNPJ: <b>${template.empresaCnpj}</b>, ${template.empresaEndereco}, endereço eletrônico: <b>${template.empresaEmail}</b>, WhatsApp: <b>${template.empresaTelefone}</b>.`;

  const introStr = replaceContractTags(template.intro, tagsContext);

  // Mapeamento de cláusulas
  const clauses: string[] = [];
  template.clausulas.forEach(item => {
    clauses.push(`<b>${item.numero ? `${item.numero}. ` : ''}<u>${item.titulo}</u></b>`);
    const replaced = replaceContractTags(item.texto, tagsContext);
    clauses.push(replaced);
  });

  return {
    type,
    title: replaceContractTags(template.titulo, tagsContext),
    clientStr,
    vendorStr,
    introStr,
    clauses,
    signCompany: {
      name: template.empresaNome,
      cnpj: template.empresaCnpj ? `CNPJ: ${template.empresaCnpj}` : undefined
    },
    signClient: {
      name: `${(clientData.nome || (type === 'aquisicao' ? 'COMPRADOR' : 'CONTRATANTE')).toUpperCase()}`,
      cpf: clientData.cpf ? `CPF: ${clientData.cpf}` : 'N/A'
    }
  };
}
