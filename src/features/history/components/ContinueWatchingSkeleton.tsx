export default function ContinueWatchingSkeleton() {
  return (
    <section className="px-4 sm:px-6 lg:px-10 py-6 animate-pulse" aria-hidden>
      <div className="h-6 w-40 rounded bg-white/10 mb-3" />
      <div className="flex gap-4 overflow-hidden pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-[200px] sm:w-[240px] space-y-2"
          >
            <div className="aspect-video rounded-xl bg-white/10" />
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </section>
  );
}
