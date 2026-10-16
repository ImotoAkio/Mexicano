import dotenv from "dotenv";
dotenv.config();

import {
  initializeDatabase,
  getUtvVeiculos,
  upsertUtvVeiculo,
  getUtvCotistas,
  upsertUtvCotista,
  getUtvUsos,
  upsertUtvUso,
  deleteUtvUso,
  getUtvControleAnual,
  calcularRateioUtv,
  deleteUtvVeiculo,
  deleteUtvCotista
} from "./server-db";

async function runUtvBackendTests() {
  console.log("=========================================");
  console.log("INICIANDO BATERIA DE TESTES DO BACKEND UTV");
  console.log("=========================================\n");

  try {
    // 1. Inicializar tabelas
    console.log("1. Verificando/Criando tabelas no MariaDB...");
    const initOk = await initializeDatabase();
    console.log("   -> Inicialização do banco:", initOk ? "SUCESSO" : "FALLBACK/ERRO");

    // 2. Teste de Veículo UTV
    console.log("\n2. Testando CRUD de Veículo UTV...");
    const testVeiculoId = `test_utv_${Date.now()}`;
    await upsertUtvVeiculo({
      id: testVeiculoId,
      nome: "UTV Teste Can-Am X3",
      modelo: "Maverick X3 2024",
      ano: 2024,
      placa_chassi: "TESTE-1234",
      kmAtual: 500.0,
      horimetroAtual: 25.0,
      status: "disponivel"
    });
    console.log("   -> Veículo inserido com ID:", testVeiculoId);

    const veiculos = await getUtvVeiculos();
    const veiculoEncontrado = veiculos.find(v => v.id === testVeiculoId);
    if (!veiculoEncontrado) {
      throw new Error("Veículo inserido não foi encontrado na listagem!");
    }
    console.log("   -> Veículo recuperado com sucesso:", veiculoEncontrado.nome, `(KM: ${veiculoEncontrado.kmAtual}, Horímetro: ${veiculoEncontrado.horimetroAtual}h)`);

    // 3. Teste de Cotista UTV (Franquia de 30 dias)
    console.log("\n3. Testando Cotista e Franquia de 30 Dias...");
    const testCotistaId = `test_cot_${Date.now()}`;
    const anoAtual = new Date().getFullYear();
    await upsertUtvCotista({
      id: testCotistaId,
      nome: "Cotista Teste Silva",
      cotaNumero: "Cota 01",
      telefone: "(11) 99999-8888",
      email: "cotista@teste.com",
      limiteDiasAnual: 30,
      anoExercicio: anoAtual,
      status: "ativo"
    });
    console.log("   -> Cotista inserido com 30 dias de limite:", testCotistaId);

    // 4. Teste de Controle Anual Inicial
    let controle = await getUtvControleAnual(anoAtual);
    let cotistaControle = controle.find(c => c.cotistaId === testCotistaId);
    console.log("   -> Saldo inicial do cotista:", cotistaControle?.saldoDisponivel, "dias (Esperado: 30)");
    if (cotistaControle?.saldoDisponivel !== 30) {
      throw new Error("Saldo inicial diferente de 30 dias!");
    }

    // 5. Teste de Reserva (Bloqueio Temporário de Saldo)
    console.log("\n4. Testando Reserva (Bloqueio Provisório de 1 Dia)...");
    const testUsoId = `test_uso_${Date.now()}`;
    const dataHoje = new Date().toISOString().split("T")[0];
    await upsertUtvUso({
      id: testUsoId,
      veiculoId: testVeiculoId,
      cotistaId: testCotistaId,
      dataUso: dataHoje,
      status: "reservado"
    });

    controle = await getUtvControleAnual(anoAtual);
    cotistaControle = controle.find(c => c.cotistaId === testCotistaId);
    console.log("   -> Após reserva: Dias Reservados:", cotistaControle?.diasReservados, "| Saldo Disponível:", cotistaControle?.saldoDisponivel);
    if (cotistaControle?.diasReservados !== 1 || cotistaControle?.saldoDisponivel !== 29) {
      throw new Error("Reserva não bloqueou provisoriamente o dia da cota!");
    }

    // 6. Teste de Saída (Checklist de Retirada)
    console.log("\n5. Testando Checklist de Retirada (Saída para Trilha)...");
    await upsertUtvUso({
      id: testUsoId,
      veiculoId: testVeiculoId,
      cotistaId: testCotistaId,
      dataUso: dataHoje,
      status: "em_uso",
      horaSaida: "08:30",
      kmInicial: 500.0,
      horimetroInicial: 25.0,
      limpezaSaida: "limpo",
      tanqueSaida: "cheio"
    });
    console.log("   -> Checklist de saída registrado. Status: em_uso");

    // 7. Teste de Devolução (Checklist de Retorno & Fechamento Realizado)
    console.log("\n6. Testando Devolução (Full-to-Full & Fechamento Realizado)...");
    await upsertUtvUso({
      id: testUsoId,
      veiculoId: testVeiculoId,
      cotistaId: testCotistaId,
      dataUso: dataHoje,
      status: "realizado",
      horaSaida: "08:30",
      kmInicial: 500.0,
      horimetroInicial: 25.0,
      horaChegada: "12:30",
      kmFinal: 580.0,            // rodou 80 km
      horimetroFinal: 27.2,       // rodou 2.2 h (2h 12min)
      limpezaChegada: "sujo",
      tanqueChegada: "cheio",
      tanqueCheioDevolvido: true,
      comprovanteAbastecimentoUrl: "https://exemplo.com/comprovante_posto.jpg",
      avarias: "Sem avarias, apenas poeira na carenagem."
    });

    controle = await getUtvControleAnual(anoAtual);
    cotistaControle = controle.find(c => c.cotistaId === testCotistaId);
    console.log("   -> Após Fechamento Realizado:");
    console.log("      * Dias Realizados:", cotistaControle?.diasRealizados, "(Esperado: 1)");
    console.log("      * Dias Reservados:", cotistaControle?.diasReservados, "(Esperado: 0)");
    console.log("      * Saldo Restante:", cotistaControle?.saldoDisponivel, "dias (Esperado: 29)");
    console.log("      * KM Acumulado:", cotistaControle?.kmTotalAcumulado, "km (Esperado: 80)");
    console.log("      * Horas Acumuladas:", cotistaControle?.horasMotorAcumuladas, "h (Esperado: 2.2)");

    if (cotistaControle?.diasRealizados !== 1 || cotistaControle?.kmTotalAcumulado !== 80 || cotistaControle?.horasMotorAcumuladas !== 2.2) {
      throw new Error("Métricas de fechamento divergiram do esperado!");
    }

    // 8. Teste da Trava Rigorosa de Integridade (utv.md: Proibido apagar uso realizado)
    console.log("\n7. Testando Trava Rigorosa de Integridade (utv.md)...");
    try {
      await deleteUtvUso(testUsoId);
      throw new Error("FALHA: O sistema permitiu apagar um uso já realizado! A regra de integridade foi violada.");
    } catch (e: any) {
      if (e.message.includes("terminantemente proibido apagar um uso já realizado")) {
        console.log("   -> SUCESSO: A tentativa de deletar o uso realizado foi BLOQUEADA com a mensagem esperada!");
      } else {
        throw e;
      }
    }

    // 9. Teste de Cálculo de Rateio de Manutenção
    console.log("\n8. Testando Cálculo de Rateio Proporcional de Manutenção...");
    const rateioHoras = await calcularRateioUtv({
      veiculoId: testVeiculoId,
      valorTotal: 1000.0,
      criterioRateio: "horas",
      ano: anoAtual
    });
    console.log("   -> Rateio calculado por Horas:");
    console.log("      * Total Geral de Horas:", rateioHoras.totalUsoGeral, "h");
    const detalheCotista = rateioHoras.detalhes.find((d: any) => d.cotistaId === testCotistaId);
    console.log("      * Cotista Teste Participação:", detalheCotista?.percentual, "% | Valor a pagar: R$", detalheCotista?.valorRateado);

    // 10. Limpeza dos dados de teste
    console.log("\n9. Limpando dados temporários de teste...");
    // Para limpar o uso de teste no banco sem violar a regra de integridade do código, alteramos para cancelado antes de deletar
    await upsertUtvUso({
      id: testUsoId,
      veiculoId: testVeiculoId,
      cotistaId: testCotistaId,
      dataUso: dataHoje,
      status: "cancelado"
    });
    await deleteUtvUso(testUsoId);
    await deleteUtvCotista(testCotistaId);
    await deleteUtvVeiculo(testVeiculoId);
    console.log("   -> Limpeza concluída.");

    console.log("\n=========================================");
    console.log("TODOS OS TESTES DO BACKEND UTV PASSARAM COM 100% DE SUCESSO!");
    console.log("=========================================\n");
    process.exit(0);

  } catch (err: any) {
    console.error("\n❌ ERRO DURANTE OS TESTES DO BACKEND UTV:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runUtvBackendTests();
