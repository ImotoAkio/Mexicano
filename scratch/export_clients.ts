import { pullDatabase } from '../server-db.js';
import fs from 'fs';
import path from 'path';

async function run() {
  try {
    const data = await pullDatabase();
    
    const result = data.clients.map(client => {
      const relatedBoatIds = [];
      if (client.embarcacaoId) {
        relatedBoatIds.push(client.embarcacaoId);
      }
      
      if (client.embarcacoes && Array.isArray(client.embarcacoes)) {
         client.embarcacoes.forEach(emb => {
           if (emb.id) relatedBoatIds.push(emb.id);
         });
      }

      const uniqueBoatIds = [...new Set(relatedBoatIds)].filter(id => id);
      const boats = uniqueBoatIds.map(id => data.boats.find(b => b.id === id)).filter(b => b);

      return {
        id: client.id,
        nome: client.nome,
        email: client.email,
        telefone: client.telefone,
        cpf: client.cpf,
        dataCadastro: client.dataCadastro,
        embarcacoes_relacionadas: boats.map(b => ({
           id: b.id,
           nome: b.nome,
           tipo: b.tipo,
           fabricante: b.fabricante,
           modelo: b.modelo,
           ano: b.ano,
           numero: b.numero
        }))
      };
    });

    const outputPath = path.resolve('clientes_embarcacoes.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`Successfully exported ${result.length} clients to ${outputPath}`);
    process.exit(0);
  } catch (err) {
    console.error('Error generating export:', err);
    process.exit(1);
  }
}

run();
