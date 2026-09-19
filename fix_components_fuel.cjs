const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix "pendente" statuses -> "lancado" (which is the new semantic for open)
  content = content.replace(/status:\s*isPago \? 'pago' : 'pendente'/g, "status: isPago ? 'pago' : 'lancado'");
  content = content.replace(/status:\s*isPaid \? 'pago' : 'pendente'/g, "status: isPaid ? 'pago' : 'lancado'");
  content = content.replace(/status:\s*'pendente'/g, "status: 'lancado'");
  
  // Also add missing fields to the transactions being created in fuel views
  // We'll use a regex that matches `categoria: 'Combustível',` and injects `empresa` right after
  content = content.replace(/categoria:\s*'Combustível',/g, 
    "categoria: 'Combustível',\n      empresa: 'Marina',\n      contaBancariaId: undefined,\n      planoContasId: undefined,");
    
  // Since undefined can cause issues if they serialize it, wait, JSON.stringify removes undefined, so it's fine.

  fs.writeFileSync(filePath, content, 'utf8');
}

patchFile('src/components/AdminFuelPage.tsx');
patchFile('src/components/MarinaFuelView.tsx');
patchFile('src/components/MarinaOperadorDashboard.tsx');

console.log("Patched fuel pages.");
