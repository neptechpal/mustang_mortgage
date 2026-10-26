import type { Metadata } from "next";
import SiteChrome from "@/modules/site/components/SiteChrome";

const ICON = "/wp-content/uploads/2024/06/cropped-Copy-of-Financial-Advisor-Logo-in-Dark-Light-Blue-White-Clean-Minimalist-Style-";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: `${ICON}-32x32.png`, sizes: "32x32" },
      { url: `${ICON}-192x192.png`, sizes: "192x192" },
    ],
    apple: `${ICON}-180x180.png`,
  },
};

/** Public website: header (template 183), footer (173), floating contact button, Elementor kit styles. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
