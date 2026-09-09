/**
 * Shared loading placeholders. All use the `.skeleton` shimmer from
 * globals.css so every loading state in the app looks the same.
 */

/**
 * A poster tile. Width-agnostic so it works inside MediaGrid; the
 * carousel variant supplies its own fixed width via a wrapper, since a
 * flex track needs one and a grid cell must not have one.
 */
export function CardSkeleton() {
  return (
    <div>
      <div className="aspect-[2/3] rounded-xl skeleton" />
      <div className="mt-2 h-4 w-3/4 rounded skeleton" />
      <div className="mt-1.5 h-3 w-1/2 rounded skeleton" />
    </div>
  );
}

export function CarouselSkeleton({ title }: { title: string }) {
  return (
    <section className="px-4 sm:px-6 lg:px-10 py-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-3">{title}</h2>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[180px] md:w-[200px]">
            <CardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return <div className="relative -mt-16 h-[78vh] min-h-[520px] skeleton" />;
}
