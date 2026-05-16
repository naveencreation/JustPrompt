import type { NextConfig } from "next";

const supabaseHostname = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  ? new URL(process.env["NEXT_PUBLIC_SUPABASE_URL"]).hostname
  : "*.supabase.co";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Supabase Storage
      { protocol: "https", hostname: supabaseHostname },
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
