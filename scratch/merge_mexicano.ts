import * as path from 'path';
import * as path from 'path';

async function run() {
  // Fix imports
  const { getDbPool } = await import('../server-db.ts');
  const pool = getDbPool();
  if (!pool) {
    console.error('No DB pool');
    process.exit(1);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [clients] = await connection.query("SELECT * FROM Clientes WHERE nome LIKE '%mexicano%'");
    const mxClients = clients as any[];

    if (mxClients.length <= 1) {
      console.log('No need to merge, found ' + mxClients.length + ' clients.');
      process.exit(0);
    }

    // Keep the first one
    const primaryId = mxClients[0].id;
    const idsToMerge = mxClients.slice(1).map(c => c.id);

    console.log('Primary client ID:', primaryId);
    console.log('Clients to merge and delete:', idsToMerge);

    // Merge embarcacoes
    let allEmbarcacoes: any[] = [];
    for (const c of mxClients) {
      if (c.embarcacoes) {
        try {
          const parsed = typeof c.embarcacoes === 'string' ? JSON.parse(c.embarcacoes) : c.embarcacoes;
          if (Array.isArray(parsed)) {
            allEmbarcacoes.push(...parsed);
          }
        } catch (e) {}
      }
    }

    // deduplicate
    const uniqueEmbMap = new Map();
    for (const e of allEmbarcacoes) {
      uniqueEmbMap.set(e.embarcacaoId, e);
    }
    const mergedEmbarcacoes = Array.from(uniqueEmbMap.values());

    // Update primary client
    await connection.query(
      "UPDATE Clientes SET embarcacoes = ? WHERE id = ?",
      [JSON.stringify(mergedEmbarcacoes), primaryId]
    );

    const placeholders = idsToMerge.map(() => '?').join(',');

    // Update Reservas
    const [resResult] = await connection.query(
      `UPDATE Reservas SET clienteId = ? WHERE clienteId IN (${placeholders})`,
      [primaryId, ...idsToMerge]
    );
    console.log('Reservations updated:', (resResult as any).affectedRows);

    // Update TransacoesFinanceiras
    const [finResult] = await connection.query(
      `UPDATE TransacoesFinanceiras SET clienteId = ? WHERE clienteId IN (${placeholders})`,
      [primaryId, ...idsToMerge]
    );
    console.log('Transactions updated:', (finResult as any).affectedRows);

    // Update ControlesSom
    const [somResult] = await connection.query(
      `UPDATE ControlesSom SET clienteId = ? WHERE clienteId IN (${placeholders})`,
      [primaryId, ...idsToMerge]
    );
    console.log('ControlesSom updated:', (somResult as any).affectedRows);

    // Update Embarcacoes (donos field JSON array)
    const [boats] = await connection.query("SELECT id, donos FROM Embarcacoes");
    for (const b of boats as any[]) {
      if (b.donos) {
        try {
          const parsed = typeof b.donos === 'string' ? JSON.parse(b.donos) : b.donos;
          if (Array.isArray(parsed)) {
            let changed = false;
            let newDonos = parsed.map(d => {
              if (idsToMerge.includes(d)) {
                changed = true;
                return primaryId;
              }
              return d;
            });
            
            if (changed) {
              newDonos = Array.from(new Set(newDonos));
              await connection.query(
                "UPDATE Embarcacoes SET donos = ? WHERE id = ?",
                [JSON.stringify(newDonos), b.id]
              );
              console.log('Boat updated:', b.id);
            }
          }
        } catch (e) {}
      }
    }

    // Delete merged clients
    const [delResult] = await connection.query(
      `DELETE FROM Clientes WHERE id IN (${placeholders})`,
      [...idsToMerge]
    );
    console.log('Clients deleted:', (delResult as any).affectedRows);

    await connection.commit();
    console.log('Migration successful.');
  } catch (err) {
    await connection.rollback();
    console.error('Migration failed:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

run();
