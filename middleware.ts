import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const MAINTENANCE_CACHE_DURATION_MS = 60_000;

let maintenanceCacheValue: boolean | null = null;
let maintenanceCacheExpiry = 0;

async function isMaintenanceMode(supabaseUrl: string, serviceKey: string): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCacheValue !== null && now < maintenanceCacheExpiry) {
    return maintenanceCacheValue;
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/settings?id=eq.1&select=maintenance_mode`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      next: { revalidate: 0 },
    });
    const data = (await res.json()) as Array<{ maintenance_mode: boolean }>;
    maintenanceCacheValue = data[0]?.maintenance_mode ?? false;
    maintenanceCacheExpiry = now + MAINTENANCE_CACHE_DURATION_MS;
    return maintenanceCacheValue;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

  // Create Supabase session client
  const supabase = createServerClient(supabaseUrl, anonKey, {
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
  if (isPublicRoute && serviceKey) {
    const maintenance = await isMaintenanceMode(supabaseUrl, serviceKey);
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

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
