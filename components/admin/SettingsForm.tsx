"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FeaturedImagePicker } from "./FeaturedImagePicker";
import { LoaderIcon, CheckIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import type { Settings } from "@/lib/db/schema";

interface SettingsFormProps {
  settings: Settings | null;
  adapterStatus: Record<string, string>;
}

const TIER_LABELS: Record<string, string> = {
  memory:     "Tier 0 — In-memory",
  redis:      "Tier 1 — Upstash Redis",
  supabase:   "Tier 0 — Supabase Storage",
  cloudinary: "Tier 2 — Cloudinary",
  postgres:   "Tier 0 — Postgres FTS",
  meili:      "Tier 2 — Meilisearch",
  console:    "Tier 0 — Console",
  sentry:     "Tier 1 — Sentry",
  axiom:      "Tier 1 — Axiom",
};

const UPGRADED_TIERS = new Set(["redis", "sentry", "axiom", "cloudinary", "meili"]);

export function SettingsForm({ settings, adapterStatus }: SettingsFormProps) {
  const router = useRouter();
  const [maintenanceMode, setMaintenanceMode] = useState(settings?.maintenanceMode ?? false);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleMaintenance = useCallback(async () => {
    const next = !maintenanceMode;
    setMaintenanceMode(next);
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error("Failed to update maintenance mode");
      toast.success(`Maintenance mode ${next ? "enabled" : "disabled"}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
      setMaintenanceMode(!next);
    } finally {
      setIsSaving(false);
    }
  }, [maintenanceMode, router]);

  const handleSetFeaturedImage = useCallback(async (imageId: string | null) => {
    try {
      const res = await fetch("/api/admin/settings/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      if (!res.ok) throw new Error("Failed to set featured image");
      toast.success("Featured image updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  }, [router]);

  const handleManualAction = useCallback(async (action: "sitemap" | "likes") => {
    setIsSaving(true);
    try {
      if (action === "sitemap") {
        const res = await fetch("/api/revalidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag: "gallery", secret: "no-op" })
        });
        if (!res.ok) throw new Error("Failed to regenerate sitemap");
        toast.success("Sitemap regenerated");
      } else {
        const res = await fetch("/api/cron/flush-likes", { method: "POST" });
        if (!res.ok) throw new Error("Failed to flush likes");
        toast.success("Likes flushed to database");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-md border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          Maintenance mode
        </h2>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-600">
            {maintenanceMode
              ? "Site is in maintenance mode. The public gallery shows a banner."
              : "Site is live and accessible to everyone."}
          </p>
          <button
            onClick={handleToggleMaintenance}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium",
              "transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
              maintenanceMode
                ? "bg-[#FBF3DB] text-[#956400] hover:bg-[#F8EBC4]"
                : "bg-neutral-900 text-neutral-50 hover:bg-neutral-700",
              !isSaving && "active:scale-[0.98]",
              isSaving && "cursor-not-allowed opacity-60",
            )}
          >
            {isSaving && <LoaderIcon size={14} />}
            {maintenanceMode ? "Disable" : "Enable"} maintenance
          </button>
        </div>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          Prompt of the Day
        </h2>
        <FeaturedImagePicker
          currentFeaturedId={settings?.featuredImageId ?? null}
          onSelect={handleSetFeaturedImage}
        />
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          Manual Triggers
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-neutral-600">Manually trigger a full sitemap regeneration</p>
            <button
              onClick={() => handleManualAction("sitemap")}
              disabled={isSaving}
              className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-[13px] font-medium text-neutral-600 transition-[background-color,border-color] hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Regenerate Sitemap
            </button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-neutral-600">Manually flush Upstash Redis likes to Postgres (Tier 1+ only)</p>
            <button
              onClick={() => handleManualAction("likes")}
              disabled={isSaving}
              className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-[13px] font-medium text-neutral-600 transition-[background-color,border-color] hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Flush Likes
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-6">
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          Active adapters
        </h2>
        <p className="mb-5 text-[12px] text-neutral-500">
          Determined at boot from environment variables. Add the corresponding env var and redeploy
          to upgrade a tier — no code changes required.
        </p>
        <ul className="flex flex-col divide-y divide-neutral-100">
          {Object.entries(adapterStatus).map(([capability, impl]) => (
            <li key={capability} className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0">
              <span className="font-medium capitalize text-neutral-700">{capability}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.05em]",
                  UPGRADED_TIERS.has(impl)
                    ? "bg-[#E1F3FE] text-[#1F6C9F]"
                    : "bg-neutral-100 text-neutral-500",
                )}
              >
                {TIER_LABELS[impl] ?? impl}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
