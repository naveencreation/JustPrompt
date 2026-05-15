import { config } from "@/lib/config";
import { SupabaseStorage } from "./supabase";
import type { Storage } from "./index";

function createStorage(): Storage {
  if (config.storage === "cloudinary") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CloudinaryStorage } = require("./cloudinary") as { CloudinaryStorage: new () => Storage };
    return new CloudinaryStorage();
  }
  return new SupabaseStorage();
}

export const storage: Storage = createStorage();
