"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Settings } from "@/lib/db/schema";

interface SettingsFormProps {
  settings: Settings | null;
  adapterStatus: Record<string, string>;
}

export function SettingsForm({ settings, adapterStatus }: SettingsFormProps) {
  const router = useRouter();
  const [maintenanceMode, setMaintenanceMode] = useState(
    settings?.maintenanceMode ?? false,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleToggleMaintenance = useCallback(async () => {
    const next = !maintenanceMode;
    setMaintenanceMode(next);
    setIsSaving(true);
    try {
      await fetch("/api/admin/settings/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }, [maintenanceMode, router]);

  const TIER_LABELS: Record<string, string> = {
    memory: "Tier 0 — In-memory (default)",
    redis: "Tier 1 — Upstash Redis",
    supabase: "Tier 0 — Supabase Storage",
    cloudinary: "Tier 2 — Cloudinary",
    postgres: "Tier 0 — Postgres FTS",
    meili: "Tier 2 — Meilisearch",
    console: "Tier 0 — Console",
    sentry: "Tier 1 — Sentry",
    axiom: "Tier 1 — Axiom",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Maintenance mode */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-neutral-700">Maintenance Mode</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-600">
              {maintenanceMode
                ? "Site is in maintenance mode — public gallery shows a coming-soon banner."
                : "Site is live and accessible to everyone."}
            </p>
          </div>
          <button
            onClick={handleToggleMaintenance}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              maintenanceMode
                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "bg-neutral-900 text-white hover:bg-neutral-700",
              isSaving && "opacity-60 cursor-not-allowed",
            )}
          >
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            {saved && <CheckCircle className="size-4" />}
            {maintenanceMode ? "Disable maintenance" : "Enable maintenance"}
          </button>
        </div>
      </div>

      {/* Adapter status */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-neutral-700">Active Adapters</h2>
        <p className="mb-4 text-xs text-neutral-400">
          These are determined at boot from environment variables. To upgrade a service, add the
          corresponding env var and redeploy.
        </p>
        <ul className="flex flex-col gap-2">
          {Object.entries(adapterStatus).map(([capability, impl]) => (
            <li key={capability} className="flex items-center justify-between text-sm">
              <span className="font-medium capitalize text-neutral-700">{capability}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs",
                  impl.includes("redis") || impl.includes("sentry") || impl.includes("axiom") || impl.includes("cloudinary") || impl.includes("meili")
                    ? "bg-blue-50 text-blue-700"
                    : "bg-neutral-100 text-neutral-500",
                )}
              >
                {TIER_LABELS[impl] ?? impl}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
