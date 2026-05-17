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
import { GradientBar } from "@/components/admin/dashboard/GradientBar";
import { ProgressRing } from "@/components/admin/dashboard/ProgressRing";
import { ChartCard } from "@/components/admin/dashboard/ChartCard";

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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50/50 p-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="mb-12 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                <DashboardIcon size={24} className="text-white" />
              </div>
              <h1 className="font-serif text-4xl font-bold tracking-tight text-neutral-900">
                Dashboard
              </h1>
            </div>
            <p className="text-sm text-neutral-500">Real-time gallery insights & performance</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-neutral-400">Gallery Stats</p>
          </div>
        </header>

        {/* ── Section A: Key Metrics Grid ─────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-1 w-8 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
              Key Metrics
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total images"
              value={totalImages}
              icon={<ImageIcon size={18} />}
              accent="emerald"
            />
            <StatCard
              label="Total likes"
              value={totalLikes}
              icon={<HeartIcon size={18} />}
              accent="rose"
            />
            <StatCard
              label="Prompt copies"
              value={totalCopies}
              icon={<CopyIcon size={18} />}
              accent="blue"
            />
            <StatCard
              label="Copy rate"
              value={`${copyRate}%`}
              icon={<PercentIcon size={18} />}
              accent="amber"
              sub={`${totalViews.toLocaleString()} views`}
            />
          </div>
        </section>

        {/* ── Section B: Performance Analytics ───────────────────────────────── */}
        <section className="mb-10 grid gap-6 lg:grid-cols-3">
          {/* Engagement Summary Card */}
          <ChartCard
            title="Engagement Summary"
            icon={<EyeIcon size={16} />}
            accent="blue"
            className="lg:col-span-1"
          >
            <div className="space-y-5">
              <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-50/30 p-4">
                <p className="text-xs uppercase tracking-widest text-blue-600">Detail Views</p>
                <p className="mt-2 font-serif text-3xl font-bold text-blue-900">
                  {totalViews.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-neutral-50 to-neutral-50/30 p-4">
                <p className="text-xs uppercase tracking-widest text-neutral-600">Conversion</p>
                <p className="mt-2 font-serif text-2xl font-bold text-neutral-900">
                  {copyRate}%
                </p>
              </div>
            </div>
          </ChartCard>

          {/* Most Liked Content */}
          {mostLiked && (
            <ChartCard
              title="Most Loved"
              icon={<HeartIcon size={16} />}
              accent="rose"
              className="lg:col-span-1"
            >
              <div className="space-y-4">
                <div className="relative h-32 w-full overflow-hidden rounded-xl border border-rose-200 bg-rose-50">
                  <Image
                    src={mostLiked.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="line-clamp-2 font-mono text-xs leading-relaxed text-neutral-700">
                    {mostLiked.prompt.slice(0, 100)}
                  </p>
                  <Link
                    href={`/p/${mostLiked.slug}`}
                    className="mt-3 inline-block text-xs font-semibold uppercase tracking-wider text-rose-600 transition-colors hover:text-rose-700"
                  >
                    View →
                  </Link>
                </div>
              </div>
            </ChartCard>
          )}

          {/* Copy Rate Ring */}
          <ChartCard
            title="Copy Conversion"
            icon={<PercentIcon size={16} />}
            accent="amber"
            className="lg:col-span-1"
          >
            <div className="flex flex-col items-center justify-center py-4">
              <ProgressRing percentage={Math.min(copyRate, 100)} color="amber" size={110} />
              <p className="mt-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-600">
                Of viewers copy the prompt
              </p>
            </div>
          </ChartCard>
        </section>

        {/* ── Section C: Content Deep Dive ───────────────────────────────────────── */}
        <section className="mb-10 grid gap-6 lg:grid-cols-2">
          {/* Top Copied Prompts */}
          <ChartCard
            title="Top Copied Prompts"
            icon={<CopyIcon size={16} />}
            accent="blue"
          >
            {topCopied.length === 0 ? (
              <p className="text-xs text-neutral-500">No copy data yet.</p>
            ) : (
              <ul className="space-y-4">
                {topCopied.slice(0, 6).map(({ image, copyCount, likeCount }) => (
                  <li key={image.id} className="group rounded-lg bg-neutral-50/50 p-3 transition-all hover:bg-blue-50/50">
                    <div className="mb-2 flex items-start gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                        <Image
                          src={image.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs font-medium text-neutral-700">
                          {image.prompt.slice(0, 55)}
                        </p>
                        <div className="mt-1 flex gap-2 text-[11px] text-neutral-500">
                          <span className="flex items-center gap-1">
                            <CopyIcon size={10} className="text-blue-500" />
                            {copyCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <HeartIcon size={10} className="text-rose-500" />
                            {likeCount}
                          </span>
                        </div>
                      </div>
                    </div>
                    <GradientBar
                      value={copyCount}
                      max={maxCopyCount}
                      color="blue"
                    />
                    <Link
                      href={`/p/${image.slug}`}
                      className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-blue-600 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      View →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>

          {/* Recent Entries */}
          <ChartCard
            title="Recent Entries"
            icon={<ListIcon size={16} />}
            accent="emerald"
          >
            <ul className="space-y-3">
              {recentImages.map((img) => (
                <li
                  key={img.id}
                  className="group flex items-center gap-3 rounded-lg bg-neutral-50/50 p-3 transition-all hover:bg-emerald-50/50"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                    <Image
                      src={img.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-medium text-neutral-700">
                      {img.prompt.slice(0, 60)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      {img.isPublished ? (
                        <span className="text-emerald-600">✓ Published</span>
                      ) : (
                        <span className="text-amber-600">○ Draft</span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </ChartCard>
        </section>

        {/* ── Section D: Search Intelligence ───────────────────────────────────── */}
        <section className="mb-10 grid gap-6 lg:grid-cols-2">
          {/* Top Searches */}
          <ChartCard
            title="Top Searches"
            icon={<TrendingUpIcon size={16} />}
            accent="emerald"
          >
            {topSearches.length === 0 ? (
              <p className="text-xs text-neutral-500">
                No searches logged yet. Search logging starts when users begin searching.
              </p>
            ) : (
              <ul className="space-y-3">
                {topSearches.map(({ query, count }) => (
                  <li key={query} className="rounded-lg bg-neutral-50/50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs font-medium text-neutral-700">
                        {query}
                      </span>
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {count}
                      </span>
                    </div>
                    <GradientBar
                      value={count}
                      max={maxSearchCount}
                      color="emerald"
                    />
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>

          {/* Failed Searches / Content Gaps */}
          <ChartCard
            title="Content Gaps"
            icon={<AlertCircleIcon size={16} />}
            accent="amber"
            className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/60 to-transparent"
          >
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
              <p className="text-xs text-amber-700">
                <span className="font-semibold">These searches returned 0 results.</span> They're
                direct content requests from your audience.
              </p>
            </div>

            {failedSearches.length === 0 ? (
              <p className="text-xs text-neutral-500">
                No zero-result searches yet — great sign!
              </p>
            ) : (
              <ul className="space-y-3">
                {failedSearches.map(({ query, count }) => (
                  <li key={query} className="rounded-lg bg-amber-50/40 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs font-medium text-neutral-700">
                        {query}
                      </span>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {count}×
                      </span>
                    </div>
                    <GradientBar
                      value={count}
                      max={maxFailedCount}
                      color="amber"
                    />
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </section>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <section className="flex gap-3 pt-6">
          <Link
            href="/admin/upload"
            className="group flex items-center gap-2 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-95"
          >
            <UploadIcon size={16} />
            Upload new
          </Link>
          <Link
            href="/admin/manage"
            className="flex items-center gap-2 rounded-lg border-2 border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-all duration-300 hover:border-neutral-300 hover:shadow-md"
          >
            <ListIcon size={16} />
            Manage entries
          </Link>
        </section>
      </div>
    </div>
  );
}
