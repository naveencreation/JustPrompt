import { imageService } from "@/lib/services/imageService";
import { EntryTable } from "@/components/admin/EntryTable";
import { ListIcon } from "@/components/icons";
import { DASHBOARD } from "@/lib/constants/limits";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const images = await imageService.listAll({ limit: DASHBOARD.MANAGE_PAGE_SIZE });

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListIcon size={20} className="text-neutral-500" />
          <h1 className="font-serif text-2xl tracking-tight text-neutral-900">Manage entries</h1>
        </div>
        <p className="text-sm text-neutral-500">{images.length} entries</p>
      </div>
      <EntryTable images={images} />
    </div>
  );
}
