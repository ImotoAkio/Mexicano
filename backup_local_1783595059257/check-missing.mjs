import fs from 'fs';
import path from 'path';

const TOKEN = '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';
const OWNER = 'ImotoAkio';
const REPO = 'Mexicano';
const BRANCH = 'main';

async function api(pathUrl) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/${pathUrl}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'NodeJS-Script'
    }
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (['node_modules', 'dist', '.git', '.github', 'uploads', 'scratch', 'build'].includes(file)) continue;
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (['.env', 'push-all-code.mjs', 'check-missing.mjs'].includes(file)) continue;
      arrayOfFiles.push(path.relative('.', fullPath).replace(/\\/g, '/'));
    }
  }
  return arrayOfFiles;
}

async function run() {
  try {
    const ref = await api(`git/refs/heads/${BRANCH}`);
    const commitData = await api(`git/commits/${ref.object.sha}`);
    const treeData = await api(`git/trees/${commitData.tree.sha}?recursive=1`);
    
    const remoteFiles = new Set(treeData.tree.filter(t => t.type === 'blob').map(t => t.path));
    const localFiles = getAllFiles('.');
    
    const missing = [];
    for (const f of localFiles) {
      if (!remoteFiles.has(f)) {
        missing.push(f);
      }
    }
    
    if (missing.length > 0) {
      console.log(`Missing ${missing.length} files:`);
      for (const m of missing.slice(0, 50)) {
        console.log(' - ' + m);
      }
      if (missing.length > 50) console.log(`...and ${missing.length - 50} more.`);
    } else {
      console.log('All local files are present on GitHub!');
    }
  } catch (err) {
    console.error(err);
  }
}
run();
