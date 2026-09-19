const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

// Insert it under horaDescida
if (!code.includes('fotosExtrasDescida')) {
  code = code.replace(/horaDescida\?: string;/, 'horaDescida?: string;\n  fotosExtrasDescida?: string[];\n  fotosExtrasSubida?: string[];');
  fs.writeFileSync('src/types.ts', code);
}
