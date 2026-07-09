import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

const TOKEN = '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';
const OWNER = 'ImotoAkio';
const REPO = 'Mexicano';

async function downloadZip() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/zipball/main`;
  console.log(`Downloading zipball from ${url}...`);

  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent': 'NodeJS-Script'
      }
    };

    const request = https.get(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Redirect to S3
        const redirectUrl = res.headers.location;
        console.log(`Following redirect to ${redirectUrl}`);
        const file = fs.createWriteStream('repo.zip');
        https.get(redirectUrl, (redirectRes) => {
          if (redirectRes.statusCode !== 200) {
            reject(new Error(`Failed to download from redirect: ${redirectRes.statusCode}`));
            return;
          }
          redirectRes.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log('Zip file downloaded successfully.');
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink('repo.zip', () => {});
          reject(err);
        });
      } else if (res.statusCode === 200) {
        const file = fs.createWriteStream('repo.zip');
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Zip file downloaded successfully.');
          resolve();
        });
      } else {
        reject(new Error(`Failed to download: Status Code ${res.statusCode}`));
      }
    });

    request.on('error', reject);
  });
}

async function run() {
  try {
    await downloadZip();
    
    // Create backup directory
    const backupDir = `backup_local_${Date.now()}`;
    console.log(`Creating backup directory: ${backupDir}`);
    fs.mkdirSync(backupDir, { recursive: true });

    // Backup existing important directories
    const pathsToBackup = ['src', 'server.ts', 'server-db.ts', 'vite.config.ts', 'package.json', 'index.html'];
    for (const p of pathsToBackup) {
      if (fs.existsSync(p)) {
        console.log(`Backing up ${p}...`);
        try {
          execSync(`powershell -Command "Copy-Item -Path '${p}' -Destination '${backupDir}' -Recurse -Force"`);
        } catch (e) {
          console.warn(`Failed to backup ${p}:`, e.message);
        }
      }
    }

    console.log('Extracting zip file...');
    if (fs.existsSync('repo_extracted')) {
      fs.rmSync('repo_extracted', { recursive: true, force: true });
    }
    execSync('powershell -Command "Expand-Archive -Path .\\repo.zip -DestinationPath .\\repo_extracted -Force"');
    console.log('Extraction complete.');

    // Look inside repo_extracted. It contains a single root folder named like OWNER-REPO-SHA
    const directories = fs.readdirSync('repo_extracted');
    const rootDirName = directories.find(d => d.startsWith(`${OWNER}-${REPO}-`));
    if (!rootDirName) {
      throw new Error('Could not find extracted root folder inside repo_extracted');
    }
    const extractedRoot = path.join('repo_extracted', rootDirName);
    console.log(`Extracted root directory: ${extractedRoot}`);

    // Move all files/directories from extractedRoot to current directory, overwriting them (except .env)
    console.log('Moving files to workspace root...');
    
    const items = fs.readdirSync(extractedRoot);
    for (const item of items) {
      const srcPath = path.join(extractedRoot, item);

      if (item === '.env') {
        continue;
      }

      console.log(`Updating ${item}...`);
      try {
        execSync(`powershell -Command "Copy-Item -Path '${srcPath.replace(/'/g, "''")}' -Destination '.' -Recurse -Force"`);
      } catch (copyErr) {
        console.error(`Failed to copy ${item}:`, copyErr.message);
      }
    }

    // Clean up temporary zip and extracted files
    console.log('Cleaning up temporary files...');
    try {
      fs.unlinkSync('repo.zip');
      fs.rmSync('repo_extracted', { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn('Failed to clean up temporary files:', cleanupErr.message);
    }

    console.log('Updating GitHub tokens in local files...');
    // Replace old tokens in scripts with the new token
    const filesWithToken = ['github-push.mjs', 'push-recent-changes.mjs', 'push-all-code.mjs', 'push-lock.mjs', 'pull-all-code.mjs'];
    for (const file of filesWithToken) {
      if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        const regex = /ghp_[a-zA-Z0-9]{36}/g;
        if (regex.test(content)) {
          content = content.replace(regex, TOKEN);
          fs.writeFileSync(file, content, 'utf8');
          console.log(`Updated token in ${file}`);
        }
      }
    }

    console.log('Update finished successfully!');
  } catch (err) {
    console.error('Error during update:', err);
    process.exit(1);
  }
}

run();
