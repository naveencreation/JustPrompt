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
  EyeIcon,
  TrendingUpIcon,
  AlertCircleIcon,
} from "@/components/icons";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { GradientBar } from "@/components/admin/dashboard/GradientBar";
import { ChartCard } from "@/components/admin/dashboard/ChartCard";
import { MetricBadge } from "@/components/admin/dashboard/MetricBadge";
import { DashboardBarChart } from "@/components/admin/dashboard/DashboardBarChart";
import { config } from "@/lib/config";

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
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="mb-12 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 shadow-lg">
                <DashboardIcon size={24} className="text-neutral-50" />
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
            <div className="h-1 w-8 rounded-full bg-neutral-800" />
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
              label="Total views"
              value={totalViews}
              icon={<EyeIcon size={18} />}
              accent="amber"
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
              sub={`${copyRate}% copy rate`}
            />
          </div>
        </section>

        {/* ── Section B: Performance Analytics ───────────────────────────────── */}
        <section className="mb-10 grid gap-6 lg:grid-cols-2">
          {/* Column 1: Most Loved */}
          <ChartCard
            title="Most Loved"
            icon={<HeartIcon size={16} />}
            accent="rose"
          >
            {mostLiked ? (
              <div className="space-y-4">
                <div className="relative h-32 w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
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
                    className="mt-3 inline-block text-xs font-semibold uppercase tracking-wider text-neutral-700 transition-colors hover:text-neutral-900"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center text-center">
                <HeartIcon size={24} className="mb-2 text-neutral-300 animate-pulse" />
                <p className="text-xs font-medium text-neutral-500">No loved images yet</p>
                <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">
                  Likes registered in the gallery will feature the top image here.
                </p>
              </div>
            )}
          </ChartCard>

          {/* Column 2: Quick Actions */}
          <ChartCard
            title="Quick Actions"
            icon={<UploadIcon size={16} />}
            accent="emerald"
          >
            <div className="flex flex-col justify-between space-y-4">
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/admin/upload"
                  className="group/btn flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-white shadow transition-all duration-300 group-hover/btn:bg-neutral-800">
                      <UploadIcon size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-neutral-800">Upload New</p>
                      <p className="text-[10px] text-neutral-500">Add prompts & images</p>
                    </div>
                  </div>
                  <span className="text-neutral-400 group-hover/btn:text-neutral-600 transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
                </Link>

                <Link
                  href="/admin/manage"
                  className="group/btn flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600">
                      <ListIcon size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-neutral-800">Manage Entries</p>
                      <p className="text-[10px] text-neutral-500">Edit, publish & organize</p>
                    </div>
                  </div>
                  <span className="text-neutral-400 group-hover/btn:text-neutral-600 transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
                </Link>
              </div>

              <div className="rounded-lg border border-neutral-100 bg-neutral-50/70 p-3">
                <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  <span>Backend Adapters</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded bg-neutral-200/50 px-1.5 py-0.5 text-[9px] font-medium text-neutral-700 uppercase tracking-wider">
                    Storage: {config.storage}
                  </span>
                  <span className="rounded bg-neutral-200/50 px-1.5 py-0.5 text-[9px] font-medium text-neutral-700 uppercase tracking-wider">
                    Cache: {config.cache}
                  </span>
                  <span className="rounded bg-neutral-200/50 px-1.5 py-0.5 text-[9px] font-medium text-neutral-700 uppercase tracking-wider">
                    Search: {config.search}
                  </span>
                </div>
              </div>
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
                  <li key={image.id} className="group rounded-lg bg-neutral-50/50 p-3 transition-all hover:bg-neutral-100/50">
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
                            <CopyIcon size={10} className="text-neutral-500" />
                            {copyCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <HeartIcon size={10} className="text-neutral-500" />
                            {likeCount}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/p/${image.slug}`}
                      className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-neutral-700 opacity-0 transition-opacity group-hover:opacity-100"
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
                  className="group flex items-center gap-3 rounded-lg bg-neutral-50/50 p-3 transition-all hover:bg-neutral-100/50"
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
                        <span className="text-neutral-700">✓ Published</span>
                      ) : (
                        <span className="text-neutral-500">○ Draft</span>
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
              <DashboardBarChart
                data={topSearches.map((s) => ({ label: s.query, value: s.count }))}
                colorTheme="emerald"
              />
            )}
          </ChartCard>

          {/* Failed Searches / Content Gaps */}
          <ChartCard
            title="Content Gaps"
            icon={<AlertCircleIcon size={16} />}
            accent="amber"
            className="border-neutral-300 bg-neutral-50"
          >
            <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-100/80 p-3">
              <p className="text-xs text-neutral-700">
                <span className="font-semibold">These searches returned 0 results.</span> They&apos;re
                direct content requests from your audience.
              </p>
            </div>

            {failedSearches.length === 0 ? (
              <p className="text-xs text-neutral-500">
                No zero-result searches yet — great sign!
              </p>
            ) : (
              <DashboardBarChart
                data={failedSearches.map((s) => ({ label: s.query, value: s.count }))}
                colorTheme="amber"
              />
            )}
          </ChartCard>
        </section>

      </div>
    </div>
  );
}
