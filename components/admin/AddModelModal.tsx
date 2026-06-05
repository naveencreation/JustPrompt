"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, LoaderIcon } from "@/components/icons";
import { toast } from "sonner";
import type { ModelEntity } from "@/lib/db/schema";

interface AddModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newModel: ModelEntity) => void;
}

export function AddModelModal({ isOpen, onClose, onCreated }: AddModelModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [isSyncingShortName, setIsSyncingShortName] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mount on client side to avoid hydration mismatch when using Portals
  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear fields and reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName("");
      setShortName("");
      setIsSyncingShortName(true);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (isSyncingShortName) {
      setShortName(val);
    }
  };

  const handleShortNameChange = (val: string) => {
    setShortName(val);
    setIsSyncingShortName(false); // Stop auto-syncing once user manually overrides
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortName.trim()) {
      toast.error("Please fill in both fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), shortName: shortName.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to create model");
      }

      const newModel = (await res.json()) as ModelEntity;
      toast.success(`Model "${newModel.name}" added`);
      onCreated(newModel);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating model");
    } finally {
      setIsSubmitting(false);
    }
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
          <h2 className="font-medium text-neutral-900">Add New Model</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 p-5">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                Model Name <span className="text-[#9F2F2D]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Midjourney v6"
                disabled={isSubmitting}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-neutral-700">
                Short Name (for badges) <span className="text-[#9F2F2D]">*</span>
              </label>
              <input
                type="text"
                required
                value={shortName}
                onChange={(e) => handleShortNameChange(e.target.value)}
                placeholder="e.g., MJ v6"
                disabled={isSubmitting}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 border-t border-neutral-100 bg-neutral-50/50 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md px-4 py-2 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-[13px] font-medium text-neutral-50 transition-[background-color,transform] hover:bg-neutral-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <LoaderIcon size={14} className="animate-spin" />}
              Add Model
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
