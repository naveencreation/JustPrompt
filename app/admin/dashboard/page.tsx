import Link from "next/link";
import Image from "next/image";
import { adminService } from "@/lib/services/adminService";
import { LayoutDashboard, Image as ImageIcon, Heart, Upload, List } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { totalImages, totalLikes, recentImages, mostLiked } =
    await adminService.getDashboardStats();

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="mb-8 flex items-center gap-2">
        <LayoutDashboard className="size-5 text-neutral-500" />
        <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Images", value: totalImages, icon: ImageIcon },
          { label: "Total Likes", value: totalLikes, icon: Heart },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-neutral-500">{label}</p>
              <Icon className="size-4 text-neutral-400" />
            </div>
            <p className="text-2xl font-semibold text-neutral-900">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Most liked */}
        {mostLiked && (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-neutral-700">Most Liked Image</h2>
            <div className="flex gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                <Image src={mostLiked.imageUrl} alt="" fill className="object-cover" sizes="80px" />
              </div>
              <div className="flex flex-col justify-between min-w-0">
                <p className="line-clamp-2 text-sm text-neutral-700 font-mono">{mostLiked.prompt.slice(0, 100)}</p>
                <Link
                  href={`/p/${mostLiked.slug}`}
                  className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  View →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Recent entries */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-neutral-700">Recent Entries</h2>
          <ul className="flex flex-col gap-3">
            {recentImages.map((img) => (
              <li key={img.id} className="flex items-center gap-3">
                <div className="relative size-10 shrink-0 overflow-hidden rounded bg-neutral-100">
                  <Image src={img.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-mono text-neutral-700">{img.prompt.slice(0, 60)}</p>
                  <p className="text-xs text-neutral-400">{img.isPublished ? "Published" : "Draft"}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex gap-3">
        <Link
          href="/admin/upload"
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
        >
          <Upload className="size-4" />
          Upload new
        </Link>
        <Link
          href="/admin/manage"
          className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <List className="size-4" />
          Manage entries
        </Link>
      </div>
    </div>
  );
}
