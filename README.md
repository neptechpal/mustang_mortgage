# Mustang Mortgage — website & broker CRM

Next.js 15 (App Router) + Prisma/PostgreSQL rebuild of mustangmortgage.com.au: public website, calculators, online booking, client portal (secure document upload, fact find) and the Mustang broker CRM (cases, pipeline, forms, email via Zoho/SMTP2GO, reminders, marketing, commissions, borrowing capacity).

## Run locally
```bash
npm install
cp .env.example .env        # fill in values
npx prisma db push
npx next dev -p 3005        # http://localhost:3005, staff area at /admin
```

## Environment
See `.env.example`. Never commit `.env` or anything under `storage/` (private client files).

## Docs
- `ARCHITECTURE.md` — module layout and conventions
- `ADMIN_UI.md` — admin design system
- `scripts/migrate-wp.ts` — one-off WordPress → Postgres data migration
