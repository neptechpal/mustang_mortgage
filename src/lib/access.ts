// Staff access levels. Pure functions only (no Prisma / Node APIs) so the edge middleware can use them.
// Admins can open everything. Staff get a set of "areas"; any /admin path that is not mapped to an
// area is admin-only (deny by default).

export type AreaKey = "cases" | "forms" | "work" | "money" | "tools" | "lenderPolicy" | "website" | "content";

export const AREAS: Record<AreaKey, { label: string; hint: string; prefixes: string[] }> = {
  cases: { label: "Cases and pipeline", hint: "Cases, pipeline board, fact find history, client files", prefixes: ["/admin/cases", "/admin/kanban", "/admin/factfinds", "/api/admin/crm"] },
  forms: { label: "Forms and email templates", hint: "Build forms, edit email templates", prefixes: ["/admin/forms", "/admin/templates"] },
  work: { label: "Reminders, notes and activity", hint: "Reminders, field notes, broker notes, activity, email trail", prefixes: ["/admin/reminders", "/admin/field-notes", "/admin/notes", "/admin/signals", "/admin/trail", "/api/admin/x/email"] },
  money: { label: "Income and commissions", hint: "Income dashboard and commission records", prefixes: ["/admin/income", "/admin/commissions"] },
  tools: { label: "Borrowing, marketing and links", hint: "Borrowing capacity, marketing, loan ad generator, custom links", prefixes: ["/admin/borrowing", "/admin/marketing", "/admin/social", "/admin/links"] },
  lenderPolicy: { label: "Lender policy", hint: "Lender policy, pricing and rules", prefixes: ["/admin/lender-policy"] },
  website: { label: "Enquiries and appointments", hint: "Website form submissions and appointments", prefixes: ["/admin/submissions", "/admin/appointments", "/api/admin/submissions", "/api/admin/appointments"] },
  content: { label: "Website content", hint: "Testimonials, lenders list, SEO page review", prefixes: ["/admin/testimonials", "/admin/lenders", "/admin/seo"] },
};

export const AREA_KEYS = Object.keys(AREAS) as AreaKey[];

export type AccessLevel = "standard" | "senior" | "junior" | "custom";

export const LEVELS: Record<Exclude<AccessLevel, "custom">, { label: string; hint: string; areas: AreaKey[] }> = {
  standard: { label: "Standard staff", hint: "Everything except Users and System settings", areas: AREA_KEYS },
  senior: { label: "Senior broker", hint: "Same as standard staff", areas: AREA_KEYS },
  junior: { label: "Junior", hint: "Cases, notes and enquiries only. No finances, lender policy, forms or website content", areas: ["cases", "work", "website"] },
};

export type Permissions = { level?: AccessLevel; areas?: string[] };

/** Areas a user may use. Admins get "*". Staff with nothing configured keep standard access. */
export function areasFor(role: string, permissions: unknown): string[] {
  if (role === "ADMIN") return ["*"];
  const p = (permissions && typeof permissions === "object" ? permissions : {}) as Permissions;
  if (p.level === "custom") return (p.areas ?? []).filter((a): a is AreaKey => a in AREAS);
  if (p.level === "junior") return [...LEVELS.junior.areas];
  return [...AREA_KEYS];
}

/** The area a request path belongs to; "dashboard" for /admin itself; null = admin-only. */
export function areaForPath(pathname: string): AreaKey | "dashboard" | null {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  for (const key of AREA_KEYS) {
    if (AREAS[key].prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) return key;
  }
  return null;
}

export function canAccessPath(role: string, areas: string[] | undefined, pathname: string): boolean {
  if (role === "ADMIN") return true;
  if (role !== "STAFF") return false;
  const area = areaForPath(pathname);
  if (area === "dashboard") return true;
  if (area === null) return false;
  return !!areas?.includes(area);
}
