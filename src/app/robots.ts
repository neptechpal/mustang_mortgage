import type { MetadataRoute } from "next";
import { absoluteUrl, indexingEnabled } from "@/modules/web/seo";

// Staging/dev: disallow everything. Production (SEO_INDEXING=on): allow, but never private areas.
const PRIVATE = ["/admin", "/api", "/portal", "/account", "/login", "/register", "/password-reset", "/logout", "/user", "/members", "/book-appointment/manage", "/factfind"];

export default function robots(): MetadataRoute.Robots {
  if (!indexingEnabled()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
