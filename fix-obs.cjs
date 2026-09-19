const fs = require('fs');
let code = fs.readFileSync('src/components/MarinaDashboard.tsx', 'utf8');

code = code.replace(/join\('\n'\);/g, "join('\n');");

fs.writeFileSync('src/components/MarinaDashboard.tsx', code);
console.log('Fixed syntax error');
