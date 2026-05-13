"use client";

import { useEffect, useState } from "react";
import { Server, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StreamServer } from "@/lib/vidsrc";

export default function Player({ servers }: { servers: StreamServer[] }) {
  const [active, setActive] = useState(0);
  const [theater, setTheater] = useState(false);
  // Bumping this re-mounts the iframe, forcing the embed to reload.
  const [reloadKey, setReloadKey] = useState(0);
  const current = servers[active];

  // ESC exits theater mode.
  useEffect(() => {
    if (!theater) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTheater(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [theater]);

  return (
    <div
      className={cn(
        "transition-all duration-300",
        theater
          ? "fixed inset-0 z-50 bg-black px-0 pb-0"
          : "px-4 sm:px-6 lg:px-10 pb-12",
      )}
    >
      <div
        className={cn(
          "mx-auto",
          theater ? "max-w-none h-full flex flex-col" : "max-w-screen-2xl",
        )}
      >
        <div
          className={cn(
            "relative w-full bg-black overflow-hidden",
            theater
              ? "flex-1 rounded-none border-0"
              : "aspect-video rounded-xl border border-white/10 shadow-2xl shadow-black/50",
          )}
        >
          {current && (
            <iframe
              key={`${current.url}::${reloadKey}`}
              src={current.url}
              title="Video player"
              allow="accelerometer; autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="origin"
              className="absolute inset-0 w-full h-full"
            />
          )}

          {/* Floating theater toggle in the top-right of the player surface. */}
          <button
            onClick={() => setTheater((t) => !t)}
            aria-label={theater ? "Exit theater mode" : "Enter theater mode"}
            className="absolute top-3 right-3 z-10 size-9 grid place-items-center rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white/90 hover:bg-black/75 active:scale-95 transition opacity-0 hover:opacity-100 focus-visible:opacity-100 group-hover/wrapper:opacity-100"
          >
            {theater ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
        </div>

        {/* Source picker row. Hidden in theater mode (toggle via icon overlay). */}
        {!theater && (
          <>
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[var(--color-muted)] font-semibold">
                <Server className="size-3.5" />
                Source
              </span>
              <div className="flex items-center gap-1.5 p-1 rounded-full glass">
                {servers.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setActive(i)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-sm font-medium transition relative",
                      i === active
                        ? "bg-white text-black shadow-sm"
                        : "text-white/70 hover:text-white hover:bg-white/5",
                    )}
                  >
                    {s.name}
                    {i === active && s.supportsProgress && (
                      <span
                        className="ml-1.5 inline-block size-1 rounded-full bg-emerald-400"
                        title="Resume support"
                      />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass hover:bg-white/10 text-sm transition"
                title="Reload current source"
              >
                <RefreshCw className="size-3.5" />
                <span className="hidden sm:inline">Reload</span>
              </button>
              <button
                onClick={() => setTheater(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass hover:bg-white/10 text-sm transition"
                title="Theater mode (Esc to exit)"
              >
                <Maximize2 className="size-3.5" />
                <span className="hidden sm:inline">Theater</span>
              </button>
            </div>
            <p className="mt-3 text-xs text-white/50 max-w-2xl">
              If a source is unavailable for a title, try another. Streams are
              provided by independent third-party embed services.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
