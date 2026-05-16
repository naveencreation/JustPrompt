import type { Metadata } from "next";

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://aipromptgallery.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: BASE_URL },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
