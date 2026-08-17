#!/bin/bash
set -e

echo "=========================================="
echo "🚀 Iniciando Deploy - Mexicano App"
echo "=========================================="

# Token de acesso do GitHub (GHCR)
GITHUB_TOKEN="${GH_TOKEN:-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}"
GITHUB_USER="ImotoAkio"

# Define diretório do script
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "📂 Diretório: $APP_DIR"

# 1. Autenticação no GitHub Container Registry (GHCR)
echo "🔑 Efetuando login no GHCR (ghcr.io)..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin

# 2. Atualiza os arquivos do repositório Git se estiver presente
if [ -d ".git" ]; then
    echo "📥 Atualizando arquivos locais do repositório via Git..."
    git pull origin main || echo "⚠️ Aviso: git pull falhou ou sem alterações, continuando deploy..."
fi

# 3. Identifica o serviço ativo no Swarm
SERVICE_NAME=$(docker service ls --filter "name=mexicano" --format "{{.Name}}" | head -n 1)

if [ -z "$SERVICE_NAME" ]; then
    echo "⚠️ Serviço Swarm não encontrado."
    echo "📦 Subindo a Stack inteira com docker stack deploy..."
    docker stack deploy --with-registry-auth -c docker-compose.yml mexicano-app
    SERVICE_NAME="mexicano-app_app-mexicano"
else
    echo "🔄 Forçando atualização do serviço '$SERVICE_NAME' para a imagem ghcr.io/imotoakio/mexicano:latest..."
    docker service update --force --with-registry-auth --image ghcr.io/imotoakio/mexicano:latest "$SERVICE_NAME"
fi

# 4. Verificação de Saúde e Status da Atualização
echo "------------------------------------------"
echo "⏳ Aguardando a reinicialização dos containers (10 segundos)..."
sleep 10

echo "📋 Status das instâncias do serviço:"
docker service ps "$SERVICE_NAME" --no-trunc | head -n 5

echo "------------------------------------------"
echo "🔍 Últimas linhas de log da aplicação:"
docker service logs --tail 20 "$SERVICE_NAME"

echo "=========================================="
echo "✅ Processo de Deploy Finalizado com Sucesso!"
echo "=========================================="
