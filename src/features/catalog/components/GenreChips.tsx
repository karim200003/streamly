import Link from "next/link";
import { MOVIE_GENRES, TV_GENRES, type MediaType } from "@/lib/tmdb-shared";

export default function GenreChips({
  mediaType,
  activeGenreId,
}: {
  mediaType: MediaType;
  activeGenreId?: number;
}) {
  const genres = mediaType === "movie" ? MOVIE_GENRES : TV_GENRES;

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
      <Link
        href={`/${mediaType === "movie" ? "movies" : "tv"}`}
        className={
          activeGenreId === undefined
            ? "shrink-0 px-3 py-1.5 rounded-full text-sm bg-white text-black"
            : "shrink-0 px-3 py-1.5 rounded-full text-sm bg-white/5 hover:bg-white/10 text-white/80 transition"
        }
      >
        All
      </Link>
      {genres.map((g) => {
        const active = g.id === activeGenreId;
        return (
          <Link
            key={g.id}
            href={`/${mediaType}/genre/${g.id}`}
            className={
              active
                ? "shrink-0 px-3 py-1.5 rounded-full text-sm bg-white text-black"
                : "shrink-0 px-3 py-1.5 rounded-full text-sm bg-white/5 hover:bg-white/10 text-white/80 transition"
            }
          >
            {g.name}
          </Link>
        );
      })}
    </div>
  );
}
