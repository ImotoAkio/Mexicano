const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'server-data', 'clientDB.json');

try {
  if (!fs.existsSync(DB_PATH)) {
    console.error('Banco de dados não encontrado em:', DB_PATH);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DB_PATH, 'utf-8');
  let data = JSON.parse(rawData);

  let updatedReservas = 0;
  let updatedCaixa = 0;
  let updatedFinanceiro = 0;

  // 1. Padronizar Reservas
  if (data.reservations) {
    data.reservations = data.reservations.map(res => {
      let modified = false;

      // 1.a Unificar litrosAbastecidos -> abastecimentoLitros
      if (res.litrosAbastecidos && Number(res.litrosAbastecidos) > 0) {
        if (!res.abastecimentoLitros || Number(res.abastecimentoLitros) === 0) {
          res.abastecimentoLitros = res.litrosAbastecidos;
          modified = true;
        }
      }

      // 1.b Atualizar status "cobrado" para "pago"
      if (res.abastecimentoStatusCobranca === 'cobrado') {
        res.abastecimentoStatusCobranca = 'pago';
        modified = true;
      }

      // 1.c Atualizar forma de pagamento
      if (res.abastecimentoFormaPagamento) {
        if (res.abastecimentoFormaPagamento === 'debit') {
          res.abastecimentoFormaPagamento = 'cartao_debito';
          modified = true;
        } else if (res.abastecimentoFormaPagamento === 'credit') {
          res.abastecimentoFormaPagamento = 'cartao_credito';
          modified = true;
        } else if (res.abastecimentoFormaPagamento === 'admin') {
          res.abastecimentoFormaPagamento = 'faturado';
          modified = true;
        }
      }

      if (modified) updatedReservas++;
      return res;
    });
  }

  // 2. Padronizar CaixaMarinaTransacoes
  if (data.marina_caixa_transacoes) {
    data.marina_caixa_transacoes = data.marina_caixa_transacoes.map(t => {
      let modified = false;

      if (t.formaPagamento) {
        if (t.formaPagamento === 'debit') {
          t.formaPagamento = 'cartao_debito';
          modified = true;
        } else if (t.formaPagamento === 'credit') {
          t.formaPagamento = 'cartao_credito';
          modified = true;
        } else if (t.formaPagamento === 'admin') {
          t.formaPagamento = 'faturado';
          modified = true;
        }
      }

      if (['receita_combustivel', 'Combustivel', 'Abastecimento Marina', 'combustivel_receita'].includes(t.categoria)) {
         t.categoria = 'combustivel';
         modified = true;
      }

      // If the ID implies fuel and category is misleading
      if (t.id && (t.id.includes('trans_fuel_') || t.id.includes('cx_fuel_') || t.id.includes('tf_fuel_'))) {
         if (t.categoria !== 'combustivel') {
             t.categoria = 'combustivel';
             modified = true;
         }
      }

      if (modified) updatedCaixa++;
      return t;
    });
  }

  // 3. Padronizar TransacoesFinanceiras
  if (data.transacoes) {
    data.transacoes = data.transacoes.map(t => {
      let modified = false;

      if (t.metodoPagamento) {
        if (t.metodoPagamento === 'debit') {
          t.metodoPagamento = 'cartao_debito';
          modified = true;
        } else if (t.metodoPagamento === 'credit') {
          t.metodoPagamento = 'cartao_credito';
          modified = true;
        } else if (t.metodoPagamento === 'admin') {
          t.metodoPagamento = 'faturado';
          modified = true;
        }
      }

      if (['receita_combustivel', 'Combustivel', 'Abastecimento Marina', 'combustivel_receita'].includes(t.categoria) ||
         t.categoria === 'receita') { // some generics could be fuel if id matches
          // Only update if it is clearly fuel
          if (['receita_combustivel', 'Combustivel', 'Abastecimento Marina', 'combustivel_receita'].includes(t.categoria)) {
              t.categoria = 'combustivel';
              modified = true;
          } else if (t.id && (t.id.includes('trans_fuel_') || t.id.includes('tf_fuel_') || t.id.includes('trans_standalone_fuel_'))) {
              t.categoria = 'combustivel';
              modified = true;
          }
      }

      // status 'cobrado' to 'pago' ? Wait, TransacoesFinanceiras uses pago/lancado. So it's fine.

      if (modified) updatedFinanceiro++;
      return t;
    });
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Sucesso! Atualizados:`);
  console.log(`- ${updatedReservas} reservas`);
  console.log(`- ${updatedCaixa} transações de caixa marina`);
  console.log(`- ${updatedFinanceiro} transações financeiras`);

} catch (error) {
  console.error('Erro ao executar a padronização:', error);
}