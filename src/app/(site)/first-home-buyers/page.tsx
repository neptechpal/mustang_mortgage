import { PATHS } from "@/modules/web/config";
import { FHB_HUB, FhbHub } from "@/modules/web/content/fhb/hub";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({ title: FHB_HUB.title, description: FHB_HUB.description, path: PATHS.firstHomeBuyers });

export default function FirstHomeBuyersPage() {
  return <FhbHub />;
}
