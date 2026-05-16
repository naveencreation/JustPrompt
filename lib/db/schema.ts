import { z } from "zod";

// ─── Branded IDs ───────────────────────────────────────────────────────────
export const ImageId = z.string().uuid().brand<"ImageId">();
export type ImageId = z.infer<typeof ImageId>;

export const TagId = z.number().int().positive().brand<"TagId">();
export type TagId = z.infer<typeof TagId>;

// ─── Image ─────────────────────────────────────────────────────────────────
export const StorageProviderSchema = z.enum(["supabase", "cloudinary"]);
export type StorageProvider = z.infer<typeof StorageProviderSchema>;

export const ModelSchema = z.enum(["sdxl", "dalle3", "midjourney", "flux", "other"]).nullable();
export type Model = z.infer<typeof ModelSchema>;

export const ImageSchema = z.object({
  id: ImageId,
  slug: z.string().min(1),
  storageKey: z.string().min(1),
  storageProvider: StorageProviderSchema,
  imageUrl: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  prompt: z.string().min(1),
  description: z.string().nullable(),
  model: ModelSchema,
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  displayOrder: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Image = z.infer<typeof ImageSchema>;

// ─── Tag ───────────────────────────────────────────────────────────────────
export const TagSchema = z.object({
  id: TagId,
  name: z.string().min(1),
  slug: z.string().min(1),
});
export type Tag = z.infer<typeof TagSchema>;

// ─── Like Count ────────────────────────────────────────────────────────────
export const LikeCountSchema = z.object({
  imageId: ImageId,
  count: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});
export type LikeCount = z.infer<typeof LikeCountSchema>;

// ─── Settings ──────────────────────────────────────────────────────────────
export const SettingsSchema = z.object({
  id: z.literal(1),
  featuredImageId: ImageId.nullable(),
  maintenanceMode: z.boolean(),
  updatedAt: z.string().datetime(),
});
export type Settings = z.infer<typeof SettingsSchema>;

// ─── API request schemas ────────────────────────────────────────────────────
export const CursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: ImageId,
});
export type Cursor = z.infer<typeof CursorSchema>;

export const SortSchema = z.enum(["new", "likes", "random"]);
export type Sort = z.infer<typeof SortSchema>;

export const CreateImageInputSchema = z.object({
  // Optional: imageService.create() auto-generates from `prompt` when omitted.
  slug: z.string().min(1).max(200).optional(),
  storageKey: z.string().min(1),
  storageProvider: StorageProviderSchema,
  imageUrl: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  prompt: z.string().min(1).max(5000),
  description: z.string().max(2000).nullable().default(null),
  model: ModelSchema.default(null),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
  isPublished: z.boolean().default(false),
});
export type CreateImageInput = z.infer<typeof CreateImageInputSchema>;

export const UpdateImageInputSchema = CreateImageInputSchema.partial().omit({
  storageKey: true,
  storageProvider: true,
});
export type UpdateImageInput = z.infer<typeof UpdateImageInputSchema>;
