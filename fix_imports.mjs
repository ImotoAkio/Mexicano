import fs from 'fs';
const files = ['src/components/WhatsAppPage.tsx', 'src/components/FinanceWhatsAppPage.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/..\/..\/utils\/apiAuth/g, "../utils/apiAuth");
  fs.writeFileSync(file, content);
}
console.log('Fixed imports');
