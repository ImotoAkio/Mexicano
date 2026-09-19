const fs = require('fs');

const f1 = 'src/components/MarinaOperadorDashboard.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/categoria: 'Combustível',/g, "categoria: 'Combustível',\n              empresa: 'Marina',");
fs.writeFileSync(f1, c1);
console.log('Fixed MarinaOperadorDashboard.tsx empresa');

const f2 = 'src/components/MarinaFuelView.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/categoria: 'Combustível',/g, "categoria: 'Combustível',\n      empresa: 'Marina',");
fs.writeFileSync(f2, c2);
console.log('Fixed MarinaFuelView.tsx empresa');
