"use client";

import { useState } from "react";
import { ChevronDownIcon, LoaderIcon } from "@/components/icons";
import { useModels } from "@/lib/hooks/useModels";
import { toast } from "sonner";

interface ModelComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function ModelCombobox({ value, onChange }: ModelComboboxProps) {
  const { models, isLoading, mutate } = useModels();
  const [isCreating, setIsCreating] = useState(false);

  const handleAddClick = async () => {
    const rawName = window.prompt("Enter new model name (e.g., 'Grok 2'):");
    if (!rawName?.trim()) return;

    const shortName = window.prompt("Enter short name for badges (e.g., 'Grok 2'):", rawName);
    if (!shortName?.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: rawName.trim(), shortName: shortName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create model");
      const newModel = await res.json();
      
      await mutate([...models, newModel], false); // Optimistic update
      onChange(newModel.slug);
      toast.success(`Model ${newModel.name} added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating model");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading || isCreating}
          className="appearance-none w-full rounded-md border border-neutral-200 bg-white pl-3 pr-8 py-2 text-sm focus:border-neutral-400 focus:outline-none transition-[border-color,box-shadow]"
        >
          <option value="">Unknown</option>
          {models.map((m) => (
            <option key={m.slug} value={m.slug}>{m.name}</option>
          ))}
        </select>
        <ChevronDownIcon size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
      </div>
      <button
        type="button"
        onClick={handleAddClick}
        disabled={isLoading || isCreating}
        className="flex items-center justify-center shrink-0 size-9 rounded-md border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
        title="Add new model"
      >
        {isCreating ? <LoaderIcon size={14} className="animate-spin" /> : "+"}
      </button>
    </div>
  );
}
