import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AI Prompt Gallery",
    template: "%s | AI Prompt Gallery",
  },
  description:
    "Browse a curated gallery of AI-generated images alongside the exact prompts used to create them. Copy any prompt instantly.",
  metadataBase: new URL(
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://aipromptgallery.com",
  ),
  openGraph: {
    type: "website",
    siteName: "AI Prompt Gallery",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        {/* Skip-to-content — visible on focus for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>

      {/* AdSense — only loads when env var is set (Tier 0: disabled) */}
      {process.env["NEXT_PUBLIC_ADSENSE_CLIENT"] && (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env["NEXT_PUBLIC_ADSENSE_CLIENT"]}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
    </html>
  );
}
