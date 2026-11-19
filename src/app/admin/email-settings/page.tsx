import { requireAdmin } from "@/lib/session";
import { EnquiryEmailSettings } from "@/modules/web/admin/EnquiryEmailSettings";
import { Container } from "@/modules/web/components/ui/Container";

export const metadata = { title: "Email Settings", noindex: true };

export default async function EmailSettingsPage() {
  await requireAdmin();

  return (
    <Container>
      <h1 style={{ padding: "40px 0 20px" }}>Email Settings</h1>
      <EnquiryEmailSettings />
    </Container>
  );
}
