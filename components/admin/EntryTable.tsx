"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Eye, EyeOff, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Image as ImageType } from "@/lib/db/schema";

interface EntryTableProps {
  images: ImageType[];
}

export function EntryTable({ images: initialImages }: EntryTableProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleTogglePublish = useCallback(async (image: ImageType) => {
    setLoadingId(image.id);
    try {
      const res = await fetch(`/api/images/${image.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !image.isPublished }),
      });
      if (res.ok) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, isPublished: !img.isPublished } : img,
          ),
        );
        router.refresh();
      }
    } finally {
      setLoadingId(null);
    }
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this entry permanently? This cannot be undone.")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== id));
        router.refresh();
      }
    } finally {
      setLoadingId(null);
    }
  }, [router]);

  if (images.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center">
        <p className="text-sm text-neutral-400">No entries yet. Upload your first image!</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-100 bg-neutral-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Image</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Prompt</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Model</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Date</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {images.map((image) => (
            <tr key={image.id} className="hover:bg-neutral-50 transition-colors">
              <td className="px-4 py-3">
                <div className="relative size-12 overflow-hidden rounded-lg bg-neutral-100">
                  <Image
                    src={image.imageUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              </td>
              <td className="max-w-xs px-4 py-3">
                <p className="line-clamp-2 font-mono text-xs text-neutral-700">{image.prompt}</p>
              </td>
              <td className="px-4 py-3 text-xs text-neutral-500">{image.model ?? "—"}</td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    image.isPublished
                      ? "bg-green-50 text-green-700"
                      : "bg-neutral-100 text-neutral-500",
                  )}
                >
                  {image.isPublished ? "Published" : "Draft"}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-neutral-400">
                {new Date(image.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {loadingId === image.id ? (
                    <Loader2 className="size-4 animate-spin text-neutral-400" />
                  ) : (
                    <>
                      <Link
                        href={`/p/${image.slug}`}
                        target="_blank"
                        className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                        aria-label="View on site"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                      <button
                        onClick={() => handleTogglePublish(image)}
                        className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                        aria-label={image.isPublished ? "Unpublish" : "Publish"}
                      >
                        {image.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(image.id)}
                        className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
