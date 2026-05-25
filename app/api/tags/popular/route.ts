import { NextResponse } from "next/server";
import { tagService } from "@/lib/services/tagService";
import { errors } from "@/lib/observability/errors";

export async function GET() {
  try {
    const tags = await tagService.listPopular(30);
    return NextResponse.json(tags);
  } catch (error) {
    errors.capture(error, { context: "GET /api/tags/popular" });
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}
