import { z } from "zod";

// ─── The ONLY file in this repo that reads process.env ─────────────────────
// Every other module imports the typed `config` object from here.

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  REVALIDATE_SECRET: z.string().min(16, "REVALIDATE_SECRET must be at least 16 characters"),

  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

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

function parseEnv() {
  if (process.env["NODE_ENV"] === "test") {
    return envSchema.partial().parse(process.env);
  }
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`);
    throw new Error(
      `Environment validation failed:\n${missing.join("\n")}\n\nCopy .env.example to .env.local and fill in the required values.`,
    );
  }
  return result.data;
}

const env = parseEnv();

export const config = {
  // ─── Adapter selection ─────────────────────────────────────────────────
  cache:     env.UPSTASH_REDIS_REST_URL ? ("redis"      as const) : ("memory"   as const),
  rateLimit: env.UPSTASH_REDIS_REST_URL ? ("redis"      as const) : ("memory"   as const),
  storage:   env.CLOUDINARY_CLOUD_NAME  ? ("cloudinary" as const) : ("supabase" as const),
  errors:    env.SENTRY_DSN             ? ("sentry"     as const) : ("console"  as const),
  logs:      env.AXIOM_TOKEN            ? ("axiom"      as const) : ("console"  as const),
  search:    env.MEILISEARCH_HOST       ? ("meili"      as const) : ("postgres" as const),

  // ─── Environment ───────────────────────────────────────────────────────
  isDev: env.NODE_ENV === "development",
  isProd: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  nodeEnv: env.NODE_ENV,

  // ─── App ───────────────────────────────────────────────────────────────
  appUrl: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  // ─── Supabase (consumed by lib/db/client.ts and middleware.ts only) ───
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },

  // ─── Secrets ───────────────────────────────────────────────────────────
  revalidateSecret: env.REVALIDATE_SECRET ?? "",

  // ─── Optional integrations ─────────────────────────────────────────────
  adsenseClient: env.NEXT_PUBLIC_ADSENSE_CLIENT,
  plausibleDomain: env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,

  // ─── Adapter-specific raw values (only the adapter implementation reads these) ─
  redis:      { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN },
  sentry:     { dsn: env.SENTRY_DSN },
  axiom:      { token: env.AXIOM_TOKEN, dataset: env.AXIOM_DATASET },
  cloudinary: { cloudName: env.CLOUDINARY_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY, apiSecret: env.CLOUDINARY_API_SECRET },
  meili:      { host: env.MEILISEARCH_HOST, apiKey: env.MEILISEARCH_API_KEY },
} as const;

export type Config = typeof config;
