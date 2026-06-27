"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import type { Tag } from "@/lib/db/schema";

interface SearchSuggestionsProps {
  query: string;
  isFocused: boolean;
  onSelect: (tagName: string) => void;
  onClose: () => void;
}

interface SuggestionTag extends Tag {
  count: number;
}

const SUGGEST_DEBOUNCE_MS = 150;

export function SearchSuggestions({ query, isFocused, onSelect, onClose }: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestionTag[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim() || query.trim().length < 1 || !isFocused) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) return;
        const json = (await res.json()) as { tags: SuggestionTag[] };
        setSuggestions(json.tags ?? []);
        setActiveIndex(-1);
      } catch {
        // Silently fail — suggestions are non-critical
      } finally {
        setLoading(false);
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, isFocused]);

  const show = isFocused && query.trim().length >= 1 && !loading;

  if (!show && suggestions.length === 0) return null;
  if (loading && suggestions.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
      {suggestions.length > 0 && (
        <ul className="py-1" role="listbox" aria-label="Search suggestions">
          {suggestions.map((tag, index) => (
            <li key={tag.id} role="option" aria-selected={index === activeIndex}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click fires
                  onSelect(tag.name);
                  onClose();
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2 text-sm transition-colors",
                  index === activeIndex ? "bg-neutral-100 text-neutral-900" : "text-neutral-700",
                )}
              >
                <span className="font-medium">{tag.name}</span>
                <span className="text-[11px] text-neutral-400">
                  {tag.count} {tag.count === 1 ? "prompt" : "prompts"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && suggestions.length === 0 && query.trim().length >= 1 && (
        <p className="px-4 py-3 text-sm text-neutral-400">No matching tags</p>
      )}
    </div>
  );
}
