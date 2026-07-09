import fs from 'fs';
import path from 'path';

const TOKEN = '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';
const OWNER = 'ImotoAkio';
const REPO = 'Mexicano';
const BRANCH = 'main';

// Helper to make API requests
async function api(pathUrl, isRaw = false) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/${pathUrl}`;
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'User-Agent': 'NodeJS-Script'
  };
  if (isRaw) {
    headers['Accept'] = 'application/vnd.github.v3.raw';
  } else {
    headers['Accept'] = 'application/vnd.github.v3+json';
  }

  let retries = 3;
  while (retries > 0) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error: ${res.status} ${res.statusText} - ${text}`);
      }
      return isRaw ? res.arrayBuffer() : res.json();
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// Helper to scan local directory recursively
function getAllLocalFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const relativePath = path.relative('.', fullPath).replace(/\\/g, '/');
    
    // Ignore patterns
    if (fs.statSync(fullPath).isDirectory()) {
      if (['node_modules', 'dist', '.git', 'uploads', 'scratch', 'build'].includes(file)) continue;
      getAllLocalFiles(fullPath, arrayOfFiles);
    } else {
      if (['.env', 'github-pull.mjs', 'test-api.mjs'].includes(file)) continue;
      arrayOfFiles.push(relativePath);
    }
  }
  return arrayOfFiles;
}

async function run() {
  try {
    console.log('Fetching recursive remote tree from GitHub...');
    const treeData = await api(`git/trees/${BRANCH}?recursive=1`);
    
    if (!treeData.tree || !Array.isArray(treeData.tree)) {
      throw new Error('Invalid tree data returned from GitHub API');
    }

    const remoteFiles = treeData.tree.filter(item => item.type === 'blob');
    const remotePaths = new Set(remoteFiles.map(item => item.path));

    console.log(`Found ${remoteFiles.length} files in the remote repository.`);

    // 1. Download/update remote files locally
    let downloadedCount = 0;
    for (const file of remoteFiles) {
      const localPath = path.join('.', file.path);
      const localDir = path.dirname(localPath);

      // Create folder if it doesn't exist
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      console.log(`Downloading ${file.path}...`);
      const arrayBuffer = await api(`git/blobs/${file.sha}`, true);
      fs.writeFileSync(localPath, Buffer.from(arrayBuffer));
      downloadedCount++;
    }
    console.log(`Successfully downloaded/updated ${downloadedCount} files.`);

    // 2. Delete local files that are not in remote repo (excluding ignored paths)
    console.log('Checking for local files to clean up...');
    const localFiles = getAllLocalFiles('.');
    let deletedCount = 0;
    for (const localFile of localFiles) {
      if (!remotePaths.has(localFile)) {
        console.log(`Deleting local-only file: ${localFile}`);
        try {
          fs.unlinkSync(localFile);
          deletedCount++;
        } catch (e) {
          console.error(`Failed to delete ${localFile}:`, e.message);
        }
      }
    }
    console.log(`Cleanup complete. Deleted ${deletedCount} local-only files.`);
    console.log('Sync finished successfully!');

  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

run();
