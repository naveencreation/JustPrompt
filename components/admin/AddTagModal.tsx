"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/icons";
import { toast } from "sonner";

interface AddTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: string[];
  onAdd: (newTag: string) => void;
}

export function AddTagModal({ isOpen, onClose, selectedTags, onAdd }: AddTagModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tagName, setTagName] = useState("");

  // Mount on client side to avoid hydration mismatch with portals
  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear input field when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTagName("");
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = tagName.trim().toLowerCase();

    if (!cleanTag) {
      toast.error("Please enter a tag name");
      return;
    }

    if (selectedTags.includes(cleanTag)) {
      toast.error("This tag is already added");
      return;
    }

    onAdd(cleanTag);
    toast.success(`Tag "${cleanTag}" added`);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl animate-in"
        style={{ maxWidth: "380px" }}
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 p-4">
          <h2 className="font-medium text-neutral-900">Add New Tag</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-5">
            <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
              Tag Name <span className="text-[#9F2F2D]">*</span>
            </label>
            <input
              type="text"
              required
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="e.g., futuristic"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 border-t border-neutral-100 bg-neutral-50/50 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-[13px] font-medium text-neutral-50 transition-[background-color,transform] hover:bg-neutral-700 active:scale-[0.98]"
            >
              Add Tag
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
