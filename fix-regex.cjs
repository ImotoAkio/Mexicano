const fs = require('fs');
const file = 'src/components/ClientDashboardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("                             .replace(/|?s*Ref:s*/i, ' - ')", "                             .replace(/\|?\s*Ref:\s*/i, ' - ')");
content = content.replace("                             .replace(/((d+)/(d+))/, ' (Parcela $1/$2)');", "                             .replace(/\((\d+)\/(\d+)\)/, ' (Parcela $1/$2)');");
content = content.replace("                           desc = desc.replace(/(d{2})/(d{4})/g, (match, m, y) => {", "                           desc = desc.replace(/(\d{2})\/(\d{4})/g, (match, m, y) => {");

fs.writeFileSync(file, content);
