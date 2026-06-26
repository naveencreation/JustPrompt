import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Config toggle for POST branch (config.storage) ─────────────────────────
let _storageMode = "supabase" as "supabase" | "cloudinary";

vi.mock("@/lib/config", () => ({
  config: { get storage() { return _storageMode; } },
}));

vi.mock("@/lib/services/imageService", () => ({
  imageService: {
    listGallery: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/services/likeService", () => ({
  likeService: {
    getBatch: vi.fn(),
  },
}));

vi.mock("@/lib/observability/errors", () => ({
  errors: { capture: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({
  AuthError: class AuthError extends Error {
    public readonly status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "AuthError";
      this.status = status;
    }
  },
  requireAdminMutation: vi.fn(),
}));

// ── Module under test ──────────────────────────────────────────────────────
const { GET, POST } = await import("@/app/api/images/route");

// ── Helpers ─────────────────────────────────────────────────────────────────
function req(url = "http://localhost:3000/api/images") {
  return new NextRequest(new URL(url));
}

beforeEach(() => {
  vi.clearAllMocks();
  _storageMode = "supabase";
});

// ────────────────────────────────────────────────────────────────────────────
// GET
// ────────────────────────────────────────────────────────────────────────────
describe("GET", () => {
  it("returns 200 with gallery and like counts (no params)", async () => {
    const items = [
      { id: "img-1", prompt: "test" },
    ];
    const { imageService } = await import("@/lib/services/imageService");
    const { likeService } = await import("@/lib/services/likeService");
    vi.mocked(imageService.listGallery).mockResolvedValue({ items, nextCursor: null });
    vi.mocked(likeService.getBatch).mockResolvedValue({ "img-1": 5 });

    const response = await GET(req());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      items,
      nextCursor: null,
      likeCounts: { "img-1": 5 },
    });
    expect(imageService.listGallery).toHaveBeenCalledWith({
      cursor: undefined,
      sort: "new",
      tagSlug: undefined,
      limit: undefined,
    });
  });

  it("passes cursor, sort, tag, and limit query params to the service", async () => {
    const { imageService } = await import("@/lib/services/imageService");
    const { likeService } = await import("@/lib/services/likeService");
    vi.mocked(imageService.listGallery).mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(likeService.getBatch).mockResolvedValue({});

    await GET(req("http://localhost:3000/api/images?cursor=abc123&sort=likes&tag=ai-art&limit=10"));

    expect(imageService.listGallery).toHaveBeenCalledWith({
      cursor: "abc123",
      sort: "likes",
      tagSlug: "ai-art",
      limit: 10,
    });
  });

  it("returns 400 for invalid query params", async () => {
    const response = await GET(req("http://localhost:3000/api/images?sort=invalid"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(body.error.fieldErrors).toBeDefined();
  });

  it("returns 500 when service throws", async () => {
    const { imageService } = await import("@/lib/services/imageService");
    const { errors } = await import("@/lib/observability/errors");
    const dbError = new Error("Database connection timeout");
    vi.mocked(imageService.listGallery).mockRejectedValue(dbError);

    const response = await GET(req());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: { code: "internal_error", message: "Something went wrong" },
    });
    expect(errors.capture).toHaveBeenCalledWith(dbError, { route: "GET /api/images" });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// POST
// ────────────────────────────────────────────────────────────────────────────
describe("POST", () => {
  const validPayload = {
    storageKey: "sk",
    storageProvider: "supabase",
    imageUrl: "https://cdn.example.com/img.jpg",
    width: 1024,
    height: 768,
    prompt: "A test image",
  };

  it("returns 201 with created image for a valid admin request", async () => {
    const { requireAdminMutation } = await import("@/lib/auth");
    const { imageService } = await import("@/lib/services/imageService");
    vi.mocked(requireAdminMutation).mockResolvedValue({ id: "admin-1" } as never);
    vi.mocked(imageService.create).mockResolvedValue({ id: "img-1", ...validPayload } as never);

    const request = new NextRequest(new URL("http://localhost:3000/api/images"), {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe("img-1");
    expect(imageService.create).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "A test image", storageProvider: "supabase" }),
    );
  });

  it("returns 400 for invalid body payload", async () => {
    const { requireAdminMutation } = await import("@/lib/auth");
    vi.mocked(requireAdminMutation).mockResolvedValue({ id: "admin-1" } as never);

    const request = new NextRequest(new URL("http://localhost:3000/api/images"), {
      method: "POST",
      body: JSON.stringify({ prompt: "missing required fields" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(body.error.fieldErrors).toBeDefined();
  });

  it("returns 401 when not authenticated", async () => {
    const { requireAdminMutation, AuthError } = await import("@/lib/auth");
    vi.mocked(requireAdminMutation).mockRejectedValue(new AuthError(401, "Authentication required"));

    const request = new NextRequest(new URL("http://localhost:3000/api/images"), {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: { code: "unauthorized", message: "Authentication required" },
    });
  });

  it("returns 429 when rate-limited", async () => {
    const { requireAdminMutation, AuthError } = await import("@/lib/auth");
    vi.mocked(requireAdminMutation).mockRejectedValue(new AuthError(429, "Too many admin requests"));

    const request = new NextRequest(new URL("http://localhost:3000/api/images"), {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({
      error: { code: "unauthorized", message: "Too many admin requests" },
    });
  });

  it("returns 500 when creation throws a non-auth error", async () => {
    const { requireAdminMutation } = await import("@/lib/auth");
    const { imageService } = await import("@/lib/services/imageService");
    const { errors } = await import("@/lib/observability/errors");
    vi.mocked(requireAdminMutation).mockResolvedValue({ id: "admin-1" } as never);
    const dbError = new Error("DB write failed");
    vi.mocked(imageService.create).mockRejectedValue(dbError);

    const request = new NextRequest(new URL("http://localhost:3000/api/images"), {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: { code: "internal_error", message: "Something went wrong" },
    });
    expect(errors.capture).toHaveBeenCalledWith(dbError, { route: "POST /api/images" });
  });
});
