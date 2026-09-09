import { describe, it, expect } from "vitest";
import { mapMediaSummary, mapMediaDetails } from "./domain";
import type { TmdbMedia, TmdbDetails } from "@/lib/tmdb-shared";

const movie: TmdbMedia = {
  id: 42,
  title: "Blade Runner",
  overview: "Replicants.",
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  vote_average: 8.1,
  release_date: "1982-06-25",
  genre_ids: [878, 53],
  media_type: "movie",
};

describe("mapMediaSummary", () => {
  it("resolves the movie shape", () => {
    const m = mapMediaSummary(movie);
    expect(m.title).toBe("Blade Runner");
    expect(m.year).toBe("1982");
    expect(m.mediaType).toBe("movie");
    expect(m.href).toBe("/movie/42");
    expect(m.posterUrl).toBe("https://image.tmdb.org/t/p/w500/poster.jpg");
  });

  it("reads `name` and `first_air_date` for TV", () => {
    const tv = mapMediaSummary({
      id: 7,
      name: "Severance",
      overview: "",
      poster_path: null,
      backdrop_path: null,
      vote_average: 8.7,
      first_air_date: "2022-02-18",
      media_type: "tv",
    });
    expect(tv.title).toBe("Severance");
    expect(tv.year).toBe("2022");
    expect(tv.href).toBe("/tv/7");
  });

  it("falls back to the supplied type when TMDB omits media_type", () => {
    // /movie/popular and friends don't return media_type at all.
    const { media_type: _omitted, ...withoutType } = movie;
    expect(mapMediaSummary(withoutType, "movie").mediaType).toBe("movie");
  });

  it("returns null rather than a URL when artwork is missing", () => {
    const m = mapMediaSummary({ ...movie, poster_path: null, backdrop_path: null });
    expect(m.posterUrl).toBeNull();
    expect(m.backdropUrl).toBeNull();
  });

  it("returns null for a missing rating instead of a misleading 0", () => {
    // HeroBanner used to call .toFixed(1) straight on this and crash.
    const m = mapMediaSummary({
      ...movie,
      vote_average: undefined as unknown as number,
    });
    expect(m.rating).toBeNull();
  });

  it("returns null year when TMDB has no date", () => {
    const m = mapMediaSummary({ ...movie, release_date: undefined });
    expect(m.year).toBeNull();
  });
});

describe("mapMediaDetails", () => {
  const videos = [
    { id: "1", key: "teaser", site: "YouTube", type: "Teaser", official: true },
    { id: "2", key: "unofficial", site: "YouTube", type: "Trailer", official: false },
    { id: "3", key: "official", site: "YouTube", type: "Trailer", official: true },
  ];

  const details: TmdbDetails = {
    ...movie,
    genres: [{ id: 878, name: "Science Fiction" }],
    tagline: "  Man has made his match.  ",
    runtime: 117,
    videos: { results: videos },
    credits: {
      cast: [
        { id: 1, name: "Harrison Ford", character: "Deckard", profile_path: "/hf.jpg", order: 0 },
      ],
      crew: [],
    },
    seasons: [],
  };

  it("prefers the official trailer over other videos", () => {
    expect(mapMediaDetails(details, "movie").trailerKey).toBe("official");
  });

  it("falls back to an unofficial trailer, then a teaser", () => {
    const noOfficial = {
      ...details,
      videos: { results: videos.filter((v) => v.key !== "official") },
    };
    expect(mapMediaDetails(noOfficial, "movie").trailerKey).toBe("unofficial");

    const teaserOnly = {
      ...details,
      videos: { results: videos.filter((v) => v.type === "Teaser") },
    };
    expect(mapMediaDetails(teaserOnly, "movie").trailerKey).toBe("teaser");
  });

  it("has no trailer when TMDB returns no videos", () => {
    expect(mapMediaDetails({ ...details, videos: undefined }, "movie").trailerKey)
      .toBeNull();
  });

  it("trims the tagline and nulls an empty one", () => {
    expect(mapMediaDetails(details, "movie").tagline).toBe("Man has made his match.");
    expect(mapMediaDetails({ ...details, tagline: "   " }, "movie").tagline).toBeNull();
  });

  it("uses episode_run_time for TV, which has no top-level runtime", () => {
    const tv = mapMediaDetails(
      { ...details, runtime: undefined, episode_run_time: [45] },
      "tv",
    );
    expect(tv.runtime).toBe(45);
  });

  it("drops season 0 (TMDB's specials bucket)", () => {
    const withSpecials = {
      ...details,
      seasons: [
        { id: 1, name: "Specials", season_number: 0, episode_count: 3, poster_path: null, overview: "", air_date: null },
        { id: 2, name: "Season 1", season_number: 1, episode_count: 8, poster_path: null, overview: "", air_date: null },
      ],
    };
    const mapped = mapMediaDetails(withSpecials, "tv");
    expect(mapped.seasons.map((s) => s.seasonNumber)).toEqual([1]);
  });

  it("builds the watch href from the media type", () => {
    expect(mapMediaDetails(details, "movie").watchHref).toBe("/watch/movie/42");
  });
});
