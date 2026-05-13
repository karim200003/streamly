export default function DetailLoading() {
  return (
    <div className="animate-pulse">
      {/* Backdrop placeholder */}
      <div className="-mt-16 h-[65vh] min-h-[480px] bg-[var(--color-bg-2)]" />

      {/* Content skeleton */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-10 mt-8 space-y-4 max-w-2xl">
        <div className="h-3 w-28 bg-white/10 rounded" />
        <div className="h-10 w-80 bg-white/10 rounded" />
        <div className="flex gap-3 mt-2">
          <div className="h-4 w-12 bg-white/10 rounded" />
          <div className="h-4 w-10 bg-white/10 rounded" />
          <div className="h-4 w-14 bg-white/10 rounded" />
        </div>
        <div className="space-y-2 mt-4">
          <div className="h-3 w-full max-w-xl bg-white/10 rounded" />
          <div className="h-3 w-full max-w-lg bg-white/10 rounded" />
          <div className="h-3 w-3/4 max-w-md bg-white/10 rounded" />
        </div>
        <div className="flex gap-3 pt-2">
          <div className="h-11 w-28 bg-white/10 rounded-full" />
          <div className="h-11 w-28 bg-white/10 rounded-full" />
        </div>
      </div>
    </div>
  );
}
