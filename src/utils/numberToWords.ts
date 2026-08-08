function extensoCentena(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CEM';
  
  const unidades = ['', 'UM', 'DOIS', 'TRÊS', 'QUATRO', 'CINCO', 'SEIS', 'SETE', 'OITO', 'NOVE'];
  const dezenaEspecial = ['DEZ', 'ONZE', 'DOZE', 'TREZE', 'QUATORZE', 'QUINZE', 'DEZESSEIS', 'DEZESSETE', 'DEZOITO', 'DEZENOVE'];
  const dezenas = ['', 'DEZ', 'VINTE', 'TRINTA', 'QUARENTA', 'CINQUENTA', 'SESSENTA', 'SETENTA', 'OITENTA', 'NOVENTA'];
  const centenas = ['', 'CENTO', 'DUZENTOS', 'TREZENTOS', 'QUATROCENTOS', 'QUINHENTOS', 'SEISCENTOS', 'SETECENTOS', 'OITOCENTOS', 'NOVECENTOS'];

  let res: string[] = [];
  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;

  if (c > 0) res.push(centenas[c]);

  if (d === 1) {
    res.push(dezenaEspecial[u]);
  } else {
    if (d > 1) res.push(dezenas[d]);
    if (u > 0) res.push(unidades[u]);
  }

  return res.join(' E ');
}

export function numeroParaExtenso(numInput: number | string, isCurrency = true): string {
  const cleanStr = typeof numInput === 'string' 
    ? numInput.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.') 
    : String(numInput);
  const num = typeof numInput === 'number' ? numInput : parseFloat(cleanStr);
  
  if (isNaN(num) || num === 0) return isCurrency ? 'ZERO REAIS' : 'ZERO';

  const inteiro = Math.floor(Math.abs(num));
  const centavos = Math.round((Math.abs(num) - inteiro) * 100);

  let partes: string[] = [];

  const milhoes = Math.floor(inteiro / 1000000);
  const milhares = Math.floor((inteiro % 1000000) / 1000);
  const rest = inteiro % 1000;

  if (milhoes > 0) {
    partes.push(`${extensoCentena(milhoes)} ${milhoes === 1 ? 'MILHÃO' : 'MILHÕES'}`);
  }

  if (milhares > 0) {
    if (milhares === 1) {
      partes.push('MIL');
    } else {
      partes.push(`${extensoCentena(milhares)} MIL`);
    }
  }

  if (rest > 0) {
    partes.push(extensoCentena(rest));
  }

  let textoInteiro = partes.join(' ');
  if (milhares > 0 && rest > 0 && (rest < 100 || rest % 100 === 0)) {
    textoInteiro = partes.slice(0, -1).join(' ') + ' E ' + partes[partes.length - 1];
  }

  if (!isCurrency) {
    return textoInteiro;
  }

  let moeda = inteiro === 1 ? 'REAL' : 'REAIS';
  let resultado = `${textoInteiro} ${moeda}`;

  if (centavos > 0) {
    const textoCentavos = extensoCentena(centavos);
    const moedaCentavos = centavos === 1 ? 'CENTAVO' : 'CENTAVOS';
    resultado += ` E ${textoCentavos} ${moedaCentavos}`;
  }

  return resultado;
}

export function parseMoney(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatMoney(num: number): string {
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
