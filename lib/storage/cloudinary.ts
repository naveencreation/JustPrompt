import { createHash } from "node:crypto";
import { config } from "@/lib/config";
import { logger } from "@/lib/observability/logger";
import type { SignedUploadResult, Storage } from "./index";

/**
 * Cloudinary storage adapter — Tier 2.
 *
 * Activated when `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
 * `CLOUDINARY_API_SECRET` are set. Uses Cloudinary's signed-direct-upload
 * pattern: the server signs a short-lived upload, the client POSTs the file
 * directly to Cloudinary's `image/upload` endpoint with the signature, and
 * Cloudinary stores + serves the asset via its CDN.
 *
 * No Cloudinary SDK is required — signing is a SHA-1 hash and uploads are
 * plain multipart POST requests.
 */

const SIGNATURE_TTL_SECONDS = 600;

function signParams(params: Record<string, string>, apiSecret: string): string {
  // Cloudinary signature: sort params alphabetically, join as `k=v&k=v`,
  // append api_secret, SHA-1, hex-encoded.
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

function sanitizePublicId(filename: string): string {
  // Cloudinary public IDs allow letters, digits, underscores, hyphens, dots,
  // and forward slashes. Strip the extension — Cloudinary derives format from
  // the upload itself.
  const withoutExt = filename.replace(/\.[^.]+$/, "");
  return `${Date.now()}-${withoutExt.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

export class CloudinaryStorage implements Storage {
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor() {
    const { cloudName, apiKey, apiSecret } = config.cloudinary;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "CloudinaryStorage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      );
    }
    this.cloudName = cloudName;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  async signedUploadUrl(filename: string): Promise<SignedUploadResult> {
    const publicId = sanitizePublicId(filename);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Only params included in the signature here can be sent in the upload
    // request — Cloudinary will reject requests with extra signed params.
    const paramsToSign: Record<string, string> = {
      public_id: publicId,
      timestamp,
    };
    const signature = signParams(paramsToSign, this.apiSecret);

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      method: "POST",
      storageKey: publicId,
      publicUrl: this.publicUrl(publicId),
      fields: {
        ...paramsToSign,
        api_key: this.apiKey,
        signature,
      },
    };
  }

  async delete(storageKey: string): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const params: Record<string, string> = { public_id: storageKey, timestamp };
    const signature = signParams(params, this.apiSecret);

    const body = new URLSearchParams({
      ...params,
      api_key: this.apiKey,
      signature,
    });

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
      { method: "POST", body },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logger.error("storage.delete_failed", { storageKey, status: res.status, detail });
      throw new Error(`Cloudinary delete failed (${res.status}): ${detail}`);
    }

    // Cloudinary returns `{ result: "ok" | "not found" }` with HTTP 200 even
    // when the asset doesn't exist. We treat both as success — the caller's
    // intent is "ensure this asset is gone", which is satisfied either way.
  }

  publicUrl(storageKey: string): string {
    // `f_auto,q_auto` lets Cloudinary deliver the optimal format/quality
    // without us needing to know the original extension at sign-time.
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/f_auto,q_auto/${storageKey}`;
  }
}
