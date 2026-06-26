import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock all service dependencies ──────────────────────────────────────────
vi.mock("@/lib/services/adminService", () => ({
  adminService: { flushLikes: vi.fn() },
}));

vi.mock("@/lib/services/metricService", () => ({
  metricService: { flushAllCopies: vi.fn() },
}));

vi.mock("@/lib/observability/errors", () => ({
  errors: { capture: vi.fn() },
}));

// ── Module under test ──────────────────────────────────────────────────────
const { GET } = await import("@/app/api/cron/flush-likes/route");

// ── Helpers ─────────────────────────────────────────────────────────────────
const CRON_SECRET = "super-secret-cron-token";
const VALID_AUTH = `Bearer ${CRON_SECRET}`;

function req(authHeader?: string) {
  const url = new URL("http://localhost:3000/api/cron/flush-likes");
  const headers: Record<string, string> = {};
  if (authHeader) headers["Authorization"] = authHeader;
  return new NextRequest(url, { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", CRON_SECRET);
});

// ────────────────────────────────────────────────────────────────────────────
// Authorization guards
// ────────────────────────────────────────────────────────────────────────────
describe("authorization", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const response = await GET(req());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: { code: "unauthorized", message: "Invalid or missing cron secret" },
    });
  });

  it("returns 401 when Authorization header has an invalid token", async () => {
    const response = await GET(req("Bearer wrong-token"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: { code: "unauthorized", message: "Invalid or missing cron secret" },
    });
  });

  it("returns 200 when Authorization header matches CRON_SECRET", async () => {
    const { adminService } = await import("@/lib/services/adminService");
    const { metricService } = await import("@/lib/services/metricService");
    vi.mocked(adminService.flushLikes).mockResolvedValue(undefined);
    vi.mocked(metricService.flushAllCopies).mockResolvedValue(undefined);

    const response = await GET(req(VALID_AUTH));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Execution — happy path
// ────────────────────────────────────────────────────────────────────────────
describe("execution", () => {
  it("calls both flush services on valid auth", async () => {
    const { adminService } = await import("@/lib/services/adminService");
    const { metricService } = await import("@/lib/services/metricService");
    vi.mocked(adminService.flushLikes).mockResolvedValue(undefined);
    vi.mocked(metricService.flushAllCopies).mockResolvedValue(undefined);

    await GET(req(VALID_AUTH));

    expect(adminService.flushLikes).toHaveBeenCalledTimes(1);
    expect(metricService.flushAllCopies).toHaveBeenCalledTimes(1);
  });

  it("returns 500 and logs when flushLikes throws", async () => {
    const { adminService } = await import("@/lib/services/adminService");
    const { metricService } = await import("@/lib/services/metricService");
    const { errors } = await import("@/lib/observability/errors");
    const flushError = new Error("DB timeout");
    vi.mocked(adminService.flushLikes).mockRejectedValue(flushError);
    vi.mocked(metricService.flushAllCopies).mockResolvedValue(undefined);

    const response = await GET(req(VALID_AUTH));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: { code: "internal_error", message: "Cron flush failed" },
    });
    expect(errors.capture).toHaveBeenCalledWith(flushError, {
      route: "GET /api/cron/flush-likes",
    });
  });

  it("returns 500 and logs when flushAllCopies throws", async () => {
    const { adminService } = await import("@/lib/services/adminService");
    const { metricService } = await import("@/lib/services/metricService");
    const { errors } = await import("@/lib/observability/errors");
    const flushError = new Error("Redis unreachable");
    vi.mocked(adminService.flushLikes).mockResolvedValue(undefined);
    vi.mocked(metricService.flushAllCopies).mockRejectedValue(flushError);

    const response = await GET(req(VALID_AUTH));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(errors.capture).toHaveBeenCalledWith(flushError, {
      route: "GET /api/cron/flush-likes",
    });
  });
});
