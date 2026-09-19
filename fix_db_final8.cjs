const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

const lines = code.split('\n');

const cleaned = [...lines.slice(0, 3149), ...lines.slice(3186)];
fs.writeFileSync('server-db.ts', cleaned.join('\n'));
console.log('Removed duplicate lines');
