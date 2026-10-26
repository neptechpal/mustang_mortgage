import fs from "fs";
import path from "path";

// Media copied from the WordPress site lives under /public/wp-content/uploads.
// Settings migrated from WP still point at the old domain; serve them from this
// app instead (absolute, so they work in emails) when we have the file.
const WP_UPLOADS = /^https?:\/\/(?:www\.)?mustangmortgage\.com\.au(\/wp-content\/uploads\/[^?#]+)/i;

export function rehostWpAsset(url: string): string {
  const m = url.match(WP_UPLOADS);
  if (!m) return url;
  const rel = decodeURIComponent(m[1]);
  if (rel.includes("..") || !fs.existsSync(path.join(process.cwd(), "public", rel))) return url;
  const origin = (process.env.SITE_URL || "").replace(/\/$/, "");
  return origin ? origin + m[1] : m[1];
}
