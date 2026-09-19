const fs = require('fs');

function replaceFile(path, replacer) {
  let content = fs.readFileSync(path, 'utf8');
  content = replacer(content);
  fs.writeFileSync(path, content);
}

replaceFile('src/components/MarinaDashboard.tsx', c => {
  return c.replace('consumeFuelForEmbarcacao(litersNum, boatName, currentOperator);', 'await consumeFuelForEmbarcacao(litersNum, boatName, currentOperator);');
});

replaceFile('src/components/MarinaFuelView.tsx', c => {
  return c.replace(`consumeFuelForEmbarcacao(
        Number(abastecimentoLitros),
        barcoNome,
        'Administrador'
      );`, `await consumeFuelForEmbarcacao(
        Number(abastecimentoLitros),
        barcoNome,
        'Administrador'
      );`);
});

replaceFile('src/components/MarinaOperadorDashboard.tsx', c => {
  return c.replace(`consumeFuelForEmbarcacao(fuelData.liters, boat.nome || 'Embarcação', currentUser.nome);`, `await consumeFuelForEmbarcacao(fuelData.liters, boat.nome || 'Embarcação', currentUser.nome);`);
});
