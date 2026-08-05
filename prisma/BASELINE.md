# Database migrations

`prisma/migrations/20260803080000_baseline_current` is the **canonical schema** matching `schema.prisma` (hybrid inventory, settlements, payment ledger, customers, essential pins, digital lot slices, etc.).

## Fresh environment (Hostinger / Railway / new machine)

```bash
npx prisma migrate deploy
npx tsx prisma/seed.ts   # optional demo data — also runs automatically on empty DB via npm start
```

## Existing database already pushed to current schema

If the DB already has all tables/columns and migrate status is confused:

```bash
npx prisma migrate resolve --applied 20260803080000_baseline_current
```

Do **not** use `db push` for production. Add new changes with `prisma migrate dev` so Hostinger / Railway `migrate deploy` stays in sync.

If you previously applied an older copy of this baseline that was missing columns (`essential`, `stockKind`, …), wipe the empty DB volume and redeploy, or add a follow-up migration — do not re-edit an already-applied migration on a live volume.
