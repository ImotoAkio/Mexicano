const fs = require('fs');
let fp = 'src/components/AdminFuelPage.tsx';
let c = fs.readFileSync(fp, 'utf8');

c = c.split("t.categoria === 'combustivel' ||").join("t.categoria === 'Abastecimento Marina' || \n        t.categoria === 'combustivel' ||");

fs.writeFileSync(fp, c, 'utf8');
