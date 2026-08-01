# Tapari Agro

Custom Next.js storefront + admin backend (no WordPress).

## What you get

- **Homepage & shop** — branded storefront
- **Cart + checkout** — customer places COD/phone orders
- **Admin** (`/admin`) — manage products and orders

## Quick start

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
```

- Store: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)  
  Default login: `admin@tapariagro.com` / `changeme`

## Environment

```env
DATABASE_URL="file:./dev.db"
ADMIN_EMAIL="admin@tapariagro.com"
ADMIN_PASSWORD="changeme"
ADMIN_SESSION_SECRET="replace-with-a-long-random-string"
```

## Deploy on Hostinger

Use **Deploy Web App** (Node.js) for this whole project — one site, one domain.

1. Push this repo to GitHub
2. Hostinger → **Add website → Deploy Web App**
3. Set build: `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build`
4. Set start: `npm run start`
5. Add the env vars above (use a strong password + session secret)
6. After first deploy, seed once if needed: `npx tsx prisma/seed.ts`

SQLite stores data in `prisma/dev.db`. For production growth, switch `DATABASE_URL` to Hostinger MySQL later.

## Project map

```
src/app/(store)/     # public homepage, shop, cart, order confirmation
src/app/admin/       # admin login, products, orders
src/app/actions.ts   # server actions
prisma/              # database schema + seed
```
