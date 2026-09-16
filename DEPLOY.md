# Deploy - Mexicano App

## Nova Arquitetura de Deploy (Docker Swarm + Github Container Registry)

Para aumentar a segurança e evitar manter Tokens de Acesso Pessoal (PAT) do GitHub gravados no servidor de produção, mudamos o fluxo de CI/CD da aplicação para utilizar o GitHub Container Registry (GHCR) e o Docker Swarm.

### 1. Publicando Alterações (Desenvolvimento)

Sempre que concluir modificações no código, você não precisará mais realizar o deploy manual pelo servidor (VPS). Em vez disso, basta submeter seu código na branch `main`:

```bash
git add .
git commit -m "feat: descrição da sua atualização"
# Use o token associado ao GitHub (ex: ghp_xxxxxxxx) para empurrar.
git push https://<SEU_TOKEN>@github.com/ImotoAkio/mexicano.git main
```

### 2. Ação Automática pelo GitHub (CI/CD)

Ao realizar o `push` para a `main`, o GitHub Actions intercepta a ação através do workflow configurado (e.g., `.github/workflows/docker-publish.yml`).

1. Ele fará o build da sua aplicação web/API.
2. Ele construirá localmente na infraestrutura do GitHub a imagem Docker do seu projeto.
3. Ele fará o upload e a publicará automaticamente (push) no GHCR da sua conta sob uma tag como `ghcr.io/imotoakio/mexicano:latest`.

### 3. Executando a Atualização no Servidor (Produção)

1. Faça acesso SSH no servidor na Contabo/VPS.
2. Não será mais necessário rodar clones no próprio servidor ou guardar credenciais GitHub.
3. Atualize o seu serviço do Docker Swarm utilizando a nova imagem já construída no registry. Em seu diretório principal (`~/mexicano-app` ou onde está hospedado o `docker-compose.yml`), você fará um Rolling Update:

```bash
# Isso instrui o Docker Swarm a baixar a versão ':latest' do GHCR e recriar o container sem causar downtime.
docker service update --force --image ghcr.io/imotoakio/mexicano:latest mexicano_app-mexicano
```

### 4. Vantagens do Novo Modelo
* O código fonte não precisa mais residir no servidor remoto.
* O build `npm run build` custoso de CPU ocorre na infraestrutura do GitHub Actions e não impacta os recursos do VPS (evitando travamentos).
* Nenhuma senha do GitHub ou Token reside no servidor (Segurança). A imagem será pública no escopo do seu repositório de pacotes (GHCR), ou você pode gerar um token de leitura estrita (`read:packages`) para configurar o `docker login` no servidor contabo se mantiver a imagem como particular.

