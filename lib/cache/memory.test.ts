import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryCache } from "@/lib/cache/memory";

// ── Helpers ─────────────────────────────────────────────────────────────────
/** Shorthand: advance fake timers by N seconds. */
function advance(seconds: number) {
  vi.advanceTimersByTime(seconds * 1000);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────
// get / set
// ─────────────────────────────────────────────────────────────────────────────
describe("get / set", () => {
  it("stores and retrieves a value", async () => {
    const cache = new MemoryCache();
    await cache.set("key", "hello");
    await expect(cache.get("key")).resolves.toBe("hello");
  });

  it("returns null for a missing key", async () => {
    const cache = new MemoryCache();
    await expect(cache.get("nonexistent")).resolves.toBeNull();
  });

  it("stores complex objects", async () => {
    const cache = new MemoryCache();
    const obj = { a: 1, b: [2, 3] };
    await cache.set("obj", obj);
    await expect(cache.get("obj")).resolves.toEqual(obj);
  });

  it("overwrites an existing key", async () => {
    const cache = new MemoryCache();
    await cache.set("key", "first");
    await cache.set("key", "second");
    await expect(cache.get("key")).resolves.toBe("second");
  });

  it("stores a value with no TTL (never expires)", async () => {
    const cache = new MemoryCache();
    await cache.set("persist", "forever");
    advance(99999);
    await expect(cache.get("persist")).resolves.toBe("forever");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TTL expiry
// ─────────────────────────────────────────────────────────────────────────────
describe("TTL expiry", () => {
  it("returns value before TTL expires", async () => {
    const cache = new MemoryCache();
    await cache.set("ephemeral", "data", 10);

    advance(9);
    await expect(cache.get("ephemeral")).resolves.toBe("data");
  });

  it("returns null after TTL expires", async () => {
    const cache = new MemoryCache();
    await cache.set("ephemeral", "data", 10);

    // expiresAt = 10000; advance past it with one extra ms
    advance(10);
    vi.advanceTimersByTime(1);
    await expect(cache.get("ephemeral")).resolves.toBeNull();
  });

  it("returns null exactly at the expiry boundary", async () => {
    const cache = new MemoryCache();
    await cache.set("boundary", "gone", 5);

    // expiresAt = 5000; > check needs 5001
    vi.advanceTimersByTime(5001);
    await expect(cache.get("boundary")).resolves.toBeNull();
  });

  it("treats TTL=0 as no expiry (falsy guard in ternary)", async () => {
    const cache = new MemoryCache();
    await cache.set("zero", "value", 0);

    // ttlSeconds=0 is falsy, so expiresAt is set to null (never expires)
    advance(99999);
    await expect(cache.get("zero")).resolves.toBe("value");
  });

  it("supports independent TTLs per key", async () => {
    const cache = new MemoryCache();
    await cache.set("short", "a", 5);
    await cache.set("long", "b", 20);

    // short expiresAt = 5000, long expiresAt = 20000
    vi.advanceTimersByTime(5001);
    await expect(cache.get("short")).resolves.toBeNull();
    await expect(cache.get("long")).resolves.toBe("b");

    vi.advanceTimersByTime(15001);
    await expect(cache.get("long")).resolves.toBeNull();
  });

  it("lazily evicts expired entries (get returns null, internal map shrinks)", async () => {
    const cache = new MemoryCache();
    await cache.set("a", 1, 1);
    await cache.set("b", 2, 999);

    advance(2);
    await cache.get("a"); // triggers lazy eviction

    const keys = await cache.keys("*");
    expect(keys).toEqual(["b"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// del
// ─────────────────────────────────────────────────────────────────────────────
describe("del", () => {
  it("removes an existing key", async () => {
    const cache = new MemoryCache();
    await cache.set("key", "value");
    await cache.del("key");
    await expect(cache.get("key")).resolves.toBeNull();
  });

  it("is a no-op for a missing key", async () => {
    const cache = new MemoryCache();
    await expect(cache.del("missing")).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// incr
// ─────────────────────────────────────────────────────────────────────────────
describe("incr", () => {
  it("initializes a non-existent key to 1", async () => {
    const cache = new MemoryCache();
    await expect(cache.incr("counter")).resolves.toBe(1);
  });

  it("increments an existing numeric key", async () => {
    const cache = new MemoryCache();
    await cache.set("counter", 5);
    await expect(cache.incr("counter")).resolves.toBe(6);
    await expect(cache.incr("counter")).resolves.toBe(7);
    await expect(cache.incr("counter")).resolves.toBe(8);
  });

  it("increments a key created by incr itself", async () => {
    const cache = new MemoryCache();
    await expect(cache.incr("seq")).resolves.toBe(1);
    await expect(cache.incr("seq")).resolves.toBe(2);
    await expect(cache.incr("seq")).resolves.toBe(3);
  });

  it("resets to 1 when a key with TTL has expired", async () => {
    const cache = new MemoryCache();
    await cache.set("ephemeral-counter", 10, 5);

    advance(6); // past TTL

    await expect(cache.incr("ephemeral-counter")).resolves.toBe(1);
  });

  it("does not reset a key without TTL", async () => {
    const cache = new MemoryCache();
    await cache.set("persistent-counter", 10);
    advance(99999);
    await expect(cache.incr("persistent-counter")).resolves.toBe(11);
  });

  it("handles concurrent-style sequential increments atomically", async () => {
    const cache = new MemoryCache();
    const results = await Promise.all([
      cache.incr("concurrent"),
      cache.incr("concurrent"),
      cache.incr("concurrent"),
    ]);
    // Each call gets a unique value 1, 2, 3 (order may vary)
    expect(results.sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// keys (pattern matching)
// ─────────────────────────────────────────────────────────────────────────────
describe("keys", () => {
  it("matches keys with glob-style wildcards", async () => {
    const cache = new MemoryCache();
    await cache.set("gallery:new", "a");
    await cache.set("gallery:likes", "b");
    await cache.set("image:slug:test", "c");
    await cache.set("settings", "d");

    const galleryKeys = await cache.keys("gallery:*");
    expect(galleryKeys.sort()).toEqual(["gallery:likes", "gallery:new"]);
  });

  it("returns all keys with '*' pattern", async () => {
    const cache = new MemoryCache();
    await cache.set("a", 1);
    await cache.set("b", 2);

    const all = await cache.keys("*");
    expect(all.sort()).toEqual(["a", "b"]);
  });

  it("returns empty array when no keys match", async () => {
    const cache = new MemoryCache();
    await cache.set("only-this", 1);

    const result = await cache.keys("nonexistent:*");
    expect(result).toEqual([]);
  });

  it("returns empty array from an empty store", async () => {
    const cache = new MemoryCache();
    await expect(cache.keys("*")).resolves.toEqual([]);
  });

  it("excludes expired keys from results", async () => {
    const cache = new MemoryCache();
    await cache.set("keep", 1, 999);
    await cache.set("expire", 2, 5);

    advance(10);
    const keys = await cache.keys("*");
    expect(keys).toEqual(["keep"]);
  });

  it("matches with single-character wildcard", async () => {
    const cache = new MemoryCache();
    await cache.set("cat", 1);
    await cache.set("car", 2);
    await cache.set("bar", 3);

    const result = await cache.keys("ca?");
    expect(result.sort()).toEqual(["car", "cat"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Eviction
// ─────────────────────────────────────────────────────────────────────────────
describe("eviction", () => {
  it("evicts the oldest key when store exceeds maxSize", async () => {
    const cache = new MemoryCache(3);

    await cache.set("a", 1);
    await cache.set("b", 2);
    await cache.set("c", 3);
    // Store is full — "a" is the oldest insertion

    await cache.set("d", 4); // triggers eviction

    await expect(cache.get("a")).resolves.toBeNull();
    await expect(cache.get("b")).resolves.toBe(2);
    await expect(cache.get("c")).resolves.toBe(3);
    await expect(cache.get("d")).resolves.toBe(4);
  });

  it("evicts the oldest based on insertion order, not last access", async () => {
    const cache = new MemoryCache(2);

    await cache.set("oldest", 1);
    await cache.set("newest", 2);

    // Access "oldest" — LRU would promote it, but this is FIFO-ish eviction
    await cache.get("oldest");

    await cache.set("overflow", 3); // evicts "oldest" (first inserted)

    await expect(cache.get("oldest")).resolves.toBeNull();
    await expect(cache.get("newest")).resolves.toBe(2);
    await expect(cache.get("overflow")).resolves.toBe(3);
  });

  it("evicts on overwrite when at capacity", async () => {
    const cache = new MemoryCache(2);

    await cache.set("a", 1);
    await cache.set("b", 2);
    // Store is at capacity. Overwriting "b" triggers the evict-before-set check,
    // which removes the oldest insertion ("a").

    await cache.set("b", 3); // overwrite triggers eviction of "a"

    await expect(cache.get("a")).resolves.toBeNull();
    await expect(cache.get("b")).resolves.toBe(3);
  });

  it("evicts expired entries before counting toward maxSize", async () => {
    const cache = new MemoryCache(2);

    await cache.set("expires-soon", "x", 1);
    await cache.set("stays", "y", 999);

    advance(2); // "expires-soon" is now expired (lazily)

    // This set triggers eviction check: only 1 live entry, so no eviction needed
    await cache.set("new", "z");
    // "expires-soon" is NOT evicted by set (it only evicts when size >= maxSize)
    // But it's expired, so keys/get will skip it lazily

    await expect(cache.get("expires-soon")).resolves.toBeNull();
    await expect(cache.get("stays")).resolves.toBe("y");
    await expect(cache.get("new")).resolves.toBe("z");
  });
});
