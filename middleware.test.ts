import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  next: vi.fn(),
  redirect: vi.fn(),
  rewrite: vi.fn(),
  getUser: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    NextResponse: {
      next: (...args: unknown[]) => mocks.next(...args),
      redirect: (...args: unknown[]) => mocks.redirect(...args),
      rewrite: (...args: unknown[]) => mocks.rewrite(...args),
    },
  };
});

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mocks.createServerClient(...args),
}));

// ── Config toggle ──────────────────────────────────────────────────────────
let _serviceRoleKey = "test-service-role-key";

vi.mock("@/lib/config", () => ({
  config: {
    supabase: {
      url: "https://test.supabase.co",
      anonKey: "test-anon-key",
      get serviceRoleKey() { return _serviceRoleKey; },
    },
  },
}));

function req(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${pathname}`));
}

function stubSupabase(user: { id: string } | null) {
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
  mocks.createServerClient.mockReturnValue({
    auth: { getUser: mocks.getUser },
  });
}

function stubMaintenanceMode(enabled: boolean) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    json: async () => [{ maintenance_mode: enabled }],
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  _serviceRoleKey = "test-service-role-key";
  mocks.next.mockReturnValue({ cookies: { set: vi.fn() } });
  mocks.redirect.mockImplementation((url: URL) => ({ status: 307, url }));
  mocks.rewrite.mockImplementation((url: URL) => ({ status: 200, url }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Each describe block uses a fresh module import so the module-level
// maintenanceCacheValue variable does not leak between groups.

// ────────────────────────────────────────────────────────────────────────────
describe("public routes", () => {
  it("allows /explore through", async () => {
const { proxy } = await import("@/proxy");
    _serviceRoleKey = "";
    stubSupabase(null);
    await proxy(req("/explore"));
    expect(mocks.next).toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.rewrite).not.toHaveBeenCalled();
  });

  it("allows /p/some-slug through", async () => {
    const { proxy } = await import("@/proxy");
    _serviceRoleKey = "";
    stubSupabase(null);
    await proxy(req("/p/a-test-image"));
    expect(mocks.next).toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("allows /api/images through", async () => {
    const { proxy } = await import("@/proxy");
    _serviceRoleKey = "";
    stubSupabase(null);
    await proxy(req("/api/images"));
    expect(mocks.next).toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.rewrite).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe("maintenance mode", () => {
  it("rewrites public routes to /maintenance when enabled", async () => {
    const { proxy } = await import("@/proxy");
    stubSupabase(null);
    stubMaintenanceMode(true);
    await proxy(req("/explore"));
    expect(mocks.rewrite).toHaveBeenCalledTimes(1);
    const rewriteArg = mocks.rewrite.mock.calls[0][0] as URL;
    expect(rewriteArg.pathname).toBe("/maintenance");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("does NOT rewrite /maintenance itself", async () => {
    const { proxy } = await import("@/proxy");
    stubSupabase(null);
    stubMaintenanceMode(true);
    await proxy(req("/maintenance"));
    expect(mocks.next).toHaveBeenCalled();
    expect(mocks.rewrite).not.toHaveBeenCalled();
  });

  it("does NOT rewrite /admin routes", async () => {
    const { proxy } = await import("@/proxy");
    stubSupabase(null);
    stubMaintenanceMode(true);
    await proxy(req("/admin/dashboard"));
    expect(mocks.redirect).toHaveBeenCalled();
    expect(mocks.rewrite).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe("/admin/login (unauthenticated)", () => {
  it("allows through when no user is logged in", async () => {
    const { proxy } = await import("@/proxy");
    stubSupabase(null);
    stubMaintenanceMode(false);
    await proxy(req("/admin/login"));
    expect(mocks.next).toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe("/admin/login (authenticated)", () => {
  it("redirects to /admin/dashboard when user is already logged in", async () => {
    const { proxy } = await import("@/proxy");
    stubSupabase({ id: "admin-1" });
    stubMaintenanceMode(false);
    await proxy(req("/admin/login"));
    expect(mocks.redirect).toHaveBeenCalledTimes(1);
    const redirectArg = mocks.redirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe("/admin/dashboard");
    expect(mocks.rewrite).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe("/admin/dashboard (unauthenticated)", () => {
  it("redirects to /admin/login with redirectTo param", async () => {
    const { proxy } = await import("@/proxy");
    stubSupabase(null);
    stubMaintenanceMode(false);
    await proxy(req("/admin/dashboard"));
    expect(mocks.redirect).toHaveBeenCalledTimes(1);
    const redirectArg = mocks.redirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe("/admin/login");
    expect(redirectArg.searchParams.get("redirectTo")).toBe("/admin/dashboard");
    expect(mocks.rewrite).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe("/admin/dashboard (authenticated)", () => {
  it("allows through when user is logged in", async () => {
    const { proxy } = await import("@/proxy");
    stubSupabase({ id: "admin-1" });
    stubMaintenanceMode(false);
    await proxy(req("/admin/dashboard"));
    expect(mocks.next).toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("allows /admin/settings through for authenticated users", async () => {
    const { proxy } = await import("@/proxy");
    stubSupabase({ id: "admin-1" });
    stubMaintenanceMode(false);
    await proxy(req("/admin/settings"));
    expect(mocks.next).toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
