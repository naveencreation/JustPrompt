import { createServerClient as _createServerClient, createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { config } from "@/lib/config";

// Database generic is removed until `pnpm db:types` generates real types from a live Supabase project.
// Once generated, re-add `<Database>` to each factory for full type safety.

// ─── Browser client (anon key, client components) ──────────────────────────
export function createBrowserClient() {
  return _createBrowserClient(config.supabase.url, config.supabase.anonKey);
}

// ─── Route handler / Server Action client (reads cookies) ──────────────────
export async function createRouteClient() {
  const cookieStore = await cookies();
  return _createServerClient(config.supabase.url, config.supabase.anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(pairs) {
        try {
          pairs.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll is called from Server Components where cookies are read-only.
          // Ignore — the session will be refreshed client-side.
        }
      },
    },
  });
}

// ─── Service-role client (server only, bypasses RLS) ───────────────────────
export function createAdminClient() {
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
