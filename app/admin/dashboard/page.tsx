import Link from "next/link";
import Image from "next/image";
import { adminService } from "@/lib/services/adminService";
import { DashboardIcon, ImageIcon, HeartIcon, UploadIcon, ListIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { totalImages, totalLikes, recentImages, mostLiked } =
    await adminService.getDashboardStats();

  const stats = [
    { label: "Total images", value: totalImages, Icon: ImageIcon },
    { label: "Total likes",  value: totalLikes,  Icon: HeartIcon },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl p-8">
      <header className="mb-10 flex items-center gap-2">
        <DashboardIcon size={20} className="text-neutral-500" />
        <h1 className="font-serif text-2xl tracking-tight text-neutral-900">Dashboard</h1>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-md border border-neutral-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-400">{label}</p>
              <Icon size={14} className="text-neutral-400" />
            </div>
            <p className="font-serif text-3xl tracking-tight text-neutral-900">
              {value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {mostLiked && (
          <div className="rounded-md border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
              Most liked
            </h2>
            <div className="flex gap-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                <Image src={mostLiked.imageUrl} alt="" fill className="object-cover" sizes="80px" />
              </div>
              <div className="flex min-w-0 flex-col justify-between">
                <p className="line-clamp-2 font-mono text-[12px] leading-[1.55] text-neutral-700">
                  {mostLiked.prompt.slice(0, 100)}
                </p>
                <Link
                  href={`/p/${mostLiked.slug}`}
                  className="text-[11px] uppercase tracking-[0.1em] text-neutral-400 transition-colors hover:text-neutral-700"
                >
                  View →
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-md border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
            Recent entries
          </h2>
          <ul className="flex flex-col gap-3">
            {recentImages.map((img) => (
              <li key={img.id} className="flex items-center gap-3">
                <div className="relative size-10 shrink-0 overflow-hidden rounded bg-neutral-100">
                  <Image src={img.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[12px] text-neutral-700">{img.prompt.slice(0, 60)}</p>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-neutral-400">
                    {img.isPublished ? "Published" : "Draft"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/admin/upload"
          className="flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-[13px] font-medium text-neutral-50 transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-700 active:scale-[0.98]"
        >
          <UploadIcon size={14} />
          Upload new
        </Link>
        <Link
          href="/admin/manage"
          className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2 text-[13px] font-medium text-neutral-600 transition-[background-color,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
        >
          <ListIcon size={14} />
          Manage entries
        </Link>
      </div>
    </div>
  );
}
