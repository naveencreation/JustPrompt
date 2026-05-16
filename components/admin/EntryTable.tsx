"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrashIcon, EyeIcon, EyeOffIcon, ExternalLinkIcon, LoaderIcon } from "@/components/icons";
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
      <div className="rounded-md border border-neutral-200 bg-white py-20 text-center">
        <p className="font-serif text-lg tracking-tight text-neutral-700">
          No entries yet
        </p>
        <p className="mt-1 text-sm text-neutral-400">Upload your first image to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50">
          <tr>
            {["Image", "Prompt", "Model", "Status", "Date", ""].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500 last:text-right"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {images.map((image) => (
            <tr key={image.id} className="transition-colors hover:bg-neutral-50">
              <td className="px-4 py-3">
                <div className="relative size-12 overflow-hidden rounded-md bg-neutral-100">
                  <Image src={image.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                </div>
              </td>
              <td className="max-w-xs px-4 py-3">
                <p className="line-clamp-2 font-mono text-[12px] leading-[1.5] text-neutral-700">
                  {image.prompt}
                </p>
              </td>
              <td className="px-4 py-3 text-[11px] uppercase tracking-[0.05em] text-neutral-500">
                {image.model ?? "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em]",
                    image.isPublished
                      ? "bg-[#EDF3EC] text-[#346538]"
                      : "bg-neutral-100 text-neutral-500",
                  )}
                >
                  {image.isPublished ? "Published" : "Draft"}
                </span>
              </td>
              <td className="px-4 py-3 text-[11px] text-neutral-400">
                {new Date(image.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {loadingId === image.id ? (
                    <LoaderIcon size={14} className="text-neutral-400" />
                  ) : (
                    <>
                      <Link
                        href={`/p/${image.slug}`}
                        target="_blank"
                        className="rounded p-1.5 text-neutral-400 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-100 hover:text-neutral-700"
                        aria-label="View on site"
                      >
                        <ExternalLinkIcon size={14} />
                      </Link>
                      <button
                        onClick={() => handleTogglePublish(image)}
                        className="rounded p-1.5 text-neutral-400 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-100 hover:text-neutral-700"
                        aria-label={image.isPublished ? "Unpublish" : "Publish"}
                      >
                        {image.isPublished ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                      </button>
                      <button
                        onClick={() => handleDelete(image.id)}
                        className="rounded p-1.5 text-neutral-400 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#FDEBEC] hover:text-[#9F2F2D]"
                        aria-label="Delete"
                      >
                        <TrashIcon size={14} />
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
