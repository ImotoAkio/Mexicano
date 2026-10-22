# ⚓ Servidor MCP Gestão Náutica (Model Context Protocol)

Servidor MCP em **TypeScript** desenvolvido com `@modelcontextprotocol/sdk` para conectar LLMs (**Gemini / Claude / OpenAI**) à base de dados do sistema em tempo real com **Segurança Militar e Estrito Modo Read-Only**.

---

## 🛡️ Pilares de Segurança & Arquitetura

1. **PROIBIDO SQL LIVRE**: Nenhuma string SQL é recebida ou gerada pela IA. Todas as consultas utilizam Tools semânticas fortemente tipadas com `Zod`.
2. **ESTRITO READ-ONLY (Defesa em Profundidade)**:
   - **Nível de Banco**: Usuário dedicado no MySQL/MariaDB com permissão exclusiva de `SELECT`.
   - **Nível de Código**: O interceptor em `src/db.ts` rejeita qualquer comando que contenha `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, etc.
3. **PROTEÇÃO DE DADOS SENSÍVEIS (DTO Sanitizado)**:
   - Senhas, hashes de autenticação, chaves de API e tokens **nunca** saem do servidor.
   - CPF e Telefone possuem mascaramento automático antes de atingir o contexto do LLM.
4. **LIMITES E PAGINAÇÃO**:
   - Todas as listagens forçam um teto máximo de **50 registros** por chamada, prevenindo estouro de janela de contexto de tokens e travamento do banco.
5. **ISOLAMENTO MULTI-EMPRESA**:
   - Suporte a filtro por entidade (`VALE`, `MEXICANO`, `Marina` ou `Todos`).

---

## 🧰 Catálogo de Tools Disponíveis (17 Tools)

### 🌟 1. Super-Tools Relacionais (Visão 360°)
| Tool | Descrição |
| :--- | :--- |
| `obter_visao_360_cliente` | Dossiê completo do cliente cruzando dados cadastrais, cotas, barcos, agendamentos recentes/futuros, lançamentos em aberto e status financeiro. |
| `obter_visao_360_embarcacao` | Ficha técnica completa do barco, cotistas com números de cotas, próximas reservas, últimas manutenções (OS) e consumo de combustível recente. |

### 👥 2. Clientes & Cotas
| Tool | Descrição |
| :--- | :--- |
| `listar_clientes` | Lista clientes com paginação (máx 50), filtros por status cadastral, status financeiro, empresa e busca textual. |
| `consultar_detalhes_cliente` | Busca detalhada de perfil por ID ou nome. |

### 🚤 3. Embarcações
| Tool | Descrição |
| :--- | :--- |
| `listar_embarcacoes` | Lista a frota com filtros por status de manutenção, tipo (lancha, jet ski), empresa e busca por nome ou vaga. |
| `consultar_cotistas_embarcacao` | Lista todos os cotistas de uma lancha específica com vagas disponíveis no plano de cotas. |

### 📅 4. Reservas & Marina
| Tool | Descrição |
| :--- | :--- |
| `listar_reservas` | Lista agendamentos de saídas com filtros por período, barco, cliente e status. |
| `consultar_saidas_do_dia` | Consulta rápida de todas as saídas e chegadas programadas para uma data específica (ou hoje). |

### 💰 5. Financeiro
| Tool | Descrição |
| :--- | :--- |
| `consultar_resumo_financeiro` | Balanço consolidado de receitas (previstas x recebidas), despesas (pagas x a pagar), inadimplência e saldo líquido no período. |
| `listar_transacoes_financeiras` | Extrato de receitas e despesas com filtros por status, categoria, cliente, barco e vencimento. |
| `consultar_inadimplentes` | Relatório ordenado dos clientes com pendências financeiras, total da dívida e títulos atrasados. |

### 🛠️ 6. Manutenção & Ordens de Serviço (OS)
| Tool | Descrição |
| :--- | :--- |
| `listar_manutencoes` | Listagem de OS com filtros por barco, mecânico responsável, status e nível de urgência. |
| `consultar_detalhes_os` | Detalhes completos da OS pelo código legível (ex: `OS-2026-001`) com peças e custos. |

### 🚙 7. UTV (Veículos Off-Road)
| Tool | Descrição |
| :--- | :--- |
| `listar_veiculos_utv` | Status da frota de UTVs, quilometragem e horímetro atual. |
| `listar_usos_utv` | Histórico e reservas de saídas de UTV por cotista ou período. |

### ⛽ 8. Combustível
| Tool | Descrição |
| :--- | :--- |
| `consultar_estoque_combustivel` | Nível atual do tanque principal, galões e alertas de nível mínimo. |
| `listar_abastecimentos` | Histórico recente de abastecimentos realizados por barco ou período. |

---

## ⚙️ Configuração do Banco (Usuário Read-Only)

No seu servidor MariaDB / MySQL (VPS), crie um usuário restrito:

```sql
CREATE USER 'mcp_readonly'@'%' IDENTIFIED BY 'sua_senha_super_segura';
GRANT SELECT ON gestao_nautica.* TO 'mcp_readonly'@'%';
FLUSH PRIVILEGES;
```

---

## 🚀 Como Rodar Localmente

1. Entre na pasta:
```bash
cd mcp-server
```

2. Instale as dependências:
```bash
npm install
```

3. Crie o arquivo `.env`:
```bash
cp .env.example .env
# Preencha suas credenciais do banco e a chave MCP_API_KEY
```

4. Inicie o servidor:
- **Modo HTTP/SSE (Padrão para Gemini / Docker)**:
  ```bash
  npm run dev
  ```
- **Modo Stdio (para testar via terminal ou Claude Desktop)**:
  ```bash
  npm run dev:stdio
  ```

---

## 🐳 Deploy no Docker Swarm / Traefik

O serviço pode ser adicionado ao seu `docker-compose.yml` da VPS:

```yaml
  mcp-server:
    image: ghcr.io/imotoakio/mexicano-mcp:latest
    environment:
      - DB_HOST=84.247.143.102
      - DB_PORT=13306
      - DB_USER=mcp_readonly
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=gestao_nautica
      - MCP_PORT=3001
      - MCP_API_KEY=${MCP_API_KEY}
    networks:
      - echonet
    deploy:
      mode: replicated
      replicas: 1
      restart_policy:
        condition: on-failure
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.mcp.rule=Host(`mcp.echo.dev.br`)"
        - "traefik.http.routers.mcp.entrypoints=websecure"
        - "traefik.http.services.mcp.loadbalancer.server.port=3001"
        - "traefik.http.routers.mcp.tls=true"
        - "traefik.http.routers.mcp.tls.certresolver=myresolver"
```

---

## 🤖 Como Conectar o Gemini ao Servidor MCP

No backend principal (utilizando `@google/genai` já instalado no seu projeto):

```typescript
import { GoogleGenAI } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// 1. Conectar ao Servidor MCP via SSE
const transport = new SSEClientTransport(
  new URL("http://mcp-server:3001/sse"),
  {
    eventSourceInit: {
      headers: {
        Authorization: `Bearer ${process.env.MCP_API_KEY}`,
      },
    },
  }
);

const mcpClient = new Client({ name: "gemini-agent", version: "1.0.0" }, { capabilities: {} });
await mcpClient.connect(transport);

// 2. Listar todas as ferramentas registradas
const toolsResult = await mcpClient.listTools();

// 3. Converter ferramentas MCP para o formato functionDeclarations do Gemini
const geminiTools = toolsResult.tools.map((t) => ({
  name: t.name,
  description: t.description,
  parameters: t.inputSchema,
}));

// 4. Executar chat com Gemini com chamada dinâmica das ferramentas
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// O Gemini decide autonomamente qual tool invocar, o backend executa mcpClient.callTool(name, args)
// e devolve o resultado para o Gemini sintetizar a resposta final!
```
