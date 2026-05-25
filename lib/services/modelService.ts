import { modelRepo } from "@/lib/repos/modelRepo";
import { cache } from "@/lib/cache/factory";
import { CACHE_TTL } from "@/lib/constants/cache";
import type { ModelEntity } from "@/lib/db/schema";

const CACHE_KEY = "models:all";

export const modelService = {
  async listAll(): Promise<ModelEntity[]> {
    const cached = await cache.get<ModelEntity[]>(CACHE_KEY);
    if (cached) return cached;

    const models = await modelRepo.listAll();
    await cache.set(CACHE_KEY, models, CACHE_TTL.MODELS);
    return models;
  },

  async create(name: string, shortName: string): Promise<ModelEntity> {
    const model = await modelRepo.create(name, shortName);
    await cache.del(CACHE_KEY); // Invalidate cache so next fetch gets the new model
    return model;
  }
};
