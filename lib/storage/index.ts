export interface SignedUploadResult {
  /** Short-lived URL for the client to upload directly */
  uploadUrl: string;
  /** HTTP method the client must use to upload */
  method: "PUT" | "POST";
  /** The key to store in the DB — use this to reference / delete the asset */
  storageKey: string;
  /** The CDN-served public URL for the uploaded asset */
  publicUrl: string;
  /**
   * Form fields the client must include alongside the file for multipart POST
   * uploads (Cloudinary). Empty/undefined for raw PUT uploads (Supabase).
   */
  fields?: Record<string, string>;
}

export interface Storage {
  signedUploadUrl(filename: string): Promise<SignedUploadResult>;
  delete(storageKey: string): Promise<void>;
  publicUrl(storageKey: string): string;
}

export { storage } from "./factory";
