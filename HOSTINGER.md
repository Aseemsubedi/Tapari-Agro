# Hostinger — Tapari Agro

Build can succeed while the site still fails. Hostinger’s Next preset often runs **`next start` only**, which used to skip DB migrate/seed.

Latest `main` fixes that: **`src/instrumentation.ts`** boots the database even when Entry file is ignored.

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
NEXT_PUBLIC_SITE_URL=https://YOUR-REAL-URL
ADMIN_EMAIL=admin@tapariagro.com
ADMIN_PASSWORD=your-strong-password
ADMIN_SESSION_SECRET=optional-32-plus-chars
NEXT_PUBLIC_PHONE=9857620569
NEXT_PUBLIC_WHATSAPP=9779857620569
```

## Verify after Redeploy

1. **Runtime logs** should show `[boot] Catalog has … products` or seeding  
2. Open `https://YOUR-URL/api/health` → `{"ok":true,"products":22,…}`  
3. Open `/` and `/shop`

## Still broken?

Paste:
- Your live URL  
- **Runtime logs** (not only build logs)  
- Result of `/api/health`
