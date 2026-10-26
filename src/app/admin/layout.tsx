import { Inter } from "next/font/google";
import { requireStaff } from "@/lib/session";
import Sidebar from "@/components/admin/shell/Sidebar";
import Topbar from "@/components/admin/shell/Topbar";
import { ADMIN_NAV } from "./nav";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata = { title: { default: "Dashboard", template: "%s · MM CRM" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireStaff();
  const nav = ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || s.role === "ADMIN") })).filter((g) => g.items.length);
  return (
    <div className={`${inter.variable} admin-ui min-h-screen bg-canvas print:bg-white`}>
      <Sidebar nav={nav} />
      <div className="lg:pl-64 print:!pl-0">
        <Topbar name={s.name} role={s.role} />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
