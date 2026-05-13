export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-10 pt-28 pb-16 animate-pulse">
      <div className="h-7 w-56 bg-white/10 rounded mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-white/10 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
