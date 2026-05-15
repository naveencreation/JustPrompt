import { config } from "@/lib/config";
import { MemoryCache } from "./memory";
import type { Cache } from "./index";

function createCache(): Cache {
  if (config.cache === "redis") {
    // Lazy import so Redis SDK is never bundled unless env var is set
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RedisCache } = require("./redis") as { RedisCache: new () => Cache };
    return new RedisCache();
  }
  return new MemoryCache();
}

export const cache: Cache = createCache();
