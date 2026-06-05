import { NextResponse } from "next/server";
import { modelService } from "@/lib/services/modelService";
import { z } from "zod";
import { errors } from "@/lib/observability/errors";
import { requireAdminMutation, AuthError } from "@/lib/auth";
import { HTTP } from "@/lib/constants/http";
import { HTTP_CACHE } from "@/lib/constants/cache";

export async function GET() {
  try {
    const models = await modelService.listAll();
    return NextResponse.json(models, {
      headers: { "Cache-Control": HTTP_CACHE.PUBLIC_READ },
    });
  } catch (error) {
    errors.capture(error, { route: "GET /api/models" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}

const CreateModelSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await requireAdminMutation();

    const json = await request.json();
    const parsed = CreateModelSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: HTTP.BAD_REQUEST });
    }

    const model = await modelService.create(parsed.data.name, parsed.data.shortName);
    return NextResponse.json(model, { status: HTTP.CREATED });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: { code: "unauthorized" } }, { status: error.status });
    }
    errors.capture(error, { route: "POST /api/models" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}
