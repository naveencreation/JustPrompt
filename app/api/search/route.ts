import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchService } from "@/lib/services/searchService";
import { errors } from "@/lib/observability/errors";
import { HTTP } from "@/lib/constants/http";
import { HTTP_CACHE } from "@/lib/constants/cache";

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const query = SearchQuerySchema.safeParse(params);
    if (!query.success) {
      return NextResponse.json({ error: query.error.flatten() }, { status: HTTP.BAD_REQUEST });
    }

    const searchResponse = await searchService.query(query.data.q, {
      cursor: query.data.cursor,
      limit: query.data.limit,
    });

    return NextResponse.json(searchResponse, {
      headers: { "Cache-Control": HTTP_CACHE.PUBLIC_READ },
    });
  } catch (err) {
    errors.capture(err, { route: "GET /api/search" });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: HTTP.INTERNAL_SERVER_ERROR });
  }
}
