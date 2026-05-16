import { createRouteClient } from "@/lib/db/client";
import { logger } from "@/lib/observability/logger";

export interface AuthSession {
  userId: string;
  email: string | null;
}

export const authService = {
  async signIn(email: string, password: string): Promise<AuthSession | null> {
    const supabase = await createRouteClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      logger.warn("admin.login_failed", { email });
      return null;
    }

    logger.info("admin.login_success", { userId: data.user.id });
    return { userId: data.user.id, email: data.user.email ?? null };
  },

  async signOut(): Promise<void> {
    const supabase = await createRouteClient();
    await supabase.auth.signOut();
    logger.info("admin.logout");
  },
};
