const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/MarinaFuelView.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const newLines = [];
let lastLine = '';
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim().startsWith('abastecimentoLitros: ') && lastLine.trim().startsWith('abastecimentoLitros: ')) {
    // duplicate, skip
    continue;
  }
  newLines.push(line);
  lastLine = line;
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
