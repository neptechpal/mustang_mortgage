import { redirect } from "next/navigation";

// WP page "Temp" contained only an unregistered shortcode ([ndis_service_agreement]); nothing to show.
export default function TempPage() {
  redirect("/");
}
