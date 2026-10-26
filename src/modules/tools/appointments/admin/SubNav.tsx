import { CalendarDays, CalendarPlus, Layers, List, Settings2 } from "lucide-react";
import { TabLinks } from "@/components/admin/ui";

const TABS = [
  { href: "/admin/appointments", label: "Appointments", Icon: List },
  { href: "/admin/appointments?view=calendar", label: "Calendar", Icon: CalendarDays },
  { href: "/admin/appointments/new", label: "Book appointment", Icon: CalendarPlus },
  { href: "/admin/appointments/types", label: "Appointment types", Icon: Layers },
  { href: "/admin/appointments/settings", label: "Settings", Icon: Settings2 },
];

export default function SubNav({ active }: { active: string }) {
  return (
    <TabLinks
      className="mb-6"
      tabs={TABS.map((t) => ({
        href: t.href,
        active: active === t.label,
        label: (
          <>
            <t.Icon className="size-4 opacity-80" />
            {t.label}
          </>
        ),
      }))}
    />
  );
}
