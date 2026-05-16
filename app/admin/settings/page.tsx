import { adminService } from "@/lib/services/adminService";
import { config } from "@/lib/config";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { SettingsIcon } from "@/components/icons";

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
    <div className="mx-auto w-full max-w-2xl p-8">
      <header className="mb-10 flex items-center gap-2">
        <SettingsIcon size={20} className="text-neutral-500" />
        <h1 className="font-serif text-2xl tracking-tight text-neutral-900">Settings</h1>
      </header>
      <SettingsForm settings={settings} adapterStatus={adapterStatus} />
    </div>
  );
}
