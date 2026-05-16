import { UploadForm } from "@/components/admin/UploadForm";
import { Upload } from "lucide-react";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <div className="mb-8 flex items-center gap-2">
        <Upload className="size-5 text-neutral-500" />
        <h1 className="text-xl font-semibold text-neutral-900">Upload New Entry</h1>
      </div>
      <UploadForm />
    </div>
  );
}
