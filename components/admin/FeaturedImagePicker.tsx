"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { LoaderIcon, SearchIcon, CheckIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import type { Image as ImageType } from "@/lib/db/schema";

interface FeaturedImagePickerProps {
  currentFeaturedId: string | null;
  onSelect: (imageId: string | null) => Promise<void>;
}

export function FeaturedImagePicker({ currentFeaturedId, onSelect }: FeaturedImagePickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ImageType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
      if (res.ok) {
        const data = await res.json() as { items: ImageType[] };
        setResults(data.items);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = async (imageId: string | null) => {
    setIsOpen(false);
    setIsSaving(true);
    try {
      await onSelect(imageId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setQuery("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-3" ref={wrapperRef}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-600">
          Currently featured: {currentFeaturedId ? <span className="font-mono text-xs text-neutral-900">{currentFeaturedId}</span> : "None"}
        </p>
        <div className="flex items-center gap-2">
          {currentFeaturedId && (
            <button
              onClick={() => handleSelect(null)}
              disabled={isSaving}
              className="text-xs font-medium text-neutral-400 hover:text-red-500"
            >
              Clear
            </button>
          )}
          {saved && <span className="flex items-center gap-1 text-xs text-green-600"><CheckIcon size={12} /> Saved</span>}
          {isSaving && <LoaderIcon size={14} />}
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
          <SearchIcon size={16} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search prompts to feature..."
          className="w-full rounded-md border border-neutral-200 py-2 pl-10 pr-4 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
        />
      </div>

      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-[88px] z-10 max-h-64 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white p-1 shadow-lg">
          {isSearching ? (
            <div className="flex items-center justify-center py-4">
              <LoaderIcon size={16} className="text-neutral-400" />
            </div>
          ) : results.length > 0 ? (
            <ul className="flex flex-col">
              {results.map((img) => (
                <li key={img.id}>
                  <button
                    onClick={() => handleSelect(img.id)}
                    className="flex w-full items-center gap-3 rounded-[4px] p-2 text-left hover:bg-neutral-50"
                  >
                    <div className="relative size-10 shrink-0 overflow-hidden rounded bg-neutral-100">
                      <Image src={img.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                    </div>
                    <span className="line-clamp-2 min-w-0 font-mono text-xs text-neutral-700">
                      {img.prompt}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-4 text-center text-xs text-neutral-500">No images found</div>
          )}
        </div>
      )}
    </div>
  );
}
