import Image from "next/image";

/**
 * A poster/still with the title-text fallback used whenever TMDB has no
 * artwork. The same `poster ? <Image/> : <div>{title}</div>` block was
 * hand-written in favorites, history, ContinueWatching and SeasonPicker.
 */
export default function PosterImage({
  src,
  title,
  sizes,
  priority,
  className = "",
}: {
  /** Fully-built image URL, or null when TMDB has no artwork. */
  src: string | null;
  /** Used as alt text, and rendered as the fallback. */
  title: string;
  sizes: string;
  priority?: boolean;
  /** Extra classes for the <Image> itself (e.g. hover transforms). */
  className?: string;
}) {
  if (!src) {
    return (
      <div className="absolute inset-0 grid place-items-center text-xs p-4 text-center text-white/60">
        {title}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={title}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );
}
