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
    
    // Fetch one published image per tag to serve as a background preview
    const tagsWithPreviews: TagWithPreview[] = await Promise.all(
      tags.map(async (tag) => {
        const { items } = await imageRepo.listPublished({ tagSlug: tag.slug, limit: 1 });
        return {
          ...tag,
          previewUrl: items[0]?.imageUrl ?? null,
        };
      })
    );

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
