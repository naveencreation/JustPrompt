import { type NextRequest, NextResponse } from "next/server";
import { adminService } from "@/lib/services/adminService";
import { metricService } from "@/lib/services/metricService";
import { HTTP } from "@/lib/constants/http";
import { errors } from "@/lib/observability/errors";

// Called by Vercel Cron every minute.
// No-op on Tier 0 (in-memory cache flushes immediately on write).
// Active on Tier 1+ (flushes Redis deltas → Postgres).
//
// Protected by CRON_SECRET env var — Vercel Cron passes it as a Bearer token
// in the Authorization header. Without a match, the route refuses to run.

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;

  if (!auth || auth !== expected) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid or missing cron secret" } },
      { status: HTTP.UNAUTHORIZED },
    );
  }

  try {
    await Promise.all([
      adminService.flushLikes(),
      metricService.flushAllCopies(),
    ]);
    return NextResponse.json({ ok: true }, { status: HTTP.OK });
  } catch (err) {
    errors.capture(err, { route: "GET /api/cron/flush-likes" });
    return NextResponse.json(
      { error: { code: "internal_error", message: "Cron flush failed" } },
      { status: HTTP.INTERNAL_SERVER_ERROR },
    );
  }
}

