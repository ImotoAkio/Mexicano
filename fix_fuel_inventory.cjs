const fs = require('fs');

let path = 'src/utils/fuelInventory.ts';
let c = fs.readFileSync(path, 'utf8');

const oldFunc = `export function consumeFuelForEmbarcacao(litros: number, barcoNome: string, operador: string): boolean {
  if (litros <= 0) return false;
  
  const inv = getFuelInventory();
  let remainingToDeduct = litros;
  
  // 1. Deduz do galão parcial aberto primeiro se houver
  if (inv.galaoParcialLitros > 0) {
    if (inv.galaoParcialLitros >= remainingToDeduct) {
      inv.galaoParcialLitros -= remainingToDeduct;
      remainingToDeduct = 0;
    } else {
      remainingToDeduct -= inv.galaoParcialLitros;
      inv.galaoParcialLitros = 0;
    }
  }
  
  // 2. Se sobrou valor para deduzir, abre galões cheios de 20L
  if (remainingToDeduct > 0) {
    const galoesNecessarios = Math.ceil(remainingToDeduct / inv.galoesCapacidadeLitros);
    if (inv.galoesPierQuantidade >= galoesNecessarios) {
      inv.galoesPierQuantidade -= galoesNecessarios;
      const litrosExtraidos = galoesNecessarios * inv.galoesCapacidadeLitros;
      const sobraNoUltimoGalao = litrosExtraidos - remainingToDeduct;
      inv.galaoParcialLitros = sobraNoUltimoGalao;
      remainingToDeduct = 0;
    } else {
      // Caso limite: Consome todos os galões cheios disponíveis e deixa residual
      const litrosDisponiveisNosGaloes = inv.galoesPierQuantidade * inv.galoesCapacidadeLitros;
      remainingToDeduct -= litrosDisponiveisNosGaloes;
      inv.galoesPierQuantidade = 0;
      inv.galaoParcialLitros = 0;
      
      // Se não havia galões suficientes no píer, consome direto do Tanque Principal como fallback emergencial
      inv.tanquePrincipalLitros = Math.max(0, inv.tanquePrincipalLitros - remainingToDeduct);
    }
  }
  
  saveFuelInventory(inv);
  addFuelHistoryEntry({
    tipo: 'abastecimento_embarcacao',
    litros,
    barcoNome,
    operador,
    detalhes: \`Abastecimento de \${litros}L na embarcação \${barcoNome}\`
  });
  
  return true;
}`;

const newFunc = `export async function consumeFuelForEmbarcacao(litros: number, barcoNome: string, operador: string): Promise<boolean> {
  if (litros <= 0) return false;
  
  try {
    const token = localStorage.getItem('marina_token') || localStorage.getItem('admin_token');
    const res = await fetch('/api/fuel/consume', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
      },
      body: JSON.stringify({ litros, barcoNome, detalhes: \`Abastecimento de \${litros}L na embarcação \${barcoNome}\` })
    });
    
    if (!res.ok) {
      const err = await res.json();
      console.error("Erro na API de combustivel:", err);
      // Fallback pra logica local em caso de backend muito quebrado? Não, falha expressa é melhor
      // alert("Falha na baixa de combustível! " + (err.message || '')); // Causa incômodo na UI assíncrona, melhor apenas console
      return false;
    }
    
    // Atualização local do historico pra refeltir na interface caso nao reinicie 
    // mas a truth vem do socket
    const fakeInv = getFuelInventory();
    // A logica real ta no servidor, mas se precisarmos de fallback visual, faremos a math. 
    // Por hora a emissao do via io.emit('fuel_inventory_updated') lidará com sínc.
    return true;
  } catch (e) {
    console.error("Erro ao chamar API de combustivel:", e);
    return false;
  }
}`;

c = c.replace(oldFunc, newFunc);
fs.writeFileSync(path, c);
