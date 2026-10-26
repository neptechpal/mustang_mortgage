// Sidebar for the staff CRM (replacement for the WP admin "MM CRM" menu).
// `icon` is a key into ICONS in src/components/admin/shell/Sidebar.tsx.
export type NavItem = { href: string; label: string; icon: string; adminOnly?: boolean };
export type NavGroup = { title: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  {
    title: "CRM",
    items: [
      { href: "/admin", label: "Dashboard", icon: "dashboard" },
      { href: "/admin/cases", label: "Cases", icon: "cases" },
      { href: "/admin/kanban", label: "Pipeline", icon: "pipeline" },
      { href: "/admin/forms", label: "Forms", icon: "forms" },
      { href: "/admin/templates", label: "Email Templates", icon: "templates" },
      { href: "/admin/factfinds", label: "Fact Find History", icon: "factfind" },
    ],
  },
  {
    title: "Work",
    items: [
      { href: "/admin/reminders", label: "Reminders", icon: "reminders" },
      { href: "/admin/field-notes", label: "Field notes", icon: "notes" },
      { href: "/admin/notes", label: "Broker Notes", icon: "notes" },
      { href: "/admin/notes/learning", label: "Learning Vault", icon: "learning" },
      { href: "/admin/signals", label: "Activity", icon: "activity" },
      { href: "/admin/trail", label: "Email Trail", icon: "mail" },
      { href: "/admin/income", label: "Income", icon: "commissions" },
      { href: "/admin/commissions", label: "Commissions", icon: "commissions" },
      { href: "/admin/borrowing", label: "Borrowing Capacity", icon: "calculator" },
      { href: "/admin/marketing", label: "Marketing", icon: "marketing" },
      { href: "/admin/social", label: "Loan Ad Generator", icon: "social" },
      { href: "/admin/links", label: "Custom Links", icon: "links" },
      { href: "/admin/reminders/ics", label: "Calendar Feed", icon: "calendarFeed" },
    ],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/submissions", label: "Form Submissions", icon: "submissions" },
      { href: "/admin/appointments", label: "Appointments", icon: "appointments" },
      { href: "/admin/seo", label: "SEO page review", icon: "chart" },
      { href: "/admin/users", label: "Users", icon: "users", adminOnly: true },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: "settings", adminOnly: true },
      { href: "/admin/automation", label: "Automation", icon: "automation", adminOnly: true },
      { href: "/admin/zoho", label: "Zoho Mail", icon: "zoho", adminOnly: true },
      { href: "/admin/diagnostics", label: "Diagnostics", icon: "diagnostics", adminOnly: true },
    ],
  },
];
