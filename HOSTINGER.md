# Hostinger — Tapari Agro (reworked)

Use **Node.js Web App** (not static / not PHP hosting).

## Exact hPanel settings

| Field | Value |
|--------|--------|
| Framework / app type | **Next.js** (`next`) or **Other** |
| Node.js | **20** or **22** |
| Branch | `main` |
| Install | `npm ci` (or leave default) |
| Build script | `build` → runs `npm run build` |
| **Entry file** | `server.mjs` |
| Output directory | `.next` |
| Start command | leave blank **or** `npm start` |

`server.mjs` migrates SQLite, seeds if empty, then runs Next on Hostinger’s `PORT`.

## Environment variables

Hostinger → app → **Environment variables**:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `DATA_DIR` | `./data` |
| `DATABASE_URL` | `file:./data/prod.db` |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR-DOMAIN` (Hostinger URL or tapariagro.com) |
| `ADMIN_EMAIL` | `admin@tapariagro.com` |
| `ADMIN_PASSWORD` | strong password |
| `ADMIN_SESSION_SECRET` | 32+ random characters (optional — auto-created in `./data` if missing) |
| `NEXT_PUBLIC_PHONE` | `9857620569` |
| `NEXT_PUBLIC_WHATSAPP` | `9779857620569` |

## Redeploy

1. Save settings  
2. **Deploy** / **Redeploy** from GitHub `main`  
3. Open **Runtime logs** — look for:

```
[start] DATABASE_URL=file:…/data/prod.db
All migrations have been successfully applied
[start] Catalog has … products
✓ Ready
```

4. Open `/` and `/shop`  
5. Admin: `/admin`

## If it still fails

| Log / symptom | Fix |
|---------------|-----|
| 502 / not responding | Entry file must be `server.mjs` (not empty `next start` only) |
| `Cannot find module 'prisma'` | Redeploy latest `main` |
| Build failed | Node 20+, check build logs for TypeScript/Prisma errors |
| Blank / couldn't load | Runtime logs — usually DB migrate; wipe `./data` only if schema is corrupt, then redeploy |
| Domain not connected | Attach domain in Hostinger → Domains, set `NEXT_PUBLIC_SITE_URL` |

## Repo

https://github.com/Aseemsubedi/Tapari-Agro · branch `main`
