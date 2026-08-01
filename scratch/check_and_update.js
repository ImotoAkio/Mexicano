const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOKEN = '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';
const REPO = 'ImotoAkio/Mexicano';
const LOCAL_DIR = 'c:\\mexicano';

function apiRequest(urlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      headers: {
        'User-Agent': 'NodeJS-Updater',
        'Authorization': 'token ' + TOKEN,
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(urlPath, targetPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      headers: {
        'User-Agent': 'NodeJS-Updater',
        'Authorization': 'token ' + TOKEN,
        'Accept': 'application/vnd.github.v3.raw'
      }
    };
    https.get(options, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Redirect
        const redirectUrl = new URL(res.headers.location);
        https.get(redirectUrl, (res2) => {
          const fileStream = fs.createWriteStream(targetPath);
          res2.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close(resolve);
          });
        }).on('error', reject);
      } else if (res.statusCode >= 200 && res.statusCode < 300) {
        const fileStream = fs.createWriteStream(targetPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(resolve);
        });
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching repository latest commit info...');
  const commit = await apiRequest(`/repos/${REPO}/commits/main`);
  const remoteSha = commit.sha;
  console.log(`Latest commit on main branch: ${remoteSha}`);
  console.log(`Commit message: ${commit.commit.message}`);
  
  let localSha = '';
  const headRefPath = path.join(LOCAL_DIR, '.git', 'refs', 'heads', 'main');
  if (fs.existsSync(headRefPath)) {
    localSha = fs.readFileSync(headRefPath, 'utf8').trim();
  }
  console.log(`Local commit: ${localSha}`);

  if (localSha === remoteSha) {
    console.log('Local code is already up to date!');
    return;
  }

  console.log(`Comparing ${localSha} ... ${remoteSha}`);
  const comparison = await apiRequest(`/repos/${REPO}/compare/${localSha}...${remoteSha}`);
  console.log(`Total commits behind: ${comparison.total_commits}`);
  console.log(`Number of files changed: ${comparison.files.length}`);

  for (const f of comparison.files) {
    console.log(`File: ${f.filename} (${f.status})`);
    const targetFile = path.join(LOCAL_DIR, f.filename.replace(/\//g, path.sep));
    
    if (f.status === 'removed') {
      if (fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile);
        console.log(`  Deleted ${f.filename}`);
      }
    } else if (f.status === 'modified' || f.status === 'added' || f.status === 'renamed') {
      const dir = path.dirname(targetFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      console.log(`  Downloading ${f.filename}...`);
      await downloadFile(`/repos/${REPO}/contents/${f.filename}?ref=${remoteSha}`, targetFile);
      console.log(`  Updated ${f.filename}`);
    }
  }

  // Update .git/refs/heads/main and .git/ORIG_HEAD
  fs.writeFileSync(path.join(LOCAL_DIR, '.git', 'ORIG_HEAD'), localSha + '\n');
  fs.writeFileSync(headRefPath, remoteSha + '\n');
  console.log('Updated .git/refs/heads/main to latest remote SHA.');
  console.log('SUCCESS! Repository has been updated.');
}

main().catch(err => console.error('Error:', err));
