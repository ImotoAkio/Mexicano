import fs from 'fs';
import path from 'path';

const TOKEN = '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';
const OWNER = 'ImotoAkio';
const REPO = 'Mexicano';
const BRANCH = 'main';

async function api(pathUrl, method = 'GET', body = null) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/${pathUrl}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'NodeJS-Script'
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  let retries = 3;
  while(retries > 0) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error: ${res.status} ${res.statusText} - ${text}`);
      }
      return res.json();
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function run() {
  try {
    console.log('Fetching branch info...');
    const ref = await api(`git/refs/heads/${BRANCH}`);
    const latestCommitSha = ref.object.sha;
    console.log(`Latest commit SHA: ${latestCommitSha}`);

    console.log('Fetching tree info recursively...');
    const treeData = await api(`git/trees/${latestCommitSha}?recursive=1`);
    const tree = treeData.tree;
    console.log(`Found ${tree.length} entries in remote tree.`);

    // Create a local backup directory
    const backupDir = `backup_local_${Date.now()}`;
    console.log(`Creating backup directory: ${backupDir}`);
    fs.mkdirSync(backupDir, { recursive: true });

    // Download files
    for (const entry of tree) {
      if (entry.type === 'blob') {
        const localPath = entry.path;
        
        // Skip .env and the backup folders
        if (localPath === '.env' || localPath.startsWith('backup_local_') || localPath === 'pull-all-code.mjs') {
          continue;
        }

        // Backup existing file if it exists
        if (fs.existsSync(localPath)) {
          const backupFilePath = path.join(backupDir, localPath);
          fs.mkdirSync(path.dirname(backupFilePath), { recursive: true });
          fs.copyFileSync(localPath, backupFilePath);
        }

        console.log(`Downloading ${localPath}...`);
        try {
          const blobData = await api(`git/blobs/${entry.sha}`);
          const buffer = Buffer.from(blobData.content, 'base64');

          // Write to local path
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
          fs.writeFileSync(localPath, buffer);
        } catch (fileErr) {
          console.error(`Failed to download ${localPath}:`, fileErr.message);
        }
      }
    }
    console.log('Successfully updated local code!');
  } catch (err) {
    console.error('Error updating local code:', err);
    process.exit(1);
  }
}

run();
