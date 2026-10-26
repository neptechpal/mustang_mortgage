import Link from "next/link";
import type { User } from "@prisma/client";
import { Avatar } from "./fields";
import { avatarUrl, displayNameOf, profileUrl } from "../profile";

/** UM templates/logout.php — shown on login/register pages when already signed in. */
export function LoggedInBox({ user, staff }: { user: User; staff: boolean }) {
  const name = displayNameOf(user);
  return (
    <div className="um um-logout">
      <div className="um-form">
        <div className="um-misc-with-img">
          <div className="um-misc-img">
            <Link href={profileUrl(user.username)}>
              <Avatar src={avatarUrl(user)} name={name} size={80} />
            </Link>
          </div>
          <div>
            <strong>{name}</strong>
          </div>
        </div>
        <ul className="um-misc-ul">
          {staff && (
            <li>
              <Link href="/admin">Dashboard</Link>
            </li>
          )}
          <li>
            <Link href="/account">Your account</Link>
          </li>
          <li>
            <Link href="/logout" prefetch={false}>
              Logout
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
