export type Question = {
  id: string;
  pergunta: string;
  opcoes: string[];
  respostaCorreta: number;
  categoria: string;
  explicacao: string;
};

export const QUESTION_BANK: Question[] = [
  {
    id: "q1",
    pergunta: "As luzes de bordos, de mastro e de alcançados são:",
    opcoes: ["Circulares brancas","Circulares","Setorizadas para melhor identificar o movimento da embarcação, à noite","Circulares encarnadas","De acordo com o tipo de embarcação"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q2",
    pergunta: "No rio onde duas lanchas de esporte e recreio navegam em rumos opostos, como deverá ser a manobra e quem tem preferência?",
    opcoes: ["A que vem contra a corrente deverá se posicionar na margem de bombordo mais próxima, e a outra no meio do rio, não havendo preferência de manobra entre elas.","A que vem contra a corrente deverá se posicionar no meio do rio e a outra em qualquer margem, sendo que a que vem contra a corrente tem preferência.","A que vem contra a corrente deverá se posicionar no meio do rio e a outra na sua margem direita, sendo que a que vem contra a corrente tem a preferência.","A que vem a favor da corrente deverá se posicionar no meio do rio e a outra na sua margem de boreste, sendo que a que vem a favor da corrente tem preferência.","A que vem a favor da corrente deverá se posicionar no meio do rio e a outra na sua margem direita, sendo que a que vem a favor da corrente tem preferência."],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q3",
    pergunta: "O que vem a ser velocidade de segurança e o que devemos fazer quando cruzamos com outras embarcações atracadas ou fundeadas ou mesmo localidades às margens dos rios e canais?",
    opcoes: ["É a velocidade que possibilita uma ação apropriada e eficaz de evitar um abalroamento e de parar a embarcação a uma distância segura. Devemos diminuir a velocidade.","É a velocidade ideal de cruzeiro da embarcação para condições que exijam maiores cuidados na navegação, como baixa visibilidade. Devemos diminuir a velocidade.","É a velocidade máxima permitida em uma determinada região de tráfego. Devemos aumentar a velocidade para passar mais rapidamente por esses locais.","É a velocidade máxima permitida em uma determinada região de tráfego. Devemos manter a velocidade para evitar variações da corrente de esteira da embarcação.","É a velocidade mínima para se parar a embarcação com segurança. Devemos diminuir a velocidade."],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q4",
    pergunta: "O sinal lateral de canal que fica a boreste de quem entra no porto tem a cor:",
    opcoes: ["Verde","Branca","Preta e branca","Amarela","Encarnada"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q5",
    pergunta: "A sinalização de águas seguras significa:",
    opcoes: ["Águas policiadas","Águas navegáveis","Águas limítrofes","Águas rasas","Águas sem circulação"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q6",
    pergunta: "Num pilar de uma ponte sobre um rio navegável, observou-se um triângulo vermelho, isto significa que o:",
    opcoes: ["Tráfego está proibido","Tráfego está à direita de quem desce e à esquerda de quem sobe o rio","Tráfego é permitido com sentido único","Tráfego está sujeito a interrupção no período de seca","Tráfego está à esquerda de quem desce e à direita de quem sobe o rio"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q7",
    pergunta: "O que é amarra?",
    opcoes: ["É uma corrente ou cabo que serve para prender a Âncora ao mastro","É uma corrente ou cabo que serve para prender a âncora ao porão da amarra","É uma corrente que serve para prender a âncora ao anete","É uma corrente ou cabo que serve para prender a âncora ao escovém da embarcação","É uma corrente ou cabo que serve para prender a âncora ao paiol da amarra ou ao convés da embarcação"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q8",
    pergunta: "Para se fundear com corrente e vento, deve-se:",
    opcoes: ["Sempre aproar, entre vento e corrente, ao que estiver mais fraco","Fundear, independente do efeito do vento ou da corrente","Sempre empopar ao que estiver mais forte","Aproar ao vento ou à corrente, sempre a que estiver mais forte","Aproar à corrente, independente do vento"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q9",
    pergunta: "Extintores portáteis são:",
    opcoes: ["Equipamentos de apoio ao controle de avarias","Equipamentos que retiram o combustível da reação, para apagar o fogo","Equipamentos de extinção de incêndios, somente da classe A","Equipamentos que utilizam o comburente para apagar o fogo","Equipamentos de combate a incêndio, que utilizam os agentes extintores para apagar o fogo"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q10",
    pergunta: "O incêndio da classe C é o:",
    opcoes: ["Que ocorre na presença de agente extintor","Que ocorre em equipamentos elétricos","Que ocorre em líquidos inflamáveis","Que ocorre em metais inflamáveis","Que ocorre em materiais sólidos inflamáveis"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q11",
    pergunta: "O que vem a ser combustível?",
    opcoes: ["O elemento que possui o oxigênio necessário para a queima","O elemento que oferece risco de explodir","O elemento que reage com outros, para evitar a combustão","O elemento natural, que gera altas temperaturas, ao entrar em contato com o ar atmosférico","O elemento da natureza capaz de se queimar na presença de oxigênio e da temperatura de ignição"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q12",
    pergunta: "Nos casos de ingestão de substâncias corrosivas, cáusticos em geral e derivados de petróleo, diluir ou neutralizar essas substancias pela ingestão de:",
    opcoes: ["Azeite","Xarope de ipeca","Água ou leite","Chá preto ou café","Xarope de boldo"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q13",
    pergunta: "As principais complicações de uma ferida são:",
    opcoes: ["Bolhas e queimaduras","Hemorragia e infecção","Infecção e queimadura","Bolhas e hemorragia","Hemorragia e febre"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q14",
    pergunta: "Para que serve o colete salva-vidas que deverá ser guardado a bordo na quantidade exigida pela Legislação?",
    opcoes: ["Para ser utilizado como meio de flutuação, quando o passageiro desejar pular na água para nadar um pouco.","Para ser utilizado, como material de controle de avarias, no caso de acidentes com o casco da embarcação","Para ser vestido, no caso de incêndio a bordo, como roupa de proteção","Para ser vestido em caso de práticas desportivas náuticas","Para ser vestido, no caso de ter que se abandonar a embarcação, para que o náufrago flutue com ele"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q15",
    pergunta: "A balsa salva-vidas rígida serve para ser utilizada:",
    opcoes: ["Para apoio à manutenção do casco da embarcação","Para abandonar a embarcação em caso de emergência","Para lazer em proximidades de praias","No caso de incêndio a bordo","No caso de emergência a bordo"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q16",
    pergunta: "Quando alguém de sua embarcação cair no mar você deve:",
    opcoes: ["Telefonar para os bombeiros","Dar 3 apitos curtos","Içar a bandeira alfa","Jogar uma boia salva-vidas, mantendo a pessoa no visual e mandar avisar a quem estiver na manobra","Dar 2 apitos longos"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q17",
    pergunta: "No caso de afogamento proceder do seguinte modo:",
    opcoes: ["Deite o afogado de lado e faça respiração boca a boca","Deite o afogado de lado e faça-o vomitar, depois aqueça-o com um cobertor","Deite o afogado de barriga para cima, para ele poder respirar melhor e nunca lhe dê bebidas quentes","Deite o afogado de lado para vomitar a água que bebeu, tire a roupa molhada e aqueça-o","Deite afogado de barriga para cima para ele poder respirar melhor e lhe dê bebidas quentes"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q18",
    pergunta: "A embarcação apreendida deve ser recolhida a local determinado pela:",
    opcoes: ["Polícia federal","Polícia Marítima","Representante da Autoridade Marítima","Prefeitura local","Lei estadual"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q19",
    pergunta: "A distância mínima de fundeio de qualquer embarcação para uma plataforma de petróleo é:",
    opcoes: ["500 metros","100 metros","400 metros","200 metros","300 metros"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q20",
    pergunta: "Além de outros fatores, a sobrevivência do náufrago depende do período de permanência em função da temperatura da água do mar. No que diz respeito a temperatura ambiente (temperatura do ar), seus efeitos sobre o pessoal estão intimamente ligados:",
    opcoes: ["À pressão atmosférica","Aos sistemas frontais","As nuvens","As correntes marinhas","A velocidade do vento"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q21",
    pergunta: "As âncoras flutuantes das balsas devem ser mantidas na água, visando reduzir:",
    opcoes: ["O vento","A velocidade de deriva","A altura das ondas","A possibilidade de emborcamento","O risco de tubarões"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q22",
    pergunta: "A distância vertical da superfície da água até o pavimento principal (normalmente o convés) medida em qualquer ponto do comprimento do barco no costado é conhecido como:",
    opcoes: ["Meia borda","Obras vivas","Verdugo","Borda livre","Borda falsa"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q23",
    pergunta: "A quantidade e tipo de extintores a bordo de um barco de esporte e laser são estabelecidos por uma Norma da (do):",
    opcoes: ["Serviço de Socorro e Salvamento no mar","Corpo de Bombeiros do Estado","Diretoria de Portos e Costas","Capitania dos Portos da região","Agência Nacional de Águas"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q24",
    pergunta: "Além do estancamento e torniquete, também podemos tentar conter uma hemorragia numa perna:",
    opcoes: ["Colocando água quente na hemorragia","Fazendo duplo torniquete","Levantando a perna com hemorragia mais alto que o resto do corpo","Ministrando sedativos para o paciente","Ministrando ao paciente remédios anticoagulantes"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q25",
    pergunta: "Com relação ao comportamento e atuação do leme em uma embarcação é correto afirmar que:",
    opcoes: ["Quando maior o ângulo do leme, mais lenta será a guinada","O ângulo do leme não interfere na velocidade da guinada","Quando menor o ângulo do leme, maior será a inclinação (banda)","Quanto menor o ângulo do leme, mais rápida será a guinada","Quanto maior o ângulo de leme, mais rápida será a guinada"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q26",
    pergunta: "De acordo com o Regulamento Internacional Para Evitar Abalroamento no Mar (RIPEAM), em uma curva acentuada de um rio, quando não visibilidade além da curva, há a necessidade de ser(em) soado(s):",
    opcoes: ["Dois apitos longos antes da curva","Cinco ou mais apitos longos antes da curva","Quatro apitos longos antes da curva","Três apitos longos antes da curva","Um apito longo antes da curva"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q27",
    pergunta: "De acordo com o Regulamento Internacional Para Evitar Abalroamento no Mar (RIPEAM), em uma situação de risco de abalroamento constatou-se que um dos barcos tem preferência. Sendo assim, o barco que tem preferência deverá em princípio:",
    opcoes: ["Guinar para boreste ou bombordo e desviar","Manter seu rumo e diminuir a velocidade","Descartar a responsabilidade de abalroamento","Guinar para boreste para desviar do outro","Manter seu rumo e velocidade"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q28",
    pergunta: "De acordo com o Regulamento Internacional Para Evitar Abalroamento no Mar (RIPEAM), estando fora de um canal estreito e em segurança, qual é p bordo que uma embarcação pode utilizar para se fazer uma ultrapassagem de outra embarcação?",
    opcoes: ["Somente bombordo","Somente boreste","Não deverá ultrapassar sem permissão","Qualquer bordo","Não poderá ultrapassar de qualquer maneira"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q29",
    pergunta: "De acordo com o Regulamento Internacional Para Evitar Abalroamento no Mar (RIPEAM), quando fundeado à noite com minha lancha de nove metros de comprimento, além de exibir uma luz circular branca onde melhor possa ser vista, posso também nesta situação:",
    opcoes: ["Acender todas as luzes do mastro","Acender a luz encarnada a bombordo e verde a boreste","Acender somente as luzes necessárias para pesca amadora","Acender qualquer luz de navegação pois meu barco estará parado","Iluminar todo convés principal"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q30",
    pergunta: "De acordo com o Regulamento Internacional Para Evitar Abalroamento no Mar (RIPEAM), um navio que, durante o dia, está com manobra restrita devido ao seu calado deverá içar que marcas no mastro?",
    opcoes: ["Um cilindro preto","Duas esferas pretas","Uma esfera azul","Uma esfera preta","Um cone azul"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q31",
    pergunta: "Dentre as alternativas abaixo, o único que precisa estar permanentemente com o colete salva-vidas vestido é:",
    opcoes: ["Condutor de moto-aquática","Passageiro de uma embarcação de médio porte","Proeiro de qualquer embarcação de grande porte","Cozinheiro da embarcação","Comandante da lancha"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q32",
    pergunta: "No tocante a um incêndio a bordo e a existência de vento no momento do incêndio, é correto afirmar que:",
    opcoes: ["O vento apaga o fogo","O vento aumenta a possibilidade de um início de incêndio","O vento propaga o fogo","O vento não influencia o fogo","O vento auxilia os tripulantes a extinguir o incêndio"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q33",
    pergunta: "Por ocasião da transferência de propriedade de um barco já inscrito, o novo proprietário deverá:",
    opcoes: ["Trocar o nome do barco","Assinar novo Termo de Responsabilidade","Apresentar nota fiscal do casco e do motor","Comprovar a propriedade com testemunhas e certidões emitidas em cartório","Renovar o Bilhete de Seguro (DPEM), mesmo que não esteja vencido"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q34",
    pergunta: "Qual a característica de um incêndio classe B?",
    opcoes: ["Ocorrem em combustíveis sólidos","Ocorrem em circuitos elétricos","Ocorrem em metais","Ocorrem em combustíveis líquidos","Ocorrem em papel e madeira"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q35",
    pergunta: "Qual é (quais são) o(os) símbolo(s) da categoria de Arrais Amador, que poderia(ao) ser(em) bordados(s) ou pintado(s) nas lapelas, camisetas ou bonés?",
    opcoes: ["Quatro estrelas douradas","Duas estrelas douradas","Três estrelas douradas","Uma estrela dourada","Uma âncora dourada"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q36",
    pergunta: "Se um barco está abicado, ele está com:",
    opcoes: ["Muito peso na popa e pouco peso na proa","Muito peso na proa e pouco peso na popa","Muito peso a meia nau e pouco peso na proa e popa","Muito peso na quilha e leve na proa","Muito peso na proa e popa e pouco peso a meia nau"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q37",
    pergunta: "Se um barco está derrabado ele está com:",
    opcoes: ["Muito peso na quilha e leve na popa","Muito peso a meia nau e pouco peso na proa e popa","Muito peso na popa e pouco peso na proa","Muito peso na proa e popa e pouco peso a meia nau","Muito peso na proa e pouco peso na popa"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q38",
    pergunta: "Um colete salva-vidas da classe III se destina prioritariamente para a navegação em área:",
    opcoes: ["Desabrigadas","Oceânica","Interior","Costeira","De mar aberto"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q39",
    pergunta: "Uma boa prática preventiva para evitar enjoos durante um passeio é:",
    opcoes: ["Dormir pouco na noite anterior e não comer antes do passeio","Tomar remédios antiácidos antes e tomar remédios antienjoo depois de iniciar o passeio","Tomar bebidas alcoólicas e comida gordurosa para forrar o estomago","Evitar beber água e sucos de frutas ácidas, que provocam o enjoo","Comer e beber moderadamente e tomar remédios antienjoo antes de iniciar o passeio"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q40",
    pergunta: "Considerando as características abaixo descritas em itálico, assinale a alternativa que corresponde ao sinal náutico: É um sinal cego ou luminoso. É dotado de marca de tope, duas esferas pretas, uma sobre a outra e possui cor preta, com uma ou mais faixas horizontais encarnadas (vermelhas)",
    opcoes: ["Sinal Especial","Sinal Cardinal","Sinal Lateral","Sinal de Perigo Isolado","Sinais de Águas Seguras"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q41",
    pergunta: "Um apito curto significa:",
    opcoes: ["Estou guinando para boreste","Estou guinando para bombordo","Estou parando máquinas","Estou dando máquinas atrás","Estou dando máquinas adiante"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q42",
    pergunta: "Uma embarcação à vela tem preferência em relação à:",
    opcoes: ["uma embarcação com capacidade de manobra restrita","uma embarcação engajada na pesca","uma embarcação sem governo","uma embarcação a motor","uma embarcação com capacidade de manobra restrita devido ao seu calado"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q43",
    pergunta: "Embarcação com cabo de reboque inferior a 200 metros de comprimento deverá exibir:",
    opcoes: ["Duas luzes encarnadas no mastro","Quatro luzes brancas no mastro","Uma luz branca no mastro","Duas luzes brancas no mastro","Três luzes brancas no mastro"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q44",
    pergunta: "Uma embarcação com comprimento igual ou superior a 100 metros, fundeada, em visibilidade restrita, deverá soar:",
    opcoes: ["O sino a ré","O sino a vante e o gongo a ré","Dois apitos curtos a cada 2 minutos","Um apito longo e o sino a vante","Um apito longo e o gongo a ré"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q45",
    pergunta: "As regras do RIPEAM se aplicam a:",
    opcoes: ["Apenas para as embarcações miúdas","Todas as embarcações em mar aberto e em todas as águas a este ligadas, navegáveis por navios de alto mar, e para embarcações em águas interiores","Apenas para as embarcações de esporte e recreio","Todas as embarcações em mar aberto e em todas as águas a este ligadas, apenas navegáveis por embarcação de esporte e recreio","Apenas as embarcações de alto mar"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q46",
    pergunta: "De acordo com o RIPEAM, os sinais sonoros que podem ser emitidos por apitos, buzinas ou ainda sinos, são utilizados em três situações:",
    opcoes: ["Manobra, perigos diversos e em canais estreitos","Manobra, risco de abalroamento e em canais estreitos","Manobra, advertência e em baixa visibilidade","Manobra, risco de abalroamento e em baixa visibilidade","Manobra, advertência e risco de abalroamento"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q47",
    pergunta: "Qual é o único caso em que utilizamos um balizamento dobrado, ou seja, com dois sinais iguais?",
    opcoes: ["perigo isolado ainda não registrado na carta náutica","uma pedra grande que obstrui o canal","em áreas de dragagem recente","novo perigo já registrado na carta náutica","um casco soçobrado a 10 anos"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q48",
    pergunta: "Uma bóia com cores brancas e encarnadas em faixas verticais, indica:",
    opcoes: ["Águas seguras","Águas perigosas","Perigo isolado","Canal preferencial","Limite lateral de canal"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q49",
    pergunta: "À noite, foi avistada uma luz verde piscando e, pela carta náutica, verificou-se a aproximação da entrada de um porto. Qual seria o formato provável deste sinal?",
    opcoes: ["Cúbico","Esférico","Cilíndrico","Piramidal","Cônico"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q50",
    pergunta: "Espia que sai da embarcação perpendicularmente ao cais:",
    opcoes: ["Retinida","Alheta","Través","Lançante de proa","Espringue de popa"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q51",
    pergunta: "Quando em mar ruim, para vencer as ondas grandes, deve-se acelerar e desacelerar o motor da seguinte forma:",
    opcoes: ["Manter a velocidade constante tanto na subida quanto na descida da onda","Quando subir na onda acelera e continua acelerando na descida","Não acelerar nem na subida nem na descida","Desacelerar na subida e acelerar antes da descida","Acelerar na subida e desacelerar antes da descida"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q52",
    pergunta: "O extintor de água deve ser utilizado no combate a incêndios em:",
    opcoes: ["Equipamentos e redes elétricas","Líquidos inflamáveis","Paióis de tinta","Materiais sólidos inflamáveis","Materiais inflamáveis"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q53",
    pergunta: "Como último recurso, podemos improvisar, para apagar incêndios, na falta de um extintor portátil adequado e a parte elétrica desligada:",
    opcoes: ["Ventiladores portáteis","Cobertores de fibra sintética","Baldes d’água","Qualquer líquido disponível a bordo","Madeira"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q54",
    pergunta: "O que vem a ser hemorragia?",
    opcoes: ["A ruptura da pele","O aparecimento de bolhas e manchas isoladas na pele","O desmaio temporário","A grande perda de sangue","A queda na pressão arterial"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q55",
    pergunta: "Para evitar infecções em uma ferida devemos:",
    opcoes: ["Limpar a ferida com álcool e mertiolate","Limpar a ferida com éter e mertiolate","Cobrir a ferida com pomada e um pano limpo","Limpar com mercúrio cromo e cobri-la com gaze","Limpar com água e sabão, banhar a ferida com soro fisiológico e limpá-la periodicamente"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q56",
    pergunta: "Havendo revezamento na balsa salva-vidas e para um melhor conforto de quem está na balsa:",
    opcoes: ["Os que estão na água deverão pescar","Os que estão na água deverão empurrar a balsa","As roupas deverão ser trocadas para que os da balsa permaneçam com roupas sempre secas","As luzes deverão ser apagadas durante à noite","A água da chuva deverá ser consumida primeiro"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q57",
    pergunta: "O que o proprietário deve fazer, com relação a equipamentos de salvatagem importados, para utilizá-los a bordo?",
    opcoes: ["Deverá homologá-los na DPC","Deverá informar à Autoridade Naval, seu uso","Devera enviar os manuais, para a capitânia dos Portos","Deverá se desfazer deles, pois são inadequados em sua maioria","Devera utilizá-los normalmente, pois não há restrições quanto a isso"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q58",
    pergunta: "Embarcação de propulsão a motor ou à vela poderão se aproximar da linha base para fundear, caso não haja nenhum dispositivo contrário estabelecido pela autoridade competente. Toda aproximação deverá ser feita:",
    opcoes: ["Paralela à linha base e com velocidade não superior a 3 (três) nós, preservando a segurança dos banhistas","Perpendicular à linha base e com velocidade não superior a 3 (três) nós, preservando a segurança dos banhistas","Perpendicular à linha base e com velocidade até 6 (seis) nós, preservando a segurança dos banhistas","Paralela à linha base e com velocidade não superior a 5 (cinco) nós, preservando a segurança dos banhistas","Em qualquer direção em relação à linha base e com velocidade não superior a 3 (três) nós, preservando a segurança dos banhistas"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q59",
    pergunta: "Em uma queimadura de 3º grau:",
    opcoes: ["A superfície é macia e molhada","A pele avermelhada e levemente sensível","Não há dor","A pele foi completamente destruída","A característica é a presença de bolhas"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q60",
    pergunta: "Os incêndios de combustíveis que tenham comburente em sua estrutura molecular somente podem ser extintos por:",
    opcoes: ["Abafamento","Resfriamento","Alagamento","Congelamento","Quebra da reação em cadeia"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q61",
    pergunta: "A condição de equilíbrio de uma embarcação, com sua carga de peso sólidos e líquidos bem distribuídos e sua linha d’água respeitada é chamada de:",
    opcoes: ["Arqueação","Flutuabilidade","Estabilidade","Estanqueidade","Deslocamento"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q62",
    pergunta: "Ao nos depararmos com uma vítima sendo eletrocutada o procedimento correto será:",
    opcoes: ["Verificar seus sinais vitais","Tratar de imediato as queimaduras","Deixa-la quieta para se recuperar sozinha","Afasta-la da fumaça e do fogo","Retirá-la da corrente elétrica usando material isolante"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q63",
    pergunta: "As instruções para operar, manusear e lançar os foguetes e dispositivos fumígenos estão contidas:",
    opcoes: ["Na NPCP","Nas embalagens dos mesmos","Na NORMAM-17/DPC","Nos livros especializados","Na NORMAM-03/DPC"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q64",
    pergunta: "As medidas lineares de uma embarcação são:",
    opcoes: ["Boreste, bombordo, boca e proa","Comprimento total, boca, pontal e longarinas","Boca, contorno, calado e proa","Boca, calado, quilha e través","Comprimento total, boca, pontal e contorno"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q65",
    pergunta: "De acordo com o Regulamento Internacional Para Evitar Abalroamento no MAR (RIPEAM), as marcas em forma de balões, cones, etc, utilizadas pelos barcos para sinalizar durante o dia diversas condições são da cor:",
    opcoes: ["Preta","Amarela","Branca","Vermelha","Verde"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q66",
    pergunta: "Durante um incêndio, quando utilizamos o extintor de CO2 estamos combatendo o fogo por:",
    opcoes: ["Abafamento","Quebra da reação em cadeia","Resfriamento","Retirada do combustível","Quebra da reação química"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q67",
    pergunta: "Em embarcações miúdas existe um tipo de peça instalada nos conveses que servem para passarmos e darmos volta nos cabos e boças. Essas peças são chamadas de:",
    opcoes: ["Cabrestante","Cunhos","Enxárcias","Enfrechates","Mastros"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q68",
    pergunta: "Nas embarcações de médio porte quando em navegação costeira, qual dos itens abaixo é dispensável segundo o preconizado pela NORMAM-03?",
    opcoes: ["Âncora","Apito","Balsa salva-vidas","Agulha magnética","Artefato pirotécnico"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q69",
    pergunta: "Numa hidrovia interior (Hidrovia Paraguai-Paraná) você se depara com uma placa branca contendo um X na cor vermelha. Ela quer lhe indicar que você deve:",
    opcoes: ["Bifurcação de canal","Seguir pela margem direita do canal","Seguir pela margem esquerda do canal","Trocar de margem","Seguir pelo meio do canal"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q70",
    pergunta: "O extintor portátil de água pressurizada é contraindicado para combater incêndio das classes:",
    opcoes: ["Somente A","Somente B","A e D","A e B","B e C"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q71",
    pergunta: "O incêndio da classe C é aquele que ocorre em:",
    opcoes: ["Matérias elétricos quando energizados","Óleos e graxas","Materiais elétricos desenergizados","Madeiras e papéis","Metais"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q72",
    pergunta: "O peso e tamanho da âncora adequada para um determinado barco está diretamente relacionada(o) a (ao):",
    opcoes: ["Boca, comprimento e contorno do barco","Capacidade em HP do motor do barco","Local onde o barco fundeará","Deslocamento e tamanho do barco","Finalidade e classificação do barco (atividade)"],
    respostaCorreta: 3,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q73",
    pergunta: "Os coletes da classe V são destinados às embarcações:",
    opcoes: ["Lazer","De rios e lagos","Miúdas","De médio porte","De grande porte"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q74",
    pergunta: "Por ocasião da transferência de propriedade de um barco já inscrito, o novo proprietário deverá:",
    opcoes: ["Comprovar a propriedade com testemunhas e certidões emitidas em cartório","Apresentar nota fiscal do casco e do motor","Renovar o Bilhete de Seguro (DPEM), mesmo que não esteja vencido","Trocar o nome do barco","Assinar novo Termo de Responsabilidade"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q75",
    pergunta: "Qual o agente extintor mais efetivo em incêndios classe “B”, e que também pode ser usado em um incêndio classe “A”?",
    opcoes: ["Gás Halon","Espuma Química","Água","Pó químico","Gás carbônico"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q76",
    pergunta: "Se for utilizado em ambientes fechados e de pequeno volume, em qual dos tipos de agentes extintores listados abaixo devemos ter cuidado quanto a uma eventual sufocação?",
    opcoes: ["Espuma mecânica","Gás carbônico","Pó químico","Água","Espuma química"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q77",
    pergunta: "Um navegante amador habilitado para conduzir embarcações de esporte e recreio entre portos nacionais e estrangeiros, sem restrições de área geográfica, é chamado de:",
    opcoes: ["Arrais-Amador","Capitão-Amador","Motonauta","Mestre-Amador","Mestre-Arrais"],
    respostaCorreta: 1,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q78",
    pergunta: "Uma das preocupações do socorrista é proceder corretamente a aplicação dos primeiros socorros. Na dúvida se há ou não fratura, o que o socorrista deverá fazer?",
    opcoes: ["Aplicar analgésicos no local","Tratar como trauma e aguardar o médico","Proteger e imobilizar o membro atingido","Isolar o local e aplicar bandagens","Tratar como hemorragia interna"],
    respostaCorreta: 2,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q79",
    pergunta: "Sinais cardinais são aqueles empregados para indicar ao navegante:",
    opcoes: ["O quadrante da rosa-dos-ventos que possui águas seguras","O quadrante da rosa-dos-ventos não recomendado para a navegação","Os quadrantes da rosa-dos-ventos onde há um perigo isolado","Que todos os quadrantes são seguros para a navegação","Os quadrantes da rosa-dos-ventos onde se deve navegar cuidadosamente"],
    respostaCorreta: 0,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },
  {
    id: "q80",
    pergunta: "Qual a expressão usada por uma estação controladora de rede, em uma frequência de emergência, durante uma situação de socorro?",
    opcoes: ["Cambio final","Cambio","Aguarde","Separa","Silêncio GABARITO"],
    respostaCorreta: 4,
    categoria: "Arrais Amador",
    explicacao: "Verifique as regras oficias da Marinha do Brasil e o RIPEAM para mais detalhes sobre esta regra específica."
  },

  {
    id: "ai1",
    pergunta: "Em relação ao trânsito de embarcações, o que estabelece a regra geral sobre cruzamento (risco de abalroamento) entre duas lanchas a motor no mar?",
    opcoes: [
      "Ambas devem guinar para bombordo",
      "A que avistar a outra por boreste tem a preferência",
      "A que avistar a outra por boreste deve se desviar",
      "A de maior porte sempre manobra primeiro",
      "Qualquer uma pode desviar, desde que avise com 2 apitos"
    ],
    respostaCorreta: 2,
    categoria: "RIPEAM",
    explicacao: "A embarcação que tem a outra por seu boreste (direita) deve se manter fora do caminho. Ou seja, ela é a responsável por manobrar."
  },
  {
    id: "ai2",
    pergunta: "Se você estiver conduzindo uma lancha e não tiver certeza se há risco de colisão com outra embarcação que se aproxima, você deve:",
    opcoes: [
      "Manter o rumo e a velocidade e aguardar a atitude do outro barco",
      "Partir do princípio de que o risco existe e tomar medidas preventivas",
      "Aumentar a velocidade para cruzar a frente da outra embarcação mais rápido",
      "Acender as luzes de convés para chamar a atenção",
      "Apitar cinco vezes repetidamente de forma curta"
    ],
    respostaCorreta: 1,
    categoria: "RIPEAM",
    explicacao: "A Regra 7 estipula que caso haja qualquer dúvida se o risco de abalroamento existe, deve-se presumir que ele existe."
  },
  {
    id: "ai3",
    pergunta: "Qual equipamento de salvatagem é essencial e de dotação obrigatória para cada pessoa a bordo de uma embarcação de esporte e recreio?",
    opcoes: [
      "Colete salva-vidas certificado e no tamanho adequado",
      "Sinalizador visual do tipo estrela vermelha",
      "Bote inflável amarrado na popa",
      "Rádio VHF operando no canal 16",
      "Roupa de mergulho para proteção térmica"
    ],
    respostaCorreta: 0,
    categoria: "Salvatagem",
    explicacao: "Colete salva-vidas aprovado, no tamanho correto, 1 para cada tripulante/passageiro, deve estar em local acessível."
  },
  {
    id: "ai4",
    pergunta: "A cor do balizamento (boias) que indica perigo isolado é:",
    opcoes: [
      "Verde e branco (listras verticais)",
      "Vermelho com uma faixa horizontal amarela",
      "Preto com uma ou mais faixas horizontais encarnadas (vermelhas)",
      "Amarelo e preto com listras verticais",
      "Branco sólido com um triângulo preto"
    ],
    respostaCorreta: 2,
    categoria: "Balizamento",
    explicacao: "No sistema IALA, o perigo isolado tem a cor preta com faixa(s) horizontal(is) vermelha(s)."
  },
  {
    id: "ai5",
    pergunta: "Você precisa reabastecer a sua lancha com gasolina. Qual a medida de segurança básica imediata?",
    opcoes: [
      "Fazer o reabastecimento com o motor ligado para manter os gases circulando.",
      "Desligar o motor, fechar todas as portas/escotilhas e evitar faíscas ou chamas.",
      "Lavar o convés depois que o tanque transbordar intencionalmente.",
      "Sempre misturar um pouco de óleo de motor 2 tempos para resfriar a explosão.",
      "Conectar o fio terra na hélice do barco para descarregar a bateria."
    ],
    respostaCorreta: 1,
    categoria: "Prevenção de Fogo",
    explicacao: "Em abastecimento todos os equipamentos elétricos/motores devem ser desligados, fumantes extintos, escotilhas/portas/gaiutas devem estar FECHADAS para que vapor de gás não entre em compartimentos onde possa acumular e gerar posterior explosão."
  }

];
