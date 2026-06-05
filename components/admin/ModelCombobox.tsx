"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, LoaderIcon } from "@/components/icons";
import { useModels } from "@/lib/hooks/useModels";
import { AddModelModal } from "./AddModelModal";
import { cn } from "@/lib/utils/cn";

interface ModelComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function ModelCombobox({ value, onChange }: ModelComboboxProps) {
  const { models, isLoading, mutate } = useModels();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (slug: string) => {
    onChange(slug);
    setIsOpen(false);
  };

  const handleModelCreated = async (newModel: any) => {
    await mutate([...models, newModel], false); // Optimistic update
    onChange(newModel.slug);
  };

  const selectedModel = models.find((m) => m.slug === value);
  const displayLabel = selectedModel ? selectedModel.name : "Unknown";

  return (
    <div className="flex gap-2 items-center" ref={containerRef}>
      <div className="relative flex-1 z-20">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border bg-white px-3 text-sm text-neutral-900 text-left transition-[border-color,box-shadow] disabled:opacity-50",
            isOpen
              ? "border-neutral-400 ring-2 ring-neutral-100"
              : "border-neutral-200 hover:border-neutral-400"
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDownIcon
            size={16}
            className={cn(
              "text-neutral-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div
            className="absolute z-10 w-full max-h-60 overflow-y-auto rounded-md border border-neutral-200 bg-white p-1 shadow-lg"
            style={{ bottom: "100%", marginBottom: "4px", top: "auto" }}
          >
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={cn(
                "flex w-full items-center rounded-sm px-3 py-2 text-sm text-left hover:bg-neutral-50 hover:text-neutral-900 transition-colors",
                value === ""
                  ? "bg-neutral-50 font-medium text-neutral-900"
                  : "text-neutral-600"
              )}
            >
              Unknown
            </button>
            {models.map((m) => (
              <button
                key={m.slug}
                type="button"
                onClick={() => handleSelect(m.slug)}
                className={cn(
                  "flex w-full items-center rounded-sm px-3 py-2 text-sm text-left hover:bg-neutral-50 hover:text-neutral-900 transition-colors",
                  value === m.slug
                    ? "bg-neutral-50 font-medium text-neutral-900"
                    : "text-neutral-600"
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={isLoading}
        className="flex items-center justify-center shrink-0 h-9 w-9 rounded-md border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
        title="Add new model"
      >
        {isLoading ? <LoaderIcon size={14} className="animate-spin" /> : "+"}
      </button>

      <AddModelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleModelCreated}
      />
    </div>
  );
}
