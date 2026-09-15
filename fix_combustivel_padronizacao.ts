import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Opet123!',
    database: process.env.DB_NAME || 'mexicano_db'
  });

  console.log('Connected to DB. Running migrations for Plano de Padronização de Combustíveis...');

  try {
    // 1. Unify abastecimentoLitros
    console.log('Fase 1: Unificando abastecimentoLitros...');
    const [reservasResult] = await connection.query<mysql.ResultSetHeader>(`
      UPDATE Reservas 
      SET abastecimentoLitros = litrosAbastecidos 
      WHERE (abastecimentoLitros IS NULL OR abastecimentoLitros = '' OR abastecimentoLitros = '0') 
      AND litrosAbastecidos IS NOT NULL AND litrosAbastecidos != '' AND litrosAbastecidos != '0'
    `);
    console.log(`- Reservas atualizadas (abastecimentoLitros): ${reservasResult.affectedRows}`);

    // 2. Atualizar Formas de Pagamento em CaulxasMarinaTransacoes
    console.log('\nFase 2: Padronizando Formas de Pagamento (CaixaMarinaTransacoes)...');
    
    // Debit
    let [res] = await connection.query<mysql.ResultSetHeader>(`UPDATE CaixaMarinaTransacoes SET formaPagamento = 'cartao_debito' WHERE formaPagamento = 'debit'`);
    console.log(`- Debit -> cartao_debito: ${res.affectedRows}`);
    
    // Credit
    [res] = await connection.query<mysql.ResultSetHeader>(`UPDATE CaixaMarinaTransacoes SET formaPagamento = 'cartao_credito' WHERE formaPagamento = 'credit'`);
    console.log(`- Credit -> cartao_credito: ${res.affectedRows}`);
    
    // Admin / faturado
    [res] = await connection.query<mysql.ResultSetHeader>(`UPDATE CaixaMarinaTransacoes SET formaPagamento = 'faturado' WHERE formaPagamento = 'admin'`);
    console.log(`- Admin -> faturado: ${res.affectedRows}`);

    // Pagamento em Reservas (abastecimentoFormaPagamento)
    console.log('\nFase 2.1: Padronizando Formas de Pagamento (Reservas/abastecimentoFormaPagamento)...');
    [res] = await connection.query<mysql.ResultSetHeader>(`UPDATE Reservas SET abastecimentoFormaPagamento = 'cartao_debito' WHERE abastecimentoFormaPagamento = 'debit'`);
    console.log(`- Debit -> cartao_debito (Reservas): ${res.affectedRows}`);
    
    [res] = await connection.query<mysql.ResultSetHeader>(`UPDATE Reservas SET abastecimentoFormaPagamento = 'cartao_credito' WHERE abastecimentoFormaPagamento = 'credit'`);
    console.log(`- Credit -> cartao_credito (Reservas): ${res.affectedRows}`);
    
    [res] = await connection.query<mysql.ResultSetHeader>(`UPDATE Reservas SET abastecimentoFormaPagamento = 'faturado' WHERE abastecimentoFormaPagamento = 'admin'`);
    console.log(`- Admin -> faturado (Reservas): ${res.affectedRows}`);


    // 3. Unificar Status em Reservas
    console.log('\nFase 3: Unificando Status Cobrado -> Pago em Reservas...');
    [res] = await connection.query<mysql.ResultSetHeader>(`
      UPDATE Reservas 
      SET abastecimentoStatusCobranca = 'pago' 
      WHERE abastecimentoStatusCobranca = 'cobrado'
    `);
    console.log(`- Status cobrado -> pago nas Reservas: ${res.affectedRows}`);

    console.log('\nFase 3.1: Unificando Status em CaixaMarinaTransacoes...');
    [res] = await connection.query<mysql.ResultSetHeader>(`
      UPDATE CaixaMarinaTransacoes 
      SET status = 'pago' 
      WHERE status = 'cobrado'
    `);
    console.log(`- Status cobrado -> pago em Caixa: ${res.affectedRows}`);


    // 4. Padronizar Categoria (CaixaMarinaTransacoes e TransacoesFinanceiras)
    console.log('\nFase 4: Padronizando Categorias...');
    const invalidCategories = ['receita_combustivel', 'Combustivel', 'Abastecimento Marina'];
    for (const cat of invalidCategories) {
      [res] = await connection.query<mysql.ResultSetHeader>(`UPDATE CaixaMarinaTransacoes SET categoria = 'combustivel' WHERE categoria = ?`, [cat]);
      console.log(`- CaixaMarinaTransacoes: '${cat}' -> 'combustivel': ${res.affectedRows}`);
      
      [res] = await connection.query<mysql.ResultSetHeader>(`UPDATE TransacoesFinanceiras SET categoria = 'combustivel' WHERE categoria = ?`, [cat]);
      console.log(`- TransacoesFinanceiras: '${cat}' -> 'combustivel': ${res.affectedRows}`);
    }

    console.log('\nMigração concluída com sucesso!');
  } catch (err) {
    console.error('Erro ao executar migração:', err);
  } finally {
    await connection.end();
  }
}

run();
