import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { imageService } from "@/lib/services/imageService";
import { likeService } from "@/lib/services/likeService";
import { tagRepo } from "@/lib/repos/tagRepo";
import { Navbar } from "@/components/shared/Navbar";
import { CopyButton } from "@/components/shared/CopyButton";
import { ImageId } from "@/lib/db/schema";

export const revalidate = 3600;
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const image = await imageService.getBySlug(slug);
  if (!image) return {};

  const title = image.prompt.slice(0, 70) + (image.prompt.length > 70 ? "…" : "");

  return {
    title,
    description: image.description ?? `AI-generated image with prompt: ${image.prompt.slice(0, 150)}`,
    openGraph: {
      title,
      images: [{ url: image.imageUrl, width: image.width, height: image.height }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [image.imageUrl],
    },
  };
}

export default async function ImagePage({ params }: PageProps) {
  const { slug } = await params;
  const image = await imageService.getBySlug(slug);
  if (!image || !image.isPublished) notFound();

  const [tags, likeCount, related] = await Promise.all([
    tagRepo.listByImage(ImageId.parse(image.id)),
    likeService.getCount(image.id),
    imageService.listGallery({ limit: 6 }),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: image.prompt.slice(0, 70),
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
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
            {/* Image */}
            <div className="relative overflow-hidden rounded-2xl bg-neutral-100 shadow-md"
              style={{ aspectRatio: `${image.width}/${image.height}`, maxHeight: "70vh" }}>
              <Image
                src={image.imageUrl}
                alt={image.prompt.slice(0, 100)}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-contain"
                priority
              />
            </div>

            {/* Prompt + meta */}
            <aside className="flex flex-col gap-6">
              <div>
                <h1 className="mb-3 font-mono text-sm leading-relaxed text-neutral-800">
                  {image.prompt}
                </h1>

                <form action={`/api/like/${image.id}`} method="post" className="sr-only">
                  <button type="submit">Like</button>
                </form>
              </div>

              {image.description && (
                <p className="text-sm leading-relaxed text-neutral-500">{image.description}</p>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/t/${tag.slug}`}
                      className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-200 transition-colors"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
                {image.model && (
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1">{image.model}</span>
                )}
                <span className="rounded-full bg-neutral-100 px-2.5 py-1">{likeCount} likes</span>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1">
                  {new Date(image.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Copy prompt CTA */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Full Prompt
                </p>
                <p className="mb-4 font-mono text-xs leading-relaxed text-neutral-700">
                  {image.prompt}
                </p>
                <CopyButton text={image.prompt} />
              </div>
            </aside>
          </div>

          {/* Related images */}
          {related.items.length > 0 && (
            <section className="mt-16" aria-label="More prompts">
              <h2 className="mb-6 text-lg font-semibold text-neutral-800">More Prompts</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {related.items.slice(0, 6).map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/p/${rel.slug}`}
                    className="group overflow-hidden rounded-xl bg-neutral-100 shadow-sm hover:shadow-md transition-shadow"
                    style={{ aspectRatio: `${rel.width}/${rel.height}` }}
                  >
                    <div className="relative h-full">
                      <Image
                        src={rel.imageUrl}
                        alt={rel.prompt.slice(0, 60)}
                        fill
                        sizes="(max-width: 640px) 50vw, 16vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
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
