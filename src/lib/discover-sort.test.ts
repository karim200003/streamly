import { describe, it, expect } from "vitest";
import {
  parseSort,
  parseYear,
  parseRating,
  DEFAULT_SORT,
  MOVIE_SORT_OPTIONS,
  TV_SORT_OPTIONS,
} from "./discover-sort";

describe("parseSort", () => {
  it("accepts values the media type actually offers", () => {
    expect(parseSort("movie", "primary_release_date.desc")).toBe(
      "primary_release_date.desc",
    );
    expect(parseSort("tv", "first_air_date.desc")).toBe("first_air_date.desc");
  });

  it("rejects a sort belonging to the other media type", () => {
    // TMDB 4xxs on a movie sort applied to /discover/tv.
    expect(parseSort("tv", "primary_release_date.desc")).toBe(DEFAULT_SORT);
  });

  it("falls back to the default for anything unrecognised", () => {
    for (const bad of ["garbage", "", undefined, null, 42, {}]) {
      expect(parseSort("movie", bad)).toBe(DEFAULT_SORT);
    }
  });

  it("offers the default as a valid option for both types", () => {
    expect(MOVIE_SORT_OPTIONS.some((o) => o.value === DEFAULT_SORT)).toBe(true);
    expect(TV_SORT_OPTIONS.some((o) => o.value === DEFAULT_SORT)).toBe(true);
  });
});

describe("parseYear", () => {
  it("accepts a plausible release year", () => {
    expect(parseYear("1999")).toBe(1999);
  });

  it("rejects years outside the plausible range", () => {
    expect(parseYear("1500")).toBeUndefined();
    expect(parseYear(String(new Date().getFullYear() + 50))).toBeUndefined();
  });

  it("rejects non-integers and junk", () => {
    for (const bad of ["", "abc", "19.5", undefined, null]) {
      expect(parseYear(bad)).toBeUndefined();
    }
  });
});

describe("parseRating", () => {
  it("accepts TMDB's 0-10 scale", () => {
    expect(parseRating("7")).toBe(7);
    expect(parseRating("0")).toBe(0);
    expect(parseRating("10")).toBe(10);
  });

  it("rejects values off the scale or unparseable", () => {
    for (const bad of ["-1", "11", "abc", "", undefined, null]) {
      expect(parseRating(bad)).toBeUndefined();
    }
  });
});
