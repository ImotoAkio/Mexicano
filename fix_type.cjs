const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

const interfaceType = `
export interface CentroDeCusto {
  id: string;
  nome: string;
  empresaId: string;
  status: 'ativo' | 'inativo';
  createdAt?: string;
  updatedAt?: string;
}
`;

if (!content.includes('interface CentroDeCusto')) {
    content += interfaceType;
    fs.writeFileSync('src/types.ts', content);
    console.log('Added CentroDeCusto to types.ts');
} else {
    console.log('Already exists');
}
