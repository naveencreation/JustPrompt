import { createRouteClient } from "@/lib/db/client";
import { HTTP } from "@/lib/constants/http";
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

export async function getOptionalSession(): Promise<User | null> {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}
