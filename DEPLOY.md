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

### Passo 3: Fazer login no GitHub Packages (Caso necessário ou credenciais expirem)
Para baixar a imagem privada do GitHub Container Registry (`ghcr.io`), faça o login no Docker da VPS utilizando um Personal Access Token (PAT) do GitHub:
```bash
echo "SEU_GITHUB_TOKEN" | docker login ghcr.io -u ImotoAkio --password-stdin
```
*(Nota: O login precisa ser feito apenas na primeira vez ou quando o token expirar, pois o Docker salva as credenciais no servidor).*

### Passo 4: Atualizar o serviço do Swarm
Execute a atualização da imagem do serviço no Swarm:
```bash
docker service update --image ghcr.io/imotoakio/mexicano:latest mexicano_app-mexicano
```

*(Caso queira verificar a lista de serviços ativos na VPS, utilize `docker service ls`).*

*Se a stack ainda não tiver sido criada ou se houver mudanças nos arquivos `docker-compose.yml` ou `.env`, faça o deploy da Stack inteira:*
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
