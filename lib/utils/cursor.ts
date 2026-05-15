import type { Cursor } from "@/lib/db/schema";

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor(encoded: string): Cursor | null {
  try {
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as unknown;
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "createdAt" in decoded &&
      "id" in decoded
    ) {
      return decoded as Cursor;
    }
    return null;
  } catch {
    return null;
  }
}
