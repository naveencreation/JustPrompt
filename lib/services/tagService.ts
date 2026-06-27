import { tagRepo } from "@/lib/repos/tagRepo";
import { imageRepo } from "@/lib/repos/imageRepo";
import { cache } from "@/lib/cache/factory";
import { CACHE_TTL } from "@/lib/constants/cache";
import type { ImageId, Tag } from "@/lib/db/schema";

const POPULAR_TAGS_LIMIT = 16;

export interface TagWithPreview extends Tag {
  count: number;
  previewUrl: string | null;
}

export const tagService = {
  async listPopular(limit: number = POPULAR_TAGS_LIMIT): Promise<Array<Tag & { count: number }>> {
    const cacheKey = `tags:popular:${limit}`;
    const cached = await cache.get<Array<Tag & { count: number }>>(cacheKey);
    if (cached) return cached;

    const tags = await tagRepo.popular(limit);
    await cache.set(cacheKey, tags, CACHE_TTL.TAGS);
    return tags;
  },

  async listPopularWithPreviews(limit: number = POPULAR_TAGS_LIMIT): Promise<TagWithPreview[]> {
    const cacheKey = `tags:popular_with_previews:${limit}`;
    const cached = await cache.get<TagWithPreview[]>(cacheKey);
    if (cached) return cached;

    const tags = await tagRepo.popular(limit);
    const PREVIEW_DEPTH = 10;

    // Fetch multiple images per tag so we can show distinct previews
    // across categories instead of the same image repeating.
    const tagImagePages = await Promise.all(
      tags.map((tag) =>
        imageRepo.listPublished({ tagSlug: tag.slug, limit: PREVIEW_DEPTH })
      )
    );

    // Walk tags in popularity order, assigning the first image whose
    // ID hasn't been claimed by a higher-ranked tag. If a tag has no
    // unique images left in its buffer, fall back to its top image
    // (a rare duplicate is better than a blank card).
    const usedImageIds = new Set<string>();
    const tagsWithPreviews: TagWithPreview[] = [];

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i]!;
      const images = tagImagePages[i]?.items ?? [];
      let previewUrl: string | null = null;

      for (const img of images) {
        if (!usedImageIds.has(img.id)) {
          usedImageIds.add(img.id);
          previewUrl = img.imageUrl;
          break;
        }
      }

      // Fallback: let lower-ranked tags still show their top image
      // rather than leaving the card blank.
      if (!previewUrl && images.length > 0) {
        previewUrl = images[0]!.imageUrl;
      }

      tagsWithPreviews.push({ ...tag, previewUrl });
    }

    await cache.set(cacheKey, tagsWithPreviews, CACHE_TTL.TAGS);
    return tagsWithPreviews;
  },

  async listByImage(imageId: ImageId): Promise<Tag[]> {
    return tagRepo.listByImage(imageId);
  },

  async findBySlug(slug: string): Promise<Tag | null> {
    const cacheKey = `tag:slug:${slug}`;
    const cached = await cache.get<Tag>(cacheKey);
    if (cached) return cached;

    const tag = await tagRepo.findBySlug(slug);
    if (tag) await cache.set(cacheKey, tag, CACHE_TTL.TAGS);
    return tag;
  },
};
