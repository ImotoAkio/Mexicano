# Estágio 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar o restante do código fonte
COPY . .

# Fazer o build do frontend e do backend
RUN npm run build

# Estágio 2: Produção (Imagem otimizada)
FROM node:22-alpine

WORKDIR /app

# Copiar apenas arquivos essenciais da etapa de build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Instalar APENAS as dependências de produção
RUN npm ci --omit=dev

# Criar a pasta de uploads caso a aplicação salve arquivos localmente
RUN mkdir -p uploads && chown -R node:node uploads

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Por questões de segurança, rodar como usuário 'node' e não root
USER node

CMD ["npm", "start"]
