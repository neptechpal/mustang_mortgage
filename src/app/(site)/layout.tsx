import type { Metadata } from "next";
import { WebChrome } from "@/modules/web/components/layout/WebChrome";
import { ORIGIN, robotsFor } from "@/modules/web/seo";

const ICON = "/wp-content/uploads/2024/06/cropped-Copy-of-Financial-Advisor-Logo-in-Dark-Light-Blue-White-Clean-Minimalist-Style-";

export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  // Default for pages that don't call buildMetadata(): noindex unless SEO_INDEXING=on.
  robots: robotsFor(),
  icons: {
    icon: [
      { url: `${ICON}-32x32.png`, sizes: "32x32" },
      { url: `${ICON}-192x192.png`, sizes: "192x192" },
    ],
    apple: `${ICON}-180x180.png`,
  },
};

/** Public website chrome (src/modules/web). The old Elementor chrome is no longer loaded. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <WebChrome>{children}</WebChrome>;
}
