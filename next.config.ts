import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WordPress URLs ended with a slash; keep both forms working.
  skipTrailingSlashRedirect: false,
  experimental: {
    serverActions: { bodySizeLimit: "25mb" }, // profile photos, case uploads
  },
  images: { unoptimized: true },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
