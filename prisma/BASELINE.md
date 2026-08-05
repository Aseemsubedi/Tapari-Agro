# Database migrations

`prisma/migrations/20260803080000_baseline_current` is the **canonical schema** matching `schema.prisma` (hybrid inventory, settlements, payment ledger, customers, etc.).

## Fresh environment (Hostinger / new machine)

```bash
npx prisma migrate deploy
npx tsx prisma/seed.ts   # optional demo data
```

## Existing database already pushed to current schema

If the DB already has all tables/columns and migrate status is confused:

```bash
npx prisma migrate resolve --applied 20260803080000_baseline_current
```

Do **not** use `db push` for production. Add new changes with `prisma migrate dev` so Hostinger `migrate deploy` stays in sync.
