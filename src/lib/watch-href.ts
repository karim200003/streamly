import type { MediaType } from "./tmdb-shared";

/**
 * Deep link to the player. TV rows carry a season/episode when known;
 * movies (and TV rows recorded before an episode was picked) go to the
 * bare watch page. Duplicated in ContinueWatching and the history page
 * before this.
 */
export function watchHref(item: {
  mediaType: MediaType;
  tmdbId: number;
  season: number;
  episode: number;
}): string {
  const { mediaType, tmdbId, season, episode } = item;
  return mediaType === "tv" && season > 0 && episode > 0
    ? `/watch/tv/${tmdbId}?s=${season}&e=${episode}`
    : `/watch/${mediaType}/${tmdbId}`;
}

/** "S2 · E5" for episodes, "Movie" otherwise. */
export function watchSubtitle(item: {
  mediaType: MediaType;
  season: number;
  episode: number;
}): string {
  return item.mediaType === "tv" && item.season > 0 && item.episode > 0
    ? `S${item.season} · E${item.episode}`
    : "Movie";
}
