const fs = require('fs');

const lines = fs.readFileSync('src/components/MarinaOperador/ChecklistCaptureModal.tsx', 'utf8').split('\n');
console.log(lines.filter(l => l.includes('svgPath:')).join('\n'));
