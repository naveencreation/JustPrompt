import { type NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { HTTP } from "@/lib/constants/http";
import { CACHE_TAG } from "@/lib/constants/cache";
import { logger } from "@/lib/observability/logger";

const BodySchema = z.object({
  tag: z.enum(["gallery", "tags", "settings"]).optional(),
  slug: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (secret !== process.env["REVALIDATE_SECRET"]) {
    return NextResponse.json({ error: { code: "forbidden" } }, { status: HTTP.FORBIDDEN });
  }

  const body = BodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: HTTP.BAD_REQUEST });
  }

  if (body.data.slug) {
    revalidateTag(CACHE_TAG.IMAGE(body.data.slug), {});
  }
  if (body.data.tag) {
    revalidateTag(body.data.tag, {});
  }
  if (!body.data.tag && !body.data.slug) {
    // Revalidate everything
    revalidateTag(CACHE_TAG.GALLERY, {});
    revalidateTag(CACHE_TAG.TAGS, {});
    revalidateTag(CACHE_TAG.SETTINGS, {});
  }

  logger.info("cache.revalidated", { tag: body.data.tag, slug: body.data.slug });
  return NextResponse.json({ revalidated: true });
}
