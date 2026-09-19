const fs = require('fs');

let path = 'src/components/MarinaFuelView.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/consumeFuelForEmbarcacao\(\s*litrosNum,\s*isAvulso\s*\?\s*\`Avulso \(\$\{identificacao\}\)\`\s*:\s*\(boat\?\.nome\s*\|\|\s*'Embarcação'\),\s*operadorNome\s*\|\|\s*'Gerente'\s*\);/g, `await consumeFuelForEmbarcacao(
        litrosNum, 
        isAvulso ? \`Avulso (\${identificacao})\` : (boat?.nome || 'Embarcação'), 
        operadorNome || 'Gerente'
      );`);

fs.writeFileSync(path, c);
