import fs from 'fs';

const filePath = 'src/components/MarinaOperador/PierTvDisplay.tsx';
let source = fs.readFileSync(filePath, 'utf8');

source = source.replace(
  /if \(res\.status === 401 \|\| res\.status === 403\) \{\s+setError\('Sessão expirada\. Faça login novamente\.'\);\s+return;\s+\}/,
  "if (res.status === 401 || res.status === 403) {\n        window.dispatchEvent(new Event('auth-expired'));\n        setError('Sessão expirada. Faça login novamente.');\n        return;\n      }"
);

fs.writeFileSync(filePath, source);
