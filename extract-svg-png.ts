import fs from 'fs';
import path from 'path';

function processDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.svg')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const match = content.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
      if (match && match[1]) {
        console.log(`Extracting from ${fullPath}`);
        const base64Data = match[1];
        const pngPath = fullPath.replace(/\.svg$/, '.png');
        fs.writeFileSync(pngPath, Buffer.from(base64Data, 'base64'));
        console.log(`Saved ${pngPath}`);
        // Optionally delete the SVG later
      } else {
         console.log(`No base64 found in ${fullPath}`);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'public', 'checklist'));
