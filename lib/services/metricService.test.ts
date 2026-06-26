import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ImageId } from "@/lib/db/schema";

// ── Hoisted mocks ──────────────────────────────────────────────────────────
/**
 * Cache mode toggle — accessed via a getter on the mocked config so both
 * branches (memory / redis) can be tested without re-importing the module.
 */
let _cacheMode = "memory" as "memory" | "redis";

const mocks = vi.hoisted(() => ({
  metricRepo: {
    getCopyCount: vi.fn(),
    incrementCopyBy: vi.fn(),
    totalCopies: vi.fn(),
    incrementViewBy: vi.fn(),
    totalViews: vi.fn(),
  },
  cache: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    keys: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/repos/metricRepo", () => ({ metricRepo: mocks.metricRepo }));
vi.mock("@/lib/cache/factory", () => ({ cache: mocks.cache }));
vi.mock("@/lib/observability/logger", () => ({ logger: mocks.logger }));
vi.mock("@/lib/config", () => ({
  config: {
    get cache() {
      return _cacheMode;
    },
  },
}));

// ── Module under test ──────────────────────────────────────────────────────
const { metricService } = await import("@/lib/services/metricService");

// ── Helpers ─────────────────────────────────────────────────────────────────
const IMG_1 = "00000000-0000-0000-0000-000000000001" as ImageId;
const IMG_2 = "00000000-0000-0000-0000-000000000002" as ImageId;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// recordCopy — MEMORY mode
// ─────────────────────────────────────────────────────────────────────────────
describe("recordCopy (memory mode)", () => {
  beforeEach(() => {
    _cacheMode = "memory";
  });

  it("increments cache, writes to DB, and clears cache on first call", async () => {
    mocks.cache.incr.mockResolvedValue(1);

    await metricService.recordCopy(IMG_1);

    // incr → counter=1, so dirty flag is set
    expect(mocks.cache.incr).toHaveBeenCalledWith("copy:00000000-0000-0000-0000-000000000001");
    expect(mocks.cache.set).toHaveBeenCalledWith(
      "copy:dirty:00000000-0000-0000-0000-000000000001",
      "1",
      expect.any(Number),
    );
    // Writes directly to DB
    expect(mocks.metricRepo.incrementCopyBy).toHaveBeenCalledWith(IMG_1, 1);
    // Clears the cache counter
    expect(mocks.cache.del).toHaveBeenCalledWith("copy:00000000-0000-0000-0000-000000000001");
    expect(mocks.logger.info).toHaveBeenCalledWith("image.copied", { imageId: IMG_1 });
  });

  it("skips dirty flag on subsequent calls (delta > 1)", async () => {
    mocks.cache.incr.mockResolvedValue(3);

    await metricService.recordCopy(IMG_1);

    expect(mocks.cache.set).not.toHaveBeenCalled();
    expect(mocks.metricRepo.incrementCopyBy).toHaveBeenCalledWith(IMG_1, 1);
    expect(mocks.cache.del).toHaveBeenCalledWith("copy:00000000-0000-0000-0000-000000000001");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// recordCopy — REDIS mode
// ─────────────────────────────────────────────────────────────────────────────
describe("recordCopy (redis mode)", () => {
  beforeEach(() => {
    _cacheMode = "redis";
  });

  it("increments cache and sets dirty flag WITHOUT writing to DB", async () => {
    mocks.cache.incr.mockResolvedValue(1);

    await metricService.recordCopy(IMG_1);

    expect(mocks.cache.incr).toHaveBeenCalledWith("copy:00000000-0000-0000-0000-000000000001");
    // Dirty flag is set (first call)
    expect(mocks.cache.set).toHaveBeenCalledWith(
      "copy:dirty:00000000-0000-0000-0000-000000000001",
      "1",
      expect.any(Number),
    );
    // Does NOT write directly to DB
    expect(mocks.metricRepo.incrementCopyBy).not.toHaveBeenCalled();
    // Does NOT clear the cache counter
    expect(mocks.cache.del).not.toHaveBeenCalled();
  });

  it("does not write to DB on subsequent calls", async () => {
    mocks.cache.incr.mockResolvedValue(5);

    await metricService.recordCopy(IMG_1);

    expect(mocks.metricRepo.incrementCopyBy).not.toHaveBeenCalled();
    expect(mocks.cache.del).not.toHaveBeenCalled();
  });

  it("handles multiple images without interference", async () => {
    mocks.cache.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    await metricService.recordCopy(IMG_1);
    await metricService.recordCopy(IMG_2);

    // Each image gets its own counter
    expect(mocks.cache.incr).toHaveBeenNthCalledWith(
      1,
      "copy:00000000-0000-0000-0000-000000000001",
    );
    expect(mocks.cache.incr).toHaveBeenNthCalledWith(
      2,
      "copy:00000000-0000-0000-0000-000000000002",
    );
    expect(mocks.metricRepo.incrementCopyBy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCopyCount
// ─────────────────────────────────────────────────────────────────────────────
describe("getCopyCount", () => {
  it("returns persisted + delta when delta exists", async () => {
    mocks.metricRepo.getCopyCount.mockResolvedValue(10);
    mocks.cache.get.mockResolvedValue(3);

    const result = await metricService.getCopyCount(IMG_1);

    expect(result).toBe(13);
    expect(mocks.cache.get).toHaveBeenCalledWith("copy:00000000-0000-0000-0000-000000000001");
  });

  it("returns persisted only when delta is null", async () => {
    mocks.metricRepo.getCopyCount.mockResolvedValue(7);
    mocks.cache.get.mockResolvedValue(null);

    const result = await metricService.getCopyCount(IMG_1);

    expect(result).toBe(7);
  });

  it("returns 0 when no data exists", async () => {
    mocks.metricRepo.getCopyCount.mockResolvedValue(0);
    mocks.cache.get.mockResolvedValue(null);

    const result = await metricService.getCopyCount(IMG_1);

    expect(result).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// flushAllCopies
// ─────────────────────────────────────────────────────────────────────────────
describe("flushAllCopies", () => {
  it("returns early when no dirty keys", async () => {
    mocks.cache.keys.mockResolvedValue([]);

    await metricService.flushAllCopies();

    expect(mocks.metricRepo.incrementCopyBy).not.toHaveBeenCalled();
  });

  it("flushes each dirty key and clears cache", async () => {
    mocks.cache.keys.mockResolvedValue([
      "copy:dirty:00000000-0000-0000-0000-000000000001",
      "copy:dirty:00000000-0000-0000-0000-000000000002",
    ]);
    mocks.cache.get
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3);

    await metricService.flushAllCopies();

    // First image: delta=5 → flushed
    expect(mocks.metricRepo.incrementCopyBy).toHaveBeenNthCalledWith(1, IMG_1, 5);
    expect(mocks.cache.del).toHaveBeenCalledWith("copy:00000000-0000-0000-0000-000000000001");
    expect(mocks.cache.del).toHaveBeenCalledWith("copy:dirty:00000000-0000-0000-0000-000000000001");

    // Second image: delta=3 → flushed
    expect(mocks.metricRepo.incrementCopyBy).toHaveBeenNthCalledWith(2, IMG_2, 3);
    expect(mocks.cache.del).toHaveBeenCalledWith("copy:00000000-0000-0000-0000-000000000002");
    expect(mocks.cache.del).toHaveBeenCalledWith("copy:dirty:00000000-0000-0000-0000-000000000002");

    expect(mocks.logger.info).toHaveBeenCalledTimes(2);
  });

  it("skips images with zero delta", async () => {
    mocks.cache.keys.mockResolvedValue([
      "copy:dirty:00000000-0000-0000-0000-000000000001",
    ]);
    mocks.cache.get.mockResolvedValue(0);

    await metricService.flushAllCopies();

    expect(mocks.metricRepo.incrementCopyBy).not.toHaveBeenCalled();
    expect(mocks.cache.del).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// totalCopies / totalViews  (simple delegates)
// ─────────────────────────────────────────────────────────────────────────────
describe("totalCopies", () => {
  it("delegates to metricRepo", async () => {
    mocks.metricRepo.totalCopies.mockResolvedValue(42);
    await expect(metricService.totalCopies()).resolves.toBe(42);
  });
});

describe("totalViews", () => {
  it("delegates to metricRepo", async () => {
    mocks.metricRepo.totalViews.mockResolvedValue(99);
    await expect(metricService.totalViews()).resolves.toBe(99);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// recordView
// ─────────────────────────────────────────────────────────────────────────────
describe("recordView", () => {
  it("writes to DB and logs", async () => {
    await metricService.recordView(IMG_1);

    expect(mocks.metricRepo.incrementViewBy).toHaveBeenCalledWith(IMG_1, 1);
    expect(mocks.logger.info).toHaveBeenCalledWith("image.viewed", { imageId: IMG_1 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Double-count regression guard
// ─────────────────────────────────────────────────────────────────────────────
describe("double-count guard", () => {
  it("records exactly one DB write per copy call in memory mode", async () => {
    _cacheMode = "memory";
    mocks.cache.incr
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);

    await metricService.recordCopy(IMG_1);
    await metricService.recordCopy(IMG_1);
    await metricService.recordCopy(IMG_1);

    // Each call writes +1 to DB (not the accumulated delta)
    expect(mocks.metricRepo.incrementCopyBy).toHaveBeenCalledTimes(3);
    expect(mocks.metricRepo.incrementCopyBy).toHaveBeenCalledWith(IMG_1, 1);
    expect(mocks.cache.del).toHaveBeenCalledTimes(3);
  });

  it("does not write to DB in redis mode (flush handles it)", async () => {
    _cacheMode = "redis";
    mocks.cache.incr
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);

    await metricService.recordCopy(IMG_1);
    await metricService.recordCopy(IMG_1);
    await metricService.recordCopy(IMG_1);

    expect(mocks.metricRepo.incrementCopyBy).not.toHaveBeenCalled();
    expect(mocks.cache.set).toHaveBeenCalledTimes(1); // dirty flag only on first call
  });

  it("flush + subsequent recordCopy does not double-count", async () => {
    _cacheMode = "redis";
    // Simulate: record 3 copies, flush, then record 2 more
    mocks.cache.incr
      .mockResolvedValueOnce(1) // first copy → counter=1
      .mockResolvedValueOnce(2) // second copy → counter=2
      .mockResolvedValueOnce(3) // third copy → counter=3
      .mockResolvedValueOnce(1); // after flush → counter=1

    // Three copies
    await metricService.recordCopy(IMG_1);
    await metricService.recordCopy(IMG_1);
    await metricService.recordCopy(IMG_1);

    // Flush reads delta=3, writes to DB, clears cache
    mocks.cache.keys.mockResolvedValue([
      "copy:dirty:00000000-0000-0000-0000-000000000001",
    ]);
    mocks.cache.get.mockResolvedValue(3);
    await metricService.flushAllCopies();

    expect(mocks.metricRepo.incrementCopyBy).toHaveBeenCalledWith(IMG_1, 3);
    expect(mocks.cache.del).toHaveBeenCalledWith("copy:00000000-0000-0000-0000-000000000001");
    expect(mocks.cache.del).toHaveBeenCalledWith("copy:dirty:00000000-0000-0000-0000-000000000001");

    // After flush, a new copy starts at counter=1
    mocks.cache.keys.mockResolvedValue([
      "copy:dirty:00000000-0000-0000-0000-000000000001",
    ]);
    mocks.cache.get.mockResolvedValue(1);
    await metricService.recordCopy(IMG_1);
    await metricService.flushAllCopies();

    // Only one more DB write: delta=1
    expect(mocks.metricRepo.incrementCopyBy).toHaveBeenCalledTimes(2);
    expect(mocks.metricRepo.incrementCopyBy).toHaveBeenNthCalledWith(2, IMG_1, 1);
  });
});
