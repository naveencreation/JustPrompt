import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/lib/storage/factory";
import { requireAdminMutation, AuthError } from "@/lib/auth";
import { errors } from "@/lib/observability/errors";
import { HTTP } from "@/lib/constants/http";

const BodySchema = z.object({
  filename: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdminMutation();

    const body = BodySchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.flatten() }, { status: HTTP.BAD_REQUEST });
    }

    const result = await storage.signedUploadUrl(body.data.filename);
    return NextResponse.json(result, { status: HTTP.CREATED });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: { code: "unauthorized" } }, { status: err.status });
    }
    errors.capture(err, { route: "POST /api/admin/upload-signature" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}
