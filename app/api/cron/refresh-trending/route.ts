import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/lib/constants/cache";
import { logger } from "@/lib/observability/logger";
import { HTTP } from "@/lib/constants/http";

export async function GET() {
  revalidateTag(CACHE_TAG.GALLERY, {});
  logger.info("cron.trending_refreshed");
  return NextResponse.json({ ok: true }, { status: HTTP.OK });
}
