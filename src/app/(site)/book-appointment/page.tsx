import BookingWidget from "@/modules/tools/appointments/BookingWidget";
import { getSsaSettings } from "@/modules/tools/appointments/settings";
import { publishedTypes, toPublicType } from "@/modules/tools/appointments/types";
import PageShell from "@/modules/tools/PageShell";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { SITE } from "@/modules/web/config";
import { consultationModes } from "@/modules/web/format";
import { buildMetadata } from "@/modules/web/seo";

export const dynamic = "force-dynamic";
export const metadata = buildMetadata({
  title: "Book a mortgage consultation",
  description: `Book a ${SITE.consultation.minutes}-minute mortgage consultation with Sulav Adhikari, 7 days a week, by ${consultationModes()}.`,
  path: "/book-appointment",
});

// WP page 1934: [ssa_booking type=mortgage-consultation]
export default async function BookAppointmentPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [types, s, q] = await Promise.all([publishedTypes(), getSsaSettings(), searchParams]);
  return (
    <>
      <PageIntro
        crumbs={[{ name: "Book a consultation", path: "/book-appointment" }]}
        eyebrow="Mortgage consultation"
        title={`Book ${SITE.consultation.minutes} minutes with ${SITE.broker.givenName}`}
        lede={`Choose a time that suits you, 7 days a week, by ${consultationModes()}. Times are shown in your own time zone; you can change it below. Prefer to talk first? Call ${SITE.broker.phone}.`}
      />
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
    </>
  );
}
