import { type NextRequest, NextResponse } from "next/server";
import { metricService } from "@/lib/services/metricService";
import { errors } from "@/lib/observability/errors";
import { HTTP } from "@/lib/constants/http";
import { ImageId } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

// POST /api/metrics/copy/[id]
// Called client-side from CopyButton immediately after a successful clipboard write.
// No rate limiting — copying a prompt is not a spammable resource.
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await metricService.recordCopy(ImageId.parse(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    errors.capture(err, { route: "POST /api/metrics/copy/[id]" });
    return NextResponse.json(
      { error: { code: "internal_error" } },
      { status: HTTP.INTERNAL_SERVER_ERROR },
    );
  }
}
