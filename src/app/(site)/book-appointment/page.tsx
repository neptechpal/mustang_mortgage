import { Clock, Phone, Video } from "lucide-react";
import BookingWidget from "@/modules/tools/appointments/BookingWidget";
import { getSsaSettings } from "@/modules/tools/appointments/settings";
import { publishedTypes, toPublicType } from "@/modules/tools/appointments/types";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { TrustRow } from "@/modules/web/components/content/TrustRow";
import { Section } from "@/modules/web/components/ui/Section";
import { SITE } from "@/modules/web/config";
import { consultationModes } from "@/modules/web/format";
import { buildMetadata } from "@/modules/web/seo";
import "@/modules/web/styles/calc.css";

export const dynamic = "force-dynamic";
export const metadata = buildMetadata({
  title: "Book a mortgage consultation",
  description: `Book a ${SITE.consultation.minutes}-minute mortgage consultation with Sulav Adhikari, 7 days a week, by ${consultationModes()}.`,
  path: "/book-appointment",
});

const icon = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

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
      >
        <TrustRow
          items={[
            { icon: <Clock {...icon} />, children: <><strong>{SITE.consultation.minutes} minutes</strong>, {SITE.hours.days}</> },
            { icon: <Video {...icon} />, children: <><strong>By {consultationModes()}</strong>, wherever you are</> },
            { icon: <Phone {...icon} />, children: <><strong>{SITE.broker.phone}</strong> if no time suits</> },
          ]}
        />
      </PageIntro>
      <Section id="booking" size="tight" className="mw-calcsection" aria-label="Choose a time">
        <BookingWidget
          types={types.map(toPublicType)}
          initialType={q.type || "mortgage-consultation"}
          accent={s.accentColor}
          businessTz={s.timezone}
          startOfWeek={s.startOfWeek}
          companyName={s.companyName}
        />
      </Section>
    </>
  );
}
