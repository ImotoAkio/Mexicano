# Sistema de Gestão Náutica - Mexicano / Grupo Villa Náutica

Este é um sistema premium de agendamentos e gestão de embarcações desenvolvido para o Grupo Villa Náutica. Ele inclui um portal para clientes e um painel administrativo seguro com integração ao Google Calendar.

## Tecnologias Utilizadas
- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, Banco de dados local/remoto
- **Infraestrutura**: Docker, GitHub Actions para CI/CD (GitHub Container Registry)

## Funcionalidades Principais
- Landing Page Luxuosa e Institucional
- Portal do Cliente e Portal Administrativo (LGPD Compliant)
- Agendamento e Controle de Uso de Embarcações
- Sincronização Bidirecional com Google Calendar
- Geração de Relatórios e Logs de Auditoria

## Como rodar localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente (se necessário, de acordo com o arquivo base).

3. Inicie o ambiente de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse o sistema através da porta 3000 (ou a porta em que a aplicação iniciar).

## Deploy via Docker

O deploy é automatizado via GitHub Actions. Sempre que for feito um push na branch `main`, uma nova imagem Docker é construída e publicada no GitHub Container Registry (`ghcr.io`).

Para iniciar a versão de produção localmente utilizando Docker Compose:
```bash
docker-compose up -d --build
```
