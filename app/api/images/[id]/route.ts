import { type NextRequest, NextResponse } from "next/server";
import { imageService } from "@/lib/services/imageService";
import { requireAdminMutation, AuthError } from "@/lib/auth";
import { errors } from "@/lib/observability/errors";
import { HTTP } from "@/lib/constants/http";
import { HTTP_CACHE } from "@/lib/constants/cache";
import { ImageId, UpdateImageInputSchema } from "@/lib/db/schema";
import { tagService } from "@/lib/services/tagService";
import { likeService } from "@/lib/services/likeService";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const UpdatePayloadSchema = UpdateImageInputSchema.extend({
  likes: z.number().int().nonnegative().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const imageId = ImageId.parse(id);
    const image = await imageService.getById(imageId);
    if (!image) return NextResponse.json({ error: { code: "not_found" } }, { status: HTTP.NOT_FOUND });
    
    const [tags, likes] = await Promise.all([
      tagService.listByImage(imageId),
      likeService.getCount(imageId),
    ]);

    return NextResponse.json(
      {
        ...image,
        tags: tags.map((t) => t.name),
        likes,
      },
      { headers: { "Cache-Control": HTTP_CACHE.PUBLIC_READ } }
    );
  } catch (err) {
    errors.capture(err, { route: "GET /api/images/[id]" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdminMutation();
    const { id } = await params;
    const imageId = ImageId.parse(id);
    const body = UpdatePayloadSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.flatten() }, { status: HTTP.BAD_REQUEST });
    }
    
    const { likes, ...rest } = body.data;

    if (likes !== undefined) {
      await likeService.setLikeCount(imageId, likes);
    }

    const image = await imageService.update(imageId, rest);
    
    const [tags, currentLikes] = await Promise.all([
      tagService.listByImage(imageId),
      likeService.getCount(imageId),
    ]);

    return NextResponse.json({
      ...image,
      tags: tags.map((t) => t.name),
      likes: currentLikes,
    });
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
    await requireAdminMutation();
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
