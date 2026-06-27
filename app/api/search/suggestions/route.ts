import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tagService } from "@/lib/services/tagService";
import { HTTP } from "@/lib/constants/http";

const QuerySchema = z.object({
  q: z.string().min(1).max(100),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = QuerySchema.safeParse({ q: searchParams.get("q") });
  if (!parsed.success) {
    return NextResponse.json({ tags: [] }, { status: HTTP.OK });
  }

  const tags = await tagService.suggest(parsed.data.q);
  return NextResponse.json(
    { tags },
    {
      status: HTTP.OK,
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60" },
    },
  );
}
