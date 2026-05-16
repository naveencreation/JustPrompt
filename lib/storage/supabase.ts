import { createAdminClient } from "@/lib/db/client";
import { logger } from "@/lib/observability/logger";
import type { SignedUploadResult, Storage } from "./index";

const BUCKET = "images";
const SIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

export class SupabaseStorage implements Storage {
  async signedUploadUrl(filename: string): Promise<SignedUploadResult> {
    const supabase = createAdminClient();
    const storageKey = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storageKey);

    if (error || !data) {
      logger.error("storage.signed_url_failed", { storageKey, error: error?.message });
      throw new Error(`Failed to create signed upload URL: ${error?.message}`);
    }

    return { uploadUrl: data.signedUrl, storageKey, publicUrl: this.publicUrl(storageKey) };
  }

  async delete(storageKey: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(BUCKET).remove([storageKey]);
    if (error) {
      logger.error("storage.delete_failed", { storageKey, error: error.message });
      throw new Error(`Failed to delete storage object: ${error.message}`);
    }
  }

  publicUrl(storageKey: string): string {
    const supabase = createAdminClient();
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);
    return data.publicUrl;
  }
}
