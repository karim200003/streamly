"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/use-focus-trap";

interface Props {
  youtubeKey: string;
  open: boolean;
  onClose: () => void;
}

export default function TrailerModal({ youtubeKey, open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus containment, initial focus, Escape and focus restoration.
  useFocusTrap(panelRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Trailer"
    >
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div ref={panelRef} className="relative w-full max-w-5xl">
        <button
          onClick={onClose}
          aria-label="Close trailer"
          className="absolute -top-12 right-0 size-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          <X className="size-5" />
        </button>
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl shadow-black/60">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1`}
            title="Trailer"
            allow="accelerometer; autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
