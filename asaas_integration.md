# Guia de Integração Asaas API v3

Este documento serve como guia completo de referência técnica para a integração do sistema com a API de serviços financeiros do **Asaas**.

---

## 1. Ambientes e URLs

O Asaas fornece dois ambientes independentes. Cada ambiente possui suas próprias chaves de API e painel de controle.

| Ambiente | Base URL | Prefixo da Chave de API | Painel de Controle |
| :--- | :--- | :--- | :--- |
| **Sandbox (Testes)** | `https://api-sandbox.asaas.com/v3` | `$aact_hmlg_...` | [sandbox.asaas.com](https://sandbox.asaas.com/) |
| **Produção** | `https://api.asaas.com/v3` | `$aact_prod_...` | [asaas.com](https://www.asaas.com/) |

> [!WARNING]
> As chaves de API são exclusivas de cada ambiente. O uso de uma chave de produção na URL de sandbox (ou vice-versa) resultará em erro `401 Unauthorized` com o código `invalid_environment`.

---

## 2. Autenticação e Cabeçalhos (Headers)

Todas as requisições enviadas à API do Asaas devem incluir os seguintes cabeçalhos HTTP:

```json
{
  "Content-Type": "application/json",
  "access_token": "SUA_API_KEY_AQUI",
  "User-Agent": "NOME_DA_SUA_APLICACAO"
}
```

> [!IMPORTANT]
> O cabeçalho `User-Agent` é obrigatório para todas as novas contas raiz criadas a partir de **13/06/2024**. Caso o framework de requisições do seu backend não envie por padrão, defina o nome ou identificador do seu sistema manualmente.

---

## 3. Cadastro de Clientes

Antes de criar qualquer cobrança, o pagador precisa estar cadastrado como cliente no Asaas. A API retornará um identificador único com o prefixo `cus_` (ex: `cus_000005219613`), que deve ser armazenado no banco de dados do seu sistema.

### Criar Cliente
* **Endpoint:** `POST /v3/customers`
* **Payload Mínimo:**
```json
{
  "name": "Marcelo Almeida",
  "cpfCnpj": "24971563792",
  "mobilePhone": "4799376637"
}
```
* **Payload Recomendado:**
```json
{
  "name": "Marcelo Almeida",
  "cpfCnpj": "24971563792",
  "email": "marcelo.almeida@gmail.com",
  "mobilePhone": "4799376637",
  "externalReference": "ID_INTERNO_DO_SEU_SISTEMA",
  "notificationDisabled": false
}
```
* **Campos Importantes:**
  * `externalReference`: Use este campo para salvar o ID do cliente no banco do seu sistema local, facilitando a conciliação.
  * `notificationDisabled`: Define se o Asaas deve enviar as notificações padrão (e-mail, SMS, WhatsApp) para o cliente. Se preferir controlar as comunicações em seu próprio sistema, defina como `true`.

> [!CAUTION]
> **O Asaas permite clientes duplicados** (mesmo nome/CPF/CNPJ). Para evitar duplicidade no lado do Asaas, valide o cliente no seu banco de dados antes de efetuar uma chamada de criação ou consulte a API através do endpoint de listagem de clientes.

---

## 4. Criação de Cobranças

As cobranças representam os títulos a receber. Elas são criadas associadas ao ID de um cliente (`customer`).

* **Endpoint Unificado:** `POST /v3/payments` (ou `POST /v3/lean/payments` para respostas resumidas)

### 4.1. Cobrança via Pix
Gera um QR Code dinâmico e a chave copia e cola.

* **Payload:**
```json
{
  "customer": "cus_000005219613",
  "billingType": "PIX",
  "value": 100.90,
  "dueDate": "2026-08-30"
}
```

* **Recuperando o QR Code e Chave Copia e Cola:**
Após obter o `id` da cobrança criada, faça uma requisição `GET`:
* **Endpoint:** `GET /v3/payments/{id}/pixQrCode`
* **Resposta:**
```json
{
  "success": true,
  "encodedImage": "iVBORw0KGgoAAAANS...", // Imagem do QR Code em Base64
  "payload": "00020101021226870014br.gov.bcb.pix...", // Chave Copia e Cola (BR Code)
  "expirationDate": "2026-08-30 23:59:59"
}
```

---

### 4.2. Cobrança via Boleto Bancário
Gera automaticamente um boleto registrado. O PDF do boleto estará disponível na propriedade `bankSlipUrl` retornada pela API.

* **Payload:**
```json
{
  "customer": "cus_000005219613",
  "billingType": "BOLETO",
  "value": 100.00,
  "dueDate": "2026-08-30"
}
```

#### Recursos Avançados para Boleto:
* **Desconto por Antecipação:**
  ```json
  "discount": {
    "value": 10.00, // 10%
    "dueDateLimitDays": 5, // Limite de 5 dias antes do vencimento
    "type": "PERCENTAGE" // Opções: PERCENTAGE ou FIXED
  }
  ```
* **Juros e Multa por Atraso:**
  ```json
  "interest": {
    "value": 1.00 // 1% de juros ao mês
  },
  "fine": {
    "value": 2.00 // 2% de multa fixa após o vencimento
  }
  ```
* **Linha Digitável / Código de Barras:**
  Para obter a linha digitável e exibir no seu sistema:
  * **Endpoint:** `GET /v3/payments/{id}/identificationField`
  * **Resposta:** Retorna `identificationField`, `nossoNumero` e `barCode`.

---

### 4.3. Cobrança via Cartão de Crédito
Há dois caminhos para processar pagamentos via cartão de crédito:

#### Opção A: Fatura Hospedada (Redirect)
Você cria a cobrança definindo o `billingType` como `CREDIT_CARD`. A API retornará o campo `invoiceUrl` (URL da fatura). Redirecione o cliente para essa URL para que ele preencha os dados do cartão de forma segura no ambiente do Asaas.

#### Opção B: Checkout Transparente (Captura Direta)
Você captura os dados do cartão no seu frontend de forma segura e envia todos os dados via backend diretamente na API de criação de cobranças. O processamento é instantâneo.

* **Payload de Criação e Captura:**
```json
{
  "customer": "cus_000005219613",
  "billingType": "CREDIT_CARD",
  "value": 100.00,
  "dueDate": "2026-07-28",
  "creditCard": {
    "holderName": "MARCELO H ALMEIDA",
    "number": "5162306219378829",
    "expiryMonth": "05",
    "expiryYear": "2028",
    "ccv": "318"
  },
  "creditCardHolderInfo": {
    "name": "Marcelo Henrique Almeida",
    "email": "marcelo.almeida@gmail.com",
    "cpfCnpj": "24971563792",
    "postalCode": "89223-005",
    "addressNumber": "277",
    "addressComplement": null,
    "phone": "4738010919",
    "mobilePhone": "47998781877"
  },
  "remoteIp": "200.150.10.50" // IP do cliente final que está realizando a compra
}
```

#### Tokenização para Compras em 1-Clique (Recorrência Manual):
Ao processar uma transação com sucesso, a API retorna a propriedade `creditCardToken`.
Você pode armazenar este token associado ao cliente no seu banco de dados. Em compras futuras, substitua os objetos `creditCard` e `creditCardHolderInfo` simplesmente enviando:
```json
{
  "customer": "cus_000005219613",
  "billingType": "CREDIT_CARD",
  "value": 50.00,
  "dueDate": "2026-08-15",
  "creditCardToken": "76496073-536f-4835-80db-c45d00f33695",
  "remoteIp": "200.150.10.50"
}
```

> [!NOTE]
> A tokenização em Sandbox já vem ativada. Em Produção, você deve solicitar a liberação da funcionalidade com seu gerente de contas Asaas.

---

## 5. Webhooks

Os webhooks são o método recomendado e mais seguro para conciliação. Em vez de fazer requisições frequentes (polling) para saber se uma cobrança foi paga, o Asaas avisa o seu servidor realizando uma chamada `POST`.

### 5.1. Ciclo de Vida de Eventos e Status (Cobranças)
Os principais eventos disparados para o webhook são:

* `PAYMENT_CREATED`: Cobrança foi criada no sistema.
* `PAYMENT_OVERDUE`: Cobrança venceu sem registro de pagamento.
* `PAYMENT_CONFIRMED`: Pagamento efetuado com sucesso (saldo aguardando prazo de liberação).
* `PAYMENT_RECEIVED`: Pagamento efetuado e o saldo está livre na conta Asaas.
* `PAYMENT_DELETED`: Cobrança foi cancelada/excluída.
* `PAYMENT_REFUNDED`: Efetivado o estorno da cobrança.
* `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`: Falha ao processar captura de cartão de crédito.

#### Fluxos de Status Comuns:
* **Pix:** `PAYMENT_CREATED` $\rightarrow$ `PAYMENT_RECEIVED`
* **Boleto:** `PAYMENT_CREATED` $\rightarrow$ `PAYMENT_CONFIRMED` $\rightarrow$ `PAYMENT_RECEIVED`
* **Cartão de Crédito:** `PAYMENT_CREATED` $\rightarrow$ `PAYMENT_CONFIRMED` $\rightarrow$ `PAYMENT_RECEIVED` (32 dias após a confirmação, referente ao prazo de repasse padrão do cartão).

---

### 5.2. Exemplo de Payload do Webhook (POST)
O Asaas enviará uma requisição no formato abaixo para a URL do seu webhook:

```json
{
  "id": "evt_05b708f961d739ea7eba7e4db318f621&368604920",
  "event": "PAYMENT_RECEIVED",
  "dateCreated": "2026-07-28 15:30:00",
  "payment": {
    "object": "payment",
    "id": "pay_080225913252",
    "customer": "cus_G7Dvo4iphUNk",
    "value": 100.00,
    "netValue": 94.51,
    "billingType": "PIX",
    "status": "RECEIVED",
    "externalReference": "ID_COMPRA_LOCAL_123"
  }
}
```

---

### 5.3. Requisitos e Boas Práticas para Webhooks

#### 1. Resposta Rápida (HTTP 2xx)
Seu endpoint **deve** processar a requisição e retornar um status HTTP `200 OK` ou `204 No Content` o mais rápido possível (recomendado menos de 2 segundos).
Se o seu processamento interno demorar ou der timeout, o Asaas interpretará como falha de entrega e reenviará a notificação.

> [!IMPORTANT]
> **Fila de Sincronização Pausada:** Se o seu servidor falhar em responder com sucesso por **15 vezes consecutivas**, a fila de webhooks será temporariamente pausada.
> * O Asaas envia um e-mail de alerta.
> * Os eventos continuam acumulados em fila por até **14 dias**. Resolva o erro e reative a fila através do painel do Asaas ou atualizando o webhook com o campo `interrupted: false`.
> * Eventos travados por mais de 14 dias serão **excluídos definitivamente**.

#### 2. Processamento Assíncrono (Recomendado)
Para evitar gargalos e timeouts no processamento de webhooks sob picos de requisições:
```text
[Webhook Asaas] ──(POST)──> [Seu Endpoint Backend]
                                     │
                                     ├─ 1. Salva evento no Banco/Fila de Mensagens
                                     ├─ 2. Retorna HTTP 200 IMEDIATAMENTE ao Asaas
                                     │
                            [Processador em Background (Worker)]
                                     │
                                     └─ 3. Processa regras de negócio (liberar plano, despachar produto)
```

#### 3. Implementar Idempotência
Como o envio dos webhooks é feito no modelo *at least once*, o mesmo evento (com o mesmo `id` no objeto raiz) pode ser enviado mais de uma vez.
**Solução:** Registre o ID do evento (`id` na raiz do JSON, ex: `evt_05b70...`) em uma tabela de eventos processados no seu banco. Antes de processar uma nova requisição, verifique se esse ID já existe e ignore-o se já tiver sido processado.

#### 4. Segurança do Endpoint
* **Validação de Token:** Configure um token de segurança (Token de Autenticação) nas configurações do seu Webhook no painel Asaas. O Asaas enviará este token no cabeçalho `asaas-access-token` em cada requisição. Seu backend deve validar se o valor recebido bate com o configurado.
* **Whitelist de IPs:** Configure o firewall da sua infraestrutura para permitir apenas requisições vindas dos [IPs oficiais do Asaas](https://docs.asaas.com/docs/ips-oficiais-do-asaas).
