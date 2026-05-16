import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/lib/services/authService";
import { errors } from "@/lib/observability/errors";
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

    const session = await authService.signIn(body.data.email, body.data.password);
    if (!session) {
      return NextResponse.json(
        { error: { code: "invalid_credentials", message: "Invalid email or password" } },
        { status: HTTP.UNAUTHORIZED },
      );
    }

    return NextResponse.json({ user: { id: session.userId, email: session.email } });
  } catch (err) {
    errors.capture(err, { route: "POST /api/admin/auth" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}

export async function DELETE() {
  try {
    await authService.signOut();
    return new NextResponse(null, { status: HTTP.NO_CONTENT });
  } catch (err) {
    errors.capture(err, { route: "DELETE /api/admin/auth" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}
