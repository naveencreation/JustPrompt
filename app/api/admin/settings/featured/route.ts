import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminMutation, AuthError } from "@/lib/auth";
import { adminService } from "@/lib/services/adminService";
import { HTTP } from "@/lib/constants/http";
import { ImageId } from "@/lib/db/schema";

const BodySchema = z.object({
  imageId: ImageId.nullable(),
});

export async function POST(request: Request) {
  try {
    await requireAdminMutation();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: { message: err.message } }, { status: err.status });
    }
    throw err;
  }

  const raw = await request.json() as unknown;
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: HTTP.UNPROCESSABLE });
  }

  await adminService.setFeaturedImage(parsed.data.imageId);
  return NextResponse.json({ ok: true });
}
