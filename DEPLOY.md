## Deploy de Produção — Minhas Vendas SaaS

Este guia resume como executar o backend em produção usando Docker e como rodar a pipeline de CI.

### 1) Variáveis de ambiente
Copie `apps/backend/.env.example` para o local onde você vai injetar variáveis (secrets do provedor, compose, etc.). Nunca versione segredos.

### 2) Rodar com Docker Compose (local/prod simples)
Requisitos: Docker 24+, Compose

```
docker compose up -d --build
```

O backend expõe `http://localhost:3333` (health: `/health`, docs: `/docs`).

Em produção, ajuste:
- `DATABASE_URL` para seu Postgres gerenciado
- `WEB_APP_URL` com os domínios do frontend
- Segredos JWT, Resend e Mercado Pago

### 3) Build da imagem (sem compose)

```
docker build -t minhas-vendas-backend:latest .
docker run --rm -p 3333:3333 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_ACCESS_SECRET=... \
  -e JWT_REFRESH_SECRET=... \
  minhas-vendas-backend:latest
```

O container executa `prisma migrate deploy` antes de iniciar a API.

### 4) CI (GitHub Actions)
Arquivo: `.github/workflows/ci.yml`
- Executa: install, lint, prisma generate, migrate deploy (com Postgres de serviço), build e tests.

### 5) Notas
- CORS: configure `WEB_APP_URL` (aceita múltiplos separados por vírgula).
- CSRF: habilite `ENABLE_CSRF=true` apenas se usar cookies/same-site.
- Swagger: atualmente acessível em `/docs`. Proteja via gateway/reverse-proxy ou desative se necessário.
