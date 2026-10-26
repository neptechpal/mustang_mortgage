import { ServicePage, serviceMetadata } from "@/modules/web/content/home-loans/ServicePage";
import { firstHomeBuyers as content } from "@/modules/web/content/home-loans/first-home-buyers";

export const metadata = serviceMetadata(content);

export default function FirstHomeBuyersLoanPage() {
  return <ServicePage content={content} />;
}
