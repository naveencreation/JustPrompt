import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { config as appConfig } from "@/lib/config";
import { TIMING } from "@/lib/constants/timing";

let maintenanceCacheValue: boolean | null = null;
let maintenanceCacheExpiry = 0;

async function isMaintenanceMode(): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCacheValue !== null && now < maintenanceCacheExpiry) {
    return maintenanceCacheValue;
  }

  try {
    const res = await fetch(
      `${appConfig.supabase.url}/rest/v1/settings?id=eq.1&select=maintenance_mode`,
      {
        headers: {
          apikey: appConfig.supabase.serviceRoleKey,
          Authorization: `Bearer ${appConfig.supabase.serviceRoleKey}`,
        },
        next: { revalidate: 0 },
      },
    );
    const json = (await res.json()) as Array<{ maintenance_mode: boolean }>;
    maintenanceCacheValue = json[0]?.maintenance_mode ?? false;
    maintenanceCacheExpiry = now + TIMING.MAINTENANCE_CACHE_MS;
    return maintenanceCacheValue;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const supabase = createServerClient(appConfig.supabase.url, appConfig.supabase.anonKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(pairs) {
        pairs.forEach(({ name, value }) => request.cookies.set(name, value));
        pairs.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // ── Maintenance mode ────────────────────────────────────────────────────────
  const isPublicRoute = !pathname.startsWith("/admin") && !pathname.startsWith("/api");
  if (isPublicRoute && pathname !== "/maintenance" && appConfig.supabase.serviceRoleKey) {
    const maintenance = await isMaintenanceMode();
    if (maintenance) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }
  }

  // ── Admin route guard ────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (user) return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      return response;
    }
    if (!user) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

// Next.js requires this export to be named `config`. We import the app-level
// config under a different alias above to avoid the name collision.
export const middlewareConfig = {
  matcher: [
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
export { middlewareConfig as config };
