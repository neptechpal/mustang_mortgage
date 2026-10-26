import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WordPress URLs ended with a slash; keep both forms working.
  skipTrailingSlashRedirect: false,
  experimental: {
    serverActions: { bodySizeLimit: "25mb" }, // profile photos, case uploads
  },
  images: { unoptimized: true },
  poweredByHeader: false,
  // Old WordPress URLs → new information architecture (query strings are kept).
  async redirects() {
    return [
      { source: "/services", destination: "/home-loans", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/serviceability", destination: "/calculators/borrowing-power", permanent: true },
      { source: "/elementor-2749", destination: "/calculators/npr-aud-converter", permanent: true },
      { source: "/tax-calc", destination: "/calculators", permanent: true },
      { source: "/mustang-mortgage", destination: "/", permanent: true },
      { source: "/secure-upload", destination: "/portal", permanent: true },
      { source: "/secure-upload-3", destination: "/portal", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Staging/preview must never be indexed; production sets SEO_INDEXING=on.
          ...(process.env.SEO_INDEXING === "on" ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
