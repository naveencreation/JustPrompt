import { adminService } from "@/lib/services/adminService";
import { config } from "@/lib/config";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await adminService.getSettings();

  const adapterStatus = {
    cache: config.cache,
    storage: config.storage,
    search: config.search,
    errors: config.errors,
    logs: config.logs,
  };

  return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      <div className="mb-8 flex items-center gap-2">
        <Settings className="size-5 text-neutral-500" />
        <h1 className="text-xl font-semibold text-neutral-900">Settings</h1>
      </div>
      <SettingsForm settings={settings} adapterStatus={adapterStatus} />
    </div>
  );
}
