import fs from 'fs';

const files = [
  'src/components/WhatsAppPage.tsx',
  'src/components/FinanceWhatsAppPage.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes("../../utils/apiAuth")) {
    content = content.replace("import React,", "import { fetchWithAuth, getAuthHeaders, getAdminToken } from '../../utils/apiAuth';\nimport React,");
    
    // Replace: const token = localStorage.getItem('admin_token');
    // Replace: const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // Replace: if (token) headers['Authorization'] = `Bearer ${token}`;
    content = content.replace(/const token = localStorage.getItem\('admin_token'\);[\s\n]*const headers: Record<string, string> = \{ 'Content-Type': 'application\/json' \};[\s\n]*if \(token\) headers\['Authorization'\] = `Bearer \$\{token\}`;/g, "const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };");

    // Fix other fetch usages: headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
    content = content.replace(/headers:\s*\{\s*'Authorization':\s*`Bearer \$\{localStorage\.getItem\('admin_token'\)\}`\s*\}/g, "headers: getAuthHeaders()");
    content = content.replace(/headers:\s*\{\s*Authorization:\s*`Bearer \$\{localStorage\.getItem\('admin_token'\)\}`\s*\}/g, "headers: getAuthHeaders()");

    // Fix manual token fetching
    content = content.replace(/const token = localStorage\.getItem\('admin_token'\);/g, "const token = getAdminToken();");
    
    // Fix initial fetch headers (around line 100)
    // const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    content = content.replace(/const headers = \{ 'Content-Type': 'application\/json', 'Authorization': `Bearer \$\{token\}` \};/g, "const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };");

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
