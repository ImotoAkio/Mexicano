const fs = require('fs');
let code = fs.readFileSync('server-db.ts', 'utf8');

const regex = /\n\/\/ ──────────── Centros de Custo ────────────[\s\S]*?export async function deleteCentroDeCusto\(id: string\): Promise<void> \{\n  const currentPool = getDbPool\(\);\n  if \(\!currentPool\) throw new Error\("MySQL Connection pool is offline\."\);\n  await currentPool\.query\("DELETE FROM CentrosDeCusto WHERE id = \?", \[id\]\);\n\}\n/;

// I'll just remove the second occurrence of it, or rather replace it once globally
const matches = code.match(new RegExp(regex, 'g'));
if (matches && matches.length > 1) {
  // Replace the first one with empty string
  code = code.replace(regex, '');
}
fs.writeFileSync('server-db.ts', code);
console.log('Removed duplicate Centros de Custo block');
