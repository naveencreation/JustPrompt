import { imageService } from "@/lib/services/imageService";
import { tagService } from "@/lib/services/tagService";
import { EntryTable } from "@/components/admin/EntryTable";
import { ManageFilters } from "@/components/admin/ManageFilters";
import { ListIcon } from "@/components/icons";
import { DASHBOARD } from "@/lib/constants/limits";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string; tag?: string }>;
}

export default async function ManagePage({ searchParams }: PageProps) {
  const { status, tag } = await searchParams;
  const parsedStatus = status === "published" || status === "draft" ? status : undefined;

  const [images, tags] = await Promise.all([
    imageService.listAll({ 
      limit: DASHBOARD.MANAGE_PAGE_SIZE,
      status: parsedStatus,
      tagSlug: tag
    }),
    tagService.listPopular()
  ]);

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListIcon size={20} className="text-neutral-500" />
          <h1 className="font-serif text-2xl tracking-tight text-neutral-900">Manage entries</h1>
        </div>
        <p className="text-sm text-neutral-500">{images.length} entries</p>
      </div>
      
      <div className="mb-6">
        <ManageFilters tags={tags} activeStatus={parsedStatus} activeTag={tag} />
      </div>

      <EntryTable images={images} />
    </div>
  );
}
