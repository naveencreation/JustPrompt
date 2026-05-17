import Link from "next/link";
import Image from "next/image";
import { adminService } from "@/lib/services/adminService";
import {
  DashboardIcon,
  ImageIcon,
  HeartIcon,
  UploadIcon,
  ListIcon,
  CopyIcon,
  PercentIcon,
  EyeIcon,
  TrendingUpIcon,
  AlertCircleIcon,
} from "@/components/icons";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { PureCssBar } from "@/components/admin/dashboard/PureCssBar";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await adminService.getDashboardStats();

  const {
    totalImages,
    totalLikes,
    totalCopies,
    totalViews,
    copyRate,
    recentImages,
    mostLiked,
    topCopied,
    topSearches,
    failedSearches,
  } = stats;

  const maxCopyCount = topCopied[0]?.copyCount ?? 1;
  const maxSearchCount = topSearches[0]?.count ?? 1;
  const maxFailedCount = failedSearches[0]?.count ?? 1;

  return (
    <div className="mx-auto w-full max-w-6xl p-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="mb-10 flex items-center gap-2">
        <DashboardIcon size={20} className="text-neutral-500" />
        <h1 className="font-serif text-2xl tracking-tight text-neutral-900">Dashboard</h1>
      </header>

      {/* ── Section A: Scorecard ─────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total images"
          value={totalImages}
          icon={<ImageIcon size={14} />}
        />
        <StatCard
          label="Total likes"
          value={totalLikes}
          icon={<HeartIcon size={14} />}
        />
        <StatCard
          label="Prompt copies"
          value={totalCopies}
          icon={<CopyIcon size={14} />}
        />
        <StatCard
          label="Copy rate"
          value={`${copyRate}%`}
          icon={<PercentIcon size={14} />}
          sub={`${totalViews.toLocaleString()} total views`}
        />
      </div>

      {/* ── Section B: Content Performance ───────────────────────────────── */}
      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        {/* Top Copied Prompts */}
        <div className="rounded-md border border-neutral-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-2">
            <CopyIcon size={13} className="text-neutral-400" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
              Top copied prompts
            </h2>
          </div>

          {topCopied.length === 0 ? (
            <p className="text-[12px] text-neutral-400">No copy data yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {topCopied.slice(0, 7).map(({ image, copyCount, likeCount }) => (
                <li key={image.id} className="group flex items-start gap-3">
                  <div className="relative size-10 shrink-0 overflow-hidden rounded bg-neutral-100">
                    <Image
                      src={image.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="truncate font-mono text-[11px] text-neutral-700">
                        {image.prompt.slice(0, 55)}
                      </p>
                      <div className="flex shrink-0 items-center gap-2 text-[10px] text-neutral-400">
                        <span className="flex items-center gap-0.5">
                          <CopyIcon size={9} />
                          {copyCount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <HeartIcon size={9} />
                          {likeCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <PureCssBar value={copyCount} max={maxCopyCount} />
                    <Link
                      href={`/p/${image.slug}`}
                      className="mt-1 text-[10px] uppercase tracking-[0.1em] text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      View →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Most Liked + Recent Entries */}
        <div className="flex flex-col gap-5">
          {/* Most Liked */}
          {mostLiked && (
            <div className="rounded-md border border-neutral-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <HeartIcon size={13} className="text-neutral-400" />
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                  Most liked
                </h2>
              </div>
              <div className="flex gap-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  <Image
                    src={mostLiked.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
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

          {/* Recent entries */}
          <div className="flex-1 rounded-md border border-neutral-200 bg-white p-6">
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
                    <p className="truncate font-mono text-[12px] text-neutral-700">
                      {img.prompt.slice(0, 60)}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-neutral-400">
                      {img.isPublished ? "Published" : "Draft"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Section C: Search Intelligence ───────────────────────────────── */}
      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        {/* Top Searches */}
        <div className="rounded-md border border-neutral-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-2">
            <TrendingUpIcon size={13} className="text-neutral-400" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
              Top searches
            </h2>
          </div>

          {topSearches.length === 0 ? (
            <p className="text-[12px] text-neutral-400">
              No searches logged yet. Search logging activates automatically once users start
              searching.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {topSearches.map(({ query, count }) => (
                <li key={query} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[12px] text-neutral-700">{query}</span>
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] tabular-nums text-neutral-500">
                      {count}
                    </span>
                  </div>
                  <PureCssBar value={count} max={maxSearchCount} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Failed Searches */}
        <div className="rounded-md border border-amber-100 bg-amber-50/50 p-6">
          <div className="mb-1 flex items-center gap-2">
            <AlertCircleIcon size={13} className="text-amber-500" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-600">
              Content gaps — upload these
            </h2>
          </div>
          <p className="mb-5 text-[10px] text-amber-500/80">
            These searches returned 0 results. Each one is a direct content request from your
            audience.
          </p>

          {failedSearches.length === 0 ? (
            <p className="text-[12px] text-neutral-400">
              No zero-result searches yet — great sign!
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {failedSearches.map(({ query, count }) => (
                <li key={query} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[12px] text-neutral-700">{query}</span>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] tabular-nums text-amber-600">
                      {count}×
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-amber-100">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-[width] duration-500"
                      style={{
                        width: `${Math.max(4, Math.round((count / maxFailedCount) * 100))}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Section D: View count context ───────────────────────────────── */}
      <div className="mb-8 rounded-md border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <EyeIcon size={13} className="text-neutral-400" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
            Engagement summary
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-6 sm:grid-cols-3">
          <div>
            <p className="font-serif text-2xl tracking-tight text-neutral-900">
              {totalViews.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-neutral-400">
              Detail page views
            </p>
          </div>
          <div>
            <p className="font-serif text-2xl tracking-tight text-neutral-900">
              {totalCopies.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-neutral-400">
              Prompt copies
            </p>
          </div>
          <div>
            <p className="font-serif text-2xl tracking-tight text-neutral-900">{copyRate}%</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-neutral-400">
              Views → copy conversion
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <div className="flex gap-3">
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
