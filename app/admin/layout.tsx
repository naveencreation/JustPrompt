import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin/AdminShell";
import { UI } from "@/lib/constants/ui";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get(UI.ADMIN_SIDEBAR_COLLAPSED_COOKIE)?.value === "1";

  return (
    <AdminShell initialCollapsed={initialCollapsed}>{children}</AdminShell>
  );
}
