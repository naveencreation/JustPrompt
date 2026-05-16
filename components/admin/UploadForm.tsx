"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { UploadIcon, CloseIcon, LoaderIcon, EyeIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { CardPreview } from "./CardPreview";

const MODEL_OPTIONS = ["sdxl", "dalle3", "midjourney", "flux", "other"] as const;

export function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState<string>("");
  const [tags, setTags] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((selected: File) => {
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);

    const img = document.createElement("img");
    img.onload = () => setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = url;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files[0];
      if (dropped?.type.startsWith("image/")) handleFileSelect(dropped);
    },
    [handleFileSelect],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file || !dimensions || !prompt.trim()) {
        setError("Please provide an image and prompt.");
        return;
      }
      setError(null);
      setIsUploading(true);

      try {
        const sigRes = await fetch("/api/admin/upload-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name }),
        });
        if (!sigRes.ok) throw new Error("Failed to get upload signature");
        const sig = (await sigRes.json()) as {
          uploadUrl: string;
          method: "PUT" | "POST";
          storageKey: string;
          publicUrl: string;
          fields?: Record<string, string>;
        };

        // PUT (Supabase): send raw file bytes.
        // POST (Cloudinary): send multipart form-data with signed fields.
        let uploadRes: Response;
        if (sig.method === "POST") {
          const form = new FormData();
          for (const [k, v] of Object.entries(sig.fields ?? {})) form.append(k, v);
          form.append("file", file);
          uploadRes = await fetch(sig.uploadUrl, { method: "POST", body: form });
        } else {
          uploadRes = await fetch(sig.uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
        }
        if (!uploadRes.ok) throw new Error(`Upload to storage failed (${uploadRes.status})`);

        const createRes = await fetch("/api/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storageKey: sig.storageKey,
            storageProvider: sig.method === "POST" ? "cloudinary" : "supabase",
            imageUrl: sig.publicUrl,
            width: dimensions.width,
            height: dimensions.height,
            prompt: prompt.trim(),
            description: description.trim() || null,
            model: model || null,
            tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
            isPublished,
          }),
        });

        if (!createRes.ok) throw new Error("Failed to save image metadata");

        router.push("/admin/manage");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [file, dimensions, prompt, description, model, tags, isPublished, router],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Drop zone */}
      <div
        className={cn(
          "relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed",
          "transition-[border-color,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          file
            ? "border-neutral-300 bg-neutral-50"
            : "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50",
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
        />

        {previewUrl && dimensions ? (
          <>
            <Image
              src={previewUrl}
              alt="Preview"
              width={dimensions.width}
              height={dimensions.height}
              className="max-h-60 w-auto rounded-md object-contain"
            />
            <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-400">
              {dimensions.width} × {dimensions.height} px
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(null); setDimensions(null); }}
              className="absolute right-2 top-2 rounded-full bg-white p-1.5 transition-colors hover:bg-neutral-100"
              aria-label="Remove image"
            >
              <CloseIcon size={14} />
            </button>
          </>
        ) : (
          <>
            <UploadIcon size={28} className="text-neutral-300" />
            <p className="text-sm text-neutral-500">Drop an image or click to browse</p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-400">PNG · JPG · WebP</p>
          </>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
          Prompt <span className="text-[#9F2F2D]">*</span>
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          rows={4}
          placeholder="A cinematic photograph of a lone astronaut on the surface of Mars at golden hour"
          className="w-full resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-[13px] leading-[1.55] focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
          Description{" "}
          <span className="text-[10px] font-normal uppercase tracking-[0.1em] text-neutral-400">
            recommended for AdSense
          </span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Notes on technique, model settings, or creative intent"
          className="w-full resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          >
            <option value="">Unknown</option>
            {MODEL_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
            Tags{" "}
            <span className="text-[10px] font-normal uppercase tracking-[0.1em] text-neutral-400">
              comma-separated
            </span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="portrait, fantasy, landscape"
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          <div
            className={cn(
              "h-5 w-9 rounded-full transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
              isPublished ? "bg-neutral-900" : "bg-neutral-200",
            )}
          />
          <div
            className={cn(
              "absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
              isPublished && "translate-x-4",
            )}
          />
        </div>
        <span className="text-sm font-medium text-neutral-700">
          {isPublished ? "Publish immediately" : "Save as draft"}
        </span>
      </label>

      {error && (
        <p
          className="rounded-md bg-[#FDEBEC] px-3 py-2 text-[12px] text-[#9F2F2D]"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isUploading}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5",
            "text-sm font-medium text-neutral-50",
            "transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
            isUploading
              ? "cursor-not-allowed opacity-60"
              : "hover:bg-neutral-700 active:scale-[0.98]",
          )}
        >
          {isUploading && <LoaderIcon size={14} />}
          {isUploading ? "Uploading" : isPublished ? "Publish" : "Save draft"}
        </button>

        {previewUrl && prompt && (
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 transition-[background-color,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-neutral-50"
          >
            <EyeIcon size={14} />
            Preview
          </button>
        )}
      </div>

      {showPreview && previewUrl && dimensions && (
        <div className="rounded-md border border-neutral-200 p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
            Preview
          </p>
          <div className="max-w-xs">
            <CardPreview
              imageUrl={previewUrl}
              prompt={prompt}
              model={model || null}
              width={dimensions.width}
              height={dimensions.height}
            />
          </div>
        </div>
      )}
    </form>
  );
}
