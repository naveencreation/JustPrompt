import type { Metadata } from "next";
import { DM_Sans, DM_Mono, Newsreader } from "next/font/google";
import Script from "next/script";
import { config } from "@/lib/config";
import "./globals.css";

// Per minimalist-ui skill — Inter / Roboto / Helvetica are banned.
// DM Sans is a clean geometric sans with character; Newsreader is a true editorial serif.
const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
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
    template: "%s — AI Prompt Gallery",
  },
  description:
    "A curated archive of AI-generated images alongside the exact prompts that made them. Browse, search, and copy any prompt instantly.",
  metadataBase: new URL(config.appUrl),
  openGraph: { type: "website", siteName: "AI Prompt Gallery" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${newsreader.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#FBFBFA] text-neutral-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-neutral-50"
        >
          Skip to content
        </a>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>

      {config.adsenseClient && (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsenseClient}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
    </html>
  );
}
