import type { Metadata } from "next";
import BookingWidget from "@/modules/tools/appointments/BookingWidget";
import { getSsaSettings } from "@/modules/tools/appointments/settings";
import { publishedTypes, toPublicType } from "@/modules/tools/appointments/types";
import PageShell from "@/modules/tools/PageShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book Appointment" };

// WP page 1934: [ssa_booking type=mortgage-consultation]
export default async function BookAppointmentPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [types, s, q] = await Promise.all([publishedTypes(), getSsaSettings(), searchParams]);
  return (
    <PageShell>
      <BookingWidget
        types={types.map(toPublicType)}
        initialType={q.type || "mortgage-consultation"}
        accent={s.accentColor}
        businessTz={s.timezone}
        startOfWeek={s.startOfWeek}
        companyName={s.companyName}
      />
    </PageShell>
  );
}
