import { ServicePage, serviceMetadata } from "@/modules/web/content/home-loans/ServicePage";
import { constructionLoans as content } from "@/modules/web/content/home-loans/construction-loans";

export const metadata = serviceMetadata(content);

export default function ConstructionLoansPage() {
  return <ServicePage content={content} />;
}
