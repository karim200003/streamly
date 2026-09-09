import Image from "next/image";
import Link from "next/link";
import type { ResolvedProvider } from "@/lib/providers";

/**
 * "Browse by Provider" — the rounded-square service tiles that sit
 * directly beneath the hero.
 *
 * A server component: it renders links and images and holds no state,
 * so there is no reason to ship it to the browser.
 */
export default function ProviderRow({
  providers,
}: {
  providers: ResolvedProvider[];
}) {
  if (!providers.length) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-10 section-gap">
      <h2 className="section-title mb-4">Browse by Provider</h2>

      {/* Scrolls horizontally rather than wrapping: nine tiles wrap to a
          ragged second row at tablet widths, which reads as a mistake
          next to the poster rails below. */}
      <ul className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        {providers.map((p) => (
          <li key={p.id} className="shrink-0">
            <Link
              href={`/provider/${p.id}`}
              className="group block w-[68px] sm:w-[76px] text-center"
            >
              <div
                className="relative aspect-square overflow-hidden rounded-[var(--radius-provider)]
                           border border-white/[0.08] bg-[var(--color-bg-2)]
                           transition-[transform,border-color] duration-300
                           group-hover:-translate-y-1 group-hover:border-white/25"
              >
                {p.logoUrl ? (
                  <Image
                    src={p.logoUrl}
                    // The tile is labelled by the caption below it, so the
                    // logo itself is decorative — an alt here would have
                    // every screen reader announce the name twice.
                    alt=""
                    fill
                    sizes="76px"
                    className="object-cover"
                  />
                ) : (
                  // No key, or TMDB dropped the id: a wordmark still
                  // gives a working, legible tile.
                  <span className="absolute inset-0 grid place-items-center px-1 text-[0.6rem] font-semibold leading-tight text-white/70">
                    {p.name}
                  </span>
                )}
              </div>
              {/* When the logo is missing, the wordmark inside the tile is
                  already the name — printing it again below reads as a bug. */}
              {p.logoUrl && (
                <div className="mt-2 text-[0.6875rem] leading-tight text-[var(--color-muted)] group-hover:text-white/85 transition-colors">
                  {p.name}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
