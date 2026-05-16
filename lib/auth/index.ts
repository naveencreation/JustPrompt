import { createRouteClient } from "@/lib/db/client";
import { HTTP } from "@/lib/constants/http";
import { rateLimit } from "@/lib/ratelimit/factory";
import { ADMIN_RATE_LIMIT } from "@/lib/constants/limits";
import { TIMING } from "@/lib/constants/timing";
import type { User } from "@supabase/supabase-js";

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireAdminSession(): Promise<User> {
  const supabase = await createRouteClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError(HTTP.UNAUTHORIZED, "Authentication required");
  }

  return user;
}

/**
 * Composite guard for admin mutation routes — checks the session AND the rate limit.
 * Throws `AuthError` (401) if no session, `AuthError` (429) if rate-limited.
 */
export async function requireAdminMutation(): Promise<User> {
  const user = await requireAdminSession();

  const allowed = await rateLimit.check(
    `admin:${user.id}`,
    ADMIN_RATE_LIMIT,
    TIMING.ADMIN_WINDOW_SECONDS,
  );
  if (!allowed) {
    throw new AuthError(HTTP.TOO_MANY_REQUESTS, "Too many admin requests");
  }

  return user;
}

export async function getOptionalSession(): Promise<User | null> {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}
