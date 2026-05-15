import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRouteClient } from "@/lib/db/client";
import { errors } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";
import { HTTP } from "@/lib/constants/http";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = LoginSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.flatten() }, { status: HTTP.BAD_REQUEST });
    }

    const supabase = await createRouteClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.data.email,
      password: body.data.password,
    });

    if (error || !data.session) {
      logger.warn("admin.login_failed", { email: body.data.email });
      return NextResponse.json(
        { error: { code: "invalid_credentials", message: "Invalid email or password" } },
        { status: HTTP.UNAUTHORIZED },
      );
    }

    logger.info("admin.login_success", { userId: data.user.id });
    return NextResponse.json({ user: { id: data.user.id, email: data.user.email } });
  } catch (err) {
    errors.capture(err, { route: "POST /api/admin/auth" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}

export async function DELETE() {
  try {
    const supabase = await createRouteClient();
    await supabase.auth.signOut();
    logger.info("admin.logout");
    return new NextResponse(null, { status: HTTP.NO_CONTENT });
  } catch (err) {
    errors.capture(err, { route: "DELETE /api/admin/auth" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}
