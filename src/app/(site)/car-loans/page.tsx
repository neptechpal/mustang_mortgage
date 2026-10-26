import { ServicePage, serviceMetadata } from "@/modules/web/content/home-loans/ServicePage";
import { carLoans as content } from "@/modules/web/content/home-loans/car-loans";

export const metadata = serviceMetadata(content);

export default function CarLoansPage() {
  return <ServicePage content={content} />;
}
