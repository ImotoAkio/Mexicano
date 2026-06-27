import fs from 'fs';
import https from 'https';

const TOKEN = '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';
const REPO = 'ImotoAkio/Mexicano';
const PATH = 'package-lock.json';
const BRANCH = 'main'; // Adjust if branch is different

const request = (method, path, data = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Authorization': `token ${TOKEN}`,
                'User-Agent': 'Node.js',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body || '{}'));
                } else {
                    reject(new Error(`API Error: ${res.statusCode} - ${body}`));
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
};

async function pushFile() {
    try {
        console.log(`Getting SHA for ${PATH}...`);
        let sha;
        try {
            const fileInfo = await request('GET', `/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`);
            sha = fileInfo.sha;
            console.log(`Found existing file with SHA: ${sha}`);
        } catch (e) {
            console.log('File does not exist yet or error getting sha:', e.message);
        }

        const content = fs.readFileSync(PATH, 'utf8');
        const base64Content = Buffer.from(content).toString('base64');

        const commitData = {
            message: 'fix: sync package-lock.json to fix npm ci in github actions',
            content: base64Content,
            branch: BRANCH
        };

        if (sha) {
            commitData.sha = sha;
        }

        console.log(`Pushing ${PATH}...`);
        const result = await request('PUT', `/repos/${REPO}/contents/${PATH}`, commitData);
        console.log('Successfully pushed!', result.commit.html_url);
    } catch (e) {
        console.error('Error:', e);
    }
}

pushFile();
