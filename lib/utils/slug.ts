/**
 * Generates a URL-safe slug from a prompt string.
 * Takes the first 8 words, lowercases, strips non-alphanumeric chars, appends a short random suffix.
 */
export function generateSlug(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);

  const base = words.join("-").slice(0, 60).replace(/-+$/, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
