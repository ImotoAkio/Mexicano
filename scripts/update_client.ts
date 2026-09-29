import fs from 'fs';
import path from 'path';

// Fix types.ts
const typesPath = path.join('C:/Users/Akio/Documents/mexicano/src/types.ts');
let typesContent = fs.readFileSync(typesPath, 'utf8');

const regex = /embarcacoes\?: Array<\{\s*embarcacaoId: string;\s*cota: string;\s*\}>;/;
const replacement = `embarcacoes?: Array<{
    embarcacaoId: string;
    cota: string;
    acessorios?: {
      tenda?: boolean;
      mesa?: boolean;
      bancosCadeiras?: boolean;
      churrasqueira?: boolean;
      observacoes?: string;
    };
  }>;`;

typesContent = typesContent.replace(regex, replacement);
fs.writeFileSync(typesPath, typesContent);
console.log('Fixed types.ts');
