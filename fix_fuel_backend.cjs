const fs = require('fs');

let dbPath = './server-db.ts';
let dbContent = fs.readFileSync(dbPath, 'utf8');

if (!dbContent.includes('consumeFuelAtomicDb')) {
  const consumeFuelFunction = `
export async function consumeFuelAtomicDb(litros: number, barcoNome: string, operador: string, detalhes?: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) {
    throw new Error("No database pool available for atomic operation.");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Lock row for update
    const [rows] = await connection.query('SELECT * FROM CombustivelEstoque WHERE id = 1 FOR UPDATE') as any;
    if (!rows || rows.length === 0) {
       throw new Error("Estoque de combustivel nao inicializado.");
    }
    
    const row = rows[0];
    let tanquePrincipal = Number(row.tanque_principal || 0);
    let galoesPierQuantidade = Number(row.galoes_qtd || 0);
    const galoesCapacidade = Number(row.galoes_capacidade || 20);
    let galaoParcialLitros = Number(row.galao_parcial || 0);

    let remainingToDeduct = litros;
  
    if (galaoParcialLitros > 0) {
      if (galaoParcialLitros >= remainingToDeduct) {
        galaoParcialLitros -= remainingToDeduct;
        remainingToDeduct = 0;
      } else {
        remainingToDeduct -= galaoParcialLitros;
        galaoParcialLitros = 0;
      }
    }
    
    if (remainingToDeduct > 0) {
      const galoesNecessarios = Math.ceil(remainingToDeduct / galoesCapacidade);
      if (galoesPierQuantidade >= galoesNecessarios) {
        galoesPierQuantidade -= galoesNecessarios;
        const litrosExtraidos = galoesNecessarios * galoesCapacidade;
        galaoParcialLitros = litrosExtraidos - remainingToDeduct;
        remainingToDeduct = 0;
      } else {
        const litrosDisponiveisNosGaloes = galoesPierQuantidade * galoesCapacidade;
        remainingToDeduct -= litrosDisponiveisNosGaloes;
        galoesPierQuantidade = 0;
        galaoParcialLitros = 0;
        tanquePrincipal = Math.max(0, tanquePrincipal - remainingToDeduct);
      }
    }

    await connection.query(\`
      UPDATE CombustivelEstoque SET 
        tanque_principal = ?, 
        galoes_qtd = ?, 
        galao_parcial = ?
      WHERE id = 1
    \`, [tanquePrincipal, galoesPierQuantidade, galaoParcialLitros]);

    const idHist = "hist_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const dataHoraStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const computedDetalhes = detalhes || \`Abastecimento de \${litros}L na embarcação \${barcoNome}\`;
    
    await connection.query(\`
      INSERT INTO CombustivelMovimentacoes (
        id, tipo, litros, barco_nome, operador, data_hora, detalhes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    \`, [
       idHist,
       'abastecimento_embarcacao',
       litros,
       barcoNome || "",
       operador || "",
       dataHoraStr,
       computedDetalhes
    ]);

    await connection.commit();
    return true;
  } catch(e: any) {
    await connection.rollback();
    console.error("Erro na baixa de combustivel (atomic):", e.message);
    throw e;
  } finally {
    connection.release();
  }
}

export async function restoreFuelAtomicDb(litros: number, motivo: string, operador: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) {
    throw new Error("No database pool available for atomic operation.");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const [rows] = await connection.query('SELECT * FROM CombustivelEstoque WHERE id = 1 FOR UPDATE') as any;
    if (!rows || rows.length === 0) {
       throw new Error("Estoque de combustivel nao inicializado.");
    }
    
    const row = rows[0];
    let tanquePrincipal = Number(row.tanque_principal || 0);

    // Devolve direto para o tanque principal para simplificar
    tanquePrincipal += litros;

    await connection.query(\`
      UPDATE CombustivelEstoque SET 
        tanque_principal = ?
      WHERE id = 1
    \`, [tanquePrincipal]);

    const idHist = "hist_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const dataHoraStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    await connection.query(\`
      INSERT INTO CombustivelMovimentacoes (
        id, tipo, litros, operador, data_hora, detalhes
      ) VALUES (?, ?, ?, ?, ?, ?)
    \`, [
       idHist,
       'ajuste_manual',
       litros,
       operador || "",
       dataHoraStr,
       \`Estorno de combustivel: \${motivo} (\${litros}L devolvidos ao tanque principal)\`
    ]);

    await connection.commit();
    return true;
  } catch(e: any) {
    await connection.rollback();
    console.error("Erro no estorno de combustivel (atomic):", e.message);
    throw e;
  } finally {
    connection.release();
  }
}
`;
  
  dbContent += "\n" + consumeFuelFunction;
  fs.writeFileSync(dbPath, dbContent);
  console.log("Added consumeFuelAtomicDb and restoreFuelAtomicDb to server-db.ts");
} else {
    console.log("Already added");
}
