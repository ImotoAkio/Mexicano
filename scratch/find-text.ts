import fs from 'fs';
import path from 'path';

function searchInDir(dir: string, text: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchInDir(fullPath, text);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes(text.toLowerCase())) {
        console.log(`Found in: ${fullPath}`);
      }
    }
  }
}

searchInDir('c:/mexicano/src', 'Confirmações de Saída');
searchInDir('c:/mexicano/src', 'Confirmar e Enviar');
