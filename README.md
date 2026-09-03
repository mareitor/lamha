# Lamha

Demo generator for prospect outreach. One shared app, one isolated demo instance per prospect, addressable at `demo.marvelandjuicy.com/[random-id]`. See `/root/.claude/plans/eager-knitting-milner.md` in the build session for the full architecture writeup (data model, API surface, theming, etc.) — this file is just the practical "how to stand it up" reference.

## Structure

- `frontend/` — Vite + React SPA. Deploys to Netlify.
- `worker/` — Cloudflare Worker (Hono) + KV + R2. Deploys to Cloudflare.

Two independent deploy targets, two independent configs — no shared build step between them by design.

## First-time setup

### 1. Cloudflare (backend)

```
cd worker
npm install
npx wrangler kv namespace create LAMHA_KV
# copy the returned "id" into wrangler.toml's [[kv_namespaces]] block
npx wrangler r2 bucket create lamha-logos
npx wrangler secret put ADMIN_PASSWORD
# paste the shared admin password when prompted
npx wrangler deploy
```

Note the deployed Worker URL (`https://lamha-worker.<subdomain>.workers.dev` or your custom domain once configured).

### 2. Netlify (frontend)

```
cd frontend
npm install
cp .env.example .env.local
# edit .env.local: VITE_API_BASE_URL = the Worker URL from step 1
npm run build   # sanity check locally before deploying
```

Connect the repo to Netlify (or `netlify deploy` via CLI), and set `VITE_API_BASE_URL` as a Netlify environment variable (Site settings → Environment variables) so production builds point at the right Worker.

### 3. Custom domain

Point `demo.marvelandjuicy.com` at the Netlify site (Netlify custom domain + Cloudflare DNS CNAME, same pattern as `saudi-demo.bookastreetartist.com`). The Worker can stay on its `workers.dev` URL or get its own subdomain (e.g. `api.demo.marvelandjuicy.com`) — either works, just keep `VITE_API_BASE_URL` in sync.

## Day-to-day use

Admin console lives at `/admin` (password-gated). "+ New Demo" → upload a logo, type a company name, hit Generate → get a shareable `/[id]` link for that prospect. Everything else (onboarding, programming, invoices, mode) happens per-demo from there.

## Updating the fictitious artist roster

Edit `frontend/src/data/artistRoster.json` directly and redeploy the frontend — it's static, shared across all demos, not editable from the admin UI in v1 (see plan doc's open items).
