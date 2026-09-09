import { tmdbAvailable } from "@/lib/tmdb";

export default function MissingApiNotice() {
  if (tmdbAvailable) return null;
  return (
    <div className="mx-4 sm:mx-6 lg:mx-10 mt-4 mb-2 px-4 py-3 rounded-lg glass text-sm text-white/80">
      <strong className="text-white">Demo mode.</strong>{" "}
      No <code className="px-1 py-0.5 rounded bg-white/10">TMDB_API_KEY</code> is set in{" "}
      <code className="px-1 py-0.5 rounded bg-white/10">.env</code>, so placeholder data is shown. Add a key from{" "}
      <a
        href="https://www.themoviedb.org/settings/api"
        target="_blank"
        rel="noreferrer"
        className="underline text-white/90 hover:text-white"
      >
        themoviedb.org
      </a>{" "}
      and restart the dev server.
    </div>
  );
}
