import { CarouselSkeleton, HeroSkeleton } from "@/components/Skeletons";

// Reuses the shared skeletons instead of re-implementing them inline.
// The two were previously written twice in two different styles — the
// `.skeleton` shimmer here, `animate-pulse` + `bg-white/10` there — so
// the loading states didn't match each other or the real layout.
export default function HomeLoading() {
  return (
    <>
      <HeroSkeleton />
      <CarouselSkeleton title="Trending This Week" />
      <CarouselSkeleton title="Popular Movies" />
      <CarouselSkeleton title="Popular TV Shows" />
    </>
  );
}
