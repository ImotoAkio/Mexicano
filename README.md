# Sistema de Gestão Náutica - Mexicano / Grupo Villa Náutica

Este é o repositório oficial do sistema de agendamentos e gestão de embarcações desenvolvido para o Grupo Villa Náutica. O sistema oferece uma solução premium para cotistas de embarcações e um painel administrativo robusto para a gestão da marina.

## 🚀 Arquitetura e Tecnologias

O sistema é um monorepo que contém tanto o Frontend quanto o Backend integrados.

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Gráficos**: [Recharts](https://recharts.org/)
- **PWA**: Suporte a Progressive Web App via `vite-plugin-pwa`
- **Geração de PDF**: `jspdf`, `jspdf-autotable`, `html2canvas`, `html-to-image`

### Backend
- **Ambiente**: Node.js
- **Servidor Web**: Express
- **Banco de Dados**: MySQL (via `mysql2`)
- **Autenticação**: JWT (JSON Web Tokens) e Bcrypt para hash de senhas
- **Real-time**: Socket.io
- **Uploads**: Multer
- **Segurança**: Helmet, CORS, Express Rate Limit
- **Integração Google**: Google Auth Library (Sincronização com Google Calendar)
- **IA**: Integração com Google GenAI (`@google/genai`)

## 📋 Estrutura do Projeto

- `/src`: Código fonte do Frontend (Componentes React, utilitários, estilos globais).
- `/server.ts` & `/server-db.ts`: Ponto de entrada do Backend e lógica de conexão com banco de dados.
- `/public` & `/assets`: Imagens estáticas e ícones da aplicação/PWA.
- `/uploads`: Diretório de destino para uploads de arquivos locais.
- `package.json`: Definições de dependências e scripts de execução.

## 🛠️ Como rodar localmente (Desenvolvimento)

### Pré-requisitos
- Node.js (v18+)
- MySQL rodando localmente ou remotamente (ajuste as variáveis de ambiente)

### Passo a passo

1. **Clone o repositório e instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o ambiente:**
   Copie o arquivo `.env.example` para `.env` e preencha as credenciais do banco de dados e segredos da aplicação:
   ```bash
   cp .env.example .env
   ```

3. **Inicie o ambiente de desenvolvimento (Frontend + Backend juntos):**
   O comando abaixo utiliza o `tsx` para rodar o backend localmente junto com o Vite servindo o frontend:
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:5173` (ou a porta padrão informada pelo console).

## 🚢 Build e Deploy

Para ambientes de produção, o build minifica o frontend e transcompila o backend.

1. **Gere os arquivos estáticos e o bundle do servidor:**
   ```bash
   npm run build
   ```
   Isso compilará o React para a pasta `/dist` e criará o arquivo `/dist/server.cjs` com o backend.

2. **Inicie o servidor de produção:**
   ```bash
   npm run start
   ```

### Deploy via Docker (Recomendado para Produção)
O projeto conta com um `Dockerfile` e um `docker-compose.yml` otimizados.

Para iniciar via Docker:
```bash
docker-compose up -d --build
```
Isso provisionará o banco de dados e o servidor Node em containeres isolados.

## 🔐 Segurança e Boas Práticas

- **Autenticação via JWT**: As rotas sensíveis (como `/api/client/me`, `/api/admin/*`) são protegidas por middlewares que exigem tokens de autenticação. Os tokens dos clientes NUNCA são armazenados no localStorage sem criptografia ou de forma exposta; mantemos as credenciais no estado seguro do React (em memória).
- **Rate Limiting**: Previne ataques de força bruta limitando tentativas de requisição no backend.
- **Consultas Otimizadas**: Sempre usamos polling moderado (ex: sincronização em background a cada 15s) no lugar de requests frenéticos para manter o calendário sincronizado para múltiplos cotistas sem sobrecarregar o servidor.

## 🧑‍💻 Notas para Futuros Desenvolvedores
- Ao modificar o **calendário de agendamentos**, lembre-se que os cotistas podem abrir o sistema simultaneamente. Certifique-se de manter as atualizações assíncronas do calendário preservando a checagem no lado do servidor (`/api/client/reserve`) para evitar conflitos (overbooking).
- As lógicas de banco de dados estão encapsuladas, não injete queries SQL diretamente nos endpoints. Utilize os métodos auxiliares em `server-db.ts`.
- Qualquer nova dependência pesada de frontend deve ser avaliada para não impactar a performance do PWA, que preza por fluidez e design luxuoso em dispositivos móveis.
