import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import CustomLinks from "@/modules/tools/links/CustomLinks";
import { getCustomLinks } from "@/modules/tools/links/links";
import PageShell from "@/modules/tools/PageShell";
import { BORROW_DEFAULTS, type BorrowAssumptions } from "@/modules/tools/serviceability/math";
import ServiceabilityCalculator from "@/modules/tools/serviceability/ServiceabilityCalculator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Serviceability" };

// Assumptions are shared with the staff Borrowing Capacity tool (crm-extra, key below).
const BORROW_SETTINGS_KEY = "crmx.borrow.settings";

async function assumptions(): Promise<BorrowAssumptions> {
  const saved = await getSetting<Partial<BorrowAssumptions> | null>(BORROW_SETTINGS_KEY, null).catch(() => null);
  const s = { ...BORROW_DEFAULTS, ...(saved ?? {}) } as BorrowAssumptions;
  s.fees = Object.fromEntries(Object.entries(BORROW_DEFAULTS.fees).map(([st, v]) => [st, { ...v, ...(saved?.fees?.[st] ?? {}) }]));
  return s;
}

// WP page 2810 — [mm_borrow_calc] + [mmcrm_links] (mountains shape divider container).
export default async function ServiceabilityPage() {
  const [S, links] = await Promise.all([assumptions(), getCustomLinks()]);
  return (
    <>
      <PageShell className="!pb-4">
        <ServiceabilityCalculator S={S} />
      </PageShell>
      <div className="relative mx-auto w-full max-w-[1140px] px-[10px] pb-10">
        <div className="relative flex flex-col items-center pt-[60px] lg:w-[73.231%]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[100px] overflow-hidden" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" preserveAspectRatio="none" className="block h-full w-full fill-white">
              <path opacity="0.33" d="M473,67.3c-203.9,88.3-263.1-34-320.3,0C66,119.1,0,59.7,0,59.7V0h1000v59.7 c0,0-62.1,26.1-94.9,29.3c-32.8,3.3-62.8-12.3-75.8-22.1C806,49.6,745.3,8.7,694.9,4.7S492.4,59,473,67.3z" />
              <path opacity="0.66" d="M734,67.3c-45.5,0-77.2-23.2-129.1-39.1c-28.6-8.7-150.3-10.1-254,39.1 s-91.7-34.4-149.2,0C115.7,118.3,0,39.8,0,39.8V0h1000v36.5c0,0-28.2-18.5-92.1-18.5C810.2,18.1,775.7,67.3,734,67.3z" />
              <path d="M766.1,28.9c-200-57.5-266,65.5-395.1,19.5C242,1.8,242,5.4,184.8,20.6C128,35.8,132.3,44.9,89.9,52.5C28.6,63.7,0,0,0,0 h1000c0,0-9.9,40.9-83.6,48.1S829.6,47,766.1,28.9z" />
            </svg>
          </div>
          <div className="relative w-[97.363%]">
            <CustomLinks links={links} />
          </div>
        </div>
      </div>
    </>
  );
}
