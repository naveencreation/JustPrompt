import type { NextConfig } from "next";

// In dev, networks that use NAT64 / DNS64 cause Next.js's image optimizer to
// reject Cloudflare-fronted hosts (Supabase Storage) because the
// IPv6-translated address is misclassified as "private". Production hosts
// (Vercel) don't have this problem, so we only disable optimization in dev.
const isDev = process.env.NODE_ENV === "development";

// next.config.ts is loaded outside the app runtime (by the Next.js CLI), so it
// cannot import `lib/config.ts` — that module validates env vars and would
// throw during `next build` in CI without a full env. We use a wildcard for
// Supabase Storage instead, which covers any project ref under supabase.co.
const nextConfig: NextConfig = {
  images: {
    unoptimized: isDev,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Supabase Storage — any project ref, scoped to the storage path
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Cloudinary (Tier 2 upgrade path)
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Long-lived cache for Next.js static assets
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  // Compress responses
  compress: true,

  // Strict mode helps catch issues early
  reactStrictMode: true,

  // Redirect /admin to /admin/dashboard
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/admin/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
