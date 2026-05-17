"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrashIcon,
  EyeIcon,
  EyeOffIcon,
  ExternalLinkIcon,
  LoaderIcon,
  EditIcon,
  GripVerticalIcon,
  ArrowUpIcon
} from "@/components/icons";
import { EditImageModal } from "./EditImageModal";
import { cn } from "@/lib/utils/cn";
import type { Image as ImageType } from "@/lib/db/schema";

interface EntryTableProps {
  images: ImageType[];
}

export function EntryTable({ images: initialImages }: EntryTableProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Edit modal state
  const [editingImage, setEditingImage] = useState<ImageType | null>(null);
  
  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // --- Actions ---

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
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        router.refresh();
      }
    } finally {
      setLoadingId(null);
    }
  }, [router]);

  // --- Bulk Actions ---

  const handleBulkTogglePublish = useCallback(async (publish: boolean) => {
    if (selectedIds.size === 0) return;
    setIsSavingOrder(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/images/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPublished: publish }),
          })
        )
      );
      setImages((prev) =>
        prev.map((img) => (selectedIds.has(img.id) ? { ...img, isPublished: publish } : img))
      );
      router.refresh();
    } finally {
      setIsSavingOrder(false);
    }
  }, [selectedIds, router]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} entries permanently?`)) return;
    setIsSavingOrder(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => fetch(`/api/images/${id}`, { method: "DELETE" }))
      );
      setImages((prev) => prev.filter((img) => !selectedIds.has(img.id)));
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setIsSavingOrder(false);
    }
  }, [selectedIds, router]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === images.length && images.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
    }
  }, [images, selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // --- Reordering ---

  const saveOrder = useCallback(async (newOrderedImages: ImageType[]) => {
    setIsSavingOrder(true);
    try {
      const updates = newOrderedImages.map((img, index) => ({
        id: img.id,
        displayOrder: images.length - index, // highest order at top
      }));
      await fetch("/api/images/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      router.refresh();
    } finally {
      setIsSavingOrder(false);
    }
  }, [images.length, router]);

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    // transparent drag image so we just rely on visual row dragging
    const dragIcon = document.createElement('div');
    e.dataTransfer.setDragImage(dragIcon, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIdx = images.findIndex((img) => img.id === draggedId);
    const targetIdx = images.findIndex((img) => img.id === targetId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;

    const nextImages = [...images];
    const draggedItem = nextImages.splice(draggedIdx, 1)[0]!;
    nextImages.splice(targetIdx, 0, draggedItem);
    
    setImages(nextImages);
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    setDraggedId(null);
    saveOrder(images);
  };

  const moveToTop = useCallback((id: string) => {
    const idx = images.findIndex((img) => img.id === id);
    if (idx <= 0) return;
    const nextImages = [...images];
    const item = nextImages.splice(idx, 1)[0]!;
    nextImages.unshift(item);
    setImages(nextImages);
    saveOrder(nextImages);
  }, [images, saveOrder]);

  if (images.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 bg-white py-20 text-center">
        <p className="font-serif text-lg tracking-tight text-neutral-700">No entries yet</p>
        <p className="mt-1 text-sm text-neutral-400">Upload your first image to get started.</p>
      </div>
    );
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-neutral-200 bg-white p-3 shadow-sm">
          <p className="text-sm font-medium text-neutral-700">{selectedIds.size} items selected</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkTogglePublish(true)}
              disabled={isSavingOrder}
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
            >
              Publish
            </button>
            <button
              onClick={() => handleBulkTogglePublish(false)}
              disabled={isSavingOrder}
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
            >
              Unpublish
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isSavingOrder}
              className="rounded-md bg-[#FDEBEC] px-3 py-1.5 text-xs font-medium text-[#9F2F2D] hover:bg-[#F8D0D1] disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white relative">
        {isSavingOrder && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
            <LoaderIcon size={24} className="text-neutral-500" />
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === images.length && images.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
              </th>
              <th className="w-8 px-2 py-3 text-left"></th>
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
              <tr
                key={image.id}
                draggable
                onDragStart={(e) => handleDragStart(e, image.id)}
                onDragOver={(e) => handleDragOver(e, image.id)}
                onDrop={handleDrop}
                onDragEnd={() => setDraggedId(null)}
                className={cn(
                  "transition-colors hover:bg-neutral-50",
                  draggedId === image.id && "bg-neutral-50 opacity-50",
                  selectedIds.has(image.id) && "bg-neutral-50"
                )}
              >
                <td className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(image.id)}
                    onChange={() => toggleSelect(image.id)}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                </td>
                <td className="w-8 px-2 py-3">
                  <div className="flex flex-col gap-1 text-neutral-300">
                    <button className="cursor-grab active:cursor-grabbing hover:text-neutral-500">
                      <GripVerticalIcon size={16} />
                    </button>
                  </div>
                </td>
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
                  {new Date(image.createdAt).toLocaleDateString("en-US")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {loadingId === image.id ? (
                      <LoaderIcon size={14} className="text-neutral-400" />
                    ) : (
                      <>
                        <button
                          onClick={() => moveToTop(image.id)}
                          className="rounded p-1.5 text-neutral-400 transition-[background-color,color] hover:bg-neutral-100 hover:text-neutral-700"
                          title="Move to Top"
                        >
                          <ArrowUpIcon size={14} />
                        </button>
                        <button
                          onClick={() => setEditingImage(image)}
                          className="rounded p-1.5 text-neutral-400 transition-[background-color,color] hover:bg-neutral-100 hover:text-neutral-700"
                          title="Edit"
                        >
                          <EditIcon size={14} />
                        </button>
                        <Link
                          href={`/p/${image.slug}`}
                          target="_blank"
                          className="rounded p-1.5 text-neutral-400 transition-[background-color,color] hover:bg-neutral-100 hover:text-neutral-700"
                          title="View on site"
                        >
                          <ExternalLinkIcon size={14} />
                        </Link>
                        <button
                          onClick={() => handleTogglePublish(image)}
                          className="rounded p-1.5 text-neutral-400 transition-[background-color,color] hover:bg-neutral-100 hover:text-neutral-700"
                          title={image.isPublished ? "Unpublish" : "Publish"}
                        >
                          {image.isPublished ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(image.id)}
                          className="rounded p-1.5 text-neutral-400 transition-[background-color,color] hover:bg-[#FDEBEC] hover:text-[#9F2F2D]"
                          title="Delete"
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

      {editingImage && (
        <EditImageModal
          image={editingImage}
          onClose={() => setEditingImage(null)}
          onSave={(updated) => {
            setImages((prev) => prev.map((img) => (img.id === updated.id ? updated : img)));
            setEditingImage(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
