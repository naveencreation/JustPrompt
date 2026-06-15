import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getOptionalSession } from "@/lib/auth";
import { UI } from "@/lib/constants/ui";

export default async function AuthenticatedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOptionalSession();

  if (!user) {
    redirect("/admin/login");
  }

  const cookieStore = await cookies();
  const initialCollapsed =
    cookieStore.get(UI.ADMIN_SIDEBAR_COLLAPSED_COOKIE)?.value === "1";

  return (
    <AdminShell initialCollapsed={initialCollapsed}>{children}</AdminShell>
  );
}
