import { Sparkles } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { PageHeader } from "@/components/admin/ui";
import { LoanSocialGenerator } from "@/modules/social/LoanSocialGenerator";

export const metadata = { title: "Loan Social Post" };
export const dynamic = "force-dynamic";

// Replacement for the WP admin page "Loan Social Post" (plugin mm-loan-social-generato).
export default async function LoanSocialPostPage() {
  await requireStaff();
  return (
    <div>
      <PageHeader
        icon={<Sparkles />}
        title="Loan Ad Generator"
        description="Create a 9:16 social story graphic and caption to celebrate a client's loan milestone."
      />
      {/* The generator is a faithful port with its own scoped CSS; only its outer margin and duplicate page title are neutralised here. */}
      <div className="[&_.mm-wrap]:!m-0 [&_.mm-wrap>h1]:!hidden">
        <LoanSocialGenerator />
      </div>
    </div>
  );
}
