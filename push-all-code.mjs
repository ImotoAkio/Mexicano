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

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (['node_modules', 'dist', '.git', '.github', 'uploads', 'scratch', 'build'].includes(file)) continue;
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (['.env', 'push-all-code.mjs'].includes(file)) continue;
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

async function run() {
  try {
    console.log('Fetching branch info...');
    let latestCommitSha;
    try {
      const ref = await api(`git/refs/heads/${BRANCH}`);
      latestCommitSha = ref.object.sha;
    } catch(e) {
      console.log("Branch doesn't exist or repo is empty. Will create initial commit.");
    }
    
    console.log('Gathering files...');
    const allFiles = getAllFiles('.');
    console.log(`Found ${allFiles.length} files to push.`);
    
    const treeItems = [];
    let processed = 0;
    
    for (let i = 0; i < allFiles.length; i += 20) {
      const batch = allFiles.slice(i, i + 20);
      const promises = batch.map(async (filePath) => {
        try {
          const content = fs.readFileSync(filePath);
          const base64Content = content.toString('base64');
          
          const blobRes = await api('git/blobs', 'POST', {
            content: base64Content,
            encoding: 'base64'
          });
          
          let relativePath = path.relative('.', filePath).replace(/\\/g, '/');
          
          treeItems.push({
            path: relativePath,
            mode: '100644',
            type: 'blob',
            sha: blobRes.sha
          });
        } catch (err) {
          console.error(`Failed to process ${filePath}:`, err.message);
        }
      });
      await Promise.all(promises);
      processed += batch.length;
      console.log(`Processed ${processed}/${allFiles.length} files...`);
    }
    
    if (treeItems.length === 0) {
      console.log('No files to update.');
      return;
    }
    
    console.log('Creating tree...');
    const treePayload = { tree: treeItems };
    const newTree = await api('git/trees', 'POST', treePayload);
    
    console.log('Creating commit...');
    const commitPayload = {
      message: 'feat: full local push',
      tree: newTree.sha,
    };
    if (latestCommitSha) {
      commitPayload.parents = [latestCommitSha];
    }
    const newCommit = await api('git/commits', 'POST', commitPayload);
    
    console.log('Updating reference...');
    if (latestCommitSha) {
      await api(`git/refs/heads/${BRANCH}`, 'PATCH', {
        sha: newCommit.sha,
        force: true
      });
    } else {
      await api(`git/refs`, 'POST', {
        ref: `refs/heads/${BRANCH}`,
        sha: newCommit.sha
      });
    }
    
    console.log('Successfully pushed to GitHub!');
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
