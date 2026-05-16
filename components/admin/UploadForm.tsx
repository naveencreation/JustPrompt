"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, Eye } from "lucide-react";
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
        // 1. Get a signed upload URL
        const sigRes = await fetch("/api/admin/upload-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name }),
        });
        if (!sigRes.ok) throw new Error("Failed to get upload signature");
        const { uploadUrl, storageKey } = (await sigRes.json()) as {
          uploadUrl: string;
          storageKey: string;
        };

        // 2. Upload directly to storage
        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        // 3. Construct public URL and save metadata
        const imageUrl = `${process.env["NEXT_PUBLIC_SUPABASE_URL"]}/storage/v1/object/public/images/${storageKey}`;
        const createRes = await fetch("/api/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storageKey,
            storageProvider: "supabase",
            imageUrl,
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
          "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors",
          file ? "border-neutral-300 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400",
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
              className="max-h-60 w-auto rounded-lg object-contain"
            />
            <p className="text-xs text-neutral-400">
              {dimensions.width}×{dimensions.height}px
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(null); setDimensions(null); }}
              className="absolute right-2 top-2 rounded-full bg-white p-1 shadow hover:bg-neutral-100"
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <>
            <Upload className="size-8 text-neutral-300" />
            <p className="text-sm text-neutral-500">Drop an image or click to browse</p>
            <p className="text-xs text-neutral-400">PNG, JPG, WebP</p>
          </>
        )}
      </div>

      {/* Prompt */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">
          Prompt <span className="text-red-500">*</span>
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          rows={4}
          placeholder="A cinematic photograph of a lone astronaut standing on the surface of Mars…"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm resize-none focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">
          Description <span className="text-xs text-neutral-400">(recommended for AdSense)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Notes on technique, model settings, or creative intent…"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm resize-none focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Model */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          >
            <option value="">Unknown</option>
            {MODEL_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Tags <span className="text-xs text-neutral-400">(comma-separated)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="portrait, fantasy, landscape"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Publish toggle */}
      <label className="flex cursor-pointer items-center gap-3">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          <div className={cn("h-5 w-9 rounded-full transition-colors", isPublished ? "bg-neutral-900" : "bg-neutral-200")} />
          <div className={cn("absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform", isPublished && "translate-x-4")} />
        </div>
        <span className="text-sm font-medium text-neutral-700">
          {isPublished ? "Publish immediately" : "Save as draft"}
        </span>
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isUploading}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors",
            isUploading ? "opacity-60 cursor-not-allowed" : "hover:bg-neutral-700",
          )}
        >
          {isUploading && <Loader2 className="size-4 animate-spin" />}
          {isUploading ? "Uploading…" : isPublished ? "Publish" : "Save draft"}
        </button>

        {previewUrl && prompt && (
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <Eye className="size-4" />
            Preview
          </button>
        )}
      </div>

      {/* Card preview panel */}
      {showPreview && previewUrl && dimensions && (
        <div className="rounded-xl border border-neutral-200 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
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
