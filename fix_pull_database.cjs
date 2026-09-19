const fs = require('fs');

let code = fs.readFileSync('server-db.ts', 'utf8');

// The lines in pullDatabase where tables are queried
const queryInsertMarker = 'const [funcionariosEPIs] = await currentPool.query("SELECT * FROM FuncionariosEPIs ORDER BY geradoEm DESC");';
const queryInjections = `
  const [planosContas] = await currentPool.query("SELECT * FROM PlanosDeContas");
  const [centrosCusto] = await currentPool.query("SELECT * FROM CentrosDeCusto");
  const [fornecedores] = await currentPool.query("SELECT * FROM Fornecedores");
  const [contasBancarias] = await currentPool.query("SELECT * FROM ContasBancarias");
`;

code = code.replace(queryInsertMarker, queryInjections + '\n  ' + queryInsertMarker);

// The lines in pullDatabase where the return object is built
const resultInsertMarker = 'chamados: chamados as any[]';
const resultInjections = `chamados: chamados as any[],
    planosContas: planosContas as any[],
    centrosCusto: centrosCusto as any[],
    fornecedores: fornecedores as any[],
    contasBancarias: contasBancarias as any[]`;

code = code.replace(resultInsertMarker, resultInjections);

fs.writeFileSync('server-db.ts', code);
console.log('pullDatabase patched');