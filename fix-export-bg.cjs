const fs = require('fs');
const file = 'src/components/finance/FinanceDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/'#1A1C23'/g, "'#ffffff'");

fs.writeFileSync(file, content);
