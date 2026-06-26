import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Image, ImageId, Cursor } from "@/lib/db/schema";
import type { ImageRow } from "@/lib/repos/imageRepo";

// ── Hoisted mocks (available inside vi.mock factories) ──────────────────────
const mocks = vi.hoisted(() => ({
  imageRepo: {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    listPublished: vi.fn(),
    listAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateOrder: vi.fn(),
    delete: vi.fn(),
    listRelated: vi.fn(),
    count: vi.fn(),
  },
  tagRepo: {
    findOrCreate: vi.fn(),
    attachToImage: vi.fn(),
    detachAllFromImage: vi.fn(),
    findBySlug: vi.fn(),
    listByImage: vi.fn(),
    popular: vi.fn(),
  },
  cache: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
  },
  storage: {
    signedUploadUrl: vi.fn(),
    delete: vi.fn(),
    deleteMultiple: vi.fn(),
    publicUrl: vi.fn(),
  },
  searchSync: {
    index: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  errors: {
    capture: vi.fn(),
  },
  revalidateTag: vi.fn(),
  generateSlug: vi.fn(),
  decodeCursor: vi.fn(),
}));

// ── Mock all dependencies ──────────────────────────────────────────────────
vi.mock("@/lib/repos/imageRepo", () => ({ imageRepo: mocks.imageRepo }));
vi.mock("@/lib/repos/tagRepo", () => ({ tagRepo: mocks.tagRepo }));
vi.mock("@/lib/cache/factory", () => ({ cache: mocks.cache }));
vi.mock("@/lib/storage/factory", () => ({ storage: mocks.storage }));
vi.mock("@/lib/search/sync", () => ({ searchSync: mocks.searchSync }));
vi.mock("@/lib/observability/logger", () => ({ logger: mocks.logger }));
vi.mock("@/lib/observability/errors", () => ({ errors: mocks.errors }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/lib/utils/slug", () => ({ generateSlug: mocks.generateSlug }));
vi.mock("@/lib/utils/cursor", () => ({ decodeCursor: mocks.decodeCursor }));

// ── Module under test (loaded after mocks are active) ──────────────────────
const { imageService } = await import("@/lib/services/imageService");

// ── Helpers ─────────────────────────────────────────────────────────────────
const ID = "00000000-0000-0000-0000-000000000001" as ImageId;
const TAG_ID = 1;
const FAKE_CURSOR = "eyJjcmVhdGVkQXQiOiIyMDI1LTAxLTAxVDAwOjAwOjAwLjAwMFoiLCJpZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSJ9";

function image(overrides: Partial<Image> = {}): Image {
  return {
    id: ID,
    slug: "a-test-image",
    storageKey: "test-key",
    storageProvider: "supabase",
    imageUrl: "https://example.com/img.jpg",
    width: 1024,
    height: 768,
    prompt: "a test image",
    description: null,
    model: "flux",
    isPublished: true,
    isFeatured: false,
    displayOrder: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function row(overrides: Partial<ImageRow> = {}): ImageRow {
  return {
    id: ID,
    slug: "a-test-image",
    storage_key: "test-key",
    storage_provider: "supabase",
    image_url: "https://example.com/img.jpg",
    width: 1024,
    height: 768,
    prompt: "a test image",
    description: null,
    model: "flux",
    is_published: true,
    is_featured: false,
    display_order: 0,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function decodedCursor(): Cursor {
  return { createdAt: "2025-01-01T00:00:00.000Z", id: ID };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Restore default resolved values cleared by clearAllMocks
  mocks.searchSync.index.mockResolvedValue(undefined);
  mocks.searchSync.remove.mockResolvedValue(undefined);
  mocks.cache.keys.mockResolvedValue([]);
});

// ── listGallery ─────────────────────────────────────────────────────────────
describe("listGallery", () => {
  const galleryResult = { items: [image()], nextCursor: null };

  it("returns cached result on cache hit", async () => {
    mocks.cache.get.mockResolvedValue(galleryResult);

    const result = await imageService.listGallery();

    expect(result).toEqual(galleryResult);
    expect(mocks.cache.get).toHaveBeenCalledWith("gallery:new::start");
    expect(mocks.imageRepo.listPublished).not.toHaveBeenCalled();
  });

  it("fetches and caches on cache miss", async () => {
    mocks.cache.get.mockResolvedValue(null);
    mocks.imageRepo.listPublished.mockResolvedValue(galleryResult);

    const result = await imageService.listGallery();

    expect(result).toEqual(galleryResult);
    expect(mocks.imageRepo.listPublished).toHaveBeenCalledWith({
      before: null, sort: "new", tagSlug: undefined, limit: undefined,
    });
    expect(mocks.cache.set).toHaveBeenCalledWith(
      "gallery:new::start",
      galleryResult,
      expect.any(Number),
    );
  });

  it("passes sort, tagSlug, cursor to the repo", async () => {
    mocks.cache.get.mockResolvedValue(null);
    mocks.imageRepo.listPublished.mockResolvedValue(galleryResult);
    mocks.decodeCursor.mockReturnValue(decodedCursor());

    await imageService.listGallery({
      sort: "likes",
      tagSlug: "ai-art",
      cursor: FAKE_CURSOR,
      limit: 20,
    });

    expect(mocks.cache.get).toHaveBeenCalledWith("gallery:likes:ai-art:" + FAKE_CURSOR);
    expect(mocks.decodeCursor).toHaveBeenCalledWith(FAKE_CURSOR);
    expect(mocks.imageRepo.listPublished).toHaveBeenCalledWith({
      before: decodedCursor(),
      sort: "likes",
      tagSlug: "ai-art",
      limit: 20,
    });
  });

  it("returns empty list when no images match", async () => {
    const empty = { items: [] as Image[], nextCursor: null };
    mocks.cache.get.mockResolvedValue(null);
    mocks.imageRepo.listPublished.mockResolvedValue(empty);

    const result = await imageService.listGallery({ tagSlug: "nonexistent" });

    expect(result).toEqual(empty);
  });
});

// ── getBySlug ──────────────────────────────────────────────────────────────
describe("getBySlug", () => {
  const img = image();

  it("returns cached image on cache hit", async () => {
    mocks.cache.get.mockResolvedValue(img);

    const result = await imageService.getBySlug("a-test-image");

    expect(result).toEqual(img);
    expect(mocks.imageRepo.findBySlug).not.toHaveBeenCalled();
  });

  it("fetches and caches on cache miss (image found)", async () => {
    mocks.cache.get.mockResolvedValue(null);
    mocks.imageRepo.findBySlug.mockResolvedValue(img);

    const result = await imageService.getBySlug("a-test-image");

    expect(result).toEqual(img);
    expect(mocks.cache.set).toHaveBeenCalledWith(
      "image:slug:a-test-image",
      img,
      expect.any(Number),
    );
  });

  it("does NOT cache when image not found", async () => {
    mocks.cache.get.mockResolvedValue(null);
    mocks.imageRepo.findBySlug.mockResolvedValue(null);

    const result = await imageService.getBySlug("missing");

    expect(result).toBeNull();
    expect(mocks.cache.set).not.toHaveBeenCalled();
  });
});

// ── getById ────────────────────────────────────────────────────────────────
describe("getById", () => {
  it("returns image when found", async () => {
    mocks.imageRepo.findById.mockResolvedValue(image());

    const result = await imageService.getById(ID);

    expect(result).toEqual(image());
    expect(mocks.imageRepo.findById).toHaveBeenCalledWith(ID);
  });

  it("returns null when not found", async () => {
    mocks.imageRepo.findById.mockResolvedValue(null);

    const result = await imageService.getById(ID);

    expect(result).toBeNull();
  });
});

// ── listAll ─────────────────────────────────────────────────────────────────
describe("listAll", () => {
  it("returns list from repo with default options", async () => {
    mocks.imageRepo.listAll.mockResolvedValue([image()]);

    const result = await imageService.listAll();

    expect(result).toHaveLength(1);
    expect(mocks.imageRepo.listAll).toHaveBeenCalledWith({});
  });

  it("filters by status and tagSlug", async () => {
    mocks.imageRepo.listAll.mockResolvedValue([]);

    await imageService.listAll({ status: "draft", tagSlug: "ai" });

    expect(mocks.imageRepo.listAll).toHaveBeenCalledWith({
      status: "draft",
      tagSlug: "ai",
    });
  });
});

// ── create ──────────────────────────────────────────────────────────────────
describe("create", () => {
  const newImage = image({ slug: "generated-slug" });
  const tagData = { id: TAG_ID, name: "test", slug: "test" };

  it("creates image with auto-generated slug when slug not provided", async () => {
    mocks.imageRepo.create.mockResolvedValue(newImage);
    mocks.generateSlug.mockReturnValue("generated-slug");

    const result = await imageService.create({
      storageKey: "key",
      storageProvider: "supabase",
      imageUrl: "https://example.com/img.jpg",
      width: 1024,
      height: 768,
      prompt: "a test image",
    });

    expect(result).toEqual(newImage);
    expect(mocks.imageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "generated-slug" }),
    );
  });

  it("uses provided slug when given", async () => {
    mocks.imageRepo.create.mockResolvedValue(image({ slug: "custom-slug" }));

    await imageService.create({
      storageKey: "key",
      storageProvider: "supabase",
      imageUrl: "https://example.com/img.jpg",
      width: 1024,
      height: 768,
      prompt: "a test image",
      slug: "custom-slug",
    });

    expect(mocks.generateSlug).not.toHaveBeenCalled();
    expect(mocks.imageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "custom-slug" }),
    );
  });

  it("attaches tags when provided", async () => {
    mocks.imageRepo.create.mockResolvedValue(newImage);
    mocks.tagRepo.findOrCreate.mockResolvedValue(tagData);

    await imageService.create({
      storageKey: "key",
      storageProvider: "supabase",
      imageUrl: "https://example.com/img.jpg",
      width: 1024,
      height: 768,
      prompt: "a test image",
      tags: ["test"],
    });

    expect(mocks.tagRepo.findOrCreate).toHaveBeenCalledWith("test");
    expect(mocks.tagRepo.attachToImage).toHaveBeenCalledWith(ID, [TAG_ID]);
  });

  it("does NOT attach tags when none provided", async () => {
    mocks.imageRepo.create.mockResolvedValue(newImage);

    await imageService.create({
      storageKey: "key",
      storageProvider: "supabase",
      imageUrl: "https://example.com/img.jpg",
      width: 1024,
      height: 768,
      prompt: "a test image",
    });

    expect(mocks.tagRepo.findOrCreate).not.toHaveBeenCalled();
    expect(mocks.tagRepo.attachToImage).not.toHaveBeenCalled();
  });

  it("revalidates cache when published", async () => {
    mocks.imageRepo.create.mockResolvedValue(newImage);
    mocks.cache.keys.mockResolvedValue([]);

    await imageService.create({
      storageKey: "key",
      storageProvider: "supabase",
      imageUrl: "https://example.com/img.jpg",
      width: 1024,
      height: 768,
      prompt: "a test image",
    });

    expect(mocks.revalidateTag).toHaveBeenCalled();
    expect(mocks.cache.keys).toHaveBeenCalledWith("gallery:*");
  });

  it("does NOT revalidate when draft", async () => {
    mocks.imageRepo.create.mockResolvedValue(image({ isPublished: false }));
    mocks.generateSlug.mockReturnValue("draft-slug");

    await imageService.create({
      storageKey: "key",
      storageProvider: "supabase",
      imageUrl: "https://example.com/img.jpg",
      width: 1024,
      height: 768,
      prompt: "a draft image",
      isPublished: false,
    });

    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    expect(mocks.cache.keys).not.toHaveBeenCalled();
  });

  it("logs search sync failure without throwing", async () => {
    const searchErr = new Error("Search down");
    mocks.imageRepo.create.mockResolvedValue(newImage);
    mocks.searchSync.index.mockRejectedValue(searchErr);
    mocks.cache.keys.mockResolvedValue([]);

    await expect(
      imageService.create({
        storageKey: "key",
        storageProvider: "supabase",
        imageUrl: "https://example.com/img.jpg",
        width: 1024,
        height: 768,
        prompt: "a test image",
      }),
    ).resolves.toBeDefined();

    expect(mocks.errors.capture).toHaveBeenCalledWith(searchErr, {
      op: "image.create.search_index",
      imageId: ID,
    });
  });
});

// ── update ──────────────────────────────────────────────────────────────────
describe("update", () => {
  const updated = image({ prompt: "updated" });

  it("updates image and syncs to search", async () => {
    mocks.imageRepo.update.mockResolvedValue(updated);

    await imageService.update(ID, { prompt: "updated" });

    expect(mocks.imageRepo.update).toHaveBeenCalledWith(ID, { prompt: "updated" });
    expect(mocks.searchSync.index).toHaveBeenCalledWith(updated);
    expect(mocks.cache.del).toHaveBeenCalledWith("image:slug:a-test-image");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("gallery");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("image:a-test-image");
  });

  it("re-attaches tags when tags field is provided (empty array)", async () => {
    mocks.imageRepo.update.mockResolvedValue(updated);

    await imageService.update(ID, { tags: [] });

    expect(mocks.tagRepo.detachAllFromImage).toHaveBeenCalledWith(ID);
    expect(mocks.tagRepo.findOrCreate).not.toHaveBeenCalled();
    expect(mocks.tagRepo.attachToImage).not.toHaveBeenCalled();
  });

  it("re-attaches tags when tags field is provided (non-empty)", async () => {
    mocks.imageRepo.update.mockResolvedValue(updated);
    mocks.tagRepo.findOrCreate
      .mockResolvedValueOnce({ id: 1, name: "ai", slug: "ai" })
      .mockResolvedValueOnce({ id: 2, name: "art", slug: "art" });

    await imageService.update(ID, { tags: ["ai", "art"] });

    expect(mocks.tagRepo.detachAllFromImage).toHaveBeenCalledWith(ID);
    expect(mocks.tagRepo.findOrCreate).toHaveBeenCalledTimes(2);
    expect(mocks.tagRepo.attachToImage).toHaveBeenCalledWith(ID, [1, 2]);
  });

  it("does NOT touch tags when tags field is omitted", async () => {
    mocks.imageRepo.update.mockResolvedValue(updated);

    await imageService.update(ID, { prompt: "new prompt" });

    expect(mocks.tagRepo.detachAllFromImage).not.toHaveBeenCalled();
    expect(mocks.tagRepo.attachToImage).not.toHaveBeenCalled();
  });

  it("swallows search sync failure", async () => {
    const searchErr = new Error("Search down");
    mocks.imageRepo.update.mockResolvedValue(updated);
    mocks.searchSync.index.mockRejectedValue(searchErr);

    await expect(imageService.update(ID, { prompt: "updated" })).resolves.toBeDefined();

    expect(mocks.errors.capture).toHaveBeenCalledWith(searchErr, {
      op: "image.update.search_index",
      imageId: ID,
    });
  });
});

// ── updateOrder ─────────────────────────────────────────────────────────────
describe("updateOrder", () => {
  it("passes updates to repo and revalidates", async () => {
    const updates = [{ id: ID, displayOrder: 1 }];
    mocks.cache.keys.mockResolvedValue([]);

    await imageService.updateOrder(updates);

    expect(mocks.imageRepo.updateOrder).toHaveBeenCalledWith(updates);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("gallery");
    expect(mocks.cache.keys).toHaveBeenCalledWith("gallery:*");
  });
});

// ── delete ──────────────────────────────────────────────────────────────────
describe("delete", () => {
  const img = image({ slug: "to-delete" });

  it("deletes storage, DB, search index and cache", async () => {
    mocks.imageRepo.findById.mockResolvedValue(img);
    mocks.cache.keys.mockResolvedValue([]);

    await imageService.delete(ID);

    expect(mocks.storage.delete).toHaveBeenCalledWith(img.storageKey);
    expect(mocks.imageRepo.delete).toHaveBeenCalledWith(ID);
    expect(mocks.searchSync.remove).toHaveBeenCalledWith(ID);
    expect(mocks.cache.del).toHaveBeenCalledWith("image:slug:to-delete");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("gallery");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("image:to-delete");
    expect(mocks.cache.keys).toHaveBeenCalledWith("gallery:*");
  });

  it("does nothing when image is not found", async () => {
    mocks.imageRepo.findById.mockResolvedValue(null);

    await imageService.delete(ID);

    expect(mocks.storage.delete).not.toHaveBeenCalled();
    expect(mocks.imageRepo.delete).not.toHaveBeenCalled();
  });

  it("continues when storage delete fails", async () => {
    const storageErr = new Error("Storage unreachable");
    mocks.imageRepo.findById.mockResolvedValue(img);
    mocks.storage.delete.mockRejectedValue(storageErr);
    mocks.cache.keys.mockResolvedValue([]);

    await imageService.delete(ID);

    expect(mocks.errors.capture).toHaveBeenCalledWith(storageErr, {
      op: "image.delete.storage",
      imageId: ID,
    });
    expect(mocks.imageRepo.delete).toHaveBeenCalledWith(ID);
  });

  it("swallows search index remove failure", async () => {
    mocks.imageRepo.findById.mockResolvedValue(img);
    mocks.searchSync.remove.mockRejectedValue(new Error("Search down"));
    mocks.cache.keys.mockResolvedValue([]);

    await expect(imageService.delete(ID)).resolves.toBeUndefined();

    expect(mocks.errors.capture).toHaveBeenCalled();
  });
});

// ── getRelated ──────────────────────────────────────────────────────────────
describe("getRelated", () => {
  const tagIds = [1, 2];
  const relatedImages = [image({ id: "00000000-0000-0000-0000-000000000002" as ImageId })];

  it("returns cached related on cache hit", async () => {
    mocks.cache.get.mockResolvedValue(relatedImages);

    const result = await imageService.getRelated(ID, tagIds);

    expect(result).toEqual(relatedImages);
    expect(mocks.imageRepo.listRelated).not.toHaveBeenCalled();
  });

  it("fetches and caches related images", async () => {
    mocks.cache.get.mockResolvedValue(null);
    mocks.imageRepo.listRelated.mockResolvedValue(relatedImages);

    const result = await imageService.getRelated(ID, tagIds);

    expect(result).toEqual(relatedImages);
    expect(mocks.imageRepo.listRelated).toHaveBeenCalledWith({
      currentImageId: ID,
      tagIds,
      limit: 6,
    });
    expect(mocks.cache.set).toHaveBeenCalledWith(
      "related:00000000-0000-0000-0000-000000000001",
      relatedImages,
      expect.any(Number),
    );
  });

  it("falls back to listPublished when listRelated returns empty", async () => {
    const fallback = [image()];
    mocks.cache.get.mockResolvedValue(null);
    mocks.imageRepo.listRelated.mockResolvedValue([]);
    mocks.imageRepo.listPublished.mockResolvedValue({ items: fallback, nextCursor: null });

    const result = await imageService.getRelated(ID, tagIds, 10);

    expect(result).toEqual(fallback);
    expect(mocks.imageRepo.listPublished).toHaveBeenCalledWith({
      limit: 10,
      excludeId: ID,
    });
  });

  it("uses custom limit", async () => {
    mocks.cache.get.mockResolvedValue(null);
    mocks.imageRepo.listRelated.mockResolvedValue(relatedImages);

    await imageService.getRelated(ID, tagIds, 4);

    expect(mocks.imageRepo.listRelated).toHaveBeenCalledWith({
      currentImageId: ID,
      tagIds,
      limit: 4,
    });
  });
});

// ── getAdminStats ──────────────────────────────────────────────────────────
describe("getAdminStats", () => {
  it("returns totalImages from repo and hardcoded totalLikes", async () => {
    mocks.imageRepo.count.mockResolvedValue(42);

    const result = await imageService.getAdminStats();

    expect(result).toEqual({ totalImages: 42, totalLikes: 0 });
  });
});
