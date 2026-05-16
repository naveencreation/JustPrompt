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
    <div className="overflow-hidden rounded-xl shadow-md">
      <div className="relative w-full bg-neutral-100" style={{ paddingBottom: `${(height / width) * 100}%` }}>
        <Image src={imageUrl} alt="Preview" fill sizes="300px" className="object-cover" />
      </div>
      <div className="bg-neutral-900 p-4 text-white">
        <p className="font-mono text-xs leading-relaxed text-neutral-100 line-clamp-4">
          {prompt}
        </p>
        {model && (
          <span className="mt-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs text-neutral-300">
            {model}
          </span>
        )}
      </div>
    </div>
  );
}
