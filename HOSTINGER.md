# Hostinger — Tapari Agro

Domain: **https://tapariagro.com.np** (currently returns **503** until the Node app stays running).

Build can succeed while the site still fails. Hostinger’s Next preset often runs **`next start` only**, which used to skip DB migrate/seed.

Latest `main` boots the DB via **`src/instrumentation.ts`** even when Entry file is ignored.

## hPanel settings (use these)

| Field | Value |
|--------|--------|
| Node | **20** or **22** |
| Branch | `main` |
| Build | `build` |
| Entry file | `server.mjs` (preferred) |
| Output | `.next` |

If Entry file cannot be set, Redeploy anyway — instrumentation still runs migrate/seed on `next start`.

## Environment variables

```env
NODE_ENV=production
DATA_DIR=./data
DATABASE_URL=file:./data/prod.db
NEXT_PUBLIC_SITE_URL=https://tapariagro.com.np
ADMIN_EMAIL=admin@tapariagro.com
ADMIN_PASSWORD=your-strong-password
ADMIN_SESSION_SECRET=optional-32-plus-chars
NEXT_PUBLIC_PHONE=9857620569
NEXT_PUBLIC_WHATSAPP=9779857620569
```

**Note:** Latest code rewrites `DATABASE_URL` to an **absolute** `…/data/prod.db` path. Prisma treats `file:./…` as relative to the `prisma/` folder (empty DB → “Product does not exist” / ERROR 1064561082).


## Domain

1. Hostinger → websites → your Node app → **Domains** → attach `tapariagro.com.np` (and `www` if needed)
2. DNS already points at Hostinger (`hstgr` / parking NS) — keep that
3. Set `NEXT_PUBLIC_SITE_URL=https://tapariagro.com.np` then Redeploy

## Verify after Redeploy

1. **Runtime logs** should show `[boot] Catalog has … products` or seeding  
2. Open https://tapariagro.com.np/api/health → `{"ok":true,"products":22,…}`  
3. Open `/` and `/shop`

## Still 503?

That means the Node process crashed or never started. Paste **Runtime logs** (not build logs).
