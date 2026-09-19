# Contexto do Projeto e Objetivo
Você é um desenvolvedor Sênior Full-Stack especializado em React (Frontend) e Node.js/TypeScript (Backend). 
Seu objetivo é desenvolver o novo **Módulo Financeiro Web** para um grupo empresarial náutico composto por 3 empresas (Mexicano Cotas Náuticas, Vale Administradora e Marina Velho Chico). 

Este sistema substituirá um software desktop legado (Gemp VisualTec). A nova arquitetura exige uma interface web moderna, fluida e automatizada, eliminando o excesso de modais do sistema antigo e unificando o controle financeiro em uma visão consolidada (Multi-Tenant), mas mantendo a segregação de dados quando necessário.

# Arquitetura de Dados (Referência)
- `TransacoesFinanceiras`: Tabela central do ERP (Contas a Pagar e Receber). Campos: tipo (receita/despesa), valor, dataVencimento, dataPagamento, status, clienteId, fornecedorId, contaBancariaId, planoContasId, empresa, asaasPaymentId, asaasPaymentUrl.
- `CaixaMarinaTransacoes` e `CaixaMarinaFechamentos`: Tabelas do fluxo operacional de balcão (PDV da Marina).
- Integração Bancária: O backend possui serviços prontos para comunicação com Asaas (`server-asaas.ts`) e Webhooks para baixa automática de pagamentos (PIX/Boleto).

# Diretrizes de UI/UX (Obrigatório)
1. Não utilize janelas modais sobrepostas (Windows-style). Prefira **Drawers (Sidebars laterais)** para filtros complexos e **Slide-overs/Dialogs** centralizados para formulários.
2. Utilize tabelas de dados (Data Grids) ricas, com ações centralizadas em menus dropdown (três pontos `...`) no final de cada linha.
3. O topo da aplicação deve conter um **Seletor Global de Empresas** (Todas, Mexicano, Vale, Marina) que, ao ser alterado, recalcula automaticamente os dados da página atual.

# Escopo das Páginas a serem Desenvolvidas

Atue passo a passo. Vou solicitar a criação de uma página por vez. Aqui está o escopo geral de como elas devem funcionar:

## 1. FinanceDashboard.tsx (Dashboard Consolidado)
- **KPIs Superiores:** Saldo consolidado (somando contas da `ContasBancarias`), Total de Inadimplência, A Receber (Mês), A Pagar (Mês).
- **Gráficos:** Projeção de fluxo de caixa (Entradas vs Saídas para 15/30 dias).
- **Mini-DRE:** Uma tabela/lista agrupando o volume financeiro pelo `planoContasId`, permitindo expandir a categoria para ver detalhes.

## 2. FinanceFluxoCaixa.tsx (Central de Contas a Pagar e Receber)
- **Data Grid Principal:** Uma tabela listando as transações com abas no topo: `[ Todos ] [ A Receber ] [ A Pagar ] [ Atrasadas ] [ Pagos ]`.
- **Filtros (Drawer Lateral):** Emissão/Vencimento, Cliente/Fornecedor, Empresa, Conta e Plano de Contas.
- **Row Actions:** Menu na linha com "Dar Baixa Manual", "Gerar Link de Pagamento (Asaas)", "Enviar WhatsApp" e "Editar".
- **Identificadores Visuais:** Badges coloridos indicando o status (ex: Pago Auto, Pendente, Vencido).

## 3. Modal Inteligente de Lançamento (Novo Título)
- Um formulário acessado pelo `FinanceFluxoCaixa`.
- **Progressive Disclosure:** Exibe campos básicos primeiro (Tipo, Valor, Vencimento, Categoria).
- **Gerador de Parcelas (Split):** Deve conter um toggle "Repetir/Parcelar". Se ativado, abre campos de (Número de parcelas e periodicidade) e o React deve **pré-renderizar** as linhas de vencimento na tela para conferência antes de submeter o POST.

## 4. BoletosPage.tsx / FinanceWhatsAppPage.tsx (Faturamento em Massa)
- Lista de clientes com pendências (mensalidades, taxa de marinheiro, OS finalizadas).
- **Bulk Actions:** Checkboxes para selecionar múltiplos clientes e um botão "Gerar Cobranças e Notificar".
- Deve acionar a rotina que gera o boleto/PIX e enfileira o envio da mensagem via WhatsApp, exibindo uma barra de progresso ou status (Enviado, Erro).

## 5. MarinaCaixaView.tsx (PDV / Frente de Caixa)
- Interface de terminal de vendas focada na operação de balcão.
- Controle de turno: Botões para Abrir Caixa e Fechar Caixa (conciliação).
- Grid de botões rápidos para vendas avulsas (Gelo, Bebidas, Limpeza).
- Funções de Sangria/Suprimento de gaveta.
- Opção "Pendurar": Registrar o consumo vinculando a um cliente para faturamento posterior.

## 6. FinanceConfig.tsx (Cadastros)
- Telas de CRUD simples, organizadas em abas, para: Planos de Contas, Contas Bancárias (com campos para chaves de API), Fornecedores e Parâmetros de Juros/Multa.

# Instruções de Execução
Compreendeu o contexto, a arquitetura e as diretrizes visuais? Se sim, responda apenas com "Contexto assimilado. Por qual componente ou página devemos começar?". Não gere nenhum código até eu especificar a primeira página.