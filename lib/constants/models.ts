/** AI Model configuration and mapping options */

export const MODEL_OPTIONS = [
  { value: "dalle3", label: "DALL-E 3 (ChatGPT / Copilot)", shortLabel: "DALL-E 3" },
  { value: "imagen3", label: "Imagen 3 (Gemini)", shortLabel: "Imagen 3" },
  { value: "midjourney", label: "Midjourney", shortLabel: "Midjourney" },
  { value: "flux", label: "Flux (Grok)", shortLabel: "Flux" },
  { value: "ideogram", label: "Ideogram", shortLabel: "Ideogram" },
  { value: "emu", label: "Emu (Meta AI / Instagram)", shortLabel: "Emu" },
  { value: "firefly", label: "Firefly (Adobe)", shortLabel: "Firefly" },
  { value: "sd3", label: "Stable Diffusion 3", shortLabel: "SD 3" },
  { value: "sdxl", label: "SDXL", shortLabel: "SDXL" },
  { value: "leonardo", label: "Leonardo AI", shortLabel: "Leonardo AI" },
  { value: "other", label: "Other", shortLabel: "Other" }
] as const;

export type ModelValue = typeof MODEL_OPTIONS[number]["value"];

/**
 * Gets the clean, human-readable label for a model slug.
 */
export function getModelLabel(value: string | null): string {
  if (!value) return "Unknown";
  const option = MODEL_OPTIONS.find((o) => o.value === value);
  return option ? option.shortLabel : value;
}
