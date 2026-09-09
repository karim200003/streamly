import { describe, it, expect } from "vitest";
import {
  mediaRefSchema,
  mediaRefQuerySchema,
  favoriteCreateSchema,
  historyUpsertSchema,
  commentCreateSchema,
  MAX_TITLE_LEN,
} from "./api-schemas";

describe("mediaRefSchema (JSON bodies)", () => {
  it("accepts a well-formed pair", () => {
    expect(mediaRefSchema.safeParse({ tmdbId: 1, mediaType: "movie" }).success)
      .toBe(true);
  });

  it("rejects a media type outside the union", () => {
    expect(mediaRefSchema.safeParse({ tmdbId: 1, mediaType: "podcast" }).success)
      .toBe(false);
  });

  it("rejects non-positive and non-integer ids", () => {
    for (const tmdbId of [0, -1, 1.5, NaN, Infinity]) {
      expect(mediaRefSchema.safeParse({ tmdbId, mediaType: "tv" }).success)
        .toBe(false);
    }
  });

  it("rejects a missing pair rather than coercing null to 0", () => {
    // `Number(null) === 0` used to pass the old Number.isFinite check.
    expect(mediaRefSchema.safeParse({ tmdbId: null, mediaType: "tv" }).success)
      .toBe(false);
    expect(mediaRefSchema.safeParse({}).success).toBe(false);
  });
});

describe("mediaRefQuerySchema (query strings)", () => {
  it("coerces the numeric string a query string always yields", () => {
    const parsed = mediaRefQuerySchema.safeParse({
      tmdbId: "123",
      mediaType: "tv",
    });
    expect(parsed.success && parsed.data.tmdbId).toBe(123);
  });

  it("still rejects junk after coercion", () => {
    expect(
      mediaRefQuerySchema.safeParse({ tmdbId: "abc", mediaType: "tv" }).success,
    ).toBe(false);
  });
});

describe("favoriteCreateSchema", () => {
  const base = { tmdbId: 1, mediaType: "movie" as const, title: "Alien" };

  it("bounds the title length", () => {
    expect(
      favoriteCreateSchema.safeParse({ ...base, title: "x".repeat(MAX_TITLE_LEN + 1) })
        .success,
    ).toBe(false);
  });

  it("rejects an empty or whitespace-only title", () => {
    expect(favoriteCreateSchema.safeParse({ ...base, title: "   " }).success)
      .toBe(false);
  });

  it("keeps a well-formed poster path", () => {
    const parsed = favoriteCreateSchema.safeParse({
      ...base,
      posterPath: "/abc-123_x.jpg",
    });
    expect(parsed.success && parsed.data.posterPath).toBe("/abc-123_x.jpg");
  });

  it("drops a malformed poster path instead of failing the write", () => {
    // These reach an <Image src>, so they must never be stored raw — but
    // a bad path shouldn't stop someone favouriting a title.
    for (const bad of ["https://evil.example/x.jpg", "../../etc/passwd", "no-slash.jpg", 42]) {
      const parsed = favoriteCreateSchema.safeParse({ ...base, posterPath: bad });
      expect(parsed.success && parsed.data.posterPath).toBeNull();
    }
  });
});

describe("historyUpsertSchema", () => {
  const base = { tmdbId: 1, mediaType: "tv" as const, title: "Severance" };

  it("leaves progress undefined when not reported", () => {
    // This is the bug that made resume impossible: defaulting progress to
    // 0 here reset the saved position on every watch-page mount.
    const parsed = historyUpsertSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.progress).toBeUndefined();
      expect(parsed.data.duration).toBeUndefined();
    }
  });

  it("keeps a genuinely reported zero distinct from absent", () => {
    const parsed = historyUpsertSchema.safeParse({ ...base, progress: 0 });
    expect(parsed.success && parsed.data.progress).toBe(0);
  });

  it("rejects negative or non-finite playback figures", () => {
    for (const progress of [-1, Infinity, NaN]) {
      expect(historyUpsertSchema.safeParse({ ...base, progress }).success)
        .toBe(false);
    }
  });
});

describe("commentCreateSchema", () => {
  const base = { tmdbId: 1, mediaType: "movie" as const, body: "Great film." };

  it("bounds the body at 2000 characters", () => {
    expect(commentCreateSchema.safeParse({ ...base, body: "x".repeat(2001) }).success)
      .toBe(false);
  });

  it("rejects a whitespace-only body", () => {
    expect(commentCreateSchema.safeParse({ ...base, body: "  \n " }).success)
      .toBe(false);
  });

  it("accepts ratings 1-10 and rejects anything else", () => {
    expect(commentCreateSchema.safeParse({ ...base, rating: 10 }).success).toBe(true);
    for (const rating of [0, 11, -3]) {
      expect(commentCreateSchema.safeParse({ ...base, rating }).success).toBe(false);
    }
  });
});
