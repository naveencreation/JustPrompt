import Image from "next/image";

interface CardPreviewProps {
  imageUrl: string;
  prompt: string;
  model: string | null;
  width: number;
  height: number;
}

export function CardPreview({ imageUrl, prompt, model, width, height }: CardPreviewProps) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div
        className="relative w-full bg-neutral-100"
        style={{ paddingBottom: `${(height / width) * 100}%` }}
      >
        <Image src={imageUrl} alt="Preview" fill sizes="300px" className="object-cover" />
      </div>
      <div className="bg-neutral-900 p-5 text-neutral-50">
        <p className="line-clamp-4 font-mono text-[12px] leading-[1.55] text-neutral-100">
          {prompt}
        </p>
        {model && (
          <span className="mt-3 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-neutral-300">
            {model}
          </span>
        )}
      </div>
    </div>
  );
}
