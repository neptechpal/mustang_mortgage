# Mustang Mortgage — Next.js rebuild (conventions for all contributors)

Replica of the WordPress site www.mustangmortgage.com.au (Elementor site + custom "Mustang Mini CRM" plugin + Ultimate Member + Simply Schedule Appointments + Contact Form 7 + loan social ad generator). Goal: **every feature preserved**.

## Reference material (read-only)
- Specs: `../specs/*.md` (crm-core, crm-advanced, public-pages; generated summaries — verify against source when unsure)
- WP files: `../backup/site/website_6f76c53a/` (plugins in `wp-content/plugins/`, theme, uploads)
- DB content export per post: `../backup/db_export/*.txt` (pages incl. `_elementor_data`, CF7 forms, wpcode snippets, mm_templates, mm_forms, UM forms, options.txt)
- Rendered live HTML: `../backup/live_mirror/page_*.html`
- Do NOT read `../backup/mustang_db.sql` wholesale (39MB, contains client PII); grep it narrowly only if essential.

## Stack
Next.js 15 App Router + TypeScript + Tailwind v4, Prisma 6 (Postgres), multi-file schema in `prisma/schema/`.

## Rules
- **Schema**: each module owns ONE file `prisma/schema/<module>.prisma`. Never edit `base.prisma` or another module's file. Relations to `User` are not allowed from module files (use plain `Int` userId columns) so files stay independent. Cross-module refs: use plain `Int caseId` columns (no @relation) except within your own file.
- **Routes**: public site under `src/app/(site)/`, staff CRM under `src/app/admin/<area>/`, client portal under `src/app/portal/`, staff APIs under `src/app/api/admin/<area>/` (middleware already 401s non-staff), public APIs under `src/app/api/<area>/`, cron under `src/app/api/cron/<job>/route.ts` (use `checkCron` from `@/lib/cron`).
- Module code under `src/modules/<module>/` (server logic, components). Shared libs in `src/lib/` are owned by the lead — use, don't modify (ask in your report if you need a change).
- Auth: `@/lib/session` → `requireStaff()`, `requireAdmin()`, `requireUser()`, `getSession()`, `staffSessionOrNull()`. Roles ADMIN/STAFF/MEMBER.
- Mail: `sendMail()` + `fillTemplate()` from `@/lib/mail` (SMTP2GO). Settings: `getSetting/setSetting` from `@/lib/settings` (namespaced keys `<module>.<name>`).
- Files: `saveFormFile/readStoredFile` from `@/lib/storage` — private, never under /public. Serve via an authorised route.
- Public images from WP are at `/wp-content/uploads/...` (same paths as WP).
- Prefer Server Components + Server Actions; client components only where interactive. No new heavy deps without need.
- Timezone: Australia/Sydney. Currency AUD.
- Must pass `npx tsc --noEmit` and `npx prisma validate`.
