# Estrutura Financeira do Sistema (Marina)

A estrutura financeira da aplicação foi arquitetada para dar suporte a operações de **alto fluxo físico (Caixa/Balcão)** e **fluxo contábil/administrativo (Contas a Pagar e Receber)**, com suporte a multi-empresas, emissão automatizada de boletos/PIX no Asaas, e faturamento integrado de outros módulos (Manutenções/Ordens de Serviço e Reservas).

Abaixo detalhamos a estrutura completa.

---

## 1. Interfaces e Páginas (`src/components/finance/`)

O sistema financeiro é operado principalmente nas seguintes telas:

- **`FinanceDashboardPage.tsx` / `FinanceDashboard.tsx`:** Painel central que mostra métricas financeiras (Receber vs Pagar), taxas de inadimplência, e saldo consolidado de contas bancárias.
- **`FinanceFluxoCaixa.tsx`:** O coração da gestão contábil (O "Contas a Pagar e Receber"). Aqui são visualizadas e filtradas todas as despesas e receitas. Registra datas de vencimento, e controla os status (`lancado`, `pago`, `vencido`, `cancelado`).
- **`FinanceConfig.tsx` (Configurações Gerais):** Onde são cadastrados:
  - Empresas do grupo (Multi-empresa).
  - Contas Bancárias.
  - Fornecedores.
  - Planos de Contas (Categorias contábeis para classificação e relatórios).
- **`MarinaCaixaView.tsx` (Terminal PDV / Caixa da Marina):** Fica fora do diretório de finance, pois é focado na operação diária de quem atende balcão. Controle instantâneo de dinheiro e operações do dia (ex: venda de gelo, lanches, descidas avulsas).
- **`BoletosPage.tsx` e `FinanceWhatsAppPage.tsx`:** Páginas auxiliares focadas no faturamento em massa via *Asaas* (banco digital), permitindo gerar cobranças e disparar os links por WhatsApp para os clientes.
- **`FinanceKanban.tsx`:** Um gestor de tarefas (boards) interno, exclusivo para a equipe administrativa/financeira organizar pendências.

---

## 2. Banco de Dados: Tabelas e Lógica Contábil (`server-db.ts`)

A estrutura depende principalmente de duas tabelas diferentes, desenhadas para níveis de operações diferentes:

### A) `TransacoesFinanceiras` (O Financeiro Principal / ERP)
Representa as **Contas a Receber** e **Contas a Pagar**.
* **Como funciona:** Reúne tudo o que precisa ser "lançado" em balanço ou cobrado via boleto/Pix mestre.
* **Campos principais:**
  - `tipo`: `'receita'` ou `'despesa'`
  - `valor`, `dataVencimento`, `dataPagamento`, `status`.
  - `clienteId`, `fornecedorId` (para amarração direta à ficha das pessoas).
  - `contaBancariaId`, `planoContasId`, `empresa` (suporte a múltiplas filiais ou CNPJs).
  - `asaasPaymentId`, `asaasPaymentUrl`: Armazenam os IDs do banco e os links de pagamentos ao cliente.

### B) `CaixaMarinaTransacoes` (Operacional PDV / Turnos)
Representa **O Caixa Avulso**, ou seja, entradas automáticas de balcão e saídas em espécie (dinheiro de troco).
* **Campos principais:** `tipo` (entrada, saída, sangria), `formaPagamento`, `clienteTipo` (avulso, mensalista).
* **`CaixaMarinaFechamentos`:** Tabela adjacente responsável pelo cálculo de Aberturas e Fechamentos do dia, comparando se o que há em caixa/cartão bate com o software no final do turno.

### C) Cadastros Estruturais Secundários (De/Para)
- **`ContasBancarias`:** Nome, banco, empresa e saldo referencial.
- **`PlanosDeContas`:** A qual categoria a transação pertence (ex: Despesa de Água, Receita com Serviços de Manutenção).
- **`Fornecedores`:** Parceiros que geram Custo/Despesa.

---

## 3. Automações e Integrações: O caminho do Dinheiro

### Integração Bancária: Asaas (`server-asaas.ts` / `financeiro.routes.ts`)
1. Uma **receita** é criada no painel `FinanceFluxoCaixa` ou gerada por uma Ordem de Serviço finalizada. 
2. Na interface da aplicação, a marina dispara a geração de **Boleto/Pix**. 
3. O backend aciona o `server-asaas.ts`, registra o cliente na base do Asaas se não existir, cria uma "Cobrança" ("Charge") na operadora e grava de volta o `asaasPaymentUrl`.
4. Um **Webhook** (`webhook.routes.ts`) está à escuta da confirmação. Quando o cliente paga (meia noite ou no exato momento, como no PIX), o banco notifica a URL da Marina, que atualiza a tabela local de `TransacoesFinanceiras` (`status = 'pago'`, `dataPagamento = AGORA()`), marcando a baixa automática sem toque humano.

### Serviços, Peças e Ordem de Serviço (OS)
O módulo de manutenção opera lado a lado do financeiro:
- Em `Manutencoes` existe a trigger (um checkbox) `gerarFinanceiro`.
- Ao final de um conserto de lancha, se for "Sim", todo o `custoTotal` (soma de peças e mecânica cobrada) é injetado diretamente na tabela `TransacoesFinanceiras` como uma "Receita a Receber" nova vinculada ao cliente dono do barco.

### Módulo de Combustível (Integração Operacional)
Diferente das transações normais, o controle restrito do combustível da Marina possui um histórico e inventário em base de dados armazenáveis (json text field no banco por questão de estrutura de logging ou simplificação de versão, na tabela `Config`).
- Entradas e saídas de litros podem gerar cobranças: ao abastecer a embarcação (`reservas` / passeio finalizado), campos como `abastecimentoValorTotal`, `abastecimentoFormaPagamento` vão se materializar financeiramente de acordo com o acordo com o cotista ou tipo de pagamento (se foi em dinheiro, lança-se no *Caixa da Marina*, se for p/ faturar pro fim de mês, lança-se no *Contas a Receber* geral).

---

## 4. O Fluxo Resumido 

**O que posso gerar de Receita?**
Aluguéis mensais, passeios, revisões (manutenções e OS), consumos gerais de bebidas, e taxas de marinheiro/limpeza, bem como combustível.

**Qual a lógica da cobrança e faturamento?**
1. Fez no dia e pagou em Dinheiro/Cartão físico da maquininha? Registra-se no **Caixa da Marina** e fica nas estatísticas diárias da maquininha/gaveta de dinheiro.
2. O cliente paga "faturado mensalista", parcela lanchas/títulos de venda ou precisa de boleto e conciliação online? A conta é listada no **Fluxo de Caixa Principal**, emitido via Asaas, cliente notificado pelo módulo do WhatsApp e o sistema automatiza o pagamento via webhook 24/7.
