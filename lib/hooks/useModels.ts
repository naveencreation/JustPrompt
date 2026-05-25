"use client";

import useSWR from "swr";
import type { ModelEntity } from "@/lib/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useModels() {
  const { data, error, isLoading, mutate } = useSWR<ModelEntity[]>("/api/models", fetcher, {
    revalidateOnFocus: false, // Models rarely change, avoid overfetching
    dedupingInterval: 60000,
  });

  return {
    models: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useModelLabel(slug: string | null): string | null {
  const { models } = useModels();
  if (!slug) return null;
  const model = models.find((m) => m.slug === slug);
  return model ? model.shortName : slug; // fallback to slug if not found
}
