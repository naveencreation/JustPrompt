import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/client";
import { config } from "@/lib/config";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  // DB check
  try {
    const supabase = createAdminClient();
    await supabase.from("settings").select("id").eq("id", 1).single();
    checks["database"] = "ok";
  } catch {
    checks["database"] = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", checks, tier: config.cache },
    { status: allOk ? 200 : 503 },
  );
}
