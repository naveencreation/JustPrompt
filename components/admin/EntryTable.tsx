"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
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
import { ConfirmModal } from "./ConfirmModal";
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
  
  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: "single" | "bulk"; id?: string } | null>(null);

  // Drag and drop state
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
      if (!res.ok) throw new Error("Failed to update status");
      
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, isPublished: !img.isPublished } : img,
        ),
      );
      toast.success(image.isPublished ? "Unpublished successfully" : "Published successfully");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoadingId(null);
    }
  }, [router]);

  const executeDelete = useCallback(async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete entry");
      
      setImages((prev) => prev.filter((img) => img.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("Entry deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoadingId(null);
      setConfirmModal(null);
    }
  }, [router]);

  // --- Bulk Actions ---

  const handleBulkTogglePublish = useCallback(async (publish: boolean) => {
    if (selectedIds.size === 0) return;
    setIsSavingOrder(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/images/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: publish }),
        })
      );
      const results = await Promise.all(promises);
      if (results.some((res) => !res.ok)) throw new Error("Some updates failed");
      
      setImages((prev) =>
        prev.map((img) => (selectedIds.has(img.id) ? { ...img, isPublished: publish } : img))
      );
      toast.success(`Bulk ${publish ? "publish" : "unpublish"} successful`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setIsSavingOrder(false);
    }
  }, [selectedIds, router]);

  const executeBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsSavingOrder(true);
    try {
      const promises = Array.from(selectedIds).map((id) => fetch(`/api/images/${id}`, { method: "DELETE" }));
      const results = await Promise.all(promises);
      if (results.some((res) => !res.ok)) throw new Error("Some deletions failed");

      setImages((prev) => prev.filter((img) => !selectedIds.has(img.id)));
      setSelectedIds(new Set());
      toast.success("Bulk delete successful");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setIsSavingOrder(false);
      setConfirmModal(null);
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
      const res = await fetch("/api/images/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error("Failed to save new order");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reorder failed");
    } finally {
      setIsSavingOrder(false);
    }
  }, [images.length, router]);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;

    const nextImages = [...images];
    const [draggedItem] = nextImages.splice(sourceIndex, 1);
    if (!draggedItem) return;
    nextImages.splice(destinationIndex, 0, draggedItem);
    
    setImages(nextImages);
    saveOrder(nextImages);
  }, [images, saveOrder]);

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
              onClick={() => setConfirmModal({ isOpen: true, type: "bulk" })}
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
            <LoaderIcon size={24} className="text-neutral-500 animate-spin" />
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
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="images-table" direction="vertical">
              {(provided) => (
                <tbody
                  className="divide-y divide-neutral-100"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {images.map((image, index) => (
                    <Draggable key={image.id} draggableId={image.id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <tr
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={cn(
                            "transition-colors hover:bg-neutral-50 bg-white",
                            dragSnapshot.isDragging && "shadow-lg ring-1 ring-neutral-200 z-10 table",
                            selectedIds.has(image.id) && "bg-neutral-50"
                          )}
                          style={dragProvided.draggableProps.style}
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
                            <div
                              {...dragProvided.dragHandleProps}
                              className="flex flex-col gap-1 text-neutral-300 cursor-grab active:cursor-grabbing hover:text-neutral-500"
                            >
                              <GripVerticalIcon size={16} />
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
                                <LoaderIcon size={14} className="text-neutral-400 animate-spin" />
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
                                    onClick={() => setConfirmModal({ isOpen: true, type: "single", id: image.id })}
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
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </tbody>
              )}
            </Droppable>
          </DragDropContext>
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

      {confirmModal?.isOpen && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmModal(null)}
          onConfirm={() => {
            if (confirmModal.type === "bulk") {
              executeBulkDelete();
            } else if (confirmModal.id) {
              executeDelete(confirmModal.id);
            }
          }}
          title={confirmModal.type === "bulk" ? "Delete multiple entries" : "Delete entry"}
          description={
            confirmModal.type === "bulk" 
              ? `Are you sure you want to permanently delete ${selectedIds.size} selected entries? This cannot be undone.`
              : "Are you sure you want to permanently delete this entry? This cannot be undone."
          }
          confirmText="Delete"
          isDestructive={true}
          isLoading={loadingId !== null || isSavingOrder}
        />
      )}
    </>
  );
}
