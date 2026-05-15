import { type NextRequest, NextResponse } from "next/server";
import { likeService } from "@/lib/services/likeService";
import { errors } from "@/lib/observability/errors";
import { HTTP } from "@/lib/constants/http";
import { ImageId } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const result = await likeService.like(ImageId.parse(id), ip);

    if (!result.ok) {
      return NextResponse.json(
        { error: { code: "rate_limited", message: "Too many likes" }, count: result.count },
        { status: HTTP.TOO_MANY_REQUESTS },
      );
    }

    return NextResponse.json({ count: result.count });
  } catch (err) {
    errors.capture(err, { route: "POST /api/like/[id]" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}
