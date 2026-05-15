import { config } from "@/lib/config";
import { MemoryRateLimit } from "./memory";
import type { RateLimit } from "./index";

function createRateLimit(): RateLimit {
  if (config.rateLimit === "redis") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RedisRateLimit } = require("./redis") as { RedisRateLimit: new () => RateLimit };
    return new RedisRateLimit();
  }
  return new MemoryRateLimit();
}

export const rateLimit: RateLimit = createRateLimit();
