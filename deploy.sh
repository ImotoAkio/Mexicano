#!/bin/bash
set -e

echo "=========================================="
echo "🚀 Iniciando Deploy - Mexicano App"
echo "=========================================="

# Define diretório do script
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "📂 Diretório: $APP_DIR"

# 1. Atualiza os arquivos do repositório Git se estiver presente
if [ -d ".git" ]; then
    echo "📥 Atualizando arquivos locais do repositório via Git..."
    git pull origin main || echo "⚠️ Aviso: git pull falhou ou sem alterações, continuando deploy..."
fi

# 2. Pull explicitly to ensure latest image
echo "📥 Forçando o download da nova imagem do GitHub Container Registry (Imagem Pública)..."
docker pull ghcr.io/imotoakio/mexicano:latest

# 3. Identifica o serviço ativo no Swarm
SERVICE_NAME=$(docker service ls --filter "name=mexicano" --format "{{.Name}}" | head -n 1)

if [ -z "$SERVICE_NAME" ]; then
    echo "⚠️ Serviço Swarm não encontrado."
    echo "📦 Subindo a Stack inteira com docker stack deploy..."
    docker stack deploy -c docker-compose.yml mexicano-app
    SERVICE_NAME="mexicano-app_app-mexicano"
else
    echo "🔄 Forçando atualização do serviço '$SERVICE_NAME' para a imagem ghcr.io/imotoakio/mexicano:latest..."
    docker service update --force --image ghcr.io/imotoakio/mexicano:latest "$SERVICE_NAME"
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
