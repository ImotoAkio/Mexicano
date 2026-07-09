const TOKEN = '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';
const OWNER = 'ImotoAkio';
const REPO = 'Mexicano';

async function test() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'NodeJS-Script'
    }
  });

  if (!response.ok) {
    console.error(`Error: ${response.status} ${response.statusText}`);
    console.error(await response.text());
    process.exit(1);
  }

  const data = await response.json();
  console.log('Success! Connected to repository:', data.full_name);
  console.log('Default branch:', data.default_branch);
}

test();
