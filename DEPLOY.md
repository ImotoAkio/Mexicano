# Guia de Deploy - Mexicano

Este documento detalha a arquitetura e o procedimento de deploy e atualização da aplicação **Mexicano** na VPS.

---

## 1. Arquitetura da Infraestrutura
- **Servidor (VPS)**: `84.247.143.102` (Acesso via SSH como `root`).
- **Orquestração**: **Docker Swarm** (a aplicação roda como serviço gerenciado pelo Swarm).
- **Roteamento e SSL**: **Traefik** (integrado na rede Swarm overlay chamada `echonet`).
- **Registro de Imagem**: **GitHub Container Registry (GHCR)** (`ghcr.io/imotoakio/mexicano:latest`). O repositório de pacotes agora é **público**, então o servidor não precisa mais de um token de acesso gravado.

---

## 2. Fluxo de Publicação (CI/CD)
1. Qualquer push feito na branch `main` dispara o workflow do GitHub Actions (`.github/workflows/docker-publish.yml`).
2. O GitHub Actions utiliza o token provido automaticamente (`GITHUB_TOKEN`) para gerar o build da nova imagem Docker e publicar na URL: `ghcr.io/imotoakio/mexicano:latest`.
3. Assim que o build no GitHub Actions finalizar com sucesso, você executa o deploy na VPS.

---

## 3. Deploy Automatizado na VPS (Via Script `deploy.sh`)

O script [`deploy.sh`](deploy.sh) foi simplificado e agora realiza o processo diretamente (sem necessidade de login manual):
1. Puxa as atualizações de arquivos do repositório (`git pull`).
2. Força o download da nova imagem do GHCR (`docker pull`), já que agora a imagem é pública.
3. Força a atualização da imagem no serviço do Docker Swarm (`docker service update --force`).
4. Aguarda e valida o status dos containers (`Running`) e exibe os logs mais recentes da aplicação para garantir o funcionamento correto.

### Comando Único (Execução na VPS):
```bash
ssh root@84.247.143.102 "cd ~/mexicano-app && bash deploy.sh"
```

### Ou acessando a VPS manualmente:
```bash
ssh root@84.247.143.102
cd ~/mexicano-app
bash deploy.sh
```

---

## 4. Comandos de Verificação e Logs

Caso precise monitorar os logs em tempo real na VPS:

```bash
# Acompanhar logs em tempo real
docker service logs -f mexicano-app_app-mexicano

# Verificar réplicas e instâncias ativas no Swarm
docker service ps mexicano-app_app-mexicano
```
