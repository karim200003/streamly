// Request schemas shared by the user-facing API routes.
//
// These replace hand-rolled `typeof` checks that had drifted into two
// incompatible dialects: query-string handlers used
// `Number(searchParams.get("tmdbId"))` + `Number.isFinite` (which
// accepts `null` as 0 and allows non-integers), while body handlers used
// `typeof tmdbId !== "number"` (which rejects the string "123"). One
// schema per shape removes the disagreement.

import { z } from "zod";

/**
 * Longest title we will persist. These rows are denormalised copies of
 * TMDB metadata, whose longest titles sit well under this.
 */
export const MAX_TITLE_LEN = 300;

/** TMDB ids are positive integers. */
export const tmdbIdSchema = z.number().int().positive();

export const mediaTypeSchema = z.enum(["movie", "tv"]);

/** The `{ tmdbId, mediaType }` pair, as it arrives in a JSON body. */
export const mediaRefSchema = z.object({
  tmdbId: tmdbIdSchema,
  mediaType: mediaTypeSchema,
});

/**
 * Same pair from a query string, where everything is a string.
 * `z.coerce` handles the conversion so callers don't hand-roll it.
 */
export const mediaRefQuerySchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  mediaType: mediaTypeSchema,
});

/** TMDB poster/backdrop path, e.g. `/abc123.jpg`. */
const posterPathSchema = z
  .string()
  .regex(/^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|svg)$/)
  .nullish()
  // A malformed poster path shouldn't fail the whole write — drop it.
  .catch(null)
  .transform((v) => v ?? null);

const titleSchema = z.string().trim().min(1).max(MAX_TITLE_LEN);

export const favoriteCreateSchema = mediaRefSchema.extend({
  title: titleSchema,
  posterPath: posterPathSchema,
});

export const historyUpsertSchema = mediaRefSchema.extend({
  title: titleSchema,
  posterPath: posterPathSchema,
  season: z.coerce.number().int().min(0).nullish(),
  episode: z.coerce.number().int().min(0).nullish(),
  // Absent means "not reported" — distinct from zero. See the note in
  // the history route about why this must not default to 0.
  progress: z.coerce.number().min(0).finite().optional(),
  duration: z.coerce.number().min(0).finite().optional(),
});

export const historyDeleteSchema = mediaRefSchema.extend({
  season: z.coerce.number().int().min(0).nullish(),
  episode: z.coerce.number().int().min(0).nullish(),
});

export const commentCreateSchema = mediaRefSchema.extend({
  body: z.string().trim().min(1).max(2000),
  rating: z.coerce.number().int().min(1).max(10).nullish(),
});
