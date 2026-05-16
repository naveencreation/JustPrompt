import { imageRepo } from "@/lib/repos/imageRepo";
import { EntryTable } from "@/components/admin/EntryTable";
import { List } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const images = await imageRepo.listAll({ limit: 100 });

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <List className="size-5 text-neutral-500" />
          <h1 className="text-xl font-semibold text-neutral-900">Manage Entries</h1>
        </div>
        <p className="text-sm text-neutral-500">{images.length} entries</p>
      </div>
      <EntryTable images={images} />
    </div>
  );
}
