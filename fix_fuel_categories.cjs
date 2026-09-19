const fs = require('fs');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    for (const {from, to} of replacements) {
        content = content.split(from).join(to);
    }
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`No changes made to ${filePath}`);
    }
}

// 1. FinanceFluxoCaixa.tsx
replaceInFile('src/components/finance/FinanceFluxoCaixa.tsx', [
    { from: 'value="Combustivel">Combustível</option>', to: 'value="Combustível">Combustível</option>' }
]);

// 2. FinanceLancamentoDrawer.tsx
replaceInFile('src/components/finance/FinanceLancamentoDrawer.tsx', [
    { from: 'value="Combustivel">Combustível</option>', to: 'value="Combustível">Combustível</option>' }
]);

// 3. MarinaCaixaView.tsx 
// Change setModalCategoria('combustivel') to 'Combustível'
replaceInFile('src/components/MarinaCaixaView.tsx', [
    { from: "setModalCategoria('combustivel');", to: "setModalCategoria('Combustível');" },
    // Also update UI label map if any exact match is expected:
    { from: "t.categoria === 'combustivel'", to: "(t.categoria === 'combustivel' || t.categoria === 'Combustível')" },
    { from: "case 'combustivel': return 'Combustível';", to: "case 'combustivel':\n      case 'Combustível':\n        return 'Combustível';" }
]);

// 4. MarinaOperadorDashboard.tsx
replaceInFile('src/components/MarinaOperadorDashboard.tsx', [
    { from: "categoria: 'Abastecimento Marina',", to: "categoria: 'Combustível'," },
    // Update the read check to support both old and new data
    { from: "if (t.categoria !== 'Abastecimento Marina') return false;", to: "if (t.categoria !== 'Abastecimento Marina' && t.categoria !== 'Combustível') return false;" }
]);

// 5. MarinaFuelView.tsx
// Writes:
replaceInFile('src/components/MarinaFuelView.tsx', [
    { from: "categoria: 'receita_combustivel',", to: "categoria: 'Combustível'," }
]);
// Reads: Update existing multi-check to include 'Abastecimento Marina' and preserve old ones
replaceInFile('src/components/MarinaFuelView.tsx', [
    { 
      from: "t.categoria === 'receita_combustivel' || \n        t.categoria === 'Combustível' || \n        t.categoria === 'combustivel' ||", 
      to: "t.categoria === 'receita_combustivel' || \n        t.categoria === 'Combustível' || \n        t.categoria === 'Abastecimento Marina' || \n        t.categoria === 'combustivel' ||" 
    },
    // Backup if formatting is different:
    {
      from: "t.categoria === 'receita_combustivel' ||\n        t.categoria === 'Combustível' ||\n        t.categoria === 'combustivel'",
      to: "t.categoria === 'receita_combustivel' || t.categoria === 'Combustível' || t.categoria === 'combustivel' || t.categoria === 'Abastecimento Marina'"
    }
]);

// 6. AdminFuelPage.tsx
replaceInFile('src/components/AdminFuelPage.tsx', [
    { from: "categoria: 'receita_combustivel',", to: "categoria: 'Combustível'," }
]);

// 7. server-routes/marina-caixa.routes.ts
replaceInFile('server-routes/marina-caixa.routes.ts', [
    { from: "categoria: 'combustivel',", to: "categoria: 'Combustível'," }
]);

console.log("Categories normalization finished.");
