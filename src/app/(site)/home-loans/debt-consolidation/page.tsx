import { ServicePage, serviceMetadata } from "@/modules/web/content/home-loans/ServicePage";
import { debtConsolidation as content } from "@/modules/web/content/home-loans/debt-consolidation";

export const metadata = serviceMetadata(content);

export default function DebtConsolidationPage() {
  return <ServicePage content={content} />;
}
