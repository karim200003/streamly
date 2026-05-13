export default function HomeLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero banner placeholder */}
      <div className="-mt-16 h-[85vh] min-h-[600px] bg-[var(--color-bg-2)]" />

      {/* Carousel skeletons */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-10 mt-10 space-y-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="h-5 w-44 bg-white/10 rounded mb-4" />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 7 }).map((_, j) => (
                <div
                  key={j}
                  className="flex-none w-32 sm:w-40 aspect-[2/3] bg-white/10 rounded-xl"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
