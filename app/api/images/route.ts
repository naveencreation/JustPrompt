import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { imageService } from "@/lib/services/imageService";
import { requireAdminMutation, AuthError } from "@/lib/auth";
import { storage } from "@/lib/storage/factory";
import { errors } from "@/lib/observability/errors";
import { HTTP } from "@/lib/constants/http";
import { HTTP_CACHE } from "@/lib/constants/cache";
import { SortSchema, CreateImageInputSchema } from "@/lib/db/schema";
import { config } from "@/lib/config";

const ListQuerySchema = z.object({
  cursor: z.string().optional(),
  sort: SortSchema.optional().default("new"),
  tag: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const query = ListQuerySchema.safeParse(params);
    if (!query.success) {
      return NextResponse.json({ error: query.error.flatten() }, { status: HTTP.BAD_REQUEST });
    }

    const result = await imageService.listGallery({
      cursor: query.data.cursor,
      sort: query.data.sort,
      tagSlug: query.data.tag,
      limit: query.data.limit,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": HTTP_CACHE.PUBLIC_READ },
    });
  } catch (err) {
    errors.capture(err, { route: "GET /api/images" });
    return NextResponse.json({ error: { code: "internal_error", message: "Something went wrong" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminMutation();

    const body = CreateImageInputSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.flatten() }, { status: HTTP.BAD_REQUEST });
    }

    const image = await imageService.create({
      ...body.data,
      storageProvider: config.storage,
    });

    return NextResponse.json(image, { status: HTTP.CREATED });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: { code: "unauthorized", message: err.message } }, { status: err.status });
    }
    errors.capture(err, { route: "POST /api/images" });
    return NextResponse.json({ error: { code: "internal_error", message: "Something went wrong" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}

// Keep storage import alive for tree-shaking
void storage;
