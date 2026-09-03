import fs from 'fs';

let content = fs.readFileSync('src/components/FinanceWhatsAppPage.tsx', 'utf8');

content = content.replace(/localStorage\.getItem\('admin_token'\)/g, "getAdminToken()");
content = content.replace(/Authorization:\s*`Bearer \$\{getAdminToken\(\)\}`/g, "...getAuthHeaders()");

fs.writeFileSync('src/components/FinanceWhatsAppPage.tsx', content);
console.log('Updated FinanceWhatsAppPage.tsx');
