import { redirect } from "next/navigation";
import { PATHS } from "@/modules/web/config";

export const metadata = {
  robots: "noindex",
};

export default async function RegisterPage() {
  redirect(PATHS.contact);
}
