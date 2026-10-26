import { ServicePage, serviceMetadata } from "@/modules/web/content/home-loans/ServicePage";
import { fixedVsVariable as content } from "@/modules/web/content/home-loans/fixed-vs-variable";

export const metadata = serviceMetadata(content);

export default function FixedVsVariablePage() {
  return <ServicePage content={content} />;
}
