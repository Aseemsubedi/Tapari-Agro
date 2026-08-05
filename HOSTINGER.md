# Hostinger Deploy Web App — Tapari Agro

If the site shows a blank page, 502, or “couldn't load”, the Node app usually **built** but **crashed on start**. Fix settings below, then **Redeploy**.

## Correct hPanel settings

| Field | Value |
|--------|--------|
| Application type | **Other** (or Node) — not static |
| Node.js version | **20** or **22** |
| Branch | `main` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Entry / startup file | leave **empty** (we use `npm start`) |
| Output directory | `.next` (if asked) |

Do **not** use Hostinger’s default `next start` alone — we need `npm start` so migrate + seed run.

## Environment variables (required)

Add these in Hostinger → your app → **Environment variables**:

```env
NODE_ENV=production
DATA_DIR=./data
DATABASE_URL=file:./data/prod.db
NEXT_PUBLIC_SITE_URL=https://YOUR-HOSTINGER-URL
ADMIN_EMAIL=admin@tapariagro.com
ADMIN_PASSWORD=pick-a-strong-password
ADMIN_SESSION_SECRET=paste-a-long-random-string-at-least-16-chars
NEXT_PUBLIC_PHONE=9857620569
NEXT_PUBLIC_WHATSAPP=9779857620569
```

Replace `YOUR-HOSTINGER-URL` with the real domain Hostinger gave you (e.g. `https://something.hostingersite.com` or `https://tapariagro.com`).

## After deploy

1. Open **Runtime logs** in hPanel — you should see:
   - `[start] DATABASE_URL=file:…/data/prod.db`
   - `All migrations have been successfully applied`
   - `Catalog … products` or `running seed`
   - `Ready` from Next.js
2. Visit `/` and `/shop`
3. Admin: `/admin` with the email/password you set

## Common failures

| Symptom | Fix |
|---------|-----|
| Build OK, site 502 / not responding | Start command must be `npm start`; check Runtime logs |
| `Cannot find module prisma` / migrate fails | Redeploy latest `main` (prisma is now a production dependency) |
| `essential does not exist` | Redeploy latest `main` (baseline migration fixed) |
| Admin login broken | Set `ADMIN_SESSION_SECRET` ≥ 16 characters |
| Wrong database wiped each deploy | Keep `DATA_DIR=./data` (persists on Hostinger app disk) |

## Redeploy from GitHub

Repo: https://github.com/Aseemsubedi/Tapari-Agro  
Branch: `main` — push triggers redeploy if GitHub is connected.
