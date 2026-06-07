import { NextResponse } from "next/server";
import { revalidateTag as _revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/lib/constants/cache";
import { logger } from "@/lib/observability/logger";
import { HTTP } from "@/lib/constants/http";

// Next.js 15 types require a second `profile` argument that we don't use.
const revalidateTag = _revalidateTag as (tag: string) => void;

export async function GET() {
  revalidateTag(CACHE_TAG.GALLERY);
  logger.info("cron.trending_refreshed");
  return NextResponse.json({ ok: true }, { status: HTTP.OK });
}
