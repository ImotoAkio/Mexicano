import fs from 'fs';

const filePath = 'src/components/MarinaOperador/PierTvDisplay.tsx';
let source = fs.readFileSync(filePath, 'utf8');

// Change window.location.href = '/admin' to clear token and reload so it stays on tv-pier
source = source.replace(
  /onClick=\{\(\) => window\.location\.href = '\/admin'\}/,
  "onClick={() => { localStorage.removeItem('admin_token'); window.location.reload(); }}"
);

fs.writeFileSync(filePath, source);
