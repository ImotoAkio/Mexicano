const fs = require('fs');
const filepath = 'src/components/WhatsAppPage.tsx';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(/from 'lucide-react';/, "Download } from 'lucide-react';");
fs.writeFileSync(filepath, content);
