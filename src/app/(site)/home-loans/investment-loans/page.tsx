import { ServicePage, serviceMetadata } from "@/modules/web/content/home-loans/ServicePage";
import { investmentLoans as content } from "@/modules/web/content/home-loans/investment-loans";

export const metadata = serviceMetadata(content);

export default function InvestmentLoansPage() {
  return <ServicePage content={content} />;
}
