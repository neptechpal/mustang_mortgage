import { ServicePage, serviceMetadata } from "@/modules/web/content/home-loans/ServicePage";
import { refinancing as content } from "@/modules/web/content/home-loans/refinancing";

export const metadata = serviceMetadata(content);

export default function RefinancingPage() {
  return <ServicePage content={content} />;
}
