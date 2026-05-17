import { NextResponse } from "next/server";
import { adminService } from "@/lib/services/adminService";
import { metricService } from "@/lib/services/metricService";
import { HTTP } from "@/lib/constants/http";

// Called by Vercel Cron every minute.
// No-op on Tier 0 (in-memory cache flushes immediately on write).
// Active on Tier 1+ (flushes Redis deltas → Postgres).
export async function GET() {
  await Promise.all([
    adminService.flushLikes(),
    metricService.flushAllCopies(),
  ]);
  return NextResponse.json({ ok: true }, { status: HTTP.OK });
}

