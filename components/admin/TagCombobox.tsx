"use client";

import { useState, useRef, useEffect } from "react";
import { usePopularTags } from "@/lib/hooks/useTags";
import { cn } from "@/lib/utils/cn";
import { CloseIcon, ChevronDownIcon } from "@/components/icons";
import { CURATED_TAGS } from "@/lib/constants/tags";

interface TagComboboxProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function TagCombobox({ value, onChange }: TagComboboxProps) {
  const { tags: popularTags, isLoading } = usePopularTags();
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
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

  const addTag = (tagName: string) => {
    const val = tagName.trim().toLowerCase();
    if (val && !value.includes(val)) {
      onChange([...value, val]);
    }
    setInputValue("");
    setIsOpen(false);
  };

  const removeTag = (tagName: string) => {
    onChange(value.filter((t) => t !== tagName));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue) {
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Remove last tag on backspace if input is empty
      const lastTag = value[value.length - 1];
      if (lastTag) removeTag(lastTag);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Merge curated tags and popular tags from DB
  const mergedTags = Array.from(new Set([
    ...CURATED_TAGS,
    ...popularTags.map(t => t.name)
  ]));

  // Filter tags based on input
  const filteredTags = mergedTags.filter(
    (tagName) =>
      tagName.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(tagName.toLowerCase())
  );

  const showAddOption =
    inputValue.trim().length > 0 &&
    !mergedTags.some((tagName) => tagName.toLowerCase() === inputValue.trim().toLowerCase()) &&
    !value.includes(inputValue.trim().toLowerCase());

  return (
    <div className="relative flex flex-col gap-2" ref={containerRef}>
      <div
        className={cn(
          "relative flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 transition-[border-color,box-shadow]",
          isOpen ? "border-neutral-400 ring-2 ring-neutral-100" : "border-neutral-200"
        )}
        onClick={() => setIsOpen(true)}
      >
        {/* Selected tag chips inside the input area */}
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex shrink-0 items-center gap-1 rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700"
          >
            {t}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(t);
              }}
              className="text-neutral-400 hover:text-neutral-700 focus:outline-none"
            >
              <CloseIcon size={12} />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={value.length === 0 ? "Select or type tags..." : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
          <ChevronDownIcon size={16} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !isLoading && (
        <div className="absolute z-10 mt-[46px] w-full max-h-60 overflow-y-auto rounded-md border border-neutral-200 bg-white p-1 shadow-lg">
          {showAddOption && (
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              className="flex w-full items-center rounded-sm px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
            >
              <span className="font-medium">Add &quot;{inputValue}&quot;</span>
            </button>
          )}

          {filteredTags.map((tagName) => (
            <button
              key={tagName}
              type="button"
              onClick={() => addTag(tagName)}
              className="flex w-full items-center rounded-sm px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
            >
              {tagName}
            </button>
          ))}

          {!showAddOption && filteredTags.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-500 text-center">
              No tags found. Type to add a new one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
