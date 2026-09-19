const fs = require('fs');

let code = fs.readFileSync('src/components/BulkImportPage.tsx', 'utf8');

// Remove planoContasId 
code = code.replace(/planoContasId: /g, '// planoContasId: ');

fs.writeFileSync('src/components/BulkImportPage.tsx', code);
