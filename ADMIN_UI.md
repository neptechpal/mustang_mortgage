# Admin UI redesign — brief for contributors

Goal: make every /admin screen look like a polished, modern SaaS CRM (think Linear / Stripe dashboard / Attio), consistent across modules. **UI only — do not change behaviour**: keep every server action, form field `name`, query param, route, id/anchor used by JS, data shown, confirm prompts and feature. Do not remove features or fields; you may reorganise layout (tabs, columns, cards), add icons, empty states, better hierarchy, responsive layout.

## Design system (use it, don't reinvent)
- `src/components/admin/ui.tsx`: `PageHeader` (title/description/breadcrumbs/actions/icon), `Card`, `StatCard`, `TableWrap/Table/THead/TBody/TR/TH/TD` + `tableCls` strings for client components, `Badge` (tones neutral|brand|success|warning|danger|info|violet) + `badgeStyles`, `Button`/`LinkButton`/`buttonStyles({variant: primary|secondary|ghost|danger|dark|link, size: xs|sm|md|lg})`, `Field`/`Input`/`Select`/`Textarea` + `inputStyles/selectStyles/textareaStyles/labelStyles/checkboxStyles`, `Toolbar` (filter row), `Alert`, `EmptyState`, `Avatar`, `TabLinks`, `KeyValue`, `SectionTitle`, `cn`.
- Icons: `lucide-react` (already installed). 16–18px in buttons/nav, 20px in headers.
- Tokens (Tailwind v4, `src/app/globals.css`): brand gold `brand-50..900` (primary buttons `brand-600`, hover `brand-700`, accents `brand-500`), sidebar ink `ink-*`, page bg `bg-canvas`. Neutrals = slate. Font Inter (already applied by the admin layout).
- Style rules: page = `PageHeader` then content; cards `rounded-xl border-slate-200/80 bg-white` with 20px padding; 24px (gap-6) between major blocks; tables in `TableWrap` with uppercase 11px headers, 12px row padding, hover rows; statuses as `Badge` with semantic tones; primary action top-right in the header; secondary actions `secondary`/`ghost`; destructive `danger`; empty lists → `EmptyState`; forms in Cards with `Field` labels, 2-column grid on desktop; numbers `tabular-nums`. Replace emoji/"＋" text icons with lucide icons. No hard-coded hex colours except where data-driven (e.g. stage colours).
- Shell already provides sidebar + topbar (with global search and a "New client" button) — don't add another global nav.
- Responsive: must work at 390px (mobile) and 1440px.
- The old preset helpers (`src/modules/crm/components/ui.tsx` exports, `src/modules/crm-extra/ui/styles.ts` `cx`) may be re-implemented on top of the new kit by their owning agent so existing call sites improve; keep their export names.

## Verify visually
A dev server is running at http://localhost:3100 (shared — don't stop it; if it's down start your own on another port with `npx next dev -p <port>`). Screenshot any admin page as ADMIN with:
`node scripts/admin-shot.mjs http://localhost:3100 /admin/cases "<scratch>/cases.png" 1440` (and width 390 for mobile), then Read the PNG. Iterate until it looks excellent. Local DB has real migrated data (case ids e.g. 3019).

## Rules
- Only edit files in your assigned scope. Don't edit `src/components/admin/**`, `src/app/admin/layout.tsx`, `nav.ts`, `globals.css` (ask the lead in your report if the kit needs something; you may add small local components inside your module).
- `npx tsc --noEmit` must pass (ignore errors in files outside your scope while others work). No git commits. Don't run `prisma db push`.
