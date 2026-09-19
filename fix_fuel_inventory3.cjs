const fs = require('fs');
let path = 'src/utils/fuelInventory.ts';
let c = fs.readFileSync(path, 'utf8');

const prefixIdx = c.indexOf('export function consumeFuelForEmbarcacao');
if (prefixIdx !== -1) {
  let endIdx = c.indexOf('\n}', prefixIdx);
  let before = c.substring(0, prefixIdx);
  let after = c.substring(endIdx + 2);
  
  let newFunc = `export async function consumeFuelForEmbarcacao(litros: number, barcoNome: string, operador: string): Promise<boolean> {
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
      return false;
    }
    
    return true;
  } catch (e) {
    console.error("Erro ao chamar API de combustivel:", e);
    return false;
  }
}`;
  fs.writeFileSync(path, before + newFunc + after);
}
