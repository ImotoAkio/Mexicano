const fs = require('fs');
let fp = 'src/components/AdminFuelPage.tsx';
let c = fs.readFileSync(fp, 'utf8');

c = c.replace(
  /t\.categoria === 'receita_combustivel' \|\| \n\s*t\.categoria === 'Combustível' \|\| \n\s*t\.categoria === 'combustivel' \|\|/,
  "t.categoria === 'receita_combustivel' ||\n        t.categoria === 'Combustível' ||\n        t.categoria === 'Abastecimento Marina' ||\n        t.categoria === 'combustivel' ||"
);

fs.writeFileSync(fp, c, 'utf8');
