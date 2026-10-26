import type { Metadata } from "next";
import FormRunner from "@/modules/crm/components/FormRunner";
import Cf7Extras from "@/modules/crm/components/Cf7Extras";
import { cf7FactFind, CF7_SUCCESS } from "@/modules/crm/forms/cf7-factfind";

export const metadata: Metadata = { title: "Fact Find | Mustang Mortgage" };

// WP page "Fact Find" = [contact-form-7 id="1a22a80" title="MM Fact Find"] (form 2651).
export default function FactFindPage() {
  const schema = cf7FactFind();
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-[720px] px-4 py-10">
        <FormRunner schema={schema} values={{}} cfg={{ formId: 2651, isPublic: true, multipart: true, endpoint: "/api/portal/factfind", title: "Mustang Mortgage — Client Fact Find", successMessage: CF7_SUCCESS }}>
          <Cf7Extras />
        </FormRunner>
      </div>
    </main>
  );
}
