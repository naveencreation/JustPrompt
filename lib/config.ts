import { z } from "zod";

// ─── The ONLY file in this repo that reads process.env ─────────────────────
// All other modules read from the exported `config` object.

const envSchema = z.object({
  // Required
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  REVALIDATE_SECRET: z.string().min(16, "REVALIDATE_SECRET must be at least 16 characters"),

  // Tier 1 — Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Tier 1 — Error reporting
  SENTRY_DSN: z.string().url().optional(),

  // Tier 1 — Logging
  AXIOM_TOKEN: z.string().optional(),
  AXIOM_DATASET: z.string().optional(),

  // Tier 1 — Analytics
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),

  // Tier 2 — Storage
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Tier 2 — Search
  MEILISEARCH_HOST: z.string().url().optional(),
  MEILISEARCH_API_KEY: z.string().optional(),

  // AdSense
  NEXT_PUBLIC_ADSENSE_CLIENT: z.string().optional(),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Validate at module load — app crashes immediately on missing required vars
// rather than at the first DB call.
function parseEnv() {
  // In test environments, don't require Supabase vars
  if (process.env["NODE_ENV"] === "test") {
    return envSchema.partial().parse(process.env);
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Environment validation failed:\n${missing.join("\n")}\n\nCopy .env.example to .env.local and fill in the required values.`);
  }
  return result.data;
}

const env = parseEnv();

export const config = {
  // Which backend implementation to use per capability
  cache: env.UPSTASH_REDIS_REST_URL ? ("redis" as const) : ("memory" as const),
  rateLimit: env.UPSTASH_REDIS_REST_URL ? ("redis" as const) : ("memory" as const),
  storage: env.CLOUDINARY_CLOUD_NAME ? ("cloudinary" as const) : ("supabase" as const),
  errors: env.SENTRY_DSN ? ("sentry" as const) : ("console" as const),
  logs: env.AXIOM_TOKEN ? ("axiom" as const) : ("console" as const),
  search: env.MEILISEARCH_HOST ? ("meili" as const) : ("postgres" as const),

  isDev: env.NODE_ENV === "development",
  isProd: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",

  // Raw env values for use inside adapter implementations
  env: env as typeof env,
} as const;

export type Config = typeof config;
