import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { imageService } from "@/lib/services/imageService";
import { likeService } from "@/lib/services/likeService";
import { tagService } from "@/lib/services/tagService";
import { Navbar } from "@/components/shared/Navbar";
import { CopyButton } from "@/components/shared/CopyButton";

// Keep in sync with REVALIDATE.IMAGE_PAGE in lib/constants/cache.ts.
export const revalidate = 3600;
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string }> };

const TITLE_TRUNCATE = 70;
const DESCRIPTION_TRUNCATE = 150;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const image = await imageService.getBySlug(slug);
  if (!image) return {};

  const title =
    image.prompt.slice(0, TITLE_TRUNCATE) + (image.prompt.length > TITLE_TRUNCATE ? "…" : "");

  return {
    title,
    description:
      image.description ??
      `AI-generated image with prompt: ${image.prompt.slice(0, DESCRIPTION_TRUNCATE)}`,
    openGraph: {
      title,
      images: [{ url: image.imageUrl, width: image.width, height: image.height }],
      type: "article",
    },
    twitter: { card: "summary_large_image", title, images: [image.imageUrl] },
  };
}

export default async function ImagePage({ params }: PageProps) {
  const { slug } = await params;
  const image = await imageService.getBySlug(slug);
  if (!image || !image.isPublished) notFound();

  const [tags, likeCount, related] = await Promise.all([
    tagService.listByImage(image.id),
    likeService.getCount(image.id),
    imageService.listGallery({ limit: 6 }),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: image.prompt.slice(0, TITLE_TRUNCATE),
    contentUrl: image.imageUrl,
    description: image.description ?? image.prompt,
    datePublished: image.createdAt,
    width: image.width,
    height: image.height,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex min-h-full flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Prompt
          </p>

          <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
            <div
              className="relative overflow-hidden rounded-md border border-neutral-200 bg-neutral-100"
              style={{ aspectRatio: `${image.width}/${image.height}`, maxHeight: "72vh" }}
            >
              <Image
                src={image.imageUrl}
                alt={image.prompt.slice(0, 100)}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-contain"
                priority
              />
            </div>

            <aside className="flex flex-col gap-7">
              <h1 className="font-mono text-[13px] leading-[1.6] text-neutral-800">
                {image.prompt}
              </h1>

              {image.description && (
                <p className="text-sm leading-relaxed text-neutral-500">{image.description}</p>
              )}

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/t/${tag.slug}`}
                      className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.05em] text-neutral-600 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-200 hover:text-neutral-900"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-[10px]">
                {image.model && (
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 uppercase tracking-[0.1em] text-neutral-500">
                    {image.model}
                  </span>
                )}
                <span className="rounded-full bg-[#FDEBEC] px-2.5 py-1 uppercase tracking-[0.05em] text-[#9F2F2D]">
                  {likeCount} likes
                </span>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 uppercase tracking-[0.05em] text-neutral-500">
                  {new Date(image.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="rounded-md border border-neutral-200 bg-white p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                  Full prompt
                </p>
                <p className="mb-4 font-mono text-[12px] leading-[1.6] text-neutral-700">
                  {image.prompt}
                </p>
                <CopyButton text={image.prompt} />
              </div>
            </aside>
          </div>

          {related.items.length > 0 && (
            <section className="mt-24" aria-label="More prompts">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Browse more
              </p>
              <h2 className="mb-8 font-serif text-2xl tracking-tight text-neutral-900">
                More prompts
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {related.items.slice(0, 6).map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/p/${rel.slug}`}
                    className="group overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 transition-[border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400"
                    style={{ aspectRatio: `${rel.width}/${rel.height}` }}
                  >
                    <div className="relative h-full">
                      <Image
                        src={rel.imageUrl}
                        alt={rel.prompt.slice(0, 60)}
                        fill
                        sizes="(max-width: 640px) 50vw, 16vw"
                        className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
