"use client";

import { useState } from "react";
import Image from "next/image";
import { LoaderIcon } from "@/components/icons";
import type { Image as ImageType } from "@/lib/db/schema";

interface EditImageModalProps {
  image: ImageType;
  onClose: () => void;
  onSave: (image: ImageType) => void;
}

export function EditImageModal({ image, onClose, onSave }: EditImageModalProps) {
  const [prompt, setPrompt] = useState(image.prompt);
  const [description, setDescription] = useState(image.description ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/images/${image.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, description: description || null }),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      
      const updated = await res.json() as ImageType;
      onSave(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="font-serif text-xl text-neutral-900">Edit Image Details</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>
        
        <div className="flex flex-col gap-6 p-6 sm:flex-row">
          <div className="relative w-full max-w-[200px] shrink-0 overflow-hidden rounded-md bg-neutral-100" style={{ aspectRatio: `${image.width}/${image.height}` }}>
            <Image src={image.imageUrl} alt="" fill className="object-cover" sizes="200px" />
          </div>
          
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs text-neutral-700 outline-none focus:border-neutral-400 focus:bg-white"
              />
            </div>
            
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">Description (For SEO)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 outline-none focus:border-neutral-400 focus:bg-white"
              />
            </div>
            
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSaving && <LoaderIcon size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
