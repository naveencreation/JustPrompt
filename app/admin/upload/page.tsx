import { UploadForm } from "@/components/admin/UploadForm";
import { UploadIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <header className="mb-10 flex items-center gap-2">
        <UploadIcon size={20} className="text-neutral-500" />
        <h1 className="font-serif text-2xl tracking-tight text-neutral-900">Upload new entry</h1>
      </header>
      <UploadForm />
    </div>
  );
}
