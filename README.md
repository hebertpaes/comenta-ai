# Comenta.AI

Plataforma SaaS de moderação de comentários com Inteligência Artificial, powered by Claude AI (Anthropic).

## Stack

- **Frontend/Backend**: Next.js 14 (App Router, Edge Runtime)
- **Database**: Cloudflare D1 (SQLite)
- **AI**: Claude Haiku (Anthropic) — moderação em tempo real
- **Auth**: JWT via `jose` + PBKDF2 password hashing
- **Deploy**: Cloudflare Pages

## Setup local

```bash
npm install

# Copie o .env
cp .env.example .env.local
# Preencha ANTHROPIC_API_KEY e JWT_SECRET

# Crie o banco D1
npm run db:create
# Copie o database_id retornado e atualize wrangler.toml

# Execute as migrations localmente
npm run db:migrate:local

# Inicie o servidor de desenvolvimento (via wrangler)
npm run dev
```

## Deploy para produção (Cloudflare Pages)

```bash
# Configure os secrets
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put JWT_SECRET

# Execute as migrations em produção
npm run db:migrate

# Build e deploy
npm run deploy
```

## Integração no seu site

Após criar um site no dashboard, copie o snippet:

```html
<div id="comenta-ai"></div>
<script
  src="https://seu-dominio.pages.dev/widget.js"
  data-site-id="SEU_SITE_ID"
  data-api-key="SUA_API_KEY">
</script>
```

## API REST

```
POST /api/widget/:siteId/comments   # Submeter comentário (público)
GET  /api/widget/:siteId/comments   # Listar comentários aprovados (público)

GET  /api/sites                     # Listar sites (autenticado)
POST /api/sites                     # Criar site (autenticado)
DELETE /api/sites/:id               # Deletar site (autenticado)

GET  /api/comments                  # Listar comentários (autenticado)
PATCH /api/comments/:id             # Atualizar status (autenticado)

GET  /api/me                        # Perfil do usuário (autenticado)
POST /api/me/api-key                # Regenerar API key (autenticado)
```
