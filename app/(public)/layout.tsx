import type { Metadata } from "next";
import { Navbar } from "@/components/shared/Navbar";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  alternates: { canonical: config.appUrl },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
