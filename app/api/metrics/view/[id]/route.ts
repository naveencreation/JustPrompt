import { type NextRequest, NextResponse } from "next/server";
import { metricService } from "@/lib/services/metricService";
import { errors } from "@/lib/observability/errors";
import { HTTP } from "@/lib/constants/http";
import { ImageId } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

// POST /api/metrics/view/[id]
// Called client-side from the ViewTracker component on /p/[slug] page mount.
// Firing client-side (not server-side) prevents double-counting from
// SSR, preloading, and search engine crawlers.
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await metricService.recordView(ImageId.parse(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    errors.capture(err, { route: "POST /api/metrics/view/[id]" });
    return NextResponse.json(
      { error: { code: "internal_error" } },
      { status: HTTP.INTERNAL_SERVER_ERROR },
    );
  }
}
