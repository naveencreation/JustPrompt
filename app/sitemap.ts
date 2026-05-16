import type { MetadataRoute } from "next";
import { imageService } from "@/lib/services/imageService";
import { config } from "@/lib/config";
import { SITEMAP } from "@/lib/constants/limits";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: config.appUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${config.appUrl}/?sort=likes`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  const images = await imageService.listAll({ limit: SITEMAP.MAX_IMAGES_PER_SITEMAP });

  const imageRoutes: MetadataRoute.Sitemap = images
    .filter((img) => img.isPublished)
    .map((img) => ({
      url: `${config.appUrl}/p/${img.slug}`,
      lastModified: new Date(img.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [...staticRoutes, ...imageRoutes];
}
