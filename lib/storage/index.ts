export interface SignedUploadResult {
  uploadUrl: string;
  /** The key to store in the DB — use this to reference / delete the asset */
  storageKey: string;
}

export interface Storage {
  /** Returns a short-lived URL for the client to upload directly */
  signedUploadUrl(filename: string): Promise<SignedUploadResult>;
  /** Permanently deletes the asset by its storage key */
  delete(storageKey: string): Promise<void>;
  /** Returns the public CDN URL for a given storage key */
  publicUrl(storageKey: string): string;
}

export { storage } from "./factory";
