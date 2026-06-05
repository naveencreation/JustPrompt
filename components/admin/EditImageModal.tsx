"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { LoaderIcon } from "@/components/icons";
import type { Image as ImageType } from "@/lib/db/schema";
import { ModelCombobox } from "./ModelCombobox";
import { TagCombobox } from "./TagCombobox";

interface EditImageModalProps {
  image: ImageType;
  onClose: () => void;
  onSave: (image: ImageType) => void;
}

export function EditImageModal({ image, onClose, onSave }: EditImageModalProps) {
  const [prompt, setPrompt] = useState(image.prompt);
  const [description, setDescription] = useState(image.description ?? "");
  const [model, setModel] = useState(image.model ?? "");
  const [tags, setTags] = useState<string[]>([]);
  const [likes, setLikes] = useState<number>(0);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDetails() {
      try {
        const res = await fetch(`/api/images/${image.id}`);
        if (!res.ok) throw new Error("Failed to load image details");
        const data = await res.json();
        if (active) {
          setTags(data.tags ?? []);
          setLikes(data.likes ?? 0);
          setModel(data.model ?? "");
        }
      } catch (err) {
        console.error("Failed to load extra details:", err);
      } finally {
        if (active) {
          setIsLoadingDetails(false);
        }
      }
    }
    loadDetails();
    return () => {
      active = false;
    };
  }, [image.id]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/images/${image.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          description: description || null,
          model: model || null,
          tags,
          likes,
        }),
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
        
        <div className="flex flex-col gap-6 p-6 sm:flex-row overflow-y-auto max-h-[70vh]">
          <div className="relative w-full max-w-[200px] shrink-0 overflow-hidden rounded-md bg-neutral-100 self-start" style={{ aspectRatio: `${image.width}/${image.height}` }}>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
                  Model {isLoadingDetails && <span className="normal-case text-neutral-400 font-normal ml-1">Loading...</span>}
                </label>
                {isLoadingDetails ? (
                  <div className="h-9 w-full animate-pulse rounded-md bg-neutral-100" />
                ) : (
                  <ModelCombobox value={model} onChange={setModel} />
                )}
              </div>
              
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
                  Likes {isLoadingDetails && <span className="normal-case text-neutral-400 font-normal ml-1">Loading...</span>}
                </label>
                {isLoadingDetails ? (
                  <div className="h-9 w-full animate-pulse rounded-md bg-neutral-100" />
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={likes}
                    onChange={(e) => setLikes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-9 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-700 outline-none focus:border-neutral-400 focus:bg-white"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
                Tags {isLoadingDetails && <span className="normal-case text-neutral-400 font-normal ml-1">Loading...</span>}
              </label>
              {isLoadingDetails ? (
                <div className="h-9 w-full animate-pulse rounded-md bg-neutral-100" />
              ) : (
                <TagCombobox value={tags} onChange={setTags} />
              )}
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
            disabled={isSaving || isLoadingDetails}
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
