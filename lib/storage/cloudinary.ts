import type { SignedUploadResult, Storage } from "./index";

/**
 * Tier 2 upgrade path — Cloudinary storage + CDN.
 *
 * Stub. To activate:
 *   1. `pnpm add cloudinary`
 *   2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
 *   3. Implement signed upload + delete using Cloudinary SDK.
 *
 * The factory at `lib/storage/factory.ts` only loads this module when
 * `config.storage === "cloudinary"`.
 */
export class CloudinaryStorage implements Storage {
  constructor() {
    throw new Error(
      "CloudinaryStorage is not implemented yet. Install cloudinary and complete the implementation in lib/storage/cloudinary.ts before setting CLOUDINARY_CLOUD_NAME.",
    );
  }

  async signedUploadUrl(_filename: string): Promise<SignedUploadResult> {
    throw new Error("CloudinaryStorage.signedUploadUrl not implemented");
  }
  async delete(_storageKey: string): Promise<void> {
    throw new Error("CloudinaryStorage.delete not implemented");
  }
  publicUrl(_storageKey: string): string {
    throw new Error("CloudinaryStorage.publicUrl not implemented");
  }
}
