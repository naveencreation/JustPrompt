import { revalidateTag } from "next/cache";
import { imageRepo } from "@/lib/repos/imageRepo";
import { tagRepo } from "@/lib/repos/tagRepo";
import { cache } from "@/lib/cache/factory";
import { storage } from "@/lib/storage/factory";
import { logger } from "@/lib/observability/logger";
import { errors } from "@/lib/observability/errors";
import { CACHE_TAG, CACHE_TTL } from "@/lib/constants/cache";
import { generateSlug } from "@/lib/utils/slug";
import { decodeCursor } from "@/lib/utils/cursor";
import type { CreateImageInput, Image, ImageId, Sort } from "@/lib/db/schema";

export interface GalleryOptions {
  cursor?: string | null;
  sort?: Sort;
  tagSlug?: string;
  limit?: number;
}

// Wipes every cached gallery query. Cheap on Tier 0 (Map.keys); on Tier 1
// (Redis) the adapter implements `keys` via SCAN.
async function invalidateGalleryCache(): Promise<void> {
  const keys = await cache.keys("gallery:*");
  await Promise.all(keys.map((k) => cache.del(k)));
}

export const imageService = {
  async listGallery(opts: GalleryOptions = {}) {
    const { cursor: cursorStr, sort = "new", tagSlug, limit } = opts;
    const before = cursorStr ? decodeCursor(cursorStr) : null;

    const cacheKey = `gallery:${sort}:${tagSlug ?? ""}:${cursorStr ?? "start"}`;
    const cached = await cache.get<{ items: Image[]; nextCursor: string | null }>(cacheKey);
    if (cached) return cached;

    const result = await imageRepo.listPublished({ before, sort, tagSlug, limit });
    await cache.set(cacheKey, result, CACHE_TTL.GALLERY);

    return result;
  },

  async getBySlug(slug: string): Promise<Image | null> {
    const cacheKey = `image:slug:${slug}`;
    const cached = await cache.get<Image>(cacheKey);
    if (cached) return cached;

    const image = await imageRepo.findBySlug(slug);
    if (image) await cache.set(cacheKey, image, CACHE_TTL.IMAGE);

    return image;
  },

  async getById(id: ImageId): Promise<Image | null> {
    return imageRepo.findById(id);
  },

  async listAll(opts: { limit?: number; offset?: number } = {}): Promise<Image[]> {
    return imageRepo.listAll(opts);
  },

  async create(input: Omit<CreateImageInput, "slug"> & { slug?: string }): Promise<Image> {
    const slug = input.slug ?? generateSlug(input.prompt);
    const fullInput: CreateImageInput = { ...input, slug };

    const image = await imageRepo.create(fullInput);

    if (input.tags && input.tags.length > 0) {
      const tags = await Promise.all(input.tags.map((t) => tagRepo.findOrCreate(t)));
      await tagRepo.attachToImage(image.id, tags.map((t) => Number(t.id)));
    }

    logger.info("image.created", { imageId: image.id, slug: image.slug });

    if (image.isPublished) {
      revalidateTag(CACHE_TAG.GALLERY);
      // Also bust the in-process gallery cache (Tier 0). `revalidateTag` only
      // invalidates Next's page/data cache; the cache adapter is independent.
      await invalidateGalleryCache();
    }

    return image;
  },

  async update(id: ImageId, input: Partial<CreateImageInput>): Promise<Image> {
    const image = await imageRepo.update(id, input);

    if (input.tags !== undefined) {
      await tagRepo.detachAllFromImage(id);
      if (input.tags.length > 0) {
        const tags = await Promise.all(input.tags.map((t) => tagRepo.findOrCreate(t)));
        await tagRepo.attachToImage(id, tags.map((t) => Number(t.id)));
      }
    }

    await cache.del(`image:slug:${image.slug}`);
    revalidateTag(CACHE_TAG.GALLERY);
    revalidateTag(CACHE_TAG.IMAGE(image.slug));

    logger.info("image.updated", { imageId: id });
    return image;
  },

  async delete(id: ImageId): Promise<void> {
    const image = await imageRepo.findById(id);
    if (!image) return;

    try {
      await storage.delete(image.storageKey);
    } catch (err) {
      errors.capture(err, { op: "image.delete.storage", imageId: id });
      // Continue with DB delete even if storage fails
    }

    await imageRepo.delete(id);
    await cache.del(`image:slug:${image.slug}`);
    revalidateTag(CACHE_TAG.GALLERY);
    revalidateTag(CACHE_TAG.IMAGE(image.slug));
    await invalidateGalleryCache();

    logger.info("image.deleted", { imageId: id, slug: image.slug });
  },

  async getAdminStats() {
    const [totalImages, totalLikes] = await Promise.all([
      imageRepo.count(),
      imageRepo.listAll({ limit: 1 }),
    ]);
    return { totalImages, totalLikes: 0 }; // totalLikes from likeService
  },
};
