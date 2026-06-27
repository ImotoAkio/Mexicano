import fs from 'fs';

const TOKEN = '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';
const OWNER = 'ImotoAkio';
const REPO = 'Mexicano';
const BRANCH = 'main';

const filesToUpload = [
  'src/types.ts',
  'src/components/SchedulesPage.tsx',
  'src/components/MarinaDashboard.tsx',
  'src/components/FinancePage.tsx',
  'src/App.tsx',
  'server.ts',
  'server-db.ts'
];

async function api(path, method = 'GET', body = null) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/${path}`;
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
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json();
}

async function run() {
  try {
    console.log('Fetching branch info...');
    const ref = await api(`git/refs/heads/${BRANCH}`);
    const latestCommitSha = ref.object.sha;
    
    const commitData = await api(`git/commits/${latestCommitSha}`);
    const baseTreeSha = commitData.tree.sha;
    
    console.log('Creating blobs...');
    const treeItems = [];
    
    for (const filePath of filesToUpload) {
      if (!fs.existsSync(filePath)) {
        console.warn(`File ${filePath} not found, skipping.`);
        continue;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      const blobRes = await api('git/blobs', 'POST', {
        content,
        encoding: 'utf-8'
      });
      
      console.log(`Blob created for ${filePath} (${blobRes.sha})`);
      
      treeItems.push({
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blobRes.sha
      });
    }
    
    if (treeItems.length === 0) {
      console.log('No files to update.');
      return;
    }
    
    console.log('Creating tree...');
    const newTree = await api('git/trees', 'POST', {
      base_tree: baseTreeSha,
      tree: treeItems
    });
    
    console.log('Creating commit...');
    const newCommit = await api('git/commits', 'POST', {
      message: 'feat: update Marina, Finance and DB schemas',
      tree: newTree.sha,
      parents: [latestCommitSha]
    });
    
    console.log('Updating reference...');
    await api(`git/refs/heads/${BRANCH}`, 'PATCH', {
      sha: newCommit.sha,
      force: false
    });
    
    console.log('Successfully pushed to GitHub!');
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
