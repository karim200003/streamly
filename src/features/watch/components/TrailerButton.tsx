"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import TrailerModal from "./TrailerModal";

interface Props {
  youtubeKey: string;
  label?: string;
  className?: string;
}

export default function TrailerButton({
  youtubeKey,
  label = "Watch trailer",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg glass hover:bg-white/10 transition"
        }
      >
        <PlayCircle className="size-4" />
        {label}
      </button>
      <TrailerModal
        youtubeKey={youtubeKey}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
