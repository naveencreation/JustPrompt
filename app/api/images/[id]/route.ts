import { type NextRequest, NextResponse } from "next/server";
import { imageService } from "@/lib/services/imageService";
import { requireAdminSession, AuthError } from "@/lib/auth";
import { errors } from "@/lib/observability/errors";
import { HTTP } from "@/lib/constants/http";
import { ImageId, UpdateImageInputSchema } from "@/lib/db/schema";

const PUBLIC_CACHE = "public, s-maxage=60, stale-while-revalidate=300";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const image = await imageService.getById(ImageId.parse(id));
    if (!image) return NextResponse.json({ error: { code: "not_found" } }, { status: HTTP.NOT_FOUND });
    return NextResponse.json(image, { headers: { "Cache-Control": PUBLIC_CACHE } });
  } catch (err) {
    errors.capture(err, { route: "GET /api/images/[id]" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = UpdateImageInputSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.flatten() }, { status: HTTP.BAD_REQUEST });
    }
    const image = await imageService.update(ImageId.parse(id), body.data);
    return NextResponse.json(image);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: { code: "unauthorized" } }, { status: err.status });
    }
    errors.capture(err, { route: "PUT /api/images/[id]" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    await imageService.delete(ImageId.parse(id));
    return new NextResponse(null, { status: HTTP.NO_CONTENT });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: { code: "unauthorized" } }, { status: err.status });
    }
    errors.capture(err, { route: "DELETE /api/images/[id]" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}
