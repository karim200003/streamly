import MediaGrid from "@/components/ui/MediaGrid";
import { CardSkeleton } from "@/components/Skeletons";

// Uses MediaGrid so the placeholder matches the real results grid. It
// previously hard-coded `lg:grid-cols-5 xl:grid-cols-6 gap-3` against
// the page's `lg:grid-cols-6 gap-4`, so the layout reflowed the moment
// results arrived.
export default function SearchLoading() {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <div className="mx-auto max-w-screen-2xl">
        <div className="h-7 w-56 rounded skeleton mb-8" />
        <MediaGrid>
          {Array.from({ length: 18 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </MediaGrid>
      </div>
    </div>
  );
}
