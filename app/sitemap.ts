import type { MetadataRoute } from "next";
import { imageRepo } from "@/lib/repos/imageRepo";

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://aipromptgallery.com";
const IMAGES_PER_SITEMAP = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/?sort=likes`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Fetch first IMAGES_PER_SITEMAP published images for SEO pages
  const images = await imageRepo.listAll({ limit: IMAGES_PER_SITEMAP });

  const imageRoutes: MetadataRoute.Sitemap = images
    .filter((img) => img.isPublished)
    .map((img) => ({
      url: `${BASE_URL}/p/${img.slug}`,
      lastModified: new Date(img.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [...staticRoutes, ...imageRoutes];
}
