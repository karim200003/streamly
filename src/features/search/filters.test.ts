import { describe, it, expect } from "vitest";
import { parseFilters, applyFilters, hasActiveFilters, genresFor } from "./filters";
import type { TmdbMedia } from "@/lib/tmdb-shared";

const results: TmdbMedia[] = [
  {
    id: 1, title: "Action Movie", overview: "", poster_path: null,
    backdrop_path: null, vote_average: 8, release_date: "2020-01-01",
    genre_ids: [28], media_type: "movie",
  },
  {
    id: 2, name: "Drama Show", overview: "", poster_path: null,
    backdrop_path: null, vote_average: 5, first_air_date: "2015-01-01",
    genre_ids: [18], media_type: "tv",
  },
];

describe("parseFilters", () => {
  it("defaults an unknown type to 'all'", () => {
    expect(parseFilters({ type: "podcast" }).type).toBe("all");
    expect(parseFilters({}).type).toBe("all");
  });

  it("caps an over-long query", () => {
    expect(parseFilters({ q: "x".repeat(500) }).q).toHaveLength(200);
  });
});

describe("applyFilters", () => {
  const base = parseFilters({});

  it("returns everything when no filter is set", () => {
    expect(applyFilters(results, base)).toHaveLength(2);
  });

  it("filters by media type", () => {
    expect(applyFilters(results, { ...base, type: "tv" })).toHaveLength(1);
  });

  it("filters by genre id", () => {
    const out = applyFilters(results, { ...base, genre: "28" });
    expect(out.map((r) => r.id)).toEqual([1]);
  });

  it("filters by year across both date fields", () => {
    expect(applyFilters(results, { ...base, year: "2015" }).map((r) => r.id))
      .toEqual([2]);
  });

  it("filters by minimum rating", () => {
    expect(applyFilters(results, { ...base, rating: "6" }).map((r) => r.id))
      .toEqual([1]);
  });

  it("combines filters conjunctively", () => {
    expect(applyFilters(results, { ...base, type: "movie", rating: "9" }))
      .toHaveLength(0);
  });
});

describe("hasActiveFilters", () => {
  it("ignores the query itself — only the facets count", () => {
    expect(hasActiveFilters(parseFilters({ q: "alien" }))).toBe(false);
    expect(hasActiveFilters(parseFilters({ q: "alien", year: "1979" }))).toBe(true);
  });
});

describe("genresFor", () => {
  it("merges both tables for 'all' with unique ids", () => {
    const ids = genresFor("all").map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns the type-specific table otherwise", () => {
    expect(genresFor("movie").length).toBeGreaterThan(0);
    expect(genresFor("tv").length).toBeGreaterThan(0);
  });
});
