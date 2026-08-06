# Guia de Deploy - Mexicano

Este documento detalha o processo correto de deploy e atualização da aplicação **Mexicano** na VPS para que agentes de IA e desenvolvedores possam realizar atualizações futuras sem quebrar a infraestrutura existente.

---

## 1. Arquitetura da Infraestrutura
- **Servidor (VPS)**: `84.247.143.102` (Acesso via SSH como `root`).
- **Orquestração**: **Docker Swarm** (a aplicação roda como um serviço gerenciado do Swarm).
- **Roteamento e SSL**: **Traefik** (integrado na rede Swarm overlay chamada `echonet`).
- **Registro de Imagem**: **GitHub Container Registry (GHCR)** (`ghcr.io/imotoakio/mexicano:latest`).

---

## 2. Fluxo de Publicação (CI/CD)
O repositório está configurado com um fluxo automatizado do GitHub Actions (`.github/workflows/docker-publish.yml`):
1. Qualquer push feito na branch `main` dispara o workflow.
2. O GitHub Actions faz o build da imagem Docker e publica em `ghcr.io/imotoakio/mexicano:latest`.

**Nota**: Sempre faça o push das alterações locais para a branch `main` e aguarde o build do GitHub Actions terminar antes de rodar os comandos de atualização na VPS.

---

## 3. Passo a Passo para Atualização na VPS

### Passo 1: Conectar na VPS via SSH
```bash
ssh root@84.247.143.102
```

### Passo 2: Acessar a pasta do app
```bash
cd ~/mexicano-app
```

### Passo 3: Fazer login no GitHub Packages (Caso as credenciais expirem)
Insira o Token do GitHub (`PAT`) correspondente:
```bash
echo "SEU_GITHUB_TOKEN" | docker login ghcr.io -u ImotoAkio --password-stdin
```

### Passo 4: Atualizar o serviço do Swarm
**NÃO** utilize `docker compose up -d`. O serviço é gerenciado pelo Swarm, portanto execute:
```bash
# Atualiza o container do serviço com a imagem mais recente
docker service update --image ghcr.io/imotoakio/mexicano:latest mexicano-app_app-mexicano
```

*Se houver mudanças estruturais nos arquivos `docker-compose.yml` ou `.env`, faça o deploy da Stack inteira:*
```bash
docker stack deploy -c docker-compose.yml mexicano-app
```

---

## 4. Comandos de Verificação

Para verificar se a atualização ocorreu com sucesso:

```bash
# 1. Listar os containers rodando do serviço e histórico de versões
docker service ps mexicano-app_app-mexicano

# 2. Verificar os logs em tempo real para checar se o Node.js iniciou normalmente
docker service logs -f mexicano-app_app-mexicano
```
