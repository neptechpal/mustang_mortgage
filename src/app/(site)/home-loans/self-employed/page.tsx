import { ServicePage, serviceMetadata } from "@/modules/web/content/home-loans/ServicePage";
import { selfEmployed as content } from "@/modules/web/content/home-loans/self-employed";

export const metadata = serviceMetadata(content);

export default function SelfEmployedPage() {
  return <ServicePage content={content} />;
}
