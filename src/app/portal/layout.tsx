import Link from "next/link";
import { LockKeyhole, Phone } from "lucide-react";
import { Container } from "@/modules/web/components/ui/Container";
import { LicenceStatement } from "@/modules/web/components/content/LicenceStatement";
import { SITE } from "@/modules/web/config";
import { webFontVars } from "@/modules/web/fonts";
import "@/modules/web/styles/web.css";
import "@/modules/web/styles/portal.css";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`web mw-portal ${webFontVars}`}>
      <a href="#main" className="mw-skip">Skip to content</a>
      <header className="mw-portal__header">
        <Container className="mw-portal__bar">
          <Link href="/" className="mw-brand" aria-label={`${SITE.name}, home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE.logo.badge} alt="" width={40} height={40} />
            <span className="mw-brand__name">{SITE.name}</span>
          </Link>
          <span className="mw-portal__secure"><LockKeyhole size={16} strokeWidth={1.5} aria-hidden="true" />Secure client portal</span>
          <a href={SITE.broker.phoneHref} className="mw-portal__phone" aria-label={`Call ${SITE.broker.name} on ${SITE.broker.phone}`}>
            <Phone size={18} strokeWidth={1.5} aria-hidden="true" /><span>{SITE.broker.phone}</span>
          </a>
        </Container>
      </header>
      <main id="main" tabIndex={-1}>{children}</main>
      <footer className="mw-portal__footer">
        <Container><LicenceStatement /></Container>
      </footer>
    </div>
  );
}
