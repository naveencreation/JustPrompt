import { NextResponse } from "next/server";
import { adminService } from "@/lib/services/adminService";
import { HTTP } from "@/lib/constants/http";

// Called by Vercel Cron every minute.
// No-op on Tier 0 (in-memory cache flushes immediately on like write).
// Active on Tier 1+ (flushes Redis deltas → Postgres).
export async function GET() {
  await adminService.flushLikes();
  return NextResponse.json({ ok: true }, { status: HTTP.OK });
}
