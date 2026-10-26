import type { Metadata } from "next";
import { LogoutRunner } from "@/modules/members/components/LogoutRunner";

export const metadata: Metadata = { title: "Logout", robots: { index: false } };
export const dynamic = "force-dynamic";

// UM "logout" core page: clears the session and redirects home (after_logout = redirect_home).
// Implemented as a page + server action (not a GET handler) so link prefetching can never log users out.
export default function LogoutPage() {
  return (
    <div className="um-page" style={{ textAlign: "center" }}>
      <LogoutRunner />
    </div>
  );
}
