import { pullDatabase, upsertClient } from '../server-db.js';
import * as fs from 'fs';

function normalizeString(str: string): string {
    if (!str) return "";
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

async function run() {
    console.log("Loading DB...");
    const data = await pullDatabase();
    const dbClients = data.clients;
    console.log(`Loaded ${dbClients.length} DB clients.`);

    console.log("Loading PDF parsed clients...");
    const parsedPdfClients = JSON.parse(fs.readFileSync('parsed_clientes.json', 'utf-8'));
    console.log(`Loaded ${parsedPdfClients.length} PDF clients.`);

    let updatedCount = 0;
    let notFoundCount = 0;
    
    // Process matching
    for (const pdfClient of parsedPdfClients) {
        // Find match
        let match = dbClients.find(c => normalizeString(c.nome) === pdfClient.normalizedName);
        
        // Sometimes PDF has extra names or DB has it. Try a looser match if not exact
        if (!match) {
            match = dbClients.find(c => {
                const dbName = normalizeString(c.nome);
                const pdfName = pdfClient.normalizedName;
                // If one contains the other and length diff > 3 
                return dbName === pdfName || 
                       (dbName.includes(pdfName) && pdfName.length > 10) || 
                       (pdfName.includes(dbName) && dbName.length > 10);
            });
        }
        
        if (match) {
            let updated = false;
            
            if (!match.cpf && pdfClient.cpf && pdfClient.cpf.length > 5) {
                match.cpf = pdfClient.cpf;
                updated = true;
            }
            
            if (!match.rg && pdfClient.rg && pdfClient.rg.length > 2) {
                match.rg = pdfClient.rg;
                updated = true;
            }
            
            if (!match.logradouro && pdfClient.endereco) {
                // Try to extract number
                const regexes = [/,?\s*[Nn][º°o]\s*(\d+\w*)/i, /,?\s*(\d+\w*)$/];
                let numberFound = "";
                let logradouroFound = pdfClient.endereco;
                
                for (const rx of regexes) {
                    const m = pdfClient.endereco.match(rx);
                    if (m) {
                        numberFound = m[1];
                        logradouroFound = pdfClient.endereco.replace(rx, '').trim();
                        break;
                    }
                }
                
                match.logradouro = logradouroFound;
                if (numberFound && !match.numeroEnd) {
                    match.numeroEnd = numberFound;
                }
                
                updated = true;
            }
            
            if (!match.bairro && pdfClient.bairro) {
                match.bairro = pdfClient.bairro.trim();
                updated = true;
            }
            
            if (!match.cidade && pdfClient.cidade) {
                match.cidade = pdfClient.cidade.trim();
                if (!match.estado) {
                    // Default to BA or PE depending on city (Petrolina=PE, Juazeiro=BA, default to undefined/leave as is)
                    if (match.cidade.toUpperCase() === 'PETROLINA') match.estado = 'PE';
                    if (match.cidade.toUpperCase() === 'JUAZEIRO') match.estado = 'BA';
                }
                updated = true;
            }
            
            // Check phones
            if (!match.telefone && pdfClient.tel) {
                // Clean formatting to digits only e.g. 55 + DDD + NUM
                let cleanPhone = pdfClient.tel.replace(/\D/g, '');
                if (cleanPhone.length === 11 || cleanPhone.length === 10) {
                    cleanPhone = '55' + cleanPhone;
                }
                match.telefone = cleanPhone;
                updated = true;
            }
            
            if (updated) {
                await upsertClient(match);
                updatedCount++;
                console.log(`Updated client: ${match.nome}`);
            }
        } else {
            console.log(`NOT FOUND in DB: ${pdfClient.name}`);
            notFoundCount++;
        }
    }
    
    console.log(`\nImport summary:`);
    console.log(`Updated existing clients: ${updatedCount}`);
    console.log(`Not found in DB: ${notFoundCount}`);
    process.exit(0);
}

run();
