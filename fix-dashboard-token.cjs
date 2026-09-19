const fs = require('fs');
const file = 'src/components/finance/FinanceDashboardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('STORAGE_KEYS.TOKEN', 'STORAGE_KEYS.ADMIN_TOKEN');

fs.writeFileSync(file, content);
