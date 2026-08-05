# Tapari Agro

Custom Next.js storefront + admin backend (no WordPress).

## What you get

- **Homepage & shop** — branded storefront
- **Cart + checkout** — COD / QR / bank orders
- **Admin** (`/admin`) — products, orders, offline POS, purchases, inventory (owned/digital/hybrid), payments/credit, suppliers, analysis
- **PWA** — installable on phones

## Quick start (local)

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

- Store: http://localhost:3000
- Admin: http://localhost:3000/admin — `admin@tapariagro.com` / `changeme`

## Go live (pick one)

GitHub alone is **not** a live website. You need a Node host with a **persistent disk** (SQLite + uploads).

### A) Railway (recommended)

1. Open [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → `Aseemsubedi/Tapari-Agro`
2. Add a **Volume** mounted at `/data`
3. Set variables:

```env
DATA_DIR=/data
DATABASE_URL=file:/data/prod.db
NEXT_PUBLIC_SITE_URL=https://YOUR-app.up.railway.app
ADMIN_EMAIL=admin@tapariagro.com
ADMIN_PASSWORD=use-a-strong-password
ADMIN_SESSION_SECRET=long-random-string-at-least-16-chars
NEXT_PUBLIC_PHONE=9857620569
NEXT_PUBLIC_WHATSAPP=9779857620569
```

4. Generate a public domain in Railway → Settings → Networking
5. First boot runs migrate + seed automatically (`npm start`)

### B) Hostinger Deploy Web App

1. Hostinger → **Add website → Deploy Web App** → connect this GitHub repo
2. **Build:** `npm ci && npm run build`
3. **Start:** `npm run start`
4. Add the same env vars as above (you can omit `DATA_DIR`; app uses `./data` which persists on Hostinger Node)
5. Point your domain at the app

### C) Render

Use the included `render.yaml` blueprint, set secrets, attach the `/data` disk.

## Environment

See `.env.example`. Never commit `.env`.

## Project map

```
src/app/(store)/     # public store
src/app/admin/       # admin ops
src/lib/             # domain rules
prisma/              # schema + baseline migration + seed
scripts/production-start.mjs  # migrate → seed-if-empty → next start
```

Schema history: see [prisma/BASELINE.md](prisma/BASELINE.md).
