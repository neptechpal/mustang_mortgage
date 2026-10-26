import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { profileUrl } from "@/modules/members/profile";

export const dynamic = "force-dynamic";

// UM "user" core page without a username shows the current user's profile.
export default async function UserIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect_to=/user");
  redirect(profileUrl(user.username));
}
