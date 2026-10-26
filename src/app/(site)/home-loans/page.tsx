import { HUB_DESCRIPTION, HUB_TITLE, HomeLoansHub } from "@/modules/web/content/home-loans/hub";
import { PATHS } from "@/modules/web/config";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({ title: HUB_TITLE, description: HUB_DESCRIPTION, path: PATHS.homeLoans });

export default function HomeLoansPage() {
  return <HomeLoansHub />;
}
