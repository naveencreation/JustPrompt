import { createServerClient as _createServerClient, createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Database generic is removed until `pnpm db:types` generates real types from a live Supabase project.
// Once generated, re-add `<Database>` to each factory for full type safety.

// ─── Browser client (anon key, client components) ──────────────────────────
export function createBrowserClient() {
  return _createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Route handler / Server Action client (reads cookies) ──────────────────
export async function createRouteClient() {
  const cookieStore = await cookies();
  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );
}

// ─── Service-role client (server only, bypasses RLS) ───────────────────────
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
