import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminMutation, AuthError } from "@/lib/auth";
import { imageService } from "@/lib/services/imageService";
import { errors } from "@/lib/observability/errors";
import { HTTP } from "@/lib/constants/http";

const BodySchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid(),
      displayOrder: z.number().int(),
    })
  ).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    await requireAdminMutation();

    const raw = await request.json() as unknown;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: HTTP.BAD_REQUEST });
    }

    await imageService.updateOrder(parsed.data.updates);
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: { message: err.message } }, { status: err.status });
    }
    errors.capture(err, { route: "POST /api/images/reorder" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}
