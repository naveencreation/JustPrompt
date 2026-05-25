"use client";

import useSWR from "swr";
import type { Tag } from "@/lib/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePopularTags() {
  const { data, error, isLoading, mutate } = useSWR<Tag[]>("/api/tags/popular", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  return {
    tags: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
